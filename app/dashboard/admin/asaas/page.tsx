'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  CreditCard, Key, CheckCircle2, AlertCircle, 
  RefreshCw, UserPlus, ShieldCheck,
  Users, Copy, Check, Repeat, Webhook,
  Settings, Sliders, Eye, EyeOff, RotateCcw,
  Sparkles, DollarSign, Bell, Shield, Globe
} from 'lucide-react';
import { 
  getAsaasConfig, 
  saveAsaasConfig, 
  createAsaasCustomer, 
  createAsaasSubscription,
  testAsaasConnection,
  AsaasConfig,
  AsaasCustomerResponse,
  AsaasSubscriptionResponse,
  getAsaasBaseUrl
} from '@/lib/asaas';
import { SupabaseStatusBanner } from '@/components/SupabaseStatusBanner';

export default function AsaasAdminPage() {
  const [config, setConfig] = useState<AsaasConfig>(() => getAsaasConfig());
  const [showApiKey, setShowApiKey] = useState(false);
  const [showWebhookToken, setShowWebhookToken] = useState(false);

  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: any; environment?: string; baseUrl?: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Formulário de Teste de Criação de Cliente
  const [testCustomer, setTestCustomer] = useState({
    name: '',
    cpfCnpj: '',
    email: '',
    mobilePhone: '',
  });
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [createdCustomer, setCreatedCustomer] = useState<AsaasCustomerResponse | null>(null);
  const [customerError, setCustomerError] = useState<string | null>(null);

  // Formulário de Criação de Assinatura
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedPlanValue, setSelectedPlanValue] = useState('9.90');
  const [selectedBillingType, setSelectedBillingType] = useState<'UNDEFINED' | 'BOLETO' | 'CREDIT_CARD' | 'PIX'>('UNDEFINED');
  const [isCreatingSub, setIsCreatingSub] = useState(false);
  const [createdSubscription, setCreatedSubscription] = useState<AsaasSubscriptionResponse | null>(null);
  const [subError, setSubError] = useState<string | null>(null);

  // Lista de clientes e assinaturas do Asaas
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [subscriptionsList, setSubscriptionsList] = useState<any[]>([]);
  const [isLoadingSubscriptions, setIsLoadingSubscriptions] = useState(false);

  // Toast e Logs
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [logs, setLogs] = useState<string[]>(['[00:00:00] Módulo Asaas Gateway inicializado.']);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 35)]);
  }, []);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4500);
  }, []);

  const fetchRecentCustomers = useCallback(async (activeConfig?: AsaasConfig) => {
    setIsLoadingCustomers(true);
    try {
      const cfg = activeConfig || config;
      const res = await fetch('/api/asaas/customers?limit=15', {
        headers: {
          'x-asaas-key': cfg.apiKey || '',
          'x-asaas-environment': cfg.environment || 'auto',
          'x-asaas-custom-url': cfg.customBaseUrl || '',
        },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setCustomersList(data.data);
      }
    } catch (err: any) {
      console.warn('Falha ao listar clientes Asaas:', err);
    } finally {
      setIsLoadingCustomers(false);
    }
  }, [config]);

  const fetchRecentSubscriptions = useCallback(async (activeConfig?: AsaasConfig) => {
    setIsLoadingSubscriptions(true);
    try {
      const cfg = activeConfig || config;
      const res = await fetch('/api/asaas/subscriptions?limit=15', {
        headers: {
          'x-asaas-key': cfg.apiKey || '',
          'x-asaas-environment': cfg.environment || 'auto',
          'x-asaas-custom-url': cfg.customBaseUrl || '',
        },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setSubscriptionsList(data.data);
      }
    } catch (err: any) {
      console.warn('Falha ao listar assinaturas Asaas:', err);
    } finally {
      setIsLoadingSubscriptions(false);
    }
  }, [config]);

  const handleTestConnection = useCallback(async (override?: AsaasConfig) => {
    setIsTesting(true);
    setTestResult(null);
    try {
      addLog('Testando conexão com a API Asaas...');
      const targetConfig = override || config;
      const res = await testAsaasConnection(targetConfig);
      setTestResult(res);
      if (res.success) {
        addLog(`✅ Conexão Asaas OK! ${res.message} (${res.environment || 'Ativo'})`);
        showToast('Conexão com Asaas realizada com sucesso!');
        void fetchRecentCustomers(targetConfig);
        void fetchRecentSubscriptions(targetConfig);
      } else {
        addLog(`❌ Falha no Asaas: ${res.message}`);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Erro ao conectar.',
      });
      addLog(`❌ Erro: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  }, [addLog, config, fetchRecentCustomers, fetchRecentSubscriptions, showToast]);

  useEffect(() => {
    let isMounted = true;
    
    const initCheck = async () => {
      try {
        const res = await testAsaasConnection(config);
        if (isMounted) {
          setTestResult(res);
          if (res.success) {
            void fetchRecentCustomers(config);
            void fetchRecentSubscriptions(config);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setTestResult({
            success: false,
            message: err.message || 'Erro ao conectar.',
          });
        }
      }
    };

    void initCheck();

    return () => {
      isMounted = false;
    };
  }, [config, fetchRecentCustomers, fetchRecentSubscriptions]);

  const handleSaveConfig = () => {
    saveAsaasConfig(config);
    showToast('Todas as configurações do Asaas foram salvas internamente!');
    addLog(`Configurações Asaas salvas: ambiente ${config.environment || 'auto'}, preços atualizados.`);
    void handleTestConnection(config);
  };

  const handleResetDefaults = () => {
    const defaultConfig: AsaasConfig = {
      apiKey: '',
      environment: 'auto',
      customBaseUrl: '',
      webhookAuthToken: '',
      notificationDisabled: false,
      defaultCycle: 'MONTHLY',
      dueDaysOffset: 1,
      defaultBillingType: 'UNDEFINED',
      fineValue: 2.0,
      interestValue: 1.0,
      planEssencialPrice: 9.90,
      planEspecialistaPrice: 29.90,
      invoiceDescription: 'Assinatura VetPro Orienta',
    };
    setConfig(defaultConfig);
    saveAsaasConfig(defaultConfig);
    showToast('Configurações redefinidas para os valores padrão.');
    addLog('Configurações do Asaas redefinidas para os valores de fábrica.');
  };

  const handleCreateCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustomerError(null);
    setCreatedCustomer(null);

    if (!testCustomer.name || !testCustomer.cpfCnpj) {
      setCustomerError('Nome e CPF/CNPJ são obrigatórios.');
      return;
    }

    setIsCreatingCustomer(true);
    try {
      addLog(`Enviando cadastro de cliente '${testCustomer.name}' para o Asaas...`);
      const res = await createAsaasCustomer({
        name: testCustomer.name,
        cpfCnpj: testCustomer.cpfCnpj,
        email: testCustomer.email || undefined,
        mobilePhone: testCustomer.mobilePhone || undefined,
        notificationDisabled: config.notificationDisabled,
        externalReference: `tutor_manual_${testCustomer.name.toLowerCase().replace(/\s+/g, '_')}`,
      }, config);

      if (res.success && res.customer) {
        setCreatedCustomer(res.customer);
        setSelectedCustomerId(res.customer.id);
        showToast(`Cliente '${res.customer.name}' cadastrado no Asaas! ID: ${res.customer.id}`);
        addLog(`✅ Cliente Asaas criado com sucesso! ID: ${res.customer.id}`);
        void fetchRecentCustomers();
      } else {
        setCustomerError(res.error || 'Erro ao cadastrar cliente.');
        addLog(`❌ Erro ao criar cliente: ${res.error}`);
        showToast(res.error || 'Erro ao criar cliente', 'error');
      }
    } catch (err: any) {
      setCustomerError(err.message || 'Erro inesperado.');
      addLog(`❌ Exceção: ${err.message}`);
      showToast(err.message, 'error');
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  const handleCreateSubscriptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubError(null);
    setCreatedSubscription(null);

    if (!selectedCustomerId) {
      setSubError('Selecione ou informe o ID do cliente no Asaas.');
      return;
    }

    setIsCreatingSub(true);
    try {
      const offset = (config.dueDaysOffset !== undefined && !isNaN(Number(config.dueDaysOffset))) ? Number(config.dueDaysOffset) : 1;
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + offset);
      const nextDueDate = targetDate.toISOString().split('T')[0];

      addLog(`Criando assinatura recorrente para o cliente ${selectedCustomerId} (R$ ${selectedPlanValue})...`);
      const res = await createAsaasSubscription({
        customer: selectedCustomerId,
        billingType: selectedBillingType,
        value: parseFloat(selectedPlanValue),
        nextDueDate,
        cycle: config.defaultCycle || 'MONTHLY',
        description: config.invoiceDescription || `Plano VetPro Orienta (R$ ${selectedPlanValue}/mês)`,
        externalReference: `sub_${selectedCustomerId}`,
      }, config);

      if (res.success && res.subscription) {
        setCreatedSubscription(res.subscription);
        showToast(`Assinatura criada no Asaas! ID: ${res.subscription.id}`);
        addLog(`✅ Assinatura criada com sucesso! ID: ${res.subscription.id}`);
        void fetchRecentSubscriptions();
      } else {
        setSubError(res.error || 'Erro ao criar assinatura.');
        addLog(`❌ Erro na assinatura: ${res.error}`);
        showToast(res.error || 'Erro na assinatura', 'error');
      }
    } catch (err: any) {
      setSubError(err.message || 'Erro inesperado.');
      addLog(`❌ Exceção assinatura: ${err.message}`);
      showToast(err.message, 'error');
    } finally {
      setIsCreatingSub(false);
    }
  };

  const formatCpfCnpj = (val: string) => {
    const digits = val.replace(/\D/g, '');
    if (digits.length <= 11) {
      return digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
        .slice(0, 14);
    }
    return digits
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
      .slice(0, 18);
  };

  const webhookUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/asaas/webhook` 
    : 'https://sua-aplicacao.com/api/asaas/webhook';

  const copyWebhookUrl = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(webhookUrl);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 3000);
      showToast('URL do Webhook copiada para a área de transferência!');
    }
  };

  const activeResolvedUrl = getAsaasBaseUrl(config.apiKey, config.environment, config.customBaseUrl);

  return (
    <div className="p-8 h-full overflow-y-auto bg-brand-bg">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Toast Notificação */}
        {toastMessage && (
          <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-semibold animate-in fade-in slide-in-from-top-2 ${
            toastMessage.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}>
            <div className="flex items-center gap-2">
              {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{toastMessage.text}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="opacity-70 hover:opacity-100">✕</button>
          </div>
        )}

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-brand-teal/15 text-brand-teal text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-brand-teal/30">
                Gateway de Pagamentos & Recorrência
              </span>
              <span className="text-xs text-brand-text-muted">Asaas OpenAPI 3.0</span>
            </div>
            <h1 className="font-display text-2xl font-bold">Painel de Configuração Geral do Asaas</h1>
            <p className="text-sm text-brand-text-muted">
              Configure credenciais, ambientes (Sandbox/Produção), webhooks, regras de cobrança e precificação de planos internamente.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleResetDefaults}
              className="px-3.5 py-2 rounded-xl bg-brand-surface-2 hover:bg-brand-surface border border-brand-border-strong text-xs font-semibold text-brand-text flex items-center gap-1.5 transition-colors"
              title="Restaurar valores padrão"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restaurar Padrões
            </button>
            <button
              onClick={() => handleTestConnection()}
              disabled={isTesting}
              className="px-4 py-2.5 rounded-xl bg-brand-teal text-brand-bg font-bold text-xs hover:bg-brand-teal/90 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isTesting ? 'animate-spin' : ''}`} />
              {isTesting ? 'Testando API...' : 'Testar Conexão Asaas'}
            </button>
          </div>
        </div>

        <SupabaseStatusBanner />

        {/* Bloco de Status da Conexão */}
        {testResult && (
          <div className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
            testResult.success 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}>
            {testResult.success ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-1 w-full">
              <div className="font-bold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {testResult.success ? 'Conectado ao Asaas com Sucesso' : 'Atenção com a Conexão'}
                  <span className="bg-brand-surface px-2 py-0.5 rounded text-[10px] text-brand-text font-mono">
                    {activeResolvedUrl}
                  </span>
                </span>
                {testResult.details?.environment && (
                  <span className="bg-brand-surface px-2 py-0.5 rounded text-[10px] text-brand-text">
                    Ambiente: {testResult.details.environment}
                  </span>
                )}
              </div>
              <p className="opacity-90">{testResult.message}</p>
            </div>
          </div>
        )}

        {/* Webhook Banner */}
        <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
              <Webhook className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-brand-text flex items-center gap-2">
                <span>Webhook de Sincronização Automática</span>
                <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full font-sans font-normal">Ativo</span>
              </h3>
              <p className="text-xs text-brand-text-muted mt-0.5">
                Cole esta URL no painel do Asaas (Minha Conta &gt; Integrações &gt; Webhooks para Cobranças) para ativar pagantes instantaneamente.
              </p>
              <div className="mt-2 font-mono text-[11px] bg-brand-bg px-3 py-1.5 rounded-lg border border-brand-border-strong text-brand-teal inline-block">
                {webhookUrl}
              </div>
            </div>
          </div>

          <button
            onClick={copyWebhookUrl}
            className="px-4 py-2.5 rounded-xl bg-brand-surface-2 hover:bg-brand-surface border border-brand-border-strong text-xs font-semibold text-brand-text flex items-center gap-2 shrink-0 transition-colors"
          >
            {copiedWebhook ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copiedWebhook ? 'URL Copiada!' : 'Copiar URL do Webhook'}
          </button>
        </div>

        {/* Bloco 1: Configurações Gerais da API & Ambientes */}
        <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-brand-border-strong pb-3">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-brand-teal" />
              <h3 className="font-display font-bold text-base">1. Credenciais, Ambientes e Segurança</h3>
            </div>
            <span className="text-[11px] text-brand-text-muted">Persistido internamente</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
            {/* Chave de API */}
            <div className="lg:col-span-2">
              <label className="block text-brand-text-muted font-medium mb-1 flex items-center justify-between">
                <span>Chave de API do Asaas (access_token) *</span>
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="text-brand-teal hover:underline flex items-center gap-1 text-[11px]"
                >
                  {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showApiKey ? 'Ocultar' : 'Mostrar'}
                </button>
              </label>
              <input
                type={showApiKey ? "text" : "password"}
                value={config.apiKey || ''}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder="$aact_YTU5YTE0M2M6N2Zl..."
                className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-brand-text focus:outline-none focus:border-brand-teal font-mono text-xs"
              />
              <p className="text-[11px] text-brand-text-muted mt-1">
                Suporta chaves de Produção (<code className="text-brand-teal font-mono">$aact_...</code>) ou Sandbox.
              </p>
            </div>

            {/* Ambiente */}
            <div>
              <label className="block text-brand-text-muted font-medium mb-1">Ambiente de Execução</label>
              <select
                value={config.environment || 'auto'}
                onChange={(e) => setConfig({ ...config, environment: e.target.value as any })}
                className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-brand-text focus:outline-none focus:border-brand-teal"
              >
                <option value="auto">Automático (Detectar pela chave)</option>
                <option value="sandbox">Sandbox Oficial (api-sandbox.asaas.com)</option>
                <option value="production">Produção Oficial (api.asaas.com)</option>
                <option value="custom">URL Customizada / Proxy</option>
              </select>
              <p className="text-[11px] text-brand-text-muted mt-1">
                Endpoint atual: <code className="text-brand-teal font-mono">{activeResolvedUrl}</code>
              </p>
            </div>

            {/* URL Customizada (se selecionado custom) */}
            {config.environment === 'custom' && (
              <div className="lg:col-span-3">
                <label className="block text-brand-text-muted font-medium mb-1">URL Base Customizada</label>
                <input
                  type="text"
                  value={config.customBaseUrl || ''}
                  onChange={(e) => setConfig({ ...config, customBaseUrl: e.target.value })}
                  placeholder="https://meu-proxy-asaas.empresa.com"
                  className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-brand-text focus:outline-none focus:border-brand-teal font-mono text-xs"
                />
              </div>
            )}

            {/* Token do Webhook */}
            <div className="lg:col-span-2">
              <label className="block text-brand-text-muted font-medium mb-1 flex items-center justify-between">
                <span>Token Secreto do Webhook (asaas-access-token)</span>
                <button
                  type="button"
                  onClick={() => setShowWebhookToken(!showWebhookToken)}
                  className="text-brand-teal hover:underline flex items-center gap-1 text-[11px]"
                >
                  {showWebhookToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showWebhookToken ? 'Ocultar' : 'Mostrar'}
                </button>
              </label>
              <input
                type={showWebhookToken ? "text" : "password"}
                value={config.webhookAuthToken || ''}
                onChange={(e) => setConfig({ ...config, webhookAuthToken: e.target.value })}
                placeholder="whsec_token_seguro_min_32_chars..."
                className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-brand-text focus:outline-none focus:border-brand-teal font-mono text-xs"
              />
              <p className="text-[11px] text-brand-text-muted mt-1">
                Token informado no painel do Asaas para validar requisições do webhook.
              </p>
            </div>

            {/* Notificações do Asaas */}
            <div>
              <label className="block text-brand-text-muted font-medium mb-1">Notificações Automáticas Asaas</label>
              <select
                value={config.notificationDisabled ? 'true' : 'false'}
                onChange={(e) => setConfig({ ...config, notificationDisabled: e.target.value === 'true' })}
                className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-brand-text focus:outline-none focus:border-brand-teal"
              >
                <option value="false">Habilitadas (Asaas envia SMS/Email ao tutor)</option>
                <option value="true">Desabilitadas (Apenas VetPro notifica)</option>
              </select>
              <p className="text-[11px] text-brand-text-muted mt-1">
                Controle se o Asaas dispara e-mails e SMS de cobrança diretamente aos tutores.
              </p>
            </div>
          </div>
        </div>

        {/* Bloco 2: Regras de Cobrança & Precificação dos Planos */}
        <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-brand-border-strong pb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <h3 className="font-display font-bold text-base">2. Preços dos Planos & Regras de Assinatura</h3>
            </div>
            <span className="text-[11px] text-brand-text-muted">Ajuste de mensalidade e ciclo</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-xs">
            {/* Preço Plano Essencial */}
            <div>
              <label className="block text-brand-text-muted font-medium mb-1">Preço Plano Essencial (R$)</label>
              <input
                type="number"
                step="0.10"
                min="0"
                value={config.planEssencialPrice !== undefined ? config.planEssencialPrice : 9.90}
                onChange={(e) => {
                  const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                  setConfig({ ...config, planEssencialPrice: isNaN(val) ? 0 : Math.max(0, val) });
                }}
                className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-brand-text focus:outline-none focus:border-brand-teal font-mono font-bold"
              />
              <p className="text-[11px] text-brand-text-muted mt-1">Padrão da plataforma: R$ 9,90</p>
            </div>

            {/* Preço Plano Especialista */}
            <div>
              <label className="block text-brand-text-muted font-medium mb-1">Preço Plano Especialista (R$)</label>
              <input
                type="number"
                step="0.10"
                min="0"
                value={config.planEspecialistaPrice !== undefined ? config.planEspecialistaPrice : 29.90}
                onChange={(e) => {
                  const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                  setConfig({ ...config, planEspecialistaPrice: isNaN(val) ? 0 : Math.max(0, val) });
                }}
                className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-brand-text focus:outline-none focus:border-brand-teal font-mono font-bold"
              />
              <p className="text-[11px] text-brand-text-muted mt-1">Padrão da plataforma: R$ 29,90</p>
            </div>

            {/* Forma de Pagamento Padrão */}
            <div>
              <label className="block text-brand-text-muted font-medium mb-1">Forma de Pagamento Padrão</label>
              <select
                value={config.defaultBillingType || 'UNDEFINED'}
                onChange={(e) => setConfig({ ...config, defaultBillingType: e.target.value as any })}
                className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-brand-text focus:outline-none focus:border-brand-teal"
              >
                <option value="UNDEFINED">Cliente Escolhe (Pix/Cartão/Boleto)</option>
                <option value="PIX">Exclusivo PIX</option>
                <option value="CREDIT_CARD">Cartão de Crédito</option>
                <option value="BOLETO">Boleto Bancário</option>
              </select>
            </div>

            {/* Ciclo Padrão */}
            <div>
              <label className="block text-brand-text-muted font-medium mb-1">Ciclo da Assinatura</label>
              <select
                value={config.defaultCycle || 'MONTHLY'}
                onChange={(e) => setConfig({ ...config, defaultCycle: e.target.value as any })}
                className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-brand-text focus:outline-none focus:border-brand-teal"
              >
                <option value="MONTHLY">Mensal</option>
                <option value="QUARTERLY">Trimestral</option>
                <option value="SEMIANNUALLY">Semestral</option>
                <option value="YEARLY">Anual</option>
              </select>
            </div>

            {/* Dias para 1º Vencimento */}
            <div>
              <label className="block text-brand-text-muted font-medium mb-1">1º Vencimento (Dias após cadastro)</label>
              <input
                type="number"
                min="0"
                max="30"
                value={config.dueDaysOffset !== undefined ? config.dueDaysOffset : 1}
                onChange={(e) => {
                  const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                  setConfig({ ...config, dueDaysOffset: isNaN(val) ? 0 : Math.max(0, val) });
                }}
                className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-brand-text focus:outline-none focus:border-brand-teal font-mono"
              />
              <p className="text-[11px] text-brand-text-muted mt-1">
                {config.dueDaysOffset === 0 ? '0 dias = Vence hoje (mesmo dia do cadastro)' : `Vence em ${config.dueDaysOffset} dia(s) após o cadastro`}
              </p>
            </div>

            {/* Descrição na Fatura */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-brand-text-muted font-medium mb-1">Descrição Personalizada na Fatura</label>
              <input
                type="text"
                value={config.invoiceDescription || ''}
                onChange={(e) => setConfig({ ...config, invoiceDescription: e.target.value })}
                placeholder="Ex: Assinatura VetPro Orienta"
                className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-brand-text focus:outline-none focus:border-brand-teal text-xs"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleSaveConfig}
              className="px-6 py-3 rounded-xl bg-brand-teal text-brand-bg font-bold text-xs hover:bg-brand-teal/90 transition-colors shadow-md flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Salvar Todas as Configurações Internas
            </button>
          </div>
        </div>

        {/* Bloco 3: Operações de Criação de Clientes e Assinaturas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Teste de Cadastro de Cliente (POST /v3/customers) */}
          <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-brand-border-strong pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <h3 className="font-display font-bold text-base">3. Criar / Localizar Cliente</h3>
              </div>
              <span className="text-[11px] text-brand-text-muted font-mono">POST /v3/customers</span>
            </div>

            <form onSubmit={handleCreateCustomerSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-brand-text-muted font-medium mb-1">Nome Completo *</label>
                <input
                  type="text"
                  value={testCustomer.name}
                  onChange={(e) => setTestCustomer({ ...testCustomer, name: e.target.value })}
                  placeholder="Ex: João da Silva"
                  className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-brand-text focus:outline-none focus:border-brand-teal"
                  required
                />
              </div>

              <div>
                <label className="block text-brand-text-muted font-medium mb-1">CPF ou CNPJ *</label>
                <input
                  type="text"
                  value={testCustomer.cpfCnpj}
                  onChange={(e) => setTestCustomer({ ...testCustomer, cpfCnpj: formatCpfCnpj(e.target.value) })}
                  placeholder="000.000.000-00"
                  className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-brand-text focus:outline-none focus:border-brand-teal font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-brand-text-muted font-medium mb-1">E-mail do Cliente</label>
                <input
                  type="email"
                  value={testCustomer.email}
                  onChange={(e) => setTestCustomer({ ...testCustomer, email: e.target.value })}
                  placeholder="cliente@email.com"
                  className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-brand-text focus:outline-none focus:border-brand-teal"
                />
              </div>

              <div>
                <label className="block text-brand-text-muted font-medium mb-1">Celular / WhatsApp</label>
                <input
                  type="tel"
                  value={testCustomer.mobilePhone}
                  onChange={(e) => setTestCustomer({ ...testCustomer, mobilePhone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-brand-text focus:outline-none focus:border-brand-teal"
                />
              </div>

              <div className="sm:col-span-2 pt-2">
                <button
                  type="submit"
                  disabled={isCreatingCustomer}
                  className="w-full py-2.5 rounded-xl bg-brand-surface-2 hover:bg-brand-surface border border-brand-border-strong text-brand-text font-bold text-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isCreatingCustomer ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Cadastrando no Asaas...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      Cadastrar Cliente no Asaas
                    </>
                  )}
                </button>
              </div>
            </form>

            {createdCustomer && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Cliente Criado / Localizado com Sucesso
                  </span>
                  <span className="font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-[11px]">
                    ID: {createdCustomer.id}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-brand-text text-[11px] font-mono">
                  <div><strong>Nome:</strong> {createdCustomer.name}</div>
                  <div><strong>CPF/CNPJ:</strong> {createdCustomer.cpfCnpj}</div>
                  <div><strong>Email:</strong> {createdCustomer.email || 'N/D'}</div>
                  <div><strong>Telefone:</strong> {createdCustomer.mobilePhone || 'N/D'}</div>
                </div>
              </div>
            )}

            {customerError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{customerError}</span>
              </div>
            )}
          </div>

          {/* Gerador de Assinatura Recorrente (POST /v3/subscriptions) */}
          <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-brand-border-strong pb-3">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-brand-teal" />
                <h3 className="font-display font-bold text-base">4. Gerar Assinatura Recorrente</h3>
              </div>
              <span className="text-[11px] text-brand-text-muted font-mono">POST /v3/subscriptions</span>
            </div>

            <form onSubmit={handleCreateSubscriptionSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="sm:col-span-3">
                <label className="block text-brand-text-muted font-medium mb-1">ID do Cliente no Asaas *</label>
                <input
                  type="text"
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  placeholder="cus_0000058291..."
                  className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-brand-text focus:outline-none focus:border-brand-teal font-mono"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-brand-text-muted font-medium mb-1">Plano & Valor Mensal</label>
                <select
                  value={selectedPlanValue}
                  onChange={(e) => setSelectedPlanValue(e.target.value)}
                  className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-brand-text focus:outline-none focus:border-brand-teal font-medium"
                >
                  <option value={String(config.planEssencialPrice !== undefined ? config.planEssencialPrice : 9.90)}>
                    Plano Essencial - R$ {Number(config.planEssencialPrice !== undefined ? config.planEssencialPrice : 9.90).toFixed(2)} / mês
                  </option>
                  <option value={String(config.planEspecialistaPrice !== undefined ? config.planEspecialistaPrice : 29.90)}>
                    Plano Especialista - R$ {Number(config.planEspecialistaPrice !== undefined ? config.planEspecialistaPrice : 29.90).toFixed(2)} / mês
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-brand-text-muted font-medium mb-1">Forma de Pagamento</label>
                <select
                  value={selectedBillingType}
                  onChange={(e) => setSelectedBillingType(e.target.value as any)}
                  className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-brand-text focus:outline-none focus:border-brand-teal font-medium"
                >
                  <option value="UNDEFINED">A Definir (Pix/Cartão/Boleto)</option>
                  <option value="PIX">Exclusivo Pix</option>
                  <option value="CREDIT_CARD">Cartão de Crédito</option>
                  <option value="BOLETO">Boleto Bancário</option>
                </select>
              </div>

              <div className="sm:col-span-3 pt-2">
                <button
                  type="submit"
                  disabled={isCreatingSub}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-accent-2 to-brand-accent text-brand-accent-ink font-bold text-xs hover:opacity-95 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isCreatingSub ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Gerando Assinatura Recorrente no Asaas...
                    </>
                  ) : (
                    <>
                      <Repeat className="w-3.5 h-3.5" />
                      Gerar Assinatura Recorrente para o Cliente
                    </>
                  )}
                </button>
              </div>
            </form>

            {createdSubscription && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Assinatura Criada com Sucesso
                  </span>
                  <span className="font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-[11px]">
                    ID: {createdSubscription.id}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-brand-text text-[11px] font-mono">
                  <div><strong>Valor:</strong> R$ {createdSubscription.value}</div>
                  <div><strong>Ciclo:</strong> {createdSubscription.cycle}</div>
                  <div><strong>Status:</strong> {createdSubscription.status}</div>
                  <div><strong>Próx. Vencimento:</strong> {createdSubscription.nextDueDate}</div>
                </div>
                {createdSubscription.paymentLink && (
                  <div className="pt-2">
                    <a
                      href={createdSubscription.paymentLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-brand-teal hover:underline font-bold"
                    >
                      Abrir Link de Pagamento do Asaas →
                    </a>
                  </div>
                )}
              </div>
            )}

            {subError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{subError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Bloco 4: Tabelas de Clientes e Assinaturas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lista de Clientes Recentes */}
          <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-brand-border-strong pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-brand-teal" />
                <h3 className="font-display font-bold text-base">Clientes no Asaas</h3>
              </div>
              <button
                onClick={() => void fetchRecentCustomers()}
                disabled={isLoadingCustomers}
                className="text-xs text-brand-teal hover:underline flex items-center gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCustomers ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>

            {customersList.length === 0 ? (
              <div className="text-center py-6 text-xs text-brand-text-muted">
                {isLoadingCustomers ? 'Carregando clientes...' : 'Nenhum cliente retornado.'}
              </div>
            ) : (
              <div className="divide-y divide-brand-border-strong overflow-x-auto max-h-80">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-brand-text-muted font-semibold">
                      <th className="pb-2">ID</th>
                      <th className="pb-2">Nome</th>
                      <th className="pb-2">CPF/CNPJ</th>
                      <th className="pb-2 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border-strong/50">
                    {customersList.map((c) => (
                      <tr key={c.id} className="hover:bg-brand-surface-2/30">
                        <td className="py-2.5 font-mono text-brand-teal font-medium">{c.id}</td>
                        <td className="py-2.5 font-semibold text-brand-text">{c.name}</td>
                        <td className="py-2.5 font-mono text-brand-text-muted">{c.cpfCnpj}</td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => {
                              setSelectedCustomerId(c.id);
                              showToast(`Cliente '${c.name}' selecionado para criar assinatura.`);
                            }}
                            className="text-[11px] text-brand-teal hover:underline font-semibold"
                          >
                            Assinar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Lista de Assinaturas Recentes */}
          <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-brand-border-strong pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <h3 className="font-display font-bold text-base">Assinaturas Recorrentes</h3>
              </div>
              <button
                onClick={() => void fetchRecentSubscriptions()}
                disabled={isLoadingSubscriptions}
                className="text-xs text-brand-teal hover:underline flex items-center gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSubscriptions ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>

            {subscriptionsList.length === 0 ? (
              <div className="text-center py-6 text-xs text-brand-text-muted">
                {isLoadingSubscriptions ? 'Carregando assinaturas...' : 'Nenhuma assinatura registrada ainda.'}
              </div>
            ) : (
              <div className="divide-y divide-brand-border-strong overflow-x-auto max-h-80">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-brand-text-muted font-semibold">
                      <th className="pb-2">ID Assinatura</th>
                      <th className="pb-2">Cliente</th>
                      <th className="pb-2">Valor</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border-strong/50">
                    {subscriptionsList.map((s) => (
                      <tr key={s.id} className="hover:bg-brand-surface-2/30">
                        <td className="py-2.5 font-mono text-brand-teal font-medium">{s.id}</td>
                        <td className="py-2.5 font-mono text-brand-text-muted">{s.customer}</td>
                        <td className="py-2.5 font-semibold text-brand-text">R$ {s.value}</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.status === 'ACTIVE' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                          }`}>
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Console Logs */}
        <div className="bg-[#03070B] border border-brand-border-strong rounded-2xl p-4 font-mono text-[11px] text-brand-text-muted space-y-1 max-h-48 overflow-y-auto">
          <div className="text-xs font-bold text-brand-teal mb-2 flex items-center gap-1.5">
            <span>Terminal de Eventos Asaas</span>
          </div>
          {logs.map((log, idx) => (
            <div key={idx} className="leading-relaxed">{log}</div>
          ))}
        </div>

      </div>
    </div>
  );
}
