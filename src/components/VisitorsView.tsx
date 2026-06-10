import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Search, CheckCircle, LogOut, Clock, Calendar, QrCode, ClipboardList, ShieldAlert, Trash2, X, Plus, Check, Edit2
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { Visitor, Resident } from '../types';
import { toUpperText, generateAccessCode } from '../lib/utils';
import MercosulPlate from './MercosulPlate';
import { ProceduralQRCode } from './ProceduralQRCode';

export const getDurationLabel = (val?: string) => {
  if (!val) return '24 Horas';
  const mapping: { [key: string]: string } = {
    '3h': '3 Horas',
    '6h': '6 Horas',
    '12h': '12 Horas',
    '24h': '24 Horas (1 Dia)',
    '3d': '3 Dias',
    '5d': '5 Dias',
    '7d': '7 Dias'
  };
  return mapping[val] || val;
};

interface VisitorsViewProps {
  visitors: Visitor[];
  residents: Resident[];
  onAddVisitor: (visitor: Visitor) => void;
  onCheckOutVisitor: (id: string) => void;
  onUpdateVisitorStatus: (id: string, status: 'Pre-Autorizado' | 'Dentro' | 'Saiu' | 'Recusado') => void;
  onRemoveVisitor: (id: string) => void;
  currentUser: { id: string; name: string; unit?: string; role: 'Administrador' | 'Morador' | 'Porteiro' | 'MASTER' };
  visitorTypes?: string[];
  onSaveVisitorTypes?: (types: string[]) => void;
  visitorValidities?: {label: string, hours: number}[];
  onSaveVisitorValidities?: (validities: {label: string, hours: number}[]) => void;
}

export default function VisitorsView({
  visitors,
  residents,
  onAddVisitor,
  onCheckOutVisitor,
  onUpdateVisitorStatus,
  onRemoveVisitor,
  currentUser,
  visitorTypes,
  onSaveVisitorTypes,
  visitorValidities,
  onSaveVisitorValidities
}: VisitorsViewProps) {
  const [activeTab, setActiveTab] = useState<'inside' | 'preauth' | 'history'>('inside');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState<string>('Regular');
  const [unitToVisit, setUnitToVisit] = useState('');
  const [company, setCompany] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [notes, setNotes] = useState('');
  const [isPreAuth, setIsPreAuth] = useState(true);
  const [validityDuration, setValidityDuration] = useState<string>('');

  // Active QR Code Modal state
  const [activeQrCodeVisitor, setActiveQrCodeVisitor] = useState<Visitor | null>(null);

  // Config Modal State
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configTab, setConfigTab] = useState<'types' | 'validities'>('types');
  const [newTypeText, setNewTypeText] = useState('');
  const [editingType, setEditingType] = useState<string | null>(null);
  const [newValidityLabel, setNewValidityLabel] = useState('');
  const [newValidityHours, setNewValidityHours] = useState('');

  const activeTypes = visitorTypes || ['Regular', 'Prestador', 'Entrega', 'Parente'];
  const activeValidities = visitorValidities || [
    { label: '3 Horas', hours: 3 },
    { label: '6 Horas', hours: 6 },
    { label: '12 Horas', hours: 12 },
    { label: '24 Horas (1 Dia)', hours: 24 },
    { label: '3 Dias', hours: 72 },
    { label: '5 Dias', hours: 120 },
    { label: '7 Dias', hours: 168 }
  ];

  // Countdown timer for expired visitors
  const [currentTime, setCurrentTime] = useState(new Date());

  const handleAddType = () => {
    if (!newTypeText.trim()) return;
    const cleanName = toUpperText({ text: newTypeText.trim() }).text;
    if (activeTypes.includes(cleanName)) {
      alert('Este tipo de acesso já existe.');
      return;
    }
    const updated = [...activeTypes, cleanName];
    if (onSaveVisitorTypes) onSaveVisitorTypes(updated);
    setNewTypeText('');
  };

  const handleRemoveType = (catName: string) => {
    if (activeTypes.length <= 1) {
      alert('É necessário ter pelo menos um tipo de acesso.');
      return;
    }
    if (confirm(`Tem certeza que deseja remover o tipo de acesso "${catName}"?`)) {
      const updated = activeTypes.filter(c => c !== catName);
      if (onSaveVisitorTypes) onSaveVisitorTypes(updated);
    }
  };

  const handleStartEditType = (catName: string) => {
    setEditingType(catName);
    setNewTypeText(catName);
  };

  const handleSaveEditType = (oldCatName: string) => {
    if (!newTypeText.trim()) return;
    const cleanName = toUpperText({ text: newTypeText.trim() }).text;
    if (cleanName !== oldCatName && activeTypes.includes(cleanName)) {
      alert('Já existe um tipo de acesso com este nome.');
      return;
    }
    const updated = activeTypes.map(c => c === oldCatName ? cleanName : c);
    if (onSaveVisitorTypes) onSaveVisitorTypes(updated);
    setEditingType(null);
    setNewTypeText('');
  };

  const handleAddValidity = () => {
    if (!newValidityLabel.trim() || !newValidityHours.trim()) return;
    const hours = parseInt(newValidityHours, 10);
    if (isNaN(hours) || hours <= 0) {
      alert('Formato de horas inválido.');
      return;
    }
    const cleanLabel = toUpperText({ text: newValidityLabel.trim() }).text;
    if (activeValidities.find(v => v.label === cleanLabel)) {
      alert('Já existe uma validade com este nome.');
      return;
    }
    const updated = [...activeValidities, { label: cleanLabel, hours }];
    if (onSaveVisitorValidities) onSaveVisitorValidities(updated);
    setNewValidityLabel('');
    setNewValidityHours('');
  };

  const handleRemoveValidity = (label: string) => {
    if (activeValidities.length <= 1) {
      alert('É necessário ter pelo menos uma validade configurada.');
      return;
    }
    if (confirm(`Tem certeza que deseja remover a validade "${label}"?`)) {
      const updated = activeValidities.filter(v => v.label !== label);
      if (onSaveVisitorValidities) onSaveVisitorValidities(updated);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (exitTime: string) => {
    const exitDate = new Date(exitTime);
    const expirationDate = new Date(exitDate.getTime() + 2 * 60 * 60 * 1000);
    const remaining = expirationDate.getTime() - currentTime.getTime();

    if (remaining <= 0) return 'Expirando...';

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Filter lists
  const filteredVisitors = visitors.filter(visitor => {
    const vName = visitor.name || '';
    const vDoc = visitor.document || '';
    const vCompany = visitor.company || '';
    const vUnit = visitor.unitToVisit || '';
    
    const matchesSearch = vName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          vDoc.includes(searchQuery) ||
                          (vCompany && vCompany.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          vUnit.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'inside') {
      return matchesSearch && visitor.status === 'Dentro';
    } else if (activeTab === 'preauth') {
      return matchesSearch && visitor.status === 'Pre-Autorizado';
    } else {
      return matchesSearch && (visitor.status === 'Saiu' || visitor.status === 'Recusado');
    }
  });

  const handleCreateVisitor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !document.trim() || !unitToVisit || !validityDuration) {
      alert('Por favor, preencha todos os campos obrigatórios (Nome, Documento, Unidade e Tempo de Liberação / Validade).');
      return;
    }

    // Attempt to match unit to resident
    const matchedResident = residents.find(res => res.unit.toLowerCase() === unitToVisit.toLowerCase());
    
    if (matchedResident && matchedResident.status === 'Bloqueado') {
      alert(`ENTRADA NEGADA: O morador responsável (${matchedResident.name}) desta unidade (${unitToVisit}) está BLOQUEADO pelo administrador. Não é permitido registrar visitas.`);
      return;
    }

    const hostName = matchedResident ? matchedResident.name : 'Administração / Portaria';

    let durationMs = 24 * 60 * 60 * 1000;
    const selectedValidity = visitorValidities?.find(v => v.label === validityDuration || v.label === getDurationLabel(validityDuration));
    if (selectedValidity) {
      durationMs = selectedValidity.hours * 60 * 60 * 1000;
    } else {
      if (validityDuration === '3h') durationMs = 3 * 60 * 60 * 1000;
      else if (validityDuration === '6h') durationMs = 6 * 60 * 60 * 1000;
      else if (validityDuration === '12h') durationMs = 12 * 60 * 60 * 1000;
      else if (validityDuration === '24h') durationMs = 24 * 60 * 60 * 1000;
      else if (validityDuration === '3d') durationMs = 3 * 24 * 60 * 60 * 1000;
      else if (validityDuration === '5d') durationMs = 5 * 24 * 60 * 60 * 1000;
      else if (validityDuration === '7d') durationMs = 7 * 24 * 60 * 60 * 1000;
    }

    const expirationTime = new Date(Date.now() + durationMs).toISOString();

    const newVisitor: Visitor = toUpperText({
      id: crypto.randomUUID(),
      name,
      document,
      phone,
      type,
      unitToVisit,
      residentId: matchedResident?.id,
      hostName,
      company: type !== 'Regular' ? company : undefined,
      vehiclePlate: vehiclePlate ? vehiclePlate.toUpperCase() : undefined,
      entryTime: isPreAuth ? null : new Date().toISOString(),
      exitTime: null,
      status: isPreAuth ? 'Pre-Autorizado' : 'Dentro',
      exitCode: generateAccessCode(),
      notes,
      createdAt: new Date().toISOString(),
      validityDuration,
      expirationTime
    });

    onAddVisitor(newVisitor);
    
    // Clear inputs and close
    setName('');
    setDocument('');
    setPhone('');
    setType('Regular');
    setUnitToVisit('');
    setCompany('');
    setVehiclePlate('');
    setNotes('');
    setIsPreAuth(true);
    setValidityDuration('');
    setShowAddForm(false);
  };

  const promotePreAuthToInside = (visitor: Visitor) => {
    if (confirm(`Tem certeza que deseja liberar a entrada do visitante: ${visitor.name}?`)) {
        onUpdateVisitorStatus(visitor.id, 'Dentro');
        alert(`Entrada registrada para o convidado pré-autorizado: ${visitor.name}.`);
    }
  };

  const failVisitorAccess = (visitor: Visitor) => {
    onUpdateVisitorStatus(visitor.id, 'Recusado');
    alert(`Acesso recusado para: ${visitor.name}.`);
  };

  return (
    <div className="space-y-6" id="visitors-management">
      
      {/* Search and Action Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, documento, empresa ou unidade..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            id="visitors-search-input"
          />
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-full md:w-auto bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          id="btn-toggle-add-visitor"
        >
          <UserPlus className="w-4 h-4" /> Registrar Novo Acesso
        </button>
      </div>

      {/* Visitor Register Form card */}
      {showAddForm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-6" id="add-visitor-form-container">
          <div className="border-b border-gray-100 pb-3 mb-5">
            <h3 className="text-lg font-semibold text-gray-900">Registrar Entrada / Pré-autorização</h3>
            <p className="text-xs text-gray-500 mt-0.5">Cadastre visitantes esporádicos ou agendamentos dos moradores.</p>
          </div>

          <form onSubmit={handleCreateVisitor} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Name */}
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Roberto da Silva Santos"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Document */}
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Documento (CPF ou RG) *</label>
                <input
                  type="text"
                  required
                  value={document}
                  onChange={(e) => setDocument(e.target.value)}
                  placeholder="Ex: 40.123.456-X"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Telefone Celular</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ex: (11) 99999-8888"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Type selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">Tipo de Acesso</label>
                  {(currentUser.role === 'Administrador' || currentUser.role === 'MASTER') && (
                    <button type="button" onClick={() => setShowConfigModal(true)} className="text-[9px] text-sky-600 font-bold uppercase tracking-widest hover:underline cursor-pointer">
                      Configurar
                    </button>
                  )}
                </div>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
                >
                  {visitorTypes?.map(t => (
                    <option key={t} value={t}>{t}</option>
                  )) || (
                    <>
                      <option value="Regular">Visita Comum</option>
                      <option value="Prestador">Prestador de Serviço</option>
                      <option value="Entrega">Entrega / Delivery</option>
                      <option value="Parente">Parente</option>
                    </>
                  )}
                </select>
              </div>

              {/* Unit to visit */}
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Unidade Destino *</label>
                <select
                  required
                  value={unitToVisit}
                  onChange={(e) => setUnitToVisit(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
                >
                  <option value="">Selecione a Unidade...</option>
                  {residents.map((r) => (
                    <option key={r.id} value={r.unit} className={r.status === 'Bloqueado' ? 'text-red-650 font-bold' : ''}>
                      {r.unit} ({r.name}){r.status === 'Bloqueado' ? ' [🚫 BLOQUEADO - ACESSO NEGADO]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Company (if service or delivery) */}
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Empresa (Se houver)</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Ex: iFood, Claro, Porto Seguro"
                  disabled={type === 'Regular'}
                  className={`w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500 ${
                    type === 'Regular' ? 'opacity-50' : ''
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Vehicle plate index */}
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Placa do Veículo (Se houver)</label>
                <input
                  type="text"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                  placeholder="Ex: ABC1D23 ou ABC-1234"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm uppercase focus:outline-none focus:border-sky-500"
                />
                {vehiclePlate.trim() && (
                  <div className="mt-1.5 flex items-center gap-1.5 select-none animate-fadeIn">
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Preview Mercosul:</span>
                    <MercosulPlate plate={vehiclePlate} />
                  </div>
                )}
              </div>

              {/* Validity selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">Tempo de Liberação / Validade *</label>
                  {(currentUser.role === 'Administrador' || currentUser.role === 'MASTER') && (
                    <button type="button" onClick={() => setShowConfigModal(true)} className="text-[9px] text-sky-600 font-bold uppercase tracking-widest hover:underline cursor-pointer">
                      Configurar
                    </button>
                  )}
                </div>
                <select
                  value={validityDuration}
                  onChange={(e) => setValidityDuration(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500 font-medium"
                  required
                >
                  <option value="">Selecione a validade...</option>
                  {visitorValidities?.map(v => (
                    <option key={v.label} value={v.label}>{v.label} ({v.hours}h)</option>
                  )) || (
                    <>
                      <option value="3h">3 Horas</option>
                      <option value="6h">6 Horas</option>
                      <option value="12h">12 Horas</option>
                      <option value="24h">24 Horas (1 Dia)</option>
                      <option value="3d">3 Dias</option>
                      <option value="5d">5 Dias</option>
                      <option value="7d">7 Dias</option>
                    </>
                  )}
                </select>
              </div>

              {/* Pre authorization selector */}
              <div className="flex items-center justify-between bg-slate-55 p-3.5 rounded-xl border border-dashed border-slate-200 self-end h-[42px]">
                <span className="text-xs text-gray-700 font-semibold">Agendar Acesso Futuro?</span>
                <input
                  type="checkbox"
                  checked={isPreAuth}
                  onChange={(e) => setIsPreAuth(e.target.checked)}
                  className="w-4 h-4 accent-slate-900 rounded"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Observações adicionais</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Trará caixas de ferramentas, autorizado a subir acompanhado, etc."
                rows={2}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
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
                {isPreAuth ? 'Salvar Pré-Autorização' : 'Liberar Entrada Agora'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="flex border-b border-gray-100 bg-gray-50/50">
          <button
            onClick={() => setActiveTab('inside')}
            className={`flex-1 md:flex-none uppercase text-xs tracking-wider font-semibold py-3 px-6 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'inside'
                ? 'border-gray-900 text-gray-900 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Clock className="w-4 h-4" /> Presentes ({visitors.filter(v => v.status === 'Dentro').length})
          </button>
          <button
            onClick={() => setActiveTab('preauth')}
            className={`flex-1 md:flex-none uppercase text-xs tracking-wider font-semibold py-3 px-6 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'preauth'
                ? 'border-gray-900 text-gray-900 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Calendar className="w-4 h-4" /> Pré-Autorizados ({visitors.filter(v => v.status === 'Pre-Autorizado').length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 md:flex-none uppercase text-xs tracking-wider font-semibold py-3 px-6 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-gray-900 text-gray-900 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <ClipboardList className="w-4 h-4" /> Histórico de Saídas
          </button>
        </div>

        <div className="p-6">
          {filteredVisitors.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 font-semibold uppercase">Nenhum registro correspondente</p>
              <p className="text-xs text-gray-400 mt-1">Gere novos acessos de portaria usando a aba superior de cadastro.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 text-xs font-semibold uppercase bg-gray-25/50">
                    <th className="py-3 px-4">Pessoa / Cadastro</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Destino da Visita</th>
                    <th className="py-3 px-4">Veículo/Placa</th>
                    <th className="py-3 px-4">Horários</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150">
                  {filteredVisitors.map((visitor) => (
                    <tr key={visitor.id} className="hover:bg-gray-50/50">
                      
                      {/* Person Details */}
                      <td className="py-4 px-4">
                        <div 
                          className="font-semibold text-gray-905 flex items-center gap-2 cursor-pointer hover:text-sky-700 transition-colors"
                          onClick={() => setActiveQrCodeVisitor(visitor)}
                          title="Clique para ver QR Code"
                        >
                          {visitor.name}
                          <span className="hidden">
                          </span>
                        </div>
                        <div className="text-xs text-gray-450 font-mono mt-0.5">DOC: {visitor.document}</div>
                        {visitor.phone && (
                          <div className="text-xs text-gray-450 mt-0.5">{visitor.phone}</div>
                        )}
                        {visitor.notes && (
                          <div className="text-xs text-slate-500 italic mt-1.5 max-w-[260px] truncate" title={visitor.notes}>
                            Obs: {visitor.notes}
                          </div>
                        )}
                        {(visitor.autoReleased || (visitor.notes && visitor.notes.includes('Liberação Automática'))) && (
                          <div className="mt-2">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-red-200 bg-red-400/10 text-red-750 text-[10px] font-black font-sans uppercase tracking-wider animate-pulse shadow-sm">
                              🚨 Liberação Automática do Sistema
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Type Badge */}
                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase block w-fit ${
                          visitor.type === 'Entrega' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          visitor.type === 'Prestador' ? 'bg-blue-50 text-blue-750 border border-blue-100' : 
                          visitor.type === 'Parente' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                          'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}>
                          {visitor.type === 'Regular' ? 'Visitante' : visitor.type === 'Prestador' ? 'Prestador' : visitor.type === 'Parente' ? 'Parente' : 'Entrega'}
                        </span>
                        {visitor.company && (
                          <span className="text-xs text-gray-500 block mt-1 font-medium">{visitor.company}</span>
                        )}
                      </td>

                      {/* Unit Destination */}
                      <td className="py-4 px-4">
                        <div className="font-semibold text-gray-800 text-xs">{visitor.unitToVisit}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5 font-medium">Anfitrião: {visitor.hostName}</div>
                      </td>

                      {/* Vehicle detail */}
                      <td className="py-4 px-4">
                        {visitor.vehiclePlate ? (
                          <div className="flex items-center">
                            <MercosulPlate plate={visitor.vehiclePlate} />
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 font-medium italic">Sem veículo</span>
                        )}
                      </td>

                      {/* Timestamps */}
                      <td className="py-4 px-4 text-xs font-mono text-gray-500 space-y-1">
                        {activeTab === 'inside' && (
                          <>
                            <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 soft-pulse"></span>
                              Entrou: {visitor.entryTime ? new Date(visitor.entryTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                            </div>
                            {visitor.expirationTime && (
                              <div className={`text-[10px] font-sans ${
                                new Date() > new Date(visitor.expirationTime) ? 'text-rose-600 font-bold' : 'text-gray-450'
                              }`}>
                                ⏳ Expira: {new Date(visitor.expirationTime).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                                {new Date() > new Date(visitor.expirationTime) && ' (EXPIRADO)'}
                              </div>
                            )}
                          </>
                        )}
                        {activeTab === 'preauth' && (
                          <>
                            <div className="text-sky-700 font-semibold flex items-center gap-1">
                              📅 Pré-autorizado
                            </div>
                            {visitor.expirationTime && (
                              <div className={`text-[10px] font-sans ${
                                new Date() > new Date(visitor.expirationTime) ? 'text-rose-600 font-bold' : 'text-gray-450'
                              }`}>
                                📅 Expira: {new Date(visitor.expirationTime).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                                {new Date() > new Date(visitor.expirationTime) && ' (EXPIRADO)'}
                              </div>
                            )}
                          </>
                        )}
                        {activeTab === 'history' && (
                          <>
                            <div className="text-[10px] text-gray-450">E: {visitor.entryTime ? new Date(visitor.entryTime).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Agendado'}</div>
                            <div className="text-[10px] text-gray-450">S: {visitor.exitTime ? new Date(visitor.exitTime).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Rejeitado'}</div>
                            {visitor.status === 'Saiu' && visitor.exitTime && (
                              <div className="text-[10px] font-mono text-rose-600 font-bold mt-1">
                                ⏳ {formatCountdown(visitor.exitTime)}
                              </div>
                            )}
                          </>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {activeTab === 'inside' && (
                            <button
                              onClick={() => onCheckOutVisitor(visitor.id)}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                            >
                              <LogOut className="w-3.5 h-3.5" /> Registrar Saída
                            </button>
                          )}
                          
                          {activeTab === 'preauth' && (
                            <>
                              <button
                                onClick={() => setActiveQrCodeVisitor(visitor)}
                                className="bg-sky-50 hover:bg-sky-100 text-sky-600 p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                                title="Ver Convite Inteligente"
                              >
                                <QrCode className="w-4 h-4" /> Convite
                              </button>
                              <button
                                onClick={() => promotePreAuthToInside(visitor)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
                              >
                                Liberar entrada
                              </button>
                              <button
                                onClick={() => failVisitorAccess(visitor)}
                                className="bg-gray-105 hover:bg-rose-50 text-gray-550 hover:text-rose-650 p-1.5 rounded-lg text-xs font-bold"
                                title="Recusar Acesso"
                              >
                                ✕
                              </button>
                            </>
                          )}

                          {activeTab === 'history' && (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              visitor.status === 'Saiu' ? 'bg-gray-100 text-gray-650' : 'bg-rose-55 text-rose-650'
                            }`}>
                              {visitor.status === 'Saiu' ? 'Finalizado' : 'BARRADO / RECUSADO'}
                            </span>
                          )}

                          {(currentUser.role === 'Administrador' || currentUser.role === 'MASTER') && (
                            <button 
                              onClick={() => { if(confirm('Excluir visitante?')) onRemoveVisitor(visitor.id); }}
                              className="text-gray-400 hover:text-rose-600 p-1.5 rounded-lg border border-transparent hover:border-rose-100 transition-colors"
                              title="Excluir Visitante"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* QR Code Invitation Modal overlay */}
      {activeQrCodeVisitor && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]" style={{ WebkitFontSmoothing: 'antialiased' }}>
          <div className="max-w-[320px] w-full relative select-none flex flex-col pt-4">
            
            {/* Close button outside printable area */}
            <button 
              onClick={() => setActiveQrCodeVisitor(null)}
              className="absolute top-0 right-0 text-gray-400 hover:text-rose-600 font-bold p-1.5 bg-white rounded-full shadow-lg border border-gray-100 z-10 transition-colors transform translate-x-1/3 -translate-y-1/3"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Printable container */}
            <div id="invite-card-content" className="bg-white rounded-t-[1.5rem] p-5 pb-2 flex flex-col items-center shadow-xl">
              <div className="w-full pb-3 border-b border-orange-100 flex justify-center items-center">
                <span className="text-[11px] font-black text-amber-800 uppercase tracking-widest">Convite Digital Inteligente</span>
              </div>
              
              <div className="my-2 flex flex-col items-center w-full">
                <div className="p-3 bg-orange-50/50 rounded-2xl mb-4 border border-orange-200/50 relative">
                  <div className="w-36 h-36 bg-white border border-gray-100 rounded-xl flex items-center justify-center p-2 shadow-sm">
                    <ProceduralQRCode value={`express-${activeQrCodeVisitor.id}`} size={130} />
                  </div>
                  <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-sky-500 to-sky-600 text-white text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-widest shadow-md whitespace-nowrap">
                    Aprovação Expressa
                  </div>
                </div>

                <h4 className="text-base font-bold text-gray-900 mt-2 text-center w-full uppercase">{activeQrCodeVisitor.name}</h4>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 text-center w-full">{activeQrCodeVisitor.type}</p>

                {/* Numeric Code Display */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl px-6 py-2 mb-3 w-full">
                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest block mb-0.5 text-center">Código de Acesso</span>
                  <span className="text-3xl font-black font-mono text-slate-800 tracking-[0.2em] text-center block w-full">{activeQrCodeVisitor.exitCode}</span>
                </div>

                <div className="bg-orange-50/30 p-3 rounded-xl mt-1 w-full text-left space-y-1.5 border border-orange-100/50">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-medium">Unidade Destino:</span>
                    <span className="font-bold text-gray-800">{activeQrCodeVisitor.unitToVisit}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-medium">Anfitrião:</span>
                    <span className="font-bold text-gray-800">{activeQrCodeVisitor.hostName}</span>
                  </div>
                  {activeQrCodeVisitor.vehiclePlate && (
                    <div className="flex justify-between items-center text-xs border-t border-orange-100/50 pt-2 mt-1">
                      <span className="text-gray-500 font-medium">Placa:</span>
                      <MercosulPlate plate={activeQrCodeVisitor.vehiclePlate} />
                    </div>
                  )}
                  <div className="flex justify-between text-xs border-t border-orange-100/50 pt-1.5 mt-1.5 align-top">
                    <span className="text-gray-500 font-medium">Validade:</span>
                    <span className="font-bold text-emerald-700 text-right flex flex-col items-end">
                      <span className="uppercase">{getDurationLabel(activeQrCodeVisitor.validityDuration)}</span>
                      {activeQrCodeVisitor.expirationTime && (
                        <span className="text-[8px] text-gray-500 font-mono font-bold mt-0.5">
                          ATÉ {new Date(activeQrCodeVisitor.expirationTime).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons (Not printed) */}
            <div className="p-5 pt-3 w-full bg-white rounded-b-[1.5rem] space-y-2 shadow-xl border-t border-gray-50">
              <button
                onClick={() => {
                  const createdAt = new Date(activeQrCodeVisitor.createdAt);
                  const dataVisita = createdAt.toLocaleDateString('pt-BR');
                  const horarioVisita = createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                  const validade = activeQrCodeVisitor.expirationTime ? new Date(activeQrCodeVisitor.expirationTime).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Não definido';

                  const message = `🏢 ÁGUAS BELAS 2

CONVITE DE ACESSO

Visitante: ${activeQrCodeVisitor.name}
Tipo: ${activeQrCodeVisitor.type}
Data: ${dataVisita}
Horário: ${horarioVisita}

Unidade: ${activeQrCodeVisitor.unitToVisit}
Responsável: ${activeQrCodeVisitor.hostName}

Código de Acesso: ${activeQrCodeVisitor.exitCode}

Apresente este código ou o QR Code na portaria para liberação do acesso.

Validade: ${validade}

Obrigado.

QR Code:
https://sistema.com/convite/express-${activeQrCodeVisitor.id}`;

                  navigator.clipboard.writeText(message);
                  alert('Texto do convite copiado!');
                }}
                className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition-colors border border-slate-100"
              >
                Copiar Texto
              </button>
              
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const createdAt = new Date(activeQrCodeVisitor.createdAt);
                    const dataVisita = createdAt.toLocaleDateString('pt-BR');
                    const horarioVisita = createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    const validade = activeQrCodeVisitor.expirationTime ? new Date(activeQrCodeVisitor.expirationTime).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Não definido';

                    const message = `🏢 ÁGUAS BELAS 2

CONVITE DE ACESSO

Visitante: ${activeQrCodeVisitor.name}
Tipo: ${activeQrCodeVisitor.type}
Data: ${dataVisita}
Horário: ${horarioVisita}

Unidade: ${activeQrCodeVisitor.unitToVisit}
Responsável: ${activeQrCodeVisitor.hostName}

Código de Acesso: ${activeQrCodeVisitor.exitCode}

Apresente este código ou o QR Code na portaria para liberação do acesso.

Validade: ${validade}

Obrigado.

QR Code:
https://sistema.com/convite/express-${activeQrCodeVisitor.id}`;
                    
                    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
                    window.open(waUrl, '_blank');
                  }}
                  className="flex-1 bg-[#25D366] hover:bg-[#1ebd5d] text-white text-[11px] font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  WhatsApp
                </button>
                <button
                  onClick={async () => {
                     const element = window.document.getElementById('invite-card-content');
                     if (!element) return;
                     
                     try {
                       const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
                       const dataUrl = canvas.toDataURL('image/png');
                       
                       const link = window.document.createElement('a');
                       link.download = `convite-${activeQrCodeVisitor.name.replace(/\s+/g, '-').toLowerCase()}.png`;
                       link.href = dataUrl;
                       link.click();
                     } catch (err) {
                       console.error('Erro ao gerar imagem:', err);
                       alert('Erro ao gerar imagem do convite.');
                     }
                  }}
                  className="flex-1 bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-black py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5 uppercase tracking-widest"
                >
                  PRINT
                </button>
              </div>
            </div>
            
          </div>
        </div>
      )}
      
      {/* Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg min-h-[400px] flex flex-col shadow-2xl relative overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-sky-600" /> Configurações de Acesso
              </h3>
              <button 
                onClick={() => setShowConfigModal(false)}
                className="text-gray-400 hover:text-rose-600 p-1 rounded-full hover:bg-rose-50 transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex bg-slate-50 border-b border-gray-100">
              <button 
                onClick={() => setConfigTab('types')} 
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${configTab === 'types' ? 'text-sky-700 border-b-2 border-sky-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Tipos de Acesso
              </button>
              <button 
                onClick={() => setConfigTab('validities')} 
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${configTab === 'validities' ? 'text-sky-700 border-b-2 border-sky-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Validades / Prazos
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto">
              {configTab === 'types' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <input
                      type="text"
                      placeholder="Novo tipo de acesso (ex: Cuidador)"
                      value={editingType === null ? newTypeText : ''}
                      onChange={(e) => editingType === null && setNewTypeText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddType(); }}
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
                    />
                    <button
                      onClick={handleAddType}
                      className="bg-sky-600 hover:bg-sky-700 text-white p-2 rounded-xl"
                      title="Adicionar Tipo"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <ul className="space-y-2">
                    {activeTypes.map((cat) => (
                      <li key={cat} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-xl">
                        {editingType === cat ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={newTypeText}
                              onChange={(e) => setNewTypeText(e.target.value)}
                              className="flex-1 bg-white border border-slate-300 rounded-lg px-2 py-1 text-sm outline-none"
                              autoFocus
                            />
                            <button onClick={() => handleSaveEditType(cat)} className="text-emerald-600 p-1 hover:bg-emerald-50 rounded"><Check className="w-4 h-4" /></button>
                            <button onClick={() => setEditingType(null)} className="text-slate-400 p-1 hover:bg-slate-200 rounded"><X className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <>
                            <span className="text-sm font-semibold text-slate-700">{cat}</span>
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleStartEditType(cat)} className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleRemoveType(cat)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {configTab === 'validities' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <input
                      type="text"
                      placeholder="Nome (ex: 2 Meses)"
                      value={newValidityLabel}
                      onChange={(e) => setNewValidityLabel(e.target.value)}
                      className="flex-[2] bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
                    />
                    <input
                      type="number"
                      placeholder="Horas (Ex: 1440)"
                      value={newValidityHours}
                      onChange={(e) => setNewValidityHours(e.target.value)}
                      className="flex-1 min-w-[100px] bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
                    />
                    <button
                      onClick={handleAddValidity}
                      className="bg-sky-600 hover:bg-sky-700 text-white p-2 rounded-xl"
                      title="Adicionar Validade"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <ul className="space-y-2">
                    {activeValidities.map((v) => (
                      <li key={v.label} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-xl">
                        <div>
                          <span className="text-sm font-semibold text-slate-700 block">{v.label}</span>
                          <span className="text-[10px] text-slate-400 font-mono tracking-wider">{v.hours} horas</span>
                        </div>
                        <button onClick={() => handleRemoveValidity(v.label)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button 
                onClick={() => setShowConfigModal(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold"
              >
                Concluir e Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
