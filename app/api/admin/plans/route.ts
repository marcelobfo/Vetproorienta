import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Os 3 planos canônicos e oficiais da plataforma
const CANONICAL_PLANS = [
  {
    id: 'essencial',
    slug: 'essencial',
    name: 'Essencial',
    description: 'Orientação e triagem técnica pelo chat da plataforma VetPro Orienta',
    price_monthly: 9.90,
    price_annual: 99.00,
    billing_cycle: 'MONTHLY',
    comparison_badge: '',
    is_active: true,
    is_coming_soon: false,
    is_popular: false,
    plan_type: 'tutor',
    features: [
      { text: 'Orientação e triagem técnica pelo chat da plataforma VetPro Orienta', strong: false, hasLock: false },
      { text: 'Envio de fotos e resultados de exames para análise', strong: false, hasLock: false },
      { text: 'Respostas rápidas e direcionamento estruturado', strong: false, hasLock: false },
      { text: 'Suporte informativo contínuo para a saúde do pet', strong: false, hasLock: false },
      { text: 'Cancele quando quiser, sem carência ou fidelidade', strong: false, hasLock: false }
    ]
  },
  {
    id: 'anual-promocional',
    slug: 'anual-promocional',
    name: 'Anual Essencial',
    description: 'Acesso completo o ano inteiro por apenas R$ 4,99/mês (Economize 50% em relação ao mensal de R$ 9,90)',
    price_monthly: 4.99,
    price_annual: 59.90,
    billing_cycle: 'YEARLY',
    comparison_badge: 'Mais Vendido — Economize 50% vs R$ 9,90/mês',
    is_active: true,
    is_coming_soon: false,
    is_popular: true,
    plan_type: 'tutor',
    features: [
      { text: 'Tudo incluído do plano Essencial o ano inteiro', strong: true, hasLock: false },
      { text: 'Orientação e triagem técnica contínua 365 dias', strong: false, hasLock: false },
      { text: 'Envio ilimitado de fotos e exames para triagem', strong: false, hasLock: false },
      { text: 'Equivalente a apenas R$ 4,99/mês (Cobrado R$ 59,90/ano)', strong: true, hasLock: false },
      { text: 'Economia de R$ 58,90 em relação ao plano mensal de R$ 9,90', strong: true, hasLock: false },
      { text: 'Garantia e renovação automática anual sem burocracia', strong: false, hasLock: false }
    ]
  },
  {
    id: 'especialista',
    slug: 'especialista',
    name: 'Especialista',
    description: 'Atendimento com médico-veterinário especialista dedicado',
    price_monthly: 29.90,
    price_annual: 299.00,
    billing_cycle: 'MONTHLY',
    comparison_badge: '',
    is_active: true,
    is_coming_soon: true, // Requisito: Exibido visualmente porém desabilitado e marcado como EM BREVE
    is_popular: false,
    plan_type: 'tutor',
    features: [
      { text: 'Tudo incluído do plano Essencial', strong: false, hasLock: false },
      { text: 'Atendimento com médico-veterinário especialista', strong: true, hasLock: true },
      { text: 'Avaliação detalhada de exames e histórico clínico', strong: true, hasLock: false },
      { text: 'Prioridade máxima de resposta e acompanhamento', strong: false, hasLock: false },
      { text: 'Cancele quando quiser, sem fidelidade', strong: false, hasLock: false }
    ]
  }
];

// Armazenamento em memória sincronizado
let memoryPlans: any[] = JSON.parse(JSON.stringify(CANONICAL_PLANS));

function getSupabaseAdmin(req?: NextRequest) {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const envKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const headerUrl = req?.headers.get('x-supabase-url') || '';
  const headerKey = req?.headers.get('x-supabase-service-key') || req?.headers.get('x-supabase-anon-key') || '';

  const finalUrl = headerUrl || envUrl;
  const finalKey = headerKey || envKey;

  if (!finalUrl || !finalKey) return null;

  return createClient(finalUrl, finalKey, {
    auth: { persistSession: false }
  });
}

function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// GET /api/admin/plans
export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin(req);
    const { searchParams } = new URL(req.url);
    const onlyActive = searchParams.get('active') === 'true';
    const planType = searchParams.get('type') || 'all';

    let loadedPlans: any[] | null = null;

    if (supabaseAdmin) {
      // 1. Tenta carregar do tenant_modules (fonte de verdade de configurações comerciais do Super Admin)
      try {
        const { data: moduleData } = await supabaseAdmin
          .from('tenant_modules')
          .select('settings')
          .eq('module_key', 'mod-commercial-plans-config')
          .maybeSingle();

        if (moduleData?.settings?.plans && Array.isArray(moduleData.settings.plans) && moduleData.settings.plans.length > 0) {
          loadedPlans = moduleData.settings.plans.map((p: any) => {
            const rawSlug = (p.slug || p.id || '').toLowerCase();
            const isEsp = rawSlug.includes('especialista') || (p.name && p.name.toLowerCase().includes('especialista')) || Number(p.price_monthly) === 29.90;
            return {
              ...p,
              is_active: p.is_active !== false,
              is_coming_soon: isEsp ? (p.is_coming_soon !== undefined && p.is_coming_soon !== null ? Boolean(p.is_coming_soon) : true) : Boolean(p.is_coming_soon),
              is_popular: p.is_popular !== undefined && p.is_popular !== null ? Boolean(p.is_popular) : (!isEsp && (rawSlug.includes('anual') || p.billing_cycle === 'YEARLY'))
            };
          });
        }
      } catch (err) {
        console.warn('[API Plans GET] Falha ao ler tenant_modules:', err);
      }

      // 2. Se não encontrou no tenant_modules, consulta a tabela plans
      if (!loadedPlans || loadedPlans.length === 0) {
        try {
          let query = supabaseAdmin
            .from('plans')
            .select('*')
            .order('price_monthly', { ascending: true });

          const { data, error } = await query;

          if (!error && data && data.length > 0) {
            const seenSlugs = new Set<string>();
            const uniquePlans: any[] = [];

            for (const p of data) {
              const rawSlug = (p.slug || p.id || '').toLowerCase();
              let canonicalKey = rawSlug;
              if (rawSlug.includes('anual') || (p.name && p.name.toLowerCase().includes('anual'))) {
                canonicalKey = 'anual-promocional';
              } else if (rawSlug.includes('especialista') || (p.name && p.name.toLowerCase().includes('especialista')) || Number(p.price_monthly) === 29.90) {
                canonicalKey = 'especialista';
              } else if (rawSlug.includes('essencial') || (p.name && p.name.toLowerCase().includes('essencial'))) {
                canonicalKey = 'essencial';
              }

              if (['essencial', 'anual-promocional', 'especialista'].includes(canonicalKey)) {
                if (seenSlugs.has(canonicalKey)) continue;
                seenSlugs.add(canonicalKey);
              } else {
                if (seenSlugs.has(rawSlug)) continue;
                seenSlugs.add(rawSlug);
              }

              const isEsp = canonicalKey === 'especialista';

              uniquePlans.push({
                ...p,
                id: p.slug || p.id,
                db_id: p.id,
                price_monthly: Number(p.price_monthly) || (isEsp ? 29.90 : (canonicalKey === 'anual-promocional' ? 4.99 : 9.90)),
                price_annual: Number(p.price_annual) || (isEsp ? 299.00 : (canonicalKey === 'anual-promocional' ? 59.90 : 99.00)),
                billing_cycle: p.billing_cycle || (canonicalKey === 'anual-promocional' ? 'YEARLY' : 'MONTHLY'),
                comparison_badge: p.comparison_badge || (canonicalKey === 'anual-promocional' ? 'Mais Vendido — Economize 50% vs R$ 9,90/mês' : ''),
                is_active: p.is_active !== false,
                is_coming_soon: isEsp ? (p.is_coming_soon !== undefined && p.is_coming_soon !== null ? Boolean(p.is_coming_soon) : true) : Boolean(p.is_coming_soon),
                is_popular: p.is_popular !== undefined && p.is_popular !== null ? Boolean(p.is_popular) : (canonicalKey === 'anual-promocional'),
                features: Array.isArray(p.features) && p.features.length > 0 ? p.features : []
              });
            }

            if (uniquePlans.length > 0) {
              loadedPlans = uniquePlans;
            }
          }
        } catch (tableErr) {
          console.warn('[API Plans GET] Falha ao consultar tabela plans:', tableErr);
        }
      }
    }

    // Se carregou do banco ou de módulos, atualiza memoryPlans
    if (loadedPlans && loadedPlans.length > 0) {
      memoryPlans = loadedPlans;
    }

    let result = [...memoryPlans];
    if (onlyActive) {
      result = result.filter(p => p.is_active !== false);
    }
    if (planType !== 'all') {
      result = result.filter(p => p.plan_type === planType);
    }

    return NextResponse.json({ success: true, plans: result, source: loadedPlans ? 'database' : 'default' });
  } catch (err: any) {
    console.error('[API Plans GET] Erro:', err);
    return NextResponse.json({ success: true, plans: memoryPlans, source: 'fallback_error', error: err.message });
  }
}

// Helper para persistir planos no tenant_modules
async function persistPlansToModule(supabaseAdmin: any, plans: any[]) {
  if (!supabaseAdmin) return;
  try {
    const { data: existing } = await supabaseAdmin
      .from('tenant_modules')
      .select('id')
      .eq('module_key', 'mod-commercial-plans-config')
      .maybeSingle();

    if (existing?.id) {
      await supabaseAdmin
        .from('tenant_modules')
        .update({
          settings: { plans, updated_at: new Date().toISOString() },
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      await supabaseAdmin
        .from('tenant_modules')
        .insert({
          module_key: 'mod-commercial-plans-config',
          module_name: 'Configuração Comercial de Planos',
          is_enabled: true,
          settings: { plans, updated_at: new Date().toISOString() }
        });
    }
  } catch (e: any) {
    console.warn('[API Plans PersistModule] Aviso:', e.message);
  }
}

// POST /api/admin/plans (Criar ou Atualizar Plano)
export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin(req);
    const body = await req.json();

    // Ação especial de Reset / Limpeza geral
    if (body.action === 'reset_defaults') {
      memoryPlans = JSON.parse(JSON.stringify(CANONICAL_PLANS));
      if (supabaseAdmin) {
        try {
          await persistPlansToModule(supabaseAdmin, memoryPlans);
          await supabaseAdmin.from('plans').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          for (const plan of CANONICAL_PLANS) {
            await supabaseAdmin.from('plans').insert({
              name: plan.name,
              slug: plan.slug,
              description: plan.description,
              price_monthly: plan.price_monthly,
              price_annual: plan.price_annual,
              billing_cycle: plan.billing_cycle,
              comparison_badge: plan.comparison_badge,
              is_active: plan.is_active,
              is_coming_soon: plan.is_coming_soon,
              is_popular: plan.is_popular,
              plan_type: plan.plan_type,
              features: plan.features
            });
          }
        } catch (e: any) {
          console.warn('[API Plans Reset] Erro ao resetar Supabase:', e.message);
        }
      }
      return NextResponse.json({ success: true, message: 'Planos restaurados para os 3 canônicos com sucesso!', plans: CANONICAL_PLANS });
    }

    const {
      id,
      db_id,
      name,
      slug,
      description,
      price_monthly,
      price_annual,
      billing_cycle,
      comparison_badge,
      is_active,
      is_coming_soon,
      is_popular,
      plan_type,
      features
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Nome do plano é obrigatório' }, { status: 400 });
    }

    const planSlug = slug || (id && id.length < 25 ? id : name.toLowerCase().replace(/[^a-z0-9]/g, '-'));

    const payload: any = {
      name,
      slug: planSlug,
      description: description || '',
      price_monthly: Number(price_monthly) || 0,
      price_annual: Number(price_annual) || 0,
      billing_cycle: billing_cycle || (planSlug === 'anual-promocional' || planSlug === 'anual' ? 'YEARLY' : 'MONTHLY'),
      comparison_badge: comparison_badge || '',
      is_active: is_active !== false,
      is_coming_soon: Boolean(is_coming_soon),
      is_popular: Boolean(is_popular),
      plan_type: plan_type || 'tutor',
      features: Array.isArray(features) ? features : [],
      updated_at: new Date().toISOString()
    };

    // Atualiza o estado em memória para consistência imediata
    const existingMemIndex = memoryPlans.findIndex(p => 
      p.id === id || 
      p.slug === planSlug || 
      (db_id && p.db_id === db_id) || 
      p.name.toLowerCase() === name.toLowerCase()
    );

    const memoryItem = {
      ...payload,
      id: planSlug,
      db_id: db_id || (existingMemIndex >= 0 ? memoryPlans[existingMemIndex].db_id : undefined)
    };

    if (existingMemIndex >= 0) {
      memoryPlans[existingMemIndex] = { ...memoryPlans[existingMemIndex], ...memoryItem };
    } else {
      memoryPlans.push(memoryItem);
    }

    // Persistência robusta no tenant_modules
    if (supabaseAdmin) {
      await persistPlansToModule(supabaseAdmin, memoryPlans);

      try {
        const targetId = db_id && isUUID(db_id) ? db_id : (id && isUUID(id) ? id : null);

        if (targetId) {
          await supabaseAdmin
            .from('plans')
            .update(payload)
            .eq('id', targetId);
        } else if (payload.slug) {
          const { data: existing } = await supabaseAdmin
            .from('plans')
            .select('id')
            .eq('slug', payload.slug)
            .maybeSingle();

          if (existing?.id) {
            await supabaseAdmin
              .from('plans')
              .update(payload)
              .eq('id', existing.id);
          } else {
            await supabaseAdmin
              .from('plans')
              .insert(payload);
          }
        }
      } catch (dbErr: any) {
        console.warn('[API Plans POST] Erro ao gravar na tabela plans (mantido em tenant_modules):', dbErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      plan: memoryItem,
      plans: memoryPlans,
      message: 'Plano atualizado com sucesso!'
    });
  } catch (err: any) {
    console.error('[API Plans POST] Falha crítica:', err);
    return NextResponse.json({ error: err.message || 'Erro ao processar plano' }, { status: 500 });
  }
}

// DELETE /api/admin/plans
export async function DELETE(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const action = searchParams.get('action');

    // Ação especial de Reset geral
    if (action === 'reset_defaults' || id === 'reset_defaults') {
      memoryPlans = JSON.parse(JSON.stringify(CANONICAL_PLANS));
      if (supabaseAdmin) {
        try {
          await persistPlansToModule(supabaseAdmin, memoryPlans);
          await supabaseAdmin.from('plans').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          for (const plan of CANONICAL_PLANS) {
            await supabaseAdmin.from('plans').insert({
              name: plan.name,
              slug: plan.slug,
              description: plan.description,
              price_monthly: plan.price_monthly,
              price_annual: plan.price_annual,
              billing_cycle: plan.billing_cycle,
              comparison_badge: plan.comparison_badge,
              is_active: plan.is_active,
              is_coming_soon: plan.is_coming_soon,
              is_popular: plan.is_popular,
              plan_type: plan.plan_type,
              features: plan.features
            });
          }
        } catch (e: any) {
          console.warn('[API Plans Delete Reset]:', e.message);
        }
      }
      return NextResponse.json({ success: true, message: 'Planos restaurados com sucesso para os 3 oficiais' });
    }

    if (!id) {
      return NextResponse.json({ error: 'ID do plano não informado' }, { status: 400 });
    }

    // Remove do array em memória
    memoryPlans = memoryPlans.filter(p => p.id !== id && p.slug !== id && p.db_id !== id && p.name !== id);

    if (supabaseAdmin) {
      await persistPlansToModule(supabaseAdmin, memoryPlans);
      try {
        if (isUUID(id)) {
          await supabaseAdmin.from('plans').delete().eq('id', id);
        } else {
          await supabaseAdmin.from('plans').delete().eq('slug', id);
          await supabaseAdmin.from('plans').delete().ilike('name', id);
        }
      } catch (e: any) {
        console.warn('[API Plans DELETE] Aviso:', e.message);
      }
    }

    return NextResponse.json({ success: true, message: 'Plano removido com sucesso' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

