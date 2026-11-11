import React from 'react';
import { GraduationCap } from 'lucide-react';

interface BaseShellLayoutProps {
  children: React.ReactNode;
}

export const BaseShellLayout: React.FC<BaseShellLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      <header className="bg-[#0F172A] text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#1E3A8A] flex items-center justify-center border border-blue-700/50">
              <GraduationCap className="w-5 h-5 text-white" strokeWidth={1.75} />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white">EducaAPI</span>
              <span className="hidden sm:inline-block ml-2 text-xs font-medium px-2 py-0.5 rounded bg-[#1E3A8A] text-blue-100">
                ODS 4 • Educação de Qualidade
              </span>
            </div>
          </div>
          <div className="text-xs text-slate-300 font-medium">
            Fase 3.1 • Arquitetura Base Inicializada
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};
