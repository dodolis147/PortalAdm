import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  Users, Search, UserPlus, Phone, Mail, Car, CreditCard, CheckCircle2, UserCheck, Trash2, Camera, Upload, Image as ImageIcon, Edit, KeyRound, Plus,
  Package, Bell, LayoutGrid, List, QrCode as QrCodeIcon, Lock, Copy
} from 'lucide-react';
import { Resident, Vehicle, Encomenda } from '../types';
import { toUpperText } from '../lib/utils';
import MercosulPlate from './MercosulPlate';
import EditResidentModal from './EditResidentModal';
import PrintResidentsModal from './PrintResidentsModal';
import ProceduralQRCode from './QRCodeDisplay';
import ResidentDetailsModal from './ResidentDetailsModal';

interface ResidentsViewProps {
  residents: Resident[];
  onAddResident: (resident: Resident) => void;
  onRemoveResident: (id: string) => void;
  onUpdateResidentAvatar: (id: string, avatarUrl: string) => void;
  onUpdateResident: (resident: Resident) => void;
  towerNames?: string[];
  currentUser?: { id: string; name: string; unit?: string; role: 'MASTER' | 'Administrador' | 'Porteiro' | 'Morador' };
  onlineResidentIds?: string[];
  onToggleResidentOnline?: (id: string) => void;
  encomendas?: Encomenda[];
  onNavigate: (tab: 'dashboard' | 'visitors' | 'residents' | 'bookings' | 'announcements' | 'incidents' | 'encomendas') => void;
  condoName?: string;
  isSyncing?: boolean;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80',
];

export default function ResidentsView({
  residents,
  onAddResident,
  onRemoveResident,
  onUpdateResidentAvatar,
  onUpdateResident,
  towerNames = ['Torre 1', 'Torre 2', 'Torre 3'],
  currentUser = { id: 'admin', name: 'Op. Ricardo Silva', role: 'Administrador' as const },
  onlineResidentIds = [],
  onToggleResidentOnline,
  encomendas = [],
  onNavigate,
  condoName = 'CONDOACCESS',
  isSyncing = false
}: ResidentsViewProps) {
  const isAdmin = currentUser.role === 'Administrador' || currentUser.role === 'MASTER';
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Ativo' | 'Inativo' | 'Bloqueado'>('All');
  const [selectedTower, setSelectedTower] = useState<string>('Todas');
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  const [detailsResident, setDetailsResident] = useState<Resident | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Adding Resident Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [selectedAddTower, setSelectedAddTower] = useState<string>('');
  const [aptInput, setAptInput] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [coResidentsStr, setCoResidentsStr] = useState(''); // comma-separated list
  const [passwordInput, setPasswordInput] = useState('');
  const [roleInput, setRoleInput] = useState<'MASTER' | 'Morador' | 'Administrador' | 'Porteiro'>('Morador');
  const [avatarUrl, setAvatarUrl] = useState('');

  // File change handler (converts to base64 for offline IndexedDB database persistence)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, forExistingResidentId?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (JPG, PNG, GIF, etc.).');
      return;
    }

    if (file.size > 1 * 1024 * 1024) {
      alert('A imagem é muito grande. Escolha uma foto de até 1MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      if (forExistingResidentId) {
        onUpdateResidentAvatar(forExistingResidentId, base64String);
      } else {
        setAvatarUrl(base64String);
      }
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
  
  // Vehicle Inputs
  const [vehiclesList, setVehiclesList] = useState<Vehicle[]>([]);
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehicleGarageSpot, setVehicleGarageSpot] = useState('');

  // Filtering residents
  const filteredResidents = residents.filter(res => {
    const resName = res.name || '';
    const resUnit = res.unit || '';
    const resPhone = res.phone || '';
    
    const matchesSearch = resName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          resUnit.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          resPhone.includes(searchQuery) ||
                          (res.vehicles || []).some(v => v && v.plate && v.plate.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = filterStatus === 'All' || res.status === filterStatus;
    const matchesTower = selectedTower === 'Todas' || (resUnit && resUnit.startsWith(selectedTower));
    
    return matchesSearch && matchesStatus && matchesTower;
  });

  const handleCreateResident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !aptInput.trim() || !selectedAddTower.trim()) {
      alert('Favor preencher o Nome, Selecionar a Torre/Bloco e informar o Apartamento correspondente.');
      return;
    }

    const fullUnit = `${selectedAddTower} - Apt ${aptInput.trim()}`;
    const members = coResidentsStr
      .split(',')
      .map(m => m.trim())
      .filter(m => m !== '');

    const finalVehicles = [...vehiclesList];
    if (vehicleModel.trim() && vehiclePlate.trim()) {
      finalVehicles.push({
        brandModel: vehicleModel.trim(),
        plate: vehiclePlate.trim().toUpperCase(),
        color: vehicleColor.trim() || 'Não especificada',
        garageSpot: vehicleGarageSpot.trim() || undefined
      });
    }

    const newRes: Resident = toUpperText({
      id: crypto.randomUUID(),
      name: name.trim(),
      unit: fullUnit,
      phone: phone.trim() || 'Não cadastrado',
      email: email.trim() || 'Não cadastrado',
      status: 'Ativo',
      vehicles: finalVehicles,
      members,
      avatarUrl: avatarUrl || undefined,
      password: passwordInput.trim() || '1234',
      role: roleInput,
      qrCodeValue: crypto.randomUUID()
    });

    onAddResident(newRes);

    // Reset Inputs
    setName('');
    setAptInput('');
    setPhone('');
    setEmail('');
    setCoResidentsStr('');
    setPasswordInput('');
    setRoleInput('Morador');
    setAvatarUrl('');
    setVehiclesList([]);
    setVehicleModel('');
    setVehiclePlate('');
    setVehicleColor('');
    setVehicleGarageSpot('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6" id="residents-view-component">
      
      {/* Top filter header and search */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs no-print">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          
          {/* Filters Group */}
          <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">
            <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-sky-500 w-full sm:w-auto"
            >
                <option value="All">Todos Status</option>
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
                <option value="Bloqueado">Bloqueado</option>
            </select>
            <select
                value={selectedTower}
                onChange={(e) => setSelectedTower(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-sky-500 w-full sm:w-auto"
            >
                <option value="Todas">Todas as Torres</option>
                {towerNames.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Actions Group (Search + Buttons) */}
          <div className="flex flex-wrap gap-3 w-full lg:w-auto items-center">
            <div className="relative flex-grow lg:w-72">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar morador, unidade ou placa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-sky-500"
              />
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setIsPrintModalOpen(true)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-semibold flex-1 sm:flex-none flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                Imprimir
              </button>
              {isAdmin && (
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-semibold flex-1 sm:flex-none flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  id="btn-residents-add-form"
                >
                  <UserPlus className="w-4 h-4" /> Cadastrar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Creation form */}
      {showAddForm && isAdmin && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-6" id="add-resident-form">
          <div className="border-b border-gray-100 pb-3 mb-5">
            <h3 className="text-lg font-semibold text-gray-900">Cadastrar Nova Unidade / Morador</h3>
            <p className="text-xs text-gray-500 mt-0.5">Associe novos moradores e veículos às garagens do condomínio.</p>
          </div>

          <form onSubmit={handleCreateResident} className="space-y-4">
            
            {/* Foto de Perfil / Avatar Section */}
            <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 flex flex-col md:flex-row gap-5 items-center" id="avatar-form-section">
              <div className="relative shrink-0">
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt="Preview" 
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-full object-cover border-2 border-slate-700 shadow-sm"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                    <ImageIcon className="w-7 h-7" />
                  </div>
                )}
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl('')}
                    className="absolute -top-1 -right-1 bg-red-650 hover:bg-red-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold cursor-pointer"
                    title="Remover Foto"
                  >
                    ✕
                  </button>
                )}
              </div>
              
              <div className="flex-1 space-y-2 text-center md:text-left">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Foto de Perfil do Morador</span>
                
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                  {/* File Upload Trigger */}
                  <label className="bg-slate-900 hover:bg-black text-white text-xs px-3.5 py-2 rounded-xl font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-xs">
                    <Upload className="w-3.5 h-3.5" /> Enviar Foto Local
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => handleFileChange(e)}
                      className="hidden" 
                    />
                  </label>

                  <span className="text-xs text-gray-400">ou escolha um dos avatares sugeridos:</span>

                  <div className="flex gap-2">
                    {PRESET_AVATARS.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAvatarUrl(url)}
                        className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                          avatarUrl === url ? 'border-sky-500 scale-105 shadow-md' : 'border-zinc-800 opacity-80'
                        }`}
                      >
                        <img src={url} alt={`Avatar ${idx + 1}`} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-gray-500">Tamanho máximo: 2MB. Suporta arquivos de imagem JPG, PNG ou base64 local.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Name */}
              <div>
                <label className="text-xs font-semibold text-gray-650 uppercase tracking-wider block mb-1">Nome Completo do Titular *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Carlos Alberto da Silva"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Torre */}
              <div>
                <label className="text-xs font-semibold text-gray-650 uppercase tracking-wider block mb-1">Torre / Bloco *</label>
                <select
                  value={selectedAddTower}
                  onChange={(e) => setSelectedAddTower(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
                >
                  <option value="">Selecione...</option>
                  {towerNames.map((tower) => (
                    <option key={tower} value={tower}>{tower}</option>
                  ))}
                </select>
              </div>

              {/* Apartment */}
              <div>
                <label className="text-xs font-semibold text-gray-650 uppercase tracking-wider block mb-1">Número Apartamento *</label>
                <input
                  type="text"
                  required
                  value={aptInput}
                  onChange={(e) => setAptInput(e.target.value)}
                  placeholder="Ex: 104, 1205, 52"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Phone */}
              <div>
                <label className="text-xs font-semibold text-gray-650 uppercase tracking-wider block mb-1">Telefone Principal</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ex: (11) 98888-7777"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-xs font-semibold text-gray-650 uppercase tracking-wider block mb-1">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ex: morador@email.com"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Senha */}
              <div>
                <label className="text-xs font-semibold text-gray-650 uppercase tracking-wider block mb-1">Senha de Acesso ao Sistema</label>
                <input
                  type="text"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Se em branco, default é '1234'"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Perfil de Acesso */}
              <div>
                <label className="text-xs font-semibold text-gray-650 uppercase tracking-wider block mb-1">Perfil de Acesso / Permissão</label>
                <select
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value as 'MASTER' | 'Morador' | 'Administrador' | 'Porteiro')}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500 font-bold"
                >
                  <option value="Morador" className="font-normal text-slate-800">Morador (Consultas da unidade, agendamentos e encomendas)</option>
                  <option value="Porteiro" className="font-normal text-slate-800">Porteiro / Porteira (Controle de visitas, encomendas, sem configurações)</option>
                  <option value="Administrador" className="font-normal text-slate-800">Administrador / Síndico (Controle total do sistema)</option>
                  <option value="MASTER" className="font-black text-rose-600 bg-rose-50">👑 MASTER (Permissão Total de Tudo / Acesso Absoluto)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-650 uppercase tracking-wider block mb-1">Dependentes / Co-moradores</label>
              <input
                type="text"
                value={coResidentsStr}
                onChange={(e) => setCoResidentsStr(e.target.value)}
                placeholder="Ex de preenchimento separado por vírgulas: Mariana Santos (Esposa), Felipe Santos (Filho)"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Vehicle Card section */}
            <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-4">
              <span className="text-xs font-bold text-gray-700 uppercase block tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-800">
                  <Car className="w-4 h-4 text-slate-500 font-bold" /> Veículos Associados ({vehiclesList.length})
                </span>
                <span className="text-[10px] text-zinc-400 font-normal lowercase">Permite múltiplos veículos</span>
              </span>

              {/* List of current vehicles being registered */}
              {vehiclesList.length > 0 ? (
                <div className="space-y-2">
                  {vehiclesList.map((v, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between text-xs bg-white border border-gray-150 p-2.5 rounded-xl hover:border-gray-255 transition-all shadow-2xs"
                    >
                      <div className="flex flex-wrap items-center gap-2 pr-2">
                        <span className="bg-slate-50 p-1.5 rounded-lg text-slate-500">
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
                            setVehiclesList(vehiclesList.filter((_, i) => i !== idx));
                          }}
                          className="bg-red-50 hover:bg-red-105 border border-red-100 hover:border-red-200 text-red-500 hover:text-red-700 p-1.5 rounded-lg transition-all cursor-pointer"
                          title="Remover veículo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 bg-white/70 border border-dashed border-gray-200 rounded-xl text-zinc-450 italic text-xs">
                  Nenhum veículo adicionado ainda. Preencha os campos abaixo e clique em "Adicionar veículo".
                </div>
              )}

              {/* Add vehicle form block */}
              <div className="border-t border-gray-200/50 pt-3 space-y-3">
                <span className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wide block">
                  + Adicionar Veículo à Lista:
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Marca / Modelo</label>
                    <input
                      type="text"
                      value={vehicleModel}
                      onChange={(e) => setVehicleModel(e.target.value)}
                      placeholder="Ex: Toyota Corolla"
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1 font-sans">Placa</label>
                    <input
                      type="text"
                      value={vehiclePlate}
                      onChange={(e) => setVehiclePlate(e.target.value)}
                      placeholder="Ex: ABC1D23"
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs uppercase focus:outline-none focus:border-sky-500 tracking-wider font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Cor</label>
                    <input
                      type="text"
                      value={vehicleColor}
                      onChange={(e) => setVehicleColor(e.target.value)}
                      placeholder="Ex: Cinza"
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Vaga de Garagem</label>
                    <input
                      type="text"
                      value={vehicleGarageSpot}
                      onChange={(e) => setVehicleGarageSpot(e.target.value)}
                      placeholder="Ex: Vaga 24 (T1)"
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-sky-500"
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
                        alert('Informe no mínimo o Modelo e a Placa do veículo para adicioná-lo.');
                        return;
                      }
                      
                      const newVehicle: Vehicle = {
                        brandModel: vehicleModel.trim(),
                        plate: vehiclePlate.trim().toUpperCase(),
                        color: vehicleColor.trim() || 'Não especificada',
                        garageSpot: vehicleGarageSpot.trim() || undefined
                      };

                      if (vehiclesList.some(v => v.plate === newVehicle.plate)) {
                        alert('Um veículo com esta mesma placa já foi adicionado.');
                        return;
                      }

                      setVehiclesList([...vehiclesList, newVehicle]);
                      setVehicleModel('');
                      setVehiclePlate('');
                      setVehicleColor('');
                      setVehicleGarageSpot('');
                    }}
                    className="shrink-0 bg-slate-900 hover:bg-black text-white text-[10px] font-bold uppercase tracking-wider px-3.5 py-2 rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-sm shadow-slate-900/10"
                  >
                    <Plus className="w-3 h-3" /> Adicionar veículo
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-slate-900 hover:bg-black text-white px-5 py-2 rounded-xl text-xs font-semibold"
              >
                Cadastrar Unidade
              </button>
            </div>
          </form>
        </div>
      )}

      {/* View Mode Switcher and Search - Restructured */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-end bg-white p-4 rounded-2xl border border-gray-100 shadow-xs no-print">
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            title="Visualização em Grade"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            title="Visualização em Lista"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid or List of Residents */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="residents-grid">
          {filteredResidents.map((resident) => (
            <div 
              key={resident.id}
              className={`bg-white rounded-xl border p-3 shadow-2xs hover:shadow-xs transition-shadow flex-col justify-between ${
                resident.status === 'Inativo' ? 'border-gray-100 opacity-75' : 
                resident.status === 'Bloqueado' ? 'border-red-200 bg-red-50/5' : 'border-gray-100'
              }`}
            >
              <div>
                {/* Unit and Active Badge */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] font-bold tracking-wider bg-gray-100 border border-gray-200 text-gray-800 px-1.5 py-0.5 rounded-md uppercase">
                    {resident.unit}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase ${
                      resident.status === 'Ativo' ? 'bg-emerald-50 text-emerald-700' :
                      resident.status === 'Bloqueado' ? 'bg-red-100 text-red-700 font-extrabold animate-pulse' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {resident.status === 'Ativo' ? 'Ativo' :
                       resident.status === 'Bloqueado' ? 'Bloqueado' : 'Inativo'}
                    </span>
                     {resident.qrCodeValue && (
                      <div className="flex flex-col items-center gap-1">
                        <div className="bg-white p-0.5 rounded border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setDetailsResident(resident)}>
                          <ProceduralQRCode value={resident.qrCodeValue} size={32} />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] font-mono text-gray-400 select-all">{resident.qrCodeValue.substring(0, 8)}...</span>
                          <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(resident.qrCodeValue || '');
                            }}
                            className="p-0.5 hover:bg-gray-100 rounded"
                          >
                             <Copy className="w-2.5 h-2.5 text-gray-400" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Profile info details */}
                <div className="mt-2 flex items-start gap-2">
                  
                  {/* Avatar with edit trigger */}
                  <div className="relative group shrink-0 select-none">
                    {resident.avatarUrl ? (
                      <img 
                        src={resident.avatarUrl} 
                        alt={resident.name}
                        referrerPolicy="no-referrer"
                        className={`w-10 h-10 rounded-full object-cover border-2 shadow-sm group-hover:border-sky-550 transition-all ${
                          (isAdmin && onlineResidentIds.includes(resident.id))
                            ? 'border-emerald-500 ring-1 ring-emerald-500/20' 
                            : 'border-zinc-800'
                        }`}
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-full bg-linear-to-br from-zinc-800 to-zinc-950 text-slate-200 font-extrabold text-[10px] flex items-center justify-center border group-hover:border-sky-500 transition-all uppercase ${
                        (isAdmin && onlineResidentIds.includes(resident.id))
                          ? 'border-emerald-500 ring-1 ring-emerald-500/20' 
                          : 'border-zinc-800'
                      }`}>
                        {resident.name.split(' ').filter(word => !word.toLowerCase().startsWith('dra.') && !word.toLowerCase().startsWith('dr.')).map(n => n[0]).filter(Boolean).slice(0, 2).join('') || 'MR'}
                      </div>
                    )}
                    {/* Glowing online indicator badge on avatar */}
                    {isAdmin && onlineResidentIds.includes(resident.id) && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping absolute"></span>
                        <span className="w-1.5 h-1.5 bg-white rounded-full absolute"></span>
                      </span>
                    )}
                    {/* Hover Camera icon overlay to easily update the photo of this specific resident */}
                    <label className="absolute inset-0 bg-black/75 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                      <Camera className="w-4 h-4 text-sky-400" />
                      <span className="text-[7px] text-white font-bold uppercase mt-0.5 tracking-tighter">Alterar</span>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, resident.id)}
                        className="hidden" 
                      />
                    </label>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-gray-950 tracking-tight leading-snug truncate" title={resident.name}>
                      {resident.name}
                    </h4>

                    {/* Calculated pending packages for this resident card */}
                    {(() => {
                      const residentPendingCount = encomendas.filter(e => 
                        e.status === 'Pendente' && 
                        (e.moradorId === resident.id || 
                         resident.unit.includes(e.apartamento) || 
                         e.apartamento.includes(resident.unit))
                      ).length;

                      if (residentPendingCount > 0) {
                        return (
                          <div className="mt-1.5 mb-1 flex">
                            <span className="relative inline-flex items-center gap-1 bg-gradient-to-r from-rose-600 via-orange-500 to-amber-500 text-white font-black text-[9px] px-2 py-1 rounded-lg uppercase tracking-wider leading-none shadow-[0_4px_12px_rgba(244,63,94,0.4)] animate-pulse select-none">
                              <span className="relative flex h-2 w-2 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-400"></span>
                              </span>
                              <Package className="w-3 h-3 animate-bounce shadow-xs" />
                              {residentPendingCount} {residentPendingCount === 1 ? 'Encomenda' : 'Encomendas'} Pendente
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Status do Morador Online */}
                    {isAdmin ? (
                      <div className="mt-1 flex items-center gap-1.5 select-none">
                        {onlineResidentIds.includes(resident.id) ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50/75 border border-emerald-150/40 text-emerald-700 font-extrabold text-[9px] px-1.5 py-0.5 rounded-md uppercase tracking-wider leading-none">
                            <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></span>
                            Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-100 text-slate-400 font-bold text-[9px] px-1.5 py-0.5 rounded-md uppercase tracking-wider leading-none">
                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                            Offline
                          </span>
                        )}

                        {currentUser.id === resident.id && (
                          <span className="bg-sky-50 text-sky-700 text-[8px] font-black uppercase tracking-widest px-1 py-0.5 rounded border border-sky-100 leading-none">
                            Você
                          </span>
                        )}

                        {onToggleResidentOnline && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleResidentOnline(resident.id);
                            }}
                            className="text-[9px] text-slate-400 hover:text-slate-900 border border-dashed border-gray-200 hover:border-gray-400 px-1 py-0.5 rounded-md leading-none ml-auto cursor-pointer"
                            title="Simular conexão no aplicativo do morador"
                          >
                            {onlineResidentIds.includes(resident.id) ? 'Desconectar' : 'Conectar'}
                          </button>
                        )}
                      </div>
                    ) : (
                      currentUser.id === resident.id && (
                        <div className="mt-1 flex items-center gap-1.5 select-none">
                          <span className="bg-sky-50 text-sky-700 text-[8px] font-black uppercase tracking-widest px-1 py-0.5 rounded border border-sky-100 leading-none">
                            Você
                          </span>
                        </div>
                      )
                    )}
                    
                    <div className="mt-2.5 space-y-1 text-[11px] text-zinc-400">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Phone className="w-3 h-3 text-zinc-500 shrink-0" />
                        <span className="truncate">{resident.phone}</span>
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Mail className="w-3 h-3 text-zinc-500 shrink-0" />
                        <span className="truncate" title={resident.email || 'Não cadastrado'}>{resident.email || 'Não cadastrado'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-gray-100/50">
                        <KeyRound className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold shrink-0">
                          {resident.role || 'Morador'}
                        </span>
                        <span className="font-mono text-[10px] bg-gray-50 border border-gray-200 px-2 py-0.5 rounded text-gray-700 select-all truncate" title="Senha de login">
                          🔑 {resident.password || '1234'}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>

                <div className="border-b border-gray-100 my-3.5" />

                {/* Co-residents list */}
                {resident.members && resident.members.length > 0 && (
                  <div className="mt-1">
                    <span className="text-[9px] uppercase text-gray-400 font-bold block mb-0.5">Dependentes ({resident.members.length}):</span>
                    <div className="flex flex-wrap gap-0.5">
                      {resident.members.map((member, idx) => (
                        <span key={idx} className="bg-slate-50 border border-slate-100 text-slate-700 text-[9px] px-1.5 py-0.5 rounded-md font-medium">
                          {member}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vehicle list info */}
                <div className="mt-1">
                  <span className="text-[9px] uppercase text-gray-400 font-bold block mb-0.5">Veículos:</span>
                  {resident.vehicles && resident.vehicles.length > 0 ? (
                    <div className="space-y-0.5">
                      {resident.vehicles.map((v, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[10px] bg-gray-50 border border-gray-100 p-1.5 rounded-lg">
                          <span className="font-medium text-gray-700 truncate" title={`${v.brandModel} (${v.color})`}>{v.brandModel}</span>
                          <div className="scale-75 transform origin-right">
                            <MercosulPlate plate={v.plate} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[9px] text-gray-400 italic">Sem veículos.</span>
                  )}
                </div>
              </div>

              {/* Biometrics Actions */}
              <div className="mt-2 border-t border-gray-100 pt-2 flex items-center justify-end">

                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingResident(resident)}
                      className="p-1 px-2.5 text-zinc-650 hover:text-sky-600 hover:bg-sky-50 border border-gray-100 hover:border-sky-200 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
                      title="Editar cadastro do morador"
                    >
                      <Edit className="w-3.5 h-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => onRemoveResident(resident.id)}
                      className="text-gray-400 hover:text-rose-600 p-1.5 rounded-lg border border-transparent hover:border-gray-100 transition-colors cursor-pointer"
                      title="Excluir Registro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="p-3 font-semibold text-gray-600 w-10"></th>
                <th className="p-3 font-semibold text-gray-600">Unidade</th>
                <th className="p-3 font-semibold text-gray-600">Morador</th>
                <th className="p-3 font-semibold text-gray-600">Contato</th>
                <th className="p-3 font-semibold text-gray-600">Veículos (Placas)</th>
                <th className="p-3 font-semibold text-gray-600">Status</th>
                <th className="p-3 font-semibold text-gray-600">Acesso (QR)</th>
                <th className="p-3 font-semibold text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredResidents.map((resident) => (
                <tr key={resident.id} className="hover:bg-gray-50/50">
                  <td className="p-2">
                     <img src={resident.avatarUrl || 'https://ui-avatars.com/api/?name=' + resident.name} className="w-8 h-8 rounded-full object-cover" alt="" />
                  </td>
                  <td className="p-3 font-mono font-bold text-gray-700">{resident.unit}</td>
                  <td className="p-3 font-medium text-gray-900">{resident.name}</td>
                  <td className="p-3 text-[10px] text-gray-500">
                    <div className="flex flex-col gap-0.5">
                       <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-gray-400" />{resident.phone}</span>
                       <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-gray-400" />{resident.email || 'Não cadastrado'}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1.5">
                    {resident.vehicles && resident.vehicles.length > 0 ? (
                        resident.vehicles.map((v, idx) => (
                           <MercosulPlate key={idx} plate={v.plate} />
                        ))
                    ) : (
                        <span className="text-[10px] text-gray-400 italic">Nenhum</span>
                    )}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                      resident.status === 'Ativo' ? 'bg-emerald-50 text-emerald-700' : 
                      resident.status === 'Bloqueado' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {resident.status}
                    </span>
                  </td>
                  <td className="p-3 flex gap-1.5">
                     <button
                      onClick={() => setEditingResident(resident)}
                      className="p-1.5 text-zinc-600 hover:text-sky-600 border border-gray-200 rounded-lg transition-all"
                      title="Editar"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => { if(confirm('Excluir este morador?')) onRemoveResident(resident.id); }}
                        className="p-1.5 text-gray-400 hover:text-rose-600 border border-gray-200 rounded-lg transition-all"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Render the Edit Modal */}
      <EditResidentModal
        isOpen={editingResident !== null}
        onClose={() => setEditingResident(null)}
        resident={editingResident}
        onSave={onUpdateResident}
        towerNames={towerNames}
      />

      <PrintResidentsModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        residents={filteredResidents}
        activeFilters={{
          searchQuery,
          filterStatus,
          selectedTower
        }}
        condoName={condoName}
        towerNames={towerNames}
        isSyncing={isSyncing}
      />

      {detailsResident && <ResidentDetailsModal resident={detailsResident} onClose={() => setDetailsResident(null)} />}
    </div>
  );
}
