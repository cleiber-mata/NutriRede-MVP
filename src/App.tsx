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
import { Footer } from './components/Footer';

function MainApp() {
  const { currentUser, isAdmin, isLoading } = useAuth();

  const [currentView, setCurrentView] = useState<'home' | 'dashboard' | 'admin' | 'academic'>('home');
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isRequestProfileOpen, setIsRequestProfileOpen] = useState(false);

  // Se o usuário logar e estiver na home, pode transitar para o dashboard se preferir
  const handleLoginSuccess = () => {
    setCurrentView('dashboard');
  };

  const handleRegisterSuccess = () => {
    setIsRegisterOpen(false);
    setIsLoginOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 font-sans text-stone-900 selection:bg-emerald-100 selection:text-emerald-900">
      {/* Barra de Navegação */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        onOpenLogin={() => setIsLoginOpen(true)}
        onOpenRegister={() => setIsRegisterOpen(true)}
        onOpenAdmin={() => setCurrentView('admin')}
        onOpenRequestProfile={() => setIsRequestProfileOpen(true)}
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

      {/* Modais de Cadastro, Login e Solicitação de Perfil */}
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
