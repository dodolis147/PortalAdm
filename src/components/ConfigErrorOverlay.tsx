import React from 'react';
import { ShieldAlert, KeyRound, Copy, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface ConfigErrorOverlayProps {
  errors: string[];
  onBypass?: () => void;
}

export default function ConfigErrorOverlay({ errors, onBypass }: ConfigErrorOverlayProps) {
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950 text-slate-100 font-sans overflow-y-auto">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.05),transparent)] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative bg-zinc-900/70 border border-zinc-800/80 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl z-10 p-6 sm:p-8 backdrop-blur-md"
      >
        {/* Superior Warning Header */}
        <div className="flex items-start gap-4 pb-6 border-b border-zinc-800/80">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 shrink-0">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1 text-left">
            <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 font-mono">CONDOACCESS INTEGRITY GUARD</span>
            <h2 className="text-xl font-extrabold text-white tracking-tight font-sans">Configuração de Integração Pendente</h2>
            <p className="text-xs text-zinc-405 leading-relaxed max-w-md">
              A aplicação está pronta e operando localmente via simulação in-memory. Para ativar a persistência em nuvem em tempo real com o Supabase, configure suas chaves do projeto.
            </p>
          </div>
        </div>

        <div className="space-y-4 my-6">
          {/* Why this happens explanation */}
          <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-xl space-y-2 text-left">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5 text-emerald-400">
              ⚙️ Como configurar as credenciais no Google AI Studio?
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Para maior segurança e conformidade arquitetônica, as credenciais não são gravadas em disco (.env) nem salvas no localStorage do seu navegador. Elas são gerenciadas exclusivamente através das variáveis de ambiente de produção (Secrets).
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Para cadastrá-las definitivamente: abra as <strong>Configurações (ícone de engrenagem)</strong> no menu lateral esquerdo do Google AI Studio e adicione os seguintes items em <strong>Environment Variables / Secrets</strong>:
            </p>
          </div>

          {/* Diagnostic list */}
          <div className="space-y-3 text-left">
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black font-mono block">Diagnóstico de Inicialização</span>
            <div className="bg-zinc-950/45 border border-zinc-850 rounded-xl divide-y divide-zinc-850/60 p-1">
              {errors.length > 0 ? (
                errors.map((error, idx) => (
                  <div key={idx} className="p-3 flex items-start gap-3.5 text-xs text-zinc-400">
                    <span className="text-rose-400 shrink-0 select-none mt-0.5 font-bold">✕</span>
                    <span className="leading-relaxed font-mono">{error}</span>
                  </div>
                ))
              ) : (
                <div className="p-3 flex items-start gap-3.5 text-xs text-zinc-400">
                  <span className="text-emerald-400 shrink-0 select-none font-bold">✔</span>
                  <span className="leading-relaxed">A estrutura de credenciais é válida, mas está no modo offline local.</span>
                </div>
              )}
            </div>
          </div>

          {/* Copyable labels for Secrets */}
          <div className="space-y-3 pt-4 border-t border-zinc-800/80 text-left">
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black font-mono block">Chaves requeridas (Copiar Nome)</span>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="bg-zinc-950 p-2 text-[11px] rounded-lg border border-zinc-850 flex items-center justify-between font-mono">
                <span className="text-emerald-400">VITE_SUPABASE_URL</span>
                <button 
                  onClick={() => handleCopy("VITE_SUPABASE_URL", "url")}
                  className="p-1 hover:bg-zinc-805 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
                  title="Copiar nome para o Secrets"
                >
                  {copiedKey === "url" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="bg-zinc-950 p-2 text-[11px] rounded-lg border border-zinc-850 flex items-center justify-between font-mono">
                <span className="text-emerald-400">VITE_SUPABASE_ANON_KEY</span>
                <button 
                  onClick={() => handleCopy("VITE_SUPABASE_ANON_KEY", "anon")}
                  className="p-1 hover:bg-zinc-805 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
                  title="Copiar nome para o Secrets"
                >
                  {copiedKey === "anon" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="bg-zinc-950 p-2 text-[11px] rounded-lg border border-zinc-850 flex items-center justify-between font-mono">
                <span className="text-amber-400">SUPABASE_SERVICE_ROLE_KEY</span>
                <button 
                  onClick={() => handleCopy("SUPABASE_SERVICE_ROLE_KEY", "service")}
                  className="p-1 hover:bg-zinc-805 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
                  title="Copiar nome para o Secrets"
                >
                  {copiedKey === "service" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="bg-zinc-950 p-2 text-[11px] rounded-lg border border-zinc-850 flex items-center justify-between font-mono">
                <span className="text-teal-400">GEMINI_API_KEY</span>
                <button 
                  onClick={() => handleCopy("GEMINI_API_KEY", "gemini")}
                  className="p-1 hover:bg-zinc-805 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
                  title="Copiar nome para o Secrets"
                >
                  {copiedKey === "gemini" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Buttons Action */}
        <div className="mt-8 pt-5 border-t border-zinc-800 flex flex-col sm:flex-row gap-3 items-center justify-between text-left">
          <span className="text-[11px] text-zinc-500 font-mono">
            Simulação offline (In-Memory) habilitada.
          </span>
          
          <div className="flex gap-2.5 w-full sm:w-auto shrink-0 flex-wrap justify-end">
            {onBypass && (
              <button
                onClick={onBypass}
                className="flex-1 sm:flex-initial px-4 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all border border-zinc-750 flex items-center justify-center gap-2 cursor-pointer"
              >
                Ignorar e Usar Modo Local
              </button>
            )}
            <button
              onClick={handleReload}
              className="flex-1 sm:flex-initial px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer font-mono shadow-md"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Re-verificar
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
