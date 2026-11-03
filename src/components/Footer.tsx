import React from 'react';
import { HeartHandshake, Leaf, Shield, BookOpen } from 'lucide-react';

interface FooterProps {
  onOpenAdmin: () => void;
  onOpenAcademic: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAdmin, onOpenAcademic }) => {
  return (
    <footer className="bg-stone-900 text-stone-300 border-t border-stone-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-white font-serif tracking-tight">
                Nutri<span className="text-emerald-400">Rede</span>
              </span>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed max-w-sm">
              "Conectando alimentos a quem precisa." Sistema acadêmico e social para redução do desperdício de alimentos por meio da conexão entre doadores, entidades receptoras e transportadores.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-stone-500 pt-2">
              <Leaf className="w-3.5 h-3.5 text-emerald-500" />
              <span>Sustentabilidade • Solidariedade • Governança Segura</span>
            </div>
          </div>

          {/* Perfis */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
              Perfis de Atuação
            </h4>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>1. Doador de Alimentos</li>
              <li>2. Entidade Receptora</li>
              <li>3. Transportador Voluntário</li>
              <li className="text-stone-500 text-[11px] pt-1 italic">
                * Uma conta pode acumular os 3 papéis
              </li>
            </ul>
          </div>

          {/* Links Acadêmicos */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
              Governança & PRD
            </h4>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>
                <button
                  onClick={onOpenAcademic}
                  className="hover:text-emerald-400 flex items-center gap-1.5 transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  PRD v1.1 • Matriz RF01–RF08
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenAdmin}
                  className="hover:text-amber-400 flex items-center gap-1.5 transition-colors"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Área do Administrador
                </button>
              </li>
              <li className="text-[11px] text-stone-500 pt-1">
                Data do ciclo: 02/11/2026
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
          <p>© 2026 NutriRede. Projeto Acadêmico — Todos os direitos reservados.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Firebase Auth & Firestore Enterprise</span>
            <span>•</span>
            <span>TypeScript + React SPA</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
