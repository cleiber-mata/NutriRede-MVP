import React, { useState } from 'react';
import {
  ChevronDown,
  HeartHandshake,
  LogOut,
  Shield,
  User,
  PlusCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PROFILE_DEFINITIONS, ProfileType, STATUS_CONFIG } from '../types';

interface NavbarProps {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onOpenAdmin: () => void;
  onOpenRequestProfile: () => void;
  currentView: 'home' | 'dashboard' | 'admin' | 'academic';
  setCurrentView: (view: 'home' | 'dashboard' | 'admin' | 'academic') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenLogin,
  onOpenRegister,
  onOpenAdmin,
  onOpenRequestProfile,
  currentView,
  setCurrentView,
}) => {
  const { currentUser, userAccount, userProfiles, activeProfile, switchActiveProfileType, isAdmin, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APROVADO':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline mr-1" />;
      case 'REJEITADO':
        return <XCircle className="w-3.5 h-3.5 text-rose-600 inline mr-1" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-amber-600 inline mr-1" />;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-emerald-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Slogan */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setCurrentView('home')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-700 via-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-emerald-700/20 group-hover:scale-105 transition-transform">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-emerald-950 font-serif">
                  Nutri<span className="text-emerald-600">Rede</span>
                </span>
              </div>
              <p className="text-xs text-stone-500 hidden sm:block">
                Conectando alimentos a quem precisa
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setCurrentView('home')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                currentView === 'home'
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'text-stone-600 hover:text-emerald-700 hover:bg-stone-50'
              }`}
            >
              Início
            </button>

            {currentUser && (
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  currentView === 'dashboard'
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'text-stone-600 hover:text-emerald-700 hover:bg-stone-50'
                }`}
              >
                Meu Painel
              </button>
            )}

            <button
              onClick={() => setCurrentView('academic')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                currentView === 'academic'
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'text-stone-600 hover:text-emerald-700 hover:bg-stone-50'
              }`}
            >
              Requisitos & Testes
            </button>

            {isAdmin && (
              <button
                onClick={() => {
                  setCurrentView('admin');
                  onOpenAdmin();
                }}
                className={`px-3 py-1.5 text-sm font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                  currentView === 'admin'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <Shield className="w-4 h-4 text-amber-600" />
                Área Administrativa
              </button>
            )}
          </nav>

          {/* Right Action Area */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="relative">
                {/* Active Profile Pill / Dropdown Trigger */}
                <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 p-1 pl-2.5 rounded-xl">
                  {activeProfile ? (
                    <div
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() => setShowProfileMenu(!showProfileMenu)}
                    >
                      <div className="text-left">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-stone-900">
                            {PROFILE_DEFINITIONS[activeProfile.profileType]?.title || activeProfile.profileType}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-md font-medium border ${
                              STATUS_CONFIG[activeProfile.status]?.badgeClass
                            }`}
                          >
                            {getStatusIcon(activeProfile.status)}
                            {STATUS_CONFIG[activeProfile.status]?.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 truncate max-w-[120px]">
                          {userAccount?.name || currentUser.email}
                        </p>
                      </div>
                      <ChevronDown className="w-4 h-4 text-stone-500 hover:text-stone-700 mr-1" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-stone-600 px-2 py-1">
                      <User className="w-3.5 h-3.5" />
                      <span>{userAccount?.name || currentUser.email}</span>
                    </div>
                  )}

                  <button
                    onClick={logout}
                    title="Encerrar sessão"
                    className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>

                {/* Profile Switcher Dropdown */}
                {showProfileMenu && (
                  <div
                    className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-stone-200 p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                    onMouseLeave={() => setShowProfileMenu(false)}
                  >
                    <div className="pb-2 border-b border-stone-100 mb-2">
                      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        Perfis da sua conta
                      </p>
                      <p className="text-xs text-stone-400">
                        Selecione para alternar seu ambiente de atuação:
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      {userProfiles.map((prof) => {
                        const meta = PROFILE_DEFINITIONS[prof.profileType];
                        const statusMeta = STATUS_CONFIG[prof.status];
                        const isActive = activeProfile?.id === prof.id;

                        return (
                          <div
                            key={prof.id}
                            onClick={() => {
                              switchActiveProfileType(prof.profileType);
                              setShowProfileMenu(false);
                              setCurrentView('dashboard');
                            }}
                            className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                              isActive
                                ? 'border-emerald-500 bg-emerald-50/70 shadow-xs'
                                : 'border-stone-100 hover:border-emerald-200 hover:bg-stone-50'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-bold text-stone-900">
                                {meta?.title || prof.profileType}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${statusMeta?.badgeClass}`}
                              >
                                {getStatusIcon(prof.status)}
                                {statusMeta?.label}
                              </span>
                            </div>
                            <p className="text-[11px] text-stone-500 line-clamp-1">
                              {meta?.subtitle}
                            </p>
                            {isActive && (
                              <p className="text-[10px] text-emerald-700 font-medium mt-1">
                                ✓ Perfil atualmente em uso
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {userProfiles.length < 3 && (
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          onOpenRequestProfile();
                        }}
                        className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 rounded-lg border border-dashed border-emerald-300 transition-colors"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        Solicitar outro perfil
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenLogin}
                  className="px-3.5 py-2 text-sm font-semibold text-stone-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors"
                >
                  Entrar
                </button>
                <button
                  onClick={onOpenRegister}
                  className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs shadow-emerald-700/20 transition-all hover:scale-[1.02]"
                >
                  Cadastrar
                </button>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-stone-100 space-y-1">
            <button
              onClick={() => {
                setCurrentView('home');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm font-medium rounded-lg text-stone-700 hover:bg-stone-50"
            >
              Início
            </button>
            {currentUser && (
              <button
                onClick={() => {
                  setCurrentView('dashboard');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm font-medium rounded-lg text-stone-700 hover:bg-stone-50"
              >
                Meu Painel de Perfis
              </button>
            )}
            <button
              onClick={() => {
                setCurrentView('academic');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm font-medium rounded-lg text-stone-700 hover:bg-stone-50"
            >
              Requisitos & Testes (RF01–RF08)
            </button>
            {isAdmin && (
              <button
                onClick={() => {
                  setCurrentView('admin');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm font-medium rounded-lg text-amber-800 bg-amber-50"
              >
                Área Administrativa
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
