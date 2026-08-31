'use client';

import { useState, useEffect } from 'react';
import { 
  History, Search, MessageSquare, Calendar, Sparkles, 
  Trash2, ArrowRight, Dog, AlertCircle, AlertTriangle, ShieldCheck,
  Loader2, RefreshCw, X, User
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getChatSessions, deleteChatSession, ChatSessionRecord } from '@/lib/petService';

export default function HistoricoPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState<'all' | 'Cão' | 'Gato'>('all');
  const [selectedTriage, setSelectedTriage] = useState<'all' | 'verde' | 'amarelo' | 'vermelho'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchSessions() {
      try {
        const data = await getChatSessions();
        if (isMounted) {
          setSessions(data);
          setLoading(false);
        }
      } catch (e) {
        console.error('Erro ao carregar histórico:', e);
        if (isMounted) setLoading(false);
      }
    }
    fetchSessions();
    return () => { isMounted = false; };
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const data = await getChatSessions();
      setSessions(data);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Deseja realmente excluir esta sessão do histórico?')) return;

    const ok = await deleteChatSession(sessionId);
    if (ok) {
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      showToast('Sessão de triagem excluída com sucesso.');
    }
  };

  const filteredSessions = sessions.filter(session => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch = !term ||
      (session.pet_name && session.pet_name.toLowerCase().includes(term)) ||
      (session.tutor_name && session.tutor_name.toLowerCase().includes(term)) ||
      (session.summary && session.summary.toLowerCase().includes(term)) ||
      (session.breed && session.breed.toLowerCase().includes(term));

    const matchesSpecies = selectedSpecies === 'all' || session.species === selectedSpecies;
    const matchesTriage = selectedTriage === 'all' || session.triage_level === selectedTriage;

    return matchesSearch && matchesSpecies && matchesTriage;
  });

  return (
    <div className="p-6 lg:p-8 h-full overflow-y-auto bg-brand-bg">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-brand-surface border border-brand-teal text-brand-text px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2">
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-brand-teal/15 text-brand-teal flex items-center justify-center">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold text-brand-text">Histórico de Triagens & Conversas</h1>
                <p className="text-brand-text-muted text-sm mt-0.5">
                  Acesse interações anteriores, retome conversas ou inicie novos atendimentos sem precisar redigitar dados do pet.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className="p-2.5 bg-brand-surface border border-brand-border-strong hover:border-brand-teal/40 text-brand-text-muted hover:text-brand-text rounded-xl transition-all"
              title="Recarregar histórico"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <Link
              href="/dashboard/chat"
              className="bg-brand-teal text-brand-bg font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 hover:bg-brand-teal/90 shadow-md transition-all"
            >
              <Sparkles className="w-4 h-4" />
              Nova Triagem IA
            </Link>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-4 mb-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome do pet, tutor, raça ou resumo da queixa..."
              className="w-full bg-brand-bg border border-brand-border-strong rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-brand-teal transition-colors"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-text-muted hover:text-brand-text">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-brand-border-strong/50">
            {/* Espécie */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-xs text-brand-text-muted font-semibold mr-1">Espécie:</span>
              <button
                onClick={() => setSelectedSpecies('all')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedSpecies === 'all' 
                    ? 'bg-brand-teal text-brand-bg' 
                    : 'bg-brand-surface-2 text-brand-text-muted hover:text-brand-text'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setSelectedSpecies('Cão')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedSpecies === 'Cão' 
                    ? 'bg-brand-teal text-brand-bg' 
                    : 'bg-brand-surface-2 text-brand-text-muted hover:text-brand-text'
                }`}
              >
                🐶 Cães
              </button>
              <button
                onClick={() => setSelectedSpecies('Gato')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedSpecies === 'Gato' 
                    ? 'bg-brand-teal text-brand-bg' 
                    : 'bg-brand-surface-2 text-brand-text-muted hover:text-brand-text'
                }`}
              >
                🐱 Gatos
              </button>
            </div>

            {/* Nível de Triagem */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-xs text-brand-text-muted font-semibold mr-1">Gravidade:</span>
              <button
                onClick={() => setSelectedTriage('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedTriage === 'all' 
                    ? 'bg-brand-surface border border-brand-teal text-brand-teal' 
                    : 'bg-brand-surface-2 text-brand-text-muted hover:text-brand-text'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setSelectedTriage('verde')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedTriage === 'verde' 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                    : 'bg-brand-surface-2 text-brand-text-muted hover:text-brand-text'
                }`}
              >
                🟢 Baixa
              </button>
              <button
                onClick={() => setSelectedTriage('amarelo')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedTriage === 'amarelo' 
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' 
                    : 'bg-brand-surface-2 text-brand-text-muted hover:text-brand-text'
                }`}
              >
                🟡 Atenção
              </button>
              <button
                onClick={() => setSelectedTriage('vermelho')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedTriage === 'vermelho' 
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40' 
                    : 'bg-brand-surface-2 text-brand-text-muted hover:text-brand-text'
                }`}
              >
                🔴 Urgente
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Sessões */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-brand-text-muted">
            <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
            <p className="text-sm">Carregando histórico de conversas...</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-12 text-center max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-full bg-brand-surface-2 flex items-center justify-center mx-auto mb-4 text-3xl">
              💬
            </div>
            <h3 className="font-display font-bold text-lg text-brand-text mb-1">Nenhuma conversa registrada</h3>
            <p className="text-sm text-brand-text-muted mb-6">
              {searchTerm 
                ? 'Nenhuma conversa corresponde aos filtros selecionados.' 
                : 'Inicie uma triagem com a IA para que os registros e prontuários fiquem salvos aqui para consulta futura.'}
            </p>
            <Link
              href="/dashboard/chat"
              className="inline-flex items-center gap-2 bg-brand-teal text-brand-bg font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-brand-teal/90 transition-all shadow-md"
            >
              <Sparkles className="w-4 h-4" />
              Iniciar Primeira Triagem
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSessions.map((session) => {
              const msgCount = session.messages ? session.messages.length : 0;
              const dateFormatted = new Date(session.updated_at || session.created_at).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div 
                  key={session.id}
                  onClick={() => router.push(`/dashboard/chat?sessionId=${session.id}`)}
                  className="bg-brand-surface border border-brand-border-strong rounded-2xl p-5 hover:border-brand-teal/50 transition-all cursor-pointer group shadow-sm hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 rounded-2xl bg-brand-surface-2 border border-brand-border-strong flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform">
                      {session.species === 'Gato' ? '🐱' : '🐶'}
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display font-bold text-base text-brand-text group-hover:text-brand-teal transition-colors">
                          {session.pet_name || 'Pet sem nome'}
                        </h3>

                        {session.species && (
                          <span className="text-xs text-brand-text-muted">
                            • {session.species} ({session.breed || 'SRD'})
                          </span>
                        )}

                        {session.triage_level === 'vermelho' ? (
                          <span className="bg-red-500/15 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Urgência Alta
                          </span>
                        ) : session.triage_level === 'amarelo' ? (
                          <span className="bg-amber-500/15 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Atenção / Moderado
                          </span>
                        ) : (
                          <span className="bg-emerald-500/15 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Baixa Gravidade
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-brand-text-muted line-clamp-2">
                        &ldquo;{session.summary || 'Atendimento de triagem e pré-diagnóstico clínico.'}&rdquo;
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-brand-text-muted pt-1">
                        {session.tutor_name && (
                          <span className="flex items-center gap-1 text-brand-teal font-medium">
                            <User className="w-3 h-3" />
                            Tutor: {session.tutor_name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {dateFormatted}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {msgCount} {msgCount === 1 ? 'mensagem' : 'mensagens'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ações Rápidas */}
                  <div className="flex items-center gap-2.5 self-end md:self-center shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-brand-border-strong/40 w-full md:w-auto justify-end">
                    <button
                      onClick={(e) => handleDelete(session.id, e)}
                      className="p-2 rounded-xl text-brand-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Excluir esta conversa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {session.pet_id && (
                      <Link
                        href={`/dashboard/chat?petId=${session.pet_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-brand-surface-2 hover:bg-brand-surface border border-brand-border-strong text-brand-text text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors"
                        title="Iniciar nova queixa com a ficha deste mesmo pet"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-brand-teal" />
                        Nova Triagem
                      </Link>
                    )}

                    <button
                      onClick={() => router.push(`/dashboard/chat?sessionId=${session.id}`)}
                      className="bg-brand-teal text-brand-bg font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 hover:bg-brand-teal/90 transition-all shadow-sm"
                    >
                      <span>Continuar Conversa</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
