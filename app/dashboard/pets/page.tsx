'use client';
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from 'react';
import { 
  Dog, Cat, Plus, Trash2, Edit2, Calendar, 
  User, Weight, ShieldCheck, Heart, Sparkles, 
  MessageSquare, Loader2, Search, X, CheckCircle2, 
  AlertCircle, Phone, Syringe, Send, Check
} from 'lucide-react';
import Link from 'next/link';
import { 
  getSavedPets, savePetRecord, deletePetRecord, PetRecord, 
  getPetVaccines, PetVaccineRecord, getOrphanPetsFromHistory, restorePetFromHistory 
} from '@/lib/petService';
import { VaccinationCardModal } from '@/components/VaccinationCardModal';
import { SecurityDeleteModal } from '@/components/SecurityDeleteModal';
import { History, ArrowRight } from 'lucide-react';

export default function PetsPage() {
  const [pets, setPets] = useState<PetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState<'all' | 'Cão' | 'Gato'>('all');
  
  // Orphan Pets Recovery (Pets in chat history not yet in pets table)
  const [orphanPets, setOrphanPets] = useState<Array<{
    suggestedPet: Partial<PetRecord>;
    sessionCount: number;
    latestSessionId: string;
    latestTriageAt: string;
  }>>([]);
  const [restoringPet, setRestoringPet] = useState<string | null>(null);

  // Caderneta de Vacinação Modal State
  const [vaccineModalPet, setVaccineModalPet] = useState<PetRecord | null>(null);

  // Modal Cadastro / Edição Pet State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPet, setEditingPet] = useState<PetRecord | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    tutor_name: '',
    tutor_phone: '',
    species: 'Cão',
    breed: '',
    sex: 'Macho',
    age: '',
    weight: '',
    notes: '',
    image_url: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal Exclusão Segura
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    petId: string;
    petName: string;
  }>({
    isOpen: false,
    petId: '',
    petName: '',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadPets = async () => {
    try {
      const data = await getSavedPets();
      setPets(data);
      const orphans = await getOrphanPetsFromHistory();
      setOrphanPets(orphans);
    } catch (e) {
      console.error('Erro ao carregar pets:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    Promise.all([getSavedPets(), getOrphanPetsFromHistory()]).then(([data, orphans]) => {
      if (isMounted) {
        setPets(data);
        setOrphanPets(orphans);
        setLoading(false);
      }
    }).catch(() => {
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRestoreOrphanPet = async (suggestedPet: Partial<PetRecord>, sessionId?: string) => {
    const petName = suggestedPet.name || 'Pet';
    setRestoringPet(petName);
    try {
      const res = await restorePetFromHistory(suggestedPet, sessionId);
      if (res.success) {
        showToast(`Pet "${petName}" recuperado e vinculado com sucesso!`);
        await loadPets();
      } else {
        showToast(res.error || `Erro ao recuperar ${petName}`);
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao recuperar pet.');
    } finally {
      setRestoringPet(null);
    }
  };

  const handleOpenAddModal = () => {
    const savedTutorName = typeof window !== 'undefined' ? localStorage.getItem('vetpro_tutor_name') || '' : '';
    const savedTutorPhone = typeof window !== 'undefined' ? localStorage.getItem('vetpro_tutor_phone') || '' : '';
    setEditingPet(null);
    setFormData({
      name: '',
      tutor_name: savedTutorName,
      tutor_phone: savedTutorPhone,
      species: 'Cão',
      breed: '',
      sex: 'Macho',
      age: '',
      weight: '',
      notes: '',
    image_url: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (pet: PetRecord) => {
    setEditingPet(pet);
    setFormData({
      name: pet.name,
      tutor_name: pet.tutor_name || '',
      tutor_phone: pet.tutor_phone || '',
      species: pet.species || 'Cão',
      breed: pet.breed || '',
      sex: pet.sex || 'Macho',
      age: pet.age || '',
      weight: pet.weight || '',
      notes: pet.notes || '',
      image_url: pet.image_url || '',
    });
    setIsModalOpen(true);
  };

  const handleSavePet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSaving(true);
    try {
      const result = await savePetRecord({
        ...(editingPet ? { id: editingPet.id } : {}),
        name: formData.name.trim(),
        tutor_name: formData.tutor_name.trim() || 'Tutor',
        tutor_phone: formData.tutor_phone.trim(),
        species: formData.species,
        breed: formData.breed.trim() || 'SRD',
        sex: formData.sex,
        age: formData.age.trim() || 'Não informada',
        weight: formData.weight.trim() || 'Não informado',
        notes: formData.notes.trim(),
        image_url: formData.image_url.trim()
      });

      if (result.success) {
        showToast(editingPet ? 'Pet atualizado com sucesso no banco de dados!' : 'Pet cadastrado com sucesso no banco de dados!');
        setIsModalOpen(false);
        if (result.data) {
          setPets(prev => {
            const idx = prev.findIndex(p => p.id === result.data!.id);
            if (idx >= 0) {
              const clone = [...prev];
              clone[idx] = result.data!;
              return clone;
            }
            return [result.data!, ...prev];
          });
        }
        await loadPets();
      } else {
        alert(result.error || 'Erro ao salvar pet.');
      }
    } catch (err: any) {
      alert(err.message || 'Erro inesperado');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteModalState({
      isOpen: true,
      petId: id,
      petName: name
    });
  };

  const handleConfirmDeletePet = async () => {
    if (!deleteModalState.petId) return;
    const ok = await deletePetRecord(deleteModalState.petId, deleteModalState.petName);
    if (ok) {
      showToast(`${deleteModalState.petName} removido com sucesso.`);
      await loadPets();
    } else {
      showToast('Erro ao remover pet do banco de dados.');
    }
  };

  const filteredPets = pets.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.tutor_name && p.tutor_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.tutor_phone && p.tutor_phone.includes(searchTerm)) ||
      (p.breed && p.breed.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesSpecies = selectedSpecies === 'all' || p.species === selectedSpecies;

    return matchesSearch && matchesSpecies;
  });

  return (
    <div className="p-6 lg:p-8 h-full overflow-y-auto bg-brand-bg">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-brand-surface border border-brand-teal text-brand-text px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-5 h-5 text-brand-teal shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-brand-text">Meus Pets & Cadernetas de Vacinação</h1>
              <span className="bg-brand-teal/15 text-brand-teal text-xs font-bold px-2.5 py-0.5 rounded-full">
                {pets.length} {pets.length === 1 ? 'pet cadastrado' : 'pets cadastrados'}
              </span>
            </div>
            <p className="text-brand-text-muted text-sm mt-1">
              Cadernetas digitais individuais com histórico de imunização e disparos de lembretes automáticos via WhatsApp (Evolution API).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/chat"
              className="bg-brand-surface border border-brand-border-strong hover:border-brand-teal/40 text-brand-text font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-all shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-brand-teal" />
              Nova Triagem IA
            </Link>

            <button 
              onClick={handleOpenAddModal}
              className="bg-brand-teal text-brand-bg font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 hover:bg-brand-teal/90 shadow-md transition-all"
            >
              <Plus className="w-4 h-4" /> 
              Cadastrar Pet
            </button>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome do pet, tutor, telefone ou raça..."
              className="w-full bg-brand-surface border border-brand-border-strong rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-brand-teal transition-colors"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-text-muted hover:text-brand-text">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedSpecies('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedSpecies === 'all' 
                  ? 'bg-brand-teal text-brand-bg' 
                  : 'bg-brand-surface border border-brand-border-strong text-brand-text-muted hover:text-brand-text'
              }`}
            >
              Todos ({pets.length})
            </button>
            <button
              onClick={() => setSelectedSpecies('Cão')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                selectedSpecies === 'Cão' 
                  ? 'bg-brand-teal text-brand-bg' 
                  : 'bg-brand-surface border border-brand-border-strong text-brand-text-muted hover:text-brand-text'
              }`}
            >
              🐶 Cães ({pets.filter(p => p.species === 'Cão').length})
            </button>
            <button
              onClick={() => setSelectedSpecies('Gato')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                selectedSpecies === 'Gato' 
                  ? 'bg-brand-teal text-brand-bg' 
                  : 'bg-brand-surface border border-brand-border-strong text-brand-text-muted hover:text-brand-text'
              }`}
            >
              🐱 Gatos ({pets.filter(p => p.species === 'Gato').length})
            </button>
          </div>
        </div>

        {/* Banner de Recuperação Inteligente de Pets do Histórico (Ex: Cão Pepa) */}
        {orphanPets.length > 0 && (
          <div className="mb-6 bg-gradient-to-r from-amber-500/10 via-brand-surface to-brand-surface border border-amber-500/30 rounded-2xl p-5 shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-brand-text">
                      {orphanPets.length === 1 ? 'Pet Identificado no Histórico de Consultas' : 'Pets Identificados no Histórico de Consultas'}
                    </h3>
                    <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Recuperação Disponível
                    </span>
                  </div>
                  <p className="text-xs text-brand-text-muted mt-1 leading-relaxed">
                    Identificamos atendimentos e triagens anteriores realizadas para pets que ainda não possuem cadastro oficial em &quot;Meus Pets&quot;.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {orphanPets.map((orphan) => {
                  const petName = orphan.suggestedPet.name || 'Pet';
                  return (
                    <div 
                      key={orphan.latestSessionId || petName}
                      className="flex items-center gap-2 bg-brand-surface-2 border border-brand-border-strong px-3 py-2 rounded-xl"
                    >
                      <div className="text-xs">
                        <span className="font-bold text-brand-text">🐾 {petName}</span>
                        <span className="text-[10px] text-brand-text-muted ml-1.5 font-mono">
                          ({orphan.sessionCount} {orphan.sessionCount === 1 ? 'atendimento' : 'atendimentos'})
                        </span>
                      </div>
                      <button
                        onClick={() => handleRestoreOrphanPet(orphan.suggestedPet, orphan.latestSessionId)}
                        disabled={restoringPet === petName}
                        className="bg-brand-teal text-brand-bg text-xs font-bold px-3 py-1 rounded-lg hover:bg-brand-teal/90 transition-all flex items-center gap-1 disabled:opacity-50"
                      >
                        {restoringPet === petName ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                        <span>Vincular aos Meus Pets</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Grid de Pets */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-brand-text-muted">
            <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
            <p className="text-sm">Carregando pets do banco de dados...</p>
          </div>
        ) : filteredPets.length === 0 ? (
          <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-12 text-center max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-full bg-brand-surface-2 flex items-center justify-center mx-auto mb-4 text-3xl">
              🐾
            </div>
            <h3 className="font-display font-bold text-lg text-brand-text mb-1">Nenhum pet encontrado</h3>
            <p className="text-sm text-brand-text-muted mb-6">
              {searchTerm 
                ? 'Nenhum resultado corresponde à sua pesquisa.' 
                : 'Cadastre um pet manualmente ou responda às perguntas no chat de triagem para gerar a caderneta de vacinas e prontuário automaticamente.'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button 
                onClick={handleOpenAddModal}
                className="bg-brand-teal text-brand-bg font-bold px-4 py-2 rounded-xl text-sm hover:bg-brand-teal/90 transition-all"
              >
                Cadastrar Pet
              </button>
              <Link
                href="/dashboard/chat"
                className="bg-brand-surface-2 border border-brand-border-strong text-brand-text font-semibold px-4 py-2 rounded-xl text-sm hover:border-brand-teal/40 transition-all"
              >
                Ir para Triagem IA
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPets.map((pet) => (
              <div 
                key={pet.id} 
                className="bg-brand-surface border border-brand-border-strong rounded-2xl p-5 flex flex-col justify-between hover:border-brand-teal/40 transition-all group shadow-sm hover:shadow-md"
              >
                <div>
                  {/* Topo do Card */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-brand-surface-2 border border-brand-border-strong flex items-center justify-center text-2xl group-hover:scale-105 transition-transform overflow-hidden shrink-0">
                        {pet.image_url ? (
                          <img src={pet.image_url} alt={pet.name} className="w-full h-full object-cover" />
                        ) : (
                          pet.species === 'Gato' ? '🐱' : '🐶'
                        )}
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-lg text-brand-text">{pet.name}</h3>
                        <p className="text-xs text-brand-text-muted font-medium">
                          {pet.species} • {pet.breed || 'SRD'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleOpenEditModal(pet)}
                        className="p-1.5 rounded-lg hover:bg-brand-surface-2 text-brand-text-muted hover:text-brand-text transition-colors"
                        title="Editar pet"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(pet.id, pet.name)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-brand-text-muted hover:text-red-400 transition-colors"
                        title="Excluir pet"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Informações Estruturadas */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-brand-surface-2/40 p-3 rounded-xl border border-brand-border-strong/50 mb-3">
                    <div>
                      <span className="text-brand-text-muted block text-[11px]">Sexo:</span>
                      <span className="font-semibold text-brand-text">{pet.sex || 'Não informado'}</span>
                    </div>
                    <div>
                      <span className="text-brand-text-muted block text-[11px]">Idade:</span>
                      <span className="font-semibold text-brand-text">{pet.age || 'Não informada'}</span>
                    </div>
                    <div>
                      <span className="text-brand-text-muted block text-[11px]">Peso:</span>
                      <span className="font-semibold text-brand-text">{pet.weight || 'Não informado'}</span>
                    </div>
                    <div>
                      <span className="text-brand-text-muted block text-[11px]">Tutor:</span>
                      <span className="font-semibold text-brand-teal truncate block">{pet.tutor_name || 'Tutor'}</span>
                    </div>
                    {pet.tutor_phone && (
                      <div className="col-span-2 pt-1 border-t border-brand-border-strong/30 flex items-center justify-between text-[11px]">
                        <span className="text-brand-text-muted">WhatsApp Lembrete:</span>
                        <span className="font-mono text-brand-text font-semibold">{pet.tutor_phone}</span>
                      </div>
                    )}
                  </div>

                  {/* DESTAQUE: Botão da Caderneta de Vacinação Digital */}
                  <div className="mb-3">
                    <button
                      onClick={() => setVaccineModalPet(pet)}
                      className="w-full bg-brand-teal/10 hover:bg-brand-teal/20 border border-brand-teal/30 hover:border-brand-teal text-brand-text text-xs font-bold py-2.5 px-3.5 rounded-xl flex items-center justify-between transition-all group/vac"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-brand-teal/20 text-brand-teal flex items-center justify-center">
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-brand-text group-hover/vac:text-brand-teal transition-colors">
                          Caderneta de Vacinação Digital
                        </span>
                      </div>
                      <span className="text-[10px] bg-brand-teal text-brand-bg px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                        <Syringe className="w-3 h-3" /> Ver / Vacinar
                      </span>
                    </button>
                  </div>

                  {pet.symptoms && (
                    <div className="text-xs text-brand-text-muted bg-brand-bg/50 p-2.5 rounded-lg border border-brand-border-strong mb-2 line-clamp-2">
                      <span className="font-bold text-brand-text">Últimos sintomas: </span>
                      {pet.symptoms}
                    </div>
                  )}
                </div>

                {/* Rodapé do Card com Ações */}
                <div className="pt-3 border-t border-brand-border-strong flex items-center justify-between gap-2 mt-1">
                  <span className="text-[11px] text-brand-text-muted flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {pet.last_triage_at ? new Date(pet.last_triage_at).toLocaleDateString('pt-BR') : 'Sem triagem'}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setVaccineModalPet(pet)}
                      className="text-xs font-bold text-brand-teal hover:text-brand-teal/80 flex items-center gap-1"
                      title="Abrir caderneta de vacinas e lembretes"
                    >
                      <Send className="w-3 h-3" />
                      Lembretes
                    </button>

                    <span className="text-brand-border-strong">•</span>

                    <Link
                      href={`/dashboard/chat?petId=${pet.id}`}
                      className="text-xs font-bold text-brand-text hover:text-brand-teal flex items-center gap-1 bg-brand-surface-2/60 hover:bg-brand-teal/15 px-2.5 py-1 rounded-lg transition-colors"
                      title={`Abrir triagem inteligente com a ficha de ${pet.name}`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-brand-teal" />
                      Triagem IA
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Exclusão Segura com Auditoria */}
      <SecurityDeleteModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmDeletePet}
        itemName={deleteModalState.petName}
        itemType="Pet"
        impactWarnings={[
          'A caderneta de vacinas deste pet e o histórico de doses serão apagados.',
          'Os prontuários e receitas vinculados a este pet perderão a associação.',
          'Esta ação será registrada no log de auditoria do sistema.'
        ]}
      />

      {/* Modal de Caderneta de Vacinação Digital do Pet */}
      {vaccineModalPet && (
        <VaccinationCardModal
          pet={vaccineModalPet}
          isOpen={!!vaccineModalPet}
          onClose={() => setVaccineModalPet(null)}
          onPetUpdated={loadPets}
        />
      )}

      {/* Modal de Adicionar/Editar Pet */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-brand-surface border border-brand-border-strong rounded-3xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-brand-teal/15 text-brand-teal flex items-center justify-center">
                  <Dog className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-brand-text">
                    {editingPet ? 'Editar Cadastro do Pet' : 'Cadastrar Novo Pet'}
                  </h3>
                  <p className="text-xs text-brand-text-muted">Preencha as informações para salvar no banco de dados.</p>
                </div>
              </div>

              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-brand-text-muted hover:text-brand-text p-1.5 rounded-lg hover:bg-brand-surface-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePet} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-brand-text-muted mb-1">* Nome do Pet *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Thor, Bidu, Mia"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-brand-teal"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-text-muted mb-1">* Seu Nome (Tutor) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Silva"
                    value={formData.tutor_name}
                    onChange={(e) => setFormData({ ...formData, tutor_name: e.target.value })}
                    className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-brand-teal"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text-muted mb-1">WhatsApp do Tutor (para lembretes de vacinas)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted" />
                  <input
                    type="text"
                    placeholder="Ex: 5511999998888"
                    value={formData.tutor_phone}
                    onChange={(e) => setFormData({ ...formData, tutor_phone: e.target.value })}
                    className="w-full bg-brand-bg border border-brand-border-strong rounded-xl pl-9 pr-3.5 py-2 text-sm focus:outline-none focus:border-brand-teal font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-brand-text-muted mb-1">* Espécie *</label>
                  <select
                    value={formData.species}
                    onChange={(e) => setFormData({ ...formData, species: e.target.value })}
                    className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-teal"
                  >
                    <option value="Cão">🐶 Cão</option>
                    <option value="Gato">🐱 Gato</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-text-muted mb-1">* Raça *</label>
                  <input
                    type="text"
                    placeholder="Ex: Golden, SRD"
                    value={formData.breed}
                    onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                    className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-brand-teal"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-text-muted mb-1">* Sexo *</label>
                  <select
                    value={formData.sex}
                    onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                    className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-teal"
                  >
                    <option value="Macho">Macho</option>
                    <option value="Fêmea">Fêmea</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-brand-text-muted mb-1">* Idade *</label>
                  <input
                    type="text"
                    placeholder="Ex: 3 anos, 6 meses"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-brand-teal"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-text-muted mb-1">* Peso Aproximado *</label>
                  <input
                    type="text"
                    placeholder="Ex: 12.5 kg, 4 kg"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-brand-teal"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text-muted mb-1">Foto de Perfil do Pet (Opcional)</label>
                <div className="flex items-center gap-3">
                  {formData.image_url && (
                    <img src={formData.image_url} alt="Preview" className="w-12 h-12 rounded-xl object-cover border border-brand-border-strong shrink-0" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          setFormData({ ...formData, image_url: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full text-xs text-brand-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand-surface-2 file:text-brand-teal hover:file:bg-brand-teal/15 cursor-pointer bg-brand-bg border border-brand-border-strong rounded-xl"
                  />
                  {formData.image_url && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, image_url: '' })}
                      className="text-xs text-red-400 hover:text-red-500 font-bold shrink-0"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text-muted mb-1">Observações Clínicas / Histórico</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Alérgico a dipirona, vacinação em dia..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-brand-teal"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-brand-border-strong">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-brand-text-muted hover:text-brand-text"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !formData.name.trim()}
                  className="bg-brand-teal text-brand-bg font-bold px-5 py-2 rounded-xl text-sm hover:bg-brand-teal/90 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {editingPet ? 'Salvar Alterações' : 'Salvar no Banco'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
