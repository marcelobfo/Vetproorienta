'use client';
/* eslint-disable @next/next/no-img-element */

import { useState, useRef, useEffect, Suspense } from 'react';
import { 
  Send, Bot, User, Loader2, BookOpen, ShieldCheck, 
  CheckCircle2, Sparkles, Database, ArrowRight, RefreshCw, Dog,
  History, AlertTriangle, AlertCircle, MessageSquare, ChevronRight, CornerDownLeft, Image as ImageIcon
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { FormattedText } from '@/lib/textFormatter';
import { 
  getSavedPets, savePetRecord, PetRecord, 
  getChatSessions, getChatSessionById, getLatestChatSessionForPet,
  saveChatSession, ChatSessionRecord
} from '@/lib/petService';

type Message = {
  id: string;
  role: 'user' | 'model';
  content: string;
  image?: string;
};

const DEFAULT_INITIAL_MESSAGE = `Olá! Sou o assistente de triagem e pré-diagnóstico do *VetPro Orienta*. 

Para realizarmos a triagem clínica e cadastrarmos o prontuário no sistema, por favor me informe:

* *Seu nome:*
* *Nome do pet:*
* *Espécie (cão ou gato):*
* *Raça:*
* *Sexo:*
* *Idade:*
* *Peso aproximado:*

E me conte o que está acontecendo com ele (sintomas, tempo de evolução e comportamento).`;

function generateUniqueId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function buildPetWelcomeMessage(pet: PetRecord): string {
  const tutor = pet.tutor_name ? `Olá, *${pet.tutor_name}*!` : 'Olá!';
  return `${tutor} 🐾 Sou o assistente de triagem do *VetPro Orienta*.

Já estou com a ficha cadastral do(a) *${pet.name}* aberta no sistema:
* *Espécie:* ${pet.species || 'Cão'}
* *Raça:* ${pet.breed || 'SRD'}
* *Sexo:* ${pet.sex || 'Não informado'}
* *Idade:* ${pet.age || 'Não informada'}
* *Peso:* ${pet.weight || 'Não informado'}${pet.symptoms ? `\n* *Últimos sintomas registrados:* ${pet.symptoms}` : ''}

Como posso ajudar você e o(a) *${pet.name}* hoje? Me conte o que você observou de diferente (comportamento, apetite, sintomas ou queixas).`;
}

function ChatContent() {
  const searchParams = useSearchParams();
  const petIdParam = searchParams.get('petId');
  const sessionIdParam = searchParams.get('sessionId');

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activePet, setActivePet] = useState<PetRecord | null>(null);
  const [previousSession, setPreviousSession] = useState<ChatSessionRecord | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'model', content: DEFAULT_INITIAL_MESSAGE }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [ragCount, setRagCount] = useState<number>(0);
  const [savedPetInfo, setSavedPetInfo] = useState<Partial<PetRecord> | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [newlyRegisteredPetNotification, setNewlyRegisteredPetNotification] = useState<string | null>(null);
  const [triageStatus, setTriageStatus] = useState<'verde' | 'amarelo' | 'vermelho'>('verde');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem é muito grande. O tamanho máximo permitido é 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  // Inicialização inteligente do Chat com base em petId ou sessionId
  useEffect(() => {
    async function initChat() {
      setIsInitializing(true);
      try {
        // 1. Carregar contagem RAG
        if (isSupabaseConfigured()) {
          const supabase = getSupabaseClient();
          const { count } = await supabase.from('knowledge_base').select('*', { count: 'exact', head: true });
          if (count !== null) setRagCount(count);
        } else {
          const savedKb = localStorage.getItem('vetpro_knowledge_base');
          if (savedKb) {
            const parsed = JSON.parse(savedKb);
            setRagCount(parsed.length);
          }
        }

        const allPets = await getSavedPets();

        // 2. Se foi passado um sessionId na URL -> Carregar a conversa exata
        if (sessionIdParam) {
          const existingSession = await getChatSessionById(sessionIdParam);
          if (existingSession && existingSession.messages.length > 0) {
            setSessionId(existingSession.id);
            setMessages(existingSession.messages.map(m => ({
              id: m.id,
              role: m.role,
              content: m.content
            })));
            if (existingSession.triage_level) {
              setTriageStatus(existingSession.triage_level);
            }

            // Buscar pet vinculado se existir
            if (existingSession.pet_id) {
              const matchedPet = allPets.find(p => p.id === existingSession.pet_id);
              if (matchedPet) {
                setActivePet(matchedPet);
                setSavedPetInfo(matchedPet);
              }
            } else if (existingSession.pet_name) {
              setSavedPetInfo({
                name: existingSession.pet_name,
                tutor_name: existingSession.tutor_name,
                species: existingSession.species,
                breed: existingSession.breed,
                sex: existingSession.sex,
                age: existingSession.age,
                weight: existingSession.weight
              });
            }
            setIsInitializing(false);
            return;
          }
        }

        // 3. Se foi passado um petId na URL (ex: clique no card do Pet)
        if (petIdParam) {
          const foundPet = allPets.find(p => p.id === petIdParam);
          if (foundPet) {
            setActivePet(foundPet);
            setSavedPetInfo(foundPet);

            // Verificar se já existe conversa recente para este pet
            const lastSession = await getLatestChatSessionForPet(foundPet.id);
            if (lastSession && lastSession.messages.length > 1) {
              setPreviousSession(lastSession);
              // Iniciar carregando a última conversa por padrão para continuar de onde parou
              setSessionId(lastSession.id);
              setMessages(lastSession.messages.map(m => ({
                id: m.id,
                role: m.role,
                content: m.content
              })));
              if (lastSession.triage_level) {
                setTriageStatus(lastSession.triage_level);
              }
            } else {
              // Iniciar nova triagem com a ficha do pet já injetada
              const newSessionId = generateUniqueId('session');
              setSessionId(newSessionId);
              setMessages([
                { id: generateUniqueId('msg'), role: 'model', content: buildPetWelcomeMessage(foundPet) }
              ]);
            }
            setIsInitializing(false);
            return;
          }
        }

        // 4. Fluxo padrão sem parâmetros
        const currentPetRaw = localStorage.getItem('vetpro_current_pet');
        if (currentPetRaw) {
          try {
            const parsed = JSON.parse(currentPetRaw);
            setSavedPetInfo(parsed);
          } catch {
            // Silencioso
          }
        }

        const newId = generateUniqueId('session');
        setSessionId(newId);
        setMessages([
          { id: generateUniqueId('msg'), role: 'model', content: DEFAULT_INITIAL_MESSAGE }
        ]);

      } catch (e) {
        console.error('Erro ao inicializar chat:', e);
      } finally {
        setIsInitializing(false);
      }
    }

    initChat();
  }, [petIdParam, sessionIdParam]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleStartFreshForPet = () => {
    if (!activePet) return;
    const newId = generateUniqueId('session');
    setSessionId(newId);
    setPreviousSession(null);
    setTriageStatus('verde');
    setMessages([
      { id: generateUniqueId('msg'), role: 'model', content: buildPetWelcomeMessage(activePet) }
    ]);
  };

  const handleResumePreviousSession = () => {
    if (!previousSession) return;
    setSessionId(previousSession.id);
    setMessages(previousSession.messages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content
    })));
    if (previousSession.triage_level) {
      setTriageStatus(previousSession.triage_level);
    }
  };

  const handleSend = async (e?: React.FormEvent, directMessage?: string) => {
    if (e) e.preventDefault();
    const textToSend = directMessage || input.trim();
    const imageToSend = selectedImage;
    if ((!textToSend && !imageToSend) || isLoading) return;

    const userMessage: Message = { 
      id: generateUniqueId('msg'), 
      role: 'user', 
      content: textToSend || 'Analise esta imagem em relação ao quadro clínico do pet.',
      image: imageToSend || undefined
    };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      // Obter documentos RAG para contexto
      let ragDocs: any[] = [];
      const customPrompt = localStorage.getItem('vetpro_ai_prompt') || undefined;

      if (isSupabaseConfigured()) {
        try {
          const supabase = getSupabaseClient();
          const { data, error } = await supabase.from('knowledge_base').select('*').limit(5);
          if (!error && data && data.length > 0) {
            ragDocs = data.map((d: any) => ({
              title: d.title || 'Protocolo Clínico',
              category: d.category || 'Geral',
              content: d.content || ''
            }));
          }
        } catch (e) {
          // Fallback para local
        }
      }

      if (ragDocs.length === 0) {
        const savedKb = localStorage.getItem('vetpro_knowledge_base');
        if (savedKb) ragDocs = JSON.parse(savedKb);
      }

      // Preparar contexto do pet para a IA (se já tiver um pet selecionado ou salvo)
      const currentPetContext = activePet || (savedPetInfo?.name ? savedPetInfo : null);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: updatedMessages,
          customPrompt,
          ragDocs,
          petContext: currentPetContext
        })
      });

      if (!response.ok) throw new Error('Falha na requisição');

      const data = await response.json();
      const modelMessage: Message = { id: generateUniqueId('msg'), role: 'model', content: data.text };
      const allNewMessages = [...updatedMessages, modelMessage];
      
      setMessages(allNewMessages);

      if (data.triageLevel) {
        setTriageStatus(data.triageLevel);
      }

      // Atualizar dados cadastrais do pet se novos foram extraídos ou cadastrados
      let resolvedPetInfo: PetRecord | Partial<PetRecord> | null = currentPetContext;
      if (data.extractedData) {
        const ext = data.extractedData;
        if (ext.petName || ext.tutorName) {
          if (ext.tutorName && typeof window !== 'undefined') {
            localStorage.setItem('vetpro_tutor_name', ext.tutorName);
          }

          const isDifferentPet = !!(
            ext.petName && 
            activePet?.name && 
            ext.petName.trim().toLowerCase() !== activePet.name.trim().toLowerCase()
          );

          const shouldCreateNewPet = data.isNewPet || isDifferentPet || !activePet?.id;

          const petRecordToSave: Partial<PetRecord> = {
            id: shouldCreateNewPet ? undefined : activePet?.id,
            name: ext.petName || savedPetInfo?.name || 'Pet em Triagem',
            tutor_name: ext.tutorName || savedPetInfo?.tutor_name || (typeof window !== 'undefined' ? localStorage.getItem('vetpro_tutor_name') : null) || 'Tutor',
            species: ext.species || savedPetInfo?.species || 'Cão',
            breed: ext.breed || savedPetInfo?.breed || 'SRD',
            sex: ext.sex || savedPetInfo?.sex || 'Não informado',
            age: ext.age || savedPetInfo?.age || 'Não informada',
            weight: ext.weight || savedPetInfo?.weight || 'Não informado',
            symptoms: textToSend
          };

          const saveResult = await savePetRecord(petRecordToSave);
          if (saveResult.success && saveResult.data) {
            resolvedPetInfo = saveResult.data;
            setActivePet(saveResult.data);
            setSavedPetInfo(saveResult.data);
            setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

            if (shouldCreateNewPet || isDifferentPet) {
              setNewlyRegisteredPetNotification(saveResult.data.name);
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('vetpro_pet_updated', { detail: saveResult.data }));
              }
            }
          }
        }
      }

      // PERSISTÊNCIA AUTOMÁTICA DA SESSÃO DE CHAT E HISTÓRICO
      const currentSessionId = sessionId || generateUniqueId('session');
      setSessionId(currentSessionId);

      await saveChatSession(
        {
          id: currentSessionId,
          pet_id: (resolvedPetInfo as any)?.id || activePet?.id,
          pet_name: resolvedPetInfo?.name || activePet?.name || 'Pet',
          tutor_name: resolvedPetInfo?.tutor_name || activePet?.tutor_name || 'Tutor',
          species: resolvedPetInfo?.species || activePet?.species || 'Cão',
          breed: resolvedPetInfo?.breed || activePet?.breed || 'SRD',
          sex: resolvedPetInfo?.sex || activePet?.sex || 'Não informado',
          age: resolvedPetInfo?.age || activePet?.age || 'Não informada',
          weight: resolvedPetInfo?.weight || activePet?.weight || 'Não informado',
          triage_level: data.triageLevel || triageStatus,
          summary: textToSend.length > 70 ? textToSend.substring(0, 67) + '...' : textToSend
        },
        allNewMessages
      );

    } catch (error) {
      console.error(error);
      setMessages(prev => [
        ...prev, 
        { id: generateUniqueId('msg'), role: 'model', content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Verifique a conexão e tente novamente.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setActivePet(null);
    setPreviousSession(null);
    const newId = generateUniqueId('session');
    setSessionId(newId);
    setTriageStatus('verde');
    setMessages([
      { id: generateUniqueId('msg'), role: 'model', content: DEFAULT_INITIAL_MESSAGE }
    ]);
    setSavedPetInfo(null);
    setLastSavedTime(null);
  };

  const quickSymptoms = [
    'Vômito ou diarreia recente',
    'Perda de apetite e apatia',
    'Coceira intensa e feridas na pele',
    'Mancando ou dor ao apoiar a pata',
    'Tosse frequente ou espirros'
  ];

  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-brand-bg text-brand-text-muted gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
        <p className="text-sm">Carregando prontuário e histórico de atendimento...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-brand-bg">
      {/* Header Superior */}
      <div className="h-[76px] px-6 lg:px-8 flex items-center justify-between border-b border-brand-border-strong bg-brand-surface/40 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-lg font-bold text-brand-text">Triagem IA e Pré-diagnóstico</h1>
            
            {triageStatus === 'vermelho' ? (
              <span className="bg-red-500/15 text-red-400 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Urgência Alta
              </span>
            ) : triageStatus === 'amarelo' ? (
              <span className="bg-amber-500/15 text-amber-400 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Atenção / Moderado
              </span>
            ) : (
              <span className="bg-brand-teal/15 text-brand-teal text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Protocolo Seguro
              </span>
            )}
          </div>
          <p className="text-xs text-brand-text-muted">Aviso: A IA fornece orientações preliminares. Casos graves exigem consulta presencial imediata.</p>
        </div>

        <div className="flex items-center gap-3">
          {ragCount > 0 && (
            <div className="hidden md:flex items-center gap-1.5 bg-brand-surface border border-brand-border-strong px-3 py-1.5 rounded-xl text-xs text-brand-text-muted">
              <BookOpen className="w-3.5 h-3.5 text-brand-teal" />
              <span>RAG: <strong className="text-brand-text">{ragCount}</strong> diretrizes</span>
            </div>
          )}

          <Link
            href="/dashboard/historico"
            className="flex items-center gap-1.5 text-xs text-brand-text-muted hover:text-brand-text bg-brand-surface border border-brand-border-strong hover:border-brand-teal/40 px-3 py-1.5 rounded-xl transition-all"
            title="Ver histórico de todas as triagens"
          >
            <History className="w-3.5 h-3.5 text-brand-teal" />
            <span className="hidden sm:inline">Histórico de Chats</span>
          </Link>

          <button
            onClick={handleResetChat}
            className="flex items-center gap-1.5 text-xs text-brand-text-muted hover:text-brand-text bg-brand-surface border border-brand-border-strong hover:border-brand-teal/40 px-3 py-1.5 rounded-xl transition-all"
            title="Iniciar atendimento em branco"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Novo Chat</span>
          </button>
        </div>
      </div>

      {/* Banner de Contexto de Pet Ativo (Injetado sem necessidade de redigitar dados) */}
      {activePet && (
        <div className="px-6 lg:px-8 py-2.5 bg-brand-surface-2/60 border-b border-brand-teal/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-7 h-7 rounded-xl bg-brand-teal/20 text-brand-teal flex items-center justify-center shrink-0 text-base">
              {activePet.species === 'Gato' ? '🐱' : '🐶'}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-brand-text text-sm">{activePet.name}</span>
              <span className="bg-brand-teal/20 text-brand-teal text-[10px] font-bold px-2 py-0.5 rounded-md">
                Prontuário Ativo
              </span>
              <span className="text-brand-text-muted font-medium">
                {activePet.species} • {activePet.breed || 'SRD'} • {activePet.sex || 'Sexo n/i'} • {activePet.age || 'Idade n/i'} • {activePet.weight || 'Peso n/i'}
              </span>
              {activePet.tutor_name && (
                <span className="text-brand-teal font-semibold">
                  (Tutor: {activePet.tutor_name})
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {previousSession && (
              <button
                onClick={handleStartFreshForPet}
                className="text-[11px] font-bold text-brand-text-muted hover:text-brand-text bg-brand-surface px-2.5 py-1 rounded-lg border border-brand-border-strong hover:border-brand-teal/40 transition-colors"
                title="Limpar mensagens e começar nova queixa para este mesmo pet"
              >
                + Nova Queixa para {activePet.name}
              </button>
            )}

            <Link
              href="/dashboard/pets"
              className="text-[11px] font-bold text-brand-teal hover:underline flex items-center gap-1"
            >
              Ver Ficha Completa
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Notificação especial quando um novo pet for cadastrado pelo agente */}
      {newlyRegisteredPetNotification && (
        <div className="px-6 lg:px-8 py-3 bg-emerald-500/10 border-b border-emerald-500/30 flex items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-emerald-800 dark:text-emerald-300 text-sm">
                🐾 Ficha de <span className="underline">{newlyRegisteredPetNotification}</span> cadastrada com sucesso!
              </p>
              <p className="text-emerald-700/80 dark:text-emerald-400/80 text-[11px]">
                O prontuário foi criado no sistema e vinculado automaticamente ao histórico desta consulta.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/pets"
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Dog className="w-3.5 h-3.5" />
              Ver em Meus Pets
              <ArrowRight className="w-3 h-3" />
            </Link>
            <button
              onClick={() => setNewlyRegisteredPetNotification(null)}
              className="p-1 rounded-md text-emerald-600 hover:bg-emerald-500/20 transition-colors"
              title="Fechar"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Banner / Card de Dados Extraídos e Salvos no Banco (quando gerado via chat geral) */}
      {!activePet && savedPetInfo && savedPetInfo.name && (
        <div className="px-6 lg:px-8 py-2.5 bg-brand-teal/10 border-b border-brand-teal/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-full bg-brand-teal/20 text-brand-teal flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
              <span className="font-bold text-brand-text flex items-center gap-1">
                <Database className="w-3 h-3 text-brand-teal" />
                Dados Identificados:
              </span>
              <span className="text-brand-text font-semibold">{savedPetInfo.name}</span>
              <span className="text-brand-text-muted">•</span>
              <span className="text-brand-text-muted">{savedPetInfo.species || 'Cão'}</span>
              {savedPetInfo.breed && <span className="text-brand-text-muted">• {savedPetInfo.breed}</span>}
              {savedPetInfo.tutor_name && <span className="text-brand-teal font-medium">• Tutor: {savedPetInfo.tutor_name}</span>}
            </div>
          </div>

          <Link
            href="/dashboard/pets"
            className="flex items-center gap-1 text-brand-teal hover:underline font-bold text-xs shrink-0 self-end md:self-auto"
          >
            <Dog className="w-3.5 h-3.5" />
            Ver na Lista de Pets
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Área de Mensagens */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 max-w-3xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-brand-surface-2' : 'bg-brand-teal/20 text-brand-teal'}`}>
              {msg.role === 'user' ? <User className="w-4 h-4 text-brand-text-muted" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={`px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed ${msg.role === 'user' ? 'bg-brand-surface-2 border border-brand-border-strong text-brand-text' : 'bg-brand-surface border border-brand-border-strong text-brand-text shadow-sm'}`}>
              {msg.image && (
                <div className="mb-3">
                  <img src={msg.image} alt="Foto anexada pelo tutor" className="max-w-xs max-h-60 rounded-xl object-cover border border-brand-border-strong shadow-sm" />
                </div>
              )}
              <FormattedText text={msg.content} />
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-4 max-w-3xl">
            <div className="w-8 h-8 rounded-full bg-brand-teal/20 text-brand-teal flex items-center justify-center shrink-0">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div className="px-5 py-3.5 rounded-2xl bg-brand-surface border border-brand-border-strong text-brand-text-muted text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-teal animate-pulse" />
              <span>Analisando quadro clínico e imagem...</span>
            </div>
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      {/* Sugestões Rápidas (Chips) se houver pet selecionado e poucas mensagens */}
      {activePet && messages.length <= 3 && !isLoading && (
        <div className="px-6 lg:px-8 py-2 bg-brand-surface/30 border-t border-brand-border-strong/50 overflow-x-auto flex items-center gap-2">
          <span className="text-[11px] font-bold text-brand-text-muted shrink-0">Sugestões rápidas:</span>
          {quickSymptoms.map((symptom, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(undefined, symptom)}
              className="bg-brand-surface border border-brand-border-strong hover:border-brand-teal/50 hover:bg-brand-teal/10 text-brand-text text-xs px-3 py-1.5 rounded-full shrink-0 transition-all font-medium"
            >
              {symptom}
            </button>
          ))}
        </div>
      )}

      {/* Input de Mensagem */}
      <div className="p-6 bg-brand-surface/50 border-t border-brand-border-strong">
        {selectedImage && (
          <div className="max-w-4xl mx-auto mb-3 flex items-center gap-3 p-2.5 bg-brand-surface border border-brand-border-strong rounded-xl w-fit shadow-sm">
            <img src={selectedImage} alt="Preview" className="w-12 h-12 object-cover rounded-lg border border-brand-border-strong" />
            <div className="text-xs">
              <p className="font-bold text-brand-text">Foto anexada para análise</p>
              <p className="text-brand-text-muted">A IA vai avaliar esta imagem junto com a mensagem</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="ml-3 w-6 h-6 rounded-full bg-brand-surface-2 hover:bg-red-500/20 text-brand-text-muted hover:text-red-400 flex items-center justify-center text-xs transition-colors"
              title="Remover imagem"
            >
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleSend} className="max-w-4xl mx-auto relative flex items-center gap-2">
          <input 
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-12 h-12 rounded-full bg-brand-surface border border-brand-border-strong hover:border-brand-teal text-brand-text-muted hover:text-brand-teal flex items-center justify-center shrink-0 transition-colors shadow-sm"
            title="Enviar foto ou exame para análise da IA"
            disabled={isLoading}
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          <div className="relative flex-1">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                activePet 
                  ? `Descreva os sintomas ou envie foto/exame do(a) ${activePet.name}...` 
                  : "Descreva os sintomas ou envie uma foto para análise..."
              }
              disabled={isLoading}
              className="w-full bg-brand-bg border border-brand-border-strong rounded-full pl-5 pr-14 py-3.5 focus:outline-none focus:border-brand-teal transition-colors disabled:opacity-50 text-[15px]"
            />
            <button 
              type="submit" 
              disabled={(!input.trim() && !selectedImage) || isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-brand-teal text-brand-bg flex items-center justify-center hover:bg-brand-teal/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              title="Enviar mensagem"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full bg-brand-bg">
        <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}
