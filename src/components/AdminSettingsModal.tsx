import React, { useState, useEffect } from 'react';
import { getConfig } from '../lib/config';
import { 
  X, Eye, EyeOff, ShieldAlert, KeyRound, User, MapPin, Lock, CheckCircle2, AlertCircle, Camera, Upload, Image as ImageIcon,
  Palette, Building2, Shield, Home, Key, Star, Layout, RefreshCw, Database, Save, Copy, Check
} from 'lucide-react';
import { ThemeSettings, LoginCustomization } from '../types';

interface SyncLog {
  id: string;
  timestamp: string;
  type: 'success' | 'error' | 'warning';
  msg: string;
}

interface AdminSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminPasswordCurrent: string;
  onSavePassword: (newPass: string) => void;
  operatorNameCurrent: string;
  portNameCurrent: string;
  operatorAvatarUrlCurrent: string;
  onSaveOperator: (name: string, port: string, avatarUrl: string) => void;
  onLockPanel: () => void;
  themeSettingsCurrent: ThemeSettings;
  onSaveThemeSettings: (settings: ThemeSettings) => void;
  syncLogs?: SyncLog[];
  loginCustomizationCurrent: LoginCustomization;
  onSaveLoginCustomization: (settings: LoginCustomization) => Promise<boolean>;
}

const PRESET_OPERATOR_AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&h=150&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&h=150&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80',
];

export default function AdminSettingsModal({
  isOpen,
  onClose,
  adminPasswordCurrent,
  onSavePassword,
  operatorNameCurrent,
  portNameCurrent,
  operatorAvatarUrlCurrent,
  onSaveOperator,
  onLockPanel,
  themeSettingsCurrent,
  onSaveThemeSettings,
  syncLogs = [],
  loginCustomizationCurrent,
  onSaveLoginCustomization
}: AdminSettingsModalProps) {
  const [activeTab, setActiveTab ] = useState<'password' | 'operator' | 'theme' | 'login' | 'env' | 'db_diagnostics'>('password');

  
  // Password states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  
  // Feedback states
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Operator states
  const [operatorName, setOperatorName] = useState(operatorNameCurrent);
  const [portName, setPortName] = useState(portNameCurrent);
  const [operatorAvatarUrl, setOperatorAvatarUrl] = useState(operatorAvatarUrlCurrent || '');
  const [operatorSuccess, setOperatorSuccess] = useState(false);

  // Theme & Branding states
  const [appName, setAppName] = useState(themeSettingsCurrent?.appName || 'CONDOACCESS');
  const [appSlogan, setAppSlogan] = useState(themeSettingsCurrent?.appSlogan || 'Mural Central & Controle de Acesso');
  const [logoUrl, setLogoUrl] = useState(themeSettingsCurrent?.logoUrl || '');
  const [logoIcon, setLogoIcon] = useState(themeSettingsCurrent?.logoIcon || 'Building2');
  const [presetId, setPresetId] = useState<'classic' | 'cosmic' | 'emerald' | 'cyber' | 'sunset' | 'ocean' | 'custom'>(themeSettingsCurrent?.presetId || 'classic');
  const [customBg, setCustomBg] = useState(themeSettingsCurrent?.customBg || '#f8fafc');
  const [customCardBg, setCustomCardBg] = useState(themeSettingsCurrent?.customCardBg || '#ffffff');
  const [customText, setCustomText] = useState(themeSettingsCurrent?.customText || '#0f172a');
  const [customTextMuted, setCustomTextMuted] = useState(themeSettingsCurrent?.customTextMuted || '#475569');
  const [customBorder, setCustomBorder] = useState(themeSettingsCurrent?.customBorder || '#cbd5e1');
  const [customAccent, setCustomAccent] = useState(themeSettingsCurrent?.customAccent || '#2563eb');
  const [towerNames, setTowerNames] = useState<string[]>(themeSettingsCurrent?.towerNames || ['Torre 1', 'Torre 2', 'Torre 3']);
  const [themeSuccess, setThemeSuccess] = useState(false);

  // Login Customization states
  const [loginModel, setLoginModel] = useState<number>(loginCustomizationCurrent?.layout_model || 4);
  const [loginPrimaryColor, setLoginPrimaryColor] = useState(loginCustomizationCurrent?.primary_color || '#3b82f6');
  const [loginSecondaryColor, setLoginSecondaryColor] = useState(loginCustomizationCurrent?.secondary_color || '#1e293b');
  const [loginButtonColor, setLoginButtonColor] = useState(loginCustomizationCurrent?.button_color || '#2563eb');
  const [loginButtonTextColor, setLoginButtonTextColor] = useState(loginCustomizationCurrent?.button_text_color || '#ffffff');
  const [loginTextColor, setLoginTextColor] = useState(loginCustomizationCurrent?.text_color || '#fafafa');
  const [loginLogoUrl, setLoginLogoUrl] = useState(loginCustomizationCurrent?.logo_url || '');
  const [loginLogoSize, setLoginLogoSize] = useState<number>(loginCustomizationCurrent?.logo_size || 100);
  const [loginLogoAlignment, setLoginLogoAlignment] = useState<'left' | 'center' | 'right'>(loginCustomizationCurrent?.logo_alignment || 'center');
  const [loginBackgroundUrl, setLoginBackgroundUrl] = useState(loginCustomizationCurrent?.background_url || '');
  const [loginBackgroundOpacity, setLoginBackgroundOpacity] = useState<number>(loginCustomizationCurrent?.background_opacity !== undefined ? loginCustomizationCurrent?.background_opacity : 100);
  const [loginBackgroundBlur, setLoginBackgroundBlur] = useState<number>(loginCustomizationCurrent?.background_blur !== undefined ? loginCustomizationCurrent?.background_blur : 0);
  const [loginCondoName, setLoginCondoName] = useState(loginCustomizationCurrent?.condominium_name || 'CondoAccess');
  const [loginSlogan, setLoginSlogan] = useState(loginCustomizationCurrent?.slogan || 'Mural Central & Controle de Acesso');
  const [loginWelcomeMessage, setLoginWelcomeMessage] = useState(loginCustomizationCurrent?.welcome_message || 'Painel Central do Condomínio Inteligente');
  const [loginFooterText, setLoginFooterText] = useState(loginCustomizationCurrent?.footer_text || 'Local Console Security Client v2.4 • Desenvolvido com Tecnologia IA');
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [loginIsSaving, setLoginIsSaving] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Database Diagnostics states
  const [dbDiagnoseData, setDbDiagnoseData] = useState<{
    supabaseStatus: 'connected' | 'disconnected';
    proxyStatus: string;
    sessionStatus: { role: string; authenticated: boolean; lastWriteSynced: boolean };
    tablesFound: string[];
    tablesMissing: string[];
    lastError: string | null;
    checkedAt: string;
  } | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [schemaSql, setSchemaSql] = useState('');
  const [sqlCopied, setSqlCopied] = useState(false);

  const runDbDiagnose = () => {
    setIsDiagnosing(true);
    fetch('/api/db-diagnose')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setDbDiagnoseData(data);
        }
        setIsDiagnosing(false);
      })
      .catch((e) => {
        console.error('Exception on database diagnostics call:', e);
        setIsDiagnosing(false);
      });

    fetch('/api/db-schema-sql')
      .then(res => res.ok ? res.json() : null)
      .then(resData => {
        if (resData && resData.sql) {
          setSchemaSql(resData.sql);
        }
      })
      .catch(err => console.error('Error fetching schema SQL:', err));
  };

  const handleCopySql = () => {
    if (!schemaSql) return;
    navigator.clipboard.writeText(schemaSql);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 2000);
  };

  // Supabase connection keys states
  const [supabaseUrl, setSupabaseUrl] = useState(() => getConfig().supabaseUrl);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(() => getConfig().supabaseAnonKey);
  const [supabaseServiceRoleKey, setSupabaseServiceRoleKey] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [envIsSaving, setEnvIsSaving] = useState(false);
  const [envStatus, setEnvStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [diagnostics, setDiagnostics] = useState<{
    supabaseConfigured: boolean;
    geminiConfigured: boolean;
    bancoConectado: boolean;
    errors: string[];
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setOperatorName(operatorNameCurrent);
      setPortName(portNameCurrent);
      setOperatorAvatarUrl(operatorAvatarUrlCurrent || '');
      
      fetch('/api/config-status')
        .then(res => res.ok ? res.json() : null)
        .then(diag => {
          if (diag) {
            setDiagnostics(diag);
          }
        })
        .catch(() => {});

      runDbDiagnose();
    }
  }, [isOpen, operatorNameCurrent, portNameCurrent, operatorAvatarUrlCurrent]);

  useEffect(() => {
    if (isOpen && themeSettingsCurrent) {
      setAppName(themeSettingsCurrent.appName);
      setAppSlogan(themeSettingsCurrent.appSlogan);
      setLogoUrl(themeSettingsCurrent.logoUrl || '');
      setLogoIcon(themeSettingsCurrent.logoIcon || 'Building2');
      setPresetId(themeSettingsCurrent.presetId);
      setCustomBg(themeSettingsCurrent.customBg);
      setCustomCardBg(themeSettingsCurrent.customCardBg);
      setCustomText(themeSettingsCurrent.customText);
      setCustomTextMuted(themeSettingsCurrent.customTextMuted);
      setCustomBorder(themeSettingsCurrent.customBorder);
      setCustomAccent(themeSettingsCurrent.customAccent);
      setTowerNames(themeSettingsCurrent.towerNames || ['Torre 1', 'Torre 2', 'Torre 3']);
    }
  }, [isOpen, themeSettingsCurrent]);

  useEffect(() => {
    if (isOpen && loginCustomizationCurrent) {
      setLoginModel(loginCustomizationCurrent.layout_model || 4);
      setLoginPrimaryColor(loginCustomizationCurrent.primary_color || '#3b82f6');
      setLoginSecondaryColor(loginCustomizationCurrent.secondary_color || '#1e293b');
      setLoginButtonColor(loginCustomizationCurrent.button_color || '#2563eb');
      setLoginButtonTextColor(loginCustomizationCurrent.button_text_color || '#ffffff');
      setLoginTextColor(loginCustomizationCurrent.text_color || '#fafafa');
      setLoginLogoUrl(loginCustomizationCurrent.logo_url || '');
      setLoginLogoSize(loginCustomizationCurrent.logo_size || 100);
      setLoginLogoAlignment(loginCustomizationCurrent.logo_alignment || 'center');
      setLoginBackgroundUrl(loginCustomizationCurrent.background_url || '');
      setLoginBackgroundOpacity(loginCustomizationCurrent.background_opacity !== undefined ? loginCustomizationCurrent.background_opacity : 100);
      setLoginBackgroundBlur(loginCustomizationCurrent.background_blur !== undefined ? loginCustomizationCurrent.background_blur : 0);
      setLoginCondoName(loginCustomizationCurrent.condominium_name || 'CondoAccess');
      setLoginSlogan(loginCustomizationCurrent.slogan || 'Mural Central & Controle de Acesso');
      setLoginWelcomeMessage(loginCustomizationCurrent.welcome_message || 'Painel Central do Condomínio Inteligente');
      setLoginFooterText(loginCustomizationCurrent.footer_text || 'Local Console Security Client v2.4 • Desenvolvido com Tecnologia IA');
    }
  }, [isOpen, loginCustomizationCurrent]);

  const applyPreset = (id: 'classic' | 'cosmic' | 'emerald' | 'cyber' | 'sunset' | 'ocean') => {
    setPresetId(id);
    if (id === 'classic') {
      setCustomBg('#f8fafc');
      setCustomCardBg('#ffffff');
      setCustomText('#0f172a');
      setCustomTextMuted('#475569');
      setCustomBorder('#cbd5e1');
      setCustomAccent('#2563eb');
    } else if (id === 'cosmic') {
      setCustomBg('#09090b');
      setCustomCardBg('#18181b');
      setCustomText('#fafafa');
      setCustomTextMuted('#a1a1aa');
      setCustomBorder('#27272a');
      setCustomAccent('#06b6d4');
    } else if (id === 'emerald') {
      setCustomBg('#f0f7f4');
      setCustomCardBg('#ffffff');
      setCustomText('#064e3b');
      setCustomTextMuted('#047857');
      setCustomBorder('#a7f3d0');
      setCustomAccent('#10b981');
    } else if (id === 'cyber') {
      setCustomBg('#000000');
      setCustomCardBg('#090d16');
      setCustomText('#10b981');
      setCustomTextMuted('#059669');
      setCustomBorder('#10b981');
      setCustomAccent('#00f2fe');
    } else if (id === 'sunset') {
      setCustomBg('#faf6f0');
      setCustomCardBg('#ffffff');
      setCustomText('#451a03');
      setCustomTextMuted('#78350f');
      setCustomBorder('#fed7aa');
      setCustomAccent('#ea580c');
    } else if (id === 'ocean') {
      setCustomBg('#f0f9ff');
      setCustomCardBg('#ffffff');
      setCustomText('#0c4a6e');
      setCustomTextMuted('#0284c7');
      setCustomBorder('#bae6fd');
      setCustomAccent('#0284c7');
    }
  };

  if (!isOpen) return null;

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError('Por favor, preencha todos os campos.');
      return;
    }

    if (oldPassword !== adminPasswordCurrent) {
      setPasswordError('A senha atual inserida está incorreta.');
      return;
    }

    if (newPassword.length < 4) {
      setPasswordError('A nova senha deve possuir pelo menos 4 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('A nova senha e a confirmação não coincidem.');
      return;
    }

    onSavePassword(newPassword);
    setPasswordSuccess(true);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    
    // Auto-clear success message
    setTimeout(() => {
      setPasswordSuccess(false);
    }, 4000);
  };

  const handleFileChangeLocal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (JPG, PNG).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('A imagem é muito grande. Escolha uma foto de até 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      setOperatorAvatarUrl(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleOperatorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOperatorSuccess(false);

    if (!operatorName.trim() || !portName.trim()) {
      alert('Favor preencher o nome do operador e a portaria.');
      return;
    }

    onSaveOperator(operatorName.trim(), portName.trim(), operatorAvatarUrl);
    setOperatorSuccess(true);
    
    setTimeout(() => {
      setOperatorSuccess(false);
    }, 3000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (JPG, PNG).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('A imagem é muito grande. Escolha uma foto de até 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      setLogoUrl(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleThemeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setThemeSuccess(false);

    if (!appName.trim()) {
      alert('Por favor, preencha o Nome do Sistema.');
      return;
    }

    const settings: ThemeSettings = {
      appName: appName.trim(),
      appSlogan: appSlogan.trim(),
      logoUrl,
      logoIcon,
      presetId,
      customBg,
      customCardBg,
      customText,
      customTextMuted,
      customBorder,
      customAccent,
      towerNames: towerNames.map(t => t.trim()).filter(Boolean)
    };

    onSaveThemeSettings(settings);
    setThemeSuccess(true);

    setTimeout(() => {
      setThemeSuccess(false);
    }, 3000);
  };

  // Login Customization Handlers
  const handleLoginLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem excede o tamanho máximo de 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setLoginLogoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem excede o tamanho máximo de 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setLoginBackgroundUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRestoreDefaultLogin = () => {
    setLoginModel(4);
    setLoginPrimaryColor('#3b82f6');
    setLoginSecondaryColor('#1e293b');
    setLoginButtonColor('#2563eb');
    setLoginButtonTextColor('#ffffff');
    setLoginTextColor('#fafafa');
    setLoginLogoUrl('');
    setLoginLogoSize(100);
    setLoginLogoAlignment('center');
    setLoginBackgroundUrl('');
    setLoginBackgroundOpacity(100);
    setLoginBackgroundBlur(0);
    setLoginCondoName('CondoAccess');
    setLoginSlogan('Mural Central & Controle de Acesso');
    setLoginWelcomeMessage('Painel Central do Condomínio Inteligente');
    setLoginFooterText('Local Console Security Client v2.4 • Desenvolvido com Tecnologia IA');
  };

  const handleDuplicateThemeColors = () => {
    setLoginPrimaryColor(themeSettingsCurrent?.customAccent || '#2563eb');
    setLoginSecondaryColor(themeSettingsCurrent?.customCardBg || '#1e293b');
    setLoginTextColor(themeSettingsCurrent?.customText || '#fafafa');
    setLoginButtonColor(themeSettingsCurrent?.customAccent || '#2563eb');
    setLoginCondoName(themeSettingsCurrent?.appName || 'CondoAccess');
    setLoginSlogan(themeSettingsCurrent?.appSlogan || 'Mural Central & Controle de Acesso');
  };

  const handleExportLoginTheme = () => {
    const configObj = {
      layout_model: loginModel,
      primary_color: loginPrimaryColor,
      secondary_color: loginSecondaryColor,
      button_color: loginButtonColor,
      button_text_color: loginButtonTextColor,
      text_color: loginTextColor,
      logo_url: loginLogoUrl,
      logo_size: loginLogoSize,
      logo_alignment: loginLogoAlignment,
      background_url: loginBackgroundUrl,
      background_opacity: loginBackgroundOpacity,
      background_blur: loginBackgroundBlur,
      condominium_name: loginCondoName,
      slogan: loginSlogan,
      welcome_message: loginWelcomeMessage,
      footer_text: loginFooterText
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(configObj, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `login_custom_theme_${loginCondoName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportLoginTheme = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.onload = (event) => {
        try {
          if (event.target?.result) {
            const parsed = JSON.parse(event.target.result as string);
            if (parsed) {
              if (parsed.layout_model !== undefined) setLoginModel(Number(parsed.layout_model));
              if (parsed.primary_color) setLoginPrimaryColor(parsed.primary_color);
              if (parsed.secondary_color) setLoginSecondaryColor(parsed.secondary_color);
              if (parsed.button_color) setLoginButtonColor(parsed.button_color);
              if (parsed.button_text_color) setLoginButtonTextColor(parsed.button_text_color);
              if (parsed.text_color) setLoginTextColor(parsed.text_color);
              if (parsed.logo_url !== undefined) setLoginLogoUrl(parsed.logo_url);
              if (parsed.logo_size !== undefined) setLoginLogoSize(Number(parsed.logo_size));
              if (parsed.logo_alignment) setLoginLogoAlignment(parsed.logo_alignment);
              if (parsed.background_url !== undefined) setLoginBackgroundUrl(parsed.background_url);
              if (parsed.background_opacity !== undefined) setLoginBackgroundOpacity(Number(parsed.background_opacity));
              if (parsed.background_blur !== undefined) setLoginBackgroundBlur(Number(parsed.background_blur));
              if (parsed.condominium_name) setLoginCondoName(parsed.condominium_name);
              if (parsed.slogan) setLoginSlogan(parsed.slogan);
              if (parsed.welcome_message) setLoginWelcomeMessage(parsed.welcome_message);
              if (parsed.footer_text) setLoginFooterText(parsed.footer_text);
            }
          }
        } catch (err) {
          alert('Formato de arquivo de tema inválido.');
        }
      };
      fileReader.readAsText(e.target.files[0]);
    }
  };

  const handleSaveLoginConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginIsSaving(true);
    setLoginSuccess(false);

    const configToSave: LoginCustomization = {
      id: loginCustomizationCurrent?.id || 'active',
      layout_model: loginModel,
      primary_color: loginPrimaryColor,
      secondary_color: loginSecondaryColor,
      button_color: loginButtonColor,
      button_text_color: loginButtonTextColor,
      text_color: loginTextColor,
      logo_url: loginLogoUrl,
      logo_size: loginLogoSize,
      logo_alignment: loginLogoAlignment,
      background_url: loginBackgroundUrl,
      background_opacity: loginBackgroundOpacity,
      background_blur: loginBackgroundBlur,
      condominium_name: loginCondoName,
      slogan: loginSlogan,
      welcome_message: loginWelcomeMessage,
      footer_text: loginFooterText,
      updated_at: new Date().toISOString(),
      updated_by: operatorNameCurrent || 'Administrador'
    };

    const success = await onSaveLoginCustomization(configToSave);
    setLoginIsSaving(false);
    if (success) {
      setLoginSuccess(true);
      setTimeout(() => setLoginSuccess(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="admin-settings-modal-overlay">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-xs transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Box */}
      <div className="relative bg-zinc-950 border border-zinc-800 w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl z-10 text-slate-100 flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-600/20 text-blue-400 rounded-lg">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold tracking-tight text-white uppercase font-mono">Configurações de Acesso</h3>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">ADMINISTRADOR DO CONDOMÍNIO</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/60 p-1 flex-wrap gap-1 sm:gap-0">
          <button
            onClick={() => setActiveTab('password')}
            className={`flex-1 min-w-[90px] py-2.5 text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === 'password'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Lock className="w-3 h-3" /> Senha
          </button>
          <button
            onClick={() => setActiveTab('operator')}
            className={`flex-1 min-w-[100px] py-2.5 text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === 'operator'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <User className="w-3 h-3" /> Operador
          </button>
          <button
            onClick={() => setActiveTab('theme')}
            className={`flex-1 min-w-[110px] py-2.5 text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === 'theme'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Palette className="w-3 h-3" /> Temas
          </button>
          <button
            onClick={() => setActiveTab('login')}
            className={`flex-1 min-w-[110px] py-2.5 text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === 'login'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <ImageIcon className="w-3 h-3" /> Login Padrão
          </button>
          <button
            onClick={() => setActiveTab('env')}
            className={`flex-1 min-w-[110px] py-2.5 text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === 'env'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Database className="w-3 h-3" /> Conexão
          </button>
          <button
            onClick={() => setActiveTab('db_diagnostics')}
            className={`flex-1 min-w-[110px] py-2.5 text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === 'db_diagnostics'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <ShieldAlert className="w-3 h-3" /> Diagnóstico
          </button>
        </div>

        {/* Modal Body Container */}
        <div className="p-6">
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              
              {/* Feedback States */}
              {passwordError && (
                <div className="p-3 bg-red-950/40 border border-red-800/60 text-red-200 text-xs rounded-xl flex items-start gap-2 animate-pulse">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 text-emerald-205 text-xs rounded-xl flex items-center gap-2 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Senha de Administrador atualizada com sucesso!</span>
                </div>
              )}

              {/* Input Current Pass */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block font-mono">Senha Atual do Admin</label>
                <div className="relative">
                  <input
                    type={showOldPass ? 'text' : 'password'}
                    value={oldPassword || ''}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Digite a senha atual"
                    className="w-full pl-3 pr-10 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPass(!showOldPass)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1"
                  >
                    {showOldPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[9px] text-zinc-500 italic font-mono">Padrão do sistema: "admin"</p>
              </div>

              {/* Input New Pass */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block font-mono">Nova Senha</label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword || ''}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    className="w-full pl-3 pr-10 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1"
                  >
                    {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Pass */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block font-mono">Confirmar Nova Senha</label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPassword || ''}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full pl-3 pr-10 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1"
                  >
                    {showConfirmPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Action */}
              <button
                type="submit"
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md mt-4 cursor-pointer"
              >
                Salvar Nova Senha
              </button>
            </form>
          )}

          {activeTab === 'operator' && (
            <form onSubmit={handleOperatorSubmit} className="space-y-4">
              {operatorSuccess && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 text-emerald-400 text-xs rounded-xl flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Configurações do operador salvas!</span>
                </div>
              )}

              {/* Operator Avatar Selection */}
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-zinc-900/40 p-3.5 rounded-xl border border-zinc-800">
                <div className="relative shrink-0 select-none">
                  {operatorAvatarUrl ? (
                    <img 
                      src={operatorAvatarUrl} 
                      alt="Preview" 
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 rounded-full object-cover border-2 border-blue-600 shadow-lg"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-zinc-850 border border-zinc-750 flex items-center justify-center text-zinc-500">
                      <ImageIcon className="w-6 h-6 text-zinc-400" />
                    </div>
                  )}
                  {operatorAvatarUrl && (
                    <button
                      type="button"
                      onClick={() => setOperatorAvatarUrl('')}
                      className="absolute -top-1 -right-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full w-4.5 h-4.5 flex items-center justify-center text-[9px] font-bold"
                      title="Remover foto"
                    >
                      ✕
                    </button>
                  )}
                </div>
                
                <div className="flex-1 space-y-1.5 text-center sm:text-left">
                  <span className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider block font-mono">Foto do Administrador / Operador</span>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <label className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] px-2.5 py-1.5 rounded-lg font-bold cursor-pointer transition-all flex items-center gap-1 shrink-0">
                      <Upload className="w-3 h-3" /> Enviar Foto
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleFileChangeLocal}
                        className="hidden" 
                      />
                    </label>
                    
                    <div className="flex gap-1">
                      {PRESET_OPERATOR_AVATARS.map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setOperatorAvatarUrl(url)}
                          className={`w-7 h-7 rounded-full overflow-hidden border transition-all ${
                            operatorAvatarUrl === url ? 'border-blue-500 scale-105 shadow-xs' : 'border-zinc-800 opacity-60 hover:opacity-100 font-sans'
                          }`}
                        >
                          <img src={url} alt={`Operator Preset ${idx}`} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Operator Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block font-mono">Nome do Operador Ativo</label>
                <div className="relative flex items-center">
                  <User className="absolute left-3 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={operatorName || ''}
                    onChange={(e) => setOperatorName(e.target.value)}
                    placeholder="Ex: Op. Ricardo Silva"
                    className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Port Location */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block font-mono">Portaria / Terminal de Controle</label>
                <div className="relative flex items-center">
                  <MapPin className="absolute left-3 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={portName || ''}
                    onChange={(e) => setPortName(e.target.value)}
                    placeholder="Ex: Portaria Norte"
                    className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Action */}
              <button
                type="submit"
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md mt-4 cursor-pointer"
              >
                Salvar Operador
              </button>
            </form>
          )}

          {activeTab === 'theme' && (
            <form onSubmit={handleThemeSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {themeSuccess && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 text-emerald-400 text-xs rounded-xl flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Configurações visuais salvas com sucesso!</span>
                </div>
              )}

              {/* System Branding Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-1">
                  <label className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block font-mono">Nome do Sistema / Condomínio</label>
                  <input
                    type="text"
                    value={appName || ''}
                    onChange={(e) => setAppName(e.target.value)}
                    placeholder="Ex: CONDOACCESS"
                    className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <label className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block font-mono">Subtítulo / Slogan</label>
                  <input
                    type="text"
                    value={appSlogan || ''}
                    onChange={(e) => setAppSlogan(e.target.value)}
                    placeholder="Ex: Controle de Acesso"
                    className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Torres / Blocos Section */}
              <div className="bg-zinc-900/40 p-3 rounded-xl border border-zinc-800 space-y-3">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block font-mono">Gerenciar Torres / Blocos</span>
                <div className="space-y-2">
                  {towerNames.map((tower, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={tower || ''}
                        onChange={(e) => {
                          const updated = [...towerNames];
                          updated[idx] = e.target.value;
                          setTowerNames(updated);
                        }}
                        placeholder={`Nome da Torre ${idx + 1}`}
                        className="flex-1 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                      {towerNames.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = towerNames.filter((_, i) => i !== idx);
                            setTowerNames(updated);
                          }}
                          className="px-2 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/50 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                          title="Remover Torre"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setTowerNames([...towerNames, `Torre ${towerNames.length + 1}`])}
                  className="w-full text-center bg-zinc-950 hover:bg-zinc-900 text-zinc-300 border border-zinc-800 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  + Adicionar Nova Torre / Bloco
                </button>
              </div>

              {/* Logo / Icon Customization */}
              <div className="bg-zinc-900/40 p-3 rounded-xl border border-zinc-800 space-y-3">
                <span className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider block font-mono">Logotipo da Portaria</span>
                
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0 select-none bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 flex items-center justify-center w-12 h-12">
                    {logoUrl ? (
                      <img 
                        src={logoUrl} 
                        alt="Logo" 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain rounded-md"
                      />
                    ) : (
                      <div className="text-blue-500">
                        {logoIcon === 'Building2' && <Building2 className="w-6 h-6" />}
                        {logoIcon === 'Shield' && <Shield className="w-6 h-6" />}
                        {logoIcon === 'Home' && <Home className="w-6 h-6" />}
                        {logoIcon === 'Key' && <Key className="w-6 h-6" />}
                        {logoIcon === 'Star' && <Star className="w-6 h-6" />}
                        {logoIcon === 'Layout' && <Layout className="w-6 h-6" />}
                      </div>
                    )}
                    {logoUrl && (
                      <button
                        type="button"
                        onClick={() => setLogoUrl('')}
                        className="absolute -top-1.5 -right-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px] font-bold"
                        title="Remover logotipo personalizado"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] px-2.5 py-1.5 rounded-lg font-bold cursor-pointer transition-all flex items-center gap-1">
                        <Upload className="w-3 h-3" /> Enviar Logo Personalizado
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden" 
                        />
                      </label>
                    </div>

                    {!logoUrl && (
                      <div className="space-y-1">
                        <p className="text-[9px] text-zinc-500 font-medium">Ou selecione um ícone pré-definido:</p>
                        <div className="flex gap-1.5">
                          {[
                            { name: 'Building2', icon: Building2 },
                            { name: 'Shield', icon: Shield },
                            { name: 'Home', icon: Home },
                            { name: 'Key', icon: Key },
                            { name: 'Star', icon: Star },
                            { name: 'Layout', icon: Layout }
                          ].map((item) => {
                            const IconComponent = item.icon;
                            return (
                              <button
                                key={item.name}
                                type="button"
                                onClick={() => setLogoIcon(item.name)}
                                className={`p-1.5 rounded-lg border transition-all ${
                                  logoIcon === item.name 
                                    ? 'border-blue-500 bg-blue-600/10 text-blue-400' 
                                    : 'border-zinc-800 text-zinc-500 hover:text-zinc-350'
                                }`}
                              >
                                <IconComponent className="w-3.5 h-3.5" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Dynamic Theme Presets ("OUTROS layout") */}
              <div className="space-y-2">
                <label className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block font-mono">Estilo Visual do Sistema (Temas Pré-definidos)</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    { id: 'classic', label: 'Padrão Claro', bg: 'bg-[#f8fafc]', text: 'text-slate-900', border: 'border-slate-300' },
                    { id: 'cosmic', label: 'Cosmic Dark', bg: 'bg-[#09090b]', text: 'text-zinc-50', border: 'border-zinc-800' },
                    { id: 'emerald', label: 'Recanto Esmeralda', bg: 'bg-[#f0f7f4]', text: 'text-emerald-900', border: 'border-emerald-250' },
                    { id: 'cyber', label: 'Cyberpunk Neon', bg: 'bg-black', text: 'text-green-400', border: 'border-green-700' },
                    { id: 'sunset', label: 'Creme Outono', bg: 'bg-[#faf6f0]', text: 'text-amber-950', border: 'border-amber-205' },
                    { id: 'ocean', label: 'Oceano Náutico', bg: 'bg-[#f0f9ff]', text: 'text-sky-900', border: 'border-sky-200' },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset.id as any)}
                      className={`p-2 rounded-xl text-left border transition-all text-xs font-medium flex flex-col gap-1 items-stretch ${
                        presetId === preset.id 
                          ? 'border-blue-500 bg-blue-600/10' 
                          : 'border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/70'
                      }`}
                    >
                      <span className="font-bold text-[11px] text-zinc-200">{preset.label}</span>
                      <div className="flex gap-1 items-center mt-1">
                        <span className={`w-3.5 h-3.5 rounded-full inline-block border ${preset.bg} ${preset.border}`} />
                        <span className="text-[10px] text-zinc-450">Amostra</span>
                      </div>
                    </button>
                  ))}
                  <button
                    key="custom-preset-btn"
                    type="button"
                    onClick={() => setPresetId('custom')}
                    className={`p-2 rounded-xl text-left border transition-all text-xs font-medium flex flex-col gap-1 items-stretch col-span-2 md:col-span-3 ${
                      presetId === 'custom' 
                        ? 'border-amber-500 bg-amber-500/10' 
                        : 'border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/70'
                    }`}
                  >
                    <span className="font-extrabold text-[11px] text-amber-400 uppercase tracking-wide">🎨 Sob Medida (Personalizado Manual)</span>
                    <span className="text-[10px] text-zinc-400 leading-tight">Escolha suas próprias cores de fundo, letras e quadros abaixo!</span>
                  </button>
                </div>
              </div>

              {/* Fine tuning controls for Cores de Fundo, Letras e Quadros */}
              <div className="bg-zinc-900/50 p-3.5 rounded-xl border border-zinc-800 space-y-3">
                <span className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider block font-mono">Personalização Fina de Cores</span>
                
                <div className="grid grid-cols-2 gap-3.5">
                  {/* Background Color */}
                  <div className="flex items-center gap-2 justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-300 font-bold block">Cor Fundo</span>
                      <span className="text-[9px] text-zinc-500 font-mono block select-all">{customBg}</span>
                    </div>
                    <input 
                      type="color" 
                      value={customBg || '#f8fafc'} 
                      onChange={(e) => {
                        setCustomBg(e.target.value);
                        setPresetId('custom');
                      }}
                      className="w-10 h-8 rounded border border-zinc-700 bg-transparent cursor-pointer shrink-0"
                    />
                  </div>

                  {/* Card Background Color */}
                  <div className="flex items-center gap-2 justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-300 font-bold block">Fundo Quadros</span>
                      <span className="text-[9px] text-zinc-500 font-mono block select-all">{customCardBg}</span>
                    </div>
                    <input 
                      type="color" 
                      value={customCardBg || '#ffffff'} 
                      onChange={(e) => {
                        setCustomCardBg(e.target.value);
                        setPresetId('custom');
                      }}
                      className="w-10 h-8 rounded border border-zinc-700 bg-transparent cursor-pointer shrink-0"
                    />
                  </div>

                  {/* Text Main Color */}
                  <div className="flex items-center gap-2 justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-300 font-bold block">Letras Principais</span>
                      <span className="text-[9px] text-zinc-500 font-mono block select-all">{customText}</span>
                    </div>
                    <input 
                      type="color" 
                      value={customText || '#0f172a'} 
                      onChange={(e) => {
                        setCustomText(e.target.value);
                        setPresetId('custom');
                      }}
                      className="w-10 h-8 rounded border border-zinc-700 bg-transparent cursor-pointer shrink-0"
                    />
                  </div>

                  {/* Text Muted Color */}
                  <div className="flex items-center gap-2 justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-300 font-bold block">Letras Detalhes</span>
                      <span className="text-[9px] text-zinc-500 font-mono block select-all">{customTextMuted}</span>
                    </div>
                    <input 
                      type="color" 
                      value={customTextMuted || '#475569'} 
                      onChange={(e) => {
                        setCustomTextMuted(e.target.value);
                        setPresetId('custom');
                      }}
                      className="w-10 h-8 rounded border border-zinc-700 bg-transparent cursor-pointer shrink-0"
                    />
                  </div>

                  {/* Border Color */}
                  <div className="flex items-center gap-2 justify-between col-span-1">
                    <div>
                      <span className="text-[10px] text-zinc-300 font-bold block">Molduras/Bordas</span>
                      <span className="text-[9px] text-zinc-500 font-mono block select-all">{customBorder}</span>
                    </div>
                    <input 
                      type="color" 
                      value={customBorder || '#cbd5e1'} 
                      onChange={(e) => {
                        setCustomBorder(e.target.value);
                        setPresetId('custom');
                      }}
                      className="w-10 h-8 rounded border border-zinc-700 bg-transparent cursor-pointer shrink-0"
                    />
                  </div>

                  {/* Accent / Action Buttons */}
                  <div className="flex items-center gap-2 justify-between col-span-1">
                    <div>
                      <span className="text-[10px] text-zinc-250 font-black block font-mono">Destaques / Botões</span>
                      <span className="text-[9px] text-zinc-500 font-mono block select-all">{customAccent}</span>
                    </div>
                    <input 
                      type="color" 
                      value={customAccent || '#2563eb'} 
                      onChange={(e) => {
                        setCustomAccent(e.target.value);
                        setPresetId('custom');
                      }}
                      className="w-10 h-8 rounded border border-zinc-700 bg-transparent cursor-pointer shrink-0"
                    />
                  </div>
                </div>
              </div>

              {/* Action */}
              <button
                type="submit"
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md mt-4 cursor-pointer"
              >
                Aplicar e Salvar Identidade
              </button>
            </form>
          )}

          {activeTab === 'login' && (
            <div className="space-y-6 text-left max-h-[60vh] overflow-y-auto pr-1">
              {/* Feedback Success */}
              {loginSuccess && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 text-emerald-200 text-xs rounded-xl flex items-center gap-2 text-emerald-400 font-semibold animate-pulse">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Personalização salva e em processo de sincronização!</span>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                
                {/* Visual Preview Panel */}
                <div className="lg:col-span-5 bg-zinc-900/65 border border-zinc-800 rounded-xl p-4 flex flex-col items-center lg:sticky lg:top-0">
                  <div className="flex items-center justify-between w-full mb-3.5">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 font-mono">Simulador Realtime</span>
                    <div className="flex bg-zinc-950/85 p-0.5 rounded-lg border border-zinc-850">
                      {(['desktop', 'tablet', 'mobile'] as const).map(dev => (
                        <button
                          key={dev}
                          type="button"
                          onClick={() => setPreviewDevice(dev)}
                          className={`px-2 py-1 text-[9px] font-mono capitalize rounded-md transition-all cursor-pointer ${
                            previewDevice === dev ? 'bg-blue-600 text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          {dev}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Simulated Device Frame Container */}
                  <div 
                    className={`border border-zinc-850 rounded-xl bg-zinc-950/80 overflow-hidden relative shadow-inner flex items-center justify-center transition-all duration-300 ${
                      previewDevice === 'desktop' ? 'w-full h-56' :
                      previewDevice === 'tablet' ? 'w-4/5 h-64' : 'w-56 h-72'
                    }`}
                    style={{
                      backgroundColor: loginSecondaryColor,
                    }}
                  >
                    {/* Simulated Background */}
                    <div 
                      className="absolute inset-0 bg-cover bg-center transition-all duration-300"
                      style={{
                        backgroundImage: `url(${loginBackgroundUrl || "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=80"})`,
                        opacity: (loginBackgroundOpacity !== undefined ? loginBackgroundOpacity : 100) / 100,
                        filter: `blur(${(loginBackgroundBlur || 0)}px)`
                      }}
                    />

                    {/* Simulation Layout Contents based on selected model */}
                    <div className="relative z-10 w-full h-full flex flex-col p-3 text-center overflow-y-auto" style={{ color: loginTextColor }}>
                      {/* Model 1: Fully Centralized on Fullscreen Background */}
                      {loginModel === 1 && (
                        <div className="my-auto flex flex-col items-center justify-center space-y-2 scale-90">
                          {loginLogoUrl && (
                            <img src={loginLogoUrl} className="object-contain" style={{ height: `${(loginLogoSize || 100) * 0.25}px`, alignSelf: loginLogoAlignment === 'left' ? 'flex-start' : loginLogoAlignment === 'right' ? 'flex-end' : 'center' }} />
                          )}
                          <h4 className="text-sm font-black uppercase tracking-wider" style={{ color: loginPrimaryColor }}>{loginCondoName}</h4>
                          <p className="text-[8px] opacity-75">{loginWelcomeMessage}</p>
                          <div className="w-full bg-zinc-900/90 p-2.5 rounded-lg border border-zinc-750/70 space-y-1.5 text-left">
                            <div className="h-3 w-3/4 bg-zinc-850 rounded" />
                            <div className="h-3 w-1/2 bg-zinc-850 rounded" />
                            <div className="h-5 rounded-md mt-2 flex items-center justify-center text-[8px] font-bold" style={{ backgroundColor: loginButtonColor, color: loginButtonTextColor }}>Desbloquear</div>
                          </div>
                          <span className="text-[6px] opacity-50 block font-mono">{loginFooterText}</span>
                        </div>
                      )}

                      {/* Model 2: Split Right */}
                      {loginModel === 2 && (
                        <div className="h-full w-full flex text-left text-xs">
                          <div className="w-1/3 h-full bg-slate-900/80 p-2 border-r border-zinc-800 flex flex-col justify-between text-center shrink-0">
                            <span className="text-[7px] tracking-tight font-extrabold" style={{ color: loginPrimaryColor }}>{loginCondoName}</span>
                            <span className="text-[5px] opacity-60 font-mono scale-90">{loginSlogan}</span>
                          </div>
                          <div className="flex-1 p-2 flex flex-col justify-center space-y-2 scale-90">
                            {loginLogoUrl && (
                              <img src={loginLogoUrl} className="object-contain max-h-5" style={{ alignSelf: loginLogoAlignment === 'left' ? 'flex-start' : loginLogoAlignment === 'right' ? 'flex-end' : 'center' }} />
                            )}
                            <p className="text-[7px]" style={{ color: loginTextColor }}>{loginWelcomeMessage}</p>
                            <div className="space-y-1.5">
                              <div className="h-3 w-full bg-zinc-900 border border-zinc-850 rounded" />
                              <div className="h-3 w-full bg-zinc-900 border border-zinc-850 rounded" />
                              <div className="h-4 rounded flex items-center justify-center text-[7px] font-bold" style={{ backgroundColor: loginButtonColor, color: loginButtonTextColor }}>Entrar</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Model 3: Split Left */}
                      {loginModel === 3 && (
                        <div className="h-full w-full flex text-left text-xs">
                          <div className="flex-1 p-2 flex flex-col justify-center space-y-2 scale-90">
                            {loginLogoUrl && (
                              <img src={loginLogoUrl} className="object-contain max-h-5" style={{ alignSelf: loginLogoAlignment === 'left' ? 'flex-start' : loginLogoAlignment === 'right' ? 'flex-end' : 'center' }} />
                            )}
                            <p className="text-[7px]" style={{ color: loginTextColor }}>{loginWelcomeMessage}</p>
                            <div className="space-y-1.5">
                              <div className="h-3 w-full bg-zinc-900 border border-zinc-850 rounded" />
                              <div className="h-3 w-full bg-zinc-900 border border-zinc-850 rounded" />
                              <div className="h-4 rounded flex items-center justify-center text-[7px] font-bold" style={{ backgroundColor: loginButtonColor, color: loginButtonTextColor }}>Entrar</div>
                            </div>
                          </div>
                          <div className="w-1/3 h-full bg-slate-900/80 p-2 border-l border-zinc-800 flex flex-col justify-between text-center shrink-0">
                            <span className="text-[7px] tracking-tight font-extrabold" style={{ color: loginPrimaryColor }}>{loginCondoName}</span>
                            <span className="text-[5px] opacity-60 font-mono scale-90">{loginSlogan}</span>
                          </div>
                        </div>
                      )}

                      {/* Model 4: Centered Premium Card */}
                      {loginModel === 4 && (
                        <div className="my-auto flex flex-col items-center justify-center space-y-2 scale-90 w-full">
                          <div className="bg-zinc-900/90 border border-zinc-850 p-3 rounded-xl shadow-lg w-full max-w-[190px] text-center flex flex-col items-center gap-1.5">
                            {loginLogoUrl && (
                              <img src={loginLogoUrl} className="object-contain" style={{ height: `${(loginLogoSize || 100) * 0.2}px`, alignSelf: loginLogoAlignment === 'left' ? 'flex-start' : loginLogoAlignment === 'right' ? 'flex-end' : 'center' }} />
                            )}
                            <h4 className="text-xs font-black uppercase tracking-wider" style={{ color: loginPrimaryColor }}>{loginCondoName}</h4>
                            <p className="text-[6px] opacity-65">{loginSlogan}</p>
                            <div className="w-full space-y-1 mt-1 text-left">
                              <div className="h-2.5 w-full bg-zinc-950 rounded border border-zinc-800" />
                              <div className="h-2.5 w-full bg-zinc-950 rounded border border-zinc-800" />
                              <div className="h-4.5 rounded-lg flex items-center justify-center text-[7px] font-extrabold" style={{ backgroundColor: loginButtonColor, color: loginButtonTextColor }}>Desbloquear Console</div>
                            </div>
                          </div>
                          <span className="text-[5px] opacity-45">{loginFooterText}</span>
                        </div>
                      )}

                      {/* Model 5: Ultra Minimalist Layout */}
                      {loginModel === 5 && (
                        <div className="my-auto flex flex-col justify-between h-full py-2 scale-95 w-full">
                          <div className="space-y-1 text-center">
                            {loginLogoUrl && (
                              <img src={loginLogoUrl} className="object-contain mx-auto" style={{ height: `${(loginLogoSize || 100) * 0.22}px`, alignSelf: loginLogoAlignment === 'left' ? 'flex-start' : loginLogoAlignment === 'right' ? 'flex-end' : 'center' }} />
                            )}
                            <h4 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: loginPrimaryColor }}>{loginCondoName}</h4>
                          </div>
                          <div className="space-y-1">
                            <div className="h-3 w-4/5 mx-auto border-b border-zinc-800 rounded" />
                            <div className="h-3 w-4/5 mx-auto border-b border-zinc-800 rounded" />
                            <div className="h-4 w-4/5 mx-auto rounded flex items-center justify-center text-[7px] font-bold border" style={{ borderColor: loginButtonColor, color: loginButtonColor }}>Membro Entrar</div>
                          </div>
                          <p className="text-[5px] opacity-50 font-mono">{loginSlogan}</p>
                        </div>
                      )}

                      {/* Model 6: Premium Corporate */}
                      {loginModel === 6 && (
                        <div className="my-auto flex flex-col items-center justify-center space-y-2.5 scale-90 w-full">
                          <div className="border border-zinc-800 bg-zinc-900/95 p-3 rounded-2xl relative w-full text-center space-y-2">
                            <div className="absolute top-0 inset-x-0 h-1 rounded-t-2xl" style={{ backgroundColor: loginPrimaryColor }} />
                            {loginLogoUrl && (
                              <img src={loginLogoUrl} className="object-contain mx-auto" style={{ height: `${(loginLogoSize || 100) * 0.18}px` }} />
                            )}
                            <div>
                              <h4 className="text-xs font-black uppercase tracking-wider">{loginCondoName}</h4>
                              <p className="text-[6px] text-zinc-500 font-mono tracking-tight uppercase font-semibold">{loginSlogan}</p>
                            </div>
                            <div className="space-y-1.5 text-left text-[7px]">
                              <div className="h-3 bg-zinc-950 rounded border border-zinc-850" />
                              <div className="h-3 bg-zinc-950 rounded border border-zinc-850" />
                              <button type="button" className="w-full py-1 rounded-md text-[7px] font-bold flex items-center justify-center gap-1" style={{ backgroundColor: loginButtonColor, color: loginButtonTextColor }}>Desbloquear Console</button>
                            </div>
                          </div>
                          <span className="text-[5px] opacity-40 font-mono tracking-tight">{loginFooterText}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Customization Form Controls */}
                <form onSubmit={handleSaveLoginConfig} className="lg:col-span-7 space-y-5 text-left">
                  
                  {/* Seção 1: Selecionar Modelo */}
                  <div className="space-y-2.5 col-span-1">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-blue-400 font-mono block">1. Modelo do Layout</span>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 1, name: 'Modelo 1', desc: 'Centralizado Telacheia' },
                        { id: 2, name: 'Modelo 2', desc: 'Banner Esquerdo' },
                        { id: 3, name: 'Modelo 3', desc: 'Banner Direito' },
                        { id: 4, name: 'Modelo 4', desc: 'Cartão Tradicional (Padrão)' },
                        { id: 5, name: 'Modelo 5', desc: 'Minimalista Clássico' },
                        { id: 6, name: 'Modelo 6', desc: 'Corporativo Premium' },
                      ].map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setLoginModel(m.id)}
                          className={`p-2.5 text-left border rounded-xl flex flex-col justify-between transition-all cursor-pointer ${
                            loginModel === m.id
                              ? 'bg-blue-600/10 border-blue-500 text-blue-400'
                              : 'bg-zinc-900 border-zinc-850 hover:border-zinc-800 text-zinc-400'
                          }`}
                        >
                          <span className="text-xs font-bold text-white block">{m.name}</span>
                          <span className="text-[9px] text-zinc-500 block mt-1 font-mono leading-none">{m.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Seção 2: Brand & Custom Texts */}
                  <div className="space-y-3 bg-zinc-900/40 p-4 border border-zinc-850 rounded-xl col-span-1">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-blue-400 font-mono block">2. Textos do Painel</span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] text-zinc-450 font-bold block uppercase font-mono">Nome do Condomínio</label>
                        <input
                          type="text"
                          value={loginCondoName}
                          onChange={(e) => setLoginCondoName(e.target.value)}
                          className="w-full mt-1 px-3 py-1.5 bg-zinc-900 border border-zinc-850 rounded-xl text-xs text-white placeholder-zinc-700 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-zinc-450 block font-bold uppercase font-mono">Slogan / Subtítulo</label>
                        <input
                          type="text"
                          value={loginSlogan}
                          onChange={(e) => setLoginSlogan(e.target.value)}
                          className="w-full mt-1 px-3 py-1.5 bg-zinc-900 border border-zinc-850 rounded-xl text-xs text-white placeholder-zinc-700 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1.5">
                      <div>
                        <label className="text-[9px] text-zinc-450 block font-bold uppercase font-mono">Mensagem de Boas-vindas</label>
                        <input
                          type="text"
                          value={loginWelcomeMessage}
                          onChange={(e) => setLoginWelcomeMessage(e.target.value)}
                          className="w-full mt-1 px-3 py-1.5 bg-zinc-900 border border-zinc-850 rounded-xl text-xs text-white placeholder-zinc-700 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-zinc-450 block font-bold uppercase font-mono">Rodapé de Segurança</label>
                        <input
                          type="text"
                          value={loginFooterText}
                          onChange={(e) => setLoginFooterText(e.target.value)}
                          className="w-full mt-1 px-3 py-1.5 bg-zinc-900 border border-zinc-855 rounded-xl text-xs text-white placeholder-zinc-700 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Seção 3: Colors */}
                  <div className="space-y-3 bg-zinc-900/40 p-4 border border-zinc-850 rounded-xl col-span-1">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-blue-400 font-mono block">3. Paleta de Cores</span>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] text-zinc-450 block font-bold uppercase font-mono">Cor Primária (Destaques)</label>
                        <div className="flex gap-1.5 mt-1">
                          <input
                            type="color"
                            value={loginPrimaryColor}
                            onChange={(e) => setLoginPrimaryColor(e.target.value)}
                            className="w-8 h-8 rounded border border-zinc-700 bg-transparent shrink-0 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={loginPrimaryColor}
                            onChange={(e) => setLoginPrimaryColor(e.target.value)}
                            className="w-full px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-[10px] font-mono text-zinc-300"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] text-zinc-450 block font-bold uppercase font-mono">Cor de Fundo / Tela</label>
                        <div className="flex gap-1.5 mt-1">
                          <input
                            type="color"
                            value={loginSecondaryColor}
                            onChange={(e) => setLoginSecondaryColor(e.target.value)}
                            className="w-8 h-8 rounded border border-zinc-700 bg-transparent shrink-0 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={loginSecondaryColor}
                            onChange={(e) => setLoginSecondaryColor(e.target.value)}
                            className="w-full px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-[10px] font-mono text-zinc-300"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] text-zinc-450 block font-bold uppercase font-mono">Cor do Botão</label>
                        <div className="flex gap-1.5 mt-1">
                          <input
                            type="color"
                            value={loginButtonColor}
                            onChange={(e) => setLoginButtonColor(e.target.value)}
                            className="w-8 h-8 rounded border border-zinc-700 bg-transparent shrink-0 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={loginButtonColor}
                            onChange={(e) => setLoginButtonColor(e.target.value)}
                            className="w-full px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-[10px] font-mono text-zinc-300"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] text-zinc-450 block font-bold uppercase font-mono">Cor Texto Botão</label>
                        <div className="flex gap-1.5 mt-1">
                          <input
                            type="color"
                            value={loginButtonTextColor}
                            onChange={(e) => setLoginButtonTextColor(e.target.value)}
                            className="w-8 h-8 rounded border border-zinc-700 bg-transparent shrink-0 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={loginButtonTextColor}
                            onChange={(e) => setLoginButtonTextColor(e.target.value)}
                            className="w-full px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-[10px] font-mono text-zinc-300"
                          />
                        </div>
                      </div>

                      <div className="col-span-2">
                        <label className="text-[9px] text-zinc-450 block font-bold uppercase font-mono">Cor do Texto Geral</label>
                        <div className="flex gap-1.5 mt-1">
                          <input
                            type="color"
                            value={loginTextColor}
                            onChange={(e) => setLoginTextColor(e.target.value)}
                            className="w-8 h-8 rounded border border-zinc-700 bg-transparent shrink-0 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={loginTextColor}
                            onChange={(e) => setLoginTextColor(e.target.value)}
                            className="w-full px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-[10px] font-mono text-zinc-300"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Seção 4: Logo Upload */}
                  <div className="space-y-3 bg-zinc-900/40 p-4 border border-zinc-850 rounded-xl col-span-1">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-blue-400 font-mono block">4. Configuração da Logo</span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] text-zinc-450 block font-bold uppercase font-mono">Upload de Logo (.png, .jpg)</label>
                        <div className="flex items-center gap-1.5 mt-1">
                          <label className="px-3 py-1.5 bg-zinc-800 border border-zinc-750 rounded-xl text-[10px] font-mono text-zinc-200 hover:text-white cursor-pointer hover:bg-zinc-700 transition-colors">
                            <Upload className="w-3.5 h-3.5 inline mr-1" /> Escolher Logo
                            <input type="file" accept="image/*" onChange={handleLoginLogoUpload} className="hidden" />
                          </label>
                          {loginLogoUrl && (
                            <button
                              type="button"
                              onClick={() => setLoginLogoUrl('')}
                              className="px-2 py-1.5 bg-rose-600/10 border border-rose-500/20 text-rose-450 rounded-xl text-[10px] font-mono hover:bg-rose-550/10 cursor-pointer transition-colors"
                            >
                              Remover
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] text-zinc-450 block font-bold uppercase font-mono">URL Direta de Logo Alternativa</label>
                        <input
                          type="text"
                          value={loginLogoUrl.startsWith('data:') ? '' : loginLogoUrl}
                          onChange={(e) => setLoginLogoUrl(e.target.value)}
                          placeholder="Cole o link da logo..."
                          className="w-full mt-1 px-3 py-1.5 bg-zinc-900 border border-zinc-850 rounded-xl text-xs text-white placeholder-zinc-700 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                      <div>
                        <label className="text-[9px] text-zinc-450 block font-bold uppercase font-mono">Alinhamento ({loginLogoAlignment})</label>
                        <div className="flex bg-zinc-900 p-0.5 border border-zinc-805 rounded-lg mt-1 font-mono gap-0.5">
                          {(['left', 'center', 'right'] as const).map(align => (
                            <button
                              key={align}
                              type="button"
                              onClick={() => setLoginLogoAlignment(align)}
                              className={`flex-1 text-[9px] py-1 capitalize rounded transition-all cursor-pointer ${
                                loginLogoAlignment === align ? 'bg-blue-600 text-white font-bold' : 'text-zinc-500 hover:text-zinc-350'
                              }`}
                            >
                              {align}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] text-zinc-450 block font-bold uppercase font-mono">Escala da Logo ({loginLogoSize}%)</label>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="range"
                            min="50"
                            max="180"
                            value={loginLogoSize}
                            onChange={(e) => setLoginLogoSize(Number(e.target.value))}
                            className="flex-1 accent-blue-500 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                          />
                          <span className="text-[9px] font-mono text-zinc-300 w-8 shrink-0">{loginLogoSize}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Seção 5: Background */}
                  <div className="space-y-3 bg-zinc-900/40 p-4 border border-zinc-850 rounded-xl col-span-1">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-blue-400 font-mono block">5. Fundo da Tela (Wallpaper)</span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] text-zinc-450 block font-bold uppercase font-mono">Upload de Fundo (.jpg, .png)</label>
                        <div className="flex items-center gap-1.5 mt-1">
                          <label className="px-3 py-1.5 bg-zinc-800 border border-zinc-750 rounded-xl text-[10px] font-mono text-zinc-200 hover:text-white cursor-pointer hover:bg-zinc-700 transition-colors">
                            <Upload className="w-3.5 h-3.5 inline mr-1" /> Escolher Fundo
                            <input type="file" accept="image/*" onChange={handleBgUpload} className="hidden" />
                          </label>
                          {loginBackgroundUrl && (
                            <button
                              type="button"
                              onClick={() => setLoginBackgroundUrl('')}
                              className="px-2 py-1.5 bg-rose-600/10 border border-rose-500/20 text-rose-450 rounded-xl text-[10px] font-mono hover:bg-rose-550/10 cursor-pointer transition-colors"
                            >
                              Remover
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] text-zinc-450 block font-bold uppercase font-mono">URL Direta de Fundo</label>
                        <input
                          type="text"
                          value={loginBackgroundUrl.startsWith('data:') ? '' : loginBackgroundUrl}
                          onChange={(e) => setLoginBackgroundUrl(e.target.value)}
                          placeholder="Cole o link da imagem..."
                          className="w-full mt-1 px-3 py-1.5 bg-zinc-900 border border-zinc-850 rounded-xl text-xs text-white placeholder-zinc-700 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                      <div>
                        <label className="text-[9px] text-zinc-450 block font-bold uppercase font-mono">Opacidade Fundo ({loginBackgroundOpacity}%)</label>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="range"
                            min="10"
                            max="100"
                            value={loginBackgroundOpacity}
                            onChange={(e) => setLoginBackgroundOpacity(Number(e.target.value))}
                            className="flex-1 accent-blue-500 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                          />
                          <span className="text-[9px] font-mono text-zinc-300 w-8 shrink-0">{loginBackgroundOpacity}%</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] text-zinc-450 block font-bold uppercase font-mono">Intensidade Blur ({loginBackgroundBlur}px)</label>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="range"
                            min="0"
                            max="20"
                            value={loginBackgroundBlur}
                            onChange={(e) => setLoginBackgroundBlur(Number(e.target.value))}
                            className="flex-1 accent-blue-500 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                          />
                          <span className="text-[9px] font-mono text-zinc-300 w-8 shrink-0">{loginBackgroundBlur}px</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Seção 6: Quick Configs */}
                  <div className="space-y-3 bg-zinc-900/40 p-4 border border-zinc-850 rounded-xl col-span-1">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-blue-400 font-mono block">6. Temas Rápidos</span>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleRestoreDefaultLogin}
                        className="py-2 px-2.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-200 hover:text-white rounded-xl text-[10px] font-bold font-mono transition-all cursor-pointer"
                      >
                        Restaurar Padrão
                      </button>
                      <button
                        type="button"
                        onClick={handleDuplicateThemeColors}
                        className="py-2 px-2.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-200 hover:text-white rounded-xl text-[10px] font-bold font-mono transition-all cursor-pointer"
                      >
                        Sincronizar Cores
                      </button>
                      <button
                        type="button"
                        onClick={handleExportLoginTheme}
                        className="py-2 px-2.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-200 hover:text-white rounded-xl text-[10px] font-bold font-mono transition-all cursor-pointer"
                      >
                        Exportar Tema
                      </button>
                      <label className="py-2 px-2.5 bg-zinc-855 hover:bg-zinc-800 text-zinc-200 hover:text-white rounded-xl text-[10px] font-bold font-mono transition-all cursor-pointer text-center">
                        Importar Tema
                        <input type="file" accept=".json" onChange={handleImportLoginTheme} className="hidden" />
                      </label>
                    </div>
                  </div>

                  {/* Botão Salvar Central */}
                  <button
                    type="submit"
                    disabled={loginIsSaving}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md mt-4 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4 text-white" />
                    {loginIsSaving ? 'Salvando Configurações...' : 'Salvar Alterações'}
                  </button>
                </form>

              </div>
            </div>
          )}

          {activeTab === 'env' && (
            <div className="mb-4 space-y-3 text-left">
              <span className="text-[10px] uppercase font-black tracking-widest text-zinc-550 font-mono block">Painel de Diagnóstico de Integração de Serviços</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Supabase Configured Card */}
                <div className="bg-zinc-950/60 p-3 text-left rounded-xl border border-zinc-800 flex flex-col gap-1">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Supabase Configurado</span>
                  {diagnostics ? (
                    <span className={`text-xs font-bold tracking-wider ${diagnostics.supabaseConfigured ? 'text-emerald-400' : 'text-rose-500 font-extrabold'}`}>
                      {diagnostics.supabaseConfigured ? '● SIM' : '✕ NÃO'}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-zinc-550 animate-pulse">Carregando...</span>
                  )}
                </div>

                {/* Gemini Configured Card */}
                <div className="bg-zinc-950/60 p-3 text-left rounded-xl border border-zinc-800 flex flex-col gap-1">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Gemini Configurado</span>
                  {diagnostics ? (
                    <span className={`text-xs font-bold tracking-wider ${diagnostics.geminiConfigured ? 'text-emerald-400' : 'text-rose-500 font-extrabold'}`}>
                      {diagnostics.geminiConfigured ? '● SIM' : '✕ NÃO'}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-zinc-550 animate-pulse">Carregando...</span>
                  )}
                </div>

                {/* Banco Conectado Card */}
                <div className="bg-zinc-950/60 p-3 text-left rounded-xl border border-zinc-800 flex flex-col gap-1">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Banco Conectado</span>
                  {diagnostics ? (
                    <span className={`text-xs font-bold tracking-wider ${diagnostics.bancoConectado ? 'text-emerald-400' : 'text-rose-500 font-extrabold'}`}>
                      {diagnostics.bancoConectado ? '● SIM' : '✕ NÃO'}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-zinc-550 animate-pulse">Carregando...</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'env' && (
            <div className="space-y-4 text-left">
              <div className="p-3.5 bg-zinc-950/40 border border-zinc-850 rounded-xl space-y-2">
                <span className="text-[10px] uppercase font-extrabold tracking-widest text-emerald-400 font-mono block">Instruções de Configuração Permanente</span>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Para máxima segurança, integridade e aderência às diretrizes do Google AI Studio, a persistência de chaves de API e banco de dados é feita exclusivamente por meio do menu de <strong>Secrets</strong> de ambiente.
                </p>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Gravações inseguras no <code>localStorage</code> do navegador ou no arquivo físico <code>.env</code> do servidor foram totalmente removidas e desativadas.
                </p>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Para configurar ou atualizar, acesse a barra lateral esquerda em <strong>Settings &gt; Environment Variables / Secrets</strong> no painel do Google AI Studio.
                </p>
              </div>

              {/* Copyable labels for Secrets */}
              <div className="space-y-3 pt-2">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black font-mono block">Nomes das variáveis que você deve configurar (Clonar Nome)</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="bg-zinc-950 p-2.5 text-[11px] rounded-lg border border-zinc-850/80 flex items-center justify-between font-mono">
                    <span className="text-emerald-400">VITE_SUPABASE_URL</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText("VITE_SUPABASE_URL");
                        setCopiedKey("url");
                        setTimeout(() => setCopiedKey(null), 2000);
                      }}
                      className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
                      title="Copiar nome da variável"
                    >
                      {copiedKey === "url" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="bg-zinc-950 p-2.5 text-[11px] rounded-lg border border-zinc-850/80 flex items-center justify-between font-mono">
                    <span className="text-emerald-400">VITE_SUPABASE_ANON_KEY</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText("VITE_SUPABASE_ANON_KEY");
                        setCopiedKey("anon");
                        setTimeout(() => setCopiedKey(null), 2000);
                      }}
                      className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
                      title="Copiar nome da variável"
                    >
                      {copiedKey === "anon" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="bg-zinc-950 p-2.5 text-[11px] rounded-lg border border-zinc-850/80 flex items-center justify-between font-mono">
                    <span className="text-amber-405 font-bold">SUPABASE_SERVICE_ROLE_KEY</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText("SUPABASE_SERVICE_ROLE_KEY");
                        setCopiedKey("service");
                        setTimeout(() => setCopiedKey(null), 2000);
                      }}
                      className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
                      title="Copiar nome da variável"
                    >
                      {copiedKey === "service" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="bg-zinc-950 p-2.5 text-[11px] rounded-lg border border-zinc-850/80 flex items-center justify-between font-mono">
                    <span className="text-teal-400 font-bold">GEMINI_API_KEY</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText("GEMINI_API_KEY");
                        setCopiedKey("gemini");
                        setTimeout(() => setCopiedKey(null), 2000);
                      }}
                      className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
                      title="Copiar nome da variável"
                    >
                      {copiedKey === "gemini" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Synchronization Log Shell */}
              <div className="pt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black font-mono block">Logs da Console de Sincronização e Resiliência</span>
                  <span className="text-[9px] bg-blue-900/40 text-blue-300 font-mono px-2 py-0.5 rounded border border-blue-800/40 animate-pulse">Ativo</span>
                </div>
                <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-3 h-48 overflow-y-auto font-mono text-[10px] space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-800">
                  {syncLogs && syncLogs.length > 0 ? (
                    syncLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-1.5 leading-normal border-b border-zinc-900/40 pb-1">
                        <span className="text-zinc-500 shrink-0 select-none">[{log.timestamp}]</span>
                        <span className={`font-bold shrink-0 ${
                          log.type === 'success' ? 'text-emerald-400' :
                          log.type === 'error' ? 'text-red-400' : 'text-amber-400'
                        }`}>
                          [{log.type.toUpperCase()}]
                        </span>
                        <span className="text-zinc-300 break-words">{log.msg}</span>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-550 italic space-y-2">
                      <div className="w-5 h-5 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
                      <span>Conectando e monitorando canais de dados (Supabase)...</span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {activeTab === 'db_diagnostics' && (
            <div className="space-y-4 text-left max-h-[60vh] overflow-y-auto pr-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500 font-mono block">Painel Administrativo: Diagnóstico de Banco de Dados</span>
                <button
                  type="button"
                  onClick={runDbDiagnose}
                  disabled={isDiagnosing}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-60 text-white border border-blue-500/35 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer font-mono"
                >
                  <RefreshCw className={`w-3 h-3 ${isDiagnosing ? 'animate-spin' : ''}`} />
                  {isDiagnosing ? 'Diagnosticando...' : 'Diagnosticar'}
                </button>
              </div>

              {/* Badges card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Supabase Status Card */}
                <div className="bg-zinc-900/50 p-3 text-left rounded-xl border border-zinc-800 flex flex-col gap-1">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Status Supabase</span>
                  {dbDiagnoseData ? (
                    <span className={`text-[11px] font-bold tracking-wider flex items-center gap-1.5 ${dbDiagnoseData.supabaseStatus === 'connected' ? 'text-emerald-400' : 'text-rose-500 font-extrabold animate-pulse'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full inline-block ${dbDiagnoseData.supabaseStatus === 'connected' ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                      {dbDiagnoseData.supabaseStatus === 'connected' ? 'ONLINE' : 'INDISPONÍVEL'}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-zinc-550 animate-pulse">Pendente...</span>
                  )}
                </div>

                {/* Proxy Status Card */}
                <div className="bg-zinc-900/50 p-3 text-left rounded-xl border border-zinc-800 flex flex-col gap-1">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Status do Proxy</span>
                  {dbDiagnoseData ? (
                    <span className="text-[11px] font-bold tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                      ATIVO (OK)
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-zinc-550 animate-pulse">Pendente...</span>
                  )}
                </div>

                {/* Session Status Card */}
                <div className="bg-zinc-900/50 p-3 text-left rounded-xl border border-zinc-800 flex flex-col gap-1">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Sessão e Privilégios</span>
                  {dbDiagnoseData ? (
                    <span className="text-[10px] font-extrabold tracking-tight text-blue-400 uppercase font-mono">
                      ADMIN / SERVICE ROLE
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-zinc-555 animate-pulse">Pendente...</span>
                  )}
                </div>
              </div>

              {/* Found & Missing tables lists */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Found Tables */}
                <div className="bg-zinc-950/40 p-3.5 border border-zinc-850 rounded-xl space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 font-mono block">Tabelas Encontradas ({dbDiagnoseData ? dbDiagnoseData.tablesFound.length : 0})</span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-[10px]">
                    {dbDiagnoseData ? (
                      dbDiagnoseData.tablesFound.map(tbl => (
                        <div key={tbl} className="flex items-center gap-1.5 text-zinc-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{tbl}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-zinc-500 italic block">Inicie o diagnóstico para obter o mapeamento.</span>
                    )}
                  </div>
                </div>

                {/* Missing Tables */}
                <div className="bg-zinc-950/40 p-3.5 border border-zinc-850 rounded-xl space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-rose-450 font-mono block">Tabelas Ausentes ({dbDiagnoseData ? dbDiagnoseData.tablesMissing.length : 0})</span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-[10px]">
                    {dbDiagnoseData ? (
                      dbDiagnoseData.tablesMissing.length > 0 ? (
                        dbDiagnoseData.tablesMissing.map(tbl => (
                          <div key={tbl} className="flex items-center gap-1.5 text-rose-350">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span>{tbl}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-[11px] text-zinc-400 leading-normal flex items-start gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>Pristino! Todas as tabelas constam ativas no Supabase.</span>
                        </div>
                      )
                    ) : (
                      <span className="text-xs text-zinc-500 italic block">Inicie o diagnóstico para obter o mapeamento.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* SQL Schema helper box when tables are missing */}
              {dbDiagnoseData && dbDiagnoseData.tablesMissing.length > 0 && (
                <div id="missing-tables-helper" className="p-4 bg-blue-950/20 border border-blue-900/50 rounded-xl space-y-3">
                  <div className="flex items-start gap-2.5 text-left">
                    <Database className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-blue-300">Tabelas ausentes detectadas no Supabase</h4>
                      <p className="text-[11px] text-zinc-400 leading-normal mt-0.5">
                        Seu projeto Supabase é novo ou não possui as tabelas criadas. Para resolver, você deve inicializar o banco rodando o script SQL de criação de tabelas.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2 pt-1 text-left">
                    <button
                      type="button"
                      id="btn-copy-schema-sql"
                      onClick={handleCopySql}
                      disabled={!schemaSql}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer font-mono shrink-0"
                    >
                      {sqlCopied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                      {sqlCopied ? 'Script SQL Copiado!' : 'Copiar Script SQL Completo'}
                    </button>
                    <a
                      href="https://supabase.com"
                      target="_blank"
                      id="link-supabase-console"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg text-[11px] font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
                    >
                      Abrir Console Supabase ↗
                    </a>
                  </div>

                  <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-905/60 text-[10px] text-zinc-400 space-y-1 font-mono text-left">
                    <div className="flex gap-1.5 rank-item">
                      <span className="text-blue-400 font-bold">1.</span>
                      <span>Copie o script clicando no botão azul acima.</span>
                    </div>
                    <div className="flex gap-1.5 rank-item">
                      <span className="text-blue-400 font-bold">2.</span>
                      <span>Cole no <strong>SQL Editor</strong> do seu painel Supabase.</span>
                    </div>
                    <div className="flex gap-1.5 rank-item">
                      <span className="text-blue-400 font-bold">3.</span>
                      <span>Clique em <strong>Run</strong> (Executar) para criar todas as tabelas e políticas de RLS.</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Last Error details if any */}
              <div className="p-3.5 bg-zinc-950 border border-zinc-850 rounded-xl space-y-2">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black font-mono block">Último Relato de Instabilidade no Banco</span>
                {dbDiagnoseData ? (
                  dbDiagnoseData.lastError ? (
                    <div className="p-3 bg-red-950/40 border border-red-900/60 rounded-lg text-rose-250 font-mono text-[10px] leading-relaxed break-all">
                      {dbDiagnoseData.lastError}
                    </div>
                  ) : (
                    <div className="text-[11px] text-emerald-400 font-medium font-mono">
                      ✓ Nenhuma anomalia, conflito ou RLS erro detectado nas últimas requirições.
                    </div>
                  )
                ) : (
                  <span className="text-xs text-zinc-500 italic block font-mono">[Nenhum diagnóstico executado]</span>
                )}
              </div>
            </div>
          )}

          {/* Quick lock console card */}
          <div className="mt-6 pt-5 border-t border-zinc-800 text-center">
            <p className="text-[10px] text-zinc-500 mb-3 block">
              Precisa se afastar do terminal? Bloqueie o console imediatamente para evitar acessos sem autorização.
            </p>
            <button
              onClick={() => {
                onLockPanel();
                onClose();
              }}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-red-400 hover:text-red-300 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" /> Bloquear Console Agora
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
