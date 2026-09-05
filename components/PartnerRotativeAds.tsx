'use client';

import { useState, useEffect } from 'react';
import { 
  Building, Phone, MapPin, ChevronLeft, ChevronRight, 
  Sparkles, Star, Navigation, MessageCircle, HeartPulse, Stethoscope, 
  ShoppingBag, Award, Home, Pill, Clock, ShieldCheck, CheckCircle2,
  Info
} from 'lucide-react';
import { Partner, getFeaturedAdPartners } from '@/lib/partnerService';
import { useGeolocation } from '@/lib/useGeolocation';
import { isModuleActive, SYSTEM_MODULE_KEYS } from '@/lib/moduleService';

interface PartnerRotativeAdsProps {
  title?: string;
  subtitle?: string;
  autoPlayIntervalMs?: number;
  className?: string;
  isSuperAdmin?: boolean;
}

export function PartnerRotativeAds({
  title = "Rede Credenciada & Destaques",
  subtitle = "Encontre hospitais 24h, clínicas especializadas e farmácias parceiras com benefícios exclusivos perto de você.",
  autoPlayIntervalMs = 6000,
  className = "",
  isSuperAdmin = false
}: PartnerRotativeAdsProps) {
  const [isModuleEnabled, setIsModuleEnabled] = useState<boolean>(() => {
    return isModuleActive(SYSTEM_MODULE_KEYS.PARCEIROS_GPS);
  });
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedPartnerModal, setSelectedPartnerModal] = useState<Partner | null>(null);
  const { location, requestLocation, loading: geoLoading } = useGeolocation();

  useEffect(() => {
    const handleModuleChange = () => {
      setIsModuleEnabled(isModuleActive(SYSTEM_MODULE_KEYS.PARCEIROS_GPS));
    };
    window.addEventListener('vetpro_modules_changed', handleModuleChange);
    return () => window.removeEventListener('vetpro_modules_changed', handleModuleChange);
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!isModuleEnabled && !isSuperAdmin) {
        if (active) setLoading(false);
        return;
      }
      setLoading(true);
      const coords = location ? { latitude: location.latitude, longitude: location.longitude } : null;
      const data = await getFeaturedAdPartners(coords);
      if (active) {
        setPartners(data);
        setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [location, isModuleEnabled, isSuperAdmin]);

  // Carrossel rotativo automático suave
  useEffect(() => {
    if (partners.length <= 1 || isPaused || selectedPartnerModal) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % partners.length);
    }, autoPlayIntervalMs);

    return () => clearInterval(timer);
  }, [partners.length, isPaused, autoPlayIntervalMs, selectedPartnerModal]);

  if (!isModuleEnabled && !isSuperAdmin) {
    return null; // Oculta anúncios caso o módulo de parceiros esteja desativado pelo Super Admin
  }

  const handlePrev = () => {
    if (partners.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + partners.length) % partners.length);
  };

  const handleNext = () => {
    if (partners.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % partners.length);
  };

  const getCategoryIcon = (category: Partner['category']) => {
    switch (category) {
      case 'hospital_24h': return <HeartPulse className="w-4 h-4 text-rose-400" />;
      case 'clinica': return <Stethoscope className="w-4 h-4 text-brand-teal" />;
      case 'pet_shop': return <ShoppingBag className="w-4 h-4 text-amber-400" />;
      case 'farmacia': return <Pill className="w-4 h-4 text-emerald-400" />;
      case 'adestramento': return <Award className="w-4 h-4 text-indigo-400" />;
      case 'hotel_pet': return <Home className="w-4 h-4 text-blue-400" />;
      default: return <Building className="w-4 h-4 text-brand-teal" />;
    }
  };

  const getCategoryLabel = (category: Partner['category']) => {
    switch (category) {
      case 'hospital_24h': return 'Hospital 24 Horas';
      case 'clinica': return 'Clínica Veterinária';
      case 'pet_shop': return 'Pet Shop';
      case 'farmacia': return 'Farmácia Veterinária';
      case 'adestramento': return 'Adestramento';
      case 'hotel_pet': return 'Hotel Pet';
      case 'especialista': return 'Consultório Especializado';
      default: return 'Parceiro Credenciado';
    }
  };

  const currentPartner = partners[currentIndex];

  return (
    <div 
      className={`bg-brand-surface/95 backdrop-blur-md border border-brand-border-strong rounded-3xl p-5 sm:p-7 relative overflow-hidden shadow-lg ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Topo do Bloco com Controles de Navegação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-brand-teal/15 text-brand-teal text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 border border-brand-teal/20">
              <Sparkles className="w-3.5 h-3.5" /> Destaques & Recomendações
            </span>
            {location && (
              <span className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                <Navigation className="w-3 h-3" /> GPS Ativo
              </span>
            )}
          </div>
          <h2 className="text-lg sm:text-xl font-bold font-display text-brand-text">{title}</h2>
          <p className="text-xs text-brand-text-muted mt-0.5 leading-relaxed">{subtitle}</p>
        </div>

        {/* Controles de Navegação e GPS */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {!location && (
            <button
              onClick={requestLocation}
              disabled={geoLoading}
              className="px-3 py-1.5 rounded-xl border border-brand-teal/30 bg-brand-teal/10 hover:bg-brand-teal/20 text-brand-teal text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
              title="Ativar localização para calcular distância exata"
            >
              <Navigation className={`w-3.5 h-3.5 ${geoLoading ? 'animate-spin' : ''}`} />
              <span>Ver mais próximos</span>
            </button>
          )}

          {partners.length > 1 && (
            <div className="flex items-center gap-1 bg-brand-surface-2 border border-brand-border-strong rounded-xl p-1 shadow-xs">
              <button
                onClick={handlePrev}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-brand-text-muted hover:text-brand-text hover:bg-brand-surface transition-colors"
                aria-label="Anúncio anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono font-bold px-2 text-brand-teal">
                {currentIndex + 1} / {partners.length}
              </span>
              <button
                onClick={handleNext}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-brand-text-muted hover:text-brand-text hover:bg-brand-surface transition-colors"
                aria-label="Próximo anúncio"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-10 flex flex-col items-center justify-center text-center">
          <div className="w-7 h-7 border-2 border-brand-teal border-t-transparent rounded-full animate-spin mb-2"></div>
          <p className="text-xs text-brand-text-muted">Buscando estabelecimentos credenciados...</p>
        </div>
      ) : partners.length === 0 ? (
        /* Caso sem parceiros cadastrados no momento */
        <div className="bg-brand-surface-2/40 border border-dashed border-brand-border-strong rounded-2xl p-6 text-center">
          <div className="w-10 h-10 rounded-xl bg-brand-teal/10 text-brand-teal flex items-center justify-center mx-auto mb-2">
            <Building className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-brand-text">Rede de Parceiros em Expansão</h3>
          <p className="text-xs text-brand-text-muted max-w-md mx-auto mt-1">
            Novas clínicas, hospitais 24h e farmácias credenciadas estão sendo homologadas pela equipe VetPro para a sua região.
          </p>
        </div>
      ) : (
        /* Card do Parceiro Ativo com Design Premium */
        <div className="bg-brand-surface-2 border border-brand-border-strong rounded-2xl p-4 sm:p-5 transition-all shadow-sm overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Foto / Logotipo e Informações */}
            <div className="flex items-start gap-3.5 min-w-0 flex-1">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-brand-surface border border-brand-border-strong overflow-hidden flex items-center justify-center shrink-0 shadow-sm relative">
                {currentPartner.logo_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img 
                    src={currentPartner.logo_url} 
                    alt={currentPartner.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-brand-teal/10 text-brand-teal flex items-center justify-center">
                    {getCategoryIcon(currentPartner.category)}
                  </div>
                )}
              </div>

              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-brand-teal/15 text-brand-teal border border-brand-teal/20 inline-flex items-center gap-1 shrink-0">
                    {getCategoryIcon(currentPartner.category)}
                    <span>{currentPartner.banner_badge || getCategoryLabel(currentPartner.category)}</span>
                  </span>

                  {currentPartner.distanceKm !== undefined && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1 shrink-0">
                      <Navigation className="w-3 h-3" />
                      <span>{currentPartner.distanceKm} km</span>
                    </span>
                  )}

                  {currentPartner.rating && (
                    <span className="text-[10px] font-bold text-amber-400 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 shrink-0">
                      <Star className="w-3 h-3 fill-amber-400" />
                      <span>{currentPartner.rating.toFixed(1)}</span>
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-sm sm:text-base text-brand-text truncate">
                  {currentPartner.name}
                </h3>

                {currentPartner.promo_text ? (
                  <div className="text-xs text-brand-teal font-medium flex items-center gap-1.5 bg-brand-teal/10 border border-brand-teal/20 px-2.5 py-1 rounded-lg">
                    <Sparkles className="w-3 h-3 shrink-0 text-amber-400" />
                    <span className="truncate">{currentPartner.promo_text}</span>
                  </div>
                ) : (
                  <p className="text-xs text-brand-text-muted line-clamp-1 leading-relaxed">
                    {currentPartner.description || 'Atendimento veterinário especializado e acolhimento para o seu pet.'}
                  </p>
                )}

                <div className="flex items-center gap-1 text-[11px] text-brand-text-muted pt-0.5">
                  <MapPin className="w-3 h-3 text-brand-teal shrink-0" />
                  <span className="truncate">
                    {currentPartner.address}{currentPartner.neighborhood ? `, ${currentPartner.neighborhood}` : ''} • {currentPartner.city}/{currentPartner.state}
                  </span>
                </div>
              </div>
            </div>

            {/* Ações de Contato Direto para o Tutor */}
            <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0 md:w-48 pt-2 md:pt-0 border-t md:border-t-0 border-brand-border-strong">
              {currentPartner.whatsapp && (
                <a
                  href={`https://wa.me/55${currentPartner.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Encontrei o perfil da ${currentPartner.name} no VetPro Orienta e gostaria de informações.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all text-center"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPartnerModal(currentPartner)}
                  className="px-2.5 py-1.5 rounded-xl bg-brand-surface border border-brand-border-strong hover:border-brand-teal/50 text-brand-text text-xs font-semibold flex items-center justify-center gap-1 transition-all text-center truncate"
                >
                  <Info className="w-3 h-3 text-brand-teal shrink-0" />
                  <span className="truncate">Perfil</span>
                </button>

                <a
                  href={currentPartner.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${currentPartner.name} ${currentPartner.address} ${currentPartner.city} ${currentPartner.state}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-xl bg-brand-surface border border-brand-border-strong hover:border-brand-teal/50 text-brand-text text-xs font-semibold flex items-center justify-center gap-1 transition-all text-center truncate"
                >
                  <Navigation className="w-3 h-3 text-brand-teal shrink-0" />
                  <span className="truncate">Rota</span>
                </a>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Indicadores de Dots (Bolinhas) Estilizadas */}
      {partners.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {partners.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all ${
                currentIndex === idx ? 'w-6 bg-brand-teal' : 'w-1.5 bg-brand-border-strong hover:bg-brand-text-muted'
              }`}
              aria-label={`Ir para anúncio ${idx + 1}`}
            />
          ))}
        </div>
      )}

      {/* Modal de Detalhes do Perfil do Parceiro para o Tutor */}
      {selectedPartnerModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-brand-surface border border-brand-border-strong rounded-3xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-brand-border-strong gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-surface-2 border border-brand-border-strong overflow-hidden flex items-center justify-center flex-shrink-0">
                  {selectedPartnerModal.logo_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={selectedPartnerModal.logo_url} alt={selectedPartnerModal.name} className="w-full h-full object-cover" />
                  ) : (
                    <Building className="w-6 h-6 text-brand-teal" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-base text-brand-text">{selectedPartnerModal.name}</h3>
                  <div className="text-[11px] text-brand-teal font-semibold flex items-center gap-1">
                    {getCategoryIcon(selectedPartnerModal.category)}
                    {getCategoryLabel(selectedPartnerModal.category)}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPartnerModal(null)}
                className="text-brand-text-muted hover:text-brand-text p-1.5 rounded-lg bg-brand-surface-2 text-xs"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              {selectedPartnerModal.promo_text && (
                <div className="bg-brand-teal/10 border border-brand-teal/20 rounded-2xl p-3.5 text-brand-teal">
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-4 h-4 text-amber-400" /> Vantagem Exclusiva para Clientes VetPro
                  </div>
                  <p className="text-[11px] text-brand-text leading-relaxed">{selectedPartnerModal.promo_text}</p>
                </div>
              )}

              {selectedPartnerModal.description && (
                <div>
                  <h4 className="font-bold text-brand-text mb-1">Sobre o Estabelecimento</h4>
                  <p className="text-brand-text-muted leading-relaxed">{selectedPartnerModal.description}</p>
                </div>
              )}

              <div className="bg-brand-surface-2 rounded-2xl p-3.5 space-y-2 text-[11px]">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-brand-teal flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-brand-text">Endereço: </span>
                    <span className="text-brand-text-muted">
                      {selectedPartnerModal.address}{selectedPartnerModal.neighborhood ? `, ${selectedPartnerModal.neighborhood}` : ''}, {selectedPartnerModal.city} - {selectedPartnerModal.state}
                    </span>
                  </div>
                </div>

                {selectedPartnerModal.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-brand-teal flex-shrink-0" />
                    <div>
                      <span className="font-bold text-brand-text">Telefone: </span>
                      <span className="text-brand-text-muted">{selectedPartnerModal.phone}</span>
                    </div>
                  </div>
                )}

                {selectedPartnerModal.whatsapp && (
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <div>
                      <span className="font-bold text-brand-text">WhatsApp: </span>
                      <span className="text-emerald-400 font-medium">{selectedPartnerModal.whatsapp}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-brand-border-strong">
              {selectedPartnerModal.whatsapp && (
                <a
                  href={`https://wa.me/55${selectedPartnerModal.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Gostaria de informações sobre o atendimento da ${selectedPartnerModal.name}.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm text-center"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Conversar no WhatsApp</span>
                </a>
              )}

              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selectedPartnerModal.name} ${selectedPartnerModal.address} ${selectedPartnerModal.city} ${selectedPartnerModal.state}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-4 rounded-xl bg-brand-surface-2 border border-brand-border-strong hover:border-brand-teal text-brand-text font-bold text-xs flex items-center justify-center gap-1.5 text-center"
              >
                <Navigation className="w-4 h-4 text-brand-teal" />
                <span>Abrir Rota no Mapa</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
