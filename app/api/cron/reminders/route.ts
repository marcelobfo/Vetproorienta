import { NextRequest, NextResponse } from 'next/server';
import { runAutomatedVaccineReminders, getAutoReminderSettings, saveAutoReminderSettings } from '@/lib/reminderAutomation';

export const dynamic = 'force-dynamic';

/**
 * Endpoint de execução de automações e envio agendado de lembretes
 * Aceita GET (compatível com webhooks e cron jobs) e POST
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const force = searchParams.get('force') === 'true';
    const simulate = searchParams.get('simulate') === 'true';

    const result = await runAutomatedVaccineReminders({
      forceAllPending: force,
      simulateOnly: simulate
    });

    return NextResponse.json({
      status: result.success ? 'success' : 'error',
      message: 'Rotina de lembretes automáticos processada.',
      data: result
    });
  } catch (error: any) {
    console.error('Erro na rota de cron de lembretes:', error);
    return NextResponse.json(
      { status: 'error', message: error?.message || 'Erro ao processar rotina de lembretes.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, settings, force, simulate } = body;

    // Se a requisição for para atualizar as configurações
    if (action === 'update_settings' && settings) {
      const updated = await saveAutoReminderSettings(settings);
      return NextResponse.json({
        status: 'success',
        message: 'Configurações de automação salvas com sucesso.',
        settings: updated
      });
    }

    // Se for para consultar configurações
    if (action === 'get_settings') {
      const current = await getAutoReminderSettings();
      return NextResponse.json({
        status: 'success',
        settings: current
      });
    }

    // Executar disparos automáticos
    const result = await runAutomatedVaccineReminders({
      forceAllPending: Boolean(force),
      simulateOnly: Boolean(simulate),
      overrideSettings: settings
    });

    return NextResponse.json({
      status: result.success ? 'success' : 'error',
      message: 'Rotina de lembretes automáticos executada.',
      data: result
    });
  } catch (error: any) {
    console.error('Erro no processamento da automação:', error);
    return NextResponse.json(
      { status: 'error', message: error?.message || 'Erro interno ao executar automação.' },
      { status: 500 }
    );
  }
}
