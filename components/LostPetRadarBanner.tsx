'use client';

import { useState, useEffect } from 'react';
import { 
  Radio, AlertTriangle, MapPin, Phone, MessageSquare, 
  ChevronRight, X, Heart, ShieldAlert, Sparkles, ExternalLink,
  Award, Eye, Share2, CheckCircle2, ChevronDown, ChevronUp
} from 'lucide-react';
import Link from 'next/link';
import { 
  getLostPetsInTutorRadius, LostPetRecord, TutorLocationRef 
} from '@/lib/lostPetService';
import { isModuleActive, SYSTEM_MODULE_KEYS } from '@/lib/moduleService';
import { isSupabaseConfigured, getSupabaseClient } from '@/lib/supabase';

export function LostPetRadarBanner() {
  const [isEnabled, setIsEnabled] = useState(true);
  const [nearbyLostPets, setNearbyLostPets] = useState<Array<LostPetRecord & { distanceKm?: number; matchReason: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPet, setSelectedPet] = useState<LostPetRecord | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const checkNearbyPets = async () => {
    if (!isModuleActive(SYSTEM_MODULE_KEYS.LOST_PETS_RADAR)) {
      setIsEnabled(false);
      setLoading(false);
      return;
    }
    setIsEnabled(true);

    try {
      let tutorLocation: TutorLocationRef = {
        city: 'Montes Claros',
        state: 'MG'
      };

      // Tentar obter endereço salvo no perfil do tutor
      if (typeof window !== 'undefined') {
        const storedCity = localStorage.getItem('vetpro_tutor_city');
        const storedNeighborhood = localStorage.getItem('vetpro_tutor_neighborhood');
        const storedStreet = localStorage.getItem('vetpro_tutor_street');
        if (storedCity) {
          tutorLocation.city = storedCity;
          tutorLocation.neighborhood = storedNeighborhood || undefined;
          tutorLocation.street = storedStreet || undefined;
        }
      }

      if (isSupabaseConfigured()) {
        try {
          const supabase = getSupabaseClient();
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.user?.id) {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('city, neighborhood, street, state, cep, latitude, longitude')
              .eq('id', sessionData.session.user.id)
              .maybeSingle();

            if (profile?.city) {
              tutorLocation = {
                city: profile.city,
                neighborhood: profile.neighborhood || undefined,
                street: profile.street || undefined,
                state: profile.state || undefined,
                latitude: profile.latitude ? Number(profile.latitude) : undefined,
                longitude: profile.longitude ? Number(profile.longitude) : undefined,
              };
            }
          }
        } catch (e) {
          console.warn('Erro ao consultar endereço do tutor para o radar:', e);
        }
      }

      const matching = await getLostPetsInTutorRadius(tutorLocation);
      setNearbyLostPets(matching);
    } catch (err) {
      console.warn('Erro ao carregar radar de pets perdidos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkNearbyPets();

    const handleUpdate = () => checkNearbyPets();
    window.addEventListener('vetpro_lost_pets_updated', handleUpdate);
    window.addEventListener('vetpro_modules_changed', handleUpdate);

    return () => {
      window.removeEventListener('vetpro_lost_pets_updated', handleUpdate);
      window.removeEventListener('vetpro_modules_changed', handleUpdate);
    };
  }, []);

  if (!isEnabled || loading || nearbyLostPets.length === 0 || isDismissed) {
    return null;
  }

  const primaryPet = nearbyLostPets[0];

  return (
    <>
      {/* Alerta Compacto e Chamativo para Tutores no Raio */}
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-amber-500/15 via-red-500/15 to-amber-500/10 border border-amber-500/30 p-3.5 sm:p-4 shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Lado Esquerdo: Badge & Informações */}
          <div className="flex items-start sm:items-center gap-3">
            <div className="relative shrink-0">
              {primaryPet.photo_url ? (
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-amber-500/40 bg-brand-surface shadow-sm">
                  <img 
                    src={primaryPet.photo_url} 
                    alt={primaryPet.pet_name} 
                    className="w-full h-full object-cover" 
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Radio className="w-6 h-6 animate-pulse" />
                </div>
              )}
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 border-2 border-brand-surface rounded-full animate-ping" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 border-2 border-brand-surface rounded-full" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Radio className="w-2.5 h-2.5 animate-pulse" />
                  Alerta Comunitário • Pet Perdido no seu Raio
                </span>

                {primaryPet.reward_amount && primaryPet.reward_amount > 0 ? (
                  <span className="bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Award className="w-2.5 h-2.5" />
                    Recompensa: R$ {primaryPet.reward_amount}
                  </span>
                ) : null}
              </div>

              <h4 className="text-sm font-bold text-brand-text mt-0.5 flex items-center gap-1.5">
                <span>{primaryPet.pet_name} ({primaryPet.species} • {primaryPet.breed || 'SRD'})</span>
                <span className="text-xs font-normal text-brand-text-muted hidden md:inline">
                  desapareceu próximo ao seu endereço
                </span>
              </h4>

              <p className="text-xs text-brand-text-muted flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-amber-200/90 font-medium">{primaryPet.last_seen_neighborhood}, {primaryPet.last_seen_city}</span>
                <span className="text-brand-text-muted/60">•</span>
                <span className="text-emerald-400 font-semibold">{primaryPet.matchReason}</span>
              </p>
            </div>
          </div>

          {/* Lado Direito: Ações */}
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              onClick={() => setSelectedPet(primaryPet)}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-brand-bg text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              Ver Foto & Detalhes
            </button>

            <Link
              href="/dashboard/pets-perdidos"
              className="px-3 py-1.5 bg-brand-surface-2 hover:bg-brand-surface border border-brand-border-strong text-brand-text text-xs font-medium rounded-xl flex items-center gap-1 transition-colors"
            >
              <span>Radar ({nearbyLostPets.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>

            <button
              onClick={() => setIsDismissed(true)}
              className="p-1.5 text-brand-text-muted hover:text-brand-text rounded-lg hover:bg-brand-surface-2 transition-colors cursor-pointer"
              title="Ocultar aviso temporariamente"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Rápido de Detalhes do Pet Perdido & Contato com Tutor */}
      {selectedPet && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-brand-surface border border-amber-500/40 rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 my-auto">
            {/* Header do Modal */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-red-500 text-white font-bold px-2 py-0.5 rounded-full uppercase">
                      Desaparecido
                    </span>
                    <span className="text-xs text-brand-text-muted">
                      Visto em {new Date(selectedPet.last_seen_date + 'T12:00:00').toLocaleDateString('pt-BR')} {selectedPet.last_seen_time ? `às ${selectedPet.last_seen_time}` : ''}
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-lg text-brand-text">
                    {selectedPet.pet_name}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setSelectedPet(null)}
                className="text-brand-text-muted hover:text-brand-text p-1.5 rounded-lg hover:bg-brand-surface-2 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Foto e Características */}
            <div className="space-y-4">
              {selectedPet.photo_url && (
                <div className="w-full h-52 rounded-2xl overflow-hidden border border-brand-border-strong relative">
                  <img 
                    src={selectedPet.photo_url} 
                    alt={selectedPet.pet_name} 
                    className="w-full h-full object-cover" 
                  />
                  {selectedPet.reward_amount && selectedPet.reward_amount > 0 ? (
                    <div className="absolute top-3 right-3 bg-amber-500 text-brand-bg font-extrabold text-xs px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5">
                      <Award className="w-4 h-4" />
                      Recompensa: R$ {selectedPet.reward_amount}
                    </div>
                  ) : null}
                </div>
              )}

              {/* Informações Principais */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-brand-surface-2/60 p-3 rounded-2xl border border-brand-border-strong">
                <div>
                  <span className="text-brand-text-muted block">Espécie & Raça:</span>
                  <span className="font-semibold text-brand-text">{selectedPet.species} • {selectedPet.breed || 'SRD'}</span>
                </div>
                <div>
                  <span className="text-brand-text-muted block">Porte & Sexo:</span>
                  <span className="font-semibold text-brand-text">{selectedPet.size || 'Médio'} • {selectedPet.gender || 'Não informado'}</span>
                </div>
                <div>
                  <span className="text-brand-text-muted block">Cor / Pelagem:</span>
                  <span className="font-semibold text-brand-text">{selectedPet.color || 'Não especificada'}</span>
                </div>
                <div>
                  <span className="text-brand-text-muted block">Usava Coleira:</span>
                  <span className="font-semibold text-brand-text">
                    {selectedPet.has_collar ? `Sim (${selectedPet.collar_description || 'Identificada'})` : 'Não'}
                  </span>
                </div>
              </div>

              {/* Local Onde Foi Visto */}
              <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                  <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Última Localização Registrada</span>
                </div>
                <p className="text-brand-text font-medium">
                  {selectedPet.last_seen_street ? `${selectedPet.last_seen_street}, ` : ''}{selectedPet.last_seen_neighborhood} — {selectedPet.last_seen_city}/{selectedPet.last_seen_state}
                </p>
                {selectedPet.last_seen_reference_point && (
                  <p className="text-brand-text-muted text-[11px]">
                    <strong>Ponto de referência:</strong> {selectedPet.last_seen_reference_point}
                  </p>
                )}
              </div>

              {/* Descrição e Marcas */}
              {selectedPet.description && (
                <div className="text-xs text-brand-text-muted bg-brand-bg p-3 rounded-xl border border-brand-border-strong">
                  <strong className="text-brand-text block mb-0.5">Mensagem do Tutor:</strong>
                  &ldquo;{selectedPet.description}&rdquo;
                </div>
              )}

              {/* Contato Direto com o Tutor */}
              <div className="pt-2 border-t border-brand-border-strong">
                <p className="text-xs font-semibold text-brand-text mb-2.5">
                  Viu o {selectedPet.pet_name}? Entre em contato imediatamente com o tutor:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <a
                    href={`https://wa.me/55${selectedPet.contact_whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${selectedPet.contact_name}! Vi o alerta comunitário no VetPro sobre o ${selectedPet.pet_name} desaparecido. Acredito que tenho informações sobre ele!`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-emerald-500 hover:bg-emerald-600 text-brand-bg font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Falar no WhatsApp ({selectedPet.contact_name})
                  </a>

                  {selectedPet.contact_phone && (
                    <a
                      href={`tel:${selectedPet.contact_phone.replace(/\D/g, '')}`}
                      className="bg-brand-surface-2 hover:bg-brand-surface border border-brand-border-strong text-brand-text font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors"
                    >
                      <Phone className="w-4 h-4 text-brand-teal" />
                      Ligar: {selectedPet.contact_phone}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
