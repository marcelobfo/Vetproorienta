import QRCode from 'qrcode';

export interface EvolutionServerConfig {
  serverUrl?: string;
  apiKey?: string;
  instanceName?: string;
}

export interface SendPixOnboardingParams {
  phone: string;
  name: string;
  email: string;
  cpf: string;
  planName: string;
  planPrice: number;
  pixCopiaECola?: string;
  pixQrCodeImage?: string; // base64 data url ou URL http
  paymentUrl?: string;
  dueDate?: string;
  evolutionConfig?: EvolutionServerConfig;
}

export interface SendAccessLiberatedParams {
  phone: string;
  name: string;
  email: string;
  cpf: string;
  planName?: string;
  systemUrl?: string;
  evolutionConfig?: EvolutionServerConfig;
}

/**
 * Normaliza o telefone para o padrão brasileiro DDI 55 + DDD + Número (ex: 5511999999999)
 */
export function formatWhatsAppPhone(rawPhone: string): string {
  let cleaned = (rawPhone || '').replace(/\D/g, '');
  if (!cleaned) return '';
  if (cleaned.length === 10 || cleaned.length === 11) {
    cleaned = `55${cleaned}`;
  }
  return cleaned;
}

/**
 * Resolve as credenciais da Evolution API a partir do payload ou variáveis de ambiente do servidor
 */
export function resolveEvolutionConfig(configOverride?: EvolutionServerConfig): {
  serverUrl: string;
  apiKey: string;
  instanceName: string;
} {
  const serverUrl = (
    configOverride?.serverUrl ||
    process.env.EVOLUTION_SERVER_URL ||
    process.env.NEXT_PUBLIC_EVOLUTION_SERVER_URL ||
    ''
  ).replace(/\/+$/, '');

  const apiKey = (
    configOverride?.apiKey ||
    process.env.EVOLUTION_API_KEY ||
    process.env.NEXT_PUBLIC_EVOLUTION_API_KEY ||
    ''
  ).trim();

  const instanceName = (
    configOverride?.instanceName ||
    process.env.EVOLUTION_DEFAULT_INSTANCE ||
    process.env.EVOLUTION_INSTANCE ||
    'vetpro-clinica'
  ).trim();

  return { serverUrl, apiKey, instanceName };
}

/**
 * Envia uma mensagem de texto direta para a Evolution API
 */
export async function sendEvolutionText(
  phone: string,
  text: string,
  configOverride?: EvolutionServerConfig
): Promise<{ success: boolean; data?: any; error?: string }> {
  const targetPhone = formatWhatsAppPhone(phone);
  if (!targetPhone || targetPhone.length < 12) {
    return { success: false, error: 'Telefone do tutor inválido para WhatsApp.' };
  }

  const { serverUrl, apiKey, instanceName } = resolveEvolutionConfig(configOverride);

  if (!serverUrl) {
    console.warn('[WhatsApp Notification] Servidor Evolution API não configurado.');
    return { success: false, error: 'Evolution API não configurada no servidor.' };
  }

  try {
    const targetUrl = `${serverUrl}/message/sendText/${encodeURIComponent(instanceName)}`;
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
      },
      body: JSON.stringify({
        number: targetPhone,
        text,
        textMessage: { text },
        options: {
          delay: 1200,
          presence: 'composing',
          linkPreview: true,
        },
        delay: 1200,
        linkPreview: true,
      }),
    });

    let resJson: any = null;
    try {
      resJson = await res.json();
    } catch {
      resJson = { raw: await res.text() };
    }

    if (!res.ok) {
      const errorMsg = resJson?.message || resJson?.error || `Status HTTP ${res.status}`;
      console.warn(`[WhatsApp Notification] Falha ao enviar texto para ${targetPhone}:`, errorMsg);
      return { success: false, error: String(errorMsg), data: resJson };
    }

    return { success: true, data: resJson };
  } catch (err: any) {
    console.error(`[WhatsApp Notification] Erro na requisição para ${targetPhone}:`, err);
    return { success: false, error: err.message || 'Erro de conexão com Evolution API' };
  }
}

/**
 * Envia uma imagem/mídia (ex: QR Code do Pix) para a Evolution API
 */
export async function sendEvolutionMedia(
  phone: string,
  mediaBase64OrUrl: string,
  caption: string = '',
  configOverride?: EvolutionServerConfig
): Promise<{ success: boolean; data?: any; error?: string }> {
  const targetPhone = formatWhatsAppPhone(phone);
  if (!targetPhone || targetPhone.length < 12) {
    return { success: false, error: 'Telefone inválido para envio de mídia WhatsApp.' };
  }

  const { serverUrl, apiKey, instanceName } = resolveEvolutionConfig(configOverride);
  if (!serverUrl) {
    return { success: false, error: 'Evolution API não configurada no servidor.' };
  }

  try {
    const targetUrl = `${serverUrl}/message/sendMedia/${encodeURIComponent(instanceName)}`;
    const payload = {
      number: targetPhone,
      mediatype: 'image',
      mimetype: 'image/png',
      caption,
      media: mediaBase64OrUrl,
      fileName: 'qrcode-pix.png',
      delay: 1200,
      mediaMessage: {
        mediatype: 'image',
        mimetype: 'image/png',
        caption,
        media: mediaBase64OrUrl,
        fileName: 'qrcode-pix.png',
      },
    };

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
      },
      body: JSON.stringify(payload),
    });

    let resJson: any = null;
    try {
      resJson = await res.json();
    } catch {
      resJson = { raw: await res.text() };
    }

    if (!res.ok) {
      const errorMsg = resJson?.message || resJson?.error || `Status HTTP ${res.status}`;
      console.warn(`[WhatsApp Notification] Falha ao enviar mídia para ${targetPhone}:`, errorMsg);
      return { success: false, error: String(errorMsg), data: resJson };
    }

    return { success: true, data: resJson };
  } catch (err: any) {
    console.error(`[WhatsApp Notification] Erro ao enviar mídia para ${targetPhone}:`, err);
    return { success: false, error: err.message || 'Erro de conexão com Evolution API' };
  }
}

/**
 * DISPARO 1: Envia o código Pix Copia e Cola e QR Code no WhatsApp assim que o tutor conclui o cadastro
 */
export async function sendPixOnboardingWhatsApp(params: SendPixOnboardingParams): Promise<{
  textSent: boolean;
  mediaSent: boolean;
  textError?: string;
  mediaError?: string;
}> {
  const {
    phone,
    name,
    email,
    cpf,
    planName,
    planPrice,
    pixCopiaECola,
    pixQrCodeImage,
    paymentUrl,
    dueDate,
    evolutionConfig,
  } = params;

  const firstName = (name || '').trim().split(' ')[0] || 'Tutor(a)';
  const formattedCpf = (cpf || '').replace(/\D/g, '');
  const formattedPrice = `R$ ${Number(planPrice || 9.90).toFixed(2).replace('.', ',')}`;
  const dueDateStr = dueDate ? new Date(dueDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Hoje';

  let mediaSent = false;
  let mediaError: string | undefined;

  // 1. Enviar imagem do QR Code se existir ou se puder ser gerada a partir do Pix Copia e Cola
  let resolvedQrImage = pixQrCodeImage;
  if (!resolvedQrImage && pixCopiaECola) {
    try {
      resolvedQrImage = await QRCode.toDataURL(pixCopiaECola, {
        width: 450,
        margin: 2,
        color: { dark: '#042f2e', light: '#ffffff' },
      });
    } catch (qrErr) {
      console.warn('[WhatsApp Notification] Não foi possível gerar QR Code localmente:', qrErr);
    }
  }

  if (resolvedQrImage) {
    const mediaCaption = `🐾 *VetPro Orienta - QR Code Pix*\nEscaneie este QR Code no aplicativo do seu banco para pagar a primeira mensalidade do *Plano ${planName}* (${formattedPrice}).`;
    const mediaResult = await sendEvolutionMedia(phone, resolvedQrImage, mediaCaption, evolutionConfig);
    mediaSent = mediaResult.success;
    mediaError = mediaResult.error;
  }

  // 2. Enviar a mensagem principal detalhada com Pix Copia e Cola e instruções
  const messageLines: string[] = [
    `Olá, *${firstName}*! 🐾 Seja muito bem-vindo(a) ao *VetPro Orienta*!`,
    ``,
    `Seu cadastro foi realizado com sucesso para o *Plano ${planName}* (${formattedPrice}/mês).`,
    ``,
    `📋 *Sua conta no sistema já foi pré-criada:*`,
    `• *Login (E-mail):* ${email}`,
    `• *Senha inicial:* ${formattedCpf || 'Seu CPF (apenas números)'}`,
    ``,
    `⚡ *PAGAMENTO INSTANTÂNEO VIA PIX:*`,
    `Para ativar seu acesso imediatamente, utilize o código *Pix Copia e Cola* abaixo:`,
  ];

  if (pixCopiaECola) {
    messageLines.push(
      ``,
      `\`\`\`${pixCopiaECola}\`\`\``,
      ``,
      `*(Basta clicar ou tocar no código acima para copiar e colar no app do seu banco)*`
    );
  }

  if (paymentUrl) {
    messageLines.push(
      ``,
      `💳 *Prefere pagar com Cartão de Crédito ou Boleto?*`,
      `Acesse o checkout seguro do Asaas:`,
      `${paymentUrl}`
    );
  }

  messageLines.push(
    ``,
    `🔒 *Liberação Automática do Acesso:*`,
    `Assim que o pagamento for identificado pelo sistema, você receberá *automaticamente aqui no WhatsApp* uma nova mensagem com a confirmação e seus dados de acesso liberados!`,
    ``,
    `Qualquer dúvida, estamos 100% à disposição! 🐶🐱`
  );

  const fullText = messageLines.join('\n');
  const textResult = await sendEvolutionText(phone, fullText, evolutionConfig);

  return {
    textSent: textResult.success,
    mediaSent,
    textError: textResult.error,
    mediaError,
  };
}

/**
 * DISPARO 2: Envia a mensagem com ACESSO LIBERADO + LOGIN + SENHA assim que o sistema identifica a compensação do pagamento
 */
export async function sendAccessLiberatedWhatsApp(params: SendAccessLiberatedParams): Promise<{
  success: boolean;
  error?: string;
}> {
  const {
    phone,
    name,
    email,
    cpf,
    planName = 'Essencial',
    systemUrl,
    evolutionConfig,
  } = params;

  const firstName = (name || '').trim().split(' ')[0] || 'Tutor(a)';
  const cleanCpf = (cpf || '').replace(/\D/g, '');
  const resolvedSystemUrl = (
    systemUrl ||
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://vetproorienta.technedigital.com.br'
  ).replace(/\/+$/, '');

  const loginUrl = `${resolvedSystemUrl}/login`;

  const accessMessage = [
    `🎉 *Parabéns, ${firstName}! Seu pagamento foi confirmado com sucesso!*`,
    ``,
    `Sua assinatura do *VetPro Orienta (${planName})* está oficialmente *ATIVA* e seu acesso está 100% liberado! 🚀🐾`,
    ``,
    `🔐 *SEUS DADOS DE ACESSO AO SISTEMA:*`,
    `• *Link do Sistema:* ${loginUrl}`,
    `• *Usuário (E-mail):* ${email}`,
    `• *Senha de Acesso:* ${cleanCpf || 'Seu CPF (apenas números)'}`,
    ``,
    `💡 *Como começar agora:*`,
    `1. Acesse o link acima no seu navegador ou celular.`,
    `2. Digite seu e-mail e CPF para entrar.`,
    `3. Cadastre a ficha dos seus pets (espécie, raça, peso e vacinas).`,
    `4. Faça triagens clínicas inteligentes com IA sempre que precisar de orientação!`,
    ``,
    `Seja muito bem-vindo(a) à família VetPro Orienta! Cuide com amor de quem sempre cuida de você. ❤️🐶🐱`
  ].join('\n');

  const result = await sendEvolutionText(phone, accessMessage, evolutionConfig);
  return {
    success: result.success,
    error: result.error,
  };
}
