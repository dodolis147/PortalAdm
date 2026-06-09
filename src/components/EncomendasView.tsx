import React, { useState, useEffect } from 'react';
import { ProceduralQRCode } from './ProceduralQRCode';
import { 
  Package, QrCode, Search, Plus, Clock, Check, CheckCircle2, 
  Calendar, User, Upload, X, FileText, Camera, Building, Filter, Inbox, ArrowRight, CornerDownLeft, Image as ImageIcon,
  Lock, Trash2 as Trash2Icon, AlertTriangle, LayoutGrid, List
} from 'lucide-react';
import { Resident, Encomenda } from '../types';
import { toUpperText, generateAccessCode } from '../lib/utils';

interface EncomendasViewProps {
  encomendas: Encomenda[];
  residents: Resident[];
  onAddEncomenda: (encomenda: Encomenda) => void;
  onDeliverEncomenda: (id: string, details: { quemRetirou: string; responsavelEntrega: string; dataRetirada: string }) => void;
  onRemoveEncomenda: (id: string) => void;
  operatorName: string;
  towerNames?: string[];
  currentUser?: { id: string; name: string; unit?: string; role: 'MASTER' | 'Administrador' | 'Porteiro' | 'Morador' };
  onOpenQRScanner?: () => void;
}

// Simulated default picture presets if the user doesn't upload a real file
const PHOTO_PRESETS = [
  { id: 'caixa', name: 'Caixa de Papelão', url: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=250&auto=format&fit=crop&q=60', color: 'bg-amber-100 border-amber-300' },
  { id: 'envelope', name: 'Envelope Pardo', url: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=250&auto=format&fit=crop&q=60', color: 'bg-orange-50 border-orange-200' },
  { id: 'sacola', name: 'Sacola Plástica/Farmácia', url: 'https://images.unsplash.com/photo-1574634534894-89d7576c8259?w=250&auto=format&fit=crop&q=60', color: 'bg-slate-100 border-slate-300' },
  { id: 'carta', name: 'Correspondência/Carta', url: 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?w=250&auto=format&fit=crop&q=60', color: 'bg-sky-50 border-sky-200' }
];

export default function EncomendasView({
  encomendas,
  residents,
  onAddEncomenda,
  onDeliverEncomenda,
  onRemoveEncomenda,
  operatorName,
  towerNames = ['Torre 1', 'Torre 2', 'Torre 3'],
  currentUser = { id: 'admin', name: 'Op. Ricardo Silva', role: 'Administrador' },
  onOpenQRScanner
}: EncomendasViewProps) {
  const isMorador = currentUser.role === 'Morador';
  const myUnit = currentUser.unit || '';
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Pendente' | 'Entregue'>('Todos');
  const [towerFilter, setTowerFilter] = useState<string>('Todos');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modals & Forms State
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEncomenda, setSelectedEncomenda] = useState<Encomenda | null>(null);

  // Form Field State
  const [recipientType, setRecipientType] = useState<'registered' | 'manual'>('registered');
  const [selectedResidentId, setSelectedResidentId] = useState('');
  const [customRecipientName, setCustomRecipientName] = useState('');
  const [customApartment, setCustomApartment] = useState('');
  const [customTower, setCustomTower] = useState(towerNames[0] || 'Torre 1');
  
  const [recepDate, setRecepDate] = useState(() => {
    // Current local time formatted for standard datetime-local input (YYYY-MM-DDTHH:MM)
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now.getTime() - offset).toISOString().substring(0, 16);
    return localISOTime;
  });
  
  const [receivedByStaff, setReceivedByStaff] = useState(operatorName);
  const [observacoes, setObservacoes] = useState('');
  
  // Photo Upload / Preset Selection State
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string>('');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('caixa');

  // Withdrawal Receipt Form State
  const [withdrawerName, setWithdrawerName] = useState('');
  const [withdrawerDoc, setWithdrawerDoc] = useState('');
  const [deliveryStaff, setDeliveryStaff] = useState(operatorName);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationError, setVerificationError] = useState('');

  // Helpers
  const myEncomendasList = encomendas;
  const activeCount = myEncomendasList.filter(e => e.status === 'Pendente').length;
  const deliveredCount = myEncomendasList.filter(e => e.status === 'Entregue').length;

  // Extract unique towers dynamically to cover both configured and custom blocks/towers
  const uniqueTowers = Array.from(new Set([
    ...towerNames,
    ...encomendas.map(e => e.torre).filter(Boolean)
  ])).sort();

  const filteredEncomendas = encomendas.filter(enc => {
    const encMorador = enc.moradorNome || '';
    const encApt = enc.apartamento || '';
    const encRastreio = enc.codigoRastreio || '';
    const encObs = enc.observacoes || '';

    const rawMatch = 
      encMorador.toLowerCase().includes(searchTerm.toLowerCase()) ||
      encApt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      encRastreio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      encObs.toLowerCase().includes(searchTerm.toLowerCase());

    const statusMatch = statusFilter === 'Todos' ? true : enc.status === statusFilter;
    const towerMatch = towerFilter === 'Todos' ? true : enc.torre === towerFilter;

    return rawMatch && statusMatch && towerMatch;
  });

  // Action: Handle file photo upload convert to base64
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedPhotoUrl(reader.result as string);
        setSelectedPresetId(''); // clear preset if custom uploaded
      };
      reader.readAsDataURL(file);
    }
  };

  // Action: Auto-select Apartment & Tower if Resident is picked
  const handleResidentSelect = (residentId: string) => {
    setSelectedResidentId(residentId);
    const mockRes = residents.find(r => r.id === residentId);
    if (mockRes) {
      // Split resident unit like "Torre X - Apt Y"
      // Expected formatting: "Torre 1 - Apt 104" or similar
      const towerMatch = mockRes.unit.match(/Torre \d+/i);
      const aptMatch = mockRes.unit.match(/Apt \d+/i);

      if (towerMatch) {
        setCustomTower(towerMatch[0]);
      }
      if (aptMatch) {
         setCustomApartment(aptMatch[0].replace(/Apt\s*/i, '').trim());
      } else {
        // Fallback check standard parsing
        const parts = mockRes.unit.split('-');
        if (parts.length === 2) {
          setCustomTower(parts[0].trim());
          setCustomApartment(parts[1].replace(/Apt|Ap/i, '').trim());
        } else {
          setCustomApartment(mockRes.unit.trim());
        }
      }
    }
  };

  // Action: Save new Encomenda
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let finalName = '';
    let finalApt = '';
    let finalTower = '';
    let targetResidentId: string | undefined = undefined;

    if (recipientType === 'registered') {
      const selectedRes = residents.find(r => r.id === selectedResidentId);
      if (!selectedRes) {
        alert('Por favor, selecione um morador cadastrado no sistema.');
        return;
      }
      finalName = selectedRes.name;
      targetResidentId = selectedRes.id;
      finalApt = customApartment || selectedRes.unit;
      finalTower = customTower;
    } else {
      if (!customRecipientName.trim() || !customApartment.trim()) {
        alert('Por favor, preencha o nome do destinatário e número do apartamento.');
        return;
      }
      finalName = customRecipientName.trim();
      finalApt = customApartment.trim();
      finalTower = customTower;
    }

    // Determine photo to use
    let finalPhoto = '';
    if (uploadedPhotoUrl) {
      finalPhoto = uploadedPhotoUrl;
    } else {
      const preset = PHOTO_PRESETS.find(p => p.id === selectedPresetId);
      finalPhoto = preset ? preset.url : '';
    }

    // Create tracking code procedurally
    // Format: ENC-[YMD]-[Sequential count + 1]
    const now = new Date();
    const datePart = `${now.getDate().toString().padStart(2, '0')}${((now.getMonth() + 1)).toString().padStart(2, '0')}`;
    const nextSeq = encomendas.length + 1;
    const trackingCode = `ENC-${datePart}-${nextSeq.toString().padStart(3, '0')}`;

    const newEncomenda: Encomenda = toUpperText({
      id: crypto.randomUUID(),
      codigoRastreio: trackingCode,
      moradorId: targetResidentId,
      moradorNome: finalName,
      apartamento: finalApt,
      torre: finalTower,
      dataRecebimento: new Date(recepDate).toISOString(),
      responsavelRecebimento: receivedByStaff,
      observacoes: observacoes.trim(),
      fotoUrl: finalPhoto,
      status: 'Pendente',
      qrCodeValue: generateAccessCode()
    });

    onAddEncomenda(newEncomenda);
    setShowAddModal(false);
    
    // Reset fields
    setSelectedResidentId('');
    setCustomRecipientName('');
    setCustomApartment('');
    setCustomTower(towerNames[0] || 'Torre 1');
    setObservacoes('');
    setUploadedPhotoUrl('');
    setSelectedPresetId('caixa');
    // Set timestamp
    const offset = now.getTimezoneOffset() * 60000;
    setRecepDate(new Date(now.getTime() - offset).toISOString().substring(0, 16));
  };

  // Action: Withdraw / Deliver package
  const handleWithdrawalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEncomenda) return;
    if (!withdrawerName.trim()) {
      alert('Por favor, informe o nome da pessoa que está efetuando a retirada.');
      return;
    }

    const targetTracking = (selectedEncomenda.codigoRastreio || '').trim().toUpperCase();
    const inputCodeClean = verificationCode.trim().toUpperCase();

    if (inputCodeClean !== targetTracking) {
      setVerificationError('Chave incorreta! Solicite o código correto ao morador.');
      alert('Chave/Código inválido! A liberação só é permitida mediante o código de retirada fornecido pelo morador.');
      return;
    }

    onDeliverEncomenda(selectedEncomenda.id, {
      quemRetirou: withdrawerName.trim() + (withdrawerDoc ? ` (Doc: ${withdrawerDoc})` : ''),
      responsavelEntrega: deliveryStaff.trim(),
      dataRetirada: new Date().toISOString()
    });

    // Close and reset receipt form
    setSelectedEncomenda(null);
    setWithdrawerName('');
    setWithdrawerDoc('');
    setVerificationCode('');
    setVerificationError('');
  };

  return (
    <div className="space-y-6" id="encomendas-module">
      <div className="bg-red-50 border-2 border-red-200 p-4 rounded-xl text-red-900 flex items-center gap-3 mb-4">
        <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
        <p className="text-sm font-semibold"><strong>⚠️ Atenção:</strong> O histórico de registro de encomendas só ficará disponível por 30 dias. Após este período, ele será apagado automaticamente pelo sistema.</p>
      </div>
      
      {/* Upper Information Widgets */}
      <div className={`grid grid-cols-1 ${isMorador ? 'md:grid-cols-3' : 'md:grid-cols-4'} gap-4`} id="encomendas-overview">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <Package id="icon-packages-total" className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-medium block">Total Recebidas</span>
            <span className="text-2xl font-bold tracking-tight text-gray-900">{encomendas.length}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <Clock id="icon-packages-delay" className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-medium block">Aguardando Retirada</span>
            <span className="text-2xl font-bold tracking-tight text-rose-600">{activeCount}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 id="icon-packages-ok" className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-medium block">Entregues / Retiradas</span>
            <span className="text-2xl font-bold tracking-tight text-emerald-600">{deliveredCount}</span>
          </div>
        </div>

        {!isMorador && (
          <button 
            onClick={onOpenQRScanner || (() => alert('Leitor de QR Code disponível pelo menu do topo.'))}
            className="p-5 rounded-2xl border border-zinc-800 shadow-md flex items-center gap-4 bg-gradient-to-br from-slate-900 via-zinc-900 to-slate-950 text-white text-left transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer group relative overflow-hidden w-full"
            id="btn-trigger-portaria-express-metric"
          >
            <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 group-hover:bg-emerald-500/20 group-hover:text-emerald-300 transition-all">
              <Camera className="w-6 h-6 animate-pulse" />
            </div>
            <div className="flex-1">
              <span className="text-[9px] bg-emerald-55 border border-emerald-450 text-emerald-300 px-2 py-0.5 rounded-full uppercase font-black tracking-widest inline-block mb-1.5 leading-none select-none">
                Toque para Escanear
              </span>
              <span className="text-xs text-zinc-100 font-extrabold uppercase tracking-wide block font-mono">Leitor QR de Encomendas</span>
              <span className="text-[9px] text-zinc-400 font-medium block">Liberação expressa via smartphone</span>
            </div>
          </button>
        )}
      </div>

      {/* Toolbar controls */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-4" id="encomendas-toolbar">
        {/* Search & Tower Filter Group */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por morador, ap, código..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
              id="encomenda-search-input"
            />
          </div>

          {/* Tower/Bloco Filter Select */}
          {!isMorador && (
            <div className="relative w-full sm:w-44 flex items-center bg-gray-50 border border-gray-150 rounded-xl px-3 py-2 text-sm">
              <Filter className="w-3.5 h-3.5 text-gray-450 mr-2 shrink-0" />
              <select
                value={towerFilter}
                onChange={(e) => setTowerFilter(e.target.value)}
                className="w-full bg-transparent border-none text-xs font-bold uppercase focus:outline-none cursor-pointer"
                id="encomenda-tower-filter-select"
              >
                <option value="Todos">Todos</option>
                {uniqueTowers.map(tower => (
                  <option key={tower} value={tower}>{tower}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Filters and Add button */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
          {/* Status filter */}
          <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-150 text-xs">
            <button
              onClick={() => setStatusFilter('Todos')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${statusFilter === 'Todos' ? 'bg-white shadow-xs text-gray-900 font-bold' : 'text-gray-500 hover:text-gray-900'}`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter('Pendente')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${statusFilter === 'Pendente' ? 'bg-amber-500 text-white shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
            >
              Pendentes ({activeCount})
            </button>
            <button
              onClick={() => setStatusFilter('Entregue')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${statusFilter === 'Entregue' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
            >
              Entregues ({deliveredCount})
            </button>
          </div>

          {/* View Mode Toggle (Grid / List) */}
          <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-150 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-white shadow-xs text-gray-900 font-black border border-gray-100' : 'text-gray-400 hover:text-gray-700'}`}
              title="Exibição em Grade"
              id="btn-viewmode-grid"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'list' ? 'bg-white shadow-xs text-gray-900 font-black border border-gray-100' : 'text-gray-400 hover:text-gray-700'}`}
              title="Exibição em Lista"
              id="btn-viewmode-list"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Add package action */}
          {!isMorador && (
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
              <button
                type="button"
                onClick={onOpenQRScanner || (() => alert('Leitor de QR Code disponível pelo menu do topo.'))}
                className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold leading-none uppercase tracking-wide flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-emerald-500/15"
                id="btn-trigger-scan-encomenda-toolbar"
              >
                <Camera className="w-4 h-4 animate-bounce" /> Leitor QR de Entrega
              </button>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold leading-none uppercase tracking-wide flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                id="btn-trigger-add-encomenda"
              >
                <Plus className="w-4 h-4" /> Registrar Encomenda
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid or List List of Parcels */}
      {filteredEncomendas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 px-4 text-center shadow-xs" id="encomendas-empty-state">
          <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-700 font-semibold text-base">Nenhuma encomenda localizada</p>
          <p className="text-gray-400 text-xs mt-1 max-w-md mx-auto">
            Não encontramos registros com filtros aplicados. Registre correspondências, pacotes ou caixas recebidas clicando no botão acima.
          </p>
          {(searchTerm || statusFilter !== 'Todos' || towerFilter !== 'Todos') && (
            <button
              onClick={() => { setSearchTerm(''); setStatusFilter('Todos'); setTowerFilter('Todos'); }}
              className="mt-4 px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-semibold rounded-xl cursor-pointer"
            >
              Limpar Filtros de Busca
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="encomendas-grid">
          {filteredEncomendas.map((encomenda) => {
            const isDelivered = encomenda.status === 'Entregue';
            return (
              <div 
                key={encomenda.id || encomenda.codigoRastreio}
                onClick={() => {
                  setSelectedEncomenda(encomenda);
                  setVerificationCode('');
                  setVerificationError('');
                }}
                className={`bg-white rounded-2xl border transition-all duration-200 hover:-translate-y-1 hover:shadow-md cursor-pointer flex flex-col justify-between overflow-hidden relative ${
                  isDelivered ? 'border-gray-100 opacity-80' : 'border-amber-100 ring-1 ring-amber-100/50'
                }`}
                id={`encomenda-card-${encomenda.codigoRastreio}`}
              >
                {/* Visual Header Banner */}
                <div className={`px-4 py-3 border-b flex items-center justify-between ${
                  isDelivered ? 'bg-gray-50/50 border-gray-100' : 'bg-amber-50/30 border-amber-100/40'
                }`}>
                  <div className="flex items-center">
                    <span className="font-mono text-xs font-black text-gray-900 tracking-wider">
                      {['Morador', 'Administrador', 'MASTER'].includes(currentUser?.role || '') ? encomenda.codigoRastreio : '*** MASCARADO ***'}
                    </span>
                    {['Morador', 'Administrador', 'MASTER'].includes(currentUser?.role || '') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(encomenda.codigoRastreio);
                          alert('Código copiado!');
                        }}
                        className="ml-2 text-[9px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded cursor-pointer hover:bg-sky-200"
                      >
                        Copiar
                      </button>
                    )}
                  </div>
                  
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    isDelivered 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                      : 'bg-amber-100 text-amber-900 border border-amber-200 animate-pulse'
                  }`}>
                    {isDelivered ? '✓ Entregue' : '⌛ Pendente'}
                  </span>
                </div>

                {/* Main Card Content */}
                <div className="p-4 space-y-4 flex-1 flex flex-col justify-between">
                  
                  <div className="flex gap-3">
                    {/* Package photo thumbnail or category icon */}
                    <div className="shrink-0">
                      {encomenda.fotoUrl ? (
                        <img 
                          src={encomenda.fotoUrl} 
                          alt="Foto Encomenda" 
                          referrerPolicy="no-referrer"
                          className="w-14 h-14 object-cover rounded-xl border border-gray-200 bg-gray-50"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
                          <Package className="w-7 h-7" />
                        </div>
                      )}
                    </div>

                    {/* Core details */}
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[10px] font-bold text-gray-400 uppercase font-mono block">
                        Destinatário
                      </span>
                      <h4 className="text-sm font-bold text-gray-900 truncate" title={encomenda.moradorNome}>
                        {encomenda.moradorNome}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="bg-slate-100 text-slate-800 text-[10px] px-2 py-0.5 rounded-md font-semibold font-mono">
                          {encomenda.torre}
                        </span>
                        <span className="bg-blue-50 text-blue-800 text-[10px] px-2 py-0.5 rounded-md font-extrabold font-mono">
                          AP {encomenda.apartamento}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Date information and observer */}
                  <div className="bg-gray-50/60 p-2.5 rounded-xl text-xs text-gray-600 border border-gray-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Recebido em:</span>
                      <span className="font-semibold text-gray-700">
                        {new Date(encomenda.dataRecebimento).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})} às {new Date(encomenda.dataRecebimento).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                      </span>
                    </div>

                    {isDelivered && encomenda.dataRetirada && (
                      <div className="flex items-center justify-between text-emerald-800 pt-1 border-t border-dashed border-gray-200">
                        <span>Retirado em:</span>
                        <span className="font-bold">
                          {new Date(encomenda.dataRetirada).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    )}

                    {encomenda.observacoes && (
                      <p className="text-[10px] text-gray-500 italic truncate mt-1 border-t border-gray-200/50 pt-1">
                        "{encomenda.observacoes}"
                      </p>
                    )}
                  </div>

                </div>

                {/* Footer action click guide */}
                <div className="px-4 py-2 bg-gray-50 text-[10px] text-gray-500 font-semibold border-t flex items-center justify-between">
                  <span>Responsável: {encomenda.responsavelRecebimento}</span>
                  <span className="text-blue-600 flex items-center gap-0.5 group-hover:underline">
                    Ver Detalhes/Ações <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View (Table Mode) */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-x-auto" id="encomendas-list-view-container">
          <table className="w-full min-w-[800px] text-left border-collapse" id="encomendas-list-table">
            <thead>
              <tr className="border-b border-gray-150">
                <th className="px-5 py-3 text-xs uppercase font-mono tracking-wider">Código / Rastreio</th>
                <th className="px-5 py-3 text-xs uppercase font-mono tracking-wider">Foto Informada</th>
                <th className="px-5 py-3 text-xs uppercase font-mono tracking-wider">Destinatário & Localidade</th>
                <th className="px-5 py-3 text-xs uppercase font-mono tracking-wider">Recebido em</th>
                <th className="px-5 py-3 text-xs uppercase font-mono tracking-wider">Portaria Responsável</th>
                <th className="px-5 py-3 text-xs uppercase font-mono tracking-wider text-center">Situação</th>
                <th className="px-5 py-3 text-xs uppercase font-mono tracking-wider text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEncomendas.map((encomenda) => {
                const isDelivered = encomenda.status === 'Entregue';
                return (
                  <tr 
                    key={encomenda.id || encomenda.codigoRastreio}
                    onClick={() => {
                      setSelectedEncomenda(encomenda);
                      setVerificationCode('');
                      setVerificationError('');
                    }}
                    className={`cursor-pointer transition-all duration-150 border-b border-gray-50 bg-white hover:bg-gray-50/80 ${
                      isDelivered ? 'opacity-85 hover:opacity-100' : ''
                    }`}
                    id={`encomenda-row-${encomenda.codigoRastreio}`}
                  >
                    {/* Codigo */}
                    <td className="px-5 py-4 font-mono text-xs font-black text-gray-900 tracking-wider">
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <span>{['Morador', 'Administrador', 'MASTER'].includes(currentUser?.role || '') ? encomenda.codigoRastreio : '***'}</span>
                        {['Morador', 'Administrador', 'MASTER'].includes(currentUser?.role || '') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(encomenda.codigoRastreio);
                              alert('Código copiado!');
                            }}
                            className="text-[9px] bg-sky-100/85 text-sky-700 px-1.5 py-0.5 rounded hover:bg-sky-200 transition-colors cursor-pointer"
                          >
                            Copiar
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Foto */}
                    <td className="px-5 py-4">
                      {encomenda.fotoUrl ? (
                        <img 
                          src={encomenda.fotoUrl} 
                          alt="Encomenda" 
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 object-cover rounded-lg border border-gray-200 bg-gray-50 shadow-xs"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
                          <Package className="w-5 h-5" />
                        </div>
                      )}
                    </td>

                    {/* Destinatário */}
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-900 truncate max-w-[200px]" title={encomenda.moradorNome}>
                          {encomenda.moradorNome}
                        </span>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px]">
                          <span className="bg-slate-150 text-slate-800 px-1.5 py-0.5 rounded font-black font-mono">
                            {encomenda.torre}
                          </span>
                          <span className="bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded font-black font-mono">
                            AP {encomenda.apartamento}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Data Recebimento */}
                    <td className="px-5 py-4 text-xs text-gray-650">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-800 whitespace-nowrap">
                          {new Date(encomenda.dataRecebimento).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit', year: 'numeric'})}
                        </span>
                        <span className="text-[10px] text-gray-400 font-semibold mt-0.5">
                          às {new Date(encomenda.dataRecebimento).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                        </span>
                      </div>
                    </td>

                    {/* Porteiro */}
                    <td className="px-5 py-4 text-xs text-gray-500 font-bold whitespace-nowrap">
                      {encomenda.responsavelRecebimento}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4 text-center whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isDelivered 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : 'bg-amber-100 text-amber-900 border border-amber-200 animate-pulse'
                      }`}>
                        {isDelivered ? '✓ Entregue' : '⌛ Pendente'}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <button className="text-xs text-blue-600 font-extrabold inline-flex items-center gap-1 hover:underline cursor-pointer">
                        <span>Ações</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}


      {/* Modal 1: Adicionar Encomenda (Register package) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn" id="modal-add-encomenda">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden block">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-150 flex items-center justify-between bg-slate-900 text-white">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-400" /> Registrar Entrada de Encomenda
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {/* Type selector: Morador cadastrado ou Manual */}
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-1 rounded-xl border border-gray-150 text-xs">
                <button
                  type="button"
                  onClick={() => setRecipientType('registered')}
                  className={`py-2 px-3 rounded-lg font-bold uppercase tracking-wider transition-all cursor-pointer text-center ${recipientType === 'registered' ? 'bg-slate-900 text-white shadow-xs' : 'text-gray-500'}`}
                >
                  Morador Cadastrado
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientType('manual')}
                  className={`py-2 px-3 rounded-lg font-bold uppercase tracking-wider transition-all cursor-pointer text-center ${recipientType === 'manual' ? 'bg-slate-900 text-white shadow-xs' : 'text-gray-500'}`}
                >
                  Digitar Manualmente
                </button>
              </div>

              {/* Destination inputs */}
              {recipientType === 'registered' ? (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block">Morador Destinatário *</label>
                  <select
                    required
                    value={selectedResidentId}
                    onChange={(e) => handleResidentSelect(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    id="select-recipient-resident"
                  >
                    <option value="">Selecione o morador...</option>
                    {residents
                      .filter(r => r.status === 'Ativo')
                      .map(res => (
                        <option key={res.id} value={res.id}>
                          {res.name} - Unit: {res.unit}
                        </option>
                      ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block">Nome do Destinatário *</label>
                  <input
                    type="text"
                    required
                    placeholder="Digite o nome completo do morador ou visitante"
                    value={customRecipientName}
                    onChange={(e) => setCustomRecipientName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Torre e Apartamento (linked or manual edit) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-750 uppercase tracking-wide block">Torre / Bloco *</label>
                  <select
                    value={customTower}
                    onChange={(e) => setCustomTower(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    id="select-add-encomenda-tower"
                  >
                    {towerNames.map(tName => (
                      <option key={tName} value={tName}>{tName}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-750 uppercase tracking-wide block">Apartamento *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 104"
                    value={customApartment}
                    onChange={(e) => setCustomApartment(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    id="input-add-encomenda-apt"
                  />
                </div>
              </div>

              {/* Recep date time and handler staff */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-750 uppercase tracking-wide block">Data e Hora de Recebimento *</label>
                  <input
                    type="datetime-local"
                    required
                    value={recepDate}
                    onChange={(e) => setRecepDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-750 uppercase tracking-wide block">Porteiro / Responsável *</label>
                  <input
                    type="text"
                    required
                    value={receivedByStaff}
                    onChange={(e) => setReceivedByStaff(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Photo Area options */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-750 uppercase tracking-wide block">Foto da Encomenda</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* File Uploader */}
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-3 text-center flex flex-col justify-center items-center hover:bg-gray-50 transition-colors">
                    <Upload className="w-5 h-5 text-gray-400 mb-1" />
                    <span className="text-[11px] text-gray-600 block">Fazer upload de foto</span>
                    <label className="mt-1 cursor-pointer bg-blue-50 text-blue-600 hover:bg-blue-100 px-2.5 py-1 rounded-md text-[10px] font-bold">
                      Selecionar Arquivo
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handlePhotoUpload} 
                        className="hidden" 
                      />
                    </label>
                  </div>

                  {/* Standard Image Category Presets */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block font-mono">Ou selecione um modelo predefinido:</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {PHOTO_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setSelectedPresetId(preset.id);
                            setUploadedPhotoUrl(''); // erase uploaded
                          }}
                          className={`p-1 border rounded-lg text-left text-[10px] truncate ${
                            selectedPresetId === preset.id 
                              ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500' 
                              : 'border-gray-200 bg-white hover:bg-gray-50'
                          }`}
                        >
                          <span className="font-semibold block truncate">{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Selected File / Preset Preview image bar */}
                {(uploadedPhotoUrl || selectedPresetId) && (
                  <div className="flex items-center gap-3 bg-gray-50 border border-gray-150 p-2 rounded-xl animate-fadeIn">
                    <img 
                      src={uploadedPhotoUrl || PHOTO_PRESETS.find(p => p.id === selectedPresetId)?.url} 
                      alt="Prévia Encomenda" 
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 object-cover rounded-lg border border-gray-200 shadow-xs" 
                    />
                    <div className="text-[11px]">
                      <span className="font-bold text-gray-700 block">Tipo selecionado:</span>
                      <span className="text-gray-500">
                        {uploadedPhotoUrl ? "Arquivo Personalizado" : PHOTO_PRESETS.find(p => p.id === selectedPresetId)?.name}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-750 uppercase tracking-wide block">Observações (Opcional)</label>
                <textarea
                  placeholder="Ex: Objeto frágil, caixa amassada no canto superior, entregar somente após às 18h..."
                  rows={2}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Disclaimer */}
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[10px] text-blue-700 leading-normal">
                Ao registrar, o sistema gerará automaticamente um <strong>QRCode único de entrega</strong> e um <strong>código de controle</strong> interno para auditoria e rapidez na retirada.
              </div>

              {/* Submit Action */}
              <div className="flex gap-2 pt-2 border-t justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-200 hover:bg-gray-50 font-semibold text-gray-600 rounded-xl text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-black font-extrabold text-white rounded-xl text-xs uppercase tracking-wider cursor-pointer"
                  id="btn-submit-new-encomenda"
                >
                  Confirmar Cadastro
                </button>
              </div>

            </form>
          </div>
        </div>
      )}


      {/* Modal 2: Detalhes, QRCode e Retirada de Encomenda */}
      {selectedEncomenda && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn" id="modal-encomenda-detail">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden block">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-150 flex items-center justify-between bg-slate-900 text-white">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Package className="w-5 h-5 text-yellow-400" /> Detalhes da Encomenda
              </h3>
              <button 
                onClick={() => setSelectedEncomenda(null)}
                className="p-1 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[80vh] overflow-y-auto">
              
              {/* Left Column: Core information */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase font-mono block">Código de Rastreio</span>
                    <h4 className="text-lg font-black tracking-wider text-gray-900 font-mono">
                      {['Morador', 'Administrador', 'MASTER'].includes(currentUser?.role || '') ? selectedEncomenda.codigoRastreio : '***'}
                    </h4>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    selectedEncomenda.status === 'Entregue'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-100 text-amber-950 border border-amber-200 animate-pulse'
                  }`}>
                    {selectedEncomenda.status === 'Entregue' ? '✓ Retirado / Entregue' : '⌛ Aguardando Retirada'}
                  </span>
                </div>

                {/* Picture element */}
                <div className="border border-gray-150 rounded-xl overflow-hidden bg-gray-50 p-2 text-center">
                  <span className="text-[9px] font-bold uppercase text-gray-400 block mb-1 font-mono text-left">Foto Comprobatória</span>
                  {selectedEncomenda.fotoUrl ? (
                    <img 
                      src={selectedEncomenda.fotoUrl} 
                      alt="Foto Encomenda" 
                      referrerPolicy="no-referrer"
                      className="w-full h-40 object-cover rounded-lg border border-gray-200 bg-white shadow-xs" 
                    />
                  ) : (
                    <div className="w-full h-40 rounded-lg border border-dashed border-gray-200 flex flex-col justify-center items-center text-gray-400">
                      <ImageIcon className="w-8 h-8 opacity-40 mb-1" />
                      <span className="text-xs">Nenhuma foto salva</span>
                    </div>
                  )}
                </div>

                {/* Data logs */}
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-150 text-xs space-y-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block font-mono">Logs de Operação</span>
                  
                  <div className="space-y-1 text-gray-750">
                    <p className="flex justify-between">
                      <span className="text-gray-500">Destinatário:</span>
                      <strong className="text-gray-900">{selectedEncomenda.moradorNome}</strong>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-gray-500">Unidade:</span>
                      <strong className="text-gray-900">{selectedEncomenda.torre} - Ap {selectedEncomenda.apartamento}</strong>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-gray-500">Recebido por:</span>
                      <strong className="text-gray-900">{selectedEncomenda.responsavelRecebimento}</strong>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-gray-500">Data de Entrada:</span>
                      <strong className="text-gray-900">
                        {new Date(selectedEncomenda.dataRecebimento).toLocaleString('pt-BR')}
                      </strong>
                    </p>
                  </div>

                  {selectedEncomenda.observacoes && (
                    <div className="pt-2 border-t border-gray-200/80">
                      <span className="text-[9px] font-bold uppercase text-gray-400 block mb-0.5">Observações da Portaria:</span>
                      <p className="text-xs italic text-gray-700 bg-white p-1.5 rounded-md border text-left">
                        "{selectedEncomenda.observacoes}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Delete button (only for security roles/cleanups) */}
                {(currentUser.role === 'Administrador' || currentUser.role === 'MASTER') && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Deseja realmente excluir permanentemente o registro desta encomenda do sistema?')) {
                        onRemoveEncomenda(selectedEncomenda.id!);
                        setSelectedEncomenda(null);
                      }
                    }}
                    className="text-red-600 hover:text-red-700 text-xs font-semibold flex items-center gap-1 cursor-pointer hover:underline pt-1"
                  >
                    <Trash2Icon className="w-3.5 h-3.5" /> Excluir registro do sistema
                  </button>
                )}
              </div>

              {/* Right Column: QR Code & Pick-up Action */}
              <div className="space-y-4 flex flex-col justify-between">
                
                {/* QR Code Container */}
                <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl text-center space-y-3 flex flex-col items-center">
                  <span className="bg-slate-900 text-white text-[9px] font-extrabold uppercase py-0.5 px-2 rounded-full tracking-wider block font-mono leading-relaxed font-semibold">
                    Código de Retirada Único
                  </span>
                  
                  {isMorador ? (
                    <ProceduralQRCode value={selectedEncomenda.qrCodeValue || 'PENDENTE'} size={140} />
                  ) : (
                    <div className="w-[140px] h-[140px] bg-slate-100 border border-slate-200 rounded-lg flex flex-col items-center justify-center p-3 text-slate-400 relative overflow-hidden">
                      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#002_1px,transparent_1px)] [background-size:16px_16px]"></div>
                      <QrCode className="w-10 h-10 text-slate-400 opacity-20 mb-1 blur-[1.5px]" />
                      <Lock className="w-5 h-5 text-amber-500 absolute" />
                      <span className="text-[10px] text-gray-500 font-bold leading-none mt-2">QR-Code Oculto</span>
                      <span className="text-[8px] text-gray-400 mt-1">Exclusivo do Morador</span>
                    </div>
                  )}
                  
                  <div className="text-[11px] leading-snug">
                    <span className="font-mono font-bold text-gray-800 tracking-wide block">
                      {isMorador ? selectedEncomenda.qrCodeValue : 'RETIRAR-******'}
                    </span>
                    <span className="text-gray-400 mt-1 block">
                      {isMorador 
                        ? "Apresente este QRCode ao porteiro ou informe o código para retirar."
                        : "Chave mascarada por segurança. Solicite o código ou QR-code físico ao morador."}
                    </span>
                  </div>
                </div>

                {/* Pick up status / Delivery checkout form */}
                {selectedEncomenda.status === 'Pendente' ? (
                  isMorador ? (
                    <div className="bg-amber-50 border border-amber-100 p-5 rounded-xl text-center space-y-3 flex-1 flex flex-col justify-center">
                      <Clock className="w-8 h-8 text-amber-650 mx-auto animate-pulse" />
                      <p className="text-xs font-black text-amber-900 uppercase tracking-wider block font-mono">Status: Aguardando Retirada</p>
                      <p className="text-xs text-amber-850 leading-relaxed">
                        Seu pacote já está sob a guarda de nossa portaria inteligente. Apresente o QRCode ao porteiro de plantão <strong>({selectedEncomenda.responsavelRecebimento})</strong> para que ele possa conferir e liberar o item para você.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleWithdrawalSubmit} className="bg-amber-50/40 border border-amber-100 p-4 rounded-xl space-y-3.5 flex-1">
                      <span className="text-xs font-black text-amber-900 uppercase tracking-widest block font-mono">Registrar Entrega / Retirada</span>
                    
                    <div className="space-y-3 text-left">
                      {/* Código de Segurança */}
                      <div className="bg-amber-100/40 p-3 rounded-xl border border-amber-200/50">
                        <label className="text-[10px] font-bold text-amber-950 uppercase tracking-wider block mb-1">Chave de Retirada / Código do Morador *</label>
                        <input
                          type="text"
                          required
                          placeholder="Digite o código (Ex: RETIRAR-... ou ENC-...)"
                          value={verificationCode}
                          onChange={(e) => {
                            setVerificationCode(e.target.value);
                            setVerificationError('');
                          }}
                          className={`w-full bg-white border rounded-xl px-3 py-1.5 text-xs font-mono uppercase focus:outline-none ${
                            verificationError ? 'border-red-450 focus:border-red-500' : 'border-amber-200 focus:border-amber-600'
                          }`}
                        />
                        {verificationError ? (
                          <p className="text-[10px] text-red-600 mt-1 font-semibold">{verificationError}</p>
                        ) : (
                          <p className="text-[10px] text-amber-800 mt-1">Insira a chave/código gerada no app do morador para poder efetuar a liberação.</p>
                        )}
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wide block mb-1">Quem está retirando? *</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: O próprio morador, Clara (Filha), Motoboy..."
                          value={withdrawerName}
                          onChange={(e) => setWithdrawerName(e.target.value)}
                          className="w-full bg-white border border-gray-250 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wide block mb-1">Documento (RG/CPF)</label>
                          <input
                            type="text"
                            placeholder="Ex: 43.123.456-X"
                            value={withdrawerDoc}
                            onChange={(e) => setWithdrawerDoc(e.target.value)}
                            className="w-full bg-white border border-gray-250 rounded-xl px-3 py-1.5 text-xs focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wide block mb-1">Funcionário Entregador</label>
                          <input
                            type="text"
                            required
                            value={deliveryStaff}
                            onChange={(e) => setDeliveryStaff(e.target.value)}
                            className="w-full bg-white border border-gray-250 rounded-xl px-3 py-1.5 text-xs focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      id="btn-confirm-delivery-checkout"
                    >
                      <Check className="w-4 h-4" /> Registrar Saída da Encomenda
                    </button>
                  </form>
                )
              ) : (
                  <div className="bg-emerald-50 border border-emerald-150 p-4 rounded-xl text-xs space-y-2 flex-1 flex flex-col justify-center">
                    <span className="text-emerald-900 font-extrabold uppercase tracking-wider block font-mono flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> COMPROVANTE DE RETIRADA
                    </span>

                    <div className="text-emerald-800 space-y-1 pt-1.5 border-t border-emerald-200">
                      <p>
                        <span className="opacity-75">Entregue para:</span> <strong className="text-emerald-950">{selectedEncomenda.quemRetirou}</strong>
                      </p>
                      <p>
                        <span className="opacity-75">Liberado por:</span> <strong className="text-emerald-950">{selectedEncomenda.responsavelEntrega}</strong>
                      </p>
                      <p>
                        <span className="opacity-75">Data/Hora Saída:</span> <strong className="text-emerald-950">
                          {selectedEncomenda.dataRetirada && new Date(selectedEncomenda.dataRetirada).toLocaleString('pt-BR')}
                        </strong>
                      </p>
                    </div>

                    <div className="text-[10px] text-emerald-600 italic bg-white/60 p-2 rounded-lg border border-emerald-100 text-center mt-2 font-semibold">
                      Status encerrado com autenticação biométrica / QRCode da Portaria.
                    </div>
                  </div>
                )}

              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Subordinate standard utilities
function Trash2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}
