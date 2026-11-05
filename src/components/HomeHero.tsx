/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Heart,
  HeartHandshake,
  ArrowRight,
  Store,
  Building2,
  Truck,
  ShieldCheck,
  CheckCircle2,
  Leaf,
  Users,
  Utensils,
  CalendarCheck,
  Sparkles,
  LogIn,
  UserPlus,
  Shield,
  FileCheck2,
  Box,
  Check,
  Globe2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ProfileType } from '../types';

interface HomeHeroProps {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onOpenAdmin: () => void;
  onViewDashboard: () => void;
  onViewAcademic: () => void;
  onOpenRequestProfile?: () => void;
}

import heroImage from '../assets/images/hero_community_food_delivery_1793887382029.jpg';
import cardDonorImage from '../assets/images/card_donor_produce_1793887382034.jpg';
import cardReceiverImage from '../assets/images/card_receiver_meal_1793887383715.jpg';
import cardTransporterImage from '../assets/images/card_transporter_van_1793887383438.jpg';
import impactChildImage from '../assets/images/impact_smiling_child_meal_1793887384712.jpg';

// Imagens processadas estaticamente pelo Vite para produção
const IMAGES = {
  hero: heroImage,
  cardDonor: cardDonorImage,
  cardReceiver: cardReceiverImage,
  cardTransporter: cardTransporterImage,
  impactChild: impactChildImage,
};

// Ícone decorativo dos raios solares/esperança da identidade visual do NutriRede
const OrganicSparks: React.FC<{ className?: string }> = ({ className = 'text-emerald-500' }) => (
  <svg
    viewBox="0 0 28 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block w-6 h-4 ${className}`}
    aria-hidden="true"
  >
    <path
      d="M3 17L8 10M14 18V6M25 17L20 10"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

// Emblema circular dos Objetivos de Desenvolvimento Sustentável (ODS)
const OdsWheel: React.FC<{ className?: string }> = ({ className = 'w-10 h-10' }) => (
  <svg
    viewBox="0 0 100 100"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Círculo representativo dos ODS da ONU"
  >
    <circle cx="50" cy="50" r="42" stroke="#E5243B" strokeWidth="8" strokeDasharray="15.5 240" strokeDashoffset="0" />
    <circle cx="50" cy="50" r="42" stroke="#DDA63A" strokeWidth="8" strokeDasharray="15.5 240" strokeDashoffset="-15.5" />
    <circle cx="50" cy="50" r="42" stroke="#4C9F38" strokeWidth="8" strokeDasharray="15.5 240" strokeDashoffset="-31" />
    <circle cx="50" cy="50" r="42" stroke="#C5192D" strokeWidth="8" strokeDasharray="15.5 240" strokeDashoffset="-46.5" />
    <circle cx="50" cy="50" r="42" stroke="#FF3A21" strokeWidth="8" strokeDasharray="15.5 240" strokeDashoffset="-62" />
    <circle cx="50" cy="50" r="42" stroke="#26BDE2" strokeWidth="8" strokeDasharray="15.5 240" strokeDashoffset="-77.5" />
    <circle cx="50" cy="50" r="42" stroke="#FCC30B" strokeWidth="8" strokeDasharray="15.5 240" strokeDashoffset="-93" />
    <circle cx="50" cy="50" r="42" stroke="#A21942" strokeWidth="8" strokeDasharray="15.5 240" strokeDashoffset="-108.5" />
    <circle cx="50" cy="50" r="42" stroke="#FD6925" strokeWidth="8" strokeDasharray="15.5 240" strokeDashoffset="-124" />
    <circle cx="50" cy="50" r="42" stroke="#DD1367" strokeWidth="8" strokeDasharray="15.5 240" strokeDashoffset="-139.5" />
    <circle cx="50" cy="50" r="42" stroke="#FD9D24" strokeWidth="8" strokeDasharray="15.5 240" strokeDashoffset="-155" />
    <circle cx="50" cy="50" r="42" stroke="#BF8B2E" strokeWidth="8" strokeDasharray="15.5 240" strokeDashoffset="-170.5" />
    <circle cx="50" cy="50" r="42" stroke="#3F7E44" strokeWidth="8" strokeDasharray="15.5 240" strokeDashoffset="-186" />
    <circle cx="50" cy="50" r="42" stroke="#0A97D9" strokeWidth="8" strokeDasharray="15.5 240" strokeDashoffset="-201.5" />
    <circle cx="50" cy="50" r="42" stroke="#56C02B" strokeWidth="8" strokeDasharray="15.5 240" strokeDashoffset="-217" />
    <circle cx="50" cy="50" r="42" stroke="#00689D" strokeWidth="8" strokeDasharray="15.5 240" strokeDashoffset="-232.5" />
    <circle cx="50" cy="50" r="42" stroke="#19486A" strokeWidth="8" strokeDasharray="15.5 240" strokeDashoffset="-248" />
  </svg>
);

export const HomeHero: React.FC<HomeHeroProps> = ({
  onOpenLogin,
  onOpenRegister,
  onOpenAdmin,
  onViewDashboard,
  onViewAcademic,
  onOpenRequestProfile,
}) => {
  const { currentUser, isAdmin, userAccount, userProfiles, switchActiveProfileType } = useAuth();
  const [imageErrorState, setImageErrorState] = useState<Record<string, boolean>>({});

  const handleImageError = (key: string) => {
    setImageErrorState((prev) => ({ ...prev, [key]: true }));
  };

  // Tratamento inteligente do clique "Quero Doar"
  const handleDonateClick = () => {
    if (!currentUser) {
      onOpenRegister();
      return;
    }
    const donorProfile = userProfiles.find((p) => p.profileType === 'DONOR');
    if (donorProfile) {
      switchActiveProfileType('DONOR');
      onViewDashboard();
    } else if (onOpenRequestProfile) {
      onOpenRequestProfile();
    } else {
      onViewDashboard();
    }
  };

  // Tratamento inteligente do clique "Quero Participar"
  const handleParticipateClick = () => {
    if (!currentUser) {
      onOpenRegister();
    } else {
      onViewDashboard();
    }
  };

  // Tratamento do clique específico em cada perfil da seção "Participe"
  const handleRoleAction = (targetRole: ProfileType) => {
    if (!currentUser) {
      onOpenRegister();
      return;
    }
    const profile = userProfiles.find((p) => p.profileType === targetRole);
    if (profile) {
      switchActiveProfileType(targetRole);
      onViewDashboard();
    } else if (onOpenRequestProfile) {
      onOpenRequestProfile();
    } else {
      onViewDashboard();
    }
  };

  return (
    <div className="w-full bg-[#FCFBF7] text-stone-900 selection:bg-emerald-100 selection:text-emerald-900">
      {/* ============================================================ */}
      {/* 1. SEÇÃO BANNER PRINCIPAL (HERO) */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden pt-8 pb-16 lg:pt-14 lg:pb-24">
        {/* Elementos orgânicos sutis de fundo */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute top-1/2 left-0 w-80 h-80 bg-teal-100/30 rounded-full blur-3xl pointer-events-none -ml-20" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Se o usuário estiver autenticado, exibir barra de boas-vindas sutil */}
          {currentUser && (
            <div className="mb-6 max-w-xl p-3 px-4 rounded-2xl bg-white/90 border border-emerald-200/80 shadow-xs flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 truncate">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="text-stone-600 truncate">
                  Bem-vindo(a), <strong className="text-stone-900 font-semibold">{userAccount?.name || currentUser.displayName || currentUser.email}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onViewDashboard}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Meu Painel</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={onOpenAdmin}
                    className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-medium rounded-lg transition-colors text-[11px] cursor-pointer"
                  >
                    Admin
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Grid de 2 colunas: Proposta de Valor à esquerda / Fotografia acolhedora à direita */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Lado Esquerdo: Textos & Chamada */}
            <div className="lg:col-span-6 space-y-6 text-left">
              {/* Kicker com raios orgânicos */}
              <div className="inline-flex items-center gap-2">
                <OrganicSparks className="text-emerald-600" />
                <span className="text-xs uppercase tracking-widest font-bold text-emerald-800">
                  Rede Solidária de Alimentos
                </span>
              </div>

              {/* Título Principal */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-stone-900 tracking-tight leading-[1.12]">
                Conectando <br />
                <span className="text-emerald-700 font-serif italic">alimentos</span> a quem precisa
              </h1>

              {/* Texto complementar curto */}
              <p className="text-base sm:text-lg text-stone-600 leading-relaxed max-w-xl">
                Menos desperdício e mais solidariedade: conectamos doadores, entidades receptoras e transportadores voluntários em uma rede transparente e segura.
              </p>

              {/* Botões de Ação */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                <button
                  type="button"
                  onClick={handleDonateClick}
                  className="px-7 py-3.5 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm shadow-md shadow-emerald-900/15 hover:shadow-lg hover:shadow-emerald-900/20 transition-all flex items-center justify-center gap-2.5 group cursor-pointer"
                >
                  <Heart className="w-4 h-4 text-emerald-200 fill-emerald-200 group-hover:scale-110 transition-transform" />
                  <span>Quero Doar</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={handleParticipateClick}
                  className="px-7 py-3.5 rounded-full bg-white hover:bg-emerald-50/80 text-emerald-950 border border-emerald-300/80 hover:border-emerald-500 font-semibold text-sm shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-2.5 group cursor-pointer"
                >
                  <Users className="w-4 h-4 text-emerald-700" />
                  <span>Quero Participar</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* Micro-legenda de confiança */}
              <div className="pt-2 flex items-center gap-4 text-xs text-stone-500">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Homologação administrativa
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Acompanhamento das etapas
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Conta única multiperfil
                </span>
              </div>
            </div>

            {/* Lado Direito: Fotografia Acolhedora da Entrega */}
            <div className="lg:col-span-6">
              <div className="relative mx-auto max-w-lg lg:max-w-none">
                {/* Elemento decorativo circular atrás da imagem */}
                <div className="absolute -inset-3 bg-gradient-to-tr from-emerald-200/50 via-teal-100/40 to-amber-100/30 rounded-3xl -rotate-1 transform -z-10" />

                <div className="relative rounded-3xl overflow-hidden shadow-xl border border-white/60 bg-white">
                  {!imageErrorState['hero'] ? (
                    <img
                      src={IMAGES.hero}
                      alt="Mulher sorridente entregando caixa de alimentos frescos e saudáveis a voluntária em centro comunitário"
                      loading="eager"
                      referrerPolicy="no-referrer"
                      onError={() => handleImageError('hero')}
                      className="w-full h-[360px] sm:h-[420px] lg:h-[460px] object-cover object-center"
                    />
                  ) : (
                    /* Fallback estilizado caso ocorra erro no carregamento da imagem */
                    <div className="w-full h-[360px] sm:h-[420px] lg:h-[460px] bg-gradient-to-br from-emerald-100 via-amber-50 to-teal-50 flex flex-col items-center justify-center p-8 text-center">
                      <HeartHandshake className="w-16 h-16 text-emerald-700 mb-3" />
                      <p className="text-base font-bold text-emerald-950">Solidariedade em Ação</p>
                      <p className="text-xs text-stone-600 max-w-xs mt-1">
                        Conectando excedentes alimentares de estabelecimentos a comunidades em situação de vulnerabilidade.
                      </p>
                    </div>
                  )}

                  {/* Card flutuante sobre a fotografia */}
                  <div className="absolute bottom-4 left-4 right-4 sm:left-6 sm:right-6 bg-white/95 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-emerald-100/80 shadow-md flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Heart className="w-5 h-5 fill-white" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-stone-900 leading-tight">Solidariedade com Responsabilidade</p>
                        <p className="text-[11px] text-stone-500">Aptidão declarada pelo doador e entrega protocolada</p>
                      </div>
                    </div>
                    <span className="hidden sm:inline-flex text-[11px] font-semibold text-emerald-800 bg-emerald-100/70 px-2.5 py-1 rounded-full">
                      ODS 2 & 12
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Divisor curvo suave entre a Hero e a Seção 2 */}
        <div className="w-full overflow-hidden leading-none mt-12 sm:mt-16 text-[#F5F2EA]">
          <svg
            viewBox="0 0 1200 60"
            preserveAspectRatio="none"
            className="w-full h-8 sm:h-12 fill-current"
            aria-hidden="true"
          >
            <path d="M0,0 C300,50 900,50 1200,0 L1200,60 L0,60 Z" />
          </svg>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 2. SEÇÃO COMO FUNCIONA */}
      {/* ============================================================ */}
      <section id="como-funciona" className="bg-[#F5F2EA] py-14 lg:py-20 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Cabeçalho da Seção */}
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <div className="flex justify-center mb-1">
              <OrganicSparks className="text-emerald-600" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
              Como funciona?
            </h2>
            <p className="mt-2 text-sm sm:text-base text-stone-600">
              Um caminho simples para conectar alimentos a quem precisa com acompanhamento das etapas.
            </p>
          </div>

          {/* Sequência ilustrada das 5 etapas reais do NutriRede */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-3 relative">
            {/* ETAPA 1: Doador publica */}
            <div className="bg-white rounded-2xl p-5 border border-amber-200/70 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Store className="w-6 h-6 text-emerald-700" />
                </div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 mb-1">
                  Etapa 01
                </div>
                <h3 className="text-base font-bold text-stone-900 mb-1.5">
                  Doador publica
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Cadastra lotes de alimentos próprios para consumo com quantidade, validade e janela de retirada.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-emerald-700 font-semibold">
                <span>Oferta Disponível</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>
            </div>

            {/* ETAPA 2: Entidade solicita */}
            <div className="bg-white rounded-2xl p-5 border border-amber-200/70 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <CalendarCheck className="w-6 h-6 text-teal-700" />
                </div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-teal-800 mb-1">
                  Etapa 02
                </div>
                <h3 className="text-base font-bold text-stone-900 mb-1.5">
                  Entidade solicita
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Localiza ofertas no sistema e solicita a reserva para atender famílias e beneficiários cadastrados.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-teal-700 font-semibold">
                <span>Reserva Solicitada</span>
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
              </div>
            </div>

            {/* ETAPA 3: Administrador homologa */}
            <div className="bg-white rounded-2xl p-5 border border-amber-200/70 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-6 h-6 text-amber-700" />
                </div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800 mb-1">
                  Etapa 03
                </div>
                <h3 className="text-base font-bold text-stone-900 mb-1.5">
                  Administrador homologa
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Supervisão independente que analisa a solicitação de reserva e autoriza a liberação da doação.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-amber-700 font-semibold">
                <span>Aprovação Segura</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              </div>
            </div>

            {/* ETAPA 4: Transportador entrega */}
            <div className="bg-white rounded-2xl p-5 border border-amber-200/70 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Truck className="w-6 h-6 text-emerald-700" />
                </div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 mb-1">
                  Etapa 04
                </div>
                <h3 className="text-base font-bold text-stone-900 mb-1.5">
                  Transportador retira
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Voluntário aceita a corrida solidária, retira os itens no doador e registra a coleta em tempo real.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-emerald-700 font-semibold">
                <span>Coleta Registrada</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>
            </div>

            {/* ETAPA 5: Entidade confirma */}
            <div className="bg-white rounded-2xl p-5 border border-amber-200/70 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group sm:col-span-2 lg:col-span-1">
              <div>
                <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <HeartHandshake className="w-6 h-6 text-teal-700" />
                </div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-teal-800 mb-1">
                  Etapa 05
                </div>
                <h3 className="text-base font-bold text-stone-900 mb-1.5">
                  Entidade confirma
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Recebe os alimentos, atesta a conformidade no painel e encerra o ciclo de solidariedade.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-teal-700 font-semibold">
                <span>Entrega Concluída</span>
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. SEÇÃO PARTICIPE DA NUTRIREDE */}
      {/* ============================================================ */}
      <section id="participe" className="py-16 lg:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-16">
        {/* Cabeçalho */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <div className="flex justify-center mb-1">
            <OrganicSparks className="text-emerald-600" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
            Participe da NutriRede
          </h2>
          <p className="mt-2 text-sm sm:text-base text-stone-600">
            Há um papel para você nessa rede de solidariedade. Uma única conta permite atuar em um ou mais perfis.
          </p>
        </div>

        {/* 3 Cartões Visuais com Fotografia */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* CARTÃO 1: DOADOR */}
          <div className="bg-white rounded-3xl overflow-hidden border border-stone-200/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
            <div>
              {/* Imagem do cartão */}
              <div className="h-52 w-full overflow-hidden relative bg-stone-100">
                {!imageErrorState['donor'] ? (
                  <img
                    src={IMAGES.cardDonor}
                    alt="Caixa rústica com hortaliças e vegetais frescos para doação"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={() => handleImageError('donor')}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-emerald-50 flex items-center justify-center">
                    <Store className="w-12 h-12 text-emerald-600" />
                  </div>
                )}
                {/* Badge flutuante do perfil */}
                <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full border border-emerald-200/80 shadow-2xs flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <Store className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Doador</span>
                </div>
              </div>

              {/* Conteúdo textual */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-stone-900 mb-2">
                  Doador
                </h3>
                <p className="text-sm text-stone-600 leading-relaxed mb-4">
                  Compartilhe excedentes alimentares em boas condições e evite o desperdício, promovendo destinação digna.
                </p>
                <div className="flex flex-wrap gap-1.5 text-[11px] text-stone-500">
                  <span className="bg-stone-100 px-2.5 py-0.5 rounded-md">Supermercados</span>
                  <span className="bg-stone-100 px-2.5 py-0.5 rounded-md">Feiras</span>
                  <span className="bg-stone-100 px-2.5 py-0.5 rounded-md">Restaurantes</span>
                </div>
              </div>
            </div>

            {/* Ação de participação */}
            <div className="p-6 pt-0">
              <button
                type="button"
                onClick={() => handleRoleAction('DONOR')}
                className="w-full py-3 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 group-hover:gap-3 cursor-pointer"
              >
                <span>Quero Doar Alimentos</span>
                <ArrowRight className="w-4 h-4 transition-transform" />
              </button>
            </div>
          </div>

          {/* CARTÃO 2: ENTIDADE RECEPTORA */}
          <div className="bg-white rounded-3xl overflow-hidden border border-stone-200/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
            <div>
              {/* Imagem do cartão */}
              <div className="h-52 w-full overflow-hidden relative bg-stone-100">
                {!imageErrorState['receiver'] ? (
                  <img
                    src={IMAGES.cardReceiver}
                    alt="Mãos segurando tigela quente de refeição balanceada com arroz, feijão e legumes"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={() => handleImageError('receiver')}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-amber-50 flex items-center justify-center">
                    <Building2 className="w-12 h-12 text-amber-700" />
                  </div>
                )}
                {/* Badge flutuante do perfil */}
                <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full border border-amber-200/80 shadow-2xs flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <Building2 className="w-3.5 h-3.5 text-amber-700" />
                  <span>Entidade Receptora</span>
                </div>
              </div>

              {/* Conteúdo textual */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-stone-900 mb-2">
                  Entidade Receptora
                </h3>
                <p className="text-sm text-stone-600 leading-relaxed mb-4">
                  Receba alimentos seguros para atender quem mais precisa e fortalecer a assistência comunitária.
                </p>
                <div className="flex flex-wrap gap-1.5 text-[11px] text-stone-500">
                  <span className="bg-stone-100 px-2.5 py-0.5 rounded-md">ONGs</span>
                  <span className="bg-stone-100 px-2.5 py-0.5 rounded-md">Cozinhas Solidárias</span>
                  <span className="bg-stone-100 px-2.5 py-0.5 rounded-md">Abrigos</span>
                </div>
              </div>
            </div>

            {/* Ação de participação */}
            <div className="p-6 pt-0">
              <button
                type="button"
                onClick={() => handleRoleAction('RECEIVER')}
                className="w-full py-3 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 group-hover:gap-3 cursor-pointer"
              >
                <span>Receber Alimentos</span>
                <ArrowRight className="w-4 h-4 transition-transform" />
              </button>
            </div>
          </div>

          {/* CARTÃO 3: TRANSPORTADOR */}
          <div className="bg-white rounded-3xl overflow-hidden border border-stone-200/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
            <div>
              {/* Imagem do cartão */}
              <div className="h-52 w-full overflow-hidden relative bg-stone-100">
                {!imageErrorState['transporter'] ? (
                  <img
                    src={IMAGES.cardTransporter}
                    alt="Van branca de entrega solidária em rua arborizada transportando caixas de alimentos"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={() => handleImageError('transporter')}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-teal-50 flex items-center justify-center">
                    <Truck className="w-12 h-12 text-teal-700" />
                  </div>
                )}
                {/* Badge flutuante do perfil */}
                <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full border border-teal-200/80 shadow-2xs flex items-center gap-1.5 text-xs font-bold text-teal-900">
                  <Truck className="w-3.5 h-3.5 text-teal-700" />
                  <span>Transportador</span>
                </div>
              </div>

              {/* Conteúdo textual */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-stone-900 mb-2">
                  Transportador
                </h3>
                <p className="text-sm text-stone-600 leading-relaxed mb-4">
                  Faça a ponte solidária e entregue doações com agilidade, zelando pela integridade da carga.
                </p>
                <div className="flex flex-wrap gap-1.5 text-[11px] text-stone-500">
                  <span className="bg-stone-100 px-2.5 py-0.5 rounded-md">Voluntários</span>
                  <span className="bg-stone-100 px-2.5 py-0.5 rounded-md">Entregadores</span>
                  <span className="bg-stone-100 px-2.5 py-0.5 rounded-md">Logística Social</span>
                </div>
              </div>
            </div>

            {/* Ação de participação */}
            <div className="p-6 pt-0">
              <button
                type="button"
                onClick={() => handleRoleAction('TRANSPORTER')}
                className="w-full py-3 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 group-hover:gap-3 cursor-pointer"
              >
                <span>Apoiar no Transporte</span>
                <ArrowRight className="w-4 h-4 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. SEÇÃO IMPACTO SOCIAL & ODS */}
      {/* ============================================================ */}
      <section id="impacto" className="bg-[#FAF7F0] py-16 lg:py-24 border-y border-stone-200/60 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Lado Esquerdo: Fotografia Humana de Refeição Nutritiva */}
            <div className="lg:col-span-5 order-2 lg:order-1">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                <div className="relative rounded-3xl overflow-hidden shadow-xl border border-white/80 bg-white">
                  {!imageErrorState['impact'] ? (
                    <img
                      src={IMAGES.impactChild}
                      alt="Criança sorridente se alimentando de forma saudável e nutritiva em refeitório comunitário"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={() => handleImageError('impact')}
                      className="w-full h-[340px] sm:h-[400px] object-cover object-center"
                    />
                  ) : (
                    <div className="w-full h-[340px] bg-emerald-50 flex items-center justify-center p-6 text-center">
                      <Utensils className="w-12 h-12 text-emerald-700 mb-2" />
                      <p className="text-sm font-bold text-stone-900">Alimentação Digna</p>
                    </div>
                  )}

                  {/* Legenda sutil da foto */}
                  <div className="p-3.5 bg-white text-center border-t border-stone-100">
                    <p className="text-xs text-stone-600 font-medium italic">
                      "Alimento no lugar certo, mais vidas bem nutridas."
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Lado Direito: Impacto que alimenta vidas */}
            <div className="lg:col-span-7 order-1 lg:order-2 space-y-6 text-left">
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <OrganicSparks className="text-emerald-600" />
                  <span className="text-xs uppercase tracking-widest font-bold text-emerald-800">
                    Impacto Sustentável
                  </span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
                  Impacto que alimenta vidas
                </h2>
                <p className="mt-2 text-sm sm:text-base text-stone-600 leading-relaxed">
                  Contribuímos com os Objetivos de Desenvolvimento Sustentável (ODS) da ONU, especialmente o combate à fome, a redução do desperdício de alimentos e a colaboração social.
                </p>
              </div>

              {/* 3 Benefícios em Destaque */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-2xs">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-2.5">
                    <Utensils className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-stone-900 mb-1">
                    Combate à fome
                  </h3>
                  <p className="text-xs text-stone-500 leading-relaxed">
                    Destinação digna de alimentos próprios para consumo a entidades de assistência social.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-2xs">
                  <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center mb-2.5">
                    <Leaf className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-stone-900 mb-1">
                    Menos desperdício
                  </h3>
                  <p className="text-xs text-stone-500 leading-relaxed">
                    Aproveitamento de excedentes do varejo e da agricultura com alimentos declarados próprios para consumo.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-2xs">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center mb-2.5">
                    <Users className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-stone-900 mb-1">
                    Mais colaboração
                  </h3>
                  <p className="text-xs text-stone-500 leading-relaxed">
                    Ponte ágil entre estabelecimentos doadores, transportadores e comunidades acolhidas.
                  </p>
                </div>
              </div>

              {/* Bloco de Alinhamento aos ODS da ONU */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <OdsWheel className="w-12 h-12 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-900 uppercase tracking-wide">
                        Objetivos de Desenvolvimento Sustentável
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                        ODS 2 — Fome Zero
                      </span>
                      <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                        ODS 12 — Consumo Responsável
                      </span>
                      <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                        ODS 17 — Parcerias
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onViewAcademic}
                  className="shrink-0 text-xs font-semibold px-3.5 py-2 rounded-xl bg-stone-50 hover:bg-emerald-50 text-stone-800 hover:text-emerald-800 border border-stone-200 hover:border-emerald-300 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Requisitos & Testes</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Nota de transparência sobre o protótipo acadêmico */}
              <p className="text-xs text-stone-500 leading-relaxed">
                * O NutriRede é um protótipo acadêmico em estágio de pesquisa e homologação (2026), desenvolvido para demonstrar a viabilidade tecnológica de uma rede comunitária com governança multiperfil.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. SEÇÃO CONVITE FINAL (BANNER VERDE-ESCURO) */}
      {/* ============================================================ */}
      <section className="py-16 lg:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 text-white p-8 sm:p-12 lg:p-16 overflow-hidden shadow-2xl">
          {/* Elementos orgânicos sutis de fundo */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Arte linear de coração sutil à direita */}
          <div className="absolute right-6 -bottom-8 pointer-events-none opacity-15 hidden sm:block">
            <Heart className="w-72 h-72 stroke-[1] text-emerald-300" />
          </div>

          <div className="relative z-10 max-w-2xl text-left space-y-5">
            <div className="flex items-center gap-2">
              <OrganicSparks className="text-emerald-400" />
              <span className="text-xs uppercase tracking-widest font-bold text-emerald-300">
                Participe Agora
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
              Faça parte desta rede do bem.
            </h2>

            <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed max-w-xl">
              Doar, receber e transportar. Juntos, podemos alimentar mais vidas, reduzir o desperdício e fortalecer a solidariedade.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
              <button
                type="button"
                onClick={handleDonateClick}
                className="px-7 py-3.5 rounded-full bg-white hover:bg-emerald-50 text-emerald-950 font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 group cursor-pointer"
              >
                <Heart className="w-4 h-4 text-emerald-700 fill-emerald-700" />
                <span>Quero Doar</span>
                <ArrowRight className="w-4 h-4 text-emerald-800 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                onClick={handleParticipateClick}
                className="px-7 py-3.5 rounded-full bg-emerald-800/80 hover:bg-emerald-800 text-white border border-emerald-400/50 hover:border-emerald-300 font-semibold text-sm transition-all flex items-center justify-center gap-2 group cursor-pointer"
              >
                <Users className="w-4 h-4 text-emerald-300" />
                <span>Quero Participar</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
