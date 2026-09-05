'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { 
  Building, MapPin, Phone, MessageCircle, Navigation, Search, 
  Filter, Star, Sparkles, HeartPulse, Stethoscope, ShoppingBag, 
  Pill, Award, Home, ExternalLink, RefreshCw, AlertCircle,
  ShieldCheck, CheckCircle2, ChevronRight, Info, Settings, Clock, Globe,
  Map, Compass, Check, AlertTriangle, UserCheck, Heart
} from 'lucide-react';
import { 
  Partner, 
  PARTNER_CATEGORIES, 
  getActivePartners,
  getFavoritePartnerIds,
  isPartnerFavorite,
  toggleFavoritePartner
} from '@/lib/partnerService';
import { useGeolocation } from '@/lib/useGeolocation';
import { PartnerRotativeAds } from '@/components/PartnerRotativeAds';
import { isModuleActive, SYSTEM_MODULE_KEYS } from '@/lib/moduleService';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

export default function ParceirosPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(0); // 0 = sem limite
  const [selectedPartnerModal, setSelectedPartnerModal] = useState<Partner | null>(null);
  
  // Favoritos do Tutor
  const [favorites, setFavorites] = useState<string[]>(() => getFavoritePartnerIds());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  // Perfil e requisitos de endereço do tutor
  const [userAddress, setUserAddress] = useState<string>('');
  const [userCity, setUserCity] = useState<string>('');
  const [userState, setUserState] = useState<string>('SP');
  const [userCep, setUserCep] = useState<string>('');
  const [isAddressSaved, setIsAddressSaved] = useState<boolean>(false);
  const [addressLoading, setAddressLoading] = useState<boolean>(true);
  const [isSavingAddress, setIsSavingAddress] = useState<boolean>(false);
  const [showAddressForm, setShowAddressForm] = useState<boolean>(false);

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
  
  const { location, loading: geoLoading, gpsLoading, ipLoading, error: geoError, requestLocation, detectLocationByIp } = useGeolocation();

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Cidade e estado efetivos (do perfil salvo ou detectados automaticamente pelo IP/GPS)
  const effectiveCity = userCity || location?.city || '';
  const effectiveState = userState || location?.state || 'SP';

  // Escuta mudanças de favoritos
  useEffect(() => {
    const handleFavChange = () => {
      setFavorites(getFavoritePartnerIds());
    };
    window.addEventListener('vetpro_favorites_changed', handleFavChange);
    return () => window.removeEventListener('vetpro_favorites_changed', handleFavChange);
  }, []);

  const handleToggleFavorite = (partner: Partner) => {
    const isNowFav = toggleFavoritePartner(partner.id);
    if (isNowFav) {
      showToast(`❤️ "${partner.name}" adicionado aos seus favoritos!`, 'success');
    } else {
      showToast(`"${partner.name}" removido dos favoritos.`, 'info');
    }
  };

  // Carrega dados de endereço do perfil do tutor
  useEffect(() => {
    async function loadUserProfile() {
      try {
        let email = '';
        if (typeof window !== 'undefined') {
          email = localStorage.getItem('vetpro_user_email') || '';
          const savedStreet = localStorage.getItem('vetpro_user_street') || '';
          const savedCity = localStorage.getItem('vetpro_user_city') || '';
          const savedState = localStorage.getItem('vetpro_user_state') || '';
          const savedCep = localStorage.getItem('vetpro_user_cep') || '';

          if (savedStreet || savedCity) {
            setUserAddress(savedStreet);
            setUserCity(savedCity || '');
            setUserState(savedState || 'SP');
            setUserCep(savedCep);
            setIsAddressSaved(true);
          }
        }

        if (email && isSupabaseConfigured()) {
          const supabase = getSupabaseClient();
          const { data } = await supabase
            .from('user_profiles')
            .select('street, city, state, cep, neighborhood')
            .eq('email', email.toLowerCase().trim())
            .maybeSingle();

          if (data && (data.street || data.city)) {
            setUserAddress(data.street || '');
            setUserCity(data.city || '');
            setUserState(data.state || 'SP');
            setUserCep(data.cep || '');
            setIsAddressSaved(true);
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar perfil de endereço:', err);
      } finally {
        setAddressLoading(false);
      }
    }

    loadUserProfile();
  }, []);

  // Monitora mudanças nos módulos
  useEffect(() => {
    const handleModuleChange = () => {
      setIsModuleEnabled(isModuleActive(SYSTEM_MODULE_KEYS.PARCEIROS_GPS));
    };
    window.addEventListener('vetpro_modules_changed', handleModuleChange);
    return () => window.removeEventListener('vetpro_modules_changed', handleModuleChange);
  }, []);

  // O tutor pode navegar se tiver endereço ou GPS ativo (ou admin/super_admin)
  const isRequirementsMet = useMemo(() => {
    if (userRole === 'admin' || userRole === 'super_admin') return true;
    const hasAddress = Boolean(userAddress && userAddress.trim().length > 3) || Boolean(effectiveCity && effectiveCity.trim().length > 2);
    const hasGeo = Boolean(location && location.latitude && location.longitude);
    return hasAddress || hasGeo;
  }, [userRole, userAddress, effectiveCity, location]);

  // Carrega estabelecimentos reais na região
  const fetchPartnersData = useCallback(async () => {
    setLoading(true);
    const coords = location ? { latitude: location.latitude, longitude: location.longitude } : null;

    try {
      const data = await getActivePartners(coords, {
        address: userAddress,
        city: effectiveCity || '',
        state: effectiveState || 'SP',
        includeGooglePlaces: true,
      });

      setPartners(data);
    } catch (err) {
      console.warn('Erro ao carregar lista de parceiros:', err);
    } finally {
      setLoading(false);
    }
  }, [location, userAddress, effectiveCity, effectiveState]);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      if (isMounted) {
        await fetchPartnersData();
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, [fetchPartnersData]);

  // Salva endereço rápido no perfil do tutor via API Server Route segura
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userCity.trim()) {
      showToast('Por favor, informe ao menos a sua Cidade.', 'info');
      return;
    }

    setIsSavingAddress(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('vetpro_user_street', userAddress.trim());
        localStorage.setItem('vetpro_user_city', userCity.trim());
        localStorage.setItem('vetpro_user_state', userState.trim().toUpperCase());
        localStorage.setItem('vetpro_user_cep', userCep.trim());
      }

      const email = typeof window !== 'undefined' ? localStorage.getItem('vetpro_user_email') : '';
      const customUrl = typeof window !== 'undefined' ? localStorage.getItem('vetpro_supabase_url') || '' : '';
      const customKey = typeof window !== 'undefined' ? localStorage.getItem('vetpro_supabase_anon_key') || '' : '';

      if (email) {
        await fetch('/api/profile/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            profileData: {
              street: userAddress.trim(),
              city: userCity.trim(),
              state: userState.trim().toUpperCase(),
              cep: userCep.trim(),
            },
            customUrl,
            customKey,
          }),
        });
      }

      setIsAddressSaved(true);
      setShowAddressForm(false);
      showToast('Endereço salvo com sucesso! Atualizando estabelecimentos da região...');
      fetchPartnersData();
    } catch (err) {
      console.warn('Erro ao salvar endereço:', err);
      showToast('Endereço salvo localmente.', 'info');
      fetchPartnersData();
    } finally {
      setIsSavingAddress(false);
    }
  };

  // Busca CEP via ViaCEP
  const handleCepLookup = async (cepValue: string) => {
    const clean = cepValue.replace(/\D/g, '');
    if (clean.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        const data = await res.json();
        if (!data.erro) {
          if (data.logradouro) setUserAddress(data.logradouro);
          if (data.localidade) setUserCity(data.localidade);
          if (data.uf) setUserState(data.uf);
        }
      } catch (err) {
        console.warn('Falha ViaCEP:', err);
      }
    }
  };

  const filteredPartners = useMemo(() => {
    return partners.filter((p) => {
      // Filtro de Favoritos
      if (showFavoritesOnly && !favorites.includes(p.id)) {
        return false;
      }

      // Filtro de texto
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(term);
        const matchesCity = p.city.toLowerCase().includes(term);
        const matchesNeigh = (p.neighborhood || '').toLowerCase().includes(term);
        const matchesAddress = p.address.toLowerCase().includes(term);
        const matchesDesc = (p.description || '').toLowerCase().includes(term);
        if (!matchesName && !matchesCity && !matchesNeigh && !matchesAddress && !matchesDesc) {
          return false;
        }
      }

      // Filtro de categoria
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }

      // Filtro de distância
      if (maxDistanceKm > 0 && p.distanceKm !== undefined && p.distanceKm > maxDistanceKm) {
        return false;
      }

      return true;
    });
  }, [partners, showFavoritesOnly, favorites, searchTerm, selectedCategory, maxDistanceKm]);

  const getCategoryIcon = (category: Partner['category']) => {
    switch (category) {
      case 'hospital_24h': return <HeartPulse className="w-4 h-4 text-rose-400" />;
      case 'clinica': return <Stethoscope className="w-4 h-4 text-brand-teal" />;
      case 'pet_shop': return <ShoppingBag className="w-4 h-4 text-amber-400" />;
      case 'farmacia': return <Pill className="w-4 h-4 text-emerald-400" />;
      case 'adestramento': return <Award className="w-4 h-4 text-indigo-400" />;
      case 'hotel_pet': return <Home className="w-4 h-4 text-blue-400" />;
      case 'especialista': return <Sparkles className="w-4 h-4 text-purple-400" />;
      default: return <Building className="w-4 h-4 text-brand-teal" />;
    }
  };

  const getCategoryLabel = (category: Partner['category']) => {
    const found = PARTNER_CATEGORIES.find(c => c.id === category);
    return found ? found.label : 'Estabelecimento';
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text p-4 sm:p-6 lg:p-8">
      {/* Toast Notificação */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-brand-surface border border-brand-teal/40 text-brand-text px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-brand-teal shrink-0" />
          <span className="text-xs font-semibold">{toastMessage.text}</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        
        {/* Header da Página */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-brand-teal/15 text-brand-teal text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-brand-teal/20">
                <Navigation className="w-3.5 h-3.5" /> Geolocalização & Estabelecimentos Reais
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-brand-text">
              Guia de Estabelecimentos & Parceiros
            </h1>
            <p className="text-brand-text-muted text-xs sm:text-sm mt-1 leading-relaxed">
              Encontre hospitais 24h, clínicas veterinárias, pet shops e farmácias reais na sua cidade ou endereço com rota no Google Maps.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {userRole === 'super_admin' && (
              <Link
                href="/dashboard/admin/cadastros"
                className="px-3.5 py-2 rounded-xl bg-brand-surface-2 border border-brand-teal/40 text-brand-teal font-semibold text-xs hover:bg-brand-teal/10 transition-all flex items-center gap-1.5 shadow-xs"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Gerenciar Parceiros (Admin)</span>
              </Link>
            )}

            <button
              onClick={() => {
                requestLocation();
                showToast('Solicitando localização GPS de alta precisão ao navegador...');
              }}
              disabled={geoLoading}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs flex items-center gap-2 disabled:opacity-50 ${
                location?.source === 'gps'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25' 
                  : 'bg-brand-teal text-brand-bg hover:bg-brand-teal/90'
              }`}
            >
              <Navigation className={`w-3.5 h-3.5 ${geoLoading ? 'animate-spin' : ''}`} />
              <span>
                {location?.source === 'gps' 
                  ? 'GPS Conectado (Alta Precisão)' 
                  : location?.source === 'ip'
                  ? 'Localizado por IP • Usar GPS'
                  : 'Ativar Localização GPS'}
              </span>
            </button>
          </div>
        </div>

        {/* Card de Configuração de Região / Endereço do Tutor */}
        <div className="bg-brand-surface-2 border border-brand-border-strong rounded-3xl p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-teal/15 text-brand-teal flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm sm:text-base text-brand-text flex items-center gap-2">
                    Região de Busca: <span className="text-brand-teal">{effectiveCity ? `${effectiveCity}, ${effectiveState}` : 'Detectando...'}</span>
                  </h3>
                  {location?.source === 'gps' ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> GPS Ativo
                    </span>
                  ) : location?.source === 'ip' ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-teal/15 text-brand-teal border border-brand-teal/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-teal"></span> IP da Conexão
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-brand-text-muted mt-0.5">
                  {userAddress 
                    ? `${userAddress} ${userCep ? `(CEP: ${userCep})` : ''}` 
                    : location?.city 
                    ? `Localizado em ${location.city}/${location.state}. Você pode refinar seu endereço exato abaixo.`
                    : 'Preencha seu endereço ou cidade para encontrar os estabelecimentos mais próximos de você.'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowAddressForm(!showAddressForm)}
              className="px-3.5 py-2 rounded-xl bg-brand-surface border border-brand-border-strong hover:border-brand-teal/40 text-brand-text font-semibold text-xs transition-all shrink-0 flex items-center gap-1.5"
            >
              <MapPin className="w-3.5 h-3.5 text-brand-teal" />
              <span>{showAddressForm ? 'Fechar Edição' : 'Alterar Região / Endereço'}</span>
            </button>
          </div>

          {/* Formulário Rápido de Endereço */}
          {showAddressForm && (
            <form onSubmit={handleSaveAddress} className="mt-5 pt-5 border-t border-brand-border-strong space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-brand-text-muted mb-1">CEP</label>
                  <input
                    type="text"
                    placeholder="00000-000"
                    value={userCep}
                    onChange={(e) => {
                      setUserCep(e.target.value);
                      handleCepLookup(e.target.value);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-brand-surface border border-brand-border-strong text-brand-text text-xs focus:outline-none focus:border-brand-teal"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-brand-text-muted mb-1">Logradouro / Bairro</label>
                  <input
                    type="text"
                    placeholder="Ex: Av. Paulista, 1000 - Bela Vista"
                    value={userAddress}
                    onChange={(e) => setUserAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-brand-surface border border-brand-border-strong text-brand-text text-xs focus:outline-none focus:border-brand-teal"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 sm:col-span-1">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-semibold text-brand-text-muted mb-1">Cidade *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: São Paulo"
                      value={userCity}
                      onChange={(e) => setUserCity(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-brand-surface border border-brand-border-strong text-brand-text text-xs focus:outline-none focus:border-brand-teal"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-brand-text-muted mb-1">UF *</label>
                    <input
                      type="text"
                      required
                      maxLength={2}
                      placeholder="SP"
                      value={userState}
                      onChange={(e) => setUserState(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 rounded-xl bg-brand-surface border border-brand-border-strong text-brand-text text-xs focus:outline-none focus:border-brand-teal uppercase"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddressForm(false)}
                  className="py-2 px-4 rounded-xl bg-brand-surface border border-brand-border-strong text-brand-text-muted hover:text-brand-text font-semibold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingAddress}
                  className="py-2 px-5 rounded-xl bg-brand-teal hover:bg-brand-teal/90 text-brand-bg font-bold text-xs transition-all shadow-xs disabled:opacity-50"
                >
                  {isSavingAddress ? 'Salvando...' : 'Buscar Estabelecimentos Nesta Região'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Anúncios e Destaques Rotativos */}
        <PartnerRotativeAds 
          title="Destaques & Recomendações de Saúde Animal"
          subtitle="Estabelecimentos credenciados e hospitais 24h em destaque na sua região com suporte direto."
          isSuperAdmin={userRole === 'super_admin'}
        />

        {/* Bloco de Busca, Filtros de Categoria, Distância e Favoritos */}
        <div className="bg-brand-surface-2 border border-brand-border-strong rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm">
          
          {/* Linha 1: Input de Busca Textual e Filtro de Raio */}
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-brand-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nome do hospital, clínica, pet shop, bairro ou serviço..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-brand-surface border border-brand-border-strong text-brand-text placeholder-brand-text-muted text-xs sm:text-sm focus:outline-none focus:border-brand-teal transition-all"
              />
            </div>

            {/* Seletor de Raio de Distância */}
            <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
              <span className="text-xs text-brand-text-muted whitespace-nowrap font-medium">Distância:</span>
              <select
                value={maxDistanceKm}
                onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
                className="px-3 py-2.5 rounded-xl bg-brand-surface border border-brand-border-strong text-brand-text text-xs focus:outline-none focus:border-brand-teal"
              >
                <option value={0}>Sem limite (Todos)</option>
                <option value={5}>Até 5 km</option>
                <option value={10}>Até 10 km</option>
                <option value={20}>Até 20 km</option>
                <option value={50}>Até 50 km</option>
              </select>

              <button
                onClick={fetchPartnersData}
                className="p-2.5 rounded-xl bg-brand-surface border border-brand-border-strong hover:border-brand-teal/50 text-brand-teal transition-all"
                title="Recarregar busca na região"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Linha 2: Pílulas de Categoria + Botão de Favoritos */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            
            {/* Pílula: Meus Favoritos */}
            <button
              onClick={() => {
                setShowFavoritesOnly(!showFavoritesOnly);
                if (!showFavoritesOnly) setSelectedCategory('all');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                showFavoritesOnly
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'bg-brand-surface text-brand-text-muted hover:text-rose-400 border border-brand-border-strong'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${showFavoritesOnly ? 'fill-white' : ''}`} />
              <span>Meus Favoritos</span>
              {favorites.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${showFavoritesOnly ? 'bg-black/20' : 'bg-rose-500/15 text-rose-400'}`}>
                  {favorites.length}
                </span>
              )}
            </button>

            {/* Pílula: Todos */}
            <button
              onClick={() => {
                setShowFavoritesOnly(false);
                setSelectedCategory('all');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                !showFavoritesOnly && selectedCategory === 'all'
                  ? 'bg-brand-teal text-brand-bg shadow-xs'
                  : 'bg-brand-surface text-brand-text-muted hover:text-brand-text border border-brand-border-strong'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>Todos ({partners.length})</span>
            </button>

            {PARTNER_CATEGORIES.map((cat) => {
              const count = partners.filter(p => p.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setShowFavoritesOnly(false);
                    setSelectedCategory(cat.id);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                    !showFavoritesOnly && selectedCategory === cat.id
                      ? 'bg-brand-teal text-brand-bg shadow-xs'
                      : 'bg-brand-surface text-brand-text-muted hover:text-brand-text border border-brand-border-strong'
                  }`}
                >
                  {getCategoryIcon(cat.id)}
                  <span>{cat.label}</span>
                  {count > 0 && <span className="text-[10px] opacity-75 font-mono">({count})</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid de Estabelecimentos Reais */}
        <div>
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <div className="w-8 h-8 border-2 border-brand-teal border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-sm font-semibold text-brand-text">Buscando estabelecimentos reais na sua região...</p>
              <p className="text-xs text-brand-text-muted mt-1">Localizando clínicas veterinárias, pet shops e hospitais 24h</p>
            </div>
          ) : filteredPartners.length === 0 ? (
            <div className="bg-brand-surface-2/60 border border-dashed border-brand-border-strong rounded-3xl p-10 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-surface border border-brand-border-strong flex items-center justify-center mx-auto text-brand-teal/50">
                {showFavoritesOnly ? <Heart className="w-6 h-6 text-rose-400" /> : <Building className="w-6 h-6" />}
              </div>
              
              <div className="space-y-1">
                <h3 className="font-bold text-base text-brand-text">
                  {showFavoritesOnly ? 'Você ainda não possui estabelecimentos favoritados' : 'Nenhum estabelecimento encontrado nesta área'}
                </h3>
                <p className="text-xs text-brand-text-muted max-w-md mx-auto">
                  {showFavoritesOnly
                    ? 'Clique no ícone de coração nos cards de estabelecimentos para salvar seus hospitais e clínicas preferidas aqui.'
                    : `Não encontramos cadastros para os filtros selecionados na região de ${userCity || 'busca'}. Você pode alterar a cidade ou buscar ao vivo no Google Maps.`}
                </p>
              </div>

              {!showFavoritesOnly && (
                <div className="pt-2">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`clinica veterinaria pet shop hospital 24h ${userCity || ''} ${userState || ''}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-teal text-brand-bg font-bold text-xs hover:bg-brand-teal/90 transition-all shadow-xs"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>Abrir Busca no Google Maps</span>
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPartners.map((partner) => {
                const isFav = favorites.includes(partner.id);
                return (
                  <div
                    key={partner.id}
                    className="bg-brand-surface border border-brand-border-strong rounded-2xl p-5 hover:border-brand-teal/40 transition-all flex flex-col justify-between shadow-xs relative overflow-hidden group"
                  >
                    <div>
                      {/* Topo do Card: Badge + Distância + Botão Favoritar */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-teal/15 text-brand-teal border border-brand-teal/20 flex items-center gap-1">
                          {getCategoryIcon(partner.category)}
                          <span>{partner.banner_badge || getCategoryLabel(partner.category)}</span>
                        </span>

                        <div className="flex items-center gap-2">
                          {partner.distanceKm !== undefined && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 shrink-0">
                              <Navigation className="w-3 h-3" /> {partner.distanceKm} km
                            </span>
                          )}

                          {/* Botão de Favoritar do Tutor */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavorite(partner);
                            }}
                            className={`p-1.5 rounded-lg border transition-all ${
                              isFav
                                ? 'bg-rose-500/15 border-rose-500/40 text-rose-500 hover:bg-rose-500/25'
                                : 'bg-brand-surface-2 border-brand-border-strong text-brand-text-muted hover:text-rose-400 hover:border-rose-400/40'
                            }`}
                            title={isFav ? 'Remover dos favoritos' : 'Favoritar estabelecimento'}
                          >
                            <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-500' : ''}`} />
                          </button>
                        </div>
                      </div>

                      {/* Header com Logo e Nome */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-14 h-14 rounded-xl bg-brand-surface-2 border border-brand-border-strong overflow-hidden flex items-center justify-center shrink-0">
                          {partner.logo_url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={partner.logo_url} alt={partner.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full text-brand-teal flex items-center justify-center">
                              {getCategoryIcon(partner.category)}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-sm sm:text-base text-brand-text line-clamp-1 group-hover:text-brand-teal transition-colors">
                            {partner.name}
                          </h3>
                          
                          <div className="flex items-center gap-2 mt-1">
                            {partner.rating && (
                              <span className="text-[11px] font-bold text-amber-400 flex items-center gap-0.5">
                                <Star className="w-3 h-3 fill-amber-400" /> {partner.rating.toFixed(1)}
                                {partner.reviews_count && <span className="text-brand-text-muted text-[10px]">({partner.reviews_count})</span>}
                              </span>
                            )}

                            {partner.open_now !== undefined && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${partner.open_now ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                                {partner.open_now ? 'Aberto Agora' : 'Fechado'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Endereço */}
                      <div className="flex items-start gap-1.5 text-xs text-brand-text-muted mb-3">
                        <MapPin className="w-3.5 h-3.5 text-brand-teal shrink-0 mt-0.5" />
                        <span className="line-clamp-2 leading-relaxed">
                          {partner.address}{partner.neighborhood ? `, ${partner.neighborhood}` : ''} • {partner.city}/{partner.state}
                        </span>
                      </div>

                      {/* Descrição / Promoção */}
                      {partner.promo_text ? (
                        <div className="text-[11px] text-brand-teal font-medium flex items-center gap-1.5 bg-brand-teal/10 border border-brand-teal/20 px-2.5 py-1.5 rounded-lg mb-3">
                          <Sparkles className="w-3 h-3 shrink-0 text-amber-400" />
                          <span className="line-clamp-1">{partner.promo_text}</span>
                        </div>
                      ) : partner.description ? (
                        <p className="text-[11px] text-brand-text-muted line-clamp-2 leading-relaxed mb-3">
                          {partner.description}
                        </p>
                      ) : null}
                    </div>

                    {/* Rodapé do Card: Ações de Contato & Mapa */}
                    <div className="space-y-2 pt-3 border-t border-brand-border-strong">
                      {partner.whatsapp && (
                        <a
                          href={`https://wa.me/55${partner.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Localizei a ${partner.name} no VetPro Orienta e gostaria de informações.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Chamar no WhatsApp</span>
                        </a>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedPartnerModal(partner)}
                          className="py-1.5 px-2 rounded-xl bg-brand-surface-2 border border-brand-border-strong hover:border-brand-teal/50 text-brand-text text-xs font-semibold flex items-center justify-center gap-1 transition-all"
                        >
                          <Info className="w-3.5 h-3.5 text-brand-teal" />
                          <span>Detalhes</span>
                        </button>

                        <a
                          href={partner.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${partner.name} ${partner.address} ${partner.city} ${partner.state}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-1.5 px-2 rounded-xl bg-brand-surface-2 border border-brand-border-strong hover:border-brand-teal/50 text-brand-text text-xs font-semibold flex items-center justify-center gap-1 transition-all"
                        >
                          <Navigation className="w-3.5 h-3.5 text-brand-teal" />
                          <span>Traçar Rota</span>
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal de Detalhes do Estabelecimento */}
        {selectedPartnerModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-brand-surface border border-brand-border-strong rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-brand-surface-2 border border-brand-border-strong overflow-hidden flex items-center justify-center shrink-0">
                    {selectedPartnerModal.logo_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={selectedPartnerModal.logo_url} alt={selectedPartnerModal.name} className="w-full h-full object-cover" />
                    ) : (
                      getCategoryIcon(selectedPartnerModal.category)
                    )}
                  </div>
                  <div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-teal/15 text-brand-teal border border-brand-teal/20 inline-block mb-1">
                      {getCategoryLabel(selectedPartnerModal.category)}
                    </span>
                    <h3 className="font-bold text-lg text-brand-text">{selectedPartnerModal.name}</h3>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedPartnerModal(null)}
                  className="p-2 rounded-full hover:bg-brand-surface-2 text-brand-text-muted hover:text-brand-text"
                >
                  ✕
                </button>
              </div>

              {selectedPartnerModal.description && (
                <div className="p-4 rounded-2xl bg-brand-surface-2/60 border border-brand-border-strong text-xs text-brand-text leading-relaxed">
                  {selectedPartnerModal.description}
                </div>
              )}

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-brand-text">
                  <MapPin className="w-4 h-4 text-brand-teal shrink-0" />
                  <span>{selectedPartnerModal.address} - {selectedPartnerModal.city}/{selectedPartnerModal.state}</span>
                </div>

                {selectedPartnerModal.phone && (
                  <div className="flex items-center gap-2 text-brand-text">
                    <Phone className="w-4 h-4 text-brand-teal shrink-0" />
                    <span>{selectedPartnerModal.phone}</span>
                  </div>
                )}

                {selectedPartnerModal.distanceKm !== undefined && (
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                    <Navigation className="w-4 h-4 shrink-0" />
                    <span>Distância aproximada: {selectedPartnerModal.distanceKm} km do seu endereço</span>
                  </div>
                )}
              </div>

              {/* Botão de Favoritar no Modal */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-brand-surface-2 border border-brand-border-strong">
                <span className="text-xs text-brand-text-muted">Salvar na sua lista pessoal:</span>
                <button
                  type="button"
                  onClick={() => handleToggleFavorite(selectedPartnerModal)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                    favorites.includes(selectedPartnerModal.id)
                      ? 'bg-rose-500 text-white border-rose-500'
                      : 'bg-brand-surface text-brand-text-muted hover:text-rose-400 border-brand-border-strong'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${favorites.includes(selectedPartnerModal.id) ? 'fill-current' : ''}`} />
                  <span>{favorites.includes(selectedPartnerModal.id) ? 'Favoritado ❤️' : 'Adicionar aos Favoritos'}</span>
                </button>
              </div>

              <div className={`grid gap-3 pt-2 ${selectedPartnerModal.whatsapp ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                {selectedPartnerModal.whatsapp && (
                  <a
                    href={`https://wa.me/55${selectedPartnerModal.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Localizei a ${selectedPartnerModal.name} no VetPro Orienta.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp Direto</span>
                  </a>
                )}

                <a
                  href={selectedPartnerModal.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selectedPartnerModal.name} ${selectedPartnerModal.address}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-4 rounded-xl bg-brand-teal text-brand-bg font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Abrir no Google Maps</span>
                </a>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
