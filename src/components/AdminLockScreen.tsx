import React, { useState, useEffect } from 'react';
import { 
  Building2, Lock, Unlock, ShieldAlert, KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, RefreshCw 
} from 'lucide-react';
import { Resident, LoginCustomization } from '../types';

interface AdminLockScreenProps {
  onUnlock: (userId: string, passwordInput: string) => boolean;
  operatorName: string;
  portName: string;
  operatorAvatarUrl: string;
  appName?: string;
  residents: Resident[];
  loginCustomization?: LoginCustomization;
}

export default function AdminLockScreen({
  onUnlock,
  operatorName,
  portName,
  operatorAvatarUrl,
  appName = 'CondoAccess',
  residents = [],
  loginCustomization
}: AdminLockScreenProps) {
  const [userIdInput, setUserIdInput] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  // Extract custom login settings or fall back to template defaults
  const custom = loginCustomization || {
    layout_model: 4,
    primary_color: '#3b82f6',
    secondary_color: '#1e293b',
    button_color: '#2563eb',
    button_text_color: '#ffffff',
    text_color: '#fafafa',
    logo_url: '',
    logo_size: 100,
    logo_alignment: 'center' as const,
    background_url: '',
    background_opacity: 100,
    background_blur: 0,
    condominium_name: appName,
    slogan: 'Mural Central & Controle de Acesso',
    welcome_message: 'Painel Central do Condomínio Inteligente',
    footer_text: 'Local Console Security Client v2.4 • Desenvolvido com Tecnologia IA'
  };

  const model = custom.layout_model || 4;

  // Live clock tracker inside locked terminal
  // REMOVED CLOCK TRACKER

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!userIdInput || !password) {
      setErrorMsg('Por favor, preencha usuário e senha.');
      triggerShake();
      return;
    }

    const success = onUnlock(userIdInput, password);
    if (!success) {
      setErrorMsg('Credenciais inválidas.');
      triggerShake();
    } else {
      setPassword('');
      setUserIdInput('admin'); // Reset
    }
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  // Virtual Keypad handlers
  const handleKeypadPress = (val: string) => {
    setErrorMsg('');
    setPassword(prev => prev + val);
  };

  const handleKeypadClear = () => {
    setPassword('');
    setErrorMsg('');
  };

  const handleKeypadBackspace = () => {
    setPassword(prev => prev.slice(0, -1));
  };

  // Base dynamic styles
  const outerStyle: React.CSSProperties = {
    backgroundColor: custom.secondary_color || '#1e293b',
    color: custom.text_color || '#fafafa'
  };

  const DEFAULT_WALLPAPER_FALLBACK = "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=80";
  const activeWallpaper = custom.background_url || DEFAULT_WALLPAPER_FALLBACK;

  // Diagnostic Log for Wallpaper Loaded/Fallback
  useEffect(() => {
    console.log(`[WALLPAPER_DIAGNOSTIC] Carregamento do Wallpaper iniciado.`);
    console.log(`[WALLPAPER_DIAGNOSTIC] URL de Origem: ${custom.background_url ? (custom.background_url.startsWith('data:') ? 'Imagem Customizada Base64 (Tamanho: ' + Math.round(custom.background_url.length / 1024) + ' KB)' : custom.background_url) : 'Nenhuma selecionada (usando fallback padrão)'}`);
    console.log(`[WALLPAPER_DIAGNOSTIC] Estado de Renderização: Ativo | Opacidade: ${custom.background_opacity ?? 100}% | Blur: ${custom.background_blur ?? 0}px`);
  }, [custom.background_url, custom.background_opacity, custom.background_blur]);

  const bgStyle: React.CSSProperties = {
    backgroundImage: `url(${activeWallpaper})`,
    opacity: (custom.background_opacity !== undefined ? custom.background_opacity : 100) / 100,
    filter: `blur(${custom.background_blur || 0}px)`
  };

  const isSplit = model === 2 || model === 3;
  const isSplitLeft = model === 3;

  const renderBannerColumn = () => (
    <div 
      className="hidden md:flex md:w-5/12 h-full flex-col justify-between p-12 text-left relative overflow-hidden shrink-0 select-none"
      style={{ 
        backgroundColor: custom.secondary_color || '#1e293b',
        borderRight: !isSplitLeft ? `1px solid ${custom.primary_color}15` : undefined,
        borderLeft: isSplitLeft ? `1px solid ${custom.primary_color}15` : undefined,
      }}
    >
      {/* Background layer inside banner column */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-all duration-300 pointer-events-none"
        style={{
          backgroundImage: `url(${activeWallpaper})`,
          opacity: ((custom.background_opacity !== undefined ? custom.background_opacity : 100) / 100) * 0.35,
          filter: `blur(${custom.background_blur || 0}px)`
        }}
      />
      <div className="relative z-10 flex flex-col justify-between h-full w-full">
        <div>
          <div className="flex items-center gap-2.5">
            <Building2 className="w-6 h-6" style={{ color: custom.primary_color || '#3b82f6' }} />
            <h3 className="text-lg font-black uppercase tracking-wider" style={{ color: custom.primary_color }}>
              {custom.condominium_name || appName}
            </h3>
          </div>
          <p className="text-zinc-400 text-xs mt-1.5 font-mono select-all">
            {custom.slogan || 'Mural Central & Controle de Acesso'}
          </p>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight leading-none text-white select-all">
            {custom.welcome_message || 'Painel Central do Condomínio Inteligente'}
          </h1>
          <p className="text-sm text-zinc-450 font-mono tracking-tight select-all">
            Identidade visual integrada por condomínio. Acesse com sua senha administrativa para eclusas e gerenciamento.
          </p>
        </div>

        <div className="text-[10px] text-zinc-500 font-mono select-all">
          <p>{custom.footer_text || 'Local Console Security Client v2.4 • Desenvolvido com Tecnologia IA'}</p>
        </div>
      </div>
    </div>
  );

  const renderFormContent = (isCenteredPage: boolean = false) => {
    // Layout-specific styling wrappers
    let boxClass = "w-full max-w-sm flex flex-col items-center text-center space-y-5";
    let boxStyle: React.CSSProperties = {};

    if (model === 1) {
      boxClass = "w-full max-w-xs bg-zinc-950/75 backdrop-blur-md border border-zinc-850 p-6 rounded-3xl text-center space-y-4 shadow-2xl m-auto";
    } else if (model === 4) {
      boxClass = "w-full max-w-xs bg-zinc-900/90 backdrop-blur-md border border-zinc-800 p-6 rounded-3xl text-center space-y-4 shadow-2xl m-auto";
    } else if (model === 5) {
      boxClass = "w-full max-w-xs p-4 text-center space-y-4 m-auto"; // flat, ultra minimal
    } else if (model === 6) {
      boxClass = "w-full max-w-xs bg-zinc-950 border border-zinc-800 p-6 rounded-3xl text-center space-y-4 shadow-2xl relative overflow-hidden m-auto";
    }

    return (
      <div 
        className={`flex-1 flex items-center justify-center p-6 sm:p-12 relative overflow-y-auto h-full`}
        style={!isCenteredPage ? { backgroundColor: `${custom.secondary_color}ea` } : {}}
      >
        {/* Model 6 accent bar */}
        {model === 6 && (
          <div className="absolute top-0 inset-x-0 h-1" style={{ backgroundColor: custom.primary_color }} />
        )}

        <div className={boxClass} style={boxStyle} id="locked-card-wrapper">
          
          {/* Custom logo placement */}
          {custom.logo_url ? (
            <div 
              className="flex w-full select-none" 
              style={{
                justifyContent: custom.logo_alignment === 'left' ? 'flex-start' : custom.logo_alignment === 'right' ? 'flex-end' : 'center'
              }}
            >
              <img 
                src={custom.logo_url} 
                alt="Logo do Condomínio" 
                referrerPolicy="no-referrer"
                className="object-contain"
                style={{
                  height: `${(custom.logo_size || 100) * 0.35}px`,
                  maxHeight: '100px'
                }}
              />
            </div>
          ) : null}

          {/* System Time Center block - REMOVED */}


          {/* Header Title block if Model 4 or 5 */}
          {(model === 1 || model === 4 || model === 5 || model === 6) && (
            <div className="space-y-1 select-none">
              <h3 className="text-md font-extrabold tracking-wide uppercase font-mono" style={{ color: custom.primary_color }}>
                {custom.condominium_name || appName}
              </h3>
              <p className="text-[10px] text-zinc-400 font-mono italic">
                {custom.slogan || 'Mural Central & Controle de Acesso'}
              </p>
            </div>
          )}

          {/* Console Name details */}
          <div 
            className="border p-3.5 rounded-2xl w-full flex items-center justify-center gap-3 select-none"
            style={{
              backgroundColor: `${custom.secondary_color}bb`,
              borderColor: `${custom.primary_color}1d`
            }}
          >
            {operatorAvatarUrl ? (
              <img 
                src={operatorAvatarUrl} 
                alt={operatorName}
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full object-cover border shadow-md shrink-0"
                style={{ borderColor: custom.primary_color }}
              />
            ) : (
              <div 
                className="w-10 h-10 rounded-full bg-zinc-800 text-zinc-300 font-mono font-black text-xs flex items-center justify-center uppercase shrink-0 border"
                style={{ borderColor: `${custom.primary_color}44` }}
              >
                {operatorName.split(' ').filter(n => !n.toLowerCase().startsWith('op.')).map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'OP'}
              </div>
            )}
            <div className="text-left">
              <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider font-mono">Terminal Bloqueado</p>
              <p className="text-xs text-zinc-200 font-bold mt-1 select-all">
                {operatorName} &bull; <span className="text-zinc-400 font-normal">{portName}</span>
              </p>
            </div>
          </div>

          {/* Form panel with Shake effect */}
          <form 
            onSubmit={handleUnlockSubmit} 
            className={`w-full space-y-4 ${isShaking ? 'animate-bounce' : ''}`}
            style={{
              animationIterationCount: isShaking ? 2 : 1,
              animationDuration: isShaking ? '0.2s' : '0s'
            }}
          >
            {errorMsg && (
              <div className="p-3 bg-red-950/40 border border-red-800/60 text-red-200 text-xs rounded-xl flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* User Input Block */}
            <div className="relative">
              <input
                type="text"
                value={userIdInput}
                onChange={(e) => setUserIdInput(e.target.value)}
                placeholder="Digite seu usuário ou ID..."
                autoFocus
                className="w-full px-4 py-3 bg-zinc-950/80 border border-zinc-800 rounded-2xl text-center text-sm text-white font-mono placeholder:tracking-normal placeholder-zinc-600 focus:outline-none transition-colors shadow-inner"
                style={{
                  borderWidth: '1px'
                }}
              />
            </div>

            {/* Password Input Block */}
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha..."
                className="w-full pl-4 pr-12 py-3 bg-zinc-950/80 border border-zinc-800 rounded-2xl text-center text-sm text-white font-mono tracking-widest placeholder:tracking-normal placeholder-zinc-650 focus:outline-none transition-colors shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1 cursor-pointer"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Virtual Numeric Touch Keypad */}
            <div className="grid grid-cols-3 gap-2 max-w-[280px] mx-auto pt-2 select-none" id="lock-virtual-keypad">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeypadPress(num)}
                  className="py-2.5 hover:bg-zinc-800/80 active:bg-zinc-800 border rounded-xl text-center font-bold text-xs font-mono transition-all cursor-pointer select-none"
                  style={{
                    backgroundColor: `${custom.secondary_color}dd`,
                    borderColor: `${custom.primary_color}18`,
                    color: custom.text_color
                  }}
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handleKeypadClear}
                className="py-2.5 bg-zinc-950 text-red-400 hover:text-red-300 border border-zinc-900 rounded-xl text-[10px] font-bold font-mono uppercase tracking-tight transition-all cursor-pointer select-none"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                className="py-2.5 hover:bg-zinc-800/80 active:bg-zinc-800 border rounded-xl text-center font-bold text-xs font-mono transition-all cursor-pointer select-none"
                style={{
                  backgroundColor: `${custom.secondary_color}dd`,
                  borderColor: `${custom.primary_color}18`,
                  color: custom.text_color
                }}
              >
                0
              </button>
              <button
                type="button"
                onClick={handleKeypadBackspace}
                className="py-2.5 bg-zinc-950 text-yellow-500 hover:text-yellow-400 border border-zinc-900 rounded-xl text-[10px] font-bold font-mono uppercase tracking-tight transition-all cursor-pointer select-none"
              >
                Apagar
              </button>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 text-white rounded-2xl text-xs font-bold transition-all shadow-md focus:outline-none flex items-center justify-center gap-2 cursor-pointer"
                style={{
                  backgroundColor: custom.button_color || '#2563eb',
                  color: custom.button_text_color || '#ffffff'
                }}
              >
                <Unlock className="w-4 h-4" /> Desbloquear Console
              </button>
            </div>
          </form>

          {/* Prompt Message and Version Footer */}
          <div className="pt-4 text-[9px] text-zinc-550 font-mono tracking-tight leading-normal uppercase">
            <p className="select-all">{custom.footer_text || 'Local Console Security Client v2.4 • Desenvolvido com Tecnologia IA'}</p>
          </div>

        </div>
      </div>
    );
  };

  return (
    <div 
      className="fixed inset-0 z-100 flex overflow-hidden font-sans"
      id="console-lock-screen"
      style={outerStyle}
    >
      {/* Simulation/Real Background wallpaper with Oppacity & Blur styling */}
      <div 
        className="absolute inset-0 bg-cover bg-center pointer-events-none transition-all duration-350"
        style={bgStyle}
      />

      {/* Conditional Layout Models Routing */}
      {isSplit ? (
        <div className="relative z-10 w-full h-full flex flex-col md:flex-row overflow-hidden">
          {!isSplitLeft ? (
            <>
              {renderBannerColumn()}
              {renderFormContent(false)}
            </>
          ) : (
            <>
              {renderFormContent(false)}
              {renderBannerColumn()}
            </>
          )}
        </div>
      ) : (
        /* Fullscreen designs or Card designs overlay */
        <div className="relative z-10 w-full h-full flex items-center justify-center p-4">
          {renderFormContent(true)}
        </div>
      )}
    </div>
  );
}
