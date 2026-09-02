export interface EvolutionConfig {
  serverUrl: string;
  apiKey: string;
  defaultInstance?: string;
}

export interface NormalizedEvolutionInstance {
  name: string;
  status: 'open' | 'connecting' | 'close';
  rawStatus: string;
  owner?: string;
  profileName?: string;
  profilePic?: string;
  raw: any;
}

export const normalizeEvolutionInstance = (item: any, fallbackIdx = 0): NormalizedEvolutionInstance => {
  if (!item) {
    return {
      name: `instancia-${fallbackIdx}`,
      status: 'close',
      rawStatus: 'unknown',
      raw: item,
    };
  }

  const inst = item.instance || item;
  
  // Extrai nome em todas as variações v1 / v2
  const name = (
    inst.name || 
    inst.instanceName || 
    item.name || 
    item.instanceName || 
    inst.id || 
    item.id || 
    `instancia-${fallbackIdx}`
  ).toString().trim();

  // Extrai status em todas as variações v1 / v2
  const rawStatus = (
    inst.connectionStatus || 
    inst.status || 
    inst.state || 
    item.connectionStatus || 
    item.status || 
    item.state || 
    ''
  ).toString().toLowerCase();

  let status: 'open' | 'connecting' | 'close' = 'close';
  if (
    rawStatus === 'open' || 
    rawStatus === 'online' || 
    rawStatus === 'connected' ||
    rawStatus.includes('open') || 
    rawStatus.includes('online') || 
    rawStatus.includes('connected')
  ) {
    status = 'open';
  } else if (
    rawStatus === 'connecting' || 
    rawStatus.includes('connect') ||
    rawStatus.includes('pairing')
  ) {
    status = 'connecting';
  }

  const owner = inst.ownerJid || inst.owner || item.ownerJid || item.owner || '';
  const profileName = inst.profileName || item.profileName || '';
  const profilePic = inst.profilePicUrl || inst.profilePictureUrl || item.profilePicUrl || item.profilePictureUrl || '';

  return {
    name,
    status,
    rawStatus: rawStatus || 'close',
    owner,
    profileName,
    profilePic,
    raw: item,
  };
};

export const getEvolutionConfig = (): EvolutionConfig => {
  let serverUrl = '';
  let apiKey = '';
  let defaultInstance = 'vetpro-clinica';

  if (typeof window !== 'undefined') {
    const savedUrl = localStorage.getItem('vetpro_evolution_url');
    const savedKey = localStorage.getItem('vetpro_evolution_apikey');
    const savedInst = localStorage.getItem('vetpro_evolution_instance');

    if (savedUrl) serverUrl = savedUrl;
    if (savedKey) apiKey = savedKey;
    if (savedInst) defaultInstance = savedInst;
  }

  return { serverUrl, apiKey, defaultInstance };
};

export const saveEvolutionConfig = (config: Partial<EvolutionConfig>) => {
  if (typeof window !== 'undefined') {
    if (config.serverUrl !== undefined) localStorage.setItem('vetpro_evolution_url', config.serverUrl.trim());
    if (config.apiKey !== undefined) localStorage.setItem('vetpro_evolution_apikey', config.apiKey.trim());
    if (config.defaultInstance !== undefined && config.defaultInstance.trim()) {
      localStorage.setItem('vetpro_evolution_instance', config.defaultInstance.trim());
    }
  }
};

export const cleanErrorMessage = (err: any): string => {
  if (!err) return 'Ocorreu um erro inesperado ao conectar ao WhatsApp.';
  if (typeof err === 'string') {
    if (err === '[object Object]') return 'Falha na comunicação com o servidor Evolution API.';
    return err;
  }
  if (typeof err.message === 'string' && err.message.trim() && err.message !== '[object Object]') {
    return err.message;
  }
  if (typeof err.error === 'string' && err.error.trim() && err.error !== '[object Object]') {
    return err.error;
  }
  if (err.details && typeof err.details === 'string') {
    return err.details;
  }
  if (err.details?.error && typeof err.details.error === 'string') {
    return err.details.error;
  }
  if (err.details?.message && typeof err.details.message === 'string') {
    return err.details.message;
  }
  if (Array.isArray(err.message)) {
    return err.message.map((m: any) => typeof m === 'object' ? (m.message || JSON.stringify(m)) : String(m)).join(' | ');
  }
  try {
    const serialized = JSON.stringify(err);
    if (serialized && serialized !== '{}') return serialized;
  } catch {
    // ignore
  }
  return String(err);
};

export const callEvolutionProxy = async (action: string, params: {
  serverUrl?: string;
  apiKey?: string;
  instanceName?: string;
  data?: any;
}) => {
  const currentConfig = getEvolutionConfig();
  const serverUrl = params.serverUrl || currentConfig.serverUrl;
  const apiKey = params.apiKey || currentConfig.apiKey;
  const instanceName = params.instanceName || currentConfig.defaultInstance;

  try {
    const response = await fetch('/api/evolution', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        serverUrl,
        apiKey,
        instanceName,
        data: params.data,
      }),
    });

    let resJson: any;
    try {
      resJson = await response.json();
    } catch {
      resJson = { error: `Erro ${response.status}: Servidor não retornou resposta JSON válida.` };
    }

    if (!response.ok) {
      const errorMsg = cleanErrorMessage(resJson);
      throw new Error(errorMsg);
    }

    return resJson;
  } catch (err: any) {
    const errMsg = cleanErrorMessage(err);
    throw new Error(errMsg);
  }
};
