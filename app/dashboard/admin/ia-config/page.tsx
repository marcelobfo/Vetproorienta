'use client';

import { useState, useEffect, useRef, useId } from 'react';
import { 
  Bot, Key, FileText, Save, Plus, Trash2, CheckCircle2, 
  AlertCircle, RefreshCw, Sparkles, Cpu, X, UploadCloud, 
  File, Download, Search, Eye, Loader2, FileType, BookOpen, Layers
} from 'lucide-react';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { SupabaseStatusBanner } from '@/components/SupabaseStatusBanner';
import { parseUploadedDocument, formatBytes, ParsedDocument } from '@/lib/documentParser';

interface KnowledgeItem {
  id: string;
  title: string;
  category: string;
  content: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  fileUrl?: string;
  pageCount?: number;
  isActive?: boolean;
  createdAt?: string;
}

const DEFAULT_PROMPT = `Você é o assistente virtual veterinário compassivo do sistema *VetPro Orienta*. 
Seu objetivo é fazer uma triagem e um pré-diagnóstico humanizado de cães e gatos com base nas informações passadas pelo tutor.

REGRA OBRIGATÓRIA DE FORMATAÇÃO (ESTRITA):
- Em todas as suas respostas, use negrito SEMPRE e APENAS com um único asterisco (*exemplo em negrito*).
- NUNCA utilize dois asteriscos (**exemplo**). Dois asteriscos é estritamente proibido.
- Quando for a primeira interação ou quando precisar coletar os dados cadastrais do tutor e do animal para a triagem, solicite as informações utilizando rigorosamente o formato de lista abaixo (com um único asterisco para o negrito):
* *Seu nome:*
* *Nome do pet:*
* *Espécie (cão ou gato):*
* *Raça:*
* *Sexo:*
* *Idade:*
* *Peso aproximado:*

Regras clínicas e de segurança:
1. Sempre deixe claro que você é uma inteligência artificial e NÃO substitui uma consulta presencial com médico veterinário.
2. Em qualquer sinal de emergência (convulsão, hemorragia, prostração grave, dispneia, intoxicação), instrua o tutor a buscar atendimento IMEDIATO.
3. Não prescreva medicamentos controlados ou dosagens farmacológicas sob nenhuma hipótese.
4. Mantenha um tom acolhedor, calmo, didático e empático com os tutores.
5. Baseie suas orientações estritamente nos documentos e protocolos clínicos RAG cadastrados no sistema.`;

const DEFAULT_KNOWLEDGE: KnowledgeItem[] = [
  {
    id: 'kb-1',
    title: 'Protocolo de Vacinação Canina (Diretrizes WSAVA 2024)',
    category: 'Protocolos Clínicos',
    content: 'As vacinas essenciais (core) para cães incluem a vacina múltipla (V8/V10) e a antirrábica. O protocolo deve iniciar aos 45-60 dias de vida com reforços a cada 21-30 dias até 16 semanas. Protocolos não-core incluem Giárdia e Gripe Canina.',
    fileName: 'Diretrizes_Vacinacao_WSAVA.pdf',
    fileSize: 420000,
    fileType: 'application/pdf',
    pageCount: 4,
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'kb-2',
    title: 'Sinais de Emergência e Triagem Vermelha em Felinos',
    category: 'Emergências & Triagem',
    content: 'Em gatos, obstrução uretral (esforço sem urinar, vocalização), respiração de boca aberta (dispneia grave), hipotermia e vômitos incoercíveis exigem encaminhamento hospitalar imediato.',
    fileName: 'Protocolo_Emergencias_Felinas.pdf',
    fileSize: 285000,
    fileType: 'application/pdf',
    pageCount: 2,
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'kb-3',
    title: 'Alimentação e Intoxicações Comuns em Pequenos Animais',
    category: 'Nutrição & Toxicologia',
    content: 'Alimentos tóxicos proibidos: Chocolate (teobromina), cebola/alho (anemia hemolítica), uvas/passas (lesão renal aguda) e xilitol (hipoglicemia severa). Sinais de intoxicação: salivação excessiva, vômitos, convulsão.',
    fileName: 'Tabela_Toxicologia_Veterinaria.pdf',
    fileSize: 195000,
    fileType: 'application/pdf',
    pageCount: 3,
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

export default function IAConfigPage() {
  const [activeTab, setActiveTab] = useState<'prompt' | 'knowledge' | 'api'>('prompt');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State - Prompt
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_PROMPT);
  const [modelName, setModelName] = useState('gemini-2.5-flash');
  const [temperature, setTemperature] = useState(0.2);
  const [maxTokens, setMaxTokens] = useState(2048);

  // Form State - API
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  // Knowledge Base State
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>(DEFAULT_KNOWLEDGE);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Modal Novo Material / Upload
  const [isModalAddKb, setIsModalAddKb] = useState(false);
  const [kbTitle, setKbTitle] = useState('');
  const [kbCategory, setKbCategory] = useState('Protocolos Clínicos');
  const [kbContent, setKbContent] = useState('');
  const [attachedFile, setAttachedFile] = useState<ParsedDocument | null>(null);
  const [isParsingDoc, setIsParsingDoc] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Modal Preview Documento
  const [previewItem, setPreviewItem] = useState<KnowledgeItem | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputId = useId();

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Carregar do Supabase ou LocalStorage
  const loadData = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured()) {
        const supabase = getSupabaseClient();

        // 1. Carregar Configurações de IA
        const { data: aiData } = await supabase
          .from('ai_settings')
          .select('*')
          .limit(1)
          .maybeSingle();

        if (aiData) {
          if (aiData.system_prompt) setSystemPrompt(aiData.system_prompt);
          if (aiData.model_name) setModelName(aiData.model_name);
          if (aiData.temperature !== undefined) setTemperature(Number(aiData.temperature));
          if (aiData.max_output_tokens) setMaxTokens(Number(aiData.max_output_tokens));
          if (aiData.api_key) setApiKey(aiData.api_key);
        } else {
          const savedPrompt = localStorage.getItem('vetpro_ai_prompt');
          if (savedPrompt) setSystemPrompt(savedPrompt);
        }

        // 2. Carregar Base de Conhecimento RAG
        const { data: kbData } = await supabase
          .from('knowledge_base')
          .select('*')
          .order('created_at', { ascending: false });

        if (kbData && kbData.length > 0) {
          const mapped: KnowledgeItem[] = kbData.map((k: any) => ({
            id: k.id,
            title: k.title,
            category: k.category || 'Geral',
            content: k.content,
            fileName: k.file_name,
            fileSize: k.file_size ? Number(k.file_size) : undefined,
            fileType: k.file_type,
            fileUrl: k.file_url,
            pageCount: k.page_count ? Number(k.page_count) : undefined,
            isActive: k.is_active ?? true,
            createdAt: k.created_at
          }));
          setKnowledgeItems(mapped);
          localStorage.setItem('vetpro_knowledge_base', JSON.stringify(mapped));
        } else {
          const savedKb = localStorage.getItem('vetpro_knowledge_base');
          if (savedKb) {
            setKnowledgeItems(JSON.parse(savedKb));
          }
        }
      } else {
        const savedPrompt = localStorage.getItem('vetpro_ai_prompt');
        if (savedPrompt) setSystemPrompt(savedPrompt);

        const savedKb = localStorage.getItem('vetpro_knowledge_base');
        if (savedKb) setKnowledgeItems(JSON.parse(savedKb));

        const savedKey = localStorage.getItem('vetpro_gemini_key');
        if (savedKey) setApiKey(savedKey);
      }
    } catch (e) {
      console.error('Erro ao carregar configurações de IA:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchAsync = async () => {
      if (isMounted) {
        await loadData();
      }
    };
    void fetchAsync();
    return () => {
      isMounted = false;
    };
  }, []);

  // Processamento de Upload de Arquivo (PDF / TXT / DOCX)
  const handleFileProcess = async (file: File) => {
    setIsParsingDoc(true);
    try {
      const parsed = await parseUploadedDocument(file);
      setAttachedFile(parsed);
      
      // Auto-preencher título se estiver vazio
      if (!kbTitle.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        setKbTitle(cleanName);
      }

      // Auto-preencher conteúdo com o texto extraído do PDF/arquivo
      if (parsed.text) {
        setKbContent(parsed.text);
      }

      showToast(`Documento "${file.name}" processado com sucesso! ${parsed.pageCount ? `(${parsed.pageCount} págs)` : ''}`);
    } catch (err: any) {
      console.error('Erro ao processar arquivo:', err);
      showToast(`Erro ao ler documento: ${err.message || 'Formato incompatível'}`, 'error');
    } finally {
      setIsParsingDoc(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  // Salvar Prompt e Parâmetros
  const handleSavePrompt = async () => {
    setSaving(true);
    try {
      localStorage.setItem('vetpro_ai_prompt', systemPrompt);
      localStorage.setItem('vetpro_ai_model', modelName);
      localStorage.setItem('vetpro_ai_temp', String(temperature));

      if (isSupabaseConfigured()) {
        const supabase = getSupabaseClient();
        
        const payload = {
          provider: 'gemini',
          model_name: modelName,
          temperature,
          max_output_tokens: maxTokens,
          system_prompt: systemPrompt,
          updated_at: new Date().toISOString()
        };

        const { data: existing } = await supabase.from('ai_settings').select('id').limit(1).maybeSingle();

        if (existing) {
          await supabase.from('ai_settings').update(payload).eq('id', existing.id);
        } else {
          await supabase.from('ai_settings').insert([payload]);
        }
        showToast('Configurações de IA salvas no Supabase com sucesso!');
      } else {
        showToast('Prompt e configurações salvas (armazenamento local)!');
      }
    } catch (err: any) {
      console.error(err);
      showToast(`Erro ao gravar no Supabase: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Salvar Chaves de API
  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      localStorage.setItem('vetpro_gemini_key', apiKey);

      if (isSupabaseConfigured()) {
        const supabase = getSupabaseClient();
        const { data: existing } = await supabase.from('ai_settings').select('id').limit(1).maybeSingle();
        if (existing) {
          await supabase.from('ai_settings').update({ api_key: apiKey }).eq('id', existing.id);
        } else {
          await supabase.from('ai_settings').insert([{ provider: 'gemini', api_key: apiKey }]);
        }
        showToast('Chave de API salva no Supabase!');
      } else {
        showToast('Chave de API salva localmente!');
      }
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao salvar chave de API', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Adicionar Documento/Material na Base de Conhecimento RAG
  const handleAddKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kbTitle.trim() || !kbContent.trim()) {
      showToast('Preencha o título e o conteúdo ou anexe um documento', 'error');
      return;
    }

    const newItem: KnowledgeItem = {
      id: `kb-${Date.now()}`,
      title: kbTitle.trim(),
      category: kbCategory,
      content: kbContent.trim(),
      fileName: attachedFile?.fileName,
      fileSize: attachedFile?.fileSize,
      fileType: attachedFile?.fileType,
      fileUrl: attachedFile?.dataUrl,
      pageCount: attachedFile?.pageCount,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    const updated = [newItem, ...knowledgeItems];
    setKnowledgeItems(updated);
    localStorage.setItem('vetpro_knowledge_base', JSON.stringify(updated));

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        const dbPayload: any = {
          title: kbTitle.trim(),
          category: kbCategory,
          content: kbContent.trim(),
          file_name: attachedFile?.fileName || null,
          file_size: attachedFile?.fileSize || null,
          file_type: attachedFile?.fileType || null,
          file_url: attachedFile?.dataUrl || null,
          page_count: attachedFile?.pageCount || null,
          is_active: true
        };

        const { error } = await supabase.from('knowledge_base').insert([dbPayload]);
        if (error) {
          // Se coluna como category/file_name ainda não estiver no cache do schema do Supabase, tenta insert com colunas básicas
          if (error.code === 'PGRST204' || error.message?.includes('category') || error.message?.includes('schema cache')) {
            const fallbackPayload: any = {
              title: kbTitle.trim(),
              content: kbContent.trim()
            };
            const retryRes = await supabase.from('knowledge_base').insert([fallbackPayload]);
            if (retryRes.error) throw retryRes.error;
            showToast('Documento RAG adicionado! (Execute o script SQL para sincronizar a coluna category no Supabase).');
          } else {
            throw error;
          }
        } else {
          showToast('Documento RAG adicionado ao Supabase com sucesso!');
        }
      } catch (err: any) {
        console.error(err);
        showToast(`Salvo localmente (Aviso Supabase: ${err.message})`, 'success');
      }
    } else {
      showToast('Documento RAG salvo com sucesso!');
    }

    // Resetar formulário
    setKbTitle('');
    setKbContent('');
    setAttachedFile(null);
    setIsModalAddKb(false);
  };

  // Excluir Material
  const handleDeleteKnowledge = async (id: string) => {
    if (!confirm('Deseja excluir este documento da base de conhecimento da IA?')) return;

    const updated = knowledgeItems.filter(k => k.id !== id);
    setKnowledgeItems(updated);
    localStorage.setItem('vetpro_knowledge_base', JSON.stringify(updated));

    if (isSupabaseConfigured() && !id.startsWith('kb-')) {
      try {
        const supabase = getSupabaseClient();
        await supabase.from('knowledge_base').delete().eq('id', id);
        showToast('Documento removido do Supabase.');
      } catch (err) {
        console.error(err);
      }
    } else {
      showToast('Documento removido.');
    }
  };

  // Filtragem de documentos
  const filteredKnowledge = knowledgeItems.filter(item => {
    const matchesSearch = 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.fileName && item.fileName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(knowledgeItems.map(k => k.category)));

  return (
    <div className="p-8 h-full overflow-y-auto bg-brand-bg relative">
      {/* Toast */}
      {toastMessage && (
        <div className={`fixed top-6 right-6 z-50 font-semibold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-in fade-in duration-200 ${
          toastMessage.type === 'error' ? 'bg-brand-danger text-white' : 'bg-brand-teal text-brand-bg'
        }`}>
          {toastMessage.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-purple-500/15 text-purple-400 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                Motor de Triagem IA & RAG
              </span>
            </div>
            <h1 className="font-display text-2xl font-bold">Configuração da Inteligência Artificial</h1>
            <p className="text-brand-text-muted text-sm">
              Anexe documentos em PDF, configure regras clínicas, parâmetros e sincronize tudo no Supabase.
            </p>
          </div>

          <button 
            onClick={loadData}
            disabled={loading}
            className="p-2.5 bg-brand-surface border border-brand-border-strong text-brand-text hover:bg-brand-surface-2 rounded-full transition-colors self-start sm:self-auto"
            title="Recarregar do Supabase"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Supabase Status Banner */}
        <SupabaseStatusBanner />

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-brand-border-strong mb-6">
          <button 
            onClick={() => setActiveTab('prompt')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'prompt' ? 'border-brand-teal text-brand-teal' : 'border-transparent text-brand-text-muted hover:text-brand-text'
            }`}
          >
            <Bot className="w-4 h-4" /> Prompt do Sistema & Parâmetros
          </button>
          <button 
            onClick={() => setActiveTab('knowledge')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'knowledge' ? 'border-brand-teal text-brand-teal' : 'border-transparent text-brand-text-muted hover:text-brand-text'
            }`}
          >
            <FileText className="w-4 h-4" /> Base de Conhecimento RAG ({knowledgeItems.length})
          </button>
          <button 
            onClick={() => setActiveTab('api')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'api' ? 'border-brand-teal text-brand-teal' : 'border-transparent text-brand-text-muted hover:text-brand-text'
            }`}
          >
            <Key className="w-4 h-4" /> Credenciais de API
          </button>
        </div>

        {/* Tab: Prompt */}
        {activeTab === 'prompt' && (
          <div className="space-y-6">
            <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 pb-6 border-b border-brand-border-strong">
                <div>
                  <label className="block text-xs font-bold text-brand-text mb-1.5 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-brand-teal" /> Modelo LLM
                  </label>
                  <select 
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3 py-2 text-xs font-medium text-brand-text focus:outline-none focus:border-brand-teal"
                  >
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recomendado - Ultrarrápido)</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro (Raciocínio Clínico Complexo)</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-brand-text">Temperatura: {temperature}</label>
                    <span className="text-[11px] text-brand-text-muted">
                      {temperature <= 0.2 ? 'Clínico / Preciso' : 'Criativo'}
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="0.0" 
                    max="1.0" 
                    step="0.1" 
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-brand-teal cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-text mb-1.5">Máximo de Tokens</label>
                  <input 
                    type="number" 
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                    className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3 py-2 text-xs font-medium text-brand-text focus:outline-none focus:border-brand-teal"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-sm text-brand-text">Instruções do Sistema (System Prompt)</h3>
                  <span className="text-[11px] text-brand-text-muted">Editável e sincronizado via Supabase</span>
                </div>
                <textarea 
                  rows={10}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="w-full bg-brand-bg border border-brand-border-strong rounded-xl p-4 text-xs font-mono text-brand-text focus:outline-none focus:border-brand-teal leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between mt-6 pt-4 border-t border-brand-border-strong">
                <button
                  type="button"
                  onClick={() => setSystemPrompt(DEFAULT_PROMPT)}
                  className="text-xs text-brand-text-muted hover:text-brand-text underline"
                >
                  Restaurar Prompt Padrão
                </button>

                <button 
                  onClick={handleSavePrompt}
                  disabled={saving}
                  className="bg-brand-teal text-brand-bg font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 hover:bg-brand-teal/90 transition-all shadow-md disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar no Supabase'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Knowledge Base */}
        {activeTab === 'knowledge' && (
          <div className="space-y-6">
            {/* Header com Botões e Estatísticas */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-brand-surface border border-brand-border-strong rounded-2xl p-5 shadow-sm">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen className="w-4 h-4 text-brand-teal" />
                  <h3 className="font-bold text-sm text-brand-text">Protocolos Clínicos & Documentos PDF (RAG)</h3>
                </div>
                <p className="text-xs text-brand-text-muted">
                  A IA utiliza esses documentos para embasar pré-diagnósticos, dosagens e condutas com precisão técnica.
                </p>
              </div>
              <button 
                id="btn-add-rag-doc"
                onClick={() => {
                  setAttachedFile(null);
                  setKbTitle('');
                  setKbContent('');
                  setIsModalAddKb(true);
                }}
                className="bg-brand-teal text-brand-bg font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-brand-teal/90 transition-all shadow-md shrink-0"
              >
                <Plus className="w-4 h-4" /> Anexar Documento / PDF
              </button>
            </div>

            {/* Barra de Busca e Filtros */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-text-muted" />
                <input 
                  type="text"
                  placeholder="Pesquisar por título, conteúdo ou nome do PDF..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-brand-surface border border-brand-border-strong rounded-xl pl-10 pr-4 py-2.5 text-xs text-brand-text focus:outline-none focus:border-brand-teal"
                />
              </div>

              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full sm:w-auto bg-brand-surface border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs text-brand-text focus:outline-none focus:border-brand-teal"
              >
                <option value="all">Todas as Categorias</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Lista de Documentos RAG */}
            {filteredKnowledge.length === 0 ? (
              <div className="bg-brand-surface border border-dashed border-brand-border-strong rounded-2xl p-10 text-center">
                <FileText className="w-10 h-10 text-brand-text-muted mx-auto mb-3 opacity-50" />
                <h4 className="font-bold text-sm text-brand-text mb-1">Nenhum documento encontrado</h4>
                <p className="text-xs text-brand-text-muted mb-4">
                  {searchTerm || selectedCategory !== 'all' 
                    ? 'Tente ajustar os filtros ou termo de busca.' 
                    : 'Anexe manuais em PDF, protocolos ou diretrizes para treinar o RAG da clínica.'}
                </p>
                <button 
                  onClick={() => setIsModalAddKb(true)}
                  className="bg-brand-teal text-brand-bg font-bold px-4 py-2 rounded-xl text-xs inline-flex items-center gap-2 hover:bg-brand-teal/90 shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Anexar Primeiro Documento
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredKnowledge.map((item) => (
                  <div 
                    key={item.id}
                    className="bg-brand-surface border border-brand-border-strong rounded-2xl p-5 shadow-sm hover:border-brand-teal/40 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-4 mb-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="bg-purple-500/15 text-purple-400 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                            {item.category}
                          </span>
                          {item.fileName && (
                            <span className="bg-brand-teal/15 text-brand-teal text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <FileType className="w-3 h-3" />
                              {item.fileName.endsWith('.pdf') ? 'PDF' : 'Arquivo'}
                              {item.pageCount ? ` • ${item.pageCount} págs` : ''}
                              {item.fileSize ? ` • ${formatBytes(item.fileSize)}` : ''}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button 
                            onClick={() => setPreviewItem(item)}
                            className="p-1.5 text-brand-text-muted hover:text-brand-teal hover:bg-brand-surface-2 rounded-lg transition-colors"
                            title="Visualizar Conteúdo"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {item.fileUrl && (
                            <a 
                              href={item.fileUrl} 
                              download={item.fileName || 'documento.pdf'}
                              className="p-1.5 text-brand-text-muted hover:text-brand-teal hover:bg-brand-surface-2 rounded-lg transition-colors"
                              title="Baixar Arquivo"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          )}
                          <button 
                            onClick={() => handleDeleteKnowledge(item.id)}
                            className="p-1.5 text-brand-danger hover:bg-brand-danger/10 rounded-lg transition-colors"
                            title="Excluir Documento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <h4 className="font-bold text-sm text-brand-text mb-2 flex items-center gap-2">
                        {item.fileName?.endsWith('.pdf') && <File className="w-4 h-4 text-brand-teal shrink-0" />}
                        {item.title}
                      </h4>
                      
                      <p className="text-xs text-brand-text-muted leading-relaxed line-clamp-3 font-sans">
                        {item.content}
                      </p>
                    </div>

                    {item.fileName && (
                      <div className="mt-3 pt-3 border-t border-brand-border-strong flex items-center justify-between text-[11px] text-brand-text-muted">
                        <span className="truncate max-w-xs flex items-center gap-1">
                          <FileText className="w-3 h-3 text-brand-teal" /> Anexo: <strong className="text-brand-text">{item.fileName}</strong>
                        </span>
                        <span>Indexado para RAG</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Modal Novo Material / Upload Documento */}
            {isModalAddKb && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
                <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6 w-full max-w-xl shadow-2xl my-8">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-display text-lg font-bold text-brand-text">Anexar Documento à Base RAG</h3>
                      <p className="text-xs text-brand-text-muted">Faça upload de PDF, manuais ou insira diretrizes clínicas</p>
                    </div>
                    <button 
                      onClick={() => setIsModalAddKb(false)}
                      className="p-1 text-brand-text-muted hover:text-brand-text rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Dropzone para Upload de Arquivo (PDF / DOCX / TXT) */}
                  <div className="mb-4">
                    <input 
                      type="file" 
                      id={fileInputId}
                      ref={fileInputRef}
                      onChange={handleFileInputChange}
                      accept=".pdf,.txt,.md,.docx,.json,.csv"
                      className="hidden"
                    />
                    <div 
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                        isDragging 
                          ? 'border-brand-teal bg-brand-teal/10 scale-[1.01]' 
                          : attachedFile 
                            ? 'border-brand-teal/50 bg-brand-surface-2' 
                            : 'border-brand-border-strong hover:border-brand-teal/50 hover:bg-brand-surface-2'
                      }`}
                    >
                      {isParsingDoc ? (
                        <div className="flex flex-col items-center justify-center py-2">
                          <Loader2 className="w-8 h-8 text-brand-teal animate-spin mb-2" />
                          <span className="text-xs font-bold text-brand-text">Extraindo texto e estruturando para RAG...</span>
                          <span className="text-[11px] text-brand-text-muted">Aguarde alguns instantes</span>
                        </div>
                      ) : attachedFile ? (
                        <div className="flex items-center justify-between text-left">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-brand-teal/20 text-brand-teal flex items-center justify-center shrink-0">
                              <File className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-brand-text truncate max-w-xs">
                                {attachedFile.fileName}
                              </div>
                              <div className="text-[11px] text-brand-text-muted">
                                {formatBytes(attachedFile.fileSize)} 
                                {attachedFile.pageCount ? ` • ${attachedFile.pageCount} páginas` : ''} • Extração concluída
                              </div>
                            </div>
                          </div>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAttachedFile(null);
                            }}
                            className="p-1.5 text-brand-text-muted hover:text-brand-danger rounded-lg transition-colors"
                            title="Remover anexo"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <UploadCloud className="w-8 h-8 text-brand-teal mb-2" />
                          <p className="text-xs font-bold text-brand-text mb-1">
                            Clique para selecionar ou arraste seu documento aqui
                          </p>
                          <p className="text-[11px] text-brand-text-muted">
                            Suporta <strong>PDF</strong>, <strong>TXT</strong>, <strong>DOCX</strong>, <strong>MD</strong> (Até 10MB)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <form onSubmit={handleAddKnowledge} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-brand-text-muted mb-1.5">
                        Título do Protocolo / Documento *
                      </label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ex: Diretrizes de Emergência para Intoxicação por Rodenticidas"
                        value={kbTitle}
                        onChange={(e) => setKbTitle(e.target.value)}
                        className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs text-brand-text focus:outline-none focus:border-brand-teal"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-brand-text-muted mb-1.5">Categoria</label>
                      <select 
                        value={kbCategory}
                        onChange={(e) => setKbCategory(e.target.value)}
                        className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs text-brand-text focus:outline-none focus:border-brand-teal"
                      >
                        <option value="Protocolos Clínicos">Protocolos Clínicos</option>
                        <option value="Emergências & Triagem">Emergências & Triagem</option>
                        <option value="Nutrição & Toxicologia">Nutrição & Toxicologia</option>
                        <option value="Cuidados Preventivos">Cuidados Preventivos & Vacinação</option>
                        <option value="Dermatologia & Alergias">Dermatologia & Alergias</option>
                        <option value="Cirurgia & Pós-operatório">Cirurgia & Pós-operatório</option>
                        <option value="Políticas Internas da Clínica">Políticas Internas da Clínica</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-brand-text-muted">
                          Conteúdo Extraído / Texto de Consulta RAG *
                        </label>
                        <span className="text-[10px] text-brand-teal">
                          {kbContent.length} caracteres
                        </span>
                      </div>
                      <textarea 
                        rows={7}
                        required
                        placeholder="O texto extraído do documento aparecerá aqui automaticamente. Você também pode digitar ou editar as informações..."
                        value={kbContent}
                        onChange={(e) => setKbContent(e.target.value)}
                        className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl p-3.5 text-xs text-brand-text focus:outline-none focus:border-brand-teal leading-relaxed font-mono"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-brand-border-strong">
                      <button 
                        type="button" 
                        onClick={() => setIsModalAddKb(false)}
                        className="px-4 py-2 text-xs text-brand-text-muted hover:text-brand-text"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit"
                        disabled={isParsingDoc}
                        className="bg-brand-teal text-brand-bg font-bold px-5 py-2.5 rounded-xl text-xs hover:bg-brand-teal/90 shadow-md disabled:opacity-50"
                      >
                        Salvar na Base RAG
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Modal Preview Documento */}
            {previewItem && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
                <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[85vh] flex flex-col">
                  <div className="flex items-start justify-between gap-4 mb-4 border-b border-brand-border-strong pb-4">
                    <div>
                      <span className="bg-purple-500/15 text-purple-400 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1.5 inline-block">
                        {previewItem.category}
                      </span>
                      <h3 className="font-display text-lg font-bold text-brand-text">{previewItem.title}</h3>
                      {previewItem.fileName && (
                        <p className="text-xs text-brand-text-muted flex items-center gap-1 mt-1">
                          <File className="w-3.5 h-3.5 text-brand-teal" /> {previewItem.fileName} 
                          {previewItem.fileSize ? ` (${formatBytes(previewItem.fileSize)})` : ''}
                        </p>
                      )}
                    </div>
                    <button 
                      onClick={() => setPreviewItem(null)}
                      className="p-1 text-brand-text-muted hover:text-brand-text rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto bg-brand-surface-2 border border-brand-border-strong rounded-xl p-4 text-xs font-mono text-brand-text whitespace-pre-wrap leading-relaxed">
                    {previewItem.content}
                  </div>

                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-brand-border-strong">
                    <span className="text-[11px] text-brand-text-muted">
                      Cadastrado em {previewItem.createdAt ? new Date(previewItem.createdAt).toLocaleDateString('pt-BR') : 'Recentemente'}
                    </span>
                    <div className="flex items-center gap-2">
                      {previewItem.fileUrl && (
                        <a 
                          href={previewItem.fileUrl} 
                          download={previewItem.fileName || 'documento.pdf'}
                          className="bg-brand-surface-2 border border-brand-border-strong text-brand-text font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 hover:bg-brand-border-strong transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" /> Baixar PDF Original
                        </a>
                      )}
                      <button 
                        onClick={() => setPreviewItem(null)}
                        className="bg-brand-teal text-brand-bg font-bold px-4 py-2 rounded-xl text-xs hover:bg-brand-teal/90 shadow-sm"
                      >
                        Fechar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: API Config */}
        {activeTab === 'api' && (
          <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-sm mb-1 text-brand-text">Chave da Google Gemini API</h3>
            <p className="text-xs text-brand-text-muted mb-6">
              A chave padrão é injetada automaticamente pelo servidor do AI Studio. Caso queira usar uma chave própria da sua clínica, insira abaixo.
            </p>

            <form onSubmit={handleSaveApiKey} className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-semibold text-brand-text-muted mb-1.5">
                  Gemini API Key (Google AI Studio)
                </label>
                <div className="relative">
                  <input 
                    type={showApiKey ? 'text' : 'password'}
                    placeholder="AIzaSy..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-border-strong rounded-xl pl-3.5 pr-20 py-2.5 text-xs text-brand-text focus:outline-none focus:border-brand-teal font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-brand-teal font-medium hover:underline"
                  >
                    {showApiKey ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  disabled={saving}
                  className="bg-brand-teal text-brand-bg font-bold px-5 py-2.5 rounded-xl text-xs hover:bg-brand-teal/90 shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar Chave no Supabase'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
