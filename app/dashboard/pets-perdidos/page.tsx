'use client';

import { useState, useEffect } from 'react';
import { 
  Radio, Search, Plus, MapPin, Phone, MessageSquare, 
  Calendar, Award, Heart, CheckCircle2, AlertTriangle, 
  X, Filter, Sparkles, Loader2, Camera, User, 
  Share2, Eye, ShieldCheck, Dog, Cat, RefreshCw, AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { 
  getAllLostPets, saveLostPet, updateLostPetStatus, deleteLostPet,
  submitPetSighting, LostPetRecord, LostPetSighting, TutorLocationRef, getLostPetsInTutorRadius
} from '@/lib/lostPetService';
import { isModuleActive, SYSTEM_MODULE_KEYS } from '@/lib/moduleService';
import { isSupabaseConfigured, getSupabaseClient } from '@/lib/supabase';

export default function LostPetsRadarPage() {
  const [activeTab, setActiveTab] = useState<'radar' | 'novo' | 'meus'>('radar');
  const [pets, setPets] = useState<LostPetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModuleEnabled, setIsModuleEnabled] = useState(true);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState<'all' | 'Cão' | 'Gato' | 'Outro'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'lost' | 'found' | 'reunited'>('lost');
  
  // Feedback Toast
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal de Detalhes
  const [selectedPet, setSelectedPet] = useState<LostPetRecord | null>(null);

  // Modal de Avistamento / Pista Comunitária
  const [sightingPet, setSightingPet] = useState<LostPetRecord | null>(null);
  const [sightingReporterName, setSightingReporterName] = useState('');
  const [sightingReporterPhone, setSightingReporterPhone] = useState('');
  const [sightingLocation, setSightingLocation] = useState('');
  const [sightingDescription, setSightingDescription] = useState('');
  const [isSubmittingSighting, setIsSubmittingSighting] = useState(false);

  // Formulário de Cadastro de Pet Perdido
  const [formPetName, setFormPetName] = useState('');
  const [formSpecies, setFormSpecies] = useState<'Cão' | 'Gato' | 'Pássaro' | 'Outro'>('Cão');
  const [formBreed, setFormBreed] = useState('');
  const [formColor, setFormColor] = useState('');
  const [formGender, setFormGender] = useState<'Macho' | 'Fêmea' | 'Indefinido'>('Macho');
  const [formSize, setFormSize] = useState<'Pequeno' | 'Médio' | 'Grande' | 'Porte Gigante'>('Médio');
  const [formHasCollar, setFormHasCollar] = useState(false);
  const [formCollarDescription, setFormCollarDescription] = useState('');
  const [formMicrochip, setFormMicrochip] = useState('');
  const [formRewardAmount, setFormRewardAmount] = useState('');
  const [formPhotoUrl, setFormPhotoUrl] = useState('');
  const [formDistinguishingMarks, setFormDistinguishingMarks] = useState('');
  const [formLastSeenDate, setFormLastSeenDate] = useState(new Date().toISOString().split('T')[0]);
  const [formLastSeenTime, setFormLastSeenTime] = useState('14:00');
  const [formLastSeenStreet, setFormLastSeenStreet] = useState('');
  const [formLastSeenNeighborhood, setFormLastSeenNeighborhood] = useState('');
  const [formLastSeenCity, setFormLastSeenCity] = useState('Montes Claros');
  const [formLastSeenState, setFormLastSeenState] = useState('MG');
  const [formLastSeenPostalCode, setFormLastSeenPostalCode] = useState('');
  const [formLastSeenReference, setFormLastSeenReference] = useState('');
  const [formAlertRadiusKm, setFormAlertRadiusKm] = useState('15');
  const [formContactName, setFormContactName] = useState('');
  const [formContactPhone, setFormContactPhone] = useState('');
  const [formContactWhatsapp, setFormContactWhatsapp] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Tutor logado
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserName, setCurrentUserName] = useState<string>('');

  const loadLostPets = async () => {
    setLoading(true);
    try {
      const enabled = isModuleActive(SYSTEM_MODULE_KEYS.LOST_PETS_RADAR);
      setIsModuleEnabled(enabled);

      if (typeof window !== 'undefined') {
        const storedName = localStorage.getItem('vetpro_tutor_name') || '';
        const storedPhone = localStorage.getItem('vetpro_user_phone') || '';
        if (storedName) {
          setCurrentUserName(storedName);
          setFormContactName(storedName);
          setSightingReporterName(storedName);
        }
        if (storedPhone) {
          setFormContactPhone(storedPhone);
          setFormContactWhatsapp(storedPhone);
          setSightingReporterPhone(storedPhone);
        }
      }

      if (isSupabaseConfigured()) {
        try {
          const supabase = getSupabaseClient();
          const { data } = await supabase.auth.getSession();
          if (data?.session?.user) {
            setCurrentUserId(data.session.user.id);
          }
        } catch (e) {
          console.warn('Erro ao obter sessão no radar:', e);
        }
      }

      const all = await getAllLostPets();
      setPets(all);
    } catch (err) {
      console.error('Erro ao carregar dados do radar:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLostPets();

    const handleUpdate = () => loadLostPets();
    window.addEventListener('vetpro_lost_pets_updated', handleUpdate);
    window.addEventListener('vetpro_modules_changed', handleUpdate);

    return () => {
      window.removeEventListener('vetpro_lost_pets_updated', handleUpdate);
      window.removeEventListener('vetpro_modules_changed', handleUpdate);
    };
  }, []);

  const handleCreateLostPet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPetName || !formLastSeenNeighborhood || !formLastSeenCity || !formContactPhone) {
      setFeedback({ type: 'error', message: 'Por favor, preencha os campos obrigatórios (*)' });
      return;
    }

    setIsSaving(true);
    try {
      const res = await saveLostPet({
        user_id: currentUserId || undefined,
        pet_name: formPetName.trim(),
        species: formSpecies,
        breed: formBreed.trim() || 'SRD / Mestiço',
        color: formColor.trim(),
        gender: formGender,
        size: formSize,
        has_collar: formHasCollar,
        collar_description: formCollarDescription.trim(),
        microchip: formMicrochip.trim(),
        reward_amount: formRewardAmount ? Number(formRewardAmount) : 0,
        photo_url: formPhotoUrl.trim() || (formSpecies === 'Gato' 
          ? 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=600&auto=format&fit=crop&q=80'),
        distinguishing_marks: formDistinguishingMarks.trim(),
        status: 'lost',
        last_seen_date: formLastSeenDate,
        last_seen_time: formLastSeenTime,
        last_seen_street: formLastSeenStreet.trim(),
        last_seen_neighborhood: formLastSeenNeighborhood.trim(),
        last_seen_city: formLastSeenCity.trim(),
        last_seen_state: formLastSeenState.trim(),
        last_seen_postal_code: formLastSeenPostalCode.trim(),
        last_seen_reference_point: formLastSeenReference.trim(),
        alert_radius_km: Number(formAlertRadiusKm) || 15,
        contact_name: formContactName.trim() || 'Tutor Responsável',
        contact_phone: formContactPhone.trim(),
        contact_whatsapp: (formContactWhatsapp || formContactPhone).replace(/\D/g, ''),
        description: formDescription.trim(),
      });

      if (res.success) {
        setFeedback({ 
          type: 'success', 
          message: `🚨 Alerta comunitário para "${formPetName}" emitido com sucesso no raio de ${formAlertRadiusKm} km!` 
        });
        // Reset form
        setFormPetName('');
        setFormBreed('');
        setFormColor('');
        setFormRewardAmount('');
        setFormDistinguishingMarks('');
        setFormDescription('');
        setFormPhotoUrl('');
        setActiveTab('radar');
        await loadLostPets();
      } else {
        setFeedback({ type: 'error', message: res.error || 'Erro ao cadastrar pet perdido' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro inesperado ao salvar' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleMarkAsFound = async (petId: string, petName: string) => {
    try {
      const res = await updateLostPetStatus(petId, 'reunited');
      if (res.success) {
        setFeedback({ 
          type: 'success', 
          message: `🎉 Que notícia maravilhosa! "${petName}" foi marcado como devolvido à família!` 
        });
        await loadLostPets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (petId: string, petName: string) => {
    if (confirm(`Tem certeza que deseja excluir o alerta de "${petName}"?`)) {
      await deleteLostPet(petId);
      setFeedback({ type: 'success', message: `Alerta de "${petName}" removido.` });
      await loadLostPets();
    }
  };

  const handleSubmitSighting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sightingPet || !sightingDescription || !sightingReporterName) return;

    setIsSubmittingSighting(true);
    try {
      const res = await submitPetSighting({
        lost_pet_id: sightingPet.id,
        user_id: currentUserId || undefined,
        reporter_name: sightingReporterName.trim(),
        reporter_phone: sightingReporterPhone.trim(),
        neighborhood: sightingLocation.trim(),
        description: sightingDescription.trim(),
      });

      if (res.success) {
        setFeedback({ 
          type: 'success', 
          message: `📍 Pista de avistamento registrada! O tutor de "${sightingPet.pet_name}" foi informado.` 
        });
        setSightingPet(null);
        setSightingDescription('');
        setSightingLocation('');
        await loadLostPets();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Erro ao registrar avistamento.' });
    } finally {
      setIsSubmittingSighting(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  // Filtragem
  const filteredPets = pets.filter(p => {
    if (selectedSpecies !== 'all' && p.species !== selectedSpecies) return false;
    if (selectedStatus !== 'all' && p.status !== selectedStatus) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = p.pet_name.toLowerCase().includes(term);
      const matchBreed = (p.breed || '').toLowerCase().includes(term);
      const matchBairro = p.last_seen_neighborhood.toLowerCase().includes(term);
      const matchCity = p.last_seen_city.toLowerCase().includes(term);
      return matchName || matchBreed || matchBairro || matchCity;
    }
    return true;
  });

  const myPets = pets.filter(p => currentUserId && p.user_id === currentUserId);

  if (!isModuleEnabled) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center py-16">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
          <Radio className="w-8 h-8 opacity-60" />
        </div>
        <h2 className="text-xl font-bold text-brand-text mb-2">Módulo Radar de Pets Perdidos Desativado</h2>
        <p className="text-sm text-brand-text-muted max-w-md mx-auto mb-6">
          Este recurso está temporariamente desativado pelo administrador do sistema.
        </p>
        <Link
          href="/dashboard"
          className="px-5 py-2.5 bg-brand-surface-2 hover:bg-brand-surface border border-brand-border-strong text-brand-text text-sm font-semibold rounded-xl transition-colors"
        >
          Voltar ao Início
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Header com Identidade Visual do Radar Comunitário */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-brand-surface p-5 sm:p-6 rounded-3xl border border-brand-border-strong shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-red-500 text-brand-bg flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold text-xl sm:text-2xl text-brand-text">
                Radar de Pets Perdidos
              </h1>
              <span className="bg-red-500/15 border border-red-500/30 text-red-400 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Radio className="w-3 h-3 animate-ping" /> Alerta por Raio
              </span>
            </div>
            <p className="text-xs sm:text-sm text-brand-text-muted mt-0.5">
              Rede colaborativa de tutores: cadastre pets desaparecidos e encontre animais na sua região.
            </p>
          </div>
        </div>

        {/* Botão de Ação Rápida */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('novo')}
            className="bg-gradient-to-r from-red-500 to-amber-500 hover:from-red-600 hover:to-amber-600 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-md transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Pet Perdido
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in text-xs font-semibold ${
          feedback.type === 'success' 
            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
            : 'bg-red-500/15 border border-red-500/30 text-red-300'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
          <span className="flex-1">{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-brand-text-muted hover:text-brand-text">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Abas de Navegação */}
      <div className="flex items-center gap-2 border-b border-brand-border-strong pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('radar')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'radar'
              ? 'bg-brand-surface-2 text-brand-text border border-brand-border-strong shadow-sm'
              : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-surface-2/40'
          }`}
        >
          <Radio className="w-4 h-4 text-amber-400" />
          Radar de Alertas ({filteredPets.length})
        </button>

        <button
          onClick={() => setActiveTab('novo')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'novo'
              ? 'bg-brand-surface-2 text-brand-text border border-brand-border-strong shadow-sm'
              : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-surface-2/40'
          }`}
        >
          <Plus className="w-4 h-4 text-red-400" />
          Cadastrar Novo Pet Desaparecido
        </button>

        <button
          onClick={() => setActiveTab('meus')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'meus'
              ? 'bg-brand-surface-2 text-brand-text border border-brand-border-strong shadow-sm'
              : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-surface-2/40'
          }`}
        >
          <User className="w-4 h-4 text-brand-teal" />
          Meus Alertas Registrados ({myPets.length})
        </button>
      </div>

      {/* ABA 1: RADAR DE ALERTAS */}
      {activeTab === 'radar' && (
        <div className="space-y-6">
          
          {/* Barra de Filtros e Busca */}
          <div className="bg-brand-surface p-4 rounded-2xl border border-brand-border-strong flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome do pet, raça, bairro ou cidade..."
                className="w-full bg-brand-bg border border-brand-border-strong rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-brand-text placeholder:text-brand-text-muted/60 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Filtro de Espécie */}
              <div className="flex items-center bg-brand-bg border border-brand-border-strong rounded-xl p-0.5">
                {(['all', 'Cão', 'Gato', 'Outro'] as const).map((sp) => (
                  <button
                    key={sp}
                    onClick={() => setSelectedSpecies(sp)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      selectedSpecies === sp
                        ? 'bg-brand-surface-2 text-brand-text font-bold shadow-sm'
                        : 'text-brand-text-muted hover:text-brand-text'
                    }`}
                  >
                    {sp === 'all' ? 'Todos' : sp}
                  </button>
                ))}
              </div>

              {/* Filtro de Status */}
              <select
                value={selectedStatus}
                onChange={(e: any) => setSelectedStatus(e.target.value)}
                className="bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-amber-500"
              >
                <option value="lost">Apenas Desaparecidos</option>
                <option value="all">Todos os Status</option>
                <option value="found">Resgatados</option>
                <option value="reunited">Devolvidos à Família</option>
              </select>
            </div>
          </div>

          {/* Grid de Cards de Pets Perdidos */}
          {loading ? (
            <div className="text-center py-16">
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-2" />
              <p className="text-xs text-brand-text-muted">Varrendo o radar comunitário...</p>
            </div>
          ) : filteredPets.length === 0 ? (
            <div className="bg-brand-surface border border-brand-border-strong rounded-3xl p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-brand-surface-2 text-brand-text-muted flex items-center justify-center mx-auto mb-3">
                <Radio className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-brand-text mb-1">Nenhum pet encontrado com os filtros selecionados</h3>
              <p className="text-xs text-brand-text-muted max-w-sm mx-auto mb-4">
                Se você perdeu seu pet, cadastre-o para que os tutores do seu bairro e cidade sejam notificados.
              </p>
              <button
                onClick={() => setActiveTab('novo')}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-brand-bg text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Emitir Novo Alerta
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPets.map((pet) => {
                const isLost = pet.status === 'lost' || pet.status === 'spotted';
                return (
                  <div 
                    key={pet.id}
                    className="bg-brand-surface rounded-3xl border border-brand-border-strong overflow-hidden shadow-sm hover:border-amber-500/40 transition-all flex flex-col group"
                  >
                    {/* Imagem do Pet com Badges */}
                    <div className="relative h-48 bg-brand-surface-2 overflow-hidden">
                      {pet.photo_url ? (
                        <img 
                          src={pet.photo_url} 
                          alt={pet.pet_name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-brand-text-muted">
                          {pet.species === 'Gato' ? <Cat className="w-16 h-16 opacity-30" /> : <Dog className="w-16 h-16 opacity-30" />}
                        </div>
                      )}

                      {/* Tag de Status */}
                      <div className="absolute top-3 left-3">
                        {pet.status === 'reunited' ? (
                          <span className="bg-emerald-500 text-brand-bg text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Devolvido ao Tutor
                          </span>
                        ) : pet.status === 'found' ? (
                          <span className="bg-blue-500 text-white text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Resgatado / Lar Temporário
                          </span>
                        ) : (
                          <span className="bg-red-500 text-white text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1 animate-pulse">
                            <Radio className="w-3 h-3" /> Desaparecido
                          </span>
                        )}
                      </div>

                      {/* Tag de Recompensa */}
                      {pet.reward_amount && pet.reward_amount > 0 ? (
                        <div className="absolute top-3 right-3 bg-amber-500 text-brand-bg text-xs font-extrabold px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1">
                          <Award className="w-3.5 h-3.5" />
                          R$ {pet.reward_amount}
                        </div>
                      ) : null}

                      {/* Raio do Alerta */}
                      <div className="absolute bottom-2.5 left-3 bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Radio className="w-3 h-3 text-amber-400" />
                        Raio do Alerta: {pet.alert_radius_km} km
                      </div>
                    </div>

                    {/* Conteúdo do Card */}
                    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-display font-bold text-base text-brand-text">
                            {pet.pet_name}
                          </h3>
                          <span className="text-xs text-brand-text-muted font-medium">
                            {pet.species} • {pet.breed || 'SRD'}
                          </span>
                        </div>

                        {/* Localização Onde Foi Visto */}
                        <p className="text-xs text-brand-text-muted flex items-start gap-1.5 mt-1.5">
                          <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span>
                            <strong className="text-brand-text">{pet.last_seen_neighborhood}</strong>, {pet.last_seen_city} — {pet.last_seen_state}
                          </span>
                        </p>

                        <p className="text-[11px] text-brand-text-muted flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3 text-brand-teal shrink-0" />
                          <span>Visto em: {new Date(pet.last_seen_date + 'T12:00:00').toLocaleDateString('pt-BR')} {pet.last_seen_time ? `às ${pet.last_seen_time}` : ''}</span>
                        </p>

                        {/* Descrição curta */}
                        {pet.description && (
                          <p className="text-xs text-brand-text-muted line-clamp-2 mt-2 bg-brand-surface-2/50 p-2 rounded-xl">
                            {pet.description}
                          </p>
                        )}
                      </div>

                      {/* Botões de Ação */}
                      <div className="pt-3 border-t border-brand-border-strong space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setSelectedPet(pet)}
                            className="w-full py-2 bg-brand-surface-2 hover:bg-brand-surface border border-brand-border-strong text-brand-text text-xs font-semibold rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Ver Detalhes
                          </button>

                          <button
                            onClick={() => setSightingPet(pet)}
                            className="w-full py-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          >
                            <MapPin className="w-3.5 h-3.5 text-amber-400" />
                            Eu Vi Este Pet
                          </button>
                        </div>

                        {/* WhatsApp Direto com o Tutor */}
                        {isLost && (
                          <a
                            href={`https://wa.me/55${pet.contact_whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${pet.contact_name}! Vi o alerta no Radar do VetPro sobre o pet ${pet.pet_name} que sumiu em ${pet.last_seen_neighborhood}.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-brand-bg text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            WhatsApp do Tutor ({pet.contact_name})
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ABA 2: FORMULÁRIO DE CADASTRO DE PET PERDIDO */}
      {activeTab === 'novo' && (
        <div className="bg-brand-surface border border-brand-border-strong rounded-3xl p-5 sm:p-8 max-w-3xl mx-auto shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-brand-text flex items-center gap-2">
              <Radio className="w-5 h-5 text-red-400 animate-pulse" />
              Emitir Alerta Comunitário de Pet Desaparecido
            </h2>
            <p className="text-xs text-brand-text-muted mt-1">
              Os dados cadastrados serão exibidos instantaneamente para todos os tutores cadastrados dentro do raio especificado.
            </p>
          </div>

          <form onSubmit={handleCreateLostPet} className="space-y-6">
            
            {/* Seção 1: Dados do Pet */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-teal border-b border-brand-border-strong pb-1">
                1. Características do Animal
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-brand-text mb-1">
                    Nome do Pet *
                  </label>
                  <input
                    type="text"
                    required
                    value={formPetName}
                    onChange={(e) => setFormPetName(e.target.value)}
                    placeholder="Ex: Thor, Mia, Pipoca"
                    className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3.5 py-2 text-xs text-brand-text focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-text mb-1">
                    Espécie *
                  </label>
                  <select
                    value={formSpecies}
                    onChange={(e: any) => setFormSpecies(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3.5 py-2 text-xs text-brand-text focus:outline-none focus:border-amber-500"
                  >
                    <option value="Cão">Cão</option>
                    <option value="Gato">Gato</option>
                    <option value="Pássaro">Pássaro</option>
                    <option value="Outro">Outro Pet</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-brand-text mb-1">
                    Raça
                  </label>
                  <input
                    type="text"
                    value={formBreed}
                    onChange={(e) => setFormBreed(e.target.value)}
                    placeholder="Ex: Golden Retriever, SRD"
                    className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-text mb-1">
                    Cor / Pelagem
                  </label>
                  <input
                    type="text"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    placeholder="Ex: Dourado, Preto e Branco"
                    className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-text mb-1">
                    Porte
                  </label>
                  <select
                    value={formSize}
                    onChange={(e: any) => setFormSize(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-amber-500"
                  >
                    <option value="Pequeno">Pequeno</option>
                    <option value="Médio">Médio</option>
                    <option value="Grande">Grande</option>
                    <option value="Porte Gigante">Porte Gigante</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-brand-text mb-1">
                    URL da Foto do Pet
                  </label>
                  <input
                    type="url"
                    value={formPhotoUrl}
                    onChange={(e) => setFormPhotoUrl(e.target.value)}
                    placeholder="https://... ou deixe em branco para foto padrão"
                    className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-text mb-1">
                    Recompensa Ofertada (R$)
                  </label>
                  <input
                    type="number"
                    value={formRewardAmount}
                    onChange={(e) => setFormRewardAmount(e.target.value)}
                    placeholder="Ex: 500 (Opcional)"
                    className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs text-brand-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formHasCollar}
                    onChange={(e) => setFormHasCollar(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-0"
                  />
                  <span>Estava usando coleira ou plaqueta</span>
                </label>

                {formHasCollar && (
                  <input
                    type="text"
                    value={formCollarDescription}
                    onChange={(e) => setFormCollarDescription(e.target.value)}
                    placeholder="Cor ou pingente da coleira"
                    className="flex-1 bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-1.5 text-xs text-brand-text focus:outline-none focus:border-amber-500"
                  />
                )}
              </div>
            </div>

            {/* Seção 2: Local Onde Foi Visto & Raio do Alerta */}
            <div className="space-y-4 pt-4 border-t border-brand-border-strong">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-brand-border-strong pb-1 flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                2. Região do Desaparecimento & Raio de Notificação
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-brand-text mb-1">
                    Data em que Sumiu *
                  </label>
                  <input
                    type="date"
                    required
                    value={formLastSeenDate}
                    onChange={(e) => setFormLastSeenDate(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-text mb-1">
                    Horário Aproximado
                  </label>
                  <input
                    type="time"
                    value={formLastSeenTime}
                    onChange={(e) => setFormLastSeenTime(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-brand-text mb-1">
                    Bairro Onde Sumiu *
                  </label>
                  <input
                    type="text"
                    required
                    value={formLastSeenNeighborhood}
                    onChange={(e) => setFormLastSeenNeighborhood(e.target.value)}
                    placeholder="Ex: Ibituruna, Centro, Todos os Santos"
                    className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-text mb-1">
                    Cidade *
                  </label>
                  <input
                    type="text"
                    required
                    value={formLastSeenCity}
                    onChange={(e) => setFormLastSeenCity(e.target.value)}
                    placeholder="Ex: Montes Claros, Belo Horizonte"
                    className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-text mb-1">
                    Estado (UF) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formLastSeenState}
                    onChange={(e) => setFormLastSeenState(e.target.value.toUpperCase().slice(0, 2))}
                    placeholder="Ex: MG, SP, RJ"
                    className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-amber-500 uppercase font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-brand-text mb-1">
                    Rua / Avenida
                  </label>
                  <input
                    type="text"
                    value={formLastSeenStreet}
                    onChange={(e) => setFormLastSeenStreet(e.target.value)}
                    placeholder="Ex: Av. Deputado Esteves Rodrigues"
                    className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-text mb-1">
                    Ponto de Referência
                  </label>
                  <input
                    type="text"
                    value={formLastSeenReference}
                    onChange={(e) => setFormLastSeenReference(e.target.value)}
                    placeholder="Ex: Próximo à praça, padaria ou farmácia"
                    className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Raio de Abrangência do Alerta */}
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl">
                <label className="block text-xs font-bold text-amber-300 mb-1">
                  Raio de Abrangência do Alerta Comunitário
                </label>
                <p className="text-[11px] text-amber-200/80 mb-3">
                  Todos os tutores cadastrados com endereço dentro desse raio verão o alerta no painel.
                </p>
                <div className="flex flex-wrap gap-2">
                  {['5', '10', '15', '25', '50'].map((km) => (
                    <button
                      key={km}
                      type="button"
                      onClick={() => setFormAlertRadiusKm(km)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        formAlertRadiusKm === km
                          ? 'bg-amber-500 text-brand-bg shadow-md'
                          : 'bg-brand-surface border border-brand-border-strong text-brand-text hover:bg-brand-surface-2'
                      }`}
                    >
                      Raio de {km} km
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Seção 3: Contatos do Tutor */}
            <div className="space-y-4 pt-4 border-t border-brand-border-strong">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 border-b border-brand-border-strong pb-1 flex items-center gap-1.5">
                <Phone className="w-4 h-4" />
                3. Dados de Contato para Resgate
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-brand-text mb-1">
                    Nome do Tutor Responsável *
                  </label>
                  <input
                    type="text"
                    required
                    value={formContactName}
                    onChange={(e) => setFormContactName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-text mb-1">
                    Telefone para Ligação *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formContactPhone}
                    onChange={(e) => setFormContactPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-text mb-1">
                    WhatsApp para Mensagens *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formContactWhatsapp}
                    onChange={(e) => setFormContactWhatsapp(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-text mb-1">
                  Detalhes Adicionais / Como Aconteceu
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Conte como ele fugiu, se atende por outro nome, se é dócil ou arisco, marcas no corpo..."
                  className="w-full bg-brand-bg border border-brand-border-strong rounded-xl p-3 text-xs text-brand-text focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-brand-border-strong">
              <button
                type="button"
                onClick={() => setActiveTab('radar')}
                className="px-5 py-2.5 rounded-xl text-xs font-medium text-brand-text-muted hover:text-brand-text transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="bg-gradient-to-r from-red-500 to-amber-500 hover:from-red-600 hover:to-amber-600 text-white font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Publicando Alerta no Radar...
                  </>
                ) : (
                  <>
                    <Radio className="w-4 h-4" />
                    Emitir Alerta no Raio de {formAlertRadiusKm} km
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ABA 3: MEUS ALERTAS CADASTRADOS */}
      {activeTab === 'meus' && (
        <div className="space-y-4">
          <div className="bg-brand-surface p-5 rounded-3xl border border-brand-border-strong">
            <h2 className="text-base font-bold text-brand-text mb-1">
              Gerenciar Meus Alertas de Pets Perdidos
            </h2>
            <p className="text-xs text-brand-text-muted">
              Quando seu pet for resgatado ou voltar para casa, marque-o como &ldquo;Encontrado / Devolvido à Família&rdquo; para atualizar o radar comunitário.
            </p>
          </div>

          {myPets.length === 0 ? (
            <div className="bg-brand-surface border border-brand-border-strong rounded-3xl p-10 text-center">
              <Dog className="w-12 h-12 text-brand-text-muted mx-auto mb-2 opacity-40" />
              <p className="text-xs text-brand-text-muted">Você ainda não possui alertas cadastrados por este usuário.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myPets.map((pet) => (
                <div key={pet.id} className="bg-brand-surface p-4 rounded-2xl border border-brand-border-strong flex gap-4">
                  {pet.photo_url && (
                    <img src={pet.photo_url} alt={pet.pet_name} className="w-20 h-20 rounded-xl object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-brand-text truncate">{pet.pet_name}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                        pet.status === 'reunited' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {pet.status === 'reunited' ? 'Encontrado' : 'Procurando'}
                      </span>
                    </div>

                    <p className="text-xs text-brand-text-muted mt-0.5">
                      {pet.last_seen_neighborhood}, {pet.last_seen_city}
                    </p>

                    <div className="flex items-center gap-2 mt-3">
                      {pet.status !== 'reunited' && (
                        <button
                          onClick={() => handleMarkAsFound(pet.id, pet.pet_name)}
                          className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-brand-bg text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Marcar como Encontrado
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(pet.id, pet.pet_name)}
                        className="px-2.5 py-1 bg-brand-surface-2 hover:bg-red-500/20 text-brand-text-muted hover:text-red-400 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de Detalhes Completo */}
      {selectedPet && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-brand-surface border border-amber-500/40 rounded-3xl w-full max-w-xl p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 my-auto">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-brand-text">
                    {selectedPet.pet_name}
                  </h3>
                  <p className="text-xs text-brand-text-muted">
                    {selectedPet.species} • {selectedPet.breed || 'SRD'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedPet(null)}
                className="text-brand-text-muted hover:text-brand-text p-1.5 rounded-lg hover:bg-brand-surface-2 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedPet.photo_url && (
              <div className="w-full h-64 rounded-2xl overflow-hidden border border-brand-border-strong mb-4">
                <img src={selectedPet.photo_url} alt={selectedPet.pet_name} className="w-full h-full object-cover" />
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-2xl space-y-1">
                <strong className="text-amber-300 block">Última Localização Registrada</strong>
                <p className="text-brand-text font-semibold">
                  {selectedPet.last_seen_street ? `${selectedPet.last_seen_street}, ` : ''}{selectedPet.last_seen_neighborhood} — {selectedPet.last_seen_city}/{selectedPet.last_seen_state}
                </p>
                {selectedPet.last_seen_reference_point && (
                  <p className="text-brand-text-muted text-[11px]">
                    <strong>Referência:</strong> {selectedPet.last_seen_reference_point}
                  </p>
                )}
              </div>

              {selectedPet.description && (
                <div className="bg-brand-surface-2/60 p-3.5 rounded-2xl border border-brand-border-strong text-brand-text-muted">
                  <strong className="text-brand-text block mb-1">Informações do Tutor:</strong>
                  {selectedPet.description}
                </div>
              )}

              {/* Botão de Contato WhatsApp */}
              <div className="pt-2">
                <a
                  href={`https://wa.me/55${selectedPet.contact_whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${selectedPet.contact_name}! Vi o alerta no Radar do VetPro sobre o pet ${selectedPet.pet_name}.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-brand-bg text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  Entrar em Contato com o Tutor ({selectedPet.contact_name})
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Enviar Pista / Avistamento Comunitário */}
      {sightingPet && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-brand-surface border border-brand-border-strong rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 my-auto">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-brand-text">
                    Enviar Pista de Avistamento
                  </h3>
                  <p className="text-xs text-brand-text-muted">
                    Pet: <strong className="text-brand-text">{sightingPet.pet_name}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSightingPet(null)}
                className="text-brand-text-muted hover:text-brand-text p-1.5 rounded-lg hover:bg-brand-surface-2 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSighting} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-brand-text mb-1">
                  Seu Nome *
                </label>
                <input
                  type="text"
                  required
                  value={sightingReporterName}
                  onChange={(e) => setSightingReporterName(e.target.value)}
                  placeholder="Nome de quem viu o pet"
                  className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text mb-1">
                  Seu Telefone / WhatsApp *
                </label>
                <input
                  type="tel"
                  required
                  value={sightingReporterPhone}
                  onChange={(e) => setSightingReporterPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text mb-1">
                  Onde e quando você o viu? *
                </label>
                <input
                  type="text"
                  required
                  value={sightingLocation}
                  onChange={(e) => setSightingLocation(e.target.value)}
                  placeholder="Ex: Rua X, perto da pracinha hoje às 15h"
                  className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text mb-1">
                  Detalhes do Avistamento *
                </label>
                <textarea
                  rows={3}
                  required
                  value={sightingDescription}
                  onChange={(e) => setSightingDescription(e.target.value)}
                  placeholder="Como ele estava? Machucado, assustado, em qual direção correu?"
                  className="w-full bg-brand-bg border border-brand-border-strong rounded-xl p-3 text-xs text-brand-text focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSightingPet(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-brand-text-muted hover:text-brand-text cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingSighting}
                  className="bg-amber-500 hover:bg-amber-600 text-brand-bg font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  {isSubmittingSighting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                  Enviar Pista
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
