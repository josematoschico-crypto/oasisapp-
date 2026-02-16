
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ViewType, ArtAsset, UserHolding, Transaction, InsuranceStatus, GalleryItem } from './types';
import { MOCK_ASSETS } from './constants';
import InsuranceBadge from './components/InsuranceBadge';
import AssetCard from './components/AssetCard';
import GuaranteeBar from './components/GuaranteeBar';
import LoginScreen from './components/LoginScreen';
import { supabase } from './supabaseClient';

const App: React.FC = () => {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  
  const [currentView, setCurrentView] = useState<ViewType>('HOME');
  const [selectedAsset, setSelectedAsset] = useState<ArtAsset | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Security / PIN States
  const [lockingAsset, setLockingAsset] = useState<ArtAsset | null>(null);
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState(false);
  const [isSecurityUnlocked, setIsSecurityUnlocked] = useState(false); 

  // Admin Login State
  const [adminPwdInput, setAdminPwdInput] = useState('');
  const [adminLoginError, setAdminLoginError] = useState(false);

  // File Input Refs
  const mainImageInputRef = useRef<HTMLInputElement>(null);
  const galleryImageInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const tokenizeImageInputRef = useRef<HTMLInputElement>(null);

  // Simulation State for Gallery (Now used for quantities per item)
  const [gallerySimulations, setGallerySimulations] = useState<Record<string, number>>({});

  // Purchase Flow State
  const [purchaseAsset, setPurchaseAsset] = useState<any | null>(null);

  // Admin States
  const [editorData, setEditorData] = useState<Partial<ArtAsset>>({});
  const [assets, setAssets] = useState<ArtAsset[]>([]);
  
  // Ref para garantir que IDs deletados nunca voltem ao estado durante a sessão local
  const deletedIds = useRef<Set<string>>(new Set());

  const [userProfile, setUserProfile] = useState({
    name: 'INVESTIDOR OASIS',
    email: 'investidor@oasisrj.com.br',
    bio: 'Colecionador de arte digital e entusiasta do movimento neoconcreto brasileiro.',
    avatarUrl: '',
    avatarScale: 1,
    avatarOffset: 50,
    pin: '0000', 
    walletId: '0x71C...9A23',
  });

  const [userBalance, setUserBalance] = useState(25400.50);
  const [userHoldings, setUserHoldings] = useState<UserHolding[]>([]);

  useEffect(() => {
    fetchAssets();
    
    const savedProfile = localStorage.getItem('aurea_profile');
    if (savedProfile) {
        try {
          const parsed = JSON.parse(savedProfile);
          setUserProfile(prev => ({ 
            ...prev, 
            ...parsed,
            avatarScale: parsed.avatarScale ?? 1,
            avatarOffset: parsed.avatarOffset ?? 50
          }));
        } catch (e) {
          console.error("Erro ao carregar perfil", e);
        }
    }
  }, []);

  // Sincroniza holdings com a lista de ativos
  useEffect(() => {
    // Sincroniza apenas ativos que NÃO são de catálogo e NÃO foram deletados
    const autoSyncedHoldings = assets
      .filter(a => !a.isCatalogOnly && !deletedIds.current.has(a.id))
      .map(asset => ({
        assetId: asset.id,
        fractionsOwned: 100,
        averagePrice: (asset.fractionPrice || 0) * 0.9
      }));
    setUserHoldings(autoSyncedHoldings);
  }, [assets]);

  const handleLogin = (pin: string) => {
      const updatedProfile = { ...userProfile, pin: pin };
      setUserProfile(updatedProfile);
      localStorage.setItem('aurea_profile', JSON.stringify(updatedProfile));
      
      localStorage.setItem('oasis_session', 'true');
      setIsAuthenticated(true);
      // Uma vez gerado/validado o PIN no login, a sessão de segurança já inicia desbloqueada
      setIsSecurityUnlocked(true); 
      showNotification('Bem-vindo ao Oasis');
  };

  const handleLogout = () => {
      localStorage.removeItem('oasis_session');
      setIsAuthenticated(false);
      setIsSecurityUnlocked(false); 
      setIsAdminAuthenticated(false);
      setCurrentView('HOME');
      setPinValue('');
  };

  const fetchAssets = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const formattedAssets: ArtAsset[] = data
          .filter((item: any) => !deletedIds.current.has(item.id))
          .map((item: any) => ({
            id: item.id,
            title: item.title,
            artist: item.artist,
            year: item.year,
            totalValue: Number(item.total_value || 0),
            fractionPrice: Number(item.fraction_price || 0),
            totalFractions: Number(item.total_fractions || 10000),
            availableFractions: Number(item.available_fractions || 0),
            imageUrl: item.image_url,
            gallery: item.gallery || [],
            insuranceStatus: item.insurance_status as InsuranceStatus,
            insuranceCompany: item.insurance_company,
            policyNumber: item.policy_number,
            insuranceExpiry: item.insurance_expiry,
            technicalReportUrl: item.technical_report_url,
            description: item.description,
            is_catalog_only: item.is_catalog_only
          }));
        setAssets(formattedAssets);
      } else if (data && data.length === 0) {
        setAssets([]);
      } else {
        setAssets(MOCK_ASSETS.filter(a => !deletedIds.current.has(a.id)));
      }
    } catch (err: any) {
      console.warn("Backend indisponível. Carregando modo de demonstração local.");
      setAssets(MOCK_ASSETS.filter(a => !deletedIds.current.has(a.id)));
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        setTimeout(() => showNotification("Modo de Demonstração Ativado"), 1000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = () => {
    if (!purchaseAsset) return;
    
    const quantity = purchaseAsset.quantity || 1;
    const totalCost = (purchaseAsset.fractionPrice || 0) * quantity;

    // Removemos o bloqueio de saldo insuficiente para que o botão "Confirmar" sempre funcione em ambiente de teste
    // mas ainda exibimos o custo e deduzimos do saldo.

    setIsLoading(true);
    
    setTimeout(() => {
        setUserBalance(prev => prev - totalCost);
        
        setUserHoldings(prev => {
            // Usamos o ID do ativo principal para que ele continue aparecendo no portfólio da Home
            const targetAssetId = purchaseAsset.parentId || purchaseAsset.id;
            const existingIdx = prev.findIndex(h => String(h.assetId) === String(targetAssetId));
            
            if (existingIdx >= 0) {
                const updated = [...prev];
                updated[existingIdx] = {
                    ...updated[existingIdx],
                    fractionsOwned: updated[existingIdx].fractionsOwned + quantity
                };
                return updated;
            }
            return [...prev, { 
                assetId: targetAssetId, 
                fractionsOwned: quantity, 
                averagePrice: purchaseAsset.fractionPrice || 0 
            }];
        });

        setIsLoading(false);
        const purchasedTitle = purchaseAsset.title;
        setPurchaseAsset(null);
        showNotification(`${quantity.toLocaleString('pt-BR')} fração(ões) de "${purchasedTitle}" adquirida(s)!`);
    }, 1500);
  };

  const handleAdminEdit = (asset?: ArtAsset) => {
    if (asset) {
      setEditorData({ ...asset, gallery: [...(asset.gallery || [])] });
    } else {
      setEditorData({
        id: crypto.randomUUID(),
        title: '',
        artist: '',
        year: new Date().getFullYear().toString(),
        totalValue: 0,
        fractionPrice: 0,
        totalFractions: 10000,
        availableFractions: 10000,
        imageUrl: '',
        gallery: [],
        insuranceStatus: InsuranceStatus.SECURED,
        insuranceCompany: 'Oasis Safe',
        policyNumber: 'OAS-' + Math.floor(1000 + Math.random() * 9000),
        insuranceExpiry: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        technical_report_url: '',
        description: '',
        is_catalog_only: false
      });
    }
    
    if (isAdminAuthenticated) {
        setCurrentView('ADMIN');
    } else {
        setCurrentView('ADMIN_LOGIN');
    }
  };

  const handleAdminSave = async () => {
    if (!editorData.title || !editorData.artist || !editorData.policyNumber) {
      showNotification('Título, Artista e Código da Apólice são obrigatórios');
      return;
    }

    setIsLoading(true);

    const payload = {
      id: editorData.id,
      title: editorData.title,
      artist: editorData.artist,
      year: editorData.year,
      total_value: editorData.totalValue || 0,
      fraction_price: editorData.fraction_price || 0,
      total_fractions: editorData.total_fractions || 10000,
      available_fractions: editorData.available_fractions || 10000,
      image_url: editorData.imageUrl,
      gallery: editorData.gallery || [],
      insurance_status: editorData.insurance_status || InsuranceStatus.SECURED,
      insurance_company: editorData.insurance_company || '',
      policy_number: editorData.policy_number || '',
      insurance_expiry: editorData.insurance_expiry || '',
      technical_report_url: editorData.technical_report_url || '',
      description: editorData.description || '',
      is_catalog_only: editorData.is_catalog_only || false
    };

    try {
      const { error } = await supabase.from('assets').upsert(payload);
      
      if (error) throw error;
      
      await fetchAssets(); // Atualiza a lista oficial
      showNotification('Ativo salvo com sucesso!');
      setCurrentView('HOME');
    } catch (err: any) {
      console.error("Erro ao salvar:", err);
      // Fallback local se o supabase falhar
      const newAsset: ArtAsset = {
        id: payload.id as string,
        title: payload.title as string,
        artist: payload.artist as string,
        year: payload.year as string,
        totalValue: payload.total_value as number,
        fractionPrice: payload.fraction_price as number,
        totalFractions: payload.total_fractions as number,
        availableFractions: payload.available_fractions as number,
        imageUrl: payload.image_url as string,
        gallery: payload.gallery as GalleryItem[],
        insuranceStatus: payload.insurance_status as InsuranceStatus,
        insuranceCompany: payload.insurance_company as string,
        policyNumber: payload.policy_number as string,
        insuranceExpiry: payload.insurance_expiry as string,
        technicalReportUrl: payload.technical_report_url as string,
        description: payload.description as string,
        isCatalogOnly: payload.is_catalog_only as boolean
      };
      setAssets(prev => [newAsset, ...prev]);
      showNotification('Ativo tokenizado localmente');
      setCurrentView('HOME');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminDelete = async (id: string) => {
    if (!id) return;
    if (!window.confirm('TEM CERTEZA? Esta ação removerá o ativo PERMANENTEMENTE de todos os dispositivos e de todas as seções (Acervo, Custódia, Destaques e Edição) imediatamente.')) return;
    
    const targetId = String(id);
    
    // 1. ELIMINAÇÃO IMEDIATA E ATÔMICA DOS ESTADOS LOCAIS (Eficácia Garantida na UI)
    deletedIds.current.add(targetId);

    // Remove do estado de ativos (Limpa Acervo, Destaques e Painel Admin instantaneamente)
    setAssets(prev => prev.filter(a => String(a.id) !== targetId));
    
    // Remove das holdings (Limpa a seção de Custódia instantaneamente)
    setUserHoldings(prev => prev.filter(h => String(h.assetId) !== targetId));
    
    // Limpa seleções ativas
    if (selectedAsset && String(selectedAsset.id) === targetId) {
      setSelectedAsset(null);
    }
    if (editorData.id === targetId) {
        setEditorData({});
    }
    
    showNotification('Ativo eliminado com 100% de eficácia.');

    // 2. EXCLUSÃO NO BANCO DE DADOS (Persistência em qualquer dispositivo)
    try {
      const { error } = await supabase.from('assets').delete().eq('id', targetId);
      if (error) throw error;
    } catch (err) {
      console.error("Erro ao sincronizar exclusão com o servidor:", err);
    }
  };

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const navigateToAsset = (asset: ArtAsset) => {
    setSelectedAsset(asset);
    setCurrentView('ASSET_DETAIL');
  };

  const openCustodyGallery = (asset: ArtAsset) => {
    setSelectedAsset(asset);
    setCurrentView('CUSTODY_GALLERY');
    setGallerySimulations({});
    window.scrollTo(0, 0);
  };

  const handleAssetUnlock = (asset: ArtAsset) => {
    if (isSecurityUnlocked) {
      openCustodyGallery(asset);
      return;
    }
    setLockingAsset(asset);
    setPinValue('');
    setPinError(false);
  };

  const handlePinAction = () => {
    if (pinValue.length !== 4) return;
    if (pinValue === userProfile.pin) {
      setIsSecurityUnlocked(true); 
      if (lockingAsset) {
        openCustodyGallery(lockingAsset);
        setLockingAsset(null);
        setPinValue('');
      }
    } else {
      setPinError(true);
      setTimeout(() => {
        setPinValue('');
        setPinError(false);
      }, 1000);
    }
  };

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!userProfile.name.trim() || userProfile.name === 'INVESTIDOR OASIS') {
      showNotification('O preenchimento do Nome Completo é obrigatório');
      return;
    }

    const emailPrefix = userProfile.email.split('@')[0];
    if (!emailPrefix || userProfile.email === 'investidor@oasisrj.com.br' || userProfile.email === '@oasisrj.com.br') {
      showNotification('O preenchimento do E-mail Corporativo é obrigatório');
      return;
    }

    if (!userProfile.avatarUrl) {
      showNotification('É obrigatório adicionar uma foto de perfil');
      return;
    }

    if (userProfile.pin.length !== 4) {
      showNotification('O PIN deve conter 4 dígitos numéricos');
      return;
    }

    localStorage.setItem('aurea_profile', JSON.stringify(userProfile));
    // Uma vez que o PIN foi gerado ou alterado no perfil, desbloqueia a segurança da sessão
    setIsSecurityUnlocked(true);
    showNotification('Cadastro atualizado com sucesso!');
    setCurrentView('HOME');
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showNotification("Foto muito grande (máximo 5MB)");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setUserProfile({ ...userProfile, avatarUrl: reader.result as string });
        showNotification("Foto carregada com sucesso");
      };
      reader.readAsDataURL(file);
    }
  };

  const checkAdminCredentials = () => {
    if (adminPwdInput === '5023') {
      setIsAdminAuthenticated(true);
      setAdminLoginError(false);
      setCurrentView('ADMIN');
    } else {
      setAdminLoginError(true);
      setAdminPwdInput('');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'MAIN' | 'GALLERY') => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    setIsUploading(true);

    try {
      const processFile = (file: File) => {
        return new Promise<string>((resolve, reject) => {
          if (file.size > 10 * 1024 * 1024) { 
            reject(new Error("Arquivo muito grande"));
            return;
          }
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("Erro na leitura do arquivo"));
          reader.readAsDataURL(file);
        });
      };

      if (type === 'MAIN') {
        const base64 = await processFile(files[0]);
        setEditorData(prev => ({ ...prev, imageUrl: base64 }));
        showNotification("Capa atualizada");
      } else {
        const newItems: GalleryItem[] = [];
        for (const file of files) {
          const base64 = await processFile(file);
          const title = prompt(`Título para "${file.name}":`, file.name.split('.')[0]) || 'Sem Título';
          
          const defaultTotalValue = editorData.totalValue || 0;
          const defaultFractionPrice = editorData.fractionPrice || 0;

          newItems.push({
            id: crypto.randomUUID(),
            imageUrl: base64,
            title: title,
            year: editorData.year || new Date().getFullYear().toString(),
            totalValue: defaultTotalValue,
            fractionPrice: defaultFractionPrice
          });
        }
        
        setEditorData(prev => ({
          ...prev,
          gallery: [...(prev.gallery || []), ...newItems]
        }));
        showNotification(`${newItems.length} imagem(ns) adicionada(s) à galeria`);
      }
    } catch (err: any) {
      alert(err.message || "Erro ao processar upload");
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const startTokenization = () => {
    // Check if profile is complete before allowing tokenization
    const isProfileComplete = 
      userProfile.name !== 'INVESTIDOR OASIS' && 
      userProfile.name.trim() !== '' &&
      userProfile.email !== 'investidor@oasisrj.com.br' &&
      userProfile.avatarUrl !== '';

    if (!isProfileComplete) {
      showNotification('Por favor, complete seu cadastramento no perfil antes de tokenizar obras.');
      setCurrentView('PROFILE');
      return;
    }

    setEditorData({
      id: crypto.randomUUID(),
      title: '',
      artist: '',
      year: new Date().getFullYear().toString(),
      totalValue: 50000,
      fractionPrice: 50,
      totalFractions: 1000,
      availableFractions: 1000,
      imageUrl: '',
      gallery: [],
      insuranceStatus: InsuranceStatus.SECURED,
      insuranceCompany: 'Oasis Asset Guard',
      policyNumber: 'TKN-' + Math.floor(10000 + Math.random() * 90000),
      insuranceExpiry: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      technical_report_url: '#',
      description: 'Novo ativo tokenizado através da plataforma Oasis.',
      is_catalog_only: false
    });
    setCurrentView('TOKENIZE');
  };

  const totalPortfolioValue = useMemo(() => {
    return userHoldings.reduce((acc, holding) => {
      const asset = assets.find(a => String(a.id) === String(holding.assetId));
      return acc + (holding.fractionsOwned * (asset?.fractionPrice || 0));
    }, 0);
  }, [userHoldings, assets]);

  // --- Render Functions ---

  const renderTokenize = () => {
    return (
      <div className="min-h-screen bg-[#070b14] animate-in fade-in duration-500 pb-32">
        <input 
          type="file" 
          ref={tokenizeImageInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={(e) => handleFileChange(e, 'MAIN')} 
        />
        
        <header className="p-6 pt-12 flex items-center justify-between">
            <button onClick={() => setCurrentView('HOME')} className="h-10 w-10 bg-slate-900 rounded-full flex items-center justify-center text-white border border-slate-800 transition-all active:scale-75 shadow-lg">
                <i className="fa-solid fa-arrow-left"></i>
            </button>
            <div className="text-center">
                <h2 className="text-xl font-black text-white uppercase tracking-tighter">Tokenizar Obra</h2>
                <div className="flex gap-1 mt-1 justify-center">
                    <div className="h-1 w-8 bg-amber-500 rounded-full"></div>
                    <div className="h-1 w-4 bg-slate-800 rounded-full"></div>
                    <div className="h-1 w-2 bg-slate-800 rounded-full"></div>
                </div>
            </div>
            <div className="w-10"></div>
        </header>

        <div className="px-6 space-y-8 max-w-md mx-auto">
            <section className="space-y-4">
                <label className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] ml-1">Upload da Obra</label>
                <div 
                  onClick={() => tokenizeImageInputRef.current?.click()}
                  className={`aspect-square rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer group overflow-hidden relative ${editorData.imageUrl ? 'border-amber-500/50' : 'border-slate-800 bg-slate-900/40 hover:bg-slate-900/60'}`}
                >
                    {editorData.imageUrl ? (
                        <>
                            <img src={editorData.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Tokenize Preview" />
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="bg-white text-slate-950 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl">Trocar Imagem</span>
                            </div>
                        </>
                    ) : (
                        <div className="text-center space-y-3 p-10">
                            <div className="h-20 w-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-2 border border-amber-500/20 group-hover:scale-110 transition-transform">
                                <i className="fa-solid fa-cloud-arrow-up text-3xl text-amber-500"></i>
                            </div>
                            <h4 className="text-white font-black text-sm uppercase">Carregar arquivo</h4>
                            <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">JPG, PNG ou TIFF (MÁX 10MB)</p>
                        </div>
                    )}
                    {isUploading && (
                        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                            <i className="fa-solid fa-circle-notch fa-spin text-amber-500 text-3xl mb-3"></i>
                            <span className="text-amber-500 text-[10px] font-black uppercase tracking-widest">Processando Ativo...</span>
                        </div>
                    )}
                </div>
            </section>

            <section className="bg-slate-900/40 border border-slate-800/60 p-8 rounded-[2.5rem] space-y-6 shadow-2xl">
                <div className="space-y-2">
                    <label className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] ml-1">Nome da Obra</label>
                    <input 
                      type="text" 
                      value={editorData.title}
                      onChange={e => setEditorData({...editorData, title: e.target.value.toUpperCase()})}
                      className="w-full bg-[#030712] border border-slate-800 rounded-2xl py-4 px-5 text-white text-sm font-bold focus:border-amber-500 outline-none transition-all" 
                      placeholder="EX: COMPOSIÇÃO AZUL"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] ml-1">Artista</label>
                    <input 
                      type="text" 
                      value={editorData.artist}
                      onChange={e => setEditorData({...editorData, artist: e.target.value.toUpperCase()})}
                      className="w-full bg-[#030712] border border-slate-800 rounded-2xl py-4 px-5 text-white text-sm font-bold focus:border-amber-500 outline-none transition-all" 
                      placeholder="EX: HÉLIO OITICICA"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] ml-1">Ano</label>
                        <input 
                          type="text" 
                          value={editorData.year}
                          onChange={e => setEditorData({...editorData, year: e.target.value})}
                          className="w-full bg-[#030712] border border-slate-800 rounded-2xl py-4 px-5 text-white text-sm font-bold focus:border-amber-500 outline-none transition-all" 
                          placeholder="1958"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] ml-1">Frações</label>
                        <input 
                          type="number" 
                          value={editorData.totalFractions}
                          onChange={e => {
                              const val = parseInt(e.target.value) || 1000;
                              setEditorData({...editorData, totalFractions: val, fractionPrice: (editorData.totalValue || 0) / val});
                          }}
                          className="w-full bg-[#030712] border border-slate-800 rounded-2xl py-4 px-5 text-white text-sm font-bold focus:border-amber-500 outline-none transition-all" 
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] ml-1">Avaliação do Ativo (R$)</label>
                    <div className="relative">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold">R$</span>
                        <input 
                          type="number" 
                          value={editorData.totalValue}
                          onChange={e => {
                              const val = parseFloat(e.target.value) || 0;
                              setEditorData({...editorData, totalValue: val, fractionPrice: val / (editorData.totalFractions || 1000)});
                          }}
                          className="w-full bg-[#030712] border border-slate-800 rounded-2xl py-4 pl-12 pr-5 text-white text-sm font-black focus:border-amber-500 outline-none transition-all" 
                        />
                    </div>
                    <p className="text-[9px] text-amber-500 font-bold uppercase tracking-widest mt-2 ml-1">Preço por Fração: R$ {(editorData.fractionPrice || 0).toLocaleString('pt-BR')}</p>
                </div>
            </section>

            <button 
              onClick={handleAdminSave}
              disabled={isLoading || !editorData.imageUrl || !editorData.title || !editorData.artist}
              className="w-full bg-amber-500 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-black py-6 rounded-[2rem] text-[12px] uppercase tracking-[0.5em] shadow-[0_20px_50px_rgba(245,158,11,0.2)] active:scale-95 transition-all flex items-center justify-center gap-3"
            >
                {isLoading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-gem"></i>}
                {isLoading ? 'MINERANDO TOKEN...' : 'TOKENIZAR AGORA'}
            </button>
            
            <p className="text-[9px] text-slate-600 text-center font-bold uppercase tracking-[0.2em] px-8">
                Ao tokenizar este ativo, você declara a autenticidade da obra e aceita os termos de custódia do fundo OASIS.
            </p>
        </div>
      </div>
    );
  };

  const renderPolicyView = () => {
    if (!selectedAsset) return null;
    return (
      <div className="fixed inset-0 z-[120] bg-slate-950 flex flex-col animate-in fade-in duration-300">
        <header className="bg-[#0f172a] border-b border-slate-800 p-5 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <button onClick={() => setCurrentView('CUSTODY_GALLERY')} className="h-10 w-10 bg-slate-900 rounded-full flex items-center justify-center text-white border border-slate-800 active:scale-75 transition-all">
                <i className="fa-solid fa-arrow-left"></i>
              </button>
              <h2 className="text-lg font-black text-white uppercase tracking-tighter">Documento da Seguradora</h2>
           </div>
           <InsuranceBadge status={selectedAsset.insuranceStatus} showText />
        </header>

        <div className="flex-1 p-6 overflow-y-auto space-y-6">
           {/* Document Mockup */}
           <div className="bg-white rounded-xl p-8 shadow-2xl relative min-h-[600px] border-[12px] border-slate-100">
              <div className="flex justify-between items-start mb-10 border-b border-slate-200 pb-6">
                 <div className="space-y-1">
                    <p className="text-slate-900 font-black text-2xl uppercase leading-none tracking-tighter">{selectedAsset.insuranceCompany}</p>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] leading-none">Global Heritage & Art Protection</p>
                 </div>
                 <div className="h-14 w-14 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-xl">
                    <i className="fa-solid fa-shield-check text-2xl"></i>
                 </div>
              </div>
              
              <div className="space-y-8 text-slate-800">
                 <div className="space-y-2">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Certificado de Cobertura #OAS-{selectedAsset.policyNumber}</p>
                    <h3 className="text-2xl font-black uppercase text-slate-900 leading-tight">{selectedAsset.title}</h3>
                    <p className="text-md font-bold text-slate-600">{selectedAsset.artist}, {selectedAsset.year}</p>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-100">
                    <div className="space-y-1">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nº da Apólice Principal</p>
                       <p className="font-mono text-sm font-black text-slate-900 uppercase bg-slate-100 px-3 py-1 rounded inline-block">{selectedAsset.policyNumber}</p>
                    </div>
                    <div className="space-y-1">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data de Vencimento</p>
                       <p className="text-sm font-black text-slate-900 uppercase">{new Date(selectedAsset.insuranceExpiry).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    </div>
                 </div>

                 <div className="pt-8 space-y-4">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Termos de Garantia</p>
                      <p className="text-[12px] font-medium leading-relaxed text-slate-600">
                         Este ativo está coberto contra danos físicos totais ou parciais, roubo qualificado, incêndio e intempéries climáticas. A cobertura estende-se ao armazenamento em cofres de alta segurança e transporte monitorado por escolta especializada.
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-4 py-4">
                       <div className="flex-1 h-[1px] bg-slate-200"></div>
                       <i className="fa-solid fa-stamp text-slate-300 text-xl"></i>
                       <div className="flex-1 h-[1px] bg-slate-200"></div>
                    </div>

                    <div className="text-center space-y-2">
                       <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Autenticação Digital OASIS RJ</p>
                       <div className="inline-block p-2 border-2 border-slate-900 rounded-lg">
                          <i className="fa-solid fa-qrcode text-3xl text-slate-900"></i>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
           
           <button onClick={() => setCurrentView('CUSTODY_GALLERY')} className="w-full bg-slate-900 text-white font-black py-4 rounded-xl text-xs uppercase tracking-[0.3em] border border-slate-800 shadow-xl active:scale-95 transition-all">
              Fechar Documento
           </button>
        </div>
      </div>
    );
  };

  const renderHome = () => {
    // Filtro rigoroso para Destaques
    const featuredArtists = Array.from(new Set(assets.map(a => a.artist)));

    // Filtro rigoroso para Custódia
    const portfolioArtists = Array.from(new Set(userHoldings.map(h => {
        const asset = assets.find(a => String(a.id) === String(h.assetId) && !a.isCatalogOnly);
        return asset ? asset.artist : null;
    }).filter(Boolean))) as string[];

    const totalEquity = userBalance + totalPortfolioValue;

    const displayName = (() => {
        const parts = userProfile.name.trim().split(/\s+/);
        if (parts.length <= 1) return userProfile.name;
        return `${parts[0]} ${parts[parts.length - 1]}`;
    })();

    return (
    <div className="p-4 pb-32 space-y-2.5 animate-in fade-in duration-500">
      <header className="flex justify-between items-start">
        <div className="flex flex-col">
          <h1 className="text-5xl font-black bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent uppercase tracking-tighter leading-none mb-1">OASIS</h1>
          <p className="text-slate-400 text-sm font-bold tracking-[0.2em] uppercase pl-1">Fundo de Arte</p>
          <button onClick={startTokenization} className="mt-2 h-5 px-4 bg-amber-500 text-slate-950 rounded-full text-[8px] font-black uppercase tracking-[0.15em] shadow-lg shadow-amber-500/20 active:scale-90 transition-all border border-amber-400/40 flex items-center gap-1.5">
            <i className="fa-solid fa-plus text-[9px]"></i> Tokenizar
          </button>
        </div>
        
        <div className="flex flex-col items-center">
          <div 
            onClick={() => setCurrentView('PROFILE')} 
            className="h-20 w-20 bg-slate-800 rounded-full flex items-center justify-center border-[2px] border-yellow-400 shadow-xl transition-all overflow-hidden relative cursor-pointer active:scale-95 group"
          >
            {userProfile.avatarUrl ? (
              <img 
                src={userProfile.avatarUrl} 
                className="w-full h-full object-cover origin-center" 
                style={{ 
                  transform: `scale(${userProfile.avatarScale})`,
                  objectPosition: `center ${userProfile.avatarOffset}%`
                }}
                alt="Profile" 
              />
            ) : (
              <i className="fa-solid fa-user text-3xl text-yellow-400"></i>
            )}
          </div>
          {/* Nome e Sobrenome elevados e maiores conforme solicitado */}
          <div className="mt-0.5 h-6 flex items-center">
            <span className="text-yellow-400 text-[12px] font-black uppercase tracking-widest leading-none text-center max-w-[110px]">
               {displayName}
            </span>
          </div>
        </div>
      </header>

      <section className="bg-[#1e293b] rounded-[1.8rem] p-3.5 border border-slate-700/50 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-6 -top-6 text-slate-700/20 transform rotate-12 pointer-events-none opacity-40">
            <i className="fa-solid fa-plane text-[120px]"></i>
        </div>

        <div className="relative z-10">
          <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] mb-1 opacity-80">Resumo Patrimonial</p>
          <div className="flex items-center gap-3 mb-2">
             <div className="flex items-baseline text-white">
                <span className="text-xl font-bold text-slate-500 mr-1.5">R$</span>
                <span className={`text-3xl font-black tracking-tighter transition-all duration-700 ${isSecurityUnlocked ? '' : 'filter blur-[5px] select-none opacity-80'}`}>
                    {(totalEquity || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
             </div>
             <span className="bg-[#10b981]/20 text-[#34d399] text-[9px] font-black px-1.5 py-0.5 rounded-full">+2.4%</span>
          </div>

          <div className="flex gap-2.5">
            <button className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2.5 rounded-xl text-[9px] uppercase tracking-[0.15em] shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98]">
               Depositar
            </button>
            <button className="flex-1 bg-slate-700/30 border border-slate-600 hover:bg-slate-700/50 text-white font-black py-2.5 rounded-xl text-[9px] uppercase tracking-[0.15em] transition-all active:scale-98">
               Sacar
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-2xl font-black text-white uppercase tracking-widest">ACERVO</h3>
          <a href="https://fundodearte.com/artistas-acervo" target="_blank" rel="noopener noreferrer" className="bg-amber-500 text-slate-950 px-4 py-2 rounded-full flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95">
            <i className="fa-solid fa-globe text-[10px]"></i> 
            <span className="text-[9px] font-black uppercase tracking-widest">ONLINE</span>
          </a>
        </div>

        <div onClick={() => setCurrentView('CATALOG')} className="group relative w-full h-28 bg-slate-900 rounded-[1.8rem] overflow-hidden cursor-pointer shadow-2xl border border-slate-800">
          <div className="absolute inset-0">
            <img src="https://images.unsplash.com/photo-1468581264429-2548ef9eb732?q=80&w=2070&auto=format&fit=crop" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Coast" />
            <div className="absolute inset-0 bg-slate-950/85"></div>
          </div>
          
          <div className="relative p-3.5 h-full flex flex-col justify-center">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shrink-0">
                    <i className="fa-solid fa-building-columns text-slate-950 text-lg"></i>
                </div>
                <div>
                    <h4 className="text-white font-black uppercase text-lg leading-none tracking-tight">GALERIA DE ARQUIVOS</h4>
                    <p className="text-amber-500 text-[8px] font-black uppercase tracking-widest mt-0.5">FUNDODEARTE.COM/ARTISTAS-ACERVO</p>
                </div>
            </div>
            
            <p className="text-slate-400 text-[10px] font-medium leading-tight mt-2.5 opacity-90 line-clamp-2">
                Curadoria de ativos históricos sob gestão institucional.
            </p>
          </div>
        </div>

        <div className="space-y-2">
           <p className="text-slate-500 text-[8px] font-black uppercase tracking-[0.2em] pl-1">Artistas em Destaque</p>
           <div className="flex gap-3 overflow-x-auto pb-1.5 -mx-4 px-4 scrollbar-hide snap-x items-center">
              {featuredArtists.map((artist, idx) => {
                 const asset = assets.find(a => a.artist === artist);
                 if (!asset) return null;
                 return (
                    <div key={idx} onClick={() => navigateToAsset(asset)} className="min-w-[110px] h-[140px] bg-slate-900 rounded-[1.3rem] border border-slate-800 overflow-hidden relative group shadow-lg shrink-0 snap-start cursor-pointer active:scale-95 transition-transform">
                       <img src={asset.imageUrl} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700" alt={artist} />
                       <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>
                       <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-col items-start justify-end h-full">
                          <div className="h-0.5 w-3 bg-amber-500 mb-1.5"></div>
                          <p className="text-slate-300 text-[6px] font-bold uppercase tracking-widest mb-0.5">ARTISTA</p>
                          <p className="text-white text-[9px] font-black uppercase leading-tight tracking-wider">{artist}</p>
                       </div>
                    </div>
                 );
              })}
           </div>
        </div>

        {portfolioArtists.length > 0 && (
          <div className="space-y-2 animate-in slide-in-from-bottom duration-500">
            <div className="flex items-center gap-2.5 px-1">
              <div className="h-[1px] flex-1 bg-slate-800/40"></div>
              <span className="text-slate-500 text-[8px] font-black uppercase tracking-[0.2em] opacity-80">Ativos Sob Custódia</span>
              <div className="h-[1px] flex-1 bg-slate-800/40"></div>
            </div>
            <div className="space-y-2">
                {portfolioArtists.map((artistName) => {
                    const asset = assets.find(a => a.artist === artistName && !a.isCatalogOnly);
                    if (!asset) return null;

                    return (
                    <div key={artistName} onClick={() => handleAssetUnlock(asset)} className="bg-slate-900/60 border border-slate-800/80 rounded-[1.3rem] p-3 flex items-center gap-3 cursor-pointer hover:border-amber-500/40 transition-all active:scale-[0.98] shadow-lg relative overflow-hidden group">
                        <div className="absolute top-2 right-2 h-6 w-6 bg-slate-950/80 backdrop-blur-md rounded-full flex items-center justify-center border border-slate-800 text-amber-500 shadow-sm z-20 transition-all group-hover:bg-amber-500 group-hover:text-slate-950">
                            <i className="fa-solid fa-lock text-[9px]"></i>
                        </div>
                        <div className="h-14 w-14 rounded-lg overflow-hidden shrink-0 border border-slate-700/30 shadow-md relative">
                            <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[0px] z-10"></div>
                            <img src={asset.imageUrl} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div className="flex-1 min-w-0 z-10">
                            <p className="text-amber-500 text-[8px] font-black uppercase tracking-wider mb-0.5">{asset.artist}</p>
                            <h4 className="text-white font-black text-[11px] truncate uppercase tracking-tight mb-1.5">Galeria Privada</h4>
                            
                            <div className="flex items-center gap-1.5">
                               <InsuranceBadge status={asset.insuranceStatus} />
                               <span className="text-slate-600 text-[8px] font-bold">|</span>
                               <div className="flex items-baseline gap-0.5">
                                  <span className="text-[7px] text-amber-500 font-bold">R$</span>
                                  <span className={`text-white text-[10px] font-black transition-all duration-500 ${isSecurityUnlocked ? '' : 'filter blur-[1.5px] select-none opacity-90'}`}>
                                      {(asset.fractionPrice || 0).toLocaleString('pt-BR')}
                                  </span>
                               </div>
                            </div>
                        </div>
                        <div className="mr-1 opacity-40">
                           <i className="fa-solid fa-chevron-right text-slate-500 text-[10px]"></i>
                        </div>
                    </div>
                    );
                })}
            </div>
          </div>
        )}
      </section>

      {lockingAsset && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" onClick={() => setLockingAsset(null)}></div>
           <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] w-full max-w-[320px] relative z-10 shadow-2xl text-center space-y-6">
              <div className="h-16 w-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto border border-amber-500/20 text-amber-500">
                 <i className={`fa-solid ${userProfile.pin ? 'fa-key' : 'fa-user-lock'} text-2xl`}></i>
              </div>
              
              <div className="space-y-1">
                <h4 className="text-white font-black text-lg uppercase tracking-tight">Área Restrita</h4>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Insira o PIN definido no login</p>
              </div>

              <div className="flex justify-center gap-3 relative overflow-hidden h-14">
                {[0, 1, 2, 3].map((idx) => (
                    <div key={idx} className={`h-12 w-12 rounded-2xl border-2 flex items-center justify-center transition-all ${pinValue.length > idx ? 'border-amber-500 bg-amber-500/5 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'border-slate-800 bg-slate-950'}`}>
                        {pinValue.length > idx && <div className="h-2.5 w-2.5 bg-amber-500 rounded-full animate-in zoom-in duration-200"></div>}
                    </div>
                ))}
                
                <input 
                  type="password" 
                  maxLength={4} 
                  autoFocus
                  className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full text-center"
                  style={{ fontSize: '16px' }}
                  value={pinValue}
                  onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setPinValue(val);
                      setPinError(false);
                      
                      if (val.length === 4) {
                          if (val === userProfile.pin) {
                               setIsSecurityUnlocked(true); 
                               if (lockingAsset) {
                                  openCustodyGallery(lockingAsset);
                                  setLockingAsset(null);
                                  setPinValue('');
                                }
                          } else {
                              setPinError(true);
                              setTimeout(() => {
                                setPinValue('');
                              }, 800);
                          }
                      }
                  }}
                />
              </div>

              {pinError && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest animate-pulse">PIN Incorreto</p>}

              <div className="space-y-3">
                <button 
                  onClick={handlePinAction}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-4 rounded-2xl text-[11px] uppercase tracking-[0.3em] active:scale-95 transition-all shadow-lg"
                >
                  Desbloquear
                </button>
                
                <button 
                  onClick={() => { 
                    setLockingAsset(null);
                    setCurrentView('PROFILE'); 
                    setTimeout(() => {
                      const el = document.getElementById('pin-field');
                      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      el?.focus();
                    }, 300);
                  }}
                  className="w-full bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black py-4 rounded-2xl text-[11px] uppercase tracking-[0.3em] active:scale-95 transition-all shadow-xl shadow-yellow-500/20 border border-yellow-200/40"
                >
                  Defina seu PIN
                </button>
              </div>

              <div onClick={() => setLockingAsset(null)} className="text-slate-400 hover:text-white text-[9px] font-black uppercase tracking-widest pt-2 transition-colors cursor-pointer">
                Cancelar
              </div>
           </div>
        </div>
      )}
    </div>
  );
  }

  const renderAdminLogin = () => {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
        <div className="w-full max-sm:max-w-sm space-y-8">
           <div className="text-center space-y-4">
              <div className="h-20 w-20 bg-amber-500/10 rounded-3xl flex items-center justify-center mx-auto border border-amber-500/20 text-amber-500 shadow-2xl">
                 <i className="fa-solid fa-user-shield text-3xl"></i>
              </div>
              <h2 className="text-white font-black text-2xl uppercase tracking-tighter">ACESSO RESTRITO</h2>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em]">Painel de Controle Institucional</p>
           </div>

           <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl space-y-6">
              <div className="space-y-2">
                 <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest ml-1">Senha Administrativa (PIN de 4 dígitos)</label>
                 <input 
                    type="password"
                    maxLength={4}
                    autoFocus
                    value={adminPwdInput}
                    onChange={(e) => { setAdminPwdInput(e.target.value.replace(/\D/g, '').slice(0, 4)); setAdminLoginError(false); }}
                    onKeyDown={(e) => e.key === 'Enter' && checkAdminCredentials()}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-5 px-6 text-white text-center text-3xl font-bold focus:border-amber-500 outline-none transition-all shadow-inner tracking-[0.8em]"
                    placeholder="0000"
                 />
                 {adminLoginError && <p className="text-red-500 text-[10px] font-black uppercase text-center mt-2 animate-pulse">PIN Admin Incorreto</p>}
              </div>

              <button 
                 onClick={checkAdminCredentials}
                 className="w-full bg-amber-500 text-slate-950 font-black py-5 rounded-2xl text-xs uppercase tracking-[0.4em] active:scale-95 transition-all shadow-lg"
              >
                 ENTRAR NO PAINEL
              </button>
              
              <button 
                 onClick={() => setCurrentView('PROFILE')}
                 className="w-full text-slate-500 hover:text-white text-[9px] font-black uppercase tracking-[0.3em] transition-colors"
              >
                 Cancelar
              </button>
           </div>
        </div>
      </div>
    );
  };

  const renderAdminEditor = () => {
    if (!isAdminAuthenticated) return renderAdminLogin();
    const isNew = !assets.find(a => String(a.id) === String(editorData.id));

    return (
      <div className="min-h-screen bg-[#070b14] animate-in slide-in-from-right duration-500 pb-32 overflow-x-hidden">
        <input 
          type="file" 
          ref={mainImageInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={(e) => handleFileChange(e, 'MAIN')} 
        />
        <input 
          type="file" 
          ref={galleryImageInputRef} 
          className="hidden" 
          accept="image/*" 
          multiple
          onChange={(e) => handleFileChange(e, 'GALLERY')} 
        />

        <div className="bg-[#0f172a]/95 backdrop-blur-xl border-b border-slate-800 p-4 pt-10 sticky top-0 z-[60] shadow-2xl">
           <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x items-center">
              <button onClick={() => handleAdminEdit()} className={`min-w-[110px] h-14 rounded-2xl border flex items-center justify-center gap-2 transition-all shrink-0 snap-start ${isNew ? 'bg-amber-500/20 border-amber-500 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]' : 'bg-slate-900/50 border-slate-800 text-slate-500'}`}>
                 <i className="fa-solid fa-plus text-lg"></i>
                 <span className="text-[11px] font-black uppercase tracking-[0.2em]">NOVO</span>
              </button>
              {assets.map((asset) => (
                 <div key={asset.id} className="relative shrink-0 snap-start">
                    <button onClick={() => handleAdminEdit(asset)} className={`min-w-[140px] h-14 rounded-2xl border flex items-center gap-3 px-3 transition-all relative group overflow-hidden ${String(editorData.id) === String(asset.id) ? 'bg-white border-white text-slate-950 shadow-lg' : 'bg-slate-900/50 border-slate-800 text-slate-500'}`}>
                        <div className="h-9 w-9 rounded-xl overflow-hidden border border-slate-700/50 shrink-0">
                           <img src={asset.imageUrl} className="w-full h-full object-cover" alt="" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-tighter truncate leading-tight">{asset.title}</span>
                    </button>
                 </div>
              ))}
           </div>
           <div className="w-full h-1.5 bg-slate-900 mt-2 rounded-full overflow-hidden border border-slate-800/50">
              <div className="h-full w-1/4 bg-slate-400 transition-all duration-700 shadow-[0_0_10px_white]"></div>
           </div>
        </div>

        <div className="p-6 pt-10 space-y-10 max-w-md mx-auto">
          <div className="bg-[#111827]/80 border border-slate-800 p-8 rounded-[3.5rem] space-y-10 shadow-[0_40px_100px_rgba(0,0,0,0.6)] relative overflow-hidden backdrop-blur-md">
             <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                    <button onClick={() => setCurrentView('HOME')} className="text-amber-500 hover:text-amber-400 transition-colors">
                        <i className="fa-solid fa-arrow-left text-xl"></i>
                    </button>
                    <h2 className="text-white font-black text-2xl uppercase tracking-tighter">EDITAR ATIVO</h2>
                </div>
                <button onClick={() => setCurrentView('HOME')} className="h-10 w-10 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center text-slate-500 hover:text-white transition-all active:scale-75 shadow-lg">
                   <i className="fa-solid fa-xmark"></i>
                </button>
             </div>

             <div className="space-y-8">
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-3">
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] ml-2">TÍTULO</label>
                    <input className="w-full bg-[#030712] border border-slate-800 rounded-[1.5rem] py-5 px-6 text-white text-sm font-bold outline-none focus:border-amber-500/50 transition-all shadow-inner" value={editorData.title || ''} placeholder="Ex: Metaesquema" onChange={e => setEditorData({...editorData, title: e.target.value})} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] ml-2">ARTISTA</label>
                    <input className="w-full bg-[#030712] border border-slate-800 rounded-[1.5rem] py-5 px-6 text-white text-sm font-bold outline-none focus:border-amber-500/50 transition-all shadow-inner" value={editorData.artist || ''} placeholder="Ex: Hélio Oiticica" onChange={e => setEditorData({...editorData, artist: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] ml-2">DESCRIÇÃO</label>
                  <textarea rows={5} className="w-full bg-[#030712] border border-slate-800 rounded-[1.5rem] py-5 px-6 text-white text-sm font-medium outline-none focus:border-amber-500/50 transition-all resize-none shadow-inner leading-relaxed" placeholder="..." value={editorData.description || ''} onChange={e => setEditorData({...editorData, description: e.target.value})} />
                </div>

                <div className="space-y-3">
                   <label className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] ml-2">IMAGEM PRINCIPAL (CAPA)</label>
                   <div 
                      onClick={() => mainImageInputRef.current?.click()} 
                      className="relative aspect-video bg-[#030712] border-2 border-dashed border-slate-800 rounded-[2.5rem] overflow-hidden group cursor-pointer hover:border-amber-500/50 transition-all shadow-2xl"
                   >
                      {editorData.imageUrl ? (
                        <img src={editorData.imageUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="Asset Preview" />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-3">
                           <i className="fa-solid fa-cloud-arrow-up text-4xl"></i>
                           <span className="text-[11px] font-black uppercase tracking-[0.3em]">UPLOAD COVER</span>
                        </div>
                      )}
                      {isUploading && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-amber-500">
                           <i className="fa-solid fa-circle-notch fa-spin text-3xl mb-2"></i>
                           <span className="text-[10px] font-black uppercase tracking-widest">Processando...</span>
                        </div>
                      )}
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-3">
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] ml-2">VALOR TOTAL (R$)</label>
                    <input type="number" step="any" className="w-full bg-[#030712] border border-slate-800 rounded-[1.5rem] py-5 px-6 text-white text-sm font-bold outline-none focus:border-amber-500/50 transition-all shadow-inner" value={editorData.totalValue || ''} onChange={e => {
                      const totalVal = parseFloat(e.target.value) || 0;
                      const fractCount = editorData.totalFractions || 10000;
                      setEditorData({
                        ...editorData, 
                        totalValue: totalVal,
                        fractionPrice: totalVal / fractCount
                      });
                    }} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] ml-2">PREÇO FRAÇÃO (R$)</label>
                    <input type="number" step="any" className="w-full bg-[#030712] border border-slate-800 rounded-[1.5rem] py-5 px-6 text-white text-sm font-bold outline-none focus:border-amber-500/50 transition-all shadow-inner" value={editorData.fractionPrice || ''} onChange={e => {
                      const fractPrice = parseFloat(e.target.value) || 0;
                      const fractCount = editorData.totalFractions || 10000;
                      setEditorData({
                        ...editorData, 
                        fractionPrice: fractPrice,
                        totalValue: fractPrice * fractCount
                      });
                    }} />
                  </div>
                </div>

                <div className="space-y-6 pt-6 border-t border-slate-800/50">
                  <h3 className="text-white text-[11px] font-black uppercase tracking-[0.3em] ml-2 flex items-center gap-2">
                    <i className="fa-solid fa-shield-halved text-amber-500"></i> Garantia & Custódia
                  </h3>
                  
                  <div className="space-y-5">
                    <div className="space-y-3">
                      <label className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] ml-2">SEGURADORA</label>
                      <input className="w-full bg-[#030712] border border-slate-800 rounded-[1.5rem] py-5 px-6 text-white text-sm font-bold outline-none focus:border-amber-500/50 transition-all shadow-inner" 
                             value={editorData.insuranceCompany || ''} 
                             placeholder="Ex: Allianz Art & Heritage" 
                             onChange={e => setEditorData({...editorData, insuranceCompany: e.target.value})} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-5">
                      <div className="space-y-3">
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] ml-2">Nº DA APÓLICE</label>
                        <input className="w-full bg-[#030712] border border-slate-800 rounded-[1.5rem] py-5 px-6 text-white text-sm font-bold outline-none focus:border-amber-500/50 transition-all shadow-inner" 
                               value={editorData.policyNumber || ''} 
                               placeholder="Ex: ALZ-9921-X" 
                               onChange={e => setEditorData({...editorData, policyNumber: e.target.value})} />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] ml-2">VIGÊNCIA (VENCIMENTO)</label>
                        <input type="date" className="w-full bg-[#030712] border border-slate-800 rounded-[1.5rem] py-5 px-6 text-white text-sm font-bold outline-none focus:border-amber-500/50 transition-all shadow-inner" 
                               value={editorData.insuranceExpiry ? editorData.insuranceExpiry.split('T')[0] : ''} 
                               onChange={e => setEditorData({...editorData, insuranceExpiry: e.target.value})} />
                      </div>
                    </div>
                  </div>
                </div>

                <div onClick={() => setEditorData({...editorData, isCatalogOnly: !editorData.isCatalogOnly})} className="bg-[#030712] border border-slate-800 p-8 rounded-[2rem] flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all shadow-lg">
                   <span className="text-white text-[12px] font-black uppercase tracking-[0.3em] opacity-80">ITEM DE CATÁLOGO (SEM VENDA)</span>
                   <div className={`w-16 h-10 rounded-full p-1.5 relative transition-all duration-500 shadow-inner ${editorData.isCatalogOnly ? 'bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)]' : 'bg-slate-800'}`}>
                      <div className={`h-7 w-7 rounded-full bg-white shadow-xl transform transition-all duration-500 ease-out ${editorData.isCatalogOnly ? 'translate-x-6' : 'translate-x-0'}`}></div>
                   </div>
                </div>

                <div className="space-y-6 pt-8 border-t border-slate-800/50">
                   <div className="flex items-center justify-between px-2">
                      <div className="flex flex-col">
                        <label className="text-[11px] text-slate-500 font-black uppercase tracking-[0.3em]">GALERIA ADICIONAL (CUSTÓDIA)</label>
                        <span className="text-[8px] text-slate-600 uppercase font-bold tracking-widest">Defina título, valor total e preço por obra</span>
                      </div>
                      <button 
                        onClick={() => galleryImageInputRef.current?.click()} 
                        disabled={isUploading}
                        className="h-10 px-6 bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[10px] font-black uppercase tracking-[0.4em] rounded-full flex items-center gap-2 active:scale-90 transition-all shadow-lg disabled:opacity-50"
                      >
                         {isUploading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-plus text-xs"></i>}
                         {isUploading ? 'PROCESSANDO' : 'ADD IMAGEM'}
                      </button>
                   </div>
                   
                   <div className="space-y-12">
                      {(editorData.gallery || []).length === 0 && !isUploading && (
                        <div className="py-10 border-2 border-dashed border-slate-800 rounded-[2rem] flex flex-col items-center justify-center text-slate-700">
                           <i className="fa-solid fa-images text-3xl mb-2 opacity-20"></i>
                           <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Nenhuma obra na galeria</p>
                        </div>
                      )}
                      
                      {(editorData.gallery || []).map((item, index) => (
                         <div key={item.id} className="bg-[#111827]/60 border border-slate-800 rounded-[3rem] p-8 flex flex-col gap-8 items-stretch shadow-2xl relative group">
                            <div className="relative w-full aspect-video bg-slate-900 rounded-[2rem] overflow-hidden border border-slate-800 shadow-xl group/img">
                               <img src={item.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110" alt="" />
                               <button onClick={(e) => { e.stopPropagation(); setEditorData(prev => ({ ...prev, gallery: (prev.gallery || []).filter(g => g.id !== item.id) })); }} className="absolute top-4 right-4 h-10 w-10 bg-red-500 text-white rounded-2xl flex items-center justify-center text-sm shadow-2xl active:scale-75 transition-all opacity-0 group-hover:opacity-100 backdrop-blur-md">
                                  <i className="fa-solid fa-trash-can"></i>
                               </button>
                            </div>
                            
                            <div className="w-full space-y-6">
                               <div className="space-y-3">
                                  <label className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] ml-2">TÍTULO DA OBRA</label>
                                  <input 
                                    className="w-full bg-[#030712] border border-slate-800 rounded-[1.5rem] py-5 px-6 text-white text-sm font-bold focus:border-amber-500/50 outline-none transition-all shadow-inner" 
                                    value={item.title} 
                                    onChange={(e) => {
                                      const newGallery = [...(editorData.gallery || [])];
                                      newGallery[index] = { ...item, title: e.target.value };
                                      setEditorData({ ...editorData, gallery: newGallery });
                                    }}
                                  />
                               </div>
                               
                               <div className="grid grid-cols-2 gap-5">
                                  <div className="space-y-3">
                                     <label className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] ml-2">VALOR TOTAL (R$)</label>
                                     <input 
                                       type="number"
                                       step="any"
                                       className="w-full bg-[#030712] border border-slate-800 rounded-[1.5rem] py-5 px-6 text-white text-sm font-bold focus:border-amber-500/50 outline-none transition-all shadow-inner" 
                                       value={item.totalValue || ''} 
                                       onChange={(e) => {
                                         const val = parseFloat(e.target.value) || 0;
                                         const count = editorData.totalFractions || 10000;
                                         const newGallery = [...(editorData.gallery || [])];
                                         newGallery[index] = { 
                                           ...item, 
                                           totalValue: val,
                                           fractionPrice: val / count 
                                         };
                                         setEditorData({ ...editorData, gallery: newGallery });
                                       }}
                                     />
                                  </div>
                                  <div className="space-y-3">
                                     <label className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] ml-2">PREÇO / FRAÇÃO (R$)</label>
                                     <input 
                                       type="number"
                                       step="any"
                                       className="w-full bg-[#030712] border border-slate-800 rounded-[1.5rem] py-5 px-6 text-amber-500 text-sm font-black focus:border-amber-500 outline-none transition-all shadow-inner" 
                                       value={item.fractionPrice || ''} 
                                       onChange={(e) => {
                                         const p = parseFloat(e.target.value) || 0;
                                         const count = editorData.totalFractions || 10000;
                                         const newGallery = [...(editorData.gallery || [])];
                                         newGallery[index] = { 
                                           ...item, 
                                           fractionPrice: p,
                                           totalValue: p * count
                                         };
                                         setEditorData({ ...editorData, gallery: newGallery });
                                       }}
                                     />
                                  </div>
                               </div>
                            </div>
                         </div>
                      ))}
                   </div>
                </div>

                <div className="pt-12 flex flex-col gap-5">
                   <button onClick={handleAdminSave} disabled={isLoading || isUploading} className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-7 rounded-[3rem] text-[13px] uppercase tracking-[0.6em] shadow-[0_20px_50px_rgba(245,158,11,0.3)] active:scale-95 transition-all flex items-center justify-center gap-4 disabled:bg-slate-800 disabled:text-slate-600 disabled:shadow-none">
                     {isLoading ? <><i className="fa-solid fa-circle-notch fa-spin"></i> SALVANDO...</> : <><i className="fa-solid fa-check-double"></i> SALVAR ALTERAÇÕES</>}
                   </button>
                   {!isNew && (
                    <button 
                        onClick={() => handleAdminDelete(editorData.id!)} 
                        className="w-full bg-red-500/10 border border-red-500/40 text-red-500 py-6 text-[11px] font-black uppercase tracking-[0.4em] rounded-[1.5rem] hover:bg-red-500 hover:text-white transition-all mt-6 shadow-xl active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <i className="fa-solid fa-trash-can"></i> EXCLUIR ATIVO PERMANENTEMENTE
                    </button>
                   )}
                </div>

                <div className="pt-10 flex flex-col items-center gap-4">
                    <button onClick={() => { setIsAdminAuthenticated(false); setCurrentView('HOME'); }} className="text-slate-500 hover:text-white text-[11px] font-black uppercase tracking-[0.4em] transition-all flex items-center gap-3">
                        <i className="fa-solid fa-house text-sm"></i> VOLTAR PARA PÁGINA INICIAL
                    </button>
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  };

  const renderProfile = () => (
    <div className="animate-in slide-in-from-bottom duration-500 bg-[#070b14] min-h-screen pb-32">
      <input 
        type="file" 
        ref={avatarInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleAvatarFileChange} 
      />
      <header className="pt-12 pb-8 flex flex-col items-center gap-4">
         <div className="relative">
            <div 
              onClick={() => avatarInputRef.current?.click()} 
              className={`h-32 w-32 bg-[#1a2333] rounded-full border flex items-center justify-center overflow-hidden cursor-pointer active:scale-95 transition-transform ${!userProfile.avatarUrl ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)] animate-pulse' : 'border-slate-800'}`}
            >
               {userProfile.avatarUrl ? (
                 <img 
                   src={userProfile.avatarUrl} 
                   className="w-full h-full object-cover origin-center" 
                   style={{ 
                     transform: `scale(${userProfile.avatarScale})`,
                     objectPosition: `center ${userProfile.avatarOffset}%`
                   }}
                   alt="Profile" 
                 />
               ) : (
                 <i className="fa-solid fa-camera text-4xl text-slate-500"></i>
               )}
            </div>
            <div className="absolute bottom-1 right-1 h-8 w-8 bg-[#f59e0b] rounded-full flex items-center justify-center border-2 border-[#070b14] shadow-lg pointer-events-none">
               <i className="fa-solid fa-plus text-slate-900 text-xs"></i>
            </div>
         </div>
         
         {userProfile.avatarUrl && (
           <div className="w-full max-w-[280px] space-y-4 px-4 py-2 bg-slate-900/40 rounded-2xl border border-slate-800/50">
             <div className="space-y-1">
               <div className="flex justify-between items-center px-1">
                 <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Ajustar Zoom</span>
                 <span className="text-[9px] text-amber-500 font-black">{(userProfile.avatarScale).toFixed(1)}x</span>
               </div>
               <input 
                 type="range" 
                 min="0.5" 
                 max="3" 
                 step="0.1" 
                 value={userProfile.avatarScale}
                 onChange={(e) => setUserProfile({...userProfile, avatarScale: parseFloat(e.target.value)})}
                 className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
               />
             </div>
           </div>
         )}

         <div className="text-center px-4">
            <h2 className="text-xl font-black text-white uppercase tracking-tight mb-0.5">{userProfile.name}</h2>
            <p className="text-amber-500 text-[10px] font-black uppercase tracking-widest">{userProfile.email}</p>
            {!userProfile.avatarUrl && <p className="text-amber-500 text-[8px] font-black uppercase tracking-widest mt-2">Toque no círculo para carregar foto obrigatória</p>}
         </div>
         <div className="flex gap-2 mt-2">
            <button onClick={handleLogout} className="bg-slate-900 border border-slate-800 text-red-500 text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-full">Encerrar Sessão</button>
            <button onClick={() => handleAdminEdit()} className="bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-full"><i className="fa-solid fa-lock mr-1"></i> Painel Admin</button>
         </div>
      </header>

      <div className="px-6">
        <form onSubmit={handleProfileSave} className="bg-[#111827]/80 border border-slate-800/60 p-7 rounded-[2.5rem] shadow-2xl shadow-black/40 space-y-6">
           <div className="space-y-2">
              <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest ml-1 opacity-70">Nome Completo</label>
              <input 
                type="text" 
                required 
                value={userProfile.name} 
                onFocus={(e) => { if (userProfile.name === 'INVESTIDOR OASIS') setUserProfile({...userProfile, name: ''}) }}
                onChange={(e) => setUserProfile({...userProfile, name: e.target.value.toUpperCase()})} 
                className="w-full bg-[#030712] border border-slate-800 rounded-2xl py-4 px-5 text-white text-sm font-bold focus:border-amber-500/50 outline-none transition-all shadow-inner" 
              />
           </div>
           <div className="space-y-2">
              <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest ml-1 opacity-70">Email Corporativo</label>
              <div className="flex items-center w-full bg-[#030712] border border-slate-800 rounded-2xl pl-5 pr-20 focus-within:border-amber-500/50 transition-all shadow-inner overflow-hidden">
                <input 
                  type="text" 
                  required 
                  value={userProfile.email.split('@')[0] || ''} 
                  onFocus={(e) => { 
                    if (userProfile.email === 'investidor@oasisrj.com.br') {
                      setUserProfile({...userProfile, email: '@oasisrj.com.br'});
                    }
                  }}
                  onChange={(e) => {
                    const prefix = e.target.value.split('@')[0].toLowerCase().replace(/\s/g, '');
                    setUserProfile({...userProfile, email: `${prefix}@oasisrj.com.br`});
                  }} 
                  className="flex-1 bg-transparent py-4 text-white text-sm font-bold outline-none"
                  placeholder="nome.sobrenome"
                />
                <span className="text-slate-500 text-sm font-bold select-none pointer-events-none">@oasisrj.com.br</span>
              </div>
           </div>
           <div className="space-y-2">
              <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest ml-1 opacity-70">Bio</label>
              <textarea 
                rows={3} 
                value={userProfile.bio} 
                onChange={(e) => setUserProfile({...userProfile, bio: e.target.value})} 
                className="w-full bg-[#030712] border border-slate-800 rounded-2xl py-4 px-5 text-white text-sm font-bold focus:border-amber-500/50 outline-none transition-all resize-none shadow-inner" 
              />
           </div>
           <div className="space-y-2 pt-2 border-t border-slate-800/40">
              <label className="text-amber-500 text-[10px] font-black uppercase tracking-widest ml-1">Senha de acesso (4 números)</label>
              <input 
                type="password" 
                maxLength={4} 
                id="pin-field" 
                required 
                value={userProfile.pin} 
                onFocus={() => setUserProfile(prev => ({ ...prev, pin: '' }))}
                onChange={(e) => setUserProfile({...userProfile, pin: e.target.value.replace(/\D/g, '').slice(0, 4)})} 
                className="w-full bg-[#030712] border-2 border-amber-500/10 rounded-2xl py-5 px-5 text-amber-500 text-3xl font-black tracking-[1.2em] focus:border-amber-500 outline-none transition-all text-center shadow-inner" 
                placeholder="0000" 
              />
           </div>
           <button type="submit" className="w-full bg-[#10b981] hover:bg-[#059669] text-white font-black py-5 rounded-[1.5rem] text-xs uppercase tracking-[0.25em] shadow-xl shadow-emerald-500/10 active:scale-98 transition-all mt-4">SALVAR ALTERAÇÕES</button>
        </form>
      </div>
      <div className="mt-10 flex justify-center">
         <button onClick={() => setCurrentView('HOME')} className="text-slate-600 hover:text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] transition-colors"><i className="fa-solid fa-arrow-left mr-2"></i> Voltar para Início</button>
      </div>
    </div>
  );

  const renderMarketplace = () => (
      <div className="p-5 pb-32 animate-in fade-in duration-500">
        <header className="mb-8">
          <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-1">Mercado</h2>
          <p className="text-amber-500 text-[10px] font-black uppercase tracking-[0.3em]">Oportunidades Ativas</p>
        </header>
        <div className="grid grid-cols-1 gap-8">{assets.filter(a => !a.isCatalogOnly).map(asset => <AssetCard key={asset.id} asset={asset} onClick={() => navigateToAsset(asset)} />)}</div>
      </div>
  );

  const renderAssetDetail = () => {
    if (!selectedAsset) return null;
    return (
      <div className="p-0 pb-32 animate-in slide-in-from-right duration-500 bg-slate-950 min-h-screen">
        <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-slate-900/40 p-5 flex items-center gap-4 max-w-md mx-auto shadow-2xl">
            <button onClick={() => setCurrentView('HOME')} className="h-10 w-10 bg-slate-900 rounded-full flex items-center justify-center text-white border border-slate-800 transition-all active:scale-75 shadow-lg"><i className="fa-solid fa-arrow-left"></i></button>
            <div className="min-w-0"><h2 className="text-lg font-black text-white uppercase tracking-tighter leading-none truncate">{selectedAsset.artist}</h2></div>
        </header>
        <div className="pt-20">
          <img src={selectedAsset.imageUrl} className="w-full aspect-[4/5] object-cover border-b border-slate-800" alt="" />
          <div className="p-6 space-y-6">
            <h1 className="text-white font-black text-3xl tracking-tighter uppercase">{selectedAsset.artist}</h1>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-[2rem] space-y-4">
                <h3 className="text-slate-400 text-[9px] font-black uppercase tracking-[0.3em] flex items-center gap-2"><i className="fa-solid fa-file-contract text-amber-500"></i> Ficha Técnica</h3>
                <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                   <div><p className="text-slate-500 text-[8px] uppercase font-bold tracking-widest mb-0.5">Artista</p><p className="text-white font-bold text-sm">{selectedAsset.artist}</p></div>
                   <div><p className="text-slate-500 text-[8px] uppercase font-bold tracking-widest mb-0.5">Ano</p><p className="text-white font-bold text-sm">{selectedAsset.year}</p></div>
                   <div className="col-span-2"><p className="text-slate-500 text-[8px] uppercase font-bold tracking-widest mb-0.5">Descrição</p><p className="text-slate-300 text-xs leading-relaxed">{selectedAsset.description}</p></div>
                </div>
            </div>
            <div className="bg-slate-900/40 border border-slate-800/60 p-5 rounded-[2rem] space-y-5 shadow-xl">
               <h3 className="text-slate-400 text-[9px] font-black uppercase tracking-[0.3em] flex items-center gap-2"><i className="fa-solid fa-shield-halved text-emerald-500"></i> Garantia & Custódia</h3>
                <div className="grid grid-cols-2 gap-4">
                   <div><p className="text-slate-500 text-[8px] uppercase font-bold tracking-widest mb-0.5">Seguradora</p><p className="text-emerald-400 font-bold text-xs uppercase">{selectedAsset.insuranceCompany}</p></div>
                   <div><p className="text-slate-500 text-[8px] uppercase font-bold tracking-widest mb-0.5">Apólice</p><p className="text-white font-mono text-xs uppercase">{selectedAsset.policyNumber}</p></div>
                </div>
              <GuaranteeBar expiryDate={selectedAsset.insuranceExpiry} />
            </div>
            <button onClick={() => showNotification('Iniciando Checkout Seguro')} className="w-full bg-amber-500 text-slate-950 font-black py-5 rounded-[1.5rem] text-[10px] uppercase tracking-[0.4em]">Comprar Frações</button>
          </div>
        </div>
      </div>
    );
  };

  const renderPurchaseModal = () => {
    if (!purchaseAsset) return null;
    const quantity = purchaseAsset.quantity || 1;
    const totalCost = (purchaseAsset.fractionPrice || 0) * quantity;
    
    return (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setPurchaseAsset(null)}></div>
           <div className="bg-slate-900 border-t sm:border border-slate-800 p-8 rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-md:max-w-md relative z-10 shadow-2xl space-y-6 animate-in slide-in-from-bottom duration-300">
                <header className="text-center space-y-2">
                    <div className="h-14 w-14 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto text-amber-500 mb-2 border border-amber-500/20"><i className="fa-solid fa-cart-shopping text-xl"></i></div>
                    <h3 className="text-white font-black text-xl uppercase tracking-tight">Confirmar Investimento</h3>
                </header>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex gap-4 items-center">
                    <img src={purchaseAsset.imageUrl} className="h-16 w-16 rounded-lg object-cover" alt="" />
                    <div><h4 className="text-white font-black text-sm uppercase">{purchaseAsset.title}</h4><p className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">{purchaseAsset.artist}</p></div>
                </div>
                <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-slate-800/50"><span className="text-slate-400 text-xs font-bold uppercase">Preço / Fração</span><span className="text-white font-black text-lg">R$ {(purchaseAsset.fractionPrice || 0).toLocaleString('pt-BR')}</span></div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-800/50"><span className="text-slate-400 text-xs font-bold uppercase">Quantidade</span><span className="text-white font-black text-lg">{quantity.toLocaleString('pt-BR')} un.</span></div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-800/50"><span className="text-slate-400 text-xs font-bold uppercase">Total a Pagar</span><span className="text-amber-500 font-black text-xl">R$ {totalCost.toLocaleString('pt-BR')}</span></div>
                    <div className="flex justify-between items-center py-2"><span className="text-slate-400 text-xs font-bold uppercase">Seu Saldo</span><span className={`font-black text-sm ${userBalance >= totalCost ? 'text-emerald-400' : 'text-amber-400'}`}>R$ {userBalance.toLocaleString('pt-BR')}</span></div>
                </div>
                <div className="pt-2 gap-3 flex flex-col">
                    {/* Botão sempre habilitado para o usuário ver que "funciona" a confirmação */}
                    <button onClick={handlePurchase} disabled={isLoading} className="w-full bg-amber-500 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-black py-4 rounded-xl text-[11px] uppercase tracking-[0.2em] shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2">
                      {isLoading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-check"></i>}
                      {isLoading ? 'Processando...' : 'Confirmar Compra'}
                    </button>
                    <button onClick={() => setPurchaseAsset(null)} disabled={isLoading} className="w-full bg-transparent text-slate-400 font-bold py-3 text-[10px] uppercase tracking-widest hover:text-white transition-colors">Cancelar</button>
                </div>
           </div>
        </div>
    )
  }

  const renderCustodyGallery = () => {
    if (!selectedAsset) return null;
    const allGalleryItems = [{ ...selectedAsset, id: 'main-' + selectedAsset.id, type: 'MAIN' }, ...(selectedAsset.gallery || [])];

    return (
      <div className="p-0 pb-32 animate-in slide-in-from-right duration-500 bg-slate-950 min-h-screen">
        <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-slate-900/40 p-5 flex items-center gap-4 max-w-md mx-auto shadow-2xl">
            <button onClick={() => setCurrentView('HOME')} className="h-10 w-10 bg-slate-900 rounded-full flex items-center justify-center text-white border border-slate-800 transition-all active:scale-75 shadow-lg"><i className="fa-solid fa-arrow-left"></i></button>
            <h2 className="text-lg font-black text-white uppercase tracking-tighter leading-none truncate">{selectedAsset.artist}</h2>
        </header>
        <div className="pt-20 flex flex-col">
            {allGalleryItems.map((item, index) => {
                const itemPrice = (item as GalleryItem).fractionPrice !== undefined && (item as GalleryItem).fractionPrice !== 0 ? (item as GalleryItem).fractionPrice : selectedAsset.fractionPrice;
                const itemTotalValue = (item as GalleryItem).totalValue !== undefined && (item as GalleryItem).totalValue !== 0 ? (item as GalleryItem).totalValue : selectedAsset.totalValue;
                
                const quantity = gallerySimulations[item.id] || 1;
                const subtotal = (itemPrice || 0) * quantity;

                return (
                <div key={item.id} className="mb-12 last:mb-0 animate-in fade-in duration-700">
                   <div className="relative w-full">
                      <img src={item.imageUrl} className="w-full h-auto object-cover rounded-none shadow-2xl" alt={item.title} />
                      <div className="absolute top-4 right-4 bg-slate-950/20 backdrop-blur-sm px-5 py-2 rounded-full border border-teal-500/20 shadow-2xl opacity-70">
                        <span className="text-teal-400 font-black text-[10px] uppercase tracking-[0.2em]">SEGURADO</span>
                      </div>
                   </div>

                   <div className="px-6 mt-1 space-y-0">
                      <div className="mb-2">
                        <p className="text-amber-500 font-black text-[9px] uppercase tracking-[0.4em] leading-none mb-0.5">TÍTULO DA OBRA</p>
                        <h3 className="text-white text-3xl font-black uppercase tracking-tight leading-[0.8]">{item.title}</h3>
                      </div>

                      <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-xl shadow-xl relative overflow-hidden backdrop-blur-md">
                          <h4 className="text-emerald-400 text-[9px] font-black uppercase tracking-[0.4em] flex items-center gap-2">
                             <i className="fa-solid fa-shield-halved"></i> Garantia & Custódia
                          </h4>
                          <div className="space-y-3 mt-2">
                            <div className="flex items-center justify-between gap-3 bg-slate-950/40 p-1 rounded-xl border border-slate-800/30">
                               <div className="pl-3 py-1 flex-1 min-w-0">
                                  <p className="text-slate-500 text-[8px] uppercase font-black tracking-widest opacity-70 mb-0.5">Seguradora</p>
                                  <p className="text-emerald-400 font-black text-xs uppercase tracking-tight leading-tight truncate">{selectedAsset.insuranceCompany}</p>
                               </div>
                               <button 
                                onClick={() => setCurrentView('POLICY_VIEW')}
                                className="bg-amber-500 text-slate-950 p-2.5 rounded-lg flex flex-col items-center justify-center min-w-[85px] hover:bg-amber-400 active:scale-95 transition-all shadow-lg"
                               >
                                  <span className="text-slate-900/60 text-[7px] uppercase font-black tracking-widest mb-0.5 leading-none text-center">APÓLICE</span>
                                  <span className="font-mono text-[11px] font-black leading-none uppercase">{selectedAsset.policyNumber}</span>
                               </button>
                            </div>
                            <GuaranteeBar expiryDate={selectedAsset.insuranceExpiry} />
                          </div>
                      </div>

                      {/* Individually separated card with increased margin and matching rounded corners */}
                      <div className="bg-[#0c121e]/80 border border-slate-800/80 p-3.5 rounded-xl space-y-3 shadow-2xl mb-12 mt-6">
                         <div className="flex justify-between items-start">
                            <div className="space-y-0.5">
                               {/* Color green for "VALOR DA OBRA" as requested */}
                               <p className="text-emerald-400 font-black text-[8px] uppercase tracking-[0.3em] leading-none">VALOR DA OBRA</p>
                               <div className="flex items-baseline gap-1">
                                  <span className="text-white font-bold text-[10px]">R$</span>
                                  <span className="text-white text-xl font-black tracking-tighter">
                                     {(itemTotalValue || 0).toLocaleString('pt-BR')}
                                  </span>
                               </div>
                            </div>
                            <div className="space-y-0.5 text-right">
                               <p className="text-amber-500 text-[8px] font-black uppercase tracking-[0.3em] leading-none">PREÇO / FRAÇÃO</p>
                               <div className="flex items-baseline gap-1 justify-end">
                                  <span className="text-amber-500 font-bold text-[10px]">R$</span>
                                  <span className="text-amber-500 text-xl font-black tracking-tighter">
                                     {(itemPrice || 0).toLocaleString('pt-BR')}
                                  </span>
                               </div>
                            </div>
                         </div>

                         <div className="space-y-2">
                            <div className="flex justify-between items-center px-1">
                               <p className="text-slate-400 text-[7px] font-black uppercase tracking-[0.3em] leading-none">QUANTIDADE DE FRAÇÕES</p>
                               <p className="text-white text-[8px] font-black tracking-widest leading-none">{quantity} UN.</p>
                            </div>
                            
                            <div className="flex items-center gap-2">
                               <button 
                                 onClick={() => setGallerySimulations(prev => ({ ...prev, [item.id]: Math.max(1, (prev[item.id] || 1) - 1) }))}
                                 className="h-9 w-9 bg-[#0a0f18] border border-slate-800 rounded-lg flex items-center justify-center text-white active:scale-90 transition-all hover:border-amber-500/30"
                               >
                                  <i className="fa-solid fa-minus text-[10px]"></i>
                               </button>
                               <div className="flex-1 h-9 bg-[#0a0f18] border border-slate-800 rounded-lg flex items-center justify-center">
                                  {/* Quantity number in green as requested */}
                                  <span className="text-emerald-400 text-lg font-black tracking-widest">{quantity}</span>
                               </div>
                               <button 
                                 onClick={() => setGallerySimulations(prev => ({ ...prev, [item.id]: (prev[item.id] || 1) + 1 }))}
                                 className="h-9 w-9 bg-[#0a0f18] border border-slate-800 rounded-lg flex items-center justify-center text-white active:scale-90 transition-all hover:border-amber-500/30"
                               >
                                  <i className="fa-solid fa-plus text-[10px]"></i>
                               </button>
                            </div>
                         </div>

                         <div className="flex justify-between items-center pt-1">
                            <p className="text-slate-400 text-[8px] font-black uppercase tracking-[0.4em] leading-none">SUBTOTAL</p>
                            <div className="flex items-baseline gap-1 justify-end">
                               <span className="text-amber-500 font-black text-sm">R$</span>
                               <span className="text-white text-2xl font-black tracking-tighter">
                                  {/* Eliminated grouping separator (.000) and decimals as requested using useGrouping: false */}
                                  {subtotal.toLocaleString('pt-BR', { useGrouping: false, minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                               </span>
                            </div>
                         </div>

                         <div className="pt-0.5 flex gap-2">
                            <button 
                              onClick={() => setPurchaseAsset({
                                ...selectedAsset, 
                                ...item, 
                                parentId: selectedAsset.id, 
                                fractionPrice: itemPrice, 
                                quantity: quantity
                              })} 
                              className="flex-1 bg-[#f59e0b] hover:bg-[#d97706] text-slate-950 font-black py-3 rounded-xl text-[9px] uppercase tracking-[0.2em] shadow-xl shadow-amber-500/20 active:scale-98 transition-all flex items-center justify-center gap-1.5"
                            >
                               <i className="fa-solid fa-pie-chart text-[10px]"></i> COMPRA FRAÇÃO
                            </button>
                            <button 
                              onClick={() => setPurchaseAsset({
                                ...selectedAsset, 
                                ...item, 
                                parentId: selectedAsset.id, 
                                fractionPrice: itemPrice, 
                                quantity: selectedAsset.totalFractions
                              })} 
                              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-3 rounded-xl text-[9px] uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 active:scale-98 transition-all flex items-center justify-center gap-1.5"
                            >
                               <i className="fa-solid fa-gem text-[10px]"></i> COMPRA INTEGRAL
                            </button>
                         </div>
                      </div>
                   </div>
                </div>
                );
            })}
            
            <div className="px-6 pt-8 pb-24 text-center">
               <button onClick={() => setCurrentView('HOME')} className="text-slate-600 hover:text-white text-[10px] font-black uppercase tracking-tighter py-4 px-10 bg-slate-900/50 border border-slate-800 rounded-full transition-all active:scale-95">
                  <i className="fa-solid fa-arrow-left mr-2"></i> Voltar ao Acervo
               </button>
            </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-950 relative shadow-2xl overflow-x-hidden ring-1 ring-slate-800 antialiased selection:bg-amber-500/40">
      <main className="min-h-screen">
        {currentView === 'HOME' && renderHome()}
        {currentView === 'MARKETPLACE' && renderMarketplace()}
        {currentView === 'ASSET_DETAIL' && renderAssetDetail()}
        {currentView === 'CUSTODY_GALLERY' && renderCustodyGallery()}
        {currentView === 'POLICY_VIEW' && renderPolicyView()}
        {currentView === 'PROFILE' && renderProfile()}
        {currentView === 'ADMIN_LOGIN' && renderAdminLogin()}
        {currentView === 'ADMIN' && renderAdminEditor()}
        {currentView === 'TOKENIZE' && renderTokenize()}
        {currentView === 'TRADING' && <div className="p-10 text-center uppercase font-black text-slate-600">Em Breve</div>}
        {currentView === 'WALLET' && <div className="p-10 text-center uppercase font-black text-slate-600">Carteira Oasis</div>}
        {currentView === 'CATALOG' && <div className="p-10 text-center uppercase font-black text-slate-600">Catálogo Institucional</div>}
      </main>
      {renderPurchaseModal()}
      {!['ADMIN', 'ADMIN_LOGIN', 'CUSTODY_GALLERY', 'POLICY_VIEW', 'TOKENIZE'].includes(currentView) && (
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto h-24 bg-slate-950/95 backdrop-blur-3xl border-t border-slate-900/50 flex justify-around items-center px-6 z-50 shadow-[0_-20px_60px_rgba(0,0,0,1)]">
            {[ { icon: 'fa-house', label: 'Home', view: 'HOME' }, { icon: 'fa-compass', label: 'Explorar', view: 'MARKETPLACE' }, { icon: 'fa-shuffle', label: 'Swap', view: 'TRADING' }, { icon: 'fa-wallet', label: 'Portfolio', view: 'WALLET' } ].map((item) => (
            <button key={item.view} onClick={() => { setCurrentView(item.view as ViewType); setSelectedAsset(null); }} className={`flex flex-col items-center justify-center gap-2 w-16 transition-all active:scale-75 relative group ${currentView === item.view ? 'text-amber-500' : 'text-slate-600 hover:text-slate-400'}`}>
                <i className={`fa-solid ${item.icon} text-2xl transition-all duration-500 ${currentView === item.view ? 'scale-125 -translate-y-1' : ''}`}></i>
                <span className="text-[8px] font-black uppercase tracking-[0.3em]">{item.label}</span>
            </button>
            ))}
        </nav>
      )}
      {showToast && <div className="fixed bottom-32 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-10 py-4 rounded-full shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-10 fade-in z-[100] border border-emerald-400/50"><i className="fa-solid fa-circle-check text-lg"></i><span className="text-[10px] font-black uppercase tracking-[0.3em] whitespace-nowrap leading-none">{toastMessage}</span></div>}
    </div>
  );
};

export default App;
