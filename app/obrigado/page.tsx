'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  Check, MessageCircle, ArrowLeft, ExternalLink, ShieldCheck, 
  CreditCard, QrCode, Copy, CheckCircle2, RefreshCw, Lock, AlertTriangle 
} from 'lucide-react';
import { Suspense, useState, useEffect } from 'react';

function ObrigadoContent() {
  const searchParams = useSearchParams();
  const nome = searchParams.get('nome') || (typeof window !== 'undefined' ? localStorage.getItem('vetpro_tutor_name') : '') || 'Tutor';
  const email = searchParams.get('email') || (typeof window !== 'undefined' ? localStorage.getItem('vetpro_tutor_email') : '') || '';
  const plano = searchParams.get('plano') || (typeof window !== 'undefined' ? localStorage.getItem('vetpro_selected_plan') : 'Essencial');
  const valor = searchParams.get('valor');
  const customerId = searchParams.get('customer_id') || (typeof window !== 'undefined' ? localStorage.getItem('vetpro_asaas_customer_id') : '');
  const subscriptionId = searchParams.get('subscription_id') || (typeof window !== 'undefined' ? localStorage.getItem('vetpro_asaas_subscription_id') : '');
  const urlPaymentParam = searchParams.get('payment_url');
  const whatsappSent = searchParams.get('whatsapp_sent') === 'true';

  const [paymentUrl, setPaymentUrl] = useState(urlPaymentParam || (typeof window !== 'undefined' ? localStorage.getItem('vetpro_payment_url') || '' : ''));
  const [pixQrCode, setPixQrCode] = useState<string>((typeof window !== 'undefined' ? localStorage.getItem('vetpro_pix_qrcode') || '' : ''));
  const [pixCopiaECola, setPixCopiaECola] = useState<string>((typeof window !== 'undefined' ? localStorage.getItem('vetpro_pix_copia_cola') || '' : ''));
  const [isCopied, setIsCopied] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'PENDING' | 'ACTIVE' | 'NOT_FOUND'>('PENDING');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const firstName = nome.split(' ')[0];
  const WHATSAPP_NUMBER = "5511999999999";
  
  const msg = plano
    ? `Olá! Acabei de me cadastrar no plano ${plano} do VetPro Orienta.`
    : `Olá! Acabei de me cadastrar no VetPro Orienta.`;
    
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;

  useEffect(() => {
    let isMounted = true;

    async function loadPayment() {
      if (!customerId && !subscriptionId && !email) return;
      setIsCheckingPayment(true);
      setStatusMessage(null);
      try {
        const res = await fetch('/api/asaas/check-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId,
            subscriptionId,
            email,
          }),
        });
        const data = await res.json();
        if (!isMounted) return;

        if (data.success) {
          if (data.paid || data.status === 'ACTIVE') {
            setPaymentStatus('ACTIVE');
            setStatusMessage('Pagamento confirmado com sucesso! Seu acesso está liberado.');
            if (typeof window !== 'undefined') {
              localStorage.setItem('vetpro_subscription_status', 'ACTIVE');
            }
          } else {
            setPaymentStatus('PENDING');
            if (data.pixQrCodeImage) {
              setPixQrCode(data.pixQrCodeImage);
              if (typeof window !== 'undefined') localStorage.setItem('vetpro_pix_qrcode', data.pixQrCodeImage);
            }
            if (data.pixCopiaECola) {
              setPixCopiaECola(data.pixCopiaECola);
              if (typeof window !== 'undefined') localStorage.setItem('vetpro_pix_copia_cola', data.pixCopiaECola);
            }
            if (data.paymentUrl) {
              setPaymentUrl(data.paymentUrl);
              if (typeof window !== 'undefined') localStorage.setItem('vetpro_payment_url', data.paymentUrl);
            }
            setStatusMessage('Fatura em aberto no Asaas. Efetue o pagamento para liberar o acesso.');
          }
        } else {
          setStatusMessage(data.error || 'Aguardando sincronização de fatura no Asaas.');
        }
      } catch (err) {
        console.warn('Erro ao consultar status:', err);
      } finally {
        if (isMounted) {
          setIsCheckingPayment(false);
        }
      }
    }

    void loadPayment();

    return () => {
      isMounted = false;
    };
  }, [customerId, subscriptionId, email]);

  const handleManualCheck = async () => {
    if (!customerId && !subscriptionId && !email) return;
    setIsCheckingPayment(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/asaas/check-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          subscriptionId,
          email,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.paid || data.status === 'ACTIVE') {
          setPaymentStatus('ACTIVE');
          setStatusMessage('Pagamento confirmado com sucesso! Seu acesso está liberado.');
          if (typeof window !== 'undefined') {
            localStorage.setItem('vetpro_subscription_status', 'ACTIVE');
          }
        } else {
          setPaymentStatus('PENDING');
          setStatusMessage('Fatura em aberto no Asaas. Efetue o pagamento para liberar o acesso.');
        }
      } else {
        setStatusMessage(data.error || 'Aguardando sincronização de fatura no Asaas.');
      }
    } catch (err) {
      console.warn('Erro ao consultar status:', err);
    } finally {
      setIsCheckingPayment(false);
    }
  };

  const handleCopyPix = () => {
    if (!pixCopiaECola) return;
    navigator.clipboard.writeText(pixCopiaECola);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  return (
    <div className="w-full max-w-[620px] bg-brand-surface border border-brand-border-strong rounded-[24px] p-6 md:p-8 text-center shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)] z-10 relative my-6">
      
      {paymentStatus === 'ACTIVE' ? (
        <div className="w-[68px] h-[68px] mx-auto mb-4 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <Check className="w-[32px] h-[32px]" strokeWidth={2.5} />
        </div>
      ) : (
        <div className="w-[68px] h-[68px] mx-auto mb-4 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <Lock className="w-[30px] h-[30px]" strokeWidth={2.2} />
        </div>
      )}

      <h1 className="font-display text-[22px] md:text-[25px] font-bold tracking-tight mb-2">
        {paymentStatus === 'ACTIVE' ? (
          <span>Pagamento Confirmado, <span className="text-emerald-400">{firstName}</span>! 🎉</span>
        ) : (
          <span>Cadastro Criado, <span className="text-brand-teal">{firstName}</span>! 🐾</span>
        )}
      </h1>
      
      <p className="text-xs md:text-sm text-brand-text-muted mb-5 leading-[1.6]">
        {paymentStatus === 'ACTIVE'
          ? 'Sua assinatura foi ativada com sucesso. Todos os módulos de triagem com IA e gestão de pets estão liberados!'
          : 'Sua conta foi criada no sistema e a fatura emitida no Asaas. A plataforma ficará travada até a confirmação do pagamento abaixo.'
        }
      </p>

      {whatsappSent && (
        <div className="mb-5 p-3 rounded-xl bg-brand-teal/10 border border-brand-teal/30 flex items-center justify-center gap-2 text-xs text-brand-teal font-medium">
          <MessageCircle className="w-4 h-4 shrink-0" />
          Dados de acesso e link de checkout enviados para seu WhatsApp!
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2 mb-5 text-xs">
        {plano && (
          <div className="inline-flex items-center gap-1.5 bg-brand-surface-2 border border-brand-border-strong px-3 py-1.5 rounded-full text-brand-text-muted">
            Plano: <b className="text-brand-text">{plano}</b> {valor && <span>(R$ {valor}/mês)</span>}
          </div>
        )}
        {customerId && (
          <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-full text-emerald-300 font-mono">
            Cliente ID: <b>{customerId}</b>
          </div>
        )}
        {subscriptionId && (
          <div className="inline-flex items-center gap-1.5 bg-brand-teal/10 border border-brand-teal/30 px-3 py-1.5 rounded-full text-brand-teal font-mono">
            Assinatura ID: <b>{subscriptionId}</b>
          </div>
        )}
      </div>

      {/* BLOCO PIX QR CODE & PAGAMENTO */}
      {paymentStatus !== 'ACTIVE' && (
        <div className="mb-6 p-5 rounded-2xl bg-gradient-to-b from-brand-surface-2 to-brand-surface border-2 border-brand-teal/40 text-left shadow-lg">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-brand-border-strong mb-4">
            <div className="flex items-center gap-2 text-sm font-bold text-brand-teal">
              <QrCode className="w-5 h-5 text-brand-teal" /> Pagamento Imediato via Pix
            </div>
            <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" /> Aguardando Pagamento
            </span>
          </div>

          {pixQrCode ? (
            <div className="flex flex-col md:flex-row items-center gap-5 my-2">
              <div className="p-3 bg-white rounded-xl shadow-md shrink-0 border border-brand-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={pixQrCode} 
                  alt="QR Code Pix Asaas" 
                  className="w-36 h-36 md:w-40 md:h-40 object-contain mx-auto" 
                />
              </div>

              <div className="flex-1 min-w-0 flex flex-col justify-between text-xs space-y-3 w-full">
                <p className="text-brand-text-muted leading-relaxed">
                  Abra o aplicativo do seu banco, escolha <b>Pagar com Pix / Ler QR Code</b> e aponte a câmera para a imagem ao lado.
                </p>

                {pixCopiaECola && (
                  <div>
                    <label className="block text-[11px] font-bold text-brand-text mb-1">
                      Ou utilize o Pix Copia e Cola:
                    </label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        readOnly 
                        value={pixCopiaECola} 
                        className="w-full bg-brand-bg border border-brand-border-strong rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-brand-text-muted truncate focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleCopyPix}
                        className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                          isCopied 
                            ? 'bg-emerald-500 text-brand-bg' 
                            : 'bg-brand-teal hover:bg-brand-teal/90 text-brand-bg'
                        }`}
                      >
                        {isCopied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {isCopied ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 space-y-3">
              <p className="text-xs text-brand-text-muted">
                Fatura gerada no Asaas. Você pode pagar diretamente pelo link de checkout seguro abaixo:
              </p>
            </div>
          )}

          {paymentUrl && (
            <div className="mt-4 pt-3 border-t border-brand-border-strong flex flex-col sm:flex-row items-center gap-3">
              <a
                href={paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-brand-bg font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <CreditCard className="w-4 h-4" />
                Pagar com Cartão de Crédito ou Boleto <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={handleManualCheck}
                disabled={isCheckingPayment}
                className="w-full sm:w-auto shrink-0 py-2.5 px-4 rounded-xl bg-brand-surface border border-brand-border-strong hover:bg-brand-surface-2 text-brand-text font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-brand-teal ${isCheckingPayment ? 'animate-spin' : ''}`} />
                {isCheckingPayment ? 'Checando...' : 'Verificar Pagamento'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Credenciais e Status de Ativação */}
      <div className="mb-6 p-4 rounded-2xl bg-brand-surface-2 border border-brand-border-strong text-left text-xs">
        <div className="flex items-center gap-2 font-bold text-brand-text mb-2">
          <ShieldCheck className="w-4 h-4 text-brand-teal" /> Seus Dados de Acesso Criados
        </div>
        <div className="space-y-1.5 text-brand-text-muted mb-2">
          <p>• <b>Login (E-mail):</b> {email || 'Seu e-mail cadastrado'}</p>
          <p>• <b>Senha Inicial:</b> Seu CPF (apenas os números)</p>
        </div>

        {paymentStatus !== 'ACTIVE' ? (
          <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 text-[11.5px] text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <span>
              <b>Atenção:</b> Você já pode acessar a plataforma, porém os módulos de <b>Triagem IA e Pets</b> permanecerão travados até a confirmação do pagamento.
            </span>
          </div>
        ) : (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-[11.5px] text-emerald-300 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            Assinatura Ativa! Acesso liberado a todas as ferramentas.
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 mb-6">
        <Link 
          href={paymentStatus === 'ACTIVE' ? '/dashboard' : '/login'} 
          className="w-full py-3.5 rounded-full bg-brand-teal text-brand-bg font-bold text-xs hover:bg-brand-teal/90 transition-all flex items-center justify-center gap-2 shadow-md"
        >
          {paymentStatus === 'ACTIVE' ? 'Acessar Meu Painel Completo' : 'Entrar na Plataforma (Login)'}
        </Link>

        <a 
          href={waLink} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="w-full bg-brand-surface-2 hover:bg-brand-surface border border-brand-border-strong text-brand-text px-6 py-3 rounded-full font-medium text-xs transition-all flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-4 h-4 text-emerald-400" />
          Falar no WhatsApp com o Suporte
        </a>
      </div>

      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-brand-text-muted hover:text-brand-text transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />
        Voltar para a página inicial
      </Link>
    </div>
  );
}

export default function ObrigadoPage() {
  return (
    <div className="min-h-screen relative font-body flex items-center justify-center p-4 md:p-6 selection:bg-brand-teal/30 selection:text-brand-text">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-teal/15 via-brand-bg to-brand-bg h-[550px]" />
      <Suspense fallback={<div className="text-brand-text-muted text-xs">Carregando confirmação...</div>}>
        <ObrigadoContent />
      </Suspense>
    </div>
  );
}
