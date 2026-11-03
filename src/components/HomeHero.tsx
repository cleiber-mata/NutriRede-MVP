import React from 'react';
import {
  HeartHandshake,
  Shield,
  LogIn,
  UserPlus,
  Store,
  Building2,
  Truck,
  CheckCircle,
  Sparkles,
  ArrowRight,
  Leaf,
  Layers,
  FileCheck2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HomeHeroProps {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onOpenAdmin: () => void;
  onViewDashboard: () => void;
  onViewAcademic: () => void;
}

export const HomeHero: React.FC<HomeHeroProps> = ({
  onOpenLogin,
  onOpenRegister,
  onOpenAdmin,
  onViewDashboard,
  onViewAcademic,
}) => {
  const { currentUser, isAdmin } = useAuth();

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-emerald-50/60 via-stone-50/40 to-white">
      {/* Decorative organic background elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 pointer-events-none opacity-40">
        <div className="absolute -top-24 left-1/4 w-80 h-80 rounded-full bg-emerald-200/50 blur-3xl" />
        <div className="absolute top-10 right-1/4 w-96 h-96 rounded-full bg-teal-200/40 blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-20 relative">
        {/* Top badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-300 text-emerald-800 text-xs font-semibold tracking-wide shadow-xs">
            <Leaf className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sistema Acadêmico de Redução do Desperdício Alimentar</span>
            <span className="text-emerald-400">•</span>
            <span className="text-emerald-900 font-bold">Conectando Alimentos a Quem Precisa</span>
          </div>
        </div>

        {/* Hero titles */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-stone-900 tracking-tight font-serif leading-tight">
            Nutri<span className="text-emerald-600">Rede</span>
          </h1>
          <p className="mt-3 text-xl sm:text-2xl font-medium text-emerald-800 font-sans">
            "Conectando alimentos a quem precisa."
          </p>
          <p className="mt-4 text-base sm:text-lg text-stone-600 leading-relaxed">
            Plataforma colaborativa e segura para conectar estabelecimentos doadores, entidades receptoras de assistência social e transportadores voluntários, sob supervisão administrativa individual por perfil.
          </p>
        </div>

        {/* 3 Main Action Cards (Requisito Seção 4) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
          {/* Card 1: Entrar como Usuário Cadastrado */}
          <div
            onClick={currentUser ? onViewDashboard : onOpenLogin}
            className="group relative bg-white rounded-2xl p-6 border-2 border-emerald-100 hover:border-emerald-500 shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <LogIn className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Opção 1 • Acesso Direto
              </span>
              <h3 className="text-xl font-bold text-stone-900 mt-1 mb-2 group-hover:text-emerald-700 transition-colors">
                {currentUser ? 'Acessar Meu Painel' : 'Entrar como Usuário Cadastrado'}
              </h3>
              <p className="text-sm text-stone-600 leading-normal">
                {currentUser
                  ? 'Você já está conectado. Acesse seus perfis e selecione sua atuação ativa.'
                  : 'Faça login com e-mail e senha para visualizar a situação dos seus perfis e atuar na rede.'}
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between text-sm font-semibold text-emerald-700">
              <span>{currentUser ? 'Ir para o painel' : 'Acessar com credenciais'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 2: Cadastrar Novo Usuário */}
          <div
            onClick={onOpenRegister}
            className="group relative bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-200 cursor-pointer flex flex-col justify-between hover:scale-[1.02]"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-white/20 text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <UserPlus className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                Opção 2 • Novo Ingresso
              </span>
              <h3 className="text-xl font-bold text-white mt-1 mb-2">
                Cadastrar Novo Usuário
              </h3>
              <p className="text-sm text-emerald-50 leading-normal">
                Crie sua conta única e selecione um, dois ou os três perfis de atuação: Doador, Entidade Receptora ou Transportador.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/20 flex items-center justify-between text-sm font-semibold text-white">
              <span>Criar conta gratuita</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 3: Área do Administrador */}
          <div
            onClick={onOpenAdmin}
            className="group relative bg-white rounded-2xl p-6 border-2 border-amber-200 hover:border-amber-500 shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                  Opção 3 • Gestão Segura
                </span>
                {isAdmin && (
                  <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                    Autorizado
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold text-stone-900 mt-1 mb-2 group-hover:text-amber-800 transition-colors">
                Área do Administrador
              </h3>
              <p className="text-sm text-stone-600 leading-normal">
                Supervisão exclusiva para avaliar contas, consultar pedidos pendentes e aprovar ou rejeitar cada perfil individualmente.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between text-sm font-semibold text-amber-800">
              <span>Painel de homologação</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>

        {/* Os 3 Perfis de Atuação e Regra Fundamental do PRD */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-stone-200 shadow-xs max-w-5xl mx-auto mb-16">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold mb-2">
              <Layers className="w-3.5 h-3.5" />
              Regra de Negócio Fundamental (RN01)
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-950 font-serif">
              Três Perfis, Uma Conta Única
            </h2>
            <p className="text-stone-600 text-sm sm:text-base mt-2">
              Uma mesma conta pode ter qualquer combinação de perfis. Cada perfil possui aprovação e ciclo de vida totalmente independentes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Doador */}
            <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-3">
                <Store className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-stone-900 text-base">1. Doador</h4>
              <p className="text-xs text-emerald-800 font-medium mb-2">
                Supermercados, feiras, restaurantes e agricultores
              </p>
              <p className="text-xs text-stone-600 leading-relaxed">
                Disponibiliza lotes de alimentos excedentes com registro de validade e condições de conservação.
              </p>
              <div className="mt-3 text-[11px] font-semibold text-emerald-700 bg-white/80 px-2 py-1 rounded-md border border-emerald-100">
                Aprovação inicial: Pendente
              </div>
            </div>

            {/* Entidade Receptora */}
            <div className="p-5 rounded-2xl bg-teal-50/50 border border-teal-200/80">
              <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center mb-3">
                <Building2 className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-stone-900 text-base">2. Entidade Receptora</h4>
              <p className="text-xs text-teal-800 font-medium mb-2">
                ONGs, cozinhas comunitárias, creches e abrigos
              </p>
              <p className="text-xs text-stone-600 leading-relaxed">
                Recebe as doações, prepara refeições e distribui para pessoas e famílias em vulnerabilidade.
              </p>
              <div className="mt-3 text-[11px] font-semibold text-teal-700 bg-white/80 px-2 py-1 rounded-md border border-teal-100">
                Aprovação inicial: Pendente
              </div>
            </div>

            {/* Transportador */}
            <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-200/80">
              <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center mb-3">
                <Truck className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-stone-900 text-base">3. Transportador</h4>
              <p className="text-xs text-amber-800 font-medium mb-2">
                Motoristas voluntários e parceiros de logística
              </p>
              <p className="text-xs text-stone-600 leading-relaxed">
                Realiza o transporte seguro dos alimentos do doador até o endereço da entidade receptora.
              </p>
              <div className="mt-3 text-[11px] font-semibold text-amber-700 bg-white/80 px-2 py-1 rounded-md border border-amber-100">
                Aprovação inicial: Pendente
              </div>
            </div>
          </div>

          {/* Destaque Acadêmico do MVP NutriRede */}
          <div className="mt-8 p-4 rounded-xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <FileCheck2 className="w-6 h-6 text-emerald-700 shrink-0" />
              <div className="text-xs text-stone-700">
                <span className="font-bold text-stone-900">Escopo Consolidado do MVP:</span> Doação, Coleta, Transporte e Recebimento de Alimentos com Conformidade Total aos Requisitos RF01–RF16.
              </div>
            </div>
            <button
              onClick={onViewAcademic}
              className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-stone-300 text-stone-800 hover:bg-stone-100 transition-colors"
            >
              Ver Matriz de Requisitos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
