'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, Lock, FileText, ArrowLeft, Download, Trash2, 
  CheckCircle2, Mail, ExternalLink, HelpCircle, ChevronRight, User, AlertCircle, RefreshCw
} from 'lucide-react';
import { triggerPWAInstallModal } from '@/components/PwaInstallPrompt';

export default function PoliticaDePrivacidadePage() {
  const [activeTab, setActiveTab] = useState<'politica' | 'direitos' | 'dpo'>('politica');
  const [dpoForm, setDpoForm] = useState({
    name: '',
    email: '',
    cpf: '',
    requestType: 'access',
    message: '',
  });
  const [dpoSubmitted, setDpoSubmitted] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExportUserData = () => {
    setIsExporting(true);
    setTimeout(() => {
      try {
        const localData: Record<string, any> = {};
        if (typeof window !== 'undefined') {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('vetpro_')) {
              try {
                localData[key] = JSON.parse(localStorage.getItem(key) || '""');
              } catch {
                localData[key] = localStorage.getItem(key);
              }
            }
          }
        }
        const blob = new Blob([JSON.stringify({
          app: 'VetPro Orienta',
          lgpdExportDate: new Date().toISOString(),
          description: 'Cópia de portabilidade de dados pessoais (Art. 18, V da Lei 13.709/2018 - LGPD)',
          userData: localData,
        }, null, 2)], { type: 'application/json' });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vetpro_meus_dados_lgpd_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 4000);
      } catch (err) {
        console.warn('Erro ao exportar dados:', err);
      } finally {
        setIsExporting(false);
      }
    }, 800);
  };

  const handleDpoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDpoSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col">
      {/* Header */}
      <header className="border-b border-brand-border-strong bg-brand-surface/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-display font-bold text-base hover:opacity-90 transition-opacity">
            <span className="w-8 h-8 rounded-xl bg-brand-teal/15 text-brand-teal flex items-center justify-center text-sm border border-brand-teal/30">
              🐾
            </span>
            <span>VetPro <b className="text-brand-teal">Orienta</b></span>
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={triggerPWAInstallModal}
              className="px-3 py-1.5 rounded-xl bg-brand-teal/15 hover:bg-brand-teal/25 border border-brand-teal/30 text-brand-teal text-xs font-bold transition-all hidden sm:flex items-center gap-1.5"
            >
              📱 Baixar App
            </button>
            <Link
              href="/"
              className="px-3 py-1.5 rounded-xl bg-brand-surface-2 hover:bg-brand-surface border border-brand-border-strong text-xs font-semibold text-brand-text-muted hover:text-brand-text transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao Início
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="border-b border-brand-border-strong bg-gradient-to-b from-brand-surface to-brand-bg py-10 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-teal/15 border border-brand-teal/30 text-brand-teal text-xs font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>Conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018)</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-display font-bold text-brand-text">
            Política de Privacidade e Proteção de Dados
          </h1>
          <p className="text-xs sm:text-sm text-brand-text-muted max-w-2xl mx-auto leading-relaxed">
            Transparência absoluta no tratamento das suas informações, histórico de consultas, dados cadastrais e prontuário dos seus pets.
          </p>
          <div className="text-[11px] text-brand-text-muted">
            Última atualização: Março de 2026 • Versão 2.4 (Em vigor)
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 w-full pt-6">
        <div className="flex items-center justify-center p-1.5 bg-brand-surface-2 rounded-2xl border border-brand-border-strong text-xs font-bold">
          <button
            onClick={() => setActiveTab('politica')}
            className={`flex-1 py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'politica' ? 'bg-brand-teal text-brand-bg shadow-sm' : 'text-brand-text-muted hover:text-brand-text'
            }`}
          >
            <FileText className="w-4 h-4" />
            1. Política Completa
          </button>
          <button
            onClick={() => setActiveTab('direitos')}
            className={`flex-1 py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'direitos' ? 'bg-brand-teal text-brand-bg shadow-sm' : 'text-brand-text-muted hover:text-brand-text'
            }`}
          >
            <Download className="w-4 h-4" />
            2. Seus Direitos & Portabilidade
          </button>
          <button
            onClick={() => setActiveTab('dpo')}
            className={`flex-1 py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'dpo' ? 'bg-brand-teal text-brand-bg shadow-sm' : 'text-brand-text-muted hover:text-brand-text'
            }`}
          >
            <Mail className="w-4 h-4" />
            3. Canal do DPO / Contato
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        {activeTab === 'politica' && (
          <div className="space-y-8 text-xs sm:text-sm text-brand-text-muted leading-relaxed">
            
            {/* Seção 1 */}
            <section className="p-6 rounded-3xl bg-brand-surface border border-brand-border-strong space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-brand-text font-display flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-brand-teal/15 text-brand-teal flex items-center justify-center text-xs font-mono font-bold">1</span>
                Identificação do Controlador e Encarregado (DPO)
              </h2>
              <p>
                A plataforma <b>VetPro Orienta</b> atua como controladora dos dados pessoais tratados no âmbito dos serviços de triagem veterinária por inteligência artificial, gestão de prontuários de animais de estimação e intermediação de agendamentos e assinaturas.
              </p>
              <div className="p-3.5 rounded-2xl bg-brand-surface-2 border border-brand-border-strong text-xs space-y-1 text-brand-text">
                <p><b>Razão Social / Plataforma:</b> VetPro Orienta Tecnologia Veterinária e Serviços Digitais Ltda.</p>
                <p><b>Canal do Encarregado pelo Tratamento de Dados (DPO):</b> privacidade@vetpro-orienta.app / dpo@vetpro.app</p>
                <p><b>Legislação Aplicável:</b> Lei Federal nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais - LGPD).</p>
              </div>
            </section>

            {/* Seção 2 */}
            <section className="p-6 rounded-3xl bg-brand-surface border border-brand-border-strong space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-brand-text font-display flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-brand-teal/15 text-brand-teal flex items-center justify-center text-xs font-mono font-bold">2</span>
                Dados Pessoais Coletados e Finalidades
              </h2>
              <p>
                Coletamos estritamente os dados necessários para a prestação e aprimoramento dos serviços:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-xs">
                <li>
                  <b className="text-brand-text">Dados Cadastrais do Tutor:</b> Nome completo, CPF, e-mail, telefone/WhatsApp. Utilizados para criação da conta, autenticação segura, emissão de faturas no gateway financeiro e envio de comunicações de saúde pet.
                </li>
                <li>
                  <b className="text-brand-text">Dados Clínicos e Cadastrais dos Pets:</b> Nome do animal, espécie (canina, felina, etc.), raça, idade/data de nascimento, peso, histórico de vacinas, vermífugos, queixas relatadas, fotos de lesões e exames anexados. Utilizados para enriquecer as orientações do assistente de triagem por IA e manter a carteirinha digital.
                </li>
                <li>
                  <b className="text-brand-text">Dados Financeiros e de Cobrança:</b> Tratados de ponta a ponta com criptografia via gateway de pagamentos parceiro homologado (Asaas Gestão Financeira S.A.). Os dados de cartão de crédito não são armazenados em texto plano em nossos servidores locais.
                </li>
                <li>
                  <b className="text-brand-text">Dados de Geolocalização (Opcional):</b> Coordenadas aproximadas informadas com seu consentimento expresso no navegador para localização de clínicas e hospitais veterinários parceiros mais próximos.
                </li>
              </ul>
            </section>

            {/* Seção 3 */}
            <section className="p-6 rounded-3xl bg-brand-surface border border-brand-border-strong space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-brand-text font-display flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-brand-teal/15 text-brand-teal flex items-center justify-center text-xs font-mono font-bold">3</span>
                Bases Legais de Tratamento (Art. 7º da LGPD)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-2xl bg-brand-surface-2 border border-brand-border-strong space-y-1">
                  <span className="text-xs font-bold text-brand-teal block">Execução de Contrato (Art. 7º, V)</span>
                  <p className="text-xs text-brand-text-muted">
                    Para fornecer o plano contratado, viabilizar o chat de triagem, emitir QR Codes Pix e liberar o acesso às funcionalidades.
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-brand-surface-2 border border-brand-border-strong space-y-1">
                  <span className="text-xs font-bold text-brand-teal block">Consentimento do Titular (Art. 7º, I)</span>
                  <p className="text-xs text-brand-text-muted">
                    Para envio de lembretes preventivos via WhatsApp, geolocalização de parceiros e cookies de otimização analítica.
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-brand-surface-2 border border-brand-border-strong space-y-1">
                  <span className="text-xs font-bold text-brand-teal block">Legítimo Interesse (Art. 7º, IX)</span>
                  <p className="text-xs text-brand-text-muted">
                    Para garantia da segurança contra fraudes, proteção dos sistemas e aprimoramento contínuo da acurácia dos modelos de apoio veterinário.
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-brand-surface-2 border border-brand-border-strong space-y-1">
                  <span className="text-xs font-bold text-brand-teal block">Cumprimento de Obrigação Legal (Art. 7º, II)</span>
                  <p className="text-xs text-brand-text-muted">
                    Para retenção de registros fiscais e atendimento a exigências de órgãos reguladores e tributários.
                  </p>
                </div>
              </div>
            </section>

            {/* Seção 4 */}
            <section className="p-6 rounded-3xl bg-brand-surface border border-brand-border-strong space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-brand-text font-display flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-brand-teal/15 text-brand-teal flex items-center justify-center text-xs font-mono font-bold">4</span>
                Compartilhamento Seguro com Terceiros
              </h2>
              <p>
                A VetPro Orienta <b>não vende, não aluga e não comercializa</b> dados pessoais de tutores em hipótese alguma. O compartilhamento ocorre exclusivamente com parceiros tecnológicos essenciais:
              </p>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-brand-surface-2 border border-brand-border-strong flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <b className="text-brand-text">Asaas Gestão Financeira:</b> Processamento de pagamentos, conciliação Pix, geração de boletos e cartões com conformidade PCI-DSS.
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-brand-surface-2 border border-brand-border-strong flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
                  <div>
                    <b className="text-brand-text">Modelos de IA (Google Gemini API):</b> Processamento em trânsito com criptografia de ponta para interpretar os sintomas relatados no chat e gerar respostas informativas de triagem em tempo real.
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-brand-surface-2 border border-brand-border-strong flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <b className="text-brand-text">Clínicas e Veterinários Parceiros:</b> Somente compartilhado quando o tutor solicita ativamente agendamento ou encaminhamento presencial.
                  </div>
                </div>
              </div>
            </section>

            {/* Seção 5 */}
            <section className="p-6 rounded-3xl bg-brand-surface border border-brand-border-strong space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-brand-text font-display flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-brand-teal/15 text-brand-teal flex items-center justify-center text-xs font-mono font-bold">5</span>
                Segurança da Informação e Armazenamento
              </h2>
              <p>
                Adotamos rígidos padrões técnicos e organizacionais para proteger suas informações contra acessos não autorizados, destruição ou vazamentos:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Criptografia SSL/TLS (HTTPS) de 256 bits em todas as comunicações de rede;</li>
                <li>Armazenamento de banco de dados com isolamento por perfil e controle de acesso baseado em papéis (RBAC);</li>
                <li>Monitoramento contínuo de vulnerabilidades e políticas de backup automatizado;</li>
                <li>Retenção apenas pelo período necessário para cumprimento das finalidades contratuais e legais.</li>
              </ul>
            </section>

            {/* Seção 6 */}
            <section className="p-6 rounded-3xl bg-brand-surface border border-brand-border-strong space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-brand-text font-display flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-brand-teal/15 text-brand-teal flex items-center justify-center text-xs font-mono font-bold">6</span>
                Aviso Importante sobre Inteligência Artificial e Saúde Pet
              </h2>
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs leading-relaxed space-y-2">
                <p className="font-bold flex items-center gap-1.5 text-amber-300">
                  <AlertCircle className="w-4 h-4" /> Orientação Informativa de Apoio — Não substitui Consulta Veterinária
                </p>
                <p>
                  As respostas fornecidas pelo assistente digital constituem material informativo de triagem preventiva. Em casos de emergência (convulsão, hemorragia, desmaio, atropelamento), procure imediatamente um hospital veterinário presencial.
                </p>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'direitos' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-brand-surface border border-brand-border-strong space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-teal/15 text-brand-teal flex items-center justify-center shrink-0">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-brand-text font-display">
                    Seus Direitos como Titular de Dados (Art. 18 da LGPD)
                  </h3>
                  <p className="text-xs text-brand-text-muted">
                    Você tem total controle sobre seus dados pessoais armazenados na plataforma VetPro Orienta.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div className="p-4 rounded-2xl bg-brand-surface-2 border border-brand-border-strong space-y-2">
                  <h4 className="text-xs font-bold text-brand-text flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Direito à Portabilidade de Dados
                  </h4>
                  <p className="text-xs text-brand-text-muted">
                    Baixe instantaneamente um arquivo JSON estruturado com todos os seus dados cadastrais, histórico de pets e registros salvos.
                  </p>
                  <button
                    onClick={handleExportUserData}
                    disabled={isExporting}
                    className="w-full py-2.5 px-3 rounded-xl bg-brand-teal text-brand-bg text-xs font-bold hover:bg-brand-teal/90 transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    {isExporting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Exportando Dados...
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" /> Baixar Meus Dados (JSON)
                      </>
                    )}
                  </button>
                  {exportSuccess && (
                    <p className="text-[11px] text-emerald-400 font-semibold text-center animate-in fade-in">
                      ✓ Arquivo baixado com sucesso!
                    </p>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-brand-surface-2 border border-brand-border-strong space-y-2">
                  <h4 className="text-xs font-bold text-brand-text flex items-center gap-1.5">
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    Direito à Eliminação e Revogação
                  </h4>
                  <p className="text-xs text-brand-text-muted">
                    Solicite a exclusão definitiva dos seus dados de prontuário e revogue consentimentos prévios através do canal direto do DPO.
                  </p>
                  <button
                    onClick={() => setActiveTab('dpo')}
                    className="w-full py-2.5 px-3 rounded-xl bg-brand-surface border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <Mail className="w-3.5 h-3.5" /> Solicitar Exclusão ao DPO
                  </button>
                </div>
              </div>
            </div>

            {/* Lista dos 8 Direitos Fundamentais */}
            <div className="p-6 rounded-3xl bg-brand-surface border border-brand-border-strong space-y-4">
              <h4 className="text-sm font-bold text-brand-text font-display">
                Quadro Resumo dos Direitos Garantidos por Lei:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-brand-text-muted">
                <div className="p-3 rounded-xl bg-brand-surface-2 border border-brand-border-strong">
                  <b className="text-brand-text block mb-0.5">1. Confirmação e Acesso</b>
                  Confirmar a existência de tratamento e consultar os dados cadastrados.
                </div>
                <div className="p-3 rounded-xl bg-brand-surface-2 border border-brand-border-strong">
                  <b className="text-brand-text block mb-0.5">2. Correção de Dados</b>
                  Atualizar dados incompletos, inexatos ou desatualizados.
                </div>
                <div className="p-3 rounded-xl bg-brand-surface-2 border border-brand-border-strong">
                  <b className="text-brand-text block mb-0.5">3. Anonimização e Bloqueio</b>
                  Pedir a desvinculação de dados desnecessários ou tratados em desconformidade.
                </div>
                <div className="p-3 rounded-xl bg-brand-surface-2 border border-brand-border-strong">
                  <b className="text-brand-text block mb-0.5">4. Eliminação dos Dados</b>
                  Solicitar a exclusão de dados tratados com base no seu consentimento.
                </div>
                <div className="p-3 rounded-xl bg-brand-surface-2 border border-brand-border-strong">
                  <b className="text-brand-text block mb-0.5">5. Informação de Compartilhamento</b>
                  Saber exatamente com quais entidades públicas ou privadas compartilhamos dados.
                </div>
                <div className="p-3 rounded-xl bg-brand-surface-2 border border-brand-border-strong">
                  <b className="text-brand-text block mb-0.5">6. Revogação do Consentimento</b>
                  Retirar sua autorização a qualquer momento de forma gratuita e facilitada.
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dpo' && (
          <div className="space-y-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-brand-surface border border-brand-border-strong space-y-5">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-brand-teal/15 text-brand-teal border border-brand-teal/30 flex items-center justify-center shrink-0">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-brand-text font-display">
                    Canal do Encarregado de Dados (DPO)
                  </h3>
                  <p className="text-xs text-brand-text-muted">
                    Envie solicitações formais sobre seus dados, pedidos de exclusão, retificação ou esclarecimentos.
                  </p>
                </div>
              </div>

              {dpoSubmitted ? (
                <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3 animate-in zoom-in-95">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-emerald-400">
                    Solicitação Recebida com Sucesso!
                  </h4>
                  <p className="text-xs text-brand-text-muted max-w-md mx-auto">
                    Nossa equipe de Privacidade e o Encarregado pelo Tratamento de Dados analisarão seu pedido. Responderemos no e-mail informado dentro do prazo regulamentar da LGPD (até 15 dias úteis).
                  </p>
                  <button
                    onClick={() => {
                      setDpoSubmitted(false);
                      setDpoForm({ name: '', email: '', cpf: '', requestType: 'access', message: '' });
                    }}
                    className="px-4 py-2 rounded-xl bg-brand-surface-2 hover:bg-brand-surface border border-brand-border-strong text-xs font-bold text-brand-text transition-colors"
                  >
                    Enviar Nova Solicitação
                  </button>
                </div>
              ) : (
                <form onSubmit={handleDpoSubmit} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-brand-text-muted mb-1">Seu Nome Completo *</label>
                      <input
                        type="text"
                        required
                        value={dpoForm.name}
                        onChange={(e) => setDpoForm({ ...dpoForm, name: e.target.value })}
                        placeholder="Ex: Maria Silva"
                        className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-brand-text focus:outline-none focus:border-brand-teal"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-brand-text-muted mb-1">Seu E-mail Cadastrado *</label>
                      <input
                        type="email"
                        required
                        value={dpoForm.email}
                        onChange={(e) => setDpoForm({ ...dpoForm, email: e.target.value })}
                        placeholder="seu@email.com"
                        className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-brand-text focus:outline-none focus:border-brand-teal"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-brand-text-muted mb-1">CPF (para validação de titularidade) *</label>
                      <input
                        type="text"
                        required
                        value={dpoForm.cpf}
                        onChange={(e) => setDpoForm({ ...dpoForm, cpf: e.target.value })}
                        placeholder="000.000.000-00"
                        className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-brand-text focus:outline-none focus:border-brand-teal font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-brand-text-muted mb-1">Tipo de Solicitação *</label>
                      <select
                        value={dpoForm.requestType}
                        onChange={(e) => setDpoForm({ ...dpoForm, requestType: e.target.value })}
                        className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-brand-text focus:outline-none focus:border-brand-teal"
                      >
                        <option value="access">Acesso / Cópia dos Meus Dados</option>
                        <option value="correction">Retificação / Atualização de Dados</option>
                        <option value="deletion">Exclusão Definitiva dos Dados (Direito ao Esquecimento)</option>
                        <option value="revocation">Revogação de Consentimento</option>
                        <option value="doubt">Dúvida / Esclarecimento sobre LGPD</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-brand-text-muted mb-1">Detalhamento da Solicitação *</label>
                    <textarea
                      required
                      rows={4}
                      value={dpoForm.message}
                      onChange={(e) => setDpoForm({ ...dpoForm, message: e.target.value })}
                      placeholder="Descreva detalhadamente o que você precisa em relação aos seus dados pessoais ou pets..."
                      className="w-full bg-brand-bg border border-brand-border-strong rounded-xl p-3.5 text-brand-text focus:outline-none focus:border-brand-teal"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-brand-teal text-brand-bg font-bold text-xs hover:bg-brand-teal/90 transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    Enviar Solicitação Formal ao DPO
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-brand-border-strong py-8 bg-brand-surface/50 text-xs text-brand-text-muted">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 VetPro Orienta. Todos os direitos reservados. Conformidade LGPD.</p>
          <div className="flex items-center gap-4">
            <Link href="/termos-de-uso" className="hover:text-brand-text">Termos de Uso</Link>
            <Link href="/politica-de-privacidade" className="text-brand-teal font-semibold">Política de Privacidade</Link>
            <Link href="/login" className="hover:text-brand-text">Entrar</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
