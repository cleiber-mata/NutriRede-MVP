/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { HomeHero } from './components/HomeHero';
import { UserProfileDashboard } from './components/UserProfileDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { AcademicCompliance } from './components/AcademicCompliance';
import { RegisterModal } from './components/RegisterModal';
import { LoginModal } from './components/LoginModal';
import { RequestProfileModal } from './components/RequestProfileModal';
import { InitialProfileSetupModal } from './components/InitialProfileSetupModal';
import { Footer } from './components/Footer';
import { SidebarNav } from './components/SidebarNav';
import { AccountModal } from './components/AccountModal';
import { EditProfileModal } from './components/EditProfileModal';
import { ChangeEmailModal } from './components/ChangeEmailModal';
import { DeactivateProfileModal } from './components/DeactivateProfileModal';
import { NAVIGATION_CONFIG } from './config/navigationConfig';
import { UserProfileDoc } from './types';

function MainApp() {
  const {
    currentUser,
    isAdmin,
    isLoading,
    userProfiles,
    isProfilesLoaded,
    switchActiveProfileType,
    reloadUserData,
  } = useAuth();

  const [currentView, setCurrentView] = useState<'home' | 'dashboard' | 'admin' | 'academic'>('home');
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isRequestProfileOpen, setIsRequestProfileOpen] = useState(false);
  const [isInitialSetupOpen, setIsInitialSetupOpen] = useState(false);
  const [hasDismissedInitialSetup, setHasDismissedInitialSetup] = useState(false);

  // M49: Estado dos modais de gerenciamento de conta
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isChangeEmailOpen, setIsChangeEmailOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<UserProfileDoc | null>(null);

  // M48: Estado do menu lateral com persistência de preferência
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem(NAVIGATION_CONFIG.STORAGE_KEY_COLLAPSED);
      return saved === 'true';
    } catch {
      return false;
    }
  });
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const handleToggleDesktopCollapse = (value: boolean | ((prev: boolean) => boolean)) => {
    setIsDesktopCollapsed((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      try {
        localStorage.setItem(NAVIGATION_CONFIG.STORAGE_KEY_COLLAPSED, String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  // Monitora se o usuário autenticado não possui nenhum perfil cadastrado (ex: primeiro acesso Google)
  // O onboarding só é disparado APÓS a confirmação de que os perfis foram efetivamente carregados do Firestore,
  // evitando confundir o estado transitório de carregamento inicial com a ausência definitiva de perfis.
  React.useEffect(() => {
    if (
      currentUser &&
      !isLoading &&
      isProfilesLoaded &&
      userProfiles &&
      userProfiles.length === 0 &&
      !hasDismissedInitialSetup
    ) {
      setIsInitialSetupOpen(true);
    }
  }, [currentUser, isLoading, isProfilesLoaded, userProfiles, hasDismissedInitialSetup]);

  // Se o usuário logar e estiver na home, transita para o dashboard
  const handleLoginSuccess = () => {
    setCurrentView('dashboard');
  };

  const handleRegisterSuccess = () => {
    setIsRegisterOpen(false);
    setIsLoginOpen(true);
  };

  return (
    <div className="min-h-screen flex bg-stone-50 font-sans text-stone-900 selection:bg-emerald-100 selection:text-emerald-900">
      {/* Menu Lateral Profissional (M48/M49: Desktop recolhível + Mobile Drawer) */}
      {NAVIGATION_CONFIG.ENABLE_SIDEBAR_NAV && (
        <SidebarNav
          currentView={currentView}
          setCurrentView={setCurrentView}
          isDesktopCollapsed={isDesktopCollapsed}
          setIsDesktopCollapsed={handleToggleDesktopCollapse}
          isMobileOpen={isMobileDrawerOpen}
          setIsMobileOpen={setIsMobileDrawerOpen}
          onOpenLogin={() => setIsLoginOpen(true)}
          onOpenRegister={() => setIsRegisterOpen(true)}
          onOpenAccountModal={() => setIsAccountModalOpen(true)}
          onOpenRequestProfile={() => setIsRequestProfileOpen(true)}
        />
      )}

      {/* Área Principal: Cabeçalho, Conteúdo e Rodapé */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        {/* Barra de Navegação Superior */}
        <Navbar
          currentView={currentView}
          setCurrentView={setCurrentView}
          onOpenLogin={() => setIsLoginOpen(true)}
          onOpenRegister={() => setIsRegisterOpen(true)}
          onOpenAdmin={() => setCurrentView('admin')}
          onOpenRequestProfile={() => setIsRequestProfileOpen(true)}
          hasSidebar={NAVIGATION_CONFIG.ENABLE_SIDEBAR_NAV}
          isMobileDrawerOpen={isMobileDrawerOpen}
          onToggleMobileDrawer={() => setIsMobileDrawerOpen((prev) => !prev)}
        />

        {/* Conteúdo Principal de acordo com a visão selecionada */}
        <main className="flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
              <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-semibold text-stone-600">Carregando o NutriRede...</p>
            </div>
          ) : (
            <>
              {currentView === 'home' && (
                <HomeHero
                  onOpenLogin={() => setIsLoginOpen(true)}
                  onOpenRegister={() => setIsRegisterOpen(true)}
                  onOpenAdmin={() => {
                    if (!currentUser) {
                      setIsLoginOpen(true);
                    } else {
                      setCurrentView('admin');
                    }
                  }}
                  onViewDashboard={() => setCurrentView('dashboard')}
                  onViewAcademic={() => setCurrentView('academic')}
                />
              )}

              {currentView === 'dashboard' && (
                <UserProfileDashboard
                  onOpenRequestProfile={() => setIsRequestProfileOpen(true)}
                  onOpenAdmin={() => setCurrentView('admin')}
                  onOpenInitialProfileSetup={() => setIsInitialSetupOpen(true)}
                  hasSidebar={NAVIGATION_CONFIG.ENABLE_SIDEBAR_NAV}
                />
              )}

              {currentView === 'admin' && (
                <AdminDashboard onBackToHome={() => setCurrentView('home')} />
              )}

              {currentView === 'academic' && <AcademicCompliance />}
            </>
          )}
        </main>

        {/* Rodapé da Aplicação */}
        <Footer
          onOpenAdmin={() => {
            if (!currentUser) {
              setIsLoginOpen(true);
            } else {
              setCurrentView('admin');
            }
          }}
          onOpenAcademic={() => setCurrentView('academic')}
        />
      </div>

      {/* Modais de Cadastro, Login, Solicitação de Perfil e Onboarding Google */}
      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSuccessGoToLogin={handleRegisterSuccess}
        onSwitchToLogin={() => {
          setIsRegisterOpen(false);
          setIsLoginOpen(true);
        }}
      />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSwitchToRegister={() => {
          setIsLoginOpen(false);
          setIsRegisterOpen(true);
        }}
        onSuccess={handleLoginSuccess}
      />

      <RequestProfileModal
        isOpen={isRequestProfileOpen}
        onClose={() => setIsRequestProfileOpen(false)}
      />

      <InitialProfileSetupModal
        isOpen={isInitialSetupOpen}
        onClose={() => {
          setIsInitialSetupOpen(false);
          setHasDismissedInitialSetup(true);
        }}
        onSuccess={() => {
          setIsInitialSetupOpen(false);
          setCurrentView('dashboard');
        }}
      />

      {/* M49: Modais de Gerenciamento da Conta e Perfis */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onOpenEditProfile={() => setIsEditModalOpen(true)}
        onOpenChangeEmail={() => setIsChangeEmailOpen(true)}
        onOpenRequestProfile={() => setIsRequestProfileOpen(true)}
        onOpenDeactivateProfile={(profile) => setDeactivateTarget(profile)}
        onSelectProfile={(profileType) => {
          switchActiveProfileType(profileType);
          setCurrentView('dashboard');
        }}
      />

      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />

      <ChangeEmailModal
        isOpen={isChangeEmailOpen}
        onClose={() => setIsChangeEmailOpen(false)}
      />

      <DeactivateProfileModal
        profile={deactivateTarget}
        isOpen={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onSuccess={() => {
          reloadUserData();
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
