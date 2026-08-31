import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { getEvolutionConfig, callEvolutionProxy, cleanErrorMessage } from '@/lib/evolution';
import { getPetVaccines, savePetVaccine, PetVaccineRecord, PetRecord, getSavedPets } from '@/lib/petService';

export interface AutoReminderSettings {
  enabled: boolean;
  daysInAdvance: number; // Disparar X dias antes do vencimento (ex: 3 dias)
  notifyOnDueDate: boolean; // Disparar no dia exato do vencimento
  notifyOverdue: boolean; // Disparar para vacinas já vencidas
  minDaysBetweenReminders: number; // Evitar spam: não reenviar se já enviado há menos de X dias (ex: 7 dias)
  maxBatchSize: number; // Limite de disparos por execução para evitar bloqueios no WhatsApp
  customMessageTemplate?: string;
  lastRunAt?: string;
  lastRunResult?: {
    totalFound: number;
    sentCount: number;
    failedCount: number;
    skippedCount: number;
    timestamp: string;
    logs: string[];
  };
}

export const DEFAULT_AUTO_REMINDER_SETTINGS: AutoReminderSettings = {
  enabled: true,
  daysInAdvance: 3,
  notifyOnDueDate: true,
  notifyOverdue: true,
  minDaysBetweenReminders: 7,
  maxBatchSize: 20,
};

const STORAGE_KEY = 'vetpro_auto_reminder_settings';

/**
 * Carrega as configurações de automação de lembretes do Supabase ou LocalStorage
 */
export async function getAutoReminderSettings(): Promise<AutoReminderSettings> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('key', 'auto_vaccine_reminders')
        .maybeSingle();

      if (!error && data && data.value) {
        return {
          ...DEFAULT_AUTO_REMINDER_SETTINGS,
          ...(typeof data.value === 'string' ? JSON.parse(data.value) : data.value)
        };
      }
    } catch (e) {
      console.warn('Erro ao carregar auto_reminder_settings do Supabase:', e);
    }
  }

  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        return { ...DEFAULT_AUTO_REMINDER_SETTINGS, ...JSON.parse(raw) };
      } catch {
        // Fallback
      }
    }
  }

  return DEFAULT_AUTO_REMINDER_SETTINGS;
}

/**
 * Salva as configurações de automação de lembretes
 */
export async function saveAutoReminderSettings(settings: Partial<AutoReminderSettings>): Promise<AutoReminderSettings> {
  const current = await getAutoReminderSettings();
  const updated: AutoReminderSettings = { ...current, ...settings };

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      await supabase.from('app_settings').upsert({
        key: 'auto_vaccine_reminders',
        value: updated,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
    } catch (e) {
      console.warn('Erro ao salvar auto_reminder_settings no Supabase:', e);
    }
  }

  return updated;
}

export interface AutoReminderRunResult {
  success: boolean;
  totalFound: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  logs: string[];
  error?: string;
}

/**
 * Executa o fluxo automático de verificação e disparo de lembretes de vacinação via Evolution API
 */
export async function runAutomatedVaccineReminders(options: {
  simulateOnly?: boolean;
  forceAllPending?: boolean;
  overrideSettings?: Partial<AutoReminderSettings>;
} = {}): Promise<AutoReminderRunResult> {
  const logs: string[] = [];
  const addLog = (msg: string) => {
    const logLine = `[${new Date().toLocaleTimeString('pt-BR')}] ${msg}`;
    logs.push(logLine);
    console.log(`[AutoReminder] ${msg}`);
  };

  addLog('🚀 Iniciando rotina automática de lembretes de vacinação...');

  try {
    const settings = {
      ...(await getAutoReminderSettings()),
      ...(options.overrideSettings || {})
    };

    if (!settings.enabled && !options.forceAllPending) {
      addLog('ℹ️ Automação de lembretes está desativada nas configurações. Execução ignorada.');
      return {
        success: true,
        totalFound: 0,
        sentCount: 0,
        failedCount: 0,
        skippedCount: 0,
        logs
      };
    }

    // 1. Obter configuração da Evolution API
    const evolutionConfig = getEvolutionConfig();
    const serverUrl = evolutionConfig.serverUrl || process.env.EVOLUTION_SERVER_URL || process.env.NEXT_PUBLIC_EVOLUTION_SERVER_URL;
    const apiKey = evolutionConfig.apiKey || process.env.EVOLUTION_API_KEY;
    const instanceName = (evolutionConfig.defaultInstance || 'vetpro-clinica').trim();

    if (!serverUrl && !options.simulateOnly) {
      addLog('⚠️ Evolution API não configurada. Defina a Server URL no painel Admin > WhatsApp.');
      return {
        success: false,
        totalFound: 0,
        sentCount: 0,
        failedCount: 0,
        skippedCount: 0,
        logs,
        error: 'Evolution API não configurada.'
      };
    }

    addLog(`⚙️ Parâmetros da automação: antecedência de ${settings.daysInAdvance} dias | Instância: '${instanceName}'`);

    // 2. Carregar pets e vacinas
    let allPets: PetRecord[] = [];
    let allVaccines: PetVaccineRecord[] = [];

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      
      const [petsRes, vacRes] = await Promise.all([
        supabase.from('pets').select('*'),
        supabase.from('pet_vaccines').select('*')
      ]);

      if (petsRes.data) allPets = petsRes.data;
      if (vacRes.data) {
        allVaccines = vacRes.data.map((v: any) => ({
          ...v,
          status: new Date(v.next_due_date + 'T23:59:59').getTime() < Date.now() ? 'overdue' : 'applied'
        }));
      }
    }

    // Fallback para LocalStorage se base vazia ou sem Supabase
    if (allVaccines.length === 0 && typeof window !== 'undefined') {
      allPets = await getSavedPets();
      const localVac = JSON.parse(localStorage.getItem('vetpro_pet_vaccines') || '[]');
      allVaccines = localVac.map((v: any) => ({
        ...v,
        status: new Date(v.next_due_date + 'T23:59:59').getTime() < Date.now() ? 'overdue' : 'applied'
      }));
    }

    addLog(`📊 Base de dados: ${allPets.length} pets e ${allVaccines.length} registros de vacinas carregados.`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + settings.daysInAdvance);

    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    let totalEligible = 0;

    for (const vac of allVaccines) {
      if (!vac.next_due_date) continue;

      const dueDate = new Date(vac.next_due_date + 'T00:00:00');
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      const isOverdue = diffDays < 0;
      const isDueToday = diffDays === 0;
      const isDueSoon = diffDays > 0 && diffDays <= settings.daysInAdvance;

      let isEligible = false;
      let reason = '';

      if (isDueSoon) {
        isEligible = true;
        reason = `Vence em ${diffDays} dia(s) (em ${new Date(vac.next_due_date + 'T12:00:00').toLocaleDateString('pt-BR')})`;
      } else if (isDueToday && settings.notifyOnDueDate) {
        isEligible = true;
        reason = `Vence HOJE (${new Date(vac.next_due_date + 'T12:00:00').toLocaleDateString('pt-BR')})`;
      } else if (isOverdue && settings.notifyOverdue) {
        isEligible = true;
        reason = `Vencida há ${Math.abs(diffDays)} dia(s) (em ${new Date(vac.next_due_date + 'T12:00:00').toLocaleDateString('pt-BR')})`;
      }

      if (!isEligible && !options.forceAllPending) continue;

      totalEligible++;

      // Verificar se já foi enviado recentemente para evitar repetição
      if (vac.reminder_sent && vac.reminder_sent_at && !options.forceAllPending) {
        const lastSentDate = new Date(vac.reminder_sent_at);
        const daysSinceLastSent = (today.getTime() - lastSentDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLastSent < settings.minDaysBetweenReminders) {
          skippedCount++;
          addLog(`⏭️ Pulando vacina '${vac.vaccine_name}' (Lembrete já disparado há ${Math.floor(daysSinceLastSent)} dias).`);
          continue;
        }
      }

      // Encontrar pet correspondente
      const pet = allPets.find(p => p.id === vac.pet_id);
      const petName = pet?.name || 'Pet';
      const tutorName = pet?.tutor_name || 'Tutor(a)';
      let phone = vac.reminder_phone || pet?.tutor_phone || '';

      // Limpar número
      phone = phone.replace(/\D/g, '');
      if (!phone || phone.length < 10) {
        skippedCount++;
        addLog(`⚠️ Pulando vacina '${vac.vaccine_name}' do pet '${petName}': WhatsApp do tutor não informado ou inválido.`);
        continue;
      }

      if (phone.length === 10 || phone.length === 11) {
        phone = `55${phone}`;
      }

      // Montar mensagem formatada com padrão estrito de asterisco único (*negrito*)
      const dueDateFormatted = new Date(vac.next_due_date + 'T12:00:00').toLocaleDateString('pt-BR');
      
      const messageText = isOverdue
        ? `🚨 *Lembrete Importante de Saúde Animal - VetPro Orienta*\n\nOlá, *${tutorName}*! 🐾\n\nIdentificamos que o reforço da vacina *${vac.vaccine_name}* do(a) seu pet *${petName}* (${pet?.species || 'Animal'}) venceu em *${dueDateFormatted}*.\n\nManter a imunização em dia é fundamental para a saúde e proteção do seu pet contra doenças graves.\n\n📅 Entre em contato conosco para agendar a aplicação do reforço!`
        : `🐾 *Lembrete Automático de Vacinação - VetPro Orienta*\n\nOlá, *${tutorName}*! Tudo bem?\n\nPassando para avisar que a próxima dose/reforço da vacina *${vac.vaccine_name}* do seu pet *${petName}* está prevista para *${dueDateFormatted}*.\n\n📍 Laboratório: ${vac.manufacturer || 'Vacina Ética'}\n\nGaranta a proteção do seu melhor amigo! Agende o horário de vacinação na clínica com antecedência.`;

      addLog(`📲 [Disparo Automático] Enviando lembrete da vacina *${vac.vaccine_name}* para *${tutorName}* (${phone})... Motivo: ${reason}`);

      if (options.simulateOnly) {
        sentCount++;
        addLog(`   ✅ [Modo Simulação] Lembrete simulado com sucesso.`);
        continue;
      }

      // Disparo real via Evolution API
      try {
        await callEvolutionProxy('send-text', {
          serverUrl,
          apiKey,
          instanceName,
          data: {
            number: phone,
            text: messageText,
            delay: 1200,
            linkPreview: false
          }
        });

        // Atualizar registro no banco
        const nowIso = new Date().toISOString();
        await savePetVaccine({
          ...vac,
          reminder_phone: phone,
          reminder_sent: true,
          reminder_sent_at: nowIso
        });

        sentCount++;
        addLog(`   ✅ Lembrete enviado com sucesso via WhatsApp para ${phone}!`);

        // Respeitar limite de lote
        if (sentCount >= settings.maxBatchSize) {
          addLog(`🛑 Limite do lote atingido (${settings.maxBatchSize} envios nesta execução). Próximas vacinas serão processadas no próximo ciclo.`);
          break;
        }
      } catch (sendErr: any) {
        failedCount++;
        const errMsg = cleanErrorMessage(sendErr);
        addLog(`   ❌ Falha ao enviar para ${phone}: ${errMsg}`);
      }
    }

    addLog(`🏁 Rotina concluída! Resumo: ${totalEligible} elegíveis, ${sentCount} enviados, ${skippedCount} ignorados, ${failedCount} falhas.`);

    // Salvar registro da última execução
    const runResult = {
      totalFound: totalEligible,
      sentCount,
      failedCount,
      skippedCount,
      timestamp: new Date().toISOString(),
      logs
    };

    await saveAutoReminderSettings({
      lastRunAt: new Date().toISOString(),
      lastRunResult: runResult
    });

    // Registrar log de auditoria no Supabase
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        await supabase.from('audit_logs').insert([{
          action: 'AUTOMATION_REMINDERS_EXECUTED',
          details: {
            sent: sentCount,
            failed: failedCount,
            skipped: skippedCount,
            total: totalEligible,
            executed_at: new Date().toISOString()
          }
        }]);
      } catch {
        // Silencioso
      }
    }

    return {
      success: true,
      totalFound: totalEligible,
      sentCount,
      failedCount,
      skippedCount,
      logs
    };

  } catch (err: any) {
    const errorStr = cleanErrorMessage(err);
    addLog(`❌ Erro crítico na execução da automação: ${errorStr}`);
    return {
      success: false,
      totalFound: 0,
      sentCount: 0,
      failedCount: 0,
      skippedCount: 0,
      logs,
      error: errorStr
    };
  }
}
