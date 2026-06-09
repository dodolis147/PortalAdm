import React, { useState, useEffect } from 'react';
import { 
  X, Palette, Check, Sparkles, Sliders, Info, Heading, HelpCircle, 
  Moon, Sun, Shield, Home, Key, Star, Layout, Building2, Eye
} from 'lucide-react';
import { ThemeSettings } from '../types';

interface ThemeCustomizerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  themeSettings: ThemeSettings;
  onSaveThemeSettings: (settings: ThemeSettings) => void;
}

export const THEME_PRESETS = [
  { 
    id: 'classic' as const, 
    name: 'Padrão Claro', 
    desc: 'Luminoso e profissional com alto contraste corporativo.', 
    bg: '#f8fafc', 
    card: '#ffffff', 
    text: '#0f172a', 
    muted: '#475569', 
    border: '#cbd5e1', 
    accent: '#2563eb' 
  },
  { 
    id: 'cosmic' as const, 
    name: 'Cosmic Dark', 
    desc: 'Visual escuro futurista com acentos em azul espacial.', 
    bg: '#09090b', 
    card: '#18181b', 
    text: '#fafafa', 
    muted: '#a1a1aa', 
    border: '#27272a', 
    accent: '#06b6d4' 
  },
  { 
    id: 'emerald' as const, 
    name: 'Condomínio Esmeralda', 
    desc: 'Atmosfera ecológica, fresca e tranquila inspirada na natureza.', 
    bg: '#f0f7f4', 
    card: '#ffffff', 
    text: '#064e3b', 
    muted: '#047857', 
    border: '#a7f3d0', 
    accent: '#10b981' 
  },
  { 
    id: 'cyber' as const, 
    name: 'Portaria Cyberpunk', 
    desc: 'Neon escuro para consoles de alta tecnologia e controle imersivo.', 
    bg: '#000000', 
    card: '#090d16', 
    text: '#10b981', 
    muted: '#059669', 
    border: '#10b981', 
    accent: '#00f2fe' 
  },
  { 
    id: 'sunset' as const, 
    name: 'Solares de Outono', 
    desc: 'Tons acolhedores, outonais, elegantes e quentes.', 
    bg: '#faf6f0', 
    card: '#ffffff', 
    text: '#451a03', 
    muted: '#78350f', 
    border: '#fed7aa', 
    accent: '#ea580c' 
  },
  { 
    id: 'ocean' as const, 
    name: 'Brisa Marítima', 
    desc: 'Tons azuis refrescantes adequados para litorais e praias.', 
    bg: '#f0f9ff', 
    card: '#ffffff', 
    text: '#0c4a6e', 
    muted: '#0284c7', 
    border: '#bae6fd', 
    accent: '#0284c7' 
  }
];

export default function ThemeCustomizerDrawer({
  isOpen,
  onClose,
  themeSettings,
  onSaveThemeSettings
}: ThemeCustomizerDrawerProps) {
  
  // Temporary states for real-time color slider manipulation
  const [appName, setAppName] = useState(themeSettings.appName);
  const [appSlogan, setAppSlogan] = useState(themeSettings.appSlogan);
  const [presetId, setPresetId] = useState(themeSettings.presetId);
  const [customBg, setCustomBg] = useState(themeSettings.customBg);
  const [customCardBg, setCustomCardBg] = useState(themeSettings.customCardBg);
  const [customText, setCustomText] = useState(themeSettings.customText);
  const [customTextMuted, setCustomTextMuted] = useState(themeSettings.customTextMuted);
  const [customBorder, setCustomBorder] = useState(themeSettings.customBorder);
  const [customAccent, setCustomAccent] = useState(themeSettings.customAccent);
  
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Synchronize when themeSettings changes externally
  useEffect(() => {
    setAppName(themeSettings.appName);
    setAppSlogan(themeSettings.appSlogan);
    setPresetId(themeSettings.presetId);
    setCustomBg(themeSettings.customBg);
    setCustomCardBg(themeSettings.customCardBg);
    setCustomText(themeSettings.customText);
    setCustomTextMuted(themeSettings.customTextMuted);
    setCustomBorder(themeSettings.customBorder);
    setCustomAccent(themeSettings.customAccent);
  }, [themeSettings, isOpen]);

  // LIVE PREVIEW: Inject CSS Variables onto :root element dynamically as user edits!
  useEffect(() => {
    if (!isOpen) return;
    
    let styleEl = document.getElementById('dynamic-theme-vars');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'dynamic-theme-vars';
      document.head.appendChild(styleEl);
    }
    
    styleEl.innerHTML = `
      :root {
        --app-bg: ${customBg} !important;
        --app-card-bg: ${customCardBg} !important;
        --app-text: ${customText} !important;
        --app-text-muted: ${customTextMuted} !important;
        --app-border: ${customBorder} !important;
        --app-accent: ${customAccent} !important;
        --app-accent-hover: ${customAccent}e0 !important;
      }
    `;
  }, [isOpen, customBg, customCardBg, customText, customTextMuted, customBorder, customAccent]);

  if (!isOpen) return null;

  const handleApplyPreset = (id: typeof THEME_PRESETS[number]['id']) => {
    setPresetId(id);
    const found = THEME_PRESETS.find(p => p.id === id);
    if (found) {
      setCustomBg(found.bg);
      setCustomCardBg(found.card);
      setCustomText(found.text);
      setCustomTextMuted(found.muted);
      setCustomBorder(found.border);
      setCustomAccent(found.accent);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    const settings: ThemeSettings = {
      ...themeSettings,
      id: 'active',
      appName: appName.trim() || 'CONDOACCESS',
      appSlogan: appSlogan.trim(),
      presetId,
      customBg,
      customCardBg,
      customText,
      customTextMuted,
      customBorder,
      customAccent
    };

    onSaveThemeSettings(settings);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1500);
  };

  // Restore changes back to the original saved themeSettings if cancelled
  const handleCancelAndReset = () => {
    // Reapply original themeSettings
    let styleEl = document.getElementById('dynamic-theme-vars');
    if (styleEl) {
      styleEl.innerHTML = `
        :root {
          --app-bg: ${themeSettings.customBg} !important;
          --app-card-bg: ${themeSettings.customCardBg} !important;
          --app-text: ${themeSettings.customText} !important;
          --app-text-muted: ${themeSettings.customTextMuted} !important;
          --app-border: ${themeSettings.customBorder} !important;
          --app-accent: ${themeSettings.customAccent} !important;
          --app-accent-hover: ${themeSettings.customAccent}e0 !important;
        }
      `;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" id="theme-customizer-drawer-overlay">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity" 
        onClick={handleCancelAndReset}
      />

      {/* Slider Drawer Panel */}
      <div className="relative w-full max-w-md bg-zinc-950 border-l border-zinc-805 h-full flex flex-col shadow-2xl z-10 text-zinc-100 font-sans">
        
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/15 text-blue-400 rounded-xl">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-wider text-white uppercase font-mono">Estilo Visual do Sistema</h3>
              <p className="text-[10px] text-zinc-400 font-mono mt-0.5">CONFIGURAÇÃO FÁCIL DE CORES & MARCA</p>
            </div>
          </div>
          <button 
            onClick={handleCancelAndReset}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {savedSuccess && (
            <div className="p-3.5 bg-emerald-950/40 border border-emerald-800 text-emerald-450 text-xs rounded-xl flex items-center gap-2 font-bold font-sans animate-bounce">
              <Check className="w-4 h-4 stroke-[3px]" />
              <span>Cores e temas aplicados com sucesso no condomínio!</span>
            </div>
          )}

          {/* Warning / Instruction Info Banner */}
          <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl flex gap-2.5 text-zinc-400 text-xs leading-relaxed">
            <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-zinc-350 block">Arraste e experimente!</span>
              O painel mudará suas cores <strong className="text-white">em tempo real</strong> enquanto você escolhe. Clique em "Confirmar e Salvar" para persistir as alterações permanentemente.
            </div>
          </div>

          {/* Branding */}
          <div className="space-y-3 bg-zinc-900/40 p-4 rounded-xl border border-zinc-900">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 font-mono uppercase">
              <Heading className="w-3.5 h-3.5 text-blue-400" />
              <span>Nome e Slogan do Painel</span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block font-mono">Nome do Sistema</span>
                <input 
                  type="text" 
                  value={appName || ''}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="Ex: CONDOACCESS"
                  className="w-full bg-zinc-900 border border-zinc-850 px-3 py-1.5 rounded-lg text-xs font-medium text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block font-mono">Slogan / Descrição do Topo</span>
                <input 
                  type="text" 
                  value={appSlogan || ''}
                  onChange={(e) => setAppSlogan(e.target.value)}
                  placeholder="Ex: Mural Central & Acessos"
                  className="w-full bg-zinc-900 border border-zinc-850 px-3 py-1.5 rounded-lg text-xs font-medium text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Theme Presets */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-zinc-350 uppercase font-mono tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-blue-400" /> Temas Prontos do Sistema
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              {THEME_PRESETS.map((preset) => {
                const isActive = presetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset.id)}
                    className={`p-3 rounded-xl border text-left transition-all text-xs font-medium flex flex-col gap-1 items-stretch group cursor-pointer ${
                      isActive 
                        ? 'border-blue-500 bg-blue-600/10 shadow-[0_0_12px_rgba(37,99,235,0.15)]' 
                        : 'border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/80 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px] text-zinc-200 group-hover:text-white">{preset.name}</span>
                      {isActive && <Check className="w-3.5 h-3.5 text-blue-400 stroke-[3px]" />}
                    </div>
                    
                    {/* Tiny Color Swatches */}
                    <div className="flex gap-1 items-center mt-2.5">
                      <div className="flex gap-0.5 border border-zinc-800 p-0.5 bg-zinc-950 rounded-sm">
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: preset.bg }} />
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: preset.card }} />
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: preset.accent }} />
                      </div>
                      <span className="text-[9px] text-zinc-500 uppercase font-mono group-hover:text-zinc-400">Paleta</span>
                    </div>
                  </button>
                );
              })}
              
              <button
                type="button"
                onClick={() => setPresetId('custom')}
                className={`p-3 rounded-xl border text-left transition-all text-xs font-medium flex flex-col gap-1 items-stretch col-span-2 cursor-pointer ${
                  presetId === 'custom' 
                    ? 'border-amber-500 bg-amber-500/10 shadow-[0_0_12px_rgba(245,158,11,0.15)]' 
                    : 'border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/80 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-[11.5px] text-amber-500 uppercase tracking-widest">🎨 Estilo Personalizado Sob Medida</span>
                  {presetId === 'custom' && <Check className="w-3.5 h-3.5 text-amber-500 stroke-[3px]" />}
                </div>
                <p className="text-[9.5px] text-zinc-400 mt-1 leading-snug">
                  Crie sua própria combinação exclusiva ajustando as cores finas abaixo.
                </p>
              </button>
            </div>
          </div>

          {/* Color Fine Selecting Panel */}
          <div className="space-y-4 bg-zinc-900/30 p-4.5 rounded-2xl border border-zinc-850">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <span className="text-xs font-bold text-zinc-350 uppercase font-mono tracking-wider">Ajuste Fino de Cores</span>
              <span className="text-[10px] text-zinc-500">Formato Hexadecimal</span>
            </div>

            <div className="space-y-4">
              {/* Background Color */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-zinc-200">Fundo Principal do Sistema</span>
                  <span className="text-[10px] text-zinc-500 font-mono select-all uppercase">{customBg}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={customBg || '#f8fafc'}
                    onChange={(e) => {
                      setCustomBg(e.target.value);
                      setPresetId('custom');
                    }}
                    className="w-10 h-8 rounded-lg cursor-pointer bg-transparent border border-zinc-700 block"
                  />
                </div>
              </div>

              {/* Card / Widget Bg */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-zinc-200">Fundo dos Quadros (Cards)</span>
                  <span className="text-[10px] text-zinc-500 font-mono select-all uppercase">{customCardBg}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={customCardBg || '#ffffff'}
                    onChange={(e) => {
                      setCustomCardBg(e.target.value);
                      setPresetId('custom');
                    }}
                    className="w-10 h-8 rounded-lg cursor-pointer bg-transparent border border-zinc-700 block"
                  />
                </div>
              </div>

              {/* Text Primary */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-zinc-200">Textos/Letras Principais</span>
                  <span className="text-[10px] text-zinc-500 font-mono select-all uppercase">{customText}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={customText || '#0f172a'}
                    onChange={(e) => {
                      setCustomText(e.target.value);
                      setPresetId('custom');
                    }}
                    className="w-10 h-8 rounded-lg cursor-pointer bg-transparent border border-zinc-700 block"
                  />
                </div>
              </div>

              {/* Text Muted */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-zinc-200">Textos de Detalhes / Legendas</span>
                  <span className="text-[10px] text-zinc-500 font-mono select-all uppercase">{customTextMuted}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={customTextMuted || '#475569'}
                    onChange={(e) => {
                      setCustomTextMuted(e.target.value);
                      setPresetId('custom');
                    }}
                    className="w-10 h-8 rounded-lg cursor-pointer bg-transparent border border-zinc-700 block"
                  />
                </div>
              </div>

              {/* Border Color */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-zinc-200">Molduras/Linhas/Bordas</span>
                  <span className="text-[10px] text-zinc-500 font-mono select-all uppercase">{customBorder}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={customBorder || '#cbd5e1'}
                    onChange={(e) => {
                      setCustomBorder(e.target.value);
                      setPresetId('custom');
                    }}
                    className="w-10 h-8 rounded-lg cursor-pointer bg-transparent border border-zinc-700 block"
                  />
                </div>
              </div>

              {/* Accent Color */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-amber-500 font-black">Cor de Destaque / Botões</span>
                  <span className="text-[10px] text-zinc-500 font-mono select-all uppercase">{customAccent}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={customAccent || '#2563eb'}
                    onChange={(e) => {
                      setCustomAccent(e.target.value);
                      setPresetId('custom');
                    }}
                    className="w-10 h-8 rounded-lg cursor-pointer bg-transparent border border-zinc-700 block"
                  />
                </div>
              </div>
            </div>
          </div>

        </form>

        {/* Footer Actions */}
        <div className="p-5 border-t border-zinc-800 bg-zinc-950 flex gap-3">
          <button
            type="button"
            onClick={handleCancelAndReset}
            className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-850 hover:text-white border border-zinc-800 rounded-xl text-xs font-bold text-zinc-400 transition-colors cursor-pointer"
          >
            Cancelar e Voltar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/25 text-white rounded-xl text-xs font-black transition-all cursor-pointer"
          >
            💾 Confirmar e Salvar
          </button>
        </div>

      </div>
    </div>
  );
}
