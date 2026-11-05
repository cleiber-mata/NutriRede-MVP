import React, { useEffect } from 'react';
import {
  Home,
  LayoutDashboard,
  FileCheck2,
  Shield,
  ChevronLeft,
  ChevronRight,
  HeartHandshake,
  X,
  LogIn,
  UserPlus,
  LogOut,
  User,
  CheckCircle2,
  Clock,
  XCircle,
  Leaf,
  Store,
  Building2,
  Truck,
  PlusCircle,
  PowerOff,
  Check,
  Edit3
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PROFILE_DEFINITIONS, ProfileType, STATUS_CONFIG } from '../types';

interface SidebarNavProps {
  currentView: 'home' | 'dashboard' | 'admin' | 'academic';
  setCurrentView: (view: 'home' | 'dashboard' | 'admin' | 'academic') => void;
  isDesktopCollapsed: boolean;
  setIsDesktopCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onOpenAccountModal: () => void;
  onOpenRequestProfile: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  currentView,
  setCurrentView,
  isDesktopCollapsed,
  setIsDesktopCollapsed,
  isMobileOpen,
  setIsMobileOpen,
  onOpenLogin,
  onOpenRegister,
  onOpenAccountModal,
  onOpenRequestProfile,
}) => {
  const {
    currentUser,
    userAccount,
    userProfiles,
    activeProfile,
    switchActiveProfileType,
    isAdmin,
    logout
  } = useAuth();

  // Fecha o menu gaveta ao pressionar a tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, setIsMobileOpen]);

  // Bloqueia rolagem do fundo quando a gaveta mobile estiver aberta
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  const navItems = [
    {
      id: 'home' as const,
      label: 'Início',
      icon: Home,
      requiresAuth: false,
      requiresAdmin: false,
      badge: null,
    },
    {
      id: 'dashboard' as const,
      label: 'Meu Painel',
      icon: LayoutDashboard,
      requiresAuth: true,
      requiresAdmin: false,
      badge: null,
    },
    {
      id: 'academic' as const,
      label: 'Requisitos & Testes',
      icon: FileCheck2,
      requiresAuth: false,
      requiresAdmin: false,
      badge: null,
    },
    {
      id: 'admin' as const,
      label: 'Área Administrativa',
      icon: Shield,
      requiresAuth: true,
      requiresAdmin: true,
      badge: 'Admin',
    },
  ];

  const handleSelectView = (view: 'home' | 'dashboard' | 'admin' | 'academic') => {
    setCurrentView(view);
    if (isMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  const getProfileIcon = (type: ProfileType) => {
    switch (type) {
      case 'DONOR':
        return <Store className="w-4 h-4 text-emerald-700" />;
      case 'RECEIVER':
        return <Building2 className="w-4 h-4 text-teal-700" />;
      case 'TRANSPORTER':
        return <Truck className="w-4 h-4 text-amber-700" />;
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'APROVADO':
        return 'bg-emerald-500';
      case 'REJEITADO':
        return 'bg-rose-500';
      case 'DESATIVADO':
        return 'bg-stone-400';
      default:
        return 'bg-amber-500';
    }
  };

  return (
    <>
      {/* ======================================================== */}
      {/* 1. DESKTOP SIDEBAR (Fixo, recolhível, sem sobreposição)   */}
      {/* ======================================================== */}
      <aside
        aria-label="Menu Lateral Principal"
        className={`hidden md:flex flex-col shrink-0 sticky top-0 h-screen bg-white border-r border-stone-200/80 shadow-2xs z-30 transition-all duration-300 ${
          isDesktopCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Topo: Logo + Botão de Recolher/Expandir */}
        <div className="p-4 border-b border-stone-100 flex items-center justify-between gap-2 h-16 shrink-0">
          <div
            onClick={() => handleSelectView('home')}
            className={`flex items-center gap-3 cursor-pointer group min-w-0 ${
              isDesktopCollapsed ? 'justify-center w-full' : ''
            }`}
            title="NutriRede — Início"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-700 via-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform shrink-0">
              <HeartHandshake className="w-5 h-5" />
            </div>
            {!isDesktopCollapsed && (
              <div className="truncate">
                <span className="text-lg font-bold tracking-tight text-emerald-950 font-serif block truncate">
                  Nutri<span className="text-emerald-600">Rede</span>
                </span>
                <span className="text-[10px] text-stone-500 block truncate -mt-0.5 font-sans">
                  Rede de Alimentos
                </span>
              </div>
            )}
          </div>

          {!isDesktopCollapsed && (
            <button
              type="button"
              onClick={() => setIsDesktopCollapsed(true)}
              title="Recolher menu lateral"
              aria-label="Recolher menu lateral"
              aria-expanded={!isDesktopCollapsed}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shrink-0 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Botão de expansão no topo quando recolhido */}
        {isDesktopCollapsed && (
          <div className="p-2 border-b border-stone-100 flex justify-center shrink-0">
            <button
              type="button"
              onClick={() => setIsDesktopCollapsed(false)}
              title="Expandir menu lateral"
              aria-label="Expandir menu lateral"
              aria-expanded={!isDesktopCollapsed}
              className="p-1.5 rounded-lg text-stone-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Seção MINHA CONTA no Menu Lateral (M49) */}
        {currentUser && (
          <div className="p-2.5 border-b border-stone-100 shrink-0">
            {!isDesktopCollapsed ? (
              <button
                type="button"
                onClick={onOpenAccountModal}
                className="w-full text-left p-2.5 rounded-2xl bg-stone-50/80 hover:bg-emerald-50/80 border border-stone-200/80 hover:border-emerald-300 transition-all flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shadow-2xs cursor-pointer"
                title="Abrir Minha Conta e Dados Cadastrais"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-700 via-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                  {userAccount?.name?.charAt(0).toUpperCase() || currentUser.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-900 truncate font-serif">
                      {userAccount?.name || 'Minha Conta'}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold group-hover:underline">
                      Gerenciar
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 truncate mt-0.5">
                    {currentUser.email}
                  </p>
                </div>
              </button>
            ) : (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={onOpenAccountModal}
                  title={`Minha Conta — ${userAccount?.name || currentUser.email}`}
                  aria-label="Minha Conta"
                  className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-700 via-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-sm shadow-xs hover:scale-105 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer"
                >
                  {userAccount?.name?.charAt(0).toUpperCase() || currentUser.email?.charAt(0).toUpperCase() || 'U'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Corpo com Rolagem: Navegação Principal + MEUS PERFIS */}
        <div className="flex-1 p-3 space-y-4 overflow-y-auto">
          {/* Navegação de Telas */}
          <nav className="space-y-1">
            {navItems
              .filter((item) => {
                if (item.requiresAuth && !currentUser) return false;
                if (item.requiresAdmin && !isAdmin) return false;
                return true;
              })
              .map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectView(item.id)}
                    title={isDesktopCollapsed ? item.label : undefined}
                    aria-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer ${
                      isDesktopCollapsed ? 'justify-center px-0' : ''
                    } ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-800 shadow-2xs font-bold border-l-4 border-emerald-600 pl-2.5'
                        : 'text-stone-600 hover:text-emerald-700 hover:bg-stone-50'
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 shrink-0 ${
                        isActive ? 'text-emerald-700' : 'text-stone-400 group-hover:text-emerald-600'
                      }`}
                    />
                    {!isDesktopCollapsed && (
                      <div className="flex items-center justify-between flex-1 min-w-0">
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
          </nav>

          {/* Seção MEUS PERFIS no Menu Lateral (M49) */}
          {currentUser && userProfiles.length > 0 && (
            <div className="pt-2 border-t border-stone-100">
              {!isDesktopCollapsed ? (
                <div className="space-y-1.5">
                  <div className="px-2 pb-1 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                      Meus Perfis ({userProfiles.length}/3)
                    </span>
                    {userProfiles.length < 3 && (
                      <button
                        type="button"
                        onClick={onOpenRequestProfile}
                        title="Solicitar outro perfil"
                        className="text-[10px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5 cursor-pointer"
                      >
                        <PlusCircle className="w-3 h-3" />
                        <span>Novo</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-1">
                    {userProfiles.map((prof) => {
                      const meta = PROFILE_DEFINITIONS[prof.profileType];
                      const statusConfig = STATUS_CONFIG[prof.status];
                      const isActive = activeProfile?.id === prof.id;

                      return (
                        <button
                          key={prof.id}
                          type="button"
                          onClick={() => {
                            switchActiveProfileType(prof.profileType);
                            handleSelectView('dashboard');
                          }}
                          className={`w-full text-left p-2 rounded-xl transition-all flex items-center justify-between gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-950 font-bold border-l-4 border-emerald-600 shadow-2xs pl-2'
                              : 'text-stone-700 hover:bg-stone-50'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`p-1 rounded-lg shrink-0 ${
                                isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                              }`}
                            >
                              {getProfileIcon(prof.profileType)}
                            </span>
                            <div className="min-w-0">
                              <span className="text-xs font-bold block truncate">
                                {meta?.title || prof.profileType}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(prof.status)} shrink-0`} />
                                <span className="text-[10px] text-stone-500 font-medium">
                                  {statusConfig?.label}
                                </span>
                              </div>
                            </div>
                          </div>

                          {isActive && (
                            <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300 shrink-0">
                              Ativo
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Ícones dos perfis quando recolhido */
                <div className="space-y-2 flex flex-col items-center">
                  <span className="text-[9px] font-bold text-stone-400 uppercase tracking-tighter">
                    Perfis
                  </span>
                  {userProfiles.map((prof) => {
                    const meta = PROFILE_DEFINITIONS[prof.profileType];
                    const statusConfig = STATUS_CONFIG[prof.status];
                    const isActive = activeProfile?.id === prof.id;

                    return (
                      <button
                        key={prof.id}
                        type="button"
                        onClick={() => {
                          switchActiveProfileType(prof.profileType);
                          handleSelectView('dashboard');
                        }}
                        title={`${meta?.title || prof.profileType}: ${statusConfig?.label} ${
                          isActive ? '(Perfil Ativo)' : ''
                        }`}
                        aria-label={`${meta?.title}: ${statusConfig?.label}`}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-600 shadow-2xs'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        {getProfileIcon(prof.profileType)}
                      </button>
                    );
                  })}
                  {userProfiles.length < 3 && (
                    <button
                      type="button"
                      onClick={onOpenRequestProfile}
                      title="Solicitar outro perfil"
                      aria-label="Solicitar outro perfil"
                      className="w-7 h-7 rounded-lg border border-dashed border-stone-300 text-stone-400 hover:text-emerald-700 hover:border-emerald-400 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rodapé do Menu Desktop */}
        <div className="p-3 border-t border-stone-100 shrink-0">
          {!isDesktopCollapsed ? (
            <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/70 text-xs text-stone-600 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="text-[11px] font-medium text-stone-700 truncate">
                  NutriRede • MVP v1.1
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsDesktopCollapsed(true)}
                title="Recolher menu"
                aria-label="Recolher menu lateral"
                className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex justify-center" title="NutriRede • MVP v1.1 Ativo">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          )}
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. MOBILE DRAWER (Gaveta deslizante para iPhone/Android) */}
      {/* ======================================================== */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Fundo escurecido com clique para fechar */}
          <div
            className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileOpen(false)}
            aria-hidden="true"
          />

          {/* Painel da gaveta */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu de Navegação Principal"
            className="relative w-80 max-w-[88vw] bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-200 z-50"
          >
            {/* Topo da Gaveta */}
            <div>
              <div className="p-4 border-b border-stone-100 flex items-center justify-between">
                <div
                  onClick={() => handleSelectView('home')}
                  className="flex items-center gap-2.5 cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-700 via-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-xs">
                    <HeartHandshake className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-lg font-bold tracking-tight text-emerald-950 font-serif">
                      Nutri<span className="text-emerald-600">Rede</span>
                    </span>
                    <p className="text-[10px] text-stone-500">Navegação Principal</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMobileOpen(false)}
                  aria-label="Fechar menu de navegação"
                  className="p-2 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Informação do Usuário & Acesso a Minha Conta na Gaveta Mobile */}
              {currentUser && (
                <div className="p-4 bg-emerald-50/50 border-b border-emerald-100/80 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-700 via-emerald-600 to-teal-500 text-white flex items-center justify-center text-sm font-bold shadow-xs shrink-0">
                      {userAccount?.name?.charAt(0).toUpperCase() || currentUser.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-stone-900 truncate font-serif">
                        {userAccount?.name || 'Usuário Conectado'}
                      </p>
                      <p className="text-[10px] text-stone-500 truncate">{currentUser.email}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileOpen(false);
                      onOpenAccountModal();
                    }}
                    className="w-full py-1.5 px-3 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 shadow-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Minha Conta • Gerenciar Dados</span>
                  </button>
                </div>
              )}

              {/* Links de Navegação Mobile */}
              <nav className="p-3 space-y-1">
                {navItems
                  .filter((item) => {
                    if (item.requiresAuth && !currentUser) return false;
                    if (item.requiresAdmin && !isAdmin) return false;
                    return true;
                  })
                  .map((item) => {
                    const Icon = item.icon;
                    const isActive = currentView === item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectView(item.id)}
                        aria-current={isActive ? 'page' : undefined}
                        className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-800 font-bold border-l-4 border-emerald-600 pl-3'
                            : 'text-stone-700 hover:text-emerald-700 hover:bg-stone-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon
                            className={`w-5 h-5 ${
                              isActive ? 'text-emerald-700' : 'text-stone-400'
                            }`}
                          />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
              </nav>

              {/* Seção MEUS PERFIS na Gaveta Mobile (M49) */}
              {currentUser && userProfiles.length > 0 && (
                <div className="p-3 border-t border-stone-100 space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                      Meus Perfis de Atuação ({userProfiles.length}/3)
                    </span>
                    {userProfiles.length < 3 && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileOpen(false);
                          onOpenRequestProfile();
                        }}
                        className="text-[10px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5 cursor-pointer"
                      >
                        <PlusCircle className="w-3 h-3" />
                        <span>Novo</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {userProfiles.map((prof) => {
                      const meta = PROFILE_DEFINITIONS[prof.profileType];
                      const statusConfig = STATUS_CONFIG[prof.status];
                      const isActive = activeProfile?.id === prof.id;

                      return (
                        <button
                          key={prof.id}
                          type="button"
                          onClick={() => {
                            switchActiveProfileType(prof.profileType);
                            handleSelectView('dashboard');
                          }}
                          className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between gap-2 cursor-pointer ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-950 font-bold border-l-4 border-emerald-600 shadow-2xs'
                              : 'bg-stone-50 hover:bg-stone-100 text-stone-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`p-1.5 rounded-lg shrink-0 ${
                                isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-white text-stone-600'
                              }`}
                            >
                              {getProfileIcon(prof.profileType)}
                            </span>
                            <div className="min-w-0">
                              <span className="text-xs font-bold block truncate">
                                {meta?.title || prof.profileType}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(prof.status)} shrink-0`} />
                                <span className="text-[10px] text-stone-500 font-medium">
                                  {statusConfig?.label}
                                </span>
                              </div>
                            </div>
                          </div>

                          {isActive && (
                            <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300 shrink-0">
                              Ativo
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Rodapé da Gaveta Mobile */}
            <div className="p-4 border-t border-stone-100 bg-stone-50 space-y-3 shrink-0">
              {!currentUser ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileOpen(false);
                      onOpenLogin();
                    }}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    Entrar na Conta
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileOpen(false);
                      onOpenRegister();
                    }}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-emerald-800 bg-white border border-emerald-300 hover:bg-emerald-50 inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    Criar Nova Conta
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileOpen(false);
                    logout();
                  }}
                  className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 inline-flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Encerrar Sessão
                </button>
              )}

              <div className="text-[10px] text-stone-500 text-center flex items-center justify-center gap-1.5 pt-1">
                <Leaf className="w-3 h-3 text-emerald-600" />
                <span>NutriRede • Protótipo Acadêmico</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
