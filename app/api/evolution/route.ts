import { NextRequest, NextResponse } from 'next/server';

function extractEvolutionErrorMessage(resJson: any, status: number): string {
  if (!resJson) return `Erro HTTP ${status} retornado pela Evolution API.`;

  const rawMessages: any[] = [];
  if (Array.isArray(resJson?.response?.message)) {
    rawMessages.push(...resJson.response.message);
  } else if (resJson?.response?.message) {
    rawMessages.push(resJson.response.message);
  }

  if (Array.isArray(resJson?.message)) {
    rawMessages.push(...resJson.message);
  } else if (resJson?.message) {
    rawMessages.push(resJson.message);
  }

  if (Array.isArray(resJson?.error)) {
    rawMessages.push(...resJson.error);
  } else if (resJson?.error && typeof resJson.error !== 'string') {
    rawMessages.push(resJson.error);
  }

  const extractedStrings: string[] = [];
  for (const item of rawMessages) {
    if (typeof item === 'string' && item.trim()) {
      extractedStrings.push(item.trim());
    } else if (item && typeof item === 'object') {
      if (typeof item.message === 'string') extractedStrings.push(item.message);
      else if (typeof item.error === 'string') extractedStrings.push(item.error);
      else if (typeof item.text === 'string') extractedStrings.push(item.text);
      else if (item.constraints && typeof item.constraints === 'object') {
        extractedStrings.push(Object.values(item.constraints).join(', '));
      } else {
        try {
          extractedStrings.push(JSON.stringify(item));
        } catch {
          // ignore
        }
      }
    }
  }

  let finalMessage = extractedStrings.filter(Boolean).join(' | ');

  if (!finalMessage) {
    if (typeof resJson?.error === 'string' && resJson.error.trim()) {
      finalMessage = resJson.error.trim();
    } else if (typeof resJson?.details === 'string') {
      finalMessage = resJson.details;
    } else if (typeof resJson?.raw === 'string' && resJson.raw.trim()) {
      finalMessage = resJson.raw.slice(0, 300);
    } else {
      try {
        finalMessage = JSON.stringify(resJson);
      } catch {
        finalMessage = `Erro HTTP ${status} na Evolution API`;
      }
    }
  }

  // Traduções e orientações amigáveis
  const lower = finalMessage.toLowerCase();
  if (
    lower.includes('not connected') || 
    lower.includes('is not open') || 
    lower.includes('connection closed') || 
    lower.includes('session closed') ||
    lower.includes('connection_closed')
  ) {
    return `O WhatsApp não está conectado (Instância desconectada). Acesse o menu "Admin > WhatsApp & Evolution" para reconectar o QR Code.`;
  }
  if (lower.includes('does not exist') || lower.includes('not found') || lower.includes('instance not found')) {
    return `A instância do WhatsApp configurada não foi encontrada na Evolution API. Acesse "Admin > WhatsApp & Evolution" para criar ou selecionar a instância.`;
  }
  if (status === 401 || status === 403 || lower.includes('unauthorized') || lower.includes('forbidden') || lower.includes('invalid api key')) {
    return `Chave de API (API Key) não autorizada na Evolution API. Verifique a chave informada em "Admin > WhatsApp & Evolution".`;
  }
  if (lower.includes('number must be') || lower.includes('invalid number') || lower.includes('jid')) {
    return `O número de telefone informado para o WhatsApp é inválido. Certifique-se de que inclui DDD e número válido.`;
  }

  return finalMessage;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, serverUrl, apiKey, instanceName, data } = body;

    const baseUrl = (serverUrl || process.env.EVOLUTION_SERVER_URL || '').replace(/\/+$/, '');
    const token = apiKey || process.env.EVOLUTION_API_KEY || '';

    if (!baseUrl) {
      return NextResponse.json(
        { error: 'Servidor Evolution API não configurado. Por favor, acesse o painel "Admin > WhatsApp & Evolution" para configurar a URL e Chave de API.' },
        { status: 400 }
      );
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      apikey: token,
    };

    let targetUrl = '';
    let method = 'GET';
    let payload: any = undefined;

    switch (action) {
      case 'get-info':
        targetUrl = `${baseUrl}/`;
        method = 'GET';
        break;

      case 'fetch-instances':
        targetUrl = `${baseUrl}/instance/fetchInstances`;
        method = 'GET';
        break;

      case 'create-instance':
        targetUrl = `${baseUrl}/instance/create`;
        method = 'POST';
        payload = {
          instanceName: (instanceName || data?.instanceName || 'vetpro-clinica').trim(),
          qrcode: data?.qrcode ?? true,
          integration: 'WHATSAPP-BAILEYS',
          rejectCall: data?.rejectCall ?? true,
          msgCall: data?.msgCall || 'Atendimento automatizado VetPro Orienta via WhatsApp.',
          groupsIgnore: data?.groupsIgnore ?? true,
          alwaysOnline: data?.alwaysOnline ?? true,
          readMessages: data?.readMessages ?? true,
          readStatus: data?.readStatus ?? true,
          syncFullHistory: data?.syncFullHistory ?? false,
        };

        // Inclui token apenas se informado
        if (data?.token && data.token.trim()) {
          payload.token = data.token.trim();
        }

        // Inclui number apenas se informado e válido (evita erro de regex: ^\d+[\.@\w-]+)
        if (data?.number && typeof data.number === 'string' && data.number.trim().length > 0) {
          const sanitizedNumber = data.number.replace(/\D/g, '');
          if (sanitizedNumber.length > 0) {
            payload.number = sanitizedNumber;
          }
        }

        if (data?.webhookUrl) {
          payload.webhook = {
            url: data.webhookUrl,
            byEvents: true,
            base64: true,
            events: ['APPLICATION_STARTUP', 'MESSAGES_UPSERT'],
          };
        }
        break;

      case 'connect-instance':
        if (!instanceName) {
          return NextResponse.json({ error: 'Nome da instância é obrigatório.' }, { status: 400 });
        }
        targetUrl = `${baseUrl}/instance/connect/${encodeURIComponent(instanceName)}`;
        method = 'GET';
        break;

      case 'connection-state':
        if (!instanceName) {
          return NextResponse.json({ error: 'Nome da instância é obrigatório.' }, { status: 400 });
        }
        targetUrl = `${baseUrl}/instance/connectionState/${encodeURIComponent(instanceName)}`;
        method = 'GET';
        break;

      case 'restart-instance':
        if (!instanceName) {
          return NextResponse.json({ error: 'Nome da instância é obrigatório.' }, { status: 400 });
        }
        targetUrl = `${baseUrl}/instance/restart/${encodeURIComponent(instanceName)}`;
        method = 'PUT';
        break;

      case 'logout-instance':
        if (!instanceName) {
          return NextResponse.json({ error: 'Nome da instância é obrigatório.' }, { status: 400 });
        }
        targetUrl = `${baseUrl}/instance/logout/${encodeURIComponent(instanceName)}`;
        method = 'DELETE';
        break;

      case 'delete-instance':
        if (!instanceName) {
          return NextResponse.json({ error: 'Nome da instância é obrigatório.' }, { status: 400 });
        }
        targetUrl = `${baseUrl}/instance/delete/${encodeURIComponent(instanceName)}`;
        method = 'DELETE';
        break;

      case 'set-presence':
        if (!instanceName) {
          return NextResponse.json({ error: 'Nome da instância é obrigatório.' }, { status: 400 });
        }
        targetUrl = `${baseUrl}/instance/setPresence/${encodeURIComponent(instanceName)}`;
        method = 'POST';
        payload = {
          presence: data?.presence || 'available',
        };
        break;

      case 'send-text':
        if (!instanceName) {
          return NextResponse.json({ error: 'Nome da instância do WhatsApp é obrigatório.' }, { status: 400 });
        }
        if (!data?.number || !data?.text) {
          return NextResponse.json({ error: 'Número de telefone e texto da mensagem são obrigatórios.' }, { status: 400 });
        }
        let cleanNumber = data.number.toString().replace(/\D/g, '');
        if (cleanNumber.length === 10 || cleanNumber.length === 11) {
          cleanNumber = `55${cleanNumber}`;
        }
        targetUrl = `${baseUrl}/message/sendText/${encodeURIComponent(instanceName)}`;
        method = 'POST';
        payload = {
          number: cleanNumber,
          text: data.text,
          // Compatibilidade ampla v1 e v2
          textMessage: {
            text: data.text,
          },
          options: {
            delay: data.delay || 1200,
            presence: 'composing',
            linkPreview: data.linkPreview ?? true,
          },
          delay: data.delay || 1200,
          linkPreview: data.linkPreview ?? true,
        };
        break;

      case 'send-media':
      case 'send-image':
        if (!instanceName) {
          return NextResponse.json({ error: 'Nome da instância do WhatsApp é obrigatório.' }, { status: 400 });
        }
        if (!data?.number || (!data?.media && !data?.image && !data?.mediaUrl)) {
          return NextResponse.json({ error: 'Número e mídia/imagem são obrigatórios para envio.' }, { status: 400 });
        }
        let mediaPhone = data.number.toString().replace(/\D/g, '');
        if (mediaPhone.length === 10 || mediaPhone.length === 11) {
          mediaPhone = `55${mediaPhone}`;
        }
        targetUrl = `${baseUrl}/message/sendMedia/${encodeURIComponent(instanceName)}`;
        method = 'POST';
        payload = {
          number: mediaPhone,
          mediatype: data.mediatype || data.mediaType || 'image',
          mimetype: data.mimetype || data.mimeType || 'image/png',
          caption: data.caption || data.text || '',
          media: data.media || data.image || data.mediaUrl,
          fileName: data.fileName || 'qrcode-pix.png',
          delay: data.delay || 1200,
          // Payload v1/v2 compatibility
          mediaMessage: {
            mediatype: data.mediatype || data.mediaType || 'image',
            mimetype: data.mimetype || data.mimeType || 'image/png',
            caption: data.caption || data.text || '',
            media: data.media || data.image || data.mediaUrl,
            fileName: data.fileName || 'qrcode-pix.png',
          },
        };
        break;

      default:
        return NextResponse.json({ error: `Ação '${action}' não reconhecida.` }, { status: 400 });
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (payload && (method === 'POST' || method === 'PUT')) {
      fetchOptions.body = JSON.stringify(payload);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const resText = await response.text();
    let resJson: any;
    try {
      resJson = JSON.parse(resText);
    } catch {
      resJson = { raw: resText };
    }

    if (!response.ok) {
      const errorMessage = extractEvolutionErrorMessage(resJson, response.status);

      return NextResponse.json(
        {
          error: errorMessage,
          status: response.status,
          details: resJson,
        },
        { status: response.status }
      );
    }

    return NextResponse.json(resJson);
  } catch (error: any) {
    console.warn('[Evolution API Proxy] Falha ao comunicar com o servidor:', error?.message || error);
    let errorMsg = 'Falha ao conectar com o servidor da Evolution API.';
    if (error?.cause?.code) {
      errorMsg += ` (${error.cause.code})`;
    } else if (error?.message) {
      errorMsg += ` (${error.message})`;
    }
    return NextResponse.json(
      { error: errorMsg },
      { status: 502 }
    );
  }
}
