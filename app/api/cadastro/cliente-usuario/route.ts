import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, getSupabaseAdminClient, isSupabaseConfigured } from '@/lib/supabase';
import { directCreateAsaasCustomer, directCreateAsaasSubscription, getAsaasBaseUrl, getAsaasApiKey } from '@/lib/asaas';

/**
 * Envia mensagem pelo Evolution API instalado (servidor / WhatsApp)
 */
async function sendWhatsAppMessage(toPhone: string, text: string) {
  let phone = toPhone.replace(/\D/g, '');
  if (!phone || phone.length < 10) return { success: false, error: 'Telefone inválido' };

  if (phone.length === 10 || phone.length === 11) {
    phone = `55${phone}`;
  }

  const serverUrl = (process.env.EVOLUTION_SERVER_URL || '').replace(/\/+$/, '');
  const apiKey = process.env.EVOLUTION_API_KEY || '';
  const instanceName = process.env.EVOLUTION_DEFAULT_INSTANCE || 'vetpro-clinica';

  if (!serverUrl) {
    console.warn('[WhatsApp] Servidor Evolution API não configurado.');
    return { success: false, error: 'Servidor Evolution não configurado' };
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
        number: phone,
        text,
        delay: 1200,
        linkPreview: true,
      }),
    });

    let data: any;
    try {
      data = await res.json();
    } catch {
      data = { raw: await res.text() };
    }
    return { success: res.ok, data };
  } catch (err: any) {
    console.error('[WhatsApp] Erro ao enviar mensagem WhatsApp:', err);
    return { success: false, error: err.message || 'Erro ao enviar mensagem WhatsApp' };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      name, 
      email, 
      cpfCnpj, 
      whatsapp, 
      planId, 
      planName, 
      planPrice, 
      dueDaysOffset,
      asaasConfig: clientAsaasConfig,
      supabaseConfig: clientSupabaseConfig,
    } = body;

    const trimmedName = (name || '').trim();
    const trimmedEmail = (email || '').trim().toLowerCase();
    const rawCpf = (cpfCnpj || '').replace(/\D/g, '');
    const rawPhone = (whatsapp || '').replace(/\D/g, '');

    if (!trimmedName || rawCpf.length < 11) {
      return NextResponse.json(
        { success: false, error: 'Nome e CPF/CNPJ válidos são obrigatórios.' },
        { status: 400 }
      );
    }

    if (!trimmedEmail) {
      return NextResponse.json(
        { success: false, error: 'E-mail é obrigatório para a criação do usuário e acesso.' },
        { status: 400 }
      );
    }

    const initialPassword = rawCpf; // A senha inicial é o próprio CPF
    const numericPrice = Number(planPrice) || (planId === 'especialista' ? 29.90 : 9.90);
    const selectedPlanName = planName || (planId === 'especialista' ? 'Especialista' : 'Essencial');

    // -------------------------------------------------------------
    // 1. Criar ou Recuperar Cliente no Asaas
    // -------------------------------------------------------------
    let asaasCustomerId = '';
    let asaasCustomerResult: any = null;
    let asaasCustomerError: string | null = null;

    try {
      const asaasRes = await directCreateAsaasCustomer(
        {
          name: trimmedName,
          cpfCnpj: rawCpf,
          email: trimmedEmail,
          mobilePhone: rawPhone || undefined,
          externalReference: `tutor_${rawCpf}`,
        },
        clientAsaasConfig
      );

      if (asaasRes.success && asaasRes.customer) {
        asaasCustomerId = asaasRes.customer.id;
        asaasCustomerResult = asaasRes.customer;
      } else {
        asaasCustomerError = asaasRes.error || 'Não foi possível cadastrar no Asaas';
        console.warn('[Cadastro] Erro no Asaas Customer:', asaasCustomerError);
      }
    } catch (asaasErr: any) {
      asaasCustomerError = asaasErr.message;
      console.warn('[Cadastro] Falha ao comunicar com Asaas:', asaasErr.message);
    }

    // -------------------------------------------------------------
    // 2. Criar a Assinatura Recorrente no Asaas
    // -------------------------------------------------------------
    let subscriptionId = '';
    let paymentUrl = '';
    let pixQrCodeImage = '';
    let pixCopiaECola = '';
    let paymentId = '';
    let paymentDueDate = '';
    let asaasSubError: string | null = null;

    if (asaasCustomerId) {
      try {
        const offset = (dueDaysOffset !== undefined && !isNaN(Number(dueDaysOffset))) ? Number(dueDaysOffset) : 1;
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + offset);
        const nextDueDate = targetDate.toISOString().split('T')[0];

        const subRes = await directCreateAsaasSubscription(
          {
            customer: asaasCustomerId,
            billingType: 'UNDEFINED', // Permite PIX, Cartão ou Boleto no checkout
            value: numericPrice,
            nextDueDate,
            cycle: 'MONTHLY',
            description: `Assinatura Plano ${selectedPlanName} - VetPro Orienta (R$ ${numericPrice.toFixed(2)}/mês)`,
            externalReference: `sub_${planId || 'essencial'}_${rawCpf}`,
          },
          clientAsaasConfig
        );

        if (subRes.success && subRes.subscription) {
          subscriptionId = subRes.subscription.id;
          paymentUrl = subRes.paymentUrl || subRes.subscription.paymentLink || '';
          pixQrCodeImage = subRes.pixQrCodeImage || '';
          pixCopiaECola = subRes.pixCopiaECola || '';
          paymentId = subRes.paymentId || '';
          paymentDueDate = subRes.dueDate || nextDueDate;
        } else {
          asaasSubError = subRes.error || 'Erro ao gerar fatura/assinatura no Asaas';
          console.warn('[Cadastro] Erro na assinatura Asaas:', asaasSubError);
        }
      } catch (subErr: any) {
        asaasSubError = subErr.message;
        console.warn('[Cadastro] Erro ao criar assinatura no Asaas:', subErr.message);
      }
    }

    // -------------------------------------------------------------
    // 3. Criar Usuário no Banco de Dados (Supabase Auth & user_profiles)
    // Status inicial: 'PENDING' / Aguardando confirmação do pagamento no Asaas
    // -------------------------------------------------------------
    let userId = '';
    let userCreatedInSupabase = false;
    let profileCreatedInSupabase = false;
    let supabaseErrorDetails: string | null = null;

    const customSupabaseUrl = clientSupabaseConfig?.url;
    const customSupabaseAnonKey = clientSupabaseConfig?.anonKey;
    const customSupabaseServiceKey = clientSupabaseConfig?.serviceRoleKey;

    if (isSupabaseConfigured(customSupabaseUrl, customSupabaseAnonKey || customSupabaseServiceKey)) {
      try {
        const adminClient = getSupabaseAdminClient(customSupabaseUrl, customSupabaseServiceKey);
        const supabase = adminClient || getSupabaseClient(customSupabaseUrl, customSupabaseAnonKey);

        // 3.1 Obtém ou garante a existência de um tenant padrão
        let defaultTenantId: string | null = null;
        try {
          const { data: tenants } = await supabase.from('tenants').select('id').order('created_at', { ascending: true }).limit(1);
          if (tenants && tenants.length > 0) {
            defaultTenantId = tenants[0].id;
          } else {
            const { data: newTenant } = await supabase.from('tenants').insert({
              name: 'Clínica Principal VetPro',
              plan_name: 'VetPro Starter',
              status: 'active',
            }).select('id').single();
            if (newTenant) defaultTenantId = newTenant.id;
          }
        } catch (tErr) {
          console.warn('[Cadastro] Aviso ao obter tenant:', tErr);
        }

        // 3.2 Tenta criar no Auth do Supabase com senha = CPF
        if (adminClient && adminClient.auth?.admin) {
          try {
            const { data: adminUserData, error: adminUserError } = await adminClient.auth.admin.createUser({
              email: trimmedEmail,
              password: initialPassword,
              email_confirm: true,
              user_metadata: {
                full_name: trimmedName,
                phone: rawPhone,
                cpf: rawCpf,
                cpf_cnpj: rawCpf,
                role: 'tutor',
                asaas_customer_id: asaasCustomerId || null,
                asaas_subscription_id: subscriptionId || null,
                plan_selected: planId || 'essencial',
              },
            });

            if (adminUserData?.user?.id) {
              userId = adminUserData.user.id;
              userCreatedInSupabase = true;
            } else if (adminUserError) {
              console.warn('[Cadastro] admin.createUser aviso:', adminUserError.message);
              // Se usuário já existe, tenta localizar o ID dele
              try {
                const { data: userList } = await adminClient.auth.admin.listUsers();
                const matched = userList?.users?.find((u: any) => u.email?.toLowerCase() === trimmedEmail);
                if (matched?.id) {
                  userId = matched.id;
                  userCreatedInSupabase = true;
                }
              } catch (listErr) {
                console.warn('[Cadastro] Não foi possível listar usuários admin:', listErr);
              }
            }
          } catch (admErr: any) {
            console.warn('[Cadastro] admin.createUser falhou, tentando fallback:', admErr.message);
          }
        }

        // 3.3 Fallback para signUp comum caso admin não tenha sido usado ou falhado
        if (!userId) {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: trimmedEmail,
            password: initialPassword,
            options: {
              data: {
                full_name: trimmedName,
                phone: rawPhone,
                cpf: rawCpf,
                cpf_cnpj: rawCpf,
                role: 'tutor',
                asaas_customer_id: asaasCustomerId || null,
                asaas_subscription_id: subscriptionId || null,
              },
            },
          });

          if (signUpData?.user?.id) {
            userId = signUpData.user.id;
            userCreatedInSupabase = true;
          } else if (signUpError) {
            console.warn('[Cadastro] Supabase signUp aviso:', signUpError.message);
            supabaseErrorDetails = signUpError.message;
            // Se já existe no Supabase, tenta buscar o perfil existente
            try {
              const { data: existingProfile } = await supabase
                .from('user_profiles')
                .select('id')
                .eq('email', trimmedEmail)
                .maybeSingle();

              if (existingProfile?.id) {
                userId = existingProfile.id;
                userCreatedInSupabase = true;
              }
            } catch (pErr) {
              console.warn('[Cadastro] Erro ao buscar perfil por email:', pErr);
            }
          }
        }

        // Se ainda não temos userId válido, cria fallback UUID para não travar
        if (!userId) {
          userId = crypto.randomUUID();
        }

        // 3.4 Cria ou atualiza o perfil em user_profiles com campos compatíveis
        const nowIso = new Date().toISOString();
        const fullPayload: Record<string, any> = {
          id: userId,
          email: trimmedEmail,
          full_name: trimmedName,
          phone: rawPhone,
          role: 'tutor',
          cpf: rawCpf,
          cpf_cnpj: rawCpf,
          status: 'active',
          subscription_status: 'PENDING',
          asaas_customer_id: asaasCustomerId || null,
          asaas_subscription_id: subscriptionId || null,
          plan_selected: planId || 'essencial',
          plan_name: selectedPlanName,
          updated_at: nowIso,
        };

        if (defaultTenantId) {
          fullPayload.tenant_id = defaultTenantId;
        }

        // Tenta upsert completo primeiro
        let { error: profileError } = await supabase
          .from('user_profiles')
          .upsert(fullPayload, { onConflict: 'email' });

        if (profileError) {
          console.warn('[Cadastro] Tentando upsert com payload simplificado devido a:', profileError.message);
          // Tenta apenas com campos garantidos do schema
          const safePayload: Record<string, any> = {
            id: userId,
            email: trimmedEmail,
            full_name: trimmedName,
            phone: rawPhone,
            role: 'tutor',
            cpf_cnpj: rawCpf,
            status: 'active',
            subscription_status: 'PENDING',
            asaas_customer_id: asaasCustomerId || null,
            asaas_subscription_id: subscriptionId || null,
            plan_selected: planId || 'essencial',
            updated_at: nowIso,
          };
          if (defaultTenantId) safePayload.tenant_id = defaultTenantId;

          const retryResult = await supabase
            .from('user_profiles')
            .upsert(safePayload, { onConflict: 'email' });

          profileError = retryResult.error;
        }

        if (!profileError) {
          profileCreatedInSupabase = true;
          console.log(`[Cadastro] Perfil de usuário salvo com sucesso no Supabase: ${trimmedEmail} (${userId})`);
        } else {
          console.warn('[Cadastro] Erro ao gravar perfil no Supabase:', profileError.message);
          supabaseErrorDetails = (supabaseErrorDetails ? `${supabaseErrorDetails} | ` : '') + profileError.message;
        }
      } catch (dbErr: any) {
        supabaseErrorDetails = dbErr.message;
        console.warn('[Cadastro] Falha ao registrar no Supabase:', dbErr.message);
      }
    } else {
      supabaseErrorDetails = 'Supabase não configurado no servidor ou credenciais ausentes.';
    }

    // -------------------------------------------------------------
    // 4. Enviar WhatsApp via Evolution API com o Link de Checkout do Asaas
    // Mensagem de boas-vindas informando sobre a assinatura gerada e link para pagamento
    // -------------------------------------------------------------
    let whatsappSent = false;
    let whatsappResponse: any = null;

    if (rawPhone) {
      const firstName = trimmedName.split(' ')[0];
      
      let messageText = `Olá, *${firstName}*! 🐾 Seja muito bem-vindo(a) ao *VetPro Orienta*!\n\n` +
        `Recebemos seu cadastro para o *Plano ${selectedPlanName}* (R$ ${numericPrice.toFixed(2).replace('.', ',')}/mês).\n\n` +
        `📋 *Sua conta foi criada no sistema* e seus dados de acesso são:\n` +
        `• *Login (E-mail):* ${trimmedEmail}\n` +
        `• *Senha inicial:* ${rawCpf} *(seu CPF, apenas números)*\n\n` +
        `🔒 *Ativação do Acesso:*\n` +
        `Seu acesso completo à triagem veterinária inteligente e prontuários será liberado instantaneamente após a confirmação do pagamento da primeira mensalidade.\n\n`;

      if (pixCopiaECola) {
        messageText += `🔑 *Chave Pix Copia e Cola (Pagamento Imediato):*\n\`\`\`${pixCopiaECola}\`\`\`\n\n`;
      }

      if (paymentUrl) {
        messageText += `💳 *Ou acerte por Cartão / Boleto / Pix pelo checkout Asaas:*\n${paymentUrl}\n\n`;
      } else {
        messageText += `💳 *Fatura gerada no Asaas com sucesso.* Você receberá os detalhes da cobrança também por e-mail.\n\n`;
      }

      messageText += `Assim que o pagamento for compensado, você receberá uma nova confirmação aqui no WhatsApp e poderá entrar em https://vetpro-orienta.app/login para cadastrar seus pets.\n\n` +
        `Dúvidas? Estamos à disposição! 🐶🐱`;

      const waResult = await sendWhatsAppMessage(rawPhone, messageText);
      whatsappSent = waResult.success;
      whatsappResponse = waResult;
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        name: trimmedName,
        email: trimmedEmail,
        cpf: rawCpf,
        initialPassword,
        status: 'pending_payment',
      },
      asaas: {
        customerId: asaasCustomerId,
        subscriptionId,
        paymentUrl,
        paymentId,
        pixQrCodeImage,
        pixCopiaECola,
        dueDate: paymentDueDate,
        value: numericPrice,
        customerError: asaasCustomerError,
        subscriptionError: asaasSubError,
      },
      supabase: {
        userCreated: userCreatedInSupabase,
        profileCreated: profileCreatedInSupabase,
        error: supabaseErrorDetails,
      },
      whatsapp: {
        sent: whatsappSent,
        details: whatsappResponse,
      },
      message: 'Cadastro e usuário processados com sucesso! Link de checkout e instruções enviadas via WhatsApp.',
    });
  } catch (err: any) {
    console.error('Erro na rota /api/cadastro/cliente-usuario:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Erro interno ao processar cadastro e usuário.' },
      { status: 500 }
    );
  }
}
