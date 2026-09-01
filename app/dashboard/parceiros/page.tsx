'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Building, MapPin, Phone, MessageCircle, Navigation, Search, 
  Filter, Star, Sparkles, HeartPulse, Stethoscope, ShoppingBag, 
  Pill, Award, Home, ExternalLink, RefreshCw, AlertCircle, ArrowUpDown,
  ShieldCheck, CheckCircle2, ChevronRight, Info, Settings, Clock, Globe
} from 'lucide-react';
import { Partner, PARTNER_CATEGORIES, getActivePartners } from '@/lib/partnerService';
import { useGeolocation } from '@/lib/useGeolocation';
import { PartnerRotativeAds } from '@/components/PartnerRotativeAds';
import { isModuleActive, toggleSystemModule, SYSTEM_MODULE_KEYS } from '@/lib/moduleService';
import { Power, Crown, AlertTriangle } from 'lucide-react';

export default function ParceirosPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(0); // 0 = sem limite
  const [selectedPartnerModal, setSelectedPartnerModal] = useState<Partner | null>(null);
  const [userRole, setUserRole] = useState<'tutor' | 'admin' | 'super_admin'>(() => {
    if (typeof window !== 'undefined') {
      const storedRole = localStorage.getItem('vetpro_user_role') as 'tutor' | 'admin' | 'super_admin' | null;
      if (storedRole) return storedRole;
    }
    return 'tutor';
  });
  const [isModuleEnabled, setIsModuleEnabled] = useState<boolean>(() => {
    return isModuleActive(SYSTEM_MODULE_KEYS.PARCEIROS_GPS);
  });
  const [togglingModule, setTogglingModule] = useState(false);
  
  const { location, loading: geoLoading, error: geoError, requestLocation } = useGeolocation();

  useEffect(() => {
    const handleModuleChange = () => {
      setIsModuleEnabled(isModuleActive(SYSTEM_MODULE_KEYS.PARCEIROS_GPS));
    };
    window.addEventListener('vetpro_modules_changed', handleModuleChange);
    return () => window.removeEventListener('vetpro_modules_changed', handleModuleChange);
  }, []);

  const handleToggleModule = async () => {
    if (userRole !== 'super_admin') return;
    setTogglingModule(true);
    const newStatus = !isModuleEnabled;
    await toggleSystemModule(SYSTEM_MODULE_KEYS.PARCEIROS_GPS, newStatus);
    setIsModuleEnabled(newStatus);
    setTogglingModule(false);
  };

  const loadData = async () => {
    setLoading(true);
    const coords = location ? { latitude: location.latitude, longitude: location.longitude } : null;
    const data = await getActivePartners(coords);
    setPartners(data);
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const coords = location ? { latitude: location.latitude, longitude: location.longitude } : null;
      const data = await getActivePartners(coords);
      if (active) {
        setPartners(data);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [location]);

  const filteredPartners = useMemo(() => {
    return partners.filter((p) => {
      // Filtro de texto
      const matchesSearch = 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.neighborhood && p.neighborhood.toLowerCase().includes(searchTerm.toLowerCase())) ||
        p.address.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro de categoria
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;

      // Filtro de distância
      const matchesDistance = maxDistanceKm === 0 || (p.distanceKm !== undefined && p.distanceKm <= maxDistanceKm);

      return matchesSearch && matchesCategory && matchesDistance;
    });
  }, [partners, searchTerm, selectedCategory, maxDistanceKm]);

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
    const found = PARTNER_CATEGORIES.find(c => c.id === category);
    return found ? found.label : 'Estabelecimento';
  };

  return (
    <div className="p-4 sm:p-8 h-full overflow-y-auto bg-brand-bg scroll-smooth">
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        
        {/* Header da Página */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-brand-teal/15 text-brand-teal text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-brand-teal/20">
                <Navigation className="w-3.5 h-3.5" /> Geolocalização & Guia Oficial
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-brand-text">
              Rede de Parceiros Credenciados
            </h1>
            <p className="text-brand-text-muted text-xs sm:text-sm mt-1 leading-relaxed">
              Consulte hospitais 24h, clínicas veterinárias, especialistas e farmácias credenciadas mais próximas de você.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {/* Botão exclusivo para Super Admin */}
            {userRole === 'super_admin' && (
              <Link
                href="/dashboard/admin/cadastros"
                className="px-3.5 py-2 rounded-xl bg-brand-surface-2 border border-brand-teal/40 text-brand-teal font-semibold text-xs hover:bg-brand-teal/10 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Gerenciar Parceiros (Super Admin)</span>
              </Link>
            )}

            <button
              onClick={requestLocation}
              disabled={geoLoading}
              className="px-4 py-2.5 rounded-xl bg-brand-teal text-brand-bg font-bold text-xs hover:bg-brand-teal/90 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Navigation className={`w-4 h-4 ${geoLoading ? 'animate-spin' : ''}`} />
              <span>{location ? 'Localização Atualizada' : 'Ativar GPS / Proximidade'}</span>
            </button>
            
            <button
              onClick={loadData}
              className="p-2.5 rounded-xl bg-brand-surface border border-brand-border-strong text-brand-text-muted hover:text-brand-text hover:border-brand-teal/40 transition-colors"
              title="Atualizar lista de parceiros"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Painel de Controle de Módulo para Super Admin */}
        {userRole === 'super_admin' && (
          <div className="bg-brand-surface border border-brand-teal/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-teal/15 text-brand-teal flex items-center justify-center shrink-0 border border-brand-teal/20">
                <Crown className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-brand-text">Controle Modular do Sistema</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isModuleEnabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {isModuleEnabled ? '🟢 Módulo Ativo' : '🔴 Módulo Pausado'}
                  </span>
                </div>
                <p className="text-xs text-brand-text-muted">
                  {isModuleEnabled 
                    ? 'A rede de parceiros, busca GPS e banners de anúncios estão visíveis para os tutores.'
                    : 'Módulo oculto para tutores no menu e na tela inicial. Visível apenas para administração.'}
                </p>
              </div>
            </div>

            <button
              onClick={handleToggleModule}
              disabled={togglingModule}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shrink-0 shadow-sm cursor-pointer ${
                isModuleEnabled 
                  ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25' 
                  : 'bg-brand-teal text-brand-bg hover:bg-brand-teal/90'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{togglingModule ? 'Alterando...' : isModuleEnabled ? 'Pausar Módulo Parceiros' : 'Ativar Módulo Parceiros'}</span>
            </button>
          </div>
        )}

        {/* Aviso caso o módulo esteja desativado para tutores */}
        {!isModuleEnabled && userRole === 'tutor' && (
          <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-brand-text text-base">Rede de Parceiros Temporariamente Indisponível</h3>
            <p className="text-xs text-brand-text-muted max-w-md mx-auto">
              A rede de parceiros e estabelecimentos credenciados está passando por manutenção ou foi pausada pela administração clínica.
            </p>
            <div className="pt-2">
              <Link href="/dashboard" className="px-4 py-2 rounded-xl bg-brand-surface-2 border border-brand-border-strong text-xs font-semibold text-brand-text hover:border-brand-teal">
                Voltar ao Início
              </Link>
            </div>
          </div>
        )}

        {/* Status do GPS / Alertas de Localização */}
        {isModuleEnabled && location ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-emerald-400">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
              <span>GPS Ativo: estabelecimentos ordenados em tempo real pela proximidade da sua localização.</span>
            </div>
            <span className="font-semibold hidden sm:inline">Mais próximos no topo</span>
          </div>
        ) : geoError ? (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3 text-xs text-amber-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{geoError} Você pode utilizar o campo de busca abaixo para pesquisar por bairro, cidade ou nome.</span>
          </div>
        ) : null}

        {/* Carrossel de Anúncios Rotativos em Destaque */}
        <PartnerRotativeAds 
          title="Parceiros em Destaque" 
          subtitle="Benefícios, plantões 24h e descontos exclusivos para tutores cadastrados" 
          isSuperAdmin={userRole === 'super_admin'}
        />

        {/* Filtros e Barra de Busca */}
        <div className="bg-brand-surface border border-brand-border-strong rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            
            {/* Input de Busca */}
            <div className="md:col-span-6 relative">
              <Search className="w-4 h-4 text-brand-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nome, bairro, cidade ou serviço..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-brand-surface-2 border border-brand-border-strong rounded-xl text-xs sm:text-sm text-brand-text placeholder-brand-text-muted focus:outline-none focus:border-brand-teal transition-colors"
              />
            </div>

            {/* Filtro por Categoria */}
            <div className="md:col-span-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2.5 bg-brand-surface-2 border border-brand-border-strong rounded-xl text-xs sm:text-sm text-brand-text focus:outline-none focus:border-brand-teal transition-colors cursor-pointer"
              >
                <option value="all">Todas as Categorias</option>
                {PARTNER_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            </div>

            {/* Filtro de Raio / Distância */}
            <div className="md:col-span-3">
              <select
                value={maxDistanceKm}
                onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-brand-surface-2 border border-brand-border-strong rounded-xl text-xs sm:text-sm text-brand-text focus:outline-none focus:border-brand-teal transition-colors cursor-pointer"
              >
                <option value={0}>Qualquer Distância</option>
                <option value={5}>Até 5 km de você</option>
                <option value={10}>Até 10 km de você</option>
                <option value={20}>Até 20 km de você</option>
                <option value={50}>Até 50 km de você</option>
              </select>
            </div>

          </div>

          {/* Chips Rápidos de Categorias com Flex-Wrap Moderno (Sem barras de rolagem defeituosas) */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-brand-border-strong/40 text-xs">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                selectedCategory === 'all'
                  ? 'bg-brand-teal text-brand-bg shadow-sm'
                  : 'bg-brand-surface-2 text-brand-text-muted hover:text-brand-text border border-brand-border-strong hover:border-brand-teal/30'
              }`}
            >
              Todos os Serviços
            </button>
            {PARTNER_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? 'bg-brand-teal text-brand-bg shadow-sm'
                    : 'bg-brand-surface-2 text-brand-text-muted hover:text-brand-text border border-brand-border-strong hover:border-brand-teal/30'
                }`}
              >
                {getCategoryIcon(cat.id)}
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Grid de Parceiros Cadastrados */}
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-2 border-brand-teal border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs text-brand-text-muted">Carregando parceiros credenciados...</p>
          </div>
        ) : filteredPartners.length === 0 ? (
          <div className="bg-brand-surface border border-dashed border-brand-border-strong rounded-3xl p-8 sm:p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-teal/10 text-brand-teal flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-brand-text">Nenhum parceiro encontrado</h3>
            <p className="text-xs text-brand-text-muted max-w-md mx-auto leading-relaxed">
              {searchTerm || selectedCategory !== 'all' || maxDistanceKm > 0
                ? 'Tente ajustar os filtros ou pesquisar por outro termo para localizar estabelecimentos cadastrados.'
                : 'Nenhum parceiro credenciado foi registrado ainda no sistema.'}
            </p>
            {(searchTerm || selectedCategory !== 'all' || maxDistanceKm > 0) && (
              <button
                onClick={() => { setSearchTerm(''); setSelectedCategory('all'); setMaxDistanceKm(0); }}
                className="px-4 py-2 rounded-xl bg-brand-surface-2 border border-brand-border-strong text-xs text-brand-text font-semibold hover:border-brand-teal transition-colors inline-block"
              >
                Limpar Filtros
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPartners.map((partner) => (
              <div 
                key={partner.id} 
                className="bg-brand-surface border border-brand-border-strong hover:border-brand-teal/50 rounded-2xl p-5 flex flex-col justify-between transition-all group shadow-sm hover:shadow-md"
              >
                <div>
                  {/* Topo do Card */}
                  <div className="flex items-start gap-3.5 mb-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-brand-surface-2 border border-brand-border-strong overflow-hidden flex items-center justify-center flex-shrink-0 shadow-sm">
                      {partner.logo_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={partner.logo_url} alt={partner.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-brand-teal/10 text-brand-teal flex items-center justify-center">
                          {getCategoryIcon(partner.category)}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-teal/15 text-brand-teal border border-brand-teal/20 flex items-center gap-1">
                          {getCategoryIcon(partner.category)}
                          {getCategoryLabel(partner.category)}
                        </span>

                        {partner.distanceKm !== undefined && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                            <Navigation className="w-2.5 h-2.5" />
                            {partner.distanceKm} km
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-sm text-brand-text group-hover:text-brand-teal transition-colors truncate">
                        {partner.name}
                      </h3>

                      {partner.rating && (
                        <div className="flex items-center gap-1 text-[11px] text-amber-400 font-bold mt-0.5">
                          <Star className="w-3 h-3 fill-amber-400" />
                          <span>{partner.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Destaque Promocional / Benefício */}
                  {partner.promo_text && (
                    <div className="bg-brand-surface-2 border border-brand-teal/20 rounded-xl p-2.5 mb-3 text-[11px] text-brand-teal font-medium flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
                      <span className="line-clamp-2">{partner.promo_text}</span>
                    </div>
                  )}

                  {partner.description && !partner.promo_text && (
                    <p className="text-xs text-brand-text-muted line-clamp-2 leading-relaxed mb-3">
                      {partner.description}
                    </p>
                  )}

                  {/* Endereço */}
                  <div className="text-[11px] text-brand-text-muted space-y-1 mb-4">
                    <div className="flex items-start gap-1.5 text-brand-text">
                      <MapPin className="w-3.5 h-3.5 text-brand-teal flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-2">
                        {partner.address}{partner.neighborhood ? `, ${partner.neighborhood}` : ''}, {partner.city}/{partner.state}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ações de Contato Direto para o Tutor */}
                <div className="space-y-2 pt-3 border-t border-brand-border-strong">
                  {partner.whatsapp && (
                    <a
                      href={`https://wa.me/55${partner.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Vi o perfil da ${partner.name} no VetPro Orienta e gostaria de informações.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Conversar no WhatsApp</span>
                    </a>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPartnerModal(partner)}
                      className="py-2 px-2 rounded-xl bg-brand-surface-2 border border-brand-border-strong hover:border-brand-teal/40 text-brand-text text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors text-center"
                    >
                      <Info className="w-3 h-3 text-brand-teal" />
                      <span>Ver Perfil</span>
                    </button>

                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${partner.name} ${partner.address} ${partner.city} ${partner.state}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-2 rounded-xl bg-brand-surface-2 border border-brand-border-strong hover:border-brand-teal/40 text-brand-text text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors text-center"
                    >
                      <Navigation className="w-3 h-3 text-brand-teal" />
                      <span>Como Chegar</span>
                    </a>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>

      {/* Modal de Perfil Completo do Parceiro para Tutores */}
      {selectedPartnerModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-brand-surface border border-brand-border-strong rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            
            {/* Topo do Modal */}
            <div className="flex items-start justify-between pb-4 border-b border-brand-border-strong gap-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-brand-surface-2 border border-brand-border-strong overflow-hidden flex items-center justify-center flex-shrink-0">
                  {selectedPartnerModal.logo_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={selectedPartnerModal.logo_url} alt={selectedPartnerModal.name} className="w-full h-full object-cover" />
                  ) : (
                    <Building className="w-7 h-7 text-brand-teal" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-brand-text">{selectedPartnerModal.name}</h3>
                  <div className="text-xs text-brand-teal font-semibold flex items-center gap-1.5 mt-0.5">
                    {getCategoryIcon(selectedPartnerModal.category)}
                    {getCategoryLabel(selectedPartnerModal.category)}
                    {selectedPartnerModal.distanceKm !== undefined && (
                      <span className="text-emerald-400 font-normal">
                        • {selectedPartnerModal.distanceKm} km
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPartnerModal(null)}
                className="text-brand-text-muted hover:text-brand-text p-1.5 rounded-xl bg-brand-surface-2 hover:bg-brand-border-strong transition-colors text-xs"
              >
                ✕
              </button>
            </div>

            {/* Conteúdo do Perfil */}
            <div className="py-4 space-y-4 text-xs">
              {selectedPartnerModal.promo_text && (
                <div className="bg-brand-teal/10 border border-brand-teal/20 rounded-2xl p-3.5 text-brand-teal">
                  <div className="font-bold flex items-center gap-1.5 mb-1 text-xs">
                    <Sparkles className="w-4 h-4 text-amber-400" /> Benefício para Clientes VetPro
                  </div>
                  <p className="text-[11px] text-brand-text leading-relaxed">{selectedPartnerModal.promo_text}</p>
                </div>
              )}

              {selectedPartnerModal.description && (
                <div>
                  <h4 className="font-bold text-brand-text mb-1">Apresentação</h4>
                  <p className="text-brand-text-muted leading-relaxed">{selectedPartnerModal.description}</p>
                </div>
              )}

              <div className="bg-brand-surface-2 rounded-2xl p-4 space-y-2.5 text-xs">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-brand-teal flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-brand-text">Localização: </span>
                    <span className="text-brand-text-muted">
                      {selectedPartnerModal.address}{selectedPartnerModal.neighborhood ? `, ${selectedPartnerModal.neighborhood}` : ''}, {selectedPartnerModal.city} - {selectedPartnerModal.state}
                    </span>
                  </div>
                </div>

                {selectedPartnerModal.phone && (
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-brand-teal flex-shrink-0" />
                    <div>
                      <span className="font-bold text-brand-text">Telefone: </span>
                      <a href={`tel:${selectedPartnerModal.phone.replace(/\D/g, '')}`} className="text-brand-text-muted hover:text-brand-teal underline">
                        {selectedPartnerModal.phone}
                      </a>
                    </div>
                  </div>
                )}

                {selectedPartnerModal.whatsapp && (
                  <div className="flex items-center gap-2.5">
                    <MessageCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <div>
                      <span className="font-bold text-brand-text">WhatsApp Oficial: </span>
                      <span className="text-emerald-400 font-medium">{selectedPartnerModal.whatsapp}</span>
                    </div>
                  </div>
                )}

                {selectedPartnerModal.website && (
                  <div className="flex items-center gap-2.5">
                    <Globe className="w-4 h-4 text-brand-teal flex-shrink-0" />
                    <div>
                      <span className="font-bold text-brand-text">Website: </span>
                      <a href={selectedPartnerModal.website.startsWith('http') ? selectedPartnerModal.website : `https://${selectedPartnerModal.website}`} target="_blank" rel="noopener noreferrer" className="text-brand-teal hover:underline truncate">
                        {selectedPartnerModal.website}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Ações Inferiores do Modal */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-3 border-t border-brand-border-strong">
              {selectedPartnerModal.whatsapp && (
                <a
                  href={`https://wa.me/55${selectedPartnerModal.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Encontrei a ${selectedPartnerModal.name} no VetPro Orienta e gostaria de informações.`)}`}
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
                <span>Traçar Rota</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
