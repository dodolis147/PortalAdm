import React, { useState, useEffect } from 'react';
import { 
  X, Camera, Upload, Image as ImageIcon, Car, CheckCircle2, AlertOctagon, UserX, UserCheck, ShieldAlert,
  Trash2, Plus, Edit2
} from 'lucide-react';
import { Resident, Vehicle } from '../types';
import MercosulPlate from './MercosulPlate';

interface EditResidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  resident: Resident | null;
  onSave: (updatedResident: Resident) => void;
  towerNames?: string[];
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80',
];

export default function EditResidentModal({
  isOpen,
  onClose,
  resident,
  onSave,
  towerNames = ['Torre 1', 'Torre 2', 'Torre 3']
}: EditResidentModalProps) {
  const [name, setName] = useState('');
  const [towerInput, setTowerInput] = useState(towerNames[0] || 'Torre 1');
  const [aptInput, setAptInput] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'Ativo' | 'Inativo' | 'Bloqueado'>('Ativo');
  const [coResidentsStr, setCoResidentsStr] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'MASTER' | 'Morador' | 'Administrador' | 'Porteiro'>('Morador');
  
  // Vehicles editing list and current inputs
  const [vehiclesList, setVehiclesList] = useState<Vehicle[]>([]);
  const [editingVehicleIndex, setEditingVehicleIndex] = useState<number | null>(null);
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehicleGarageSpot, setVehicleGarageSpot] = useState('');

  useEffect(() => {
    if (resident) {
      setName(resident.name || '');
      setPhone(resident.phone && resident.phone !== 'Não cadastrado' ? resident.phone : '');
      setEmail(resident.email && resident.email !== 'Não cadastrado' ? resident.email : '');
      setStatus(resident.status || 'Ativo');
      setAvatarUrl(resident.avatarUrl || '');
      setCoResidentsStr(resident.members ? resident.members.join(', ') : '');
      setPassword(resident.password || Math.floor(1000 + Math.random() * 9000).toString());
      setRole(resident.role || 'Morador');

      // Parse unit details
      const unitValue = resident.unit || '';
      const parts = unitValue.split(' - Apt ');
      if (parts.length === 2) {
        setTowerInput(parts[0]);
        setAptInput(parts[1]);
      } else {
        setAptInput(unitValue);
      }

      // Pre-fill vehicles list & reset inputs
      setVehiclesList(resident.vehicles || []);
      setVehicleModel('');
      setVehiclePlate('');
      setVehicleColor('');
      setVehicleGarageSpot('');
    }
  }, [resident, isOpen]);

  if (!isOpen || !resident) return null;

  const handleFileChangeLocal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (JPG, PNG).');
      return;
    }

    // Limit to 1MB to be safer against bloat
    if (file.size > 1 * 1024 * 1024) {
      alert('A imagem é muito grande. Escolha uma foto de até 1MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      setAvatarUrl(base64String);
    };
    reader.onerror = () => {
      alert('Erro ao carregar a imagem. Tente novamente.');
      console.error('FileReader error');
    };
    try {
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error reading file', err);
      alert('Falha ao processar arquivo.');
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !aptInput.trim()) {
      alert('Favor preencher o Nome e o Apartamento correspondente.');
      return;
    }

    const fullUnit = `${towerInput} - Apt ${aptInput}`;
    const members = coResidentsStr
      .split(',')
      .map(m => m.trim())
      .filter(m => m !== '');

    const finalVehicles = [...vehiclesList];
    if (vehicleModel.trim() && vehiclePlate.trim()) {
      finalVehicles.push({
        brandModel: vehicleModel.trim(),
        plate: vehiclePlate.trim().toUpperCase(),
        color: vehicleColor.trim(),
        garageSpot: vehicleGarageSpot.trim()
      });
    }

    const updated: Resident = {
      ...resident,
      name: name.trim(),
      unit: fullUnit,
      phone: phone.trim() || 'Não cadastrado',
      email: email.trim() || undefined,
      status,
      vehicles: finalVehicles,
      members,
      avatarUrl: avatarUrl || undefined,
      password: password.trim() || Math.floor(1000 + Math.random() * 9000).toString(),
      role: role
    };

    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-55 overflow-y-auto" role="dialog" id="edit-resident-modal-overlay">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity" onClick={onClose}></div>

      {/* Box container */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div 
          className="relative bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-gray-150"
          id="edit-resident-modal-box"
        >
          {/* Header */}
          <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-sky-450" />
              <div>
                <h3 className="font-bold text-sm tracking-tight">Editar Cadastro de Morador</h3>
                <p className="text-[10px] text-zinc-400">Administração de dados cadastrais e limite de acessos</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleFormSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            
            {/* Direct Block / Lock Action Header */}
            <div className="bg-gray-50/75 p-4 rounded-xl border border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Status do Morador</span>
                <p className="text-xs text-slate-600 mt-0.5">Defina se o morador está ativo ou se o acesso dele deve ser impedido.</p>
              </div>
              
              <div className="flex items-center gap-2 select-none shrink-0">
                <button
                  type="button"
                  onClick={() => setStatus('Ativo')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    status === 'Ativo' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-250 shadow-xs' 
                      : 'bg-white text-gray-400 border border-gray-150 hover:bg-gray-50'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" /> Ativo
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('Inativo')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    status === 'Inativo' 
                      ? 'bg-amber-50 text-amber-700 border border-amber-250' 
                      : 'bg-white text-gray-400 border border-gray-150 hover:bg-gray-50'
                  }`}
                >
                  ⚡ Inativo
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('Bloqueado')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    status === 'Bloqueado' 
                      ? 'bg-red-50 text-red-700 border border-red-250 shadow-xs ring-1 ring-red-400/20' 
                      : 'bg-white text-gray-400 border border-gray-150 hover:bg-red-500/5 hover:text-red-500'
                  }`}
                >
                  <UserX className="w-3.5 h-3.5" /> Bloqueado 🚫
                </button>
              </div>
            </div>

            {/* Avatar block */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-gray-50/40 p-3 rounded-xl border border-gray-100">
              <div className="relative shrink-0 select-none">
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt="Preview" 
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-full object-cover border-2 border-slate-750"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl('')}
                    className="absolute -top-1 -right-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full w-4.5 h-4.5 flex items-center justify-center text-[9px] font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
              
              <div className="flex-1 space-y-1.5 text-center sm:text-left">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Foto ou Identificação Visual</span>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <label className="bg-slate-900 hover:bg-black text-white text-[11px] px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-all flex items-center gap-1 shrink-0">
                    <Upload className="w-3 h-3" /> Enviar Arquivo
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleFileChangeLocal}
                      className="hidden" 
                    />
                  </label>
                  
                  <div className="flex gap-1.5">
                    {PRESET_AVATARS.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAvatarUrl(url)}
                        className={`w-8 h-8 rounded-full overflow-hidden border transition-all ${
                          avatarUrl === url ? 'border-sky-550 scale-105 shadow-xs' : 'border-zinc-200 opacity-70'
                        }`}
                      >
                        <img src={url} alt={`Preset ${idx}`} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Main personal inputs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-gray-550 uppercase tracking-wider block mb-1">Nome Completo do Titular *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-gray-250 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-550 uppercase tracking-wider block mb-1">Apartamento *</label>
                <input
                  type="text"
                  required
                  value={aptInput}
                  onChange={(e) => setAptInput(e.target.value)}
                  className="w-full bg-white border border-gray-250 rounded-xl px-3 py-2 text-sm focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-550 uppercase tracking-wider block mb-1">Torre / Bloco *</label>
                <select
                  value={towerInput}
                  onChange={(e) => setTowerInput(e.target.value)}
                  className="w-full bg-white border border-gray-250 rounded-xl px-3 py-2 text-sm focus:outline-none"
                >
                  {towerNames.map((towerName) => (
                    <option key={towerName} value={towerName}>
                      {towerName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-550 uppercase tracking-wider block mb-1">Telefone Principal</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-white border border-gray-250 rounded-xl px-3 py-2 text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-550 uppercase tracking-wider block mb-1">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-gray-250 rounded-xl px-3 py-2 text-sm focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-550 uppercase tracking-wider block mb-1">Senha de Acesso</label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Senha para este perfil"
                  className="w-full bg-white border border-gray-250 rounded-xl px-3 py-2 text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-550 uppercase tracking-wider block mb-1">Perfil de Acesso / Nível de Permissão</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'MASTER' | 'Morador' | 'Administrador' | 'Porteiro')}
                  className="w-full bg-white border border-gray-250 rounded-xl px-3 py-2 text-sm focus:outline-none font-bold"
                >
                  <option value="Morador" className="font-normal text-slate-800">Morador (Consultas da unidade, agendamentos e devoluções)</option>
                  <option value="Porteiro" className="font-normal text-slate-800">Porteiro / Porteira (Controle de visitas, encomendas, sem configurações)</option>
                  <option value="Administrador" className="font-normal text-slate-800">Administrador / Síndico (Controle total do sistema)</option>
                  <option value="MASTER" className="font-black text-rose-600 bg-rose-50">👑 MASTER (Permissão Total de Tudo / Acesso Absoluto)</option>
                </select>
              </div>
            </div>

            {/* Dependent co-residents string */}
            <div>
              <label className="text-xs font-semibold text-gray-550 uppercase tracking-wider block mb-1">Membros Dependentes (Co-moradores)</label>
              <input
                type="text"
                value={coResidentsStr}
                onChange={(e) => setCoResidentsStr(e.target.value)}
                placeholder="Ex separando por vírgulas: Mariana Santos (Esposa), Felipe Santos (Filho)"
                className="w-full bg-white border border-gray-250 rounded-xl px-3 py-2 text-sm focus:outline-none"
              />
            </div>

            {/* Vehicle configuration details */}
            <div className="bg-slate-50 p-4 rounded-xl border border-gray-150/75 space-y-4">
              <span className="text-xs font-bold text-gray-700 uppercase block tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-800">
                  <Car className="w-4 h-4 text-slate-500 font-bold animate-pulse" /> Veículos Autorizados ({vehiclesList.length})
                </span>
                <span className="text-[10px] text-zinc-400 font-normal lowercase">Permite múltiplos veículos</span>
              </span>

              {/* List of current vehicles */}
              {vehiclesList.length > 0 ? (
                <div className="space-y-2">
                  {vehiclesList.map((v, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between text-xs bg-white border border-gray-200 p-2.5 rounded-xl hover:border-gray-300 transition-all shadow-2xs"
                    >
                      <div className="flex flex-wrap items-center gap-2 pr-2">
                        <span className="bg-slate-100 p-1.5 rounded-lg text-slate-600">
                          <Car className="w-3.5 h-3.5" />
                        </span>
                        <div>
                          <p className="font-semibold text-gray-800">{v.brandModel} ({v.color})</p>
                          {v.garageSpot && (
                            <p className="text-[10px] text-zinc-400 mt-0.5 font-medium">Vaga: <span className="text-blue-600 font-bold">{v.garageSpot}</span></p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 shrink-0">
                        <MercosulPlate plate={v.plate} />
                        <button
                          type="button"
                          onClick={() => {
                            setVehicleModel(v.brandModel);
                            setVehiclePlate(v.plate);
                            setVehicleColor(v.color || '');
                            setVehicleGarageSpot(v.garageSpot || '');
                            setEditingVehicleIndex(idx);
                          }}
                          className="bg-sky-50 hover:bg-sky-100 border border-sky-100 hover:border-sky-200 text-sky-600 hover:text-sky-800 p-1.5 rounded-lg transition-all cursor-pointer"
                          title="Editar este veículo"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setVehiclesList(vehiclesList.filter((_, i) => i !== idx));
                            if(editingVehicleIndex === idx) {
                              setEditingVehicleIndex(null);
                              setVehicleModel('');
                              setVehiclePlate('');
                              setVehicleColor('');
                              setVehicleGarageSpot('');
                            }
                          }}
                          className="bg-red-50 hover:bg-red-100 border border-red-100 hover:border-red-200 text-red-500 hover:text-red-700 p-1.5 rounded-lg transition-all cursor-pointer"
                          title="Remover este veículo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 bg-white/70 border border-dashed border-gray-200 rounded-xl text-zinc-450 italic text-xs">
                  Nenhum veículo cadastrado para este morador. Adicione um abaixo.
                </div>
              )}

              {/* Add vehicle form block */}
              <div className="border-t border-gray-200/60 pt-3 space-y-3">
                <span className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wide block">
                  + Adicionar Outro Veículo à Lista:
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-gray-550 uppercase block mb-1">Marca / Modelo</label>
                    <input
                      type="text"
                      value={vehicleModel}
                      onChange={(e) => setVehicleModel(e.target.value)}
                      placeholder="Ex: Honda Civic"
                      className="w-full bg-white border border-gray-255 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-550 uppercase block mb-1">Placa Veicular</label>
                    <input
                      type="text"
                      value={vehiclePlate}
                      onChange={(e) => setVehiclePlate(e.target.value)}
                      placeholder="Ex: ABC1D23"
                      className="w-full bg-white border border-gray-255 rounded-lg px-2.5 py-1.5 text-xs uppercase focus:outline-none tracking-wider font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-550 uppercase block mb-1">Cor</label>
                    <input
                      type="text"
                      value={vehicleColor}
                      onChange={(e) => setVehicleColor(e.target.value)}
                      placeholder="Ex: Prata"
                      className="w-full bg-white border border-gray-255 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-550 uppercase block mb-1">Vaga de Garagem</label>
                    <input
                      type="text"
                      value={vehicleGarageSpot}
                      onChange={(e) => setVehicleGarageSpot(e.target.value)}
                      placeholder="Ex: Vaga 12"
                      className="w-full bg-white border border-gray-255 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 overflow-hidden">
                  <div className="min-w-0">
                    {vehiclePlate.trim() && (
                      <div className="flex items-center gap-1.5 animate-fadeIn">
                        <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest">Preview:</span>
                        <MercosulPlate plate={vehiclePlate} />
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!vehicleModel.trim() || !vehiclePlate.trim()) {
                        alert('Por favor, informe no mínimo o Modelo e a Placa do veículo para adicioná-lo.');
                        return;
                      }
                      
                      const newVehicle: Vehicle = {
                        brandModel: vehicleModel.trim(),
                        plate: vehiclePlate.trim().toUpperCase(),
                        color: vehicleColor.trim() || 'Não especificada',
                        garageSpot: vehicleGarageSpot.trim() || undefined
                      };

                      if (editingVehicleIndex !== null) {
                         // Updating existing
                         const updatedList = [...vehiclesList];
                         updatedList[editingVehicleIndex] = newVehicle;
                         setVehiclesList(updatedList);
                         setEditingVehicleIndex(null); // finish edit
                      } else {
                         // Adding new
                         // Check if plate already added
                         if (vehiclesList.some(v => v.plate === newVehicle.plate)) {
                            alert('Um veículo com esta mesma placa já foi adicionado.');
                            return;
                         }
                         setVehiclesList([...vehiclesList, newVehicle]);
                      }

                      setVehicleModel('');
                      setVehiclePlate('');
                      setVehicleColor('');
                      setVehicleGarageSpot('');
                    }}
                    className={`shrink-0 ${editingVehicleIndex !== null ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-900 hover:bg-black'} text-white text-[10px] font-bold uppercase tracking-wider px-3.5 py-2 rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-sm`}
                  >
                    {editingVehicleIndex !== null ? (
                      <> <CheckCircle2 className="w-3 h-3" /> Atualizar veículo </>
                    ) : (
                      <> <Plus className="w-3 h-3" /> Adicionar veículo </>
                    )}
                  </button>
                </div>
              </div>

            </div>

            {/* Alert message if blocked */}
            {status === 'Bloqueado' && (
              <div className="flex gap-2.5 items-start bg-red-50 text-red-800 border border-red-200/60 p-3 rounded-xl">
                <AlertOctagon className="w-5 h-5 shrink-0 text-red-655 mt-0.5 animate-pulse" />
                <div className="text-xs">
                  <span className="font-bold flex items-center gap-1 uppercase block text-red-700">AViso de Bloqueio Ativo</span>
                  <p className="mt-0.5 opacity-90 leading-normal">
                    Este morador não poderá reservar áreas comuns como churrasqueira e piscina, e o sistema irá sinalizar o bloqueio ativamente nos demais módulos de consulta e controle.
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-4 py-2 rounded-xl text-xs transition-all uppercase tracking-wider cursor-pointer"
              >
                Descartar
              </button>
              <button
                type="submit"
                className="bg-slate-900 hover:bg-black text-white font-bold px-5 py-2 rounded-xl text-xs shadow-md shadow-slate-900/10 transition-all uppercase tracking-wider cursor-pointer"
              >
                Salvar Alterações
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
