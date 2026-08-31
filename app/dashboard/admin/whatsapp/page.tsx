'use client';

import { useState, useEffect } from 'react';
import { 
  Smartphone, QrCode, RefreshCw, Send, CheckCircle2, 
  AlertCircle, Key, Server,
  Activity, Trash2, LogOut, Terminal, Check, Star, Wifi, WifiOff
} from 'lucide-react';
import { 
  getEvolutionConfig, 
  saveEvolutionConfig, 
  callEvolutionProxy, 
  normalizeEvolutionInstance, 
  NormalizedEvolutionInstance 
} from '@/lib/evolution';
import { SupabaseStatusBanner } from '@/components/SupabaseStatusBanner';

export default function WhatsAppEvolutionPage() {
  const [config, setConfig] = useState(() => getEvolutionConfig());
  const [serverStatus, setServerStatus] = useState<any>(null);
  const [instances, setInstances] = useState<NormalizedEvolutionInstance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<string>(() => {
    const initial = getEvolutionConfig();
    return initial.defaultInstance || 'vetpro-clinica';
  });
  
  // Loading states
  const [isLoadingServer, setIsLoadingServer] = useState(false);
  const [isLoadingInstances, setIsLoadingInstances] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // Connect / QR Code Modal & State
  const [qrCodeData, setQrCodeData] = useState<{ qrcode?: string; pairingCode?: string; count?: number } | null>(null);
  const [connectionState, setConnectionState] = useState<string>('desconhecido');
  
  // Form para nova instância
  const [newInstanceName, setNewInstanceName] = useState('vetpro-clinica');
  const [isCreatingInstance, setIsCreatingInstance] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form para envio de mensagem de teste
  const [testNumber, setTestNumber] = useState('5511999998888');
  const [testMessage, setTestMessage] = useState('Olá! Esta é uma notificação automática de teste enviada pela Evolution API integrada ao VetPro Orienta 🐾');
  const [delayMs, setDelayMs] = useState(1200);

  // Toast e Logs
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] Módulo Evolution API WhatsApp inicializado.`
  ]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  const addLog = (msg: string) => {
    setConsoleLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 40)]);
  };

  // 1. Get Information (GET /)
  const checkServerInfo = async () => {
    if (!config.serverUrl) {
      showToast('Por favor, informe a URL do servidor Evolution API.', 'error');
      return;
    }
    setIsLoadingServer(true);
    try {
      addLog(`Testando conexão com servidor Evolution: ${config.serverUrl}...`);
      const res = await callEvolutionProxy('get-info', {
        serverUrl: config.serverUrl,
        apiKey: config.apiKey,
      });
      setServerStatus(res);
      addLog(`✅ Servidor Evolution API online! Versão: ${res.version || 'OK'}`);
      showToast(`Conectado! Versão da Evolution API: ${res.version || 'Ativa'}`);
    } catch (err: any) {
      setServerStatus(null);
      addLog(`❌ Erro ao conectar com o servidor: ${err.message}`);
      showToast(err.message || 'Erro ao conectar com servidor Evolution', 'error');
    } finally {
      setIsLoadingServer(false);
    }
  };

  // 2. Fetch Instances (GET /instance/fetchInstances)
  const fetchInstancesList = async () => {
    if (!config.serverUrl) return;
    setIsLoadingInstances(true);
    try {
      addLog('Buscando instâncias WhatsApp cadastradas na Evolution API...');
      const res = await callEvolutionProxy('fetch-instances', {
        serverUrl: config.serverUrl,
        apiKey: config.apiKey,
      });

      if (Array.isArray(res)) {
        const normalizedList = res.map((item, idx) => normalizeEvolutionInstance(item, idx));
        setInstances(normalizedList);
        addLog(`✅ ${normalizedList.length} instâncias encontradas: ${normalizedList.map(i => `${i.name} (${i.status})`).join(', ') || 'Nenhuma'}`);

        // Sincronizar instância selecionada
        const savedInstance = config.defaultInstance || localStorage.getItem('vetpro_evolution_instance') || '';
        const found = normalizedList.find(i => i.name === savedInstance || i.name === selectedInstance);
        
        if (found) {
          setSelectedInstance(found.name);
        } else if (normalizedList.length > 0) {
          // Prefere a primeira que estiver conectada (open) ou a primeira da lista
          const openInst = normalizedList.find(i => i.status === 'open') || normalizedList[0];
          setSelectedInstance(openInst.name);
          // Salva automaticamente como padrão
          saveEvolutionConfig({ defaultInstance: openInst.name });
          setConfig(prev => ({ ...prev, defaultInstance: openInst.name }));
        }
      } else {
        setInstances([]);
        addLog('⚠️ Formato inesperado retornado ao listar instâncias.');
      }
    } catch (err: any) {
      addLog(`⚠️ Não foi possível listar instâncias: ${err.message}`);
    } finally {
      setIsLoadingInstances(false);
    }
  };

  // Carregar dados iniciais
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      if (isMounted && config.serverUrl) {
        await checkServerInfo();
        await fetchInstancesList();
      }
    };
    void init();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveConfig = () => {
    const updated = {
      serverUrl: config.serverUrl.trim(),
      apiKey: config.apiKey.trim(),
      defaultInstance: (config.defaultInstance || selectedInstance || 'vetpro-clinica').trim(),
    };
    saveEvolutionConfig(updated);
    setConfig(updated);
    showToast(`Configurações salvas! Instância padrão: ${updated.defaultInstance}`);
    addLog(`Configurações salvas. Servidor: ${updated.serverUrl || 'Não definido'} | Instância: ${updated.defaultInstance}`);
    void checkServerInfo();
    void fetchInstancesList();
  };

  const handleSetAsDefault = (instName: string) => {
    const trimmed = instName.trim();
    saveEvolutionConfig({ defaultInstance: trimmed });
    setConfig(prev => ({ ...prev, defaultInstance: trimmed }));
    setSelectedInstance(trimmed);
    showToast(`Instância '${trimmed}' definida como padrão para envios do sistema!`);
    addLog(`⭐ Instância '${trimmed}' definida como padrão no sistema.`);
  };

  // 3. Create Instance Basic (POST /instance/create)
  const handleCreateInstance = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newInstanceName.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
    if (!cleanName) {
      showToast('Informe um nome válido para a instância.', 'error');
      return;
    }

    setIsCreatingInstance(true);
    try {
      addLog(`Criando nova instância '${cleanName}' no WhatsApp Baileys...`);
      await callEvolutionProxy('create-instance', {
        serverUrl: config.serverUrl,
        apiKey: config.apiKey,
        instanceName: cleanName,
        data: {
          instanceName: cleanName,
          qrcode: true,
          rejectCall: true,
          alwaysOnline: true,
          readMessages: true,
        }
      });

      addLog(`✅ Instância '${cleanName}' criada com sucesso!`);
      showToast(`Instância '${cleanName}' criada com sucesso!`);
      setSelectedInstance(cleanName);
      handleSetAsDefault(cleanName);
      setShowCreateModal(false);
      await fetchInstancesList();
      await handleConnectInstance(cleanName);
    } catch (err: any) {
      addLog(`❌ Erro ao criar instância: ${err.message}`);
      showToast(err.message, 'error');
    } finally {
      setIsCreatingInstance(false);
    }
  };

  // 4. Instance Connect / QR Code (GET /instance/connect/{instance})
  const handleConnectInstance = async (instName = selectedInstance) => {
    const cleanName = (instName || selectedInstance || '').trim();
    if (!cleanName) {
      showToast('Selecione ou crie uma instância primeiro.', 'error');
      return;
    }

    setIsConnecting(true);
    try {
      addLog(`Solicitando QR Code de conexão para instância '${cleanName}'...`);
      const res = await callEvolutionProxy('connect-instance', {
        serverUrl: config.serverUrl,
        apiKey: config.apiKey,
        instanceName: cleanName,
      });

      // Normalização do QR Code retornado pela Evolution API v1 / v2
      const qrcode = res?.qrcode?.base64 || res?.base64 || res?.qrcode || res?.code || '';
      const pairingCode = res?.pairingCode || res?.code || '';

      setQrCodeData({
        qrcode,
        pairingCode,
        count: res?.count,
      });

      addLog(`✅ QR Code recebido para '${cleanName}'! Código de pareamento: ${pairingCode || 'QR Code gerado'}`);
      showToast('QR Code gerado! Escaneie pelo WhatsApp no seu celular.');
    } catch (err: any) {
      addLog(`❌ Erro ao solicitar QR Code: ${err.message}`);
      showToast(err.message, 'error');
    } finally {
      setIsConnecting(false);
    }
  };

  // 5. Connection State (GET /instance/connectionState/{instance})
  const checkConnectionState = async (instName = selectedInstance) => {
    const cleanName = (instName || selectedInstance || '').trim();
    if (!cleanName) return;
    try {
      addLog(`Verificando estado da conexão da instância '${cleanName}'...`);
      const res = await callEvolutionProxy('connection-state', {
        serverUrl: config.serverUrl,
        apiKey: config.apiKey,
        instanceName: cleanName,
      });

      const rawState = (
        res?.instance?.state || 
        res?.state || 
        res?.connectionStatus || 
        res?.status || 
        'close'
      ).toString().toLowerCase();

      setConnectionState(rawState);
      const isOnline = ['open', 'online', 'connected'].some(s => rawState.includes(s));

      if (isOnline) {
        addLog(`🟢 Instância '${cleanName}' está CONECTADA (${rawState.toUpperCase()})!`);
        showToast(`Instância '${cleanName}' CONECTADA com sucesso!`);
        setQrCodeData(null);
      } else {
        addLog(`⚪ Estado da conexão para '${cleanName}': ${rawState.toUpperCase()}`);
        showToast(`Estado da conexão: ${rawState.toUpperCase()}`);
      }
      
      await fetchInstancesList();
    } catch (err: any) {
      addLog(`❌ Erro ao verificar estado de '${cleanName}': ${err.message}`);
      showToast(err.message, 'error');
    }
  };

  // 6. Restart Instance (PUT /instance/restart/{instance})
  const handleRestartInstance = async (instName = selectedInstance) => {
    const cleanName = (instName || selectedInstance || '').trim();
    try {
      addLog(`Reiniciando instância '${cleanName}'...`);
      await callEvolutionProxy('restart-instance', {
        serverUrl: config.serverUrl,
        apiKey: config.apiKey,
        instanceName: cleanName,
      });
      addLog(`✅ Instância '${cleanName}' reiniciada.`);
      showToast(`Instância '${cleanName}' reiniciada com sucesso!`);
      await fetchInstancesList();
    } catch (err: any) {
      addLog(`❌ Erro ao reiniciar: ${err.message}`);
      showToast(err.message, 'error');
    }
  };

  // 7. Logout Instance (DELETE /instance/logout/{instance})
  const handleLogoutInstance = async (instName = selectedInstance) => {
    const cleanName = (instName || selectedInstance || '').trim();
    if (!confirm(`Deseja realmente desconectar o WhatsApp da instância '${cleanName}'?`)) return;
    try {
      addLog(`Desconectando instância '${cleanName}'...`);
      await callEvolutionProxy('logout-instance', {
        serverUrl: config.serverUrl,
        apiKey: config.apiKey,
        instanceName: cleanName,
      });
      addLog(`✅ Instância '${cleanName}' desconectada (Logout efetuado).`);
      showToast(`Instância '${cleanName}' desconectada com sucesso.`);
      setQrCodeData(null);
      await fetchInstancesList();
    } catch (err: any) {
      addLog(`❌ Erro ao desconectar: ${err.message}`);
      showToast(err.message, 'error');
    }
  };

  // 8. Delete Instance (DELETE /instance/delete/{instance})
  const handleDeleteInstance = async (instName = selectedInstance) => {
    const cleanName = (instName || selectedInstance || '').trim();
    if (!confirm(`ATENÇÃO: Deseja excluir definitivamente a instância '${cleanName}' da Evolution API?`)) return;
    try {
      addLog(`Excluindo instância '${cleanName}'...`);
      await callEvolutionProxy('delete-instance', {
        serverUrl: config.serverUrl,
        apiKey: config.apiKey,
        instanceName: cleanName,
      });
      addLog(`✅ Instância '${cleanName}' excluída.`);
      showToast(`Instância '${cleanName}' excluída.`);
      if (selectedInstance === cleanName) {
        setSelectedInstance('');
      }
      setQrCodeData(null);
      await fetchInstancesList();
    } catch (err: any) {
      addLog(`❌ Erro ao excluir: ${err.message}`);
      showToast(err.message, 'error');
    }
  };

  // 9. Send Text Message (POST /message/sendText/{instance})
  const handleSendTextMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = (selectedInstance || config.defaultInstance || '').trim();
    if (!cleanName) {
      showToast('Selecione uma instância antes de enviar.', 'error');
      return;
    }
    if (!testNumber.trim() || !testMessage.trim()) {
      showToast('Informe o número de destino e o texto da mensagem.', 'error');
      return;
    }

    setIsSending(true);
    try {
      addLog(`Enviando mensagem via Evolution API usando instância '${cleanName}' para ${testNumber}...`);
      const res = await callEvolutionProxy('send-text', {
        serverUrl: config.serverUrl,
        apiKey: config.apiKey,
        instanceName: cleanName,
        data: {
          number: testNumber,
          text: testMessage,
          delay: Number(delayMs) || 1200,
          linkPreview: true,
        }
      });

      addLog(`✅ Mensagem enviada com sucesso para ${testNumber}! ID: ${res?.key?.id || 'OK'}`);
      showToast(`Mensagem enviada com sucesso para ${testNumber}!`);
    } catch (err: any) {
      addLog(`❌ Falha no disparo da mensagem: ${err.message}`);
      showToast(err.message, 'error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-brand-bg relative flex flex-col">
      {/* Toast */}
      {toastMessage && (
        <div className={`fixed top-6 right-6 z-50 font-semibold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-in fade-in duration-200 ${
          toastMessage.type === 'error' ? 'bg-brand-danger text-white' : 'bg-brand-teal text-brand-bg'
        }`}>
          {toastMessage.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col space-y-6">
        
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-emerald-500/15 text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" /> Integração Oficial Evolution API
              </span>
            </div>
            <h1 className="font-display text-2xl font-bold">Automações & WhatsApp Gateway</h1>
            <p className="text-sm text-brand-text-muted">
              Gerencie instâncias, conexão QR Code e disparos automáticos de lembretes clínicos e vacinas via WhatsApp.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { checkServerInfo(); fetchInstancesList(); }}
              disabled={isLoadingServer || isLoadingInstances}
              className="px-4 py-2.5 rounded-xl border border-brand-border-strong text-xs font-semibold text-brand-text hover:border-brand-teal/50 transition-colors flex items-center gap-2 bg-brand-surface"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${(isLoadingServer || isLoadingInstances) ? 'animate-spin text-brand-teal' : ''}`} />
              Atualizar Status
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 rounded-xl bg-brand-teal text-brand-bg text-xs font-bold hover:bg-brand-teal/90 transition-colors shadow-sm flex items-center gap-1.5"
            >
              + Nova Instância
            </button>
          </div>
        </div>

        {/* Supabase Status Banner */}
        <SupabaseStatusBanner />

        {/* Card de Integração: Disparo Automático de Lembretes */}
        <div className="bg-gradient-to-r from-brand-surface to-brand-surface-2 border border-brand-border-strong rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-brand-teal/15 text-brand-teal flex items-center justify-center shrink-0">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-sm text-brand-text">
                  Motor de Lembretes Automáticos de Vacinas & Consultas
                </h3>
                <span className="bg-emerald-500/15 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Pronto para Disparo
                </span>
              </div>
              <p className="text-xs text-brand-text-muted mt-0.5">
                Utiliza a instância padrão configurada nesta tela para notificar automaticamente tutores sobre vacinas e reforços.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <a
              href="/dashboard/automacoes"
              className="flex-1 sm:flex-none text-center px-3.5 py-2 rounded-xl bg-brand-surface border border-brand-border-strong text-xs font-bold text-brand-text hover:border-brand-teal transition-all"
            >
              Configurar Regras & Intervalos
            </a>
          </div>
        </div>

        {/* Grid de Configurações do Servidor & Instâncias */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Card 1: Credenciais do Servidor Evolution */}
          <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-base flex items-center gap-2">
                  <Server className="w-4 h-4 text-brand-teal" /> Conexão do Servidor
                </h3>
                {serverStatus ? (
                  <span className="bg-emerald-500/15 text-emerald-400 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Activity className="w-3 h-3" /> Online {serverStatus.version ? `v${serverStatus.version}` : ''}
                  </span>
                ) : (
                  <span className="bg-amber-500/15 text-amber-400 text-[11px] font-bold px-2 py-0.5 rounded-full">
                    Aguardando Teste
                  </span>
                )}
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-brand-text-muted font-medium mb-1">URL do Servidor Evolution (Server URL)</label>
                  <input
                    type="url"
                    value={config.serverUrl}
                    onChange={(e) => setConfig({ ...config, serverUrl: e.target.value })}
                    placeholder="https://api.seudominio.com ou http://localhost:8080"
                    className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-brand-text focus:outline-none focus:border-brand-teal font-mono text-xs"
                  />
                  <p className="text-[11px] text-brand-text-muted mt-1">Exemplo: https://evolution.minhaclinica.com.br</p>
                </div>

                <div>
                  <label className="block text-brand-text-muted font-medium mb-1">Chave Global de API (API Key)</label>
                  <div className="relative">
                    <input
                      type="password"
                      value={config.apiKey}
                      onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                      placeholder="Token/API Key da Evolution"
                      className="w-full bg-brand-bg border border-brand-border-strong rounded-xl pl-3 pr-8 py-2 text-brand-text focus:outline-none focus:border-brand-teal font-mono text-xs"
                    />
                    <Key className="w-3.5 h-3.5 text-brand-text-muted absolute right-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-brand-text-muted font-medium mb-1 flex items-center justify-between">
                    <span>Instância Padrão Ativa (Salva no Sistema)</span>
                    <Star className="w-3 h-3 text-amber-400" />
                  </label>
                  <input
                    type="text"
                    value={config.defaultInstance || selectedInstance || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setConfig({ ...config, defaultInstance: val });
                      setSelectedInstance(val);
                    }}
                    placeholder="Nome da instância principal"
                    className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-brand-text focus:outline-none focus:border-brand-teal font-mono text-xs font-semibold"
                  />
                  <p className="text-[11px] text-brand-text-muted mt-1">Instância usada para envios de vacinas e lembretes.</p>
                </div>
              </div>
            </div>

            <div className="pt-5 mt-5 border-t border-brand-border-strong flex items-center gap-2">
              <button
                onClick={handleSaveConfig}
                className="flex-1 py-2 rounded-xl bg-brand-teal text-brand-bg font-bold text-xs hover:bg-brand-teal/90 transition-colors"
              >
                Salvar Configuração
              </button>
              <button
                onClick={checkServerInfo}
                disabled={isLoadingServer}
                className="px-3 py-2 rounded-xl border border-brand-border-strong text-xs font-semibold text-brand-text hover:border-brand-teal transition-colors"
                title="Testar Conexão GET /"
              >
                Testar
              </button>
            </div>
          </div>

          {/* Card 2: Instâncias Ativas & Conexão WhatsApp */}
          <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6 lg:col-span-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-display font-bold text-base">Instâncias do WhatsApp na Evolution API</h3>
                </div>
                <span className="text-xs text-brand-text-muted">
                  {instances.length} instância(s) encontrada(s)
                </span>
              </div>

              {instances.length === 0 ? (
                <div className="text-center py-8 px-4 border border-dashed border-brand-border-strong rounded-2xl bg-brand-bg/50">
                  <Smartphone className="w-10 h-10 text-brand-text-muted mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-semibold text-brand-text mb-1">
                    {isLoadingInstances ? 'Carregando instâncias...' : 'Nenhuma instância encontrada no servidor'}
                  </p>
                  <p className="text-[11px] text-brand-text-muted mb-4 max-w-sm mx-auto">
                    Crie uma instância básica para gerar o QR Code e conectar o WhatsApp da clínica.
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 rounded-xl bg-brand-teal text-brand-bg text-xs font-bold hover:bg-brand-teal/90 transition-colors shadow-sm"
                  >
                    + Criar Instância Agora
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {instances.map((inst) => {
                    const name = inst.name;
                    const isOpen = inst.status === 'open';
                    const isConnectingState = inst.status === 'connecting';
                    const isSelected = selectedInstance === name;
                    const isDefault = config.defaultInstance === name;

                    return (
                      <div
                        key={name}
                        onClick={() => setSelectedInstance(name)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isSelected 
                            ? 'border-brand-teal bg-brand-teal/5 shadow-sm' 
                            : 'border-brand-border-strong bg-brand-bg hover:border-brand-border'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                            isOpen 
                              ? 'bg-emerald-500/20 text-emerald-400' 
                              : isConnectingState 
                                ? 'bg-amber-500/20 text-amber-400' 
                                : 'bg-brand-surface-2 text-zinc-400'
                          }`}>
                            {isOpen ? (
                              <Wifi className="w-5 h-5 text-emerald-400" />
                            ) : isConnectingState ? (
                              <RefreshCw className="w-5 h-5 text-amber-400 animate-spin" />
                            ) : (
                              <WifiOff className="w-5 h-5 text-zinc-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-brand-text font-mono truncate">{name}</span>
                              
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                isOpen 
                                  ? 'bg-emerald-500/15 text-emerald-400' 
                                  : isConnectingState 
                                    ? 'bg-amber-500/15 text-amber-400' 
                                    : 'bg-zinc-500/20 text-zinc-400'
                              }`}>
                                {isOpen ? '🟢 CONECTADO' : isConnectingState ? '🟡 CONECTANDO' : '⚪ DESCONECTADO'}
                              </span>

                              {isDefault && (
                                <span className="bg-amber-500/15 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Star className="w-2.5 h-2.5 fill-current" /> Padrão Ativa
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-brand-text-muted truncate mt-0.5">
                              {inst.owner ? `WhatsApp: ${inst.owner}` : inst.profileName ? `Perfil: ${inst.profileName}` : 'Pronto para conexão via QR Code'}
                            </p>
                          </div>
                        </div>

                        {/* Ações da Instância */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                          {!isDefault && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleSetAsDefault(name); }}
                              className="px-2 py-1.5 rounded-lg bg-brand-surface border border-brand-border-strong text-[11px] font-semibold text-brand-text-muted hover:text-amber-400 hover:border-amber-400/50 flex items-center gap-1"
                              title="Tornar esta a instância padrão do sistema"
                            >
                              <Star className="w-3 h-3" /> Tornar Padrão
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedInstance(name); handleConnectInstance(name); }}
                            className="px-2.5 py-1.5 rounded-lg bg-brand-surface border border-brand-border-strong text-xs font-semibold text-brand-text hover:border-brand-teal flex items-center gap-1"
                            title="Gerar QR Code de Conexão"
                          >
                            <QrCode className="w-3.5 h-3.5 text-brand-teal" /> QR Code
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); checkConnectionState(name); }}
                            className="p-1.5 rounded-lg bg-brand-surface border border-brand-border-strong text-xs text-brand-text-muted hover:text-brand-text hover:border-brand-teal"
                            title="Verificar Estado da Conexão"
                          >
                            <Activity className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRestartInstance(name); }}
                            className="p-1.5 rounded-lg bg-brand-surface border border-brand-border-strong text-xs text-brand-text-muted hover:text-brand-text hover:border-brand-teal"
                            title="Reiniciar Instância"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleLogoutInstance(name); }}
                            className="p-1.5 rounded-lg bg-brand-surface border border-brand-border-strong text-xs text-amber-400 hover:border-amber-400/50"
                            title="Desconectar WhatsApp (Logout)"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteInstance(name); }}
                            className="p-1.5 rounded-lg bg-brand-surface border border-brand-border-strong text-xs text-rose-400 hover:border-rose-400/50"
                            title="Excluir Instância"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Painel do QR Code Gerado */}
            {qrCodeData && (
              <div className="mt-5 p-4 rounded-xl border border-brand-teal/40 bg-brand-teal/5 flex flex-col sm:flex-row items-center gap-4">
                {qrCodeData.qrcode ? (
                  <div className="bg-white p-2 rounded-xl shadow-md shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={qrCodeData.qrcode.startsWith('data:') ? qrCodeData.qrcode : `data:image/png;base64,${qrCodeData.qrcode}`} 
                      alt="QR Code WhatsApp" 
                      className="w-32 h-32"
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-xl bg-brand-surface flex items-center justify-center text-brand-teal font-mono text-xs shrink-0 border border-brand-border-strong">
                    <QrCode className="w-10 h-10" />
                  </div>
                )}
                
                <div className="flex-1 text-center sm:text-left space-y-1">
                  <span className="text-xs font-bold text-brand-teal uppercase tracking-wider">
                    Conectar Instância: {selectedInstance}
                  </span>
                  <p className="text-xs text-brand-text font-medium">
                    Abra o WhatsApp no celular &gt; Aparelhos Conectados &gt; Conectar um Aparelho e aponte para o QR Code.
                  </p>
                  {qrCodeData.pairingCode && (
                    <div className="mt-2 text-xs">
                      <span className="text-brand-text-muted">Código de Pareamento: </span>
                      <strong className="text-brand-teal font-mono bg-brand-surface px-2 py-0.5 rounded border border-brand-border-strong">
                        {qrCodeData.pairingCode}
                      </strong>
                    </div>
                  )}
                  <div className="pt-2 flex items-center gap-2 justify-center sm:justify-start">
                    <button
                      onClick={() => checkConnectionState(selectedInstance)}
                      className="px-3 py-1.5 rounded-lg bg-brand-teal text-brand-bg font-bold text-xs hover:bg-brand-teal/90 transition-colors"
                    >
                      Já escaneei, verificar conexão
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Seção 2: Disparo de Mensagens de Teste & Console de Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Card: Teste de Envio de Mensagem (POST /message/sendText/{instance}) */}
          <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-base flex items-center gap-2">
                <Send className="w-4 h-4 text-brand-teal" /> Disparo de Mensagem de Teste
              </h3>
              <span className="text-[11px] font-mono text-brand-text-muted bg-brand-bg px-2 py-0.5 rounded border border-brand-border-strong">
                POST /message/sendText
              </span>
            </div>

            <form onSubmit={handleSendTextMessage} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-brand-text-muted font-medium mb-1">Instância Remetente</label>
                  <input
                    type="text"
                    value={selectedInstance}
                    onChange={(e) => setSelectedInstance(e.target.value)}
                    placeholder="Nome da instância"
                    className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-brand-text focus:outline-none focus:border-brand-teal font-mono font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-brand-text-muted font-medium mb-1">Número do Destinatário (com DDI/DDD)</label>
                  <input
                    type="text"
                    value={testNumber}
                    onChange={(e) => setTestNumber(e.target.value)}
                    placeholder="Ex: 5511988887777"
                    className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-brand-text focus:outline-none focus:border-brand-teal font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-brand-text-muted font-medium mb-1">Texto da Mensagem</label>
                <textarea
                  rows={4}
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Escreva a mensagem a ser enviada..."
                  className="w-full bg-brand-bg border border-brand-border-strong rounded-xl p-3 text-brand-text focus:outline-none focus:border-brand-teal text-xs leading-relaxed"
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-brand-text-muted text-[11px]">Delay de Digitação:</span>
                  <select
                    value={delayMs}
                    onChange={(e) => setDelayMs(Number(e.target.value))}
                    className="bg-brand-bg border border-brand-border-strong rounded-lg px-2 py-1 text-brand-text text-xs"
                  >
                    <option value={500}>500ms</option>
                    <option value={1200}>1.2s (Recomendado)</option>
                    <option value={2500}>2.5s</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isSending || !selectedInstance}
                  className="px-5 py-2.5 rounded-xl bg-brand-teal text-brand-bg font-bold text-xs hover:bg-brand-teal/90 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSending ? 'Enviando...' : 'Enviar Mensagem Agora'}
                </button>
              </div>
            </form>
          </div>

          {/* Card: Console de Logs em Tempo Real */}
          <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-bold text-base flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" /> Console de Execução & Eventos
                </h3>
                <button
                  onClick={() => setConsoleLogs([`[${new Date().toLocaleTimeString()}] Console limpo.`])}
                  className="text-[11px] text-brand-text-muted hover:text-brand-text"
                >
                  Limpar
                </button>
              </div>

              <div className="bg-zinc-950 border border-brand-border-strong rounded-xl p-3 font-mono text-[11px] text-zinc-300 h-64 overflow-y-auto space-y-1.5">
                {consoleLogs.map((log, index) => (
                  <div key={index} className="leading-relaxed whitespace-pre-wrap">
                    {log}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-brand-border-strong flex items-center justify-between text-[11px] text-brand-text-muted">
              <span>Mapeamento compatível com Evolution API v1.x e v2.x</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="w-3 h-3" /> Baileys Engine
              </span>
            </div>
          </div>
        </div>

        {/* Modal para Criar Nova Instância */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-brand-surface border border-brand-border-strong rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              <h2 className="font-display text-lg font-bold mb-1">Criar Nova Instância WhatsApp</h2>
              <p className="text-xs text-brand-text-muted mb-4">
                Define uma nova sessão do WhatsApp Baileys na Evolution API para envio de mensagens automáticas.
              </p>

              <form onSubmit={handleCreateInstance} className="space-y-4 text-xs">
                <div>
                  <label className="block text-brand-text-muted font-medium mb-1">Nome da Instância (Identificador)</label>
                  <input
                    type="text"
                    value={newInstanceName}
                    onChange={(e) => setNewInstanceName(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                    placeholder="ex: vetpro-matriz ou clinica-plantao"
                    className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2.5 text-brand-text font-mono text-xs focus:outline-none focus:border-brand-teal"
                    required
                  />
                  <p className="text-[11px] text-brand-text-muted mt-1">Use apenas letras, números e hífens.</p>
                </div>

                <div className="p-3 bg-brand-bg rounded-xl border border-brand-border-strong space-y-2 text-[11px] text-brand-text-muted">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-teal" />
                    <span>Integração padrão: <strong>WHATSAPP-BAILEYS</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-teal" />
                    <span>Geração automática de QR Code ativada</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-teal" />
                    <span>Rejeição de chamadas com mensagem automática</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-brand-text-muted hover:text-brand-text"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingInstance || !newInstanceName.trim()}
                    className="px-5 py-2.5 rounded-xl bg-brand-teal text-brand-bg font-bold text-xs hover:bg-brand-teal/90 transition-colors shadow-sm disabled:opacity-50"
                  >
                    {isCreatingInstance ? 'Criando...' : 'Criar Instância'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

