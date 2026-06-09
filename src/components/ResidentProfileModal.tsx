import React, { useState, useEffect } from 'react';
import { X, Camera, Upload, Eye, EyeOff, Save, KeyRound, Image as ImageIcon } from 'lucide-react';
import { Resident } from '../types';

interface ResidentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  resident: Resident | null;
  onSave: (updatedResident: Resident) => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80',
];

export default function ResidentProfileModal({
  isOpen,
  onClose,
  resident,
  onSave
}: ResidentProfileModalProps) {
  const [avatarUrl, setAvatarUrl] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (resident && isOpen) {
      setAvatarUrl(resident.avatarUrl || '');
      setPassword(resident.password || '');
      setCustomUrl(resident.avatarUrl && !PRESET_AVATARS.includes(resident.avatarUrl) && !resident.avatarUrl.startsWith('data:image/') ? resident.avatarUrl : '');
      setShowPassword(false);
    }
  }, [resident, isOpen]);

  if (!isOpen || !resident) return null;

  const processFile = (file: File) => {
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
      setAvatarUrl(base64String);
      setCustomUrl('');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple checks
    if (!password.trim()) {
      alert('A senha não pode estar em branco.');
      return;
    }

    const finalAvatar = customUrl.trim() ? customUrl.trim() : avatarUrl;

    const updated: Resident = {
      ...resident,
      password: password.trim(),
      avatarUrl: finalAvatar || undefined
    };

    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-55 overflow-y-auto" role="dialog" id="resident-profile-modal-overlay">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity" onClick={onClose}></div>

      {/* Box container */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div 
          className="relative w-full max-w-md rounded-3xl bg-[#0d1117] border border-[#262c38] text-[#e2e8f0] p-6 shadow-2xl transition-all"
          id="resident-profile-modal-content"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#262c38] pb-4 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
                <KeyRound className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-zinc-100 leading-none">
                  Editar Seu Perfil
                </h3>
                <p className="text-[10px] text-zinc-400 mt-1">
                  Discorra novas configurações pessoais de acesso de morador.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1 px-2 hover:bg-[#262c38] hover:text-white rounded-lg transition-all text-zinc-400 cursor-pointer"
              id="btn-close-profile-modal"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-5">
            {/* Foto de Perfil Display Area */}
            <div className="space-y-3">
              <label className="text-[10px] uppercase font-bold text-zinc-400 leading-none block">
                Foto de Perfil ({resident.name})
              </label>

              <div className="flex items-center gap-4">
                {/* Img Preview */}
                <div className="relative w-16 h-16 rounded-full bg-slate-900 border border-slate-700 overflow-hidden flex items-center justify-center font-mono text-xs font-black shrink-0">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt="Preview do Perfil" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    resident.name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'MR'
                  )}
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarUrl('');
                        setCustomUrl('');
                      }}
                      className="absolute inset-0 bg-red-900/85 hover:bg-red-800 text-white font-black text-[9px] uppercase tracking-wider flex items-center justify-center opacity-0 hover:opacity-100 transition-all cursor-pointer"
                      title="Remover foto"
                    >
                      Remover
                    </button>
                  )}
                </div>

                <div className="space-y-1 min-w-0 flex-1">
                  <span className="text-[11px] text-zinc-400 block font-light leading-snug">
                    Selecione um dos avatares rápidos ou faça upload de sua própria foto.
                  </span>
                  
                  {/* Presets */}
                  <div className="flex items-center gap-1.5 pt-1">
                    {PRESET_AVATARS.map((pUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setAvatarUrl(pUrl);
                          setCustomUrl('');
                        }}
                        className={`w-7 h-7 rounded-full overflow-hidden border-2 transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                          avatarUrl === pUrl ? 'border-indigo-500 scale-105 ring-2 ring-indigo-500/20' : 'border-zinc-700'
                        }`}
                      >
                        <img src={pUrl} alt="Preset Avatar" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div 
                className={`border border-dashed rounded-xl p-3 text-center transition-all cursor-pointer relative ${
                  dragActive ? 'border-indigo-400 bg-indigo-500/5' : 'border-zinc-700 hover:border-zinc-500 bg-[#121620]/30'
                }`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById('profile-file-picker')?.click()}
              >
                <input
                  id="profile-file-picker"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center gap-1">
                  <div className="p-1 bg-zinc-800/80 rounded-lg text-zinc-400">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-zinc-300">
                    Clique ou Arraste uma foto aqui
                  </span>
                  <span className="text-[9px] text-zinc-500">
                    Formatos JPG/PNG de no máximo 2MB
                  </span>
                </div>
              </div>

              {/* URL Input */}
              <div className="space-y-1 pt-1">
                <span className="text-[10px] text-zinc-500 block">Ou insira uma URL de imagem externa:</span>
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <ImageIcon className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-500" />
                    <input
                      type="url"
                      value={customUrl}
                      onChange={(e) => {
                        setCustomUrl(e.target.value);
                        if (e.target.value.trim()) {
                          setAvatarUrl(e.target.value.trim());
                        }
                      }}
                      placeholder="https://exemplo.com/sua-foto.jpg"
                      className="w-full text-[10px] pl-8 bg-zinc-950/50 border border-zinc-800 p-2.5 rounded-xl text-zinc-200 placeholder-zinc-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Password edit fields */}
            <div className="space-y-1.5 border-t border-[#262c38] pt-4">
              <label className="text-[10px] uppercase font-bold text-zinc-400 leading-none block">
                Senha de Acesso do Morador
              </label>
              
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Defina uma senha segura"
                  className="w-full text-xs bg-zinc-950/50 border border-zinc-800 p-3 rounded-xl text-zinc-200 placeholder-zinc-600 focus:outline-none pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-zinc-500 hover:text-zinc-300 transition-all cursor-pointer"
                  title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <span className="text-[9px] text-zinc-500 block leading-snug">
                Esta senha é utilizada para fazer login no painel do morador. Guarde-a com cuidado.
              </span>
            </div>

            {/* Submit button bar */}
            <div className="flex items-center gap-2 pt-2 border-t border-[#262c38]">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 active:scale-95 text-zinc-300 text-xs font-black uppercase tracking-wider py-3.5 rounded-xl text-center cursor-pointer transition-all leading-none"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-black uppercase tracking-wider py-3.5 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-500/25 leading-none hover:opacity-95"
              >
                <Save className="w-3.5 h-3.5" /> Salvar Perfil
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
