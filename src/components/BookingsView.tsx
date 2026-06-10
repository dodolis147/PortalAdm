import React, { useState } from 'react';
import { 
  CalendarDays, ShieldCheck, CheckCircle2, AlertCircle, ShoppingBag, Landmark, DollarSign, Ban,
  Camera, Edit, Plus, Trash2, Upload, X, Image as ImageIcon, Sparkles, Info
} from 'lucide-react';
import { Booking, CommonArea, Resident, Guest } from '../types';
import { toUpperText } from '../lib/utils';
import GuestManager from './GuestManager';

interface BookingsViewProps {
  bookings: Booking[];
  residents: Resident[];
  onAddBooking: (booking: Booking) => void;
  onCancelBooking: (id: string) => void;
  onConfirmBooking: (id: string) => void;
  onUpdateGuestStatus: (bookingId: string, guestIndex: number, newStatus: 'Entrada Liberada' | 'Presença Confirmada' | 'Presente') => void;
  onDeleteBooking: (id: string) => void;
  commonAreas: CommonArea[];
  onSaveCommonArea: (area: CommonArea) => void;
  onDeleteCommonArea: (id: string) => void;
  currentUser?: { id: string; name: string; unit?: string; role: 'Administrador' | 'Morador' | 'Porteiro' | 'MASTER' };
}

export default function BookingsView({
  bookings,
  residents,
  onAddBooking,
  onCancelBooking,
  onConfirmBooking,
  onUpdateGuestStatus,
  onDeleteBooking,
  commonAreas,
  onSaveCommonArea,
  onDeleteCommonArea,
  currentUser = { id: 'admin', name: 'Op. Ricardo Silva', role: 'Administrador' }
}: BookingsViewProps) {
  const [selectedAreaId, setSelectedAreaId] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  // States for Area creation & editing
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [editingArea, setEditingArea] = useState<CommonArea | null>(null);
  const [areaFormName, setAreaFormName] = useState('');
  const [areaFormCapacity, setAreaFormCapacity] = useState<number>(30);
  const [areaFormDescription, setAreaFormDescription] = useState('');
  const [areaFormRules, setAreaFormRules] = useState('');
  const [areaFormMonthlyLimit, setAreaFormMonthlyLimit] = useState<number | ''>('');
  const [areaFormPrice, setAreaFormPrice] = useState<number>(0);
  const [areaFormIsExempt, setAreaFormIsExempt] = useState(false);
  const [areaFormPhoto, setAreaFormPhoto] = useState<string>('');
  const [areaFormStatus, setAreaFormStatus] = useState<CommonArea['status']>('Disponível');
  const [areaFormMaintReason, setAreaFormMaintReason] = useState('');
  const [areaFormMaintStart, setAreaFormMaintStart] = useState('');
  const [areaFormMaintEnd, setAreaFormMaintEnd] = useState('');
  const [areaFormMaintObs, setAreaFormMaintObs] = useState('');

  // Form inputs
  const [areaId, setAreaId] = useState<string>('');
  const [unit, setUnit] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [startTime, setStartTime] = useState('12:00');
  const [endTime, setEndTime] = useState('18:00');
  const [guestsCount, setGuestsCount] = useState<number>(0);
  const [newGuestName, setNewGuestName] = useState('');
  const [bookingGuests, setBookingGuests] = useState<Guest[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showDoubleConfirmation, setShowDoubleConfirmation] = useState(false);
  const [lastBooking, setLastBooking] = useState<Booking | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Auto-fill unit if user has one when form opens
  React.useEffect(() => {
    if (showAddForm && currentUser?.unit) {
      setUnit(currentUser.unit);
    }
  }, [showAddForm, currentUser]);

  // States for visual date selection calendar
  const today = new Date();
  const [calMonth, setCalMonth] = useState<number>(today.getMonth());
  const [calYear, setCalYear] = useState<number>(today.getFullYear());

  const MONTH_PT = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const WEEK_DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(prev => prev - 1);
    } else {
      setCalMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(prev => prev + 1);
    } else {
      setCalMonth(prev => prev + 1);
    }
  };

  // Sync calendar month/year with manually chosen date
  React.useEffect(() => {
    if (date) {
      const parts = date.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0]);
        const m = parseInt(parts[1]) - 1; // 0-indexed
        if (!isNaN(y) && !isNaN(m)) {
          setCalYear(y);
          setCalMonth(m);
        }
      }
    }
  }, [date]);

  const handleAddGuest = () => {
    if (!newGuestName.trim()) return;
    setBookingGuests([...bookingGuests, { name: newGuestName.trim(), status: 'Pendente' }]);
    setNewGuestName('');
  };

  const handleRemoveGuest = (index: number) => {
    setBookingGuests(bookingGuests.filter((_, i) => i !== index));
  };

  const handleOpenAddArea = () => {
    setEditingArea(null);
    setAreaFormName('');
    setAreaFormCapacity(30);
    setAreaFormDescription('');
    setAreaFormRules('');
    setAreaFormMonthlyLimit('');
    setAreaFormPrice(0);
    setAreaFormIsExempt(false);
    setAreaFormPhoto('');
    setAreaFormStatus('Disponível');
    setAreaFormMaintReason('');
    setAreaFormMaintStart('');
    setAreaFormMaintEnd('');
    setAreaFormMaintObs('');
    setShowAreaModal(true);
  };

  const handleOpenEditArea = (area: CommonArea) => {
    setEditingArea(area);
    setAreaFormName(area.name);
    setAreaFormCapacity(area.capacity);
    setAreaFormDescription(area.description);
    setAreaFormRules(area.rules);
    setAreaFormMonthlyLimit(area.monthlyLimit || '');
    setAreaFormPrice(area.price);
    setAreaFormIsExempt(!!area.isExempt);
    setAreaFormPhoto(area.photoUrl || '');
    setAreaFormStatus(area.status);
    setAreaFormMaintReason(area.maintenanceReason || '');
    setAreaFormMaintStart(area.maintenanceStart || '');
    setAreaFormMaintEnd(area.maintenanceEnd || '');
    setAreaFormMaintObs(area.maintenanceObservations || '');
    setShowAreaModal(true);
  };

  const handleSaveArea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!areaFormName.trim()) {
      alert('Por favor, informe o nome do espaço de lazer.');
      return;
    }

    if (editingArea) {
      // Edit existing area
      const updatedArea = {
        ...editingArea,
        name: areaFormName.trim(),
        capacity: areaFormCapacity,
        description: areaFormDescription.trim(),
        rules: areaFormRules.trim(),
        monthlyLimit: areaFormMonthlyLimit === '' ? null : Number(areaFormMonthlyLimit),
        price: areaFormPrice,
        isExempt: areaFormIsExempt,
        photoUrl: areaFormPhoto || undefined,
        status: areaFormStatus,
        maintenanceReason: areaFormMaintReason,
        maintenanceStart: areaFormMaintStart,
        maintenanceEnd: areaFormMaintEnd,
        maintenanceObservations: areaFormMaintObs,
        lastUpdatedBy: currentUser?.name || 'Administrador',
        lastUpdatedDate: new Date().toISOString()
      };
      onSaveCommonArea(updatedArea);
      alert('Espaço de lazer atualizado com sucesso!');
    } else {
      // Create new area
      const newId = `area_${Date.now()}`;
      const newArea: CommonArea = {
        id: newId,
        name: areaFormName.trim(),
        capacity: areaFormCapacity,
        description: areaFormDescription.trim(),
        rules: areaFormRules.trim(),
        monthlyLimit: areaFormMonthlyLimit === '' ? null : Number(areaFormMonthlyLimit),
        price: areaFormPrice,
        isExempt: areaFormIsExempt,
        photoUrl: areaFormPhoto || undefined,
        status: areaFormStatus,
        maintenanceReason: areaFormMaintReason,
        maintenanceStart: areaFormMaintStart,
        maintenanceEnd: areaFormMaintEnd,
        maintenanceObservations: areaFormMaintObs,
        lastUpdatedBy: currentUser?.name || 'Administrador',
        lastUpdatedDate: new Date().toISOString()
      };
      onSaveCommonArea(newArea);
      alert('Novo espaço de lazer criado com sucesso!');
    }
    setShowAreaModal(false);
    setEditingArea(null);
  };

  const handleDeleteArea = (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir a área de lazer "${name}"? Todas as reservas existentes continuarão registradas para histórico.`)) {
      onDeleteCommonArea(id);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setAreaFormPhoto(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!areaId || !unit || !date) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (date < todayStr) {
      alert('Não é possível realizar agendamentos em datas passadas.');
      return;
    }

    const area = commonAreas.find(a => a.id === areaId);
    if (!area) return;

    // 0. Availability status check
    if (area.status && area.status !== 'Disponível') {
      setBookingError(`Indisponível: O espaço "${area.name}" está ${(area.status || 'Indeterminado').toUpperCase()} para manutenção. ${area.maintenanceReason || ''} (Previsão: ${area.maintenanceEnd || 'Indeterminado'})`);
      return;
    }

    // 1. Capacity validation
    if (guestsCount > area.capacity) {
      alert(`Erro: A capacidade máxima permitida para esta área (${area.name}) é de ${area.capacity} convidados.`);
      return;
    }

    // 2. Overlap / Double booking validation
    const hasConflict = bookings.some(b => 
      b.areaId === areaId && 
      b.date === date && 
      b.status !== 'Cancelado'
    );

    if (hasConflict) {
      setBookingError(`Indisponível: O espaço "${area.name}" já está reservado para a data selecionada (${date.split('-').reverse().join('/')}). Escolha outro dia.`);
      return;
    }

    // 3. Monthly limit validation
    if (area.monthlyLimit && area.monthlyLimit > 0) {
      const bookingMonth = date.substring(0, 7);
      const monthlyBookingsCount = bookings.filter(b =>
        b.unit === unit &&
        b.areaId === areaId &&
        b.status !== 'Cancelado' &&
        b.date.startsWith(bookingMonth)
      ).length;

      if (monthlyBookingsCount >= area.monthlyLimit) {
        setBookingError(`Limite mensal excedido: A unidade ${unit} já atingiu o limite de ${area.monthlyLimit} agendamento(s) para o espaço "${area.name}" neste mês.`);
        return;
      }
    }

    // Find Resident
    const matchedResident = residents.find(r => r.unit === unit);
    
    if (matchedResident && matchedResident.status === 'Bloqueado') {
      setBookingError(`RESERVA NEGADA: O morador responsável (${matchedResident.name}) desta unidade (${unit}) está BLOQUEADO pelo administrador. Reservas de áreas comuns são proibidas.`);
      return;
    }

    const residentName = matchedResident ? matchedResident.name : 'Morador Autônomo';

    const newBooking: Booking = toUpperText({
      id: `book-${Date.now()}`,
      areaId: areaId,
      unit,
      residentName,
      residentId: matchedResident?.id,
      date,
      startTime,
      endTime,
      guestsCount: bookingGuests.length, // Update guestsCount dynamically
      guests: bookingGuests, // New guest list
      status: currentUser.role === 'Morador' ? 'Pendente' : 'Confirmado',
      createdAt: new Date().toISOString()
    });

    onAddBooking(newBooking);
    setLastBooking(newBooking);
    setShowConfirmation(true);
    setBookingError(null);

    // Reset inputs
    setAreaId('');
    setUnit('');
    setDate('');
    setStartTime('12:00');
    setEndTime('18:00');
    setGuestsCount(0);
    setBookingGuests([]);
    setNewGuestName('');
    setShowAddForm(false);
  };

  const getAreaObj = (id: string) => commonAreas.find(a => a.id === id);

  // Dynamic calendar calculation
  const totalDays = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
  const daysGrid: (number | null)[] = [];
  
  for (let i = 0; i < firstDayIndex; i++) {
    daysGrid.push(null);
  }
  
  for (let d = 1; d <= totalDays; d++) {
    daysGrid.push(d);
  }

  return (
    <div className="space-y-6" id="bookings-management-component">
        {showConfirmation && lastBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white text-gray-900 px-8 py-6 rounded-2xl shadow-2xl max-w-sm w-full">
              <div className="flex items-center gap-3 mb-4 text-emerald-600">
                <CheckCircle2 className="w-8 h-8" />
                <h3 className="font-bold text-lg">Reserva Confirmada!</h3>
              </div>
              
              <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                 {residents.find(r => r.id === lastBooking.residentId)?.avatarUrl ? (
                   <img src={residents.find(r => r.id === lastBooking.residentId)?.avatarUrl} className="w-10 h-10 rounded-full object-cover" />
                 ) : (
                   <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-sm">
                      {lastBooking.residentName.charAt(0)}
                   </div>
                 )}
                 <div>
                    <div className="font-semibold text-sm">{lastBooking.residentName}</div>
                    <div className="text-xs text-gray-500">{lastBooking.unit}</div>
                 </div>
              </div>

              <p className="text-sm text-gray-600 mb-6 font-medium">
                {(getAreaObj(lastBooking.areaId)?.price || 0) > 0 
                  ? "Você tem 60 minutos para efetuar o pagamento do espaço, caso não realize o pagamento sua reserva será cancelada automaticamente."
                  : "Reserva realizada com sucesso."
                }
              </p>
              <button 
                onClick={() => setShowConfirmation(false)}
                className="w-full bg-emerald-600 text-white rounded-lg py-2 font-semibold hover:bg-emerald-700 cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        )}
      
      <div className="flex justify-end p-2">
        <button
          onClick={() => document.getElementById('agenda-concluida')?.scrollIntoView({ behavior: 'smooth' })}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 cursor-pointer flex items-center gap-2"
        >
          <Info className="w-4 h-4" />
          Ver Agenda Concluída
        </button>
      </div>

      {/* Upper grid panel: Areas summary list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="common-areas-bento">
        {/* Adicionar nova área (Trigger) se for Administrador ou Porteiro */}
        {(currentUser.role === 'Administrador' || currentUser.role === 'Porteiro') && (
          <div 
            onClick={handleOpenAddArea}
            className="bg-slate-50 border-2 border-dashed border-gray-200 rounded-2xl p-5 hover:border-slate-400 hover:bg-slate-100/30 transition-all cursor-pointer flex flex-col items-center justify-center text-center group h-80"
          >
            <div className="bg-white p-3 rounded-full shadow-xs group-hover:scale-110 transition-transform text-slate-500 group-hover:text-blue-600">
              <Plus className="w-6 h-6" />
            </div>
            <span className="font-extrabold text-xs text-slate-800 uppercase tracking-widest mt-3">Novo Espaço</span>
            <span className="text-[10.5px] text-zinc-400 mt-1 max-w-[180px]">
              Cadastre churrasqueira, salão, quadra ou playground
            </span>
          </div>
        )}

        {commonAreas.map((area) => (
          <div 
            key={area.id}
            onClick={() => {
              setAreaId(area.id);
              setShowAddForm(true);
            }}
            className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-slate-350 hover:shadow-2xs transition-all cursor-pointer flex flex-col justify-between group h-80 relative"
          >
            {/* Real photo or fallback elegant gradient banner */}
            <div className="h-32 w-full overflow-hidden bg-slate-100 relative shrink-0">
              {area.photoUrl ? (
                <img 
                  src={area.photoUrl} 
                  alt={area.name} 
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-linear-to-br from-slate-800 to-slate-950 flex items-center justify-center relative">
                  <span className="text-4xl filter drop-shadow-md select-none transform group-hover:scale-105 transition-transform duration-305">
                    {area.id.includes('festa') ? '🎉' : 
                     area.id.includes('churras') ? '🍖' : 
                     area.id.includes('piscina') ? '🏊' : 
                     area.id.includes('quadra') ? '⚽' : '🌟'}
                  </span>
                  <div className="absolute top-2 left-2 bg-black/40 backdrop-blur-xs text-[9px] font-extrabold uppercase tracking-wide text-white px-2 py-0.5 rounded">
                    Espaço
                  </div>
                </div>
              )}
              
              {area.status && area.status !== 'Disponível' && (
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-rose-600 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-lg animate-pulse">
                      <Ban className="w-3 h-3"/> {area.status.toUpperCase()}
                  </div>
              )}

              {/* Admin Action Buttons on photo overlay */}
              {(currentUser.role === 'Administrador' || currentUser.role === 'Porteiro') && (
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEditArea(area);
                    }}
                    className="p-1.5 bg-white/95 hover:bg-white text-slate-700 hover:text-sky-600 rounded-lg shadow-md transition-all cursor-pointer border border-gray-100"
                    title="Editar área de lazer"
                  >
                    <Edit className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteArea(area.id, area.name);
                    }}
                    className="p-1.5 bg-white/95 hover:bg-white text-slate-700 hover:text-red-600 rounded-lg shadow-md transition-all cursor-pointer border border-gray-100"
                    title="Excluir área de lazer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Content info block */}
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div className="min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="font-extrabold text-xs text-gray-950 uppercase tracking-tight leading-snug truncate pr-2" title={area.name}>
                    {area.name}
                  </h4>
                  <span className="text-[10px] shrink-0 bg-slate-50 border border-slate-100 font-bold text-slate-700 px-1.5 py-0.5 rounded">
                    Membros: {area.capacity}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 line-clamp-2 leading-normal mb-2" title={area.description}>
                  {area.description}
                </p>
                
                {area.rules && (
                  <div className="text-[9.5px] text-zinc-400 bg-zinc-50 border border-zinc-100/50 p-1 rounded-md line-clamp-1 truncate" title={area.rules}>
                    <strong className="text-[8.5px] text-slate-500 uppercase">Regra:</strong> {area.rules}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 pt-2.5 mt-3 flex items-center justify-between shrink-0">
                <span className="text-[9px] uppercase font-extrabold tracking-wider text-gray-405 flex items-center gap-1">
                  Taxa de Reserva
                </span>
                <span className="text-xs font-black text-slate-900 font-mono">
                  {area.isExempt ? 'Isento' : `R$ ${area.price.toFixed(2)}`}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Book booking and Action bar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <h3 className="text-md font-semibold text-gray-950 uppercase tracking-widest text-[#94a3b8]">Controle de Agendamentos</h3>
          <p className="text-xs text-gray-400 mt-0.5">Calendário geral de eventos internos de moradores nas áreas de lazer.</p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => {
              setBookingError(null);
              setShowAddForm(true);
            }}
            className="bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            id="btn-trigger-booking-add"
          >
            Formular Agendamento
          </button>
        )}
      </div>

      {/* Scheduler Form card */}
      {showAddForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs" id="add-booking-form">
          <div className="border-b border-gray-100 pb-3 mb-5">
            <h3 className="text-lg font-semibold text-gray-900">Formular Agendamento</h3>
            <p className="text-xs text-gray-500 mt-0.5">Associe a reserva a uma unidade ativa e confirme a data do evento.</p>
          </div>

          {bookingError && (
            <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-medium flex gap-2 items-center animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {bookingError}
              <button onClick={() => setBookingError(null)} className="ml-auto hover:text-rose-900">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <form onSubmit={handleCreateBooking} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Space Selection */}
              <div>
                <label className="text-xs font-semibold text-gray-650 uppercase block mb-1">Espaço *</label>
                <select
                  required
                  value={areaId}
                  onChange={(e) => setAreaId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
                >
                  <option value="">Selecione um espaço...</option>
                  {commonAreas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.price > 0 ? `R$ ${a.price.toFixed(2)}` : 'Isento'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Resident unit choice */}
              <div>
                <label className="text-xs font-semibold text-gray-650 uppercase block mb-1">Unidade Solicitante *</label>
                {currentUser.role === 'Morador' ? (
                  <input
                    type="text"
                    readOnly
                    value={unit}
                    className="w-full bg-gray-100 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 font-semibold"
                  />
                ) : (
                  <select
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
                  >
                    <option value="">Selecione o morador hospedeiro...</option>
                    {residents.map((r) => (
                      <option key={r.id} value={r.unit} className={r.status === 'Bloqueado' ? 'text-red-650 font-bold' : ''}>
                        {r.unit} ({r.name}){r.status === 'Bloqueado' ? ' [🚫 BLOQUEADO - RESERVA NEGADA]' : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Event date */}
              <div>
                <label className="text-xs font-semibold text-gray-650 uppercase block mb-1">Data do Evento *</label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
            </div>

            {/* Interactive Availability Calendar */}
            {areaId && (
              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 space-y-4" id="visual-date-selector-calendar">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                      <CalendarDays className="w-4 h-4 text-emerald-500 animate-pulse" /> Calendário de Disponibilidade
                    </h4>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Clique em um dia em branco disponível para selecionar a data do agendamento.</p>
                  </div>
                  
                  {/* Month Switcher Controls */}
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-3xs self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="p-1 px-3 hover:bg-slate-50 text-slate-700 hover:text-black rounded-lg text-xs font-bold transition-all cursor-pointer"
                      title="Mês Anterior"
                    >
                      &larr;
                    </button>
                    <span className="text-xs font-black uppercase font-mono px-3 text-slate-805 select-none min-w-[130px] text-center">
                      {MONTH_PT[calMonth]} {calYear}
                    </span>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="p-1 px-3 hover:bg-slate-50 text-slate-700 hover:text-black rounded-lg text-xs font-bold transition-all cursor-pointer"
                      title="Próximo Mês"
                    >
                      &rarr;
                    </button>
                  </div>
                </div>

                {/* Weekdays Labels block */}
                <div className="grid grid-cols-7 gap-1.5 text-center border-b border-slate-150 pb-2">
                  {WEEK_DAYS_PT.map((wd, i) => (
                    <span key={wd} className={`text-[10px] font-black uppercase tracking-wider font-mono ${i === 0 || i === 6 ? 'text-zinc-400' : 'text-slate-500'}`}>
                      {wd}
                    </span>
                  ))}
                </div>

                {/* Day cells grid */}
                <div className="grid grid-cols-7 gap-1.5 font-sans">
                  {daysGrid.map((dayNum, idx) => {
                    if (dayNum === null) {
                      return <div key={`empty-${idx}`} className="h-14"></div>;
                    }

                    const dateStr = `${calYear}-${(calMonth + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
                    const todayStr = new Date().toISOString().split('T')[0];
                    const isPast = dateStr < todayStr;
                    
                    const existingBooking = bookings.find(b => 
                      b.areaId === areaId && 
                      b.status !== 'Cancelado' && 
                      b.date === dateStr
                    );

                    const isCurrentUnitSelection = date === dateStr;
                    let isBooked = !!existingBooking;
                    let displayLabel = "";
                    let isClickable = !isPast && !isBooked;

                    if (isPast) {
                      displayLabel = "Passado";
                    } else if (existingBooking) {
                      displayLabel = `Unidade ${existingBooking.unit}`;
                    }

                    return (
                      <button
                        key={`day-${dayNum}`}
                        type="button"
                        disabled={!isClickable}
                        onClick={() => setDate(dateStr)}
                        className={`h-14 rounded-xl flex flex-col justify-between p-2 border transition-all text-left relative overflow-hidden group ${
                          isCurrentUnitSelection
                            ? 'bg-gradient-to-tr from-slate-900 to-slate-950 border-slate-950 text-white shadow-md'
                            : isPast
                            ? 'bg-slate-100/40 border-slate-150 text-slate-350 cursor-not-allowed opacity-60'
                            : isBooked
                            ? 'bg-rose-50 border-rose-200 text-rose-850 cursor-not-allowed'
                            : 'bg-white hover:bg-slate-55 border-slate-150 hover:border-slate-300 text-slate-800'
                        }`}
                      >
                        <span className={`text-[11px] font-bold ${isCurrentUnitSelection ? 'text-white' : 'text-slate-750 font-mono'}`}>
                          {dayNum}
                        </span>

                        {displayLabel && (
                          <span className={`text-[8px] font-black tracking-tight leading-none truncate uppercase px-1 py-0.5 rounded block max-w-full font-mono ${
                            isPast 
                              ? 'text-zinc-400 bg-zinc-100' 
                              : isBooked 
                              ? 'bg-rose-100 text-rose-750 border border-rose-200/40'
                              : ''
                          }`} title={displayLabel}>
                            {displayLabel}
                          </span>
                        )}

                        {!displayLabel && !isPast && (
                          <span className="text-[8px] font-bold opacity-0 group-hover:opacity-100 transition-opacity uppercase text-emerald-600 font-mono">
                            Reservar
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Info labels / Captain */}
                <div className="flex flex-wrap items-center gap-4 text-[9.5px] font-bold uppercase tracking-wider text-slate-600 pt-1.5 border-t border-slate-150">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-white border border-slate-200 inline-block shadow-3xs"></span>
                    <span>Disponível</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-rose-100 border border-rose-200 inline-block"></span>
                    <span>Indisponível (Outro morador)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-slate-100/40 border border-slate-150 inline-block"></span>
                    <span>Data Passada</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-black text-slate-900">
                    <span className="w-3 h-3 rounded-md bg-slate-900 inline-block shadow-3xs"></span>
                    <span>Sua Data Selecionada</span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Start hour */}
              <div>
                <label className="text-xs font-semibold text-gray-650 uppercase block mb-1">Horário de Início *</label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              {/* End hour */}
              <div>
                <label className="text-xs font-semibold text-gray-650 uppercase block mb-1">Horário de Término *</label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              {/* Guests Count */}
              <div>
                <label className="text-xs font-semibold text-gray-650 uppercase block mb-1">
                  Convidados (insira nome e clique em Adicionar)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nome do Convidado"
                    value={newGuestName}
                    onChange={(e) => setNewGuestName(e.target.value)}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500 font-sans"
                  />
                  <button 
                    type="button" 
                    onClick={handleAddGuest}
                    className="bg-sky-600 hover:bg-sky-700 text-white px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Adicionar
                  </button>
                </div>
                {bookingGuests.length > 0 && (
                  <div className="mt-2 text-xs bg-gray-50 border border-gray-100 rounded-xl p-2 max-h-32 overflow-y-auto">
                    {bookingGuests.map((guest, index) => (
                      <div key={index} className="flex justify-between items-center py-1">
                        <span>{guest.name}</span>
                        <button type="button" onClick={() => handleRemoveGuest(index)} className="text-rose-500 font-semibold text-[10px]">Remover</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-sky-50 p-3.5 rounded-xl text-xs text-sky-850 border border-sky-100 flex gap-2.5 items-start">
              <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <strong>Atenção aos termos:</strong> Ao formular a reserva, o morador assume total responsabilidade de segurança e limpeza pela integridade física do espaço e rege-se pelos regimentos de barulho internos (Selo de silêncio rigoroso após 22:00).
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-150">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => setShowDoubleConfirmation(true)}
                className="bg-slate-900 hover:bg-black text-white px-5 py-2 rounded-xl text-xs font-semibold"
              >
                Confirmar Reserva
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Double Confirmation Modal */}
      {showDoubleConfirmation && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white text-gray-900 px-8 py-6 rounded-2xl shadow-2xl max-w-sm w-full">
            <h3 className="font-bold text-lg mb-4 text-slate-800">Finalizar Reserva</h3>
            <p className="text-sm text-gray-600 mb-6">Você tem certeza que deseja finalizar a reserva? Certifique-se de que todos os convidados foram adicionados.</p>
            <div className="flex gap-2">
                <button 
                  onClick={() => setShowDoubleConfirmation(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold"
                >
                  Voltar e conferir
                </button>
                <button 
                  onClick={(e) => {
                    handleCreateBooking(e);
                    setShowDoubleConfirmation(false);
                  }}
                  className="flex-1 bg-slate-900 hover:bg-black text-white py-2 rounded-lg font-semibold"
                >
                  Confirmar Finalização
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Bookings log listings */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs" id="agenda-concluida">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Agenda Concluída de Uso</h3>
          {(currentUser.role === 'Administrador' || currentUser.role === 'MASTER' || currentUser.role === 'Porteiro') && bookings.some(b => b.date < new Date().toISOString().split('T')[0] && b.status !== 'Cancelado') && (
            <button
              onClick={() => {
                const todayStr = new Date().toISOString().split('T')[0];
                const pastBookings = bookings.filter(b => b.date < todayStr && b.status !== 'Cancelado');
                if (confirm(`Tem certeza que deseja excluir permanentemente ${pastBookings.length} agendamentos passados? Esta ação é irreversível.`)) {
                    pastBookings.forEach(b => onDeleteBooking(b.id));
                }
              }}
              className="bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-rose-100 cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpar Concluídos
            </button>
          )}
        </div>

        {bookings.length === 0 ? (
          <div className="text-center py-12">
            <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 font-medium pb-1">Nenhum evento agendado ou pendente.</p>
            <p className="text-xs text-gray-405">Formule um agendamento novo com o botão superior.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" id="bookings-history-table">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 text-xs font-semibold uppercase bg-gray-25/50">
                  <th className="py-2 px-3">Espaço Reservado</th>
                  <th className="py-2 px-3">Unidade / Solicitante</th>
                  <th className="py-2 px-3">Data do Evento</th>
                  <th className="py-2 px-3 text-center">Convidados</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150">
                {bookings.map((booking) => {
                  const area = getAreaObj(booking.areaId);
                  return (
                    <tr key={booking.id} className="hover:bg-gray-50/50 cursor-pointer">
                      
                      {/* Space identifier */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-gray-900">{area?.name || 'Área não identificada'}</div>
                        <div className="text-xs text-sky-750 font-medium">
                          {area && area.price > 0 ? `Taxa paga: R$ ${area.price.toFixed(2)}` : 'Uso gratuito'}
                        </div>
                      </td>

                      {/* Resident identity */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                           {residents.find(r => r.id === booking.residentId)?.avatarUrl ? (
                             <img src={residents.find(r => r.id === booking.residentId)?.avatarUrl} className="w-8 h-8 rounded-full object-cover" />
                           ) : (
                             <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs">
                               {booking.residentName.charAt(0)}
                             </div>
                           )}
                           <div className="flex flex-col">
                             <div className="font-semibold text-gray-800 text-xs">{booking.unit}</div>
                             <div className="text-[11px] text-gray-400 mt-0.5">{booking.residentName}</div>
                           </div>
                        </div>
                      </td>

                      {/* Event Date time ranges */}
                      <td className="py-3 px-3 font-mono text-xs text-gray-600">
                        <div className="font-bold text-gray-700">{booking.date.split('-').reverse().join('/')}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{booking.startTime} às {booking.endTime}</div>
                      </td>

                      {/* Attendee numbers */}
                      <td className="py-3 px-3 text-center text-xs font-medium text-gray-700">
                        {booking.guestsCount} / {area?.capacity}
                      </td>

                      {/* Status Badging */}
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase block w-fit ${
                          booking.status === 'Confirmado' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          booking.status === 'Pendente' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          'bg-gray-100 text-gray-400 border border-gray-150'
                        }`}>
                          {booking.status === 'Confirmado' ? 'Confirmado' : booking.status === 'Pendente' ? 'Pendente' : 'Cancelado'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Attendance button */}
                          <button
                            onClick={(e) => { e.stopPropagation(); }}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-2 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shrink-0"
                            title="Gerenciar lista de presença"
                          >
                            Presença
                          </button>

                          {booking.status === 'Pendente' && (currentUser.role === 'Administrador' || currentUser.role === 'MASTER' || currentUser.role === 'Porteiro') && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onConfirmBooking(booking.id); }}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-2 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shrink-0"
                            >
                              Aprovar
                            </button>
                          )}
                          
                          {/* Cancel button if not canceled */}
                          {booking.status !== 'Cancelado' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Confirmar cancelamento do agendamento?')) {
                                  onCancelBooking(booking.id);
                                }
                              }}
                              className="bg-amber-50 hover:bg-amber-100 text-amber-600 p-1.5 rounded-lg text-xs font-semibold flex items-center justify-center"
                              title="Cancelar Evento"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete button (Admin only) */}
                          {(currentUser.role === 'Administrador' || currentUser.role === 'MASTER' || currentUser.role === 'Porteiro') && (
                            <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Deseja excluir permanentemente este agendamento? Esta ação é irreversível.')) {
                                    onDeleteBooking(booking.id);
                                  }
                                }}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-1.5 rounded-lg text-xs font-semibold flex items-center justify-center"
                                title="Excluir Agendamento"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Area Setup / Edit Modal */}
      {showAreaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/65 backdrop-blur-xs select-none animate-fadeIn">
          <div className="bg-white rounded-2xl border border-gray-100 max-w-md w-full shadow-2xl p-6 relative overflow-hidden flex flex-col max-h-[90vh]">
            <button
              onClick={() => setShowAreaModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-gray-50 p-1.5 rounded-lg transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mb-4">
              <span className="bg-sky-50 text-sky-700 text-[9px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">
                Configuração
              </span>
              <h3 className="text-md font-extrabold text-slate-800 uppercase tracking-wider font-mono mt-1">
                {editingArea ? 'Editar Área de Lazer' : 'Cadastrar Área de Lazer'}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Altere informações, regras e inclua uma foto real do espaço do condomínio.
              </p>
            </div>

            <form onSubmit={handleSaveArea} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Nome do Espaço *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Espaço Gourmet Prime, Piscina Infantil"
                  value={areaFormName}
                  onChange={(e) => setAreaFormName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-sky-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Capacidade (Pessoas)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={areaFormCapacity}
                    onChange={(e) => setAreaFormCapacity(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">
                    Taxa de Uso (R$) 
                    <label className="ml-2 inline-flex items-center gap-1 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={areaFormIsExempt}
                            onChange={(e) => setAreaFormIsExempt(e.target.checked)}
                        />
                        <span className="text-[9px] font-bold text-sky-700">ISENTA</span>
                    </label>
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    disabled={areaFormIsExempt}
                    value={areaFormIsExempt ? 0 : areaFormPrice}
                    onChange={(e) => setAreaFormPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-sky-500 font-mono disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Descrição</label>
                <textarea
                  placeholder="Detalhes sobre a mobília, equipamentos ou infraestrutura..."
                  value={areaFormDescription}
                  onChange={(e) => setAreaFormDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-sky-500 resize-none font-medium"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Limite Mensal por Morador (Vezes)</label>
                <input
                  type="number"
                  placeholder="Ex: 2 (Vazio para sem limite)"
                  value={areaFormMonthlyLimit === '' ? '' : areaFormMonthlyLimit}
                  onChange={(e) => setAreaFormMonthlyLimit(e.target.value === '' ? '' : Number(e.target.value))}
                  min="1"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-sky-500 font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Regras e Normas de Uso</label>
                <textarea
                  placeholder="Ex: Proibido som alto após as 22h, taxa de limpeza extra..."
                  value={areaFormRules}
                  onChange={(e) => setAreaFormRules(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-sky-500 resize-none font-medium"
                />
              </div>

              {/* Real Space Photo Upload and Preview */}
              <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl space-y-3">
                <label className="text-[10px] font-semibold text-gray-500 uppercase block">Status e Manutenção</label>
                <select
                    value={areaFormStatus}
                    onChange={(e) => setAreaFormStatus(e.target.value as CommonArea['status'])}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-sky-500 font-bold"
                >
                  <option value="Disponível">Disponível</option>
                  <option value="Em Manutenção">Em Manutenção</option>
                  <option value="Bloqueada">Bloqueada</option>
                </select>

                {(areaFormStatus === 'Em Manutenção' || areaFormStatus === 'Bloqueada') && (
                    <>
                        <input
                            type="text"
                            placeholder="Motivo da manutenção ou bloqueio..."
                            value={areaFormMaintReason}
                            onChange={(e) => setAreaFormMaintReason(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-sky-500"
                        />
                        <div className="grid grid-cols-2 gap-2">
                           <input
                                type="date"
                                placeholder="Início"
                                value={areaFormMaintStart}
                                onChange={(e) => setAreaFormMaintStart(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-sky-500 font-mono"
                            />
                            <input
                                type="date"
                                placeholder="Término Previsto"
                                value={areaFormMaintEnd}
                                onChange={(e) => setAreaFormMaintEnd(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-sky-500 font-mono"
                            />
                        </div>
                         <textarea
                            placeholder="Observações adicionais..."
                            value={areaFormMaintObs}
                            onChange={(e) => setAreaFormMaintObs(e.target.value)}
                            rows={2}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-sky-500 font-medium"
                        />
                    </>
                )}
                
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide block flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5 text-zinc-500" /> Foto Real do Espaço
                </span>

                <div className="flex gap-3 items-center">
                  <div className="w-20 h-20 rounded-lg bg-white border border-gray-150 overflow-hidden shrink-0 flex items-center justify-center relative shadow-inner">
                    {areaFormPhoto ? (
                      <img 
                        src={areaFormPhoto} 
                        alt="Preview" 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-zinc-300" />
                    )}
                    {areaFormPhoto && (
                      <button
                        type="button"
                        onClick={() => setAreaFormPhoto('')}
                        className="absolute top-1 right-1 bg-black/60 hover:bg-black p-0.5 rounded text-white cursor-pointer"
                        title="Remover foto"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex-1 space-y-1">
                    <label className="inline-flex items-center gap-1.5 bg-white border border-gray-250 hover:border-gray-350 text-slate-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg cursor-pointer shadow-xs transition-colors">
                      <Upload className="w-3.5 h-3.5" /> Enviar Foto Real
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handlePhotoUpload} 
                        className="hidden" 
                      />
                    </label>
                    <p className="text-[9px] text-zinc-400">
                      Formatos recomendados: JPG, PNG. O arquivo será salvo localmente. Envie a foto real da área de lazer como churrasqueira, piscina, quadra, etc.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAreaModal(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-black text-white px-5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-sky-400 font-bold animate-pulse" /> Salvar Espaço
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
