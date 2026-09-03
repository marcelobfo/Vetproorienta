import QRCode from 'qrcode';

/**
 * Utilitários e Interfaces para integração com Asaas (Assinaturas, Clientes e Webhook)
 */

export interface AsaasConfig {
  apiKey?: string;
  environment?: 'auto' | 'sandbox' | 'production' | 'custom';
  customBaseUrl?: string;
  webhookAuthToken?: string;
  notificationDisabled?: boolean;
  defaultCycle?: AsaasCycle;
  dueDaysOffset?: number;
  defaultBillingType?: AsaasBillingType;
  fineValue?: number;
  interestValue?: number;
  planEssencialPrice?: number;
  planEspecialistaPrice?: number;
  invoiceDescription?: string;
}

/**
 * Detecta e resolve a URL base do Asaas (Sandbox, Produção ou Customizada)
 */
export function getAsaasBaseUrl(
  apiKey?: string,
  environment?: 'auto' | 'sandbox' | 'production' | 'custom',
  customBaseUrl?: string
): string {
  // 1. Se houver URL customizada expressa
  if (environment === 'custom' && customBaseUrl && customBaseUrl.trim()) {
    return customBaseUrl.trim().replace(/\/+$/, '');
  }
  if (environment === 'production') {
    return 'https://api.asaas.com';
  }
  if (environment === 'sandbox') {
    return 'https://api-sandbox.asaas.com';
  }

  // 2. Se estiver no browser e houver config salva no localStorage
  if (typeof window !== 'undefined') {
    const savedEnv = localStorage.getItem('vetpro_asaas_environment');
    const savedCustomUrl = localStorage.getItem('vetpro_asaas_custom_base_url');
    if (savedEnv === 'production') return 'https://api.asaas.com';
    if (savedEnv === 'sandbox') return 'https://api-sandbox.asaas.com';
    if (savedEnv === 'custom' && savedCustomUrl) return savedCustomUrl.trim().replace(/\/+$/, '');
  }

  // 3. Verifica variáveis de ambiente do servidor
  const envVar = (
    process.env.ASAAS_ENVIRONMENT || 
    process.env.ASAAS_ENV || 
    process.env.NEXT_PUBLIC_ASAAS_ENVIRONMENT || 
    ''
  ).toLowerCase().trim();

  if (envVar === 'production') return 'https://api.asaas.com';
  if (envVar === 'sandbox') return 'https://api-sandbox.asaas.com';

  const customUrlVar = (process.env.ASAAS_BASE_URL || '').trim();
  if (customUrlVar) return customUrlVar.replace(/\/+$/, '');

  const key = (apiKey || getAsaasApiKey() || '').trim();

  // 4. Se a chave possui identificadores explícitos de sandbox / homologação
  if (key && (
    key.includes('hml') || 
    key.includes('sandbox') || 
    key.startsWith('$aact_YTU') || 
    key.includes('_sandbox_') || 
    key.includes('_test_')
  )) {
    return 'https://api-sandbox.asaas.com';
  }

  // 5. Se estiver em modo de desenvolvimento local ou default seguro
  if (process.env.NODE_ENV === 'development') {
    return 'https://api-sandbox.asaas.com';
  }

  // 6. Chave padrão Asaas ($aact_...)
  if (key && key.startsWith('$aact_')) {
    return 'https://api.asaas.com';
  }

  return 'https://api-sandbox.asaas.com';
}

export function getAsaasApiKey(): string {
  let key = (process.env.ASAAS_API_KEY || '').trim();
  if (typeof window !== 'undefined') {
    const localApiKey = localStorage.getItem('vetpro_asaas_apikey');
    if (localApiKey && localApiKey.trim()) key = localApiKey.trim();
  }
  return key;
}

export interface AsaasCustomerRequest {
  name: string;
  cpfCnpj: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  postalCode?: string;
  externalReference?: string;
  notificationDisabled?: boolean;
  additionalEmails?: string;
}

export interface AsaasCustomerResponse {
  object: string;
  id: string;
  dateCreated: string;
  name: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  cpfCnpj: string;
  externalReference?: string;
  deleted?: boolean;
}

export type AsaasBillingType = 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
export type AsaasCycle = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'BIMONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';
export type AsaasSubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'INACTIVE';

export interface AsaasSubscriptionRequest {
  customer: string;
  billingType: AsaasBillingType;
  value: number;
  nextDueDate: string; // YYYY-MM-DD
  cycle?: AsaasCycle;
  description?: string;
  endDate?: string;
  maxPayments?: number;
  externalReference?: string;
  callback?: {
    successUrl: string;
    autoRedirect?: boolean;
  };
}

export interface AsaasSubscriptionResponse {
  object: string;
  id: string;
  dateCreated: string;
  customer: string;
  paymentLink?: string;
  billingType: AsaasBillingType;
  cycle: AsaasCycle;
  value: number;
  nextDueDate: string;
  endDate?: string;
  description?: string;
  status: AsaasSubscriptionStatus;
  deleted?: boolean;
  maxPayments?: number;
  externalReference?: string;
  checkoutSession?: string;
}

export const getAsaasConfig = (): AsaasConfig => {
  let apiKey = (process.env.ASAAS_API_KEY || '').trim();
  let webhookAuthToken = (process.env.ASAAS_WEBHOOK_AUTH_TOKEN || '').trim();
  let environment: 'auto' | 'sandbox' | 'production' | 'custom' = (
    process.env.ASAAS_ENVIRONMENT || 
    process.env.ASAAS_ENV || 
    process.env.NEXT_PUBLIC_ASAAS_ENVIRONMENT || 
    'auto'
  ) as any;
  let customBaseUrl = (process.env.ASAAS_BASE_URL || '').trim();
  let notificationDisabled = process.env.ASAAS_NOTIFICATION_DISABLED === 'true';
  let defaultCycle: AsaasCycle = (process.env.ASAAS_DEFAULT_CYCLE as any) || 'MONTHLY';
  let dueDaysOffset = process.env.ASAAS_DUE_DAYS ? parseInt(process.env.ASAAS_DUE_DAYS, 10) : 1;
  let defaultBillingType: AsaasBillingType = (process.env.ASAAS_DEFAULT_BILLING as any) || 'UNDEFINED';
  let fineValue = 2.0;
  let interestValue = 1.0;
  let planEssencialPrice = 9.90;
  let planEspecialistaPrice = 29.90;
  let invoiceDescription = 'Assinatura VetPro Orienta';

  if (typeof window !== 'undefined') {
    const localApiKey = localStorage.getItem('vetpro_asaas_apikey');
    const localToken = localStorage.getItem('vetpro_asaas_webhook_token');
    const localEnv = localStorage.getItem('vetpro_asaas_environment');
    const localCustomUrl = localStorage.getItem('vetpro_asaas_custom_base_url');
    const localNotif = localStorage.getItem('vetpro_asaas_notification_disabled');
    const localCycle = localStorage.getItem('vetpro_asaas_default_cycle');
    const localDue = localStorage.getItem('vetpro_asaas_due_days');
    const localBillingType = localStorage.getItem('vetpro_asaas_default_billing');
    const localFine = localStorage.getItem('vetpro_asaas_fine_val');
    const localInterest = localStorage.getItem('vetpro_asaas_interest_val');
    const localPriceEssencial = localStorage.getItem('vetpro_asaas_price_essencial');
    const localPriceEspecialista = localStorage.getItem('vetpro_asaas_price_especialista');
    const localDesc = localStorage.getItem('vetpro_asaas_invoice_desc');

    if (localApiKey) apiKey = localApiKey;
    if (localToken) webhookAuthToken = localToken;
    if (localEnv) environment = localEnv as any;
    if (localCustomUrl) customBaseUrl = localCustomUrl;
    if (localNotif !== null) notificationDisabled = localNotif === 'true';
    if (localCycle) defaultCycle = localCycle as AsaasCycle;
    if (localDue !== null && localDue !== '') {
      const parsed = parseInt(localDue, 10);
      dueDaysOffset = isNaN(parsed) ? 1 : Math.max(0, parsed);
    }
    if (localBillingType) defaultBillingType = localBillingType as AsaasBillingType;
    if (localFine !== null && localFine !== '') {
      const parsed = parseFloat(localFine);
      fineValue = isNaN(parsed) ? 0 : parsed;
    }
    if (localInterest !== null && localInterest !== '') {
      const parsed = parseFloat(localInterest);
      interestValue = isNaN(parsed) ? 0 : parsed;
    }
    if (localPriceEssencial !== null && localPriceEssencial !== '') {
      const parsed = parseFloat(localPriceEssencial);
      planEssencialPrice = isNaN(parsed) ? 9.90 : parsed;
    }
    if (localPriceEspecialista !== null && localPriceEspecialista !== '') {
      const parsed = parseFloat(localPriceEspecialista);
      planEspecialistaPrice = isNaN(parsed) ? 29.90 : parsed;
    }
    if (localDesc) invoiceDescription = localDesc;
  }

  return {
    apiKey,
    webhookAuthToken,
    environment,
    customBaseUrl,
    notificationDisabled,
    defaultCycle,
    dueDaysOffset,
    defaultBillingType,
    fineValue,
    interestValue,
    planEssencialPrice,
    planEspecialistaPrice,
    invoiceDescription,
  };
};

export const saveAsaasConfig = (config: Partial<AsaasConfig>) => {
  if (typeof window !== 'undefined') {
    if (config.apiKey !== undefined) localStorage.setItem('vetpro_asaas_apikey', config.apiKey.trim());
    if (config.webhookAuthToken !== undefined) localStorage.setItem('vetpro_asaas_webhook_token', config.webhookAuthToken.trim());
    if (config.environment !== undefined) localStorage.setItem('vetpro_asaas_environment', config.environment);
    if (config.customBaseUrl !== undefined) localStorage.setItem('vetpro_asaas_custom_base_url', config.customBaseUrl.trim());
    if (config.notificationDisabled !== undefined) localStorage.setItem('vetpro_asaas_notification_disabled', String(config.notificationDisabled));
    if (config.defaultCycle !== undefined) localStorage.setItem('vetpro_asaas_default_cycle', config.defaultCycle);
    if (config.dueDaysOffset !== undefined) localStorage.setItem('vetpro_asaas_due_days', String(config.dueDaysOffset));
    if (config.defaultBillingType !== undefined) localStorage.setItem('vetpro_asaas_default_billing', config.defaultBillingType);
    if (config.fineValue !== undefined) localStorage.setItem('vetpro_asaas_fine_val', String(config.fineValue));
    if (config.interestValue !== undefined) localStorage.setItem('vetpro_asaas_interest_val', String(config.interestValue));
    if (config.planEssencialPrice !== undefined) localStorage.setItem('vetpro_asaas_price_essencial', String(config.planEssencialPrice));
    if (config.planEspecialistaPrice !== undefined) localStorage.setItem('vetpro_asaas_price_especialista', String(config.planEspecialistaPrice));
    if (config.invoiceDescription !== undefined) localStorage.setItem('vetpro_asaas_invoice_desc', config.invoiceDescription);
  }
};

/**
 * Cria ou busca cliente diretamente no Asaas via HTTPS (Seguro para Server e Client)
 */
export async function directCreateAsaasCustomer(
  customerData: AsaasCustomerRequest,
  configOverride?: Partial<AsaasConfig>
): Promise<{ success: boolean; customer?: AsaasCustomerResponse; isExisting?: boolean; error?: string; details?: any }> {
  try {
    const config = { ...getAsaasConfig(), ...configOverride };
    const apiKey = (config.apiKey || process.env.ASAAS_API_KEY || '').trim();
    const baseUrl = getAsaasBaseUrl(apiKey, config.environment, config.customBaseUrl);

    if (!apiKey) {
      return {
        success: false,
        error: 'Chave de API do Asaas não configurada.',
      };
    }

    const sanitizedCpfCnpj = (customerData.cpfCnpj || '').replace(/\D/g, '');
    if (sanitizedCpfCnpj.length !== 11 && sanitizedCpfCnpj.length !== 14) {
      return {
        success: false,
        error: 'CPF ou CNPJ inválido para o Asaas.',
      };
    }

    const mobilePhone = customerData.mobilePhone 
      ? customerData.mobilePhone.replace(/\D/g, '') 
      : customerData.phone 
        ? customerData.phone.replace(/\D/g, '') 
        : undefined;

    const headers = {
      'Content-Type': 'application/json',
      'access_token': apiKey,
      'User-Agent': 'VetProOrienta/1.0.0 (https://vetpro-orienta.app)',
    };

    // 1. Busca cliente existente para evitar duplicidade
    let activeBaseUrl = baseUrl;
    let searchUrl = `${activeBaseUrl}/v3/customers?cpfCnpj=${encodeURIComponent(sanitizedCpfCnpj)}`;
    let searchRes: Response | null = null;
    try {
      searchRes = await fetch(searchUrl, { method: 'GET', headers });
      // Se deu 401 e o ambiente não foi forçado, tenta no ambiente oposto (Sandbox <-> Produção)
      if (searchRes.status === 401 && (!config.environment || config.environment === 'auto')) {
        const fallbackUrl = activeBaseUrl.includes('sandbox') ? 'https://api.asaas.com' : 'https://api-sandbox.asaas.com';
        console.warn(`[Asaas] 401 no endpoint ${activeBaseUrl}. Tentando fallback em ${fallbackUrl}...`);
        const fallbackRes = await fetch(`${fallbackUrl}/v3/customers?cpfCnpj=${encodeURIComponent(sanitizedCpfCnpj)}`, { method: 'GET', headers });
        if (fallbackRes.ok || fallbackRes.status !== 401) {
          activeBaseUrl = fallbackUrl;
          searchRes = fallbackRes;
        }
      }

      if (searchRes && searchRes.ok) {
        const searchJson = await searchRes.json();
        if (searchJson && Array.isArray(searchJson.data) && searchJson.data.length > 0) {
          console.log(`[Asaas] Cliente existente localizado no Asaas (${searchJson.data[0].id})`);
          return {
            success: true,
            customer: searchJson.data[0],
            isExisting: true,
          };
        }
      }
    } catch (sErr) {
      console.warn('[Asaas] Aviso na busca prévia de cliente:', sErr);
    }

    // 2. Criação do cliente
    const payload: Record<string, any> = {
      name: customerData.name.trim(),
      cpfCnpj: sanitizedCpfCnpj,
    };
    if (customerData.email && customerData.email.trim()) payload.email = customerData.email.trim();
    if (mobilePhone && mobilePhone.length >= 10) payload.mobilePhone = mobilePhone;
    if (customerData.address) payload.address = customerData.address;
    if (customerData.addressNumber) payload.addressNumber = customerData.addressNumber;
    if (customerData.complement) payload.complement = customerData.complement;
    if (customerData.province) payload.province = customerData.province;
    if (customerData.postalCode) payload.postalCode = customerData.postalCode.replace(/\D/g, '');
    if (customerData.externalReference) payload.externalReference = customerData.externalReference;
    if (customerData.notificationDisabled !== undefined) {
      payload.notificationDisabled = customerData.notificationDisabled;
    }

    let createUrl = `${activeBaseUrl}/v3/customers`;
    let createRes = await fetch(createUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    // Se falhar com 401 e o ambiente não estiver travado, tenta no outro endpoint
    if (createRes.status === 401 && (!config.environment || config.environment === 'auto')) {
      const fallbackUrl = activeBaseUrl.includes('sandbox') ? 'https://api.asaas.com' : 'https://api-sandbox.asaas.com';
      console.warn(`[Asaas] 401 ao criar cliente em ${activeBaseUrl}. Tentando fallback em ${fallbackUrl}...`);
      const retryRes = await fetch(`${fallbackUrl}/v3/customers`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      if (retryRes.ok || retryRes.status !== 401) {
        activeBaseUrl = fallbackUrl;
        createRes = retryRes;
      }
    }

    const createJson = await createRes.json();

    if (!createRes.ok) {
      let errorMessage = 'Erro ao cadastrar cliente no Asaas.';
      if (Array.isArray(createJson?.errors) && createJson.errors.length > 0) {
        errorMessage = createJson.errors.map((e: any) => e.description || e.code).join(' | ');
      } else if (createJson?.message) {
        errorMessage = createJson.message;
      }
      return {
        success: false,
        error: errorMessage,
        details: createJson,
      };
    }

    return {
      success: true,
      customer: createJson,
      isExisting: false,
      details: createJson,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Erro de conexão com a API do Asaas.',
      details: err,
    };
  }
}

/**
 * Cria uma assinatura diretamente no Asaas via HTTPS (Seguro para Server e Client)
 */
export async function directCreateAsaasSubscription(
  subscriptionData: AsaasSubscriptionRequest,
  configOverride?: Partial<AsaasConfig>
): Promise<{ 
  success: boolean; 
  subscription?: AsaasSubscriptionResponse; 
  paymentUrl?: string; 
  pixQrCodeImage?: string; 
  pixCopiaECola?: string; 
  paymentId?: string;
  dueDate?: string;
  error?: string; 
  details?: any 
}> {
  try {
    const config = { ...getAsaasConfig(), ...configOverride };
    const apiKey = (config.apiKey || process.env.ASAAS_API_KEY || '').trim();
    const baseUrl = getAsaasBaseUrl(apiKey, config.environment, config.customBaseUrl);

    if (!apiKey) {
      return {
        success: false,
        error: 'Chave de API do Asaas não configurada.',
      };
    }

    const payload: Record<string, any> = {
      customer: subscriptionData.customer,
      billingType: subscriptionData.billingType || 'UNDEFINED',
      value: Number(subscriptionData.value),
      nextDueDate: subscriptionData.nextDueDate,
      cycle: subscriptionData.cycle || 'MONTHLY',
      description: subscriptionData.description || 'Assinatura VetPro Orienta',
    };

    if (subscriptionData.externalReference) payload.externalReference = subscriptionData.externalReference;
    if (subscriptionData.endDate) payload.endDate = subscriptionData.endDate;
    if (subscriptionData.maxPayments) payload.maxPayments = Number(subscriptionData.maxPayments);

    const headers = {
      'Content-Type': 'application/json',
      'access_token': apiKey,
      'User-Agent': 'VetProOrienta/1.0.0 (https://vetpro-orienta.app)',
    };

    let activeBaseUrl = baseUrl;
    let targetUrl = `${activeBaseUrl}/v3/subscriptions`;
    let asaasRes = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (asaasRes.status === 401 && (!config.environment || config.environment === 'auto')) {
      const fallbackUrl = activeBaseUrl.includes('sandbox') ? 'https://api.asaas.com' : 'https://api-sandbox.asaas.com';
      console.warn(`[Asaas] 401 ao criar assinatura em ${activeBaseUrl}. Tentando fallback em ${fallbackUrl}...`);
      const retryRes = await fetch(`${fallbackUrl}/v3/subscriptions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      if (retryRes.ok || retryRes.status !== 401) {
        activeBaseUrl = fallbackUrl;
        asaasRes = retryRes;
      }
    }

    const resJson = await asaasRes.json();

    if (!asaasRes.ok) {
      let errorMessage = 'Erro ao criar assinatura no Asaas.';
      if (Array.isArray(resJson?.errors) && resJson.errors.length > 0) {
        errorMessage = resJson.errors.map((e: any) => e.description || e.code).join(' | ');
      } else if (resJson?.message) {
        errorMessage = resJson.message;
      }
      return {
        success: false,
        error: errorMessage,
        details: resJson,
      };
    }

    let paymentUrl = resJson.paymentLink || '';
    let pixQrCodeImage = '';
    let pixCopiaECola = '';
    let paymentId = '';
    let paymentDueDate = '';

    // Busca dados de cobrança imediata / PIX gerado
    if (resJson.id) {
      // Tenta até 3 vezes com pequeno delay caso o Asaas demore para gerar a cobrança da assinatura
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          if (attempt > 0) {
            await new Promise((resolve) => setTimeout(resolve, 600));
          }

          const paymentsRes = await fetch(`${activeBaseUrl}/v3/subscriptions/${resJson.id}/payments`, {
            method: 'GET',
            headers,
          });

          if (paymentsRes.ok) {
            const paymentsJson = await paymentsRes.json();
            const firstPayment = paymentsJson?.data?.[0];
            if (firstPayment) {
              paymentId = firstPayment.id;
              paymentDueDate = firstPayment.dueDate;
              if (!paymentUrl && (firstPayment.invoiceUrl || firstPayment.bankSlipUrl)) {
                paymentUrl = firstPayment.invoiceUrl || firstPayment.bankSlipUrl;
              }

              if (paymentId) {
                try {
                  const pixRes = await fetch(`${activeBaseUrl}/v3/payments/${paymentId}/pixQrCode`, {
                    method: 'GET',
                    headers,
                  });
                  if (pixRes.ok) {
                    const pixJson = await pixRes.json();
                    if (pixJson?.payload) {
                      pixCopiaECola = pixJson.payload;
                      // Gera QR Code nítido e escaneável a partir do payload Pix
                      try {
                        pixQrCodeImage = await QRCode.toDataURL(pixJson.payload, {
                          width: 400,
                          margin: 2,
                          errorCorrectionLevel: 'M',
                          color: { dark: '#000000', light: '#ffffff' },
                        });
                      } catch {
                        if (pixJson.encodedImage) {
                          pixQrCodeImage = pixJson.encodedImage.startsWith('data:')
                            ? pixJson.encodedImage
                            : `data:image/png;base64,${pixJson.encodedImage}`;
                        }
                      }
                    } else if (pixJson?.encodedImage) {
                      pixQrCodeImage = pixJson.encodedImage.startsWith('data:') 
                        ? pixJson.encodedImage 
                        : `data:image/png;base64,${pixJson.encodedImage}`;
                    }
                  }
                } catch (pixErr) {
                  console.warn('[Asaas] Falha ao recuperar QR Code PIX da fatura:', pixErr);
                }
              }
              break; // Encontrou pagamento
            }
          }
        } catch (pErr) {
          console.warn('[Asaas] Falha ao listar pagamentos da assinatura (tentativa ' + (attempt + 1) + '):', pErr);
        }
      }
    }

    return {
      success: true,
      subscription: resJson,
      paymentUrl,
      pixQrCodeImage,
      pixCopiaECola,
      paymentId,
      dueDate: paymentDueDate,
      details: resJson,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Erro de conexão com a API do Asaas.',
      details: err,
    };
  }
}

/**
 * Cria ou busca cliente no Asaas
 */
export async function createAsaasCustomer(
  customerData: AsaasCustomerRequest,
  configOverride?: Partial<AsaasConfig>
): Promise<{ success: boolean; customer?: AsaasCustomerResponse; isExisting?: boolean; error?: string; details?: any }> {
  // Se estiver no servidor, executa diretamente
  if (typeof window === 'undefined') {
    return directCreateAsaasCustomer(customerData, configOverride);
  }

  try {
    const config = { ...getAsaasConfig(), ...configOverride };

    const res = await fetch('/api/asaas/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer: customerData,
        apiKey: config.apiKey,
        environment: config.environment,
        customBaseUrl: config.customBaseUrl,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Erro ao processar cliente no Asaas.',
        details: data.details || data,
      };
    }

    return {
      success: true,
      customer: data.customer,
      isExisting: data.isExisting,
      details: data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Falha de conexão com o servidor.',
      details: err,
    };
  }
}

/**
 * Cria uma nova assinatura no Asaas (POST /v3/subscriptions)
 */
export async function createAsaasSubscription(
  subscriptionData: AsaasSubscriptionRequest,
  configOverride?: Partial<AsaasConfig>
): Promise<{ success: boolean; subscription?: AsaasSubscriptionResponse; paymentUrl?: string; pixQrCodeImage?: string; pixCopiaECola?: string; paymentId?: string; dueDate?: string; error?: string; details?: any }> {
  // Se estiver no servidor, executa diretamente
  if (typeof window === 'undefined') {
    return directCreateAsaasSubscription(subscriptionData, configOverride);
  }

  try {
    const config = { ...getAsaasConfig(), ...configOverride };

    const res = await fetch('/api/asaas/subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription: subscriptionData,
        apiKey: config.apiKey,
        environment: config.environment,
        customBaseUrl: config.customBaseUrl,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Erro ao criar assinatura no Asaas.',
        details: data.details || data,
      };
    }

    return {
      success: true,
      subscription: data.subscription,
      paymentUrl: data.paymentUrl || data.subscription?.paymentLink,
      pixQrCodeImage: data.pixQrCodeImage,
      pixCopiaECola: data.pixCopiaECola,
      paymentId: data.paymentId,
      dueDate: data.dueDate,
      details: data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Falha de conexão com o servidor.',
      details: err,
    };
  }
}

/**
 * Testa conexão com a API do Asaas
 */
export async function testAsaasConnection(
  configOverride?: Partial<AsaasConfig>
): Promise<{ success: boolean; message: string; details?: any; environment?: string; baseUrl?: string }> {
  try {
    const config = { ...getAsaasConfig(), ...configOverride };

    const res = await fetch('/api/asaas/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: config.apiKey,
        environment: config.environment,
        customBaseUrl: config.customBaseUrl,
      }),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: `Erro ao testar Asaas: ${err.message || 'Falha na requisição'}`,
      details: err,
    };
  }
}

/**
 * Dispara desbloqueio global do sistema em todas as abas e componentes da aplicação
 */
export function broadcastSubscriptionUnlock(detail?: { planName?: string; status?: string; source?: string }) {
  if (typeof window === 'undefined') return;

  const plan = detail?.planName || localStorage.getItem('vetpro_selected_plan') || 'Essencial';
  const status = detail?.status || 'ACTIVE';

  localStorage.setItem('vetpro_subscription_status', status);
  localStorage.setItem('vetpro_subscription_paid', 'true');
  localStorage.setItem('vetpro_selected_plan', plan);
  localStorage.setItem('vetpro_subscription_created_at', new Date().toISOString());

  try {
    const event = new CustomEvent('vetpro_subscription_unlocked', {
      detail: {
        active: true,
        status,
        planName: plan,
        timestamp: Date.now(),
        source: detail?.source || 'manual_verify',
      },
    });
    window.dispatchEvent(event);
  } catch (err) {
    console.warn('[Asaas] Erro ao disparar evento global de desbloqueio:', err);
  }
}

/**
 * Função ÚNICA e CENTRALIZADA para checar e desbloquear o sistema no Asaas
 */
export async function verifyAndUnlockSubscription(params: {
  customerId?: string;
  subscriptionId?: string;
  email?: string;
  userId?: string;
}): Promise<{
  success: boolean;
  paid: boolean;
  status: string;
  planName?: string;
  message: string;
  pixQrCodeImage?: string;
  pixCopiaECola?: string;
  paymentUrl?: string;
  bankSlipUrl?: string;
  identificationField?: string;
  details?: any;
}> {
  try {
    const res = await fetch('/api/asaas/check-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: params.customerId || (typeof window !== 'undefined' ? localStorage.getItem('vetpro_asaas_customer_id') : undefined),
        subscriptionId: params.subscriptionId || (typeof window !== 'undefined' ? localStorage.getItem('vetpro_asaas_subscription_id') : undefined),
        email: params.email || (typeof window !== 'undefined' ? localStorage.getItem('vetpro_tutor_email') : undefined),
        userId: params.userId,
      }),
    });

    const data = await res.json();

    if (data.success && (data.paid || data.status === 'ACTIVE')) {
      broadcastSubscriptionUnlock({
        planName: data.planName,
        status: 'ACTIVE',
        source: 'check_payment_api',
      });

      return {
        success: true,
        paid: true,
        status: 'ACTIVE',
        planName: data.planName,
        message: '🎉 Pagamento confirmado com sucesso! Seu sistema VetPro foi 100% liberado.',
        details: data,
      };
    }

    if (data.success) {
      return {
        success: true,
        paid: false,
        status: data.status || 'PENDING',
        message: 'Fatura pendente no gateway bancário. Pague via Pix ou Cartão para liberar.',
        pixQrCodeImage: data.pixQrCodeImage,
        pixCopiaECola: data.pixCopiaECola,
        paymentUrl: data.paymentUrl,
        bankSlipUrl: data.bankSlipUrl,
        identificationField: data.identificationField,
        details: data,
      };
    }

    return {
      success: false,
      paid: false,
      status: 'ERROR',
      message: data.error || 'Aguardando sincronização de pagamento no Asaas.',
      details: data,
    };
  } catch (err: any) {
    return {
      success: false,
      paid: false,
      status: 'ERROR',
      message: err.message || 'Erro de conexão ao verificar pagamento.',
    };
  }
}

/**
 * Verifica se um tutor possui assinatura ativa no sistema
 */
export function checkTutorSubscriptionStatus(emailOrCustomerId?: string): { hasActivePlan: boolean; planName?: string; status?: string } {
  if (typeof window === 'undefined') {
    return { hasActivePlan: false, planName: 'Essencial', status: 'PENDING_PAYMENT' };
  }

  const storedStatus = localStorage.getItem('vetpro_subscription_status');
  const storedPaid = localStorage.getItem('vetpro_subscription_paid');
  const storedPlan = localStorage.getItem('vetpro_selected_plan') || 'Essencial';
  const planDisplayName = storedPlan === 'especialista' ? 'Especialista' : 'Essencial';

  const isStatusActive = storedStatus === 'ACTIVE' || storedStatus === 'RECEIVED' || storedStatus === 'CONFIRMED' || storedPaid === 'true';

  if (!isStatusActive) {
    return {
      hasActivePlan: false,
      planName: planDisplayName,
      status: storedStatus || 'PENDING_PAYMENT',
    };
  }

  let createdAt = localStorage.getItem('vetpro_subscription_created_at');
  if (!createdAt) {
    createdAt = new Date().toISOString();
    localStorage.setItem('vetpro_subscription_created_at', createdAt);
  }

  const diffDays = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
  
  // A assinatura dura exatamente 30 dias. Passou de 30 dias, expira automaticamente para pendente/inativo.
  if (diffDays > 30) {
    localStorage.setItem('vetpro_subscription_status', 'PENDING_PAYMENT');
    localStorage.removeItem('vetpro_subscription_paid');
    return {
      hasActivePlan: false,
      planName: planDisplayName,
      status: 'PENDING_PAYMENT',
    };
  }

  return {
    hasActivePlan: true,
    planName: planDisplayName,
    status: 'ACTIVE',
  };
}
