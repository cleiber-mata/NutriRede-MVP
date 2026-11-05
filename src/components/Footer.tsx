/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HeartHandshake, Leaf, Shield, BookOpen, Globe2, ArrowUpRight } from 'lucide-react';

interface FooterProps {
  onOpenAdmin: () => void;
  onOpenAcademic: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAdmin, onOpenAcademic }) => {
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-emerald-950 text-emerald-100/80 border-t border-emerald-900/80 mt-auto selection:bg-emerald-800 selection:text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
          {/* Coluna Principal: Marca, Slogan e Missão */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-xs">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <span className="text-2xl font-bold text-white font-serif tracking-tight">
                  Nutri<span className="text-emerald-400">Rede</span>
                </span>
                <p className="text-xs text-emerald-300 font-medium">
                  Rede de Alimentos
                </p>
              </div>
            </div>

            <p className="text-sm text-emerald-200/90 font-medium italic">
              "Alimento no lugar certo, mais vidas bem nutridas."
            </p>

            <p className="text-xs text-emerald-300/70 leading-relaxed max-w-sm">
              Plataforma social e acadêmica para combate ao desperdício de alimentos por meio da articulação transparente entre doadores, entidades receptoras e transportadores voluntários.
            </p>

            <div className="flex items-center gap-2 text-xs text-emerald-400 pt-1">
              <Leaf className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Sustentabilidade • Solidariedade • Governança Segura</span>
            </div>
          </div>

          {/* Coluna: Navegação Interna */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Navegação
            </h4>
            <ul className="space-y-2.5 text-xs text-emerald-200/80">
              <li>
                <button
                  type="button"
                  onClick={() => scrollToSection('como-funciona')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Como Funciona
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollToSection('participe')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Participe da NutriRede
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollToSection('impacto')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Impacto Social & ODS
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenAcademic}
                  className="hover:text-white inline-flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Requisitos & Testes (RF01–RF16)</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenAdmin}
                  className="hover:text-amber-300 inline-flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span>Área Administrativa</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Coluna: Perfis e Compromisso com ODS */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Compromisso com os ODS da ONU
            </h4>
            <div className="space-y-2 text-xs text-emerald-200/80">
              <div className="flex items-start gap-2">
                <span className="font-semibold text-emerald-400 shrink-0">ODS 2:</span>
                <span>Fome Zero e Agricultura Sustentável</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-amber-400 shrink-0">ODS 12:</span>
                <span>Consumo e Produção Responsáveis</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-teal-400 shrink-0">ODS 17:</span>
                <span>Parcerias e Meios de Implementação</span>
              </div>
            </div>

            <div className="pt-3 border-t border-emerald-900/80">
              <p className="text-[11px] text-emerald-400/80 leading-relaxed">
                <strong className="text-white">Aviso de Homologação:</strong> O NutriRede é um protótipo acadêmico em fase de desenvolvimento e validação técnica (2026), sem vínculo comercial ou certificação institucional oficial da ONU.
              </p>
            </div>
          </div>
        </div>

        {/* Linha inferior de Copyright e Dados do Projeto */}
        <div className="mt-10 pt-6 border-t border-emerald-900/80 flex flex-col sm:flex-row items-center justify-between text-xs text-emerald-400/70 gap-3">
          <p>© 2026 NutriRede. Projeto Acadêmico — Todos os direitos reservados.</p>
          <div className="flex items-center gap-3 text-[11px]">
            <span>React + TypeScript SPA</span>
            <span>•</span>
            <span>Tailwind CSS</span>
            <span>•</span>
            <span>Firebase Firestore Enterprise</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
