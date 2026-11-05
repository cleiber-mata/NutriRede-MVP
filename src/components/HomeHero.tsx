import React from 'react';
import {
  Shield,
  LogIn,
  UserPlus,
  Store,
  Building2,
  Truck,
  ArrowRight,
  Leaf,
  Layers,
  FileCheck2,
  CheckCircle2
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
  const { currentUser, isAdmin, userAccount } = useAuth();

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-emerald-50/50 via-stone-50/30 to-white">
      {/* Elementos decorativos sutis no fundo */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-80 pointer-events-none opacity-30">
        <div className="absolute -top-20 left-1/4 w-72 h-72 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute top-6 right-1/4 w-80 h-80 rounded-full bg-teal-200/30 blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-14 relative">
        {/* Top badge */}
        <div className="flex justify-center mb-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-100/70 border border-emerald-300 text-emerald-800 text-xs font-semibold tracking-wide shadow-2xs">
            <Leaf className="w-3.5 h-3.5 text-emerald-600" />
            <span>Protótipo Acadêmico</span>
            <span className="text-emerald-400">•</span>
            <span className="text-emerald-900 font-bold">NutriRede</span>
          </div>
        </div>

        {/* Títulos principais */}
        <div className="text-center max-w-3xl mx-auto mb-8">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-stone-900 tracking-tight font-serif">
            Nutri<span className="text-emerald-600">Rede</span>
          </h1>
          <p className="mt-2 text-lg sm:text-xl font-medium text-emerald-800 font-sans">
            "Conectando alimentos a quem precisa."
          </p>
          <p className="mt-3 text-sm sm:text-base text-stone-600 leading-relaxed max-w-2xl mx-auto">
            Plataforma colaborativa para conectar estabelecimentos doadores, entidades receptoras de assistência social e transportadores voluntários, sob supervisão administrativa independente por perfil.
          </p>
        </div>

        {/* Ações Inteligentes (Conforme status de autenticação) */}
        <div className="max-w-2xl mx-auto mb-12">
          {currentUser ? (
            /* Usuário Autenticado: Destaque para Meu Painel */
            <div className="bg-white rounded-2xl p-5 border border-emerald-200 shadow-sm text-center space-y-4">
              <div className="text-xs text-stone-600">
                <span className="font-semibold text-emerald-800">Sessão ativa:</span>{' '}
                <strong className="text-stone-900">{userAccount?.name || currentUser.displayName || currentUser.email}</strong>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onViewDashboard}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-xs hover:shadow transition-all inline-flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Acessar Meu Painel</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={onOpenAdmin}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-semibold text-sm transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Shield className="w-4 h-4 text-amber-700" />
                    <span>Painel Administrativo</span>
                    <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded-full font-bold">
                      Autorizado
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onViewAcademic}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200 font-medium text-xs transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileCheck2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Requisitos & Testes</span>
                </button>
              </div>
            </div>
          ) : (
            /* Visitante Não Autenticado: Destaque para Entrar e Cadastrar */
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={onOpenLogin}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-xs hover:shadow transition-all inline-flex items-center justify-center gap-2 group cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Entrar no Sistema</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                type="button"
                onClick={onOpenRegister}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 border-2 border-emerald-600 font-semibold text-sm transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-emerald-700" />
                <span>Cadastrar Novo Usuário</span>
              </button>

              <button
                type="button"
                onClick={onOpenAdmin}
                className="w-full sm:w-auto px-4 py-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 font-medium text-xs transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer"
                title="Acesso exclusivo a administradores autorizados"
              >
                <Shield className="w-3.5 h-3.5 text-amber-700" />
                <span>Área Administrativa</span>
              </button>
            </div>
          )}
        </div>

        {/* Apresentação Resumida dos Três Perfis (Sem duplicações) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-2xs max-w-5xl mx-auto mb-8">
          <div className="text-center max-w-2xl mx-auto mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold mb-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span>Três Perfis em Uma Conta Única</span>
            </div>
            <p className="text-stone-600 text-xs sm:text-sm">
              Cada conta de usuário pode solicitar qualquer combinação dos três perfis. Cada perfil possui aprovação e ciclo de vida totalmente independentes pela administração.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Doador */}
            <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-200/70 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Store className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-stone-900 text-sm">1. Doador</h3>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Supermercados, feiras e restaurantes cadastram ofertas de alimentos com data de validade, horário-limite e instruções de conservação.
                </p>
              </div>
              <div className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded-md inline-block self-start">
                Homologação individual
              </div>
            </div>

            {/* Entidade Receptora */}
            <div className="p-4 rounded-2xl bg-teal-50/40 border border-teal-200/70 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-stone-900 text-sm">2. Entidade Receptora</h3>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  ONGs e cozinhas comunitárias solicitam reservas de lotes disponíveis para distribuição e preparo de refeições a pessoas em vulnerabilidade.
                </p>
              </div>
              <div className="text-[11px] font-semibold text-teal-800 bg-teal-100/60 px-2 py-0.5 rounded-md inline-block self-start">
                Homologação individual
              </div>
            </div>

            {/* Transportador */}
            <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200/70 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0">
                    <Truck className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-stone-900 text-sm">3. Transportador</h3>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Voluntários e parceiros realizam a coleta no doador e a entrega protocolada na entidade receptora com registro de ocorrências.
                </p>
              </div>
              <div className="text-[11px] font-semibold text-amber-800 bg-amber-100/60 px-2 py-0.5 rounded-md inline-block self-start">
                Homologação individual
              </div>
            </div>
          </div>
        </div>

        {/* Apresentação do MVP Acadêmico em Homologação */}
        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <p className="text-xs text-stone-700 leading-normal">
              <strong className="text-stone-900">Protótipo acadêmico</strong> de conexão entre doadores, entidades receptoras e transportadores, com acompanhamento de todas as etapas da doação.
            </p>
          </div>
          <button
            type="button"
            onClick={onViewAcademic}
            className="shrink-0 text-xs font-semibold px-3.5 py-1.5 rounded-xl bg-stone-50 hover:bg-emerald-50 text-stone-800 hover:text-emerald-800 border border-stone-300 hover:border-emerald-300 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span>Requisitos & Testes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
