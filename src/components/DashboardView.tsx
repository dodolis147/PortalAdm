import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar, AlertTriangle, Shield, Package, CheckCircle2, Laptop, Signal,
  Palette, Sliders, X, QrCode
} from 'lucide-react';
import { Resident, Visitor, Booking, Incident, Encomenda, CommonArea, ThemeSettings } from '../types';
import IncidentDetailsModal from './IncidentDetailsModal';
import { ProceduralQRCode } from './ProceduralQRCode';
import MercosulPlate from './MercosulPlate';
import { getDurationLabel } from './VisitorsView';

// ... (existing code)

const PaymentCountdown = ({ createdAt }: { createdAt: string }) => {
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    const passed = Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / 60000);
    return 60 - passed;
  });

  useEffect(() => {
    const interval = setInterval(() => {
        const passed = Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / 60000);
        setTimeLeft(60 - passed);
    }, 60000);
    return () => clearInterval(interval);
  }, [createdAt]);

  if (timeLeft <= 0) return <span className="text-rose-600 font-bold">Expirado</span>;
  return <span className="text-amber-600 font-bold">{timeLeft} min para pagar</span>;
};

interface DashboardViewProps {
  residents: Resident[];
  visitors: Visitor[];
  bookings: Booking[];
  incidents: Incident[];
  commonAreas: CommonArea[]; // Added this
  onCheckOutVisitor: (id: string) => void;
  onAddVisitor: (visitor: Omit<Visitor, 'id' | 'createdAt' | 'entryTime' | 'exitTime' | 'status'>) => void;
  currentUser: { id: string; name: string; unit?: string; role: 'MASTER' | 'Administrador' | 'Porteiro' | 'Morador' };
  encomendas?: Encomenda[];
  onlineResidentIds?: string[];
  onToggleResidentOnline?: (id: string) => void;
  onTriggerCancela?: (name: string, plate?: string) => void;
  onOpenQRScanner?: () => void;
  themeSettings: ThemeSettings;
}

export default function DashboardView({
  residents,
  visitors,
  bookings,
  incidents,
  commonAreas, // Added this
  onCheckOutVisitor,
  onAddVisitor,
  currentUser,
  encomendas = [],
  onlineResidentIds = [],
  onToggleResidentOnline,
  onTriggerCancela,
  onOpenQRScanner,
  themeSettings
}: DashboardViewProps) {
  const isMorador = currentUser.role === 'Morador';
  const myUnit = currentUser.unit || '';
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [visitorName, setVisitorName] = React.useState('');
  const [visitorDocument, setVisitorDocument] = React.useState('');
  const [visitorType, setVisitorType] = React.useState<'Regular' | 'Prestador' | 'Entrega' | 'Parente'>('Regular');
  const [validityDuration, setValidityDuration] = React.useState<string>('');
  // ...
const [selectedBookingForDetails, setSelectedBookingForDetails] = React.useState<Booking | null>(null);
const [selectedIncident, setSelectedIncident] = React.useState<Incident | null>(null);
const [lprPlate, setLprPlate] = React.useState('');
  const [activeQrCodeVisitor, setActiveQrCodeVisitor] = useState<Visitor | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showAddForm) setShowAddForm(false);
        if (selectedBookingForDetails) setSelectedBookingForDetails(null);
        if (selectedIncident) setSelectedIncident(null);
        if (activeQrCodeVisitor) setActiveQrCodeVisitor(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddForm, selectedBookingForDetails, selectedIncident, activeQrCodeVisitor]);

  // Auto-authenticate LPR
  React.useEffect(() => {
    if (lprPlate.length === 7) {
      const plate = lprPlate.toUpperCase();
      
      // Check residents
      const resMatch = residents.find(r => (r.vehicles || []).some(v => v.plate.toUpperCase() === plate));
      if (resMatch) {
          onTriggerCancela?.(`LPR Automático: Morador ${resMatch.name} (${resMatch.unit})`, plate);
          setLprPlate(''); 
          return;
      }
      
      // Check visitors
      const visMatch = visitors.find(v => v.vehiclePlate && v.vehiclePlate.toUpperCase() === plate);
      if (visMatch) {
          onTriggerCancela?.(`LPR Automático: Visitante ${visMatch.name}`, plate);
          setLprPlate(''); 
      }
    }
  }, [lprPlate, residents, visitors, onTriggerCancela]);

  // Filter visitors to match unit if Morador
  const activeVisitors = visitors.filter(v => 
    v.status === 'Dentro' && 
    (!isMorador || v.unitToVisit === myUnit)
  );
  
  const handleAddVisitorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validityDuration) {
      alert('Por favor, selecione o Tempo de Liberação / Validade (campo obrigatório).');
      return;
    }
    onAddVisitor({
      name: visitorName,
      document: visitorDocument,
      phone: '',
      type: visitorType,
      unitToVisit: myUnit,
      hostName: currentUser.name,
      company: '',
      vehiclePlate: '',
      notes: '',
      validityDuration: validityDuration
    });
    setVisitorName('');
    setVisitorDocument('');
    setVisitorType('Regular');
    setValidityDuration('');
    setShowAddForm(false);
  };

  // Filter pending incidents
  const pendingIncidents = incidents.filter(i => 
    i.status === 'Aberto' && 
    (!isMorador || i.unit.toLowerCase().replace(/\s+/g, '') === myUnit.toLowerCase().replace(/\s+/g, ''))
  );
  
  // Filter all incidents for the resident
  const myIncidents = incidents.filter(i => {
    const isOwner = !isMorador || i.unit.toLowerCase().replace(/\s+/g, '') === myUnit.toLowerCase().replace(/\s+/g, '');
    if (isMorador && !isOwner) {
       console.log(`[DEBUG] Incident ID ${i.id} (unit: '${i.unit}') does NOT match my unit ('${myUnit}')`);
    } else if (isMorador) {
       console.log(`[DEBUG] Incident ID ${i.id} (unit: '${i.unit}') MATCHES my unit ('${myUnit}')`);
    }
    return isOwner;
  });

  if (isMorador) {
      console.log("[DEBUG] Current user:", currentUser, "My Unit:", myUnit);
      console.log("[DEBUG] All incidents count:", incidents.length);
      console.log("[DEBUG] My Incidents count:", myIncidents.length);
  }

  const todayStr = '2026-05-27'; // Fixed system time for consistent mock behavior
  
  // Filter today's bookings
  const todayBookings = bookings.filter(b => 
    b.date === todayStr && 
    b.status === 'Confirmado' &&
    (!isMorador || b.unit === myUnit)
  );

  // Check for monthly booking limit (1 per area)
  const currentMonth = todayStr.substring(0, 7); // YYYY-MM
  const myMonthlyBookings = bookings.filter(b => 
    b.unit === myUnit && 
    (b.status === 'Confirmado' || b.status === 'Pendente') &&
    b.date.startsWith(currentMonth)
  );

  const exceededAreas = commonAreas.filter(area => {
    const bookingsForArea = myMonthlyBookings.filter(b => b.areaId === area.id);
    return bookingsForArea.length > 1;
  });

  // Compute pending packages for their unit
  const myPendingEncomendas = encomendas.filter(enc => 
    enc.status === 'Pendente'
  );

  return (
    <div className="space-y-6" id="dashboard-container">
      
      {isMorador && exceededAreas.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-300 text-rose-900 p-6 rounded-2xl shadow-lg font-semibold text-base flex items-start gap-4 mb-6 ring-2 ring-rose-200">
           <AlertTriangle className="w-8 h-8 shrink-0 text-rose-600" />
           <div>
             <span className="block font-extrabold text-lg mb-1">Limite mensal excedido!</span>
             <p className="text-rose-800">
               Você já realizou mais de um agendamento para {exceededAreas.map(a => `"${a.name}"`).join(', ')} neste mês. 
               <br />
               <span className="font-bold">Só é permitido uma reserva por mês para cada área.</span>
             </p>
           </div>
        </div>
      )}

      {isMorador && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Convidar Visitante</h3>
            <button
               onClick={() => setShowAddForm(!showAddForm)}
               className="bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-semibold"
            >
              {showAddForm ? 'Cancelar' : 'Convidar Novo'}
            </button>
          </div>
          {showAddForm && (
            <form onSubmit={handleAddVisitorSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <input type="text" placeholder="Nome do Visitante" value={visitorName} onChange={e => setVisitorName(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm" required />
              <input type="text" placeholder="Documento (CPF/RG)" value={visitorDocument} onChange={e => setVisitorDocument(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm" required />
              <select value={visitorType} onChange={e => setVisitorType(e.target.value as any)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="Regular">Visitante</option>
                <option value="Prestador">Prestador</option>
                <option value="Entrega">Entrega</option>
                <option value="Parente">Parente</option>
              </select>
              <select value={validityDuration} onChange={e => setValidityDuration(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm" required>
                <option value="">Selecione a Validade *</option>
                <option value="3h">Validade: 3 Horas</option>
                <option value="6h">Validade: 6 Horas</option>
                <option value="12h">Validade: 12 Horas</option>
                <option value="24h">Validade: 24 Horas</option>
                <option value="3d">Validade: 3 Dias</option>
                <option value="5d">Validade: 5 Dias</option>
                <option value="7d">Validade: 7 Dias</option>
              </select>
              <button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white rounded-lg py-2 text-sm font-semibold">Convidar</button>
            </form>
          )}
        </div>
      )}
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Metric CARD 1 */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between" id="metric-card-visitors">
          <div>
            <span className="text-xs font-medium text-gray-500 block uppercase tracking-wider">Presentes no Momento</span>
            <span className="text-3xl font-semibold text-gray-900 mt-1 block">{activeVisitors.length}</span>
            <span className="text-[11px] text-gray-400 mt-2 block">Visitantes/Prestadores dentro</span>
          </div>
          <div className="p-3.5 bg-sky-50 text-sky-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Metric CARD 2 */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between" id="metric-card-bookings">
          <div>
            <span className="text-xs font-medium text-gray-500 block uppercase tracking-wider">Reservas Hoje</span>
            <span className="text-3xl font-semibold text-gray-900 mt-1 block">{todayBookings.length}</span>
            <span className="text-[11px] text-gray-400 mt-2 block">Áreas comuns reservadas hoje</span>
          </div>
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* Metric CARD 3 */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between" id="metric-card-incidents">
          <div>
            <span className="text-xs font-medium text-gray-500 block uppercase tracking-wider">Ocorrências Abertas</span>
            <span className="text-3xl font-semibold text-gray-900 mt-1 block">{pendingIncidents.length}</span>
            <span className="text-[11px] text-amber-600 font-medium mt-2 block flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Requerem atenção
            </span>
          </div>
          <div className="p-3.5 bg-amber-50 text-amber-600 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Metric CARD 4 */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between" id="metric-card-encomendas">
          <div>
            <span className="text-xs font-medium text-gray-500 block uppercase tracking-wider">
              {isMorador ? 'Minhas Encomendas' : 'Encomendas na Guarita'}
            </span>
            <span className="text-3xl font-semibold text-gray-900 mt-1 block">
              {myPendingEncomendas.length}
            </span>
            <span className="text-[11px] text-indigo-600 font-medium mt-2 block flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full bg-indigo-500 ${myPendingEncomendas.length > 0 ? 'animate-pulse' : ''}`}></span>
              {myPendingEncomendas.length > 0 ? 'Aguardando retirada' : 'Sem pacotes pendentes'}
            </span>
          </div>
          <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Interactive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Tower Summary & Active Visitors */}
        <div className="lg:col-span-2 space-y-6">

          {/* Tower Summary */}
          {!isMorador && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(themeSettings.towerNames || ['Torre 1', 'Torre 2', 'Torre 3']).map(tower => {
                const count = residents.filter(r => r.unit.includes(tower)).length;
                return (
                  <div key={tower} className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">{tower}</span>
                    <span className="text-xl font-black text-gray-900 block mt-1">{count} <span className="text-xs font-medium text-gray-400">moradores</span></span>
                  </div>
                );
              })}
            </div>
          )}
        
          {/* Recently checked in list (Dentro do Condomínio) - ONLY FOR ADMINISTRADOR/PORTEIRO */}
          {!isMorador && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-6" id="active-visitors-table">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Pessoas Presentes no Condomínio</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Visitantes e prestadores que estão circulando nas áreas internas.</p>
                </div>
                <span className="bg-sky-50 text-sky-700 font-semibold px-2.5 py-1 rounded-full text-xs">
                  {activeVisitors.length} no momento
                </span>
              </div>
              
              <div className="flex gap-2 mb-4">
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Simular LPR:</span>
                    <input 
                      type="text" 
                      placeholder="ABC1D23" 
                      value={lprPlate} 
                      onChange={e => setLprPlate(e.target.value)} 
                      className="w-20 bg-transparent text-xs font-mono focus:outline-none"
                    />
                    <button 
                      onClick={() => onTriggerCancela?.('Placa LPR', lprPlate)} 
                      className="text-[9px] bg-emerald-600 text-white px-2 py-0.5 rounded cursor-pointer hover:bg-emerald-700"
                    >
                      OK
                    </button>
                  </div>
              </div>

              {activeVisitors.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-xl" id="no-active-visitors">
                  <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 font-medium">Nenhum visitante ativo detectado.</p>
                  <p className="text-xs text-gray-400 mt-1">Dê check-in na guia de acesso de Visitantes.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm" id="active-visitors-grid">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 font-medium text-xs uppercase bg-gray-25/50">
                        <th className="py-2.5 px-3">Nome</th>
                        <th className="py-2.5 px-3">Tipo</th>
                        <th className="py-2.5 px-3">Destino (Unidade)</th>
                        <th className="py-2.5 px-3">Horário Entrada</th>
                        <th className="py-2.5 px-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150">
                      {activeVisitors.map((visitor) => (
                        <tr key={visitor.id} className="hover:bg-gray-50/50">
                          <td className="py-3 px-3">
                            <div className="font-semibold text-gray-900">{visitor.name}</div>
                            <div className="text-xs text-gray-400 font-mono">Doc: {visitor.document}</div>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                              visitor.type === 'Entrega' ? 'bg-amber-50 text-amber-700' :
                              visitor.type === 'Prestador' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {visitor.type === 'Entrega' ? 'Entrega' : visitor.type === 'Prestador' ? 'Prestador' : 'Visita'}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="text-xs font-bold text-sky-700 tracking-tight">{visitor.unitToVisit}</div>
                            <div className="text-[11px] font-bold text-emerald-600 italic flex items-center gap-1 mt-0.5">
                              {residents.find(r => r.name === visitor.hostName)?.avatarUrl ? (
                                <img 
                                  src={residents.find(r => r.name === visitor.hostName)?.avatarUrl} 
                                  alt={visitor.hostName} 
                                  className="w-4 h-4 rounded-full object-cover border border-emerald-200"
                                />
                              ) : (
                                <span className="text-[9px]">👤</span>
                              )}
                              {visitor.hostName}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-xs text-gray-500 font-mono">
                            {visitor.entryTime ? new Date(visitor.entryTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => onCheckOutVisitor(visitor.id)}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer"
                            >
                              Dar Saída
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Morador: Meus Convites */}
          {isMorador && (
            <div className="space-y-6">

              <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-6" id="my-invites-table">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Meus Convites</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Status dos visitantes convidados por esta unidade.</p>
                  </div>
                </div>
                
                {visitors.filter(v => v.unitToVisit === myUnit).length === 0 ? (
                  <div className="text-center py-10 bg-gray-50 rounded-xl" id="no-my-invites">
                    <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 font-medium">Nenhum convidado recente.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm" id="my-invites-grid">
                      <thead>
                        <tr className="border-b border-gray-100 text-gray-400 font-medium text-xs uppercase bg-gray-25/50">
                          <th className="py-2.5 px-3">Nome</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Tipo</th>
                          <th className="py-2.5 px-3">Data</th>
                          <th className="py-2.5 px-3 text-center">QR</th>
                          <th className="py-2.5 px-3 text-right">Código</th>
                          <th className="py-2.5 px-3 text-right">Compartilhar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-150">
                        {visitors.filter(v => v.unitToVisit === myUnit).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((visitor) => (
                          <tr key={visitor.id} className="hover:bg-gray-50/50">
                            <td className="py-3 px-3">
                              <div 
                                className="font-semibold text-gray-900 cursor-pointer hover:text-sky-700"
                                onClick={() => setActiveQrCodeVisitor(visitor)}
                              >
                                {visitor.name}
                              </div>
                              {(visitor.autoReleased || (visitor.notes && visitor.notes.includes('Liberação Automática'))) && (
                                <div className="mt-1">
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-red-200 bg-red-450/10 text-red-750 text-[9px] font-bold font-sans uppercase animate-pulse leading-none">
                                    🚨 Liberação Automática do Sistema
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase whitespace-nowrap ${
                                visitor.status === 'Dentro' ? 'bg-emerald-50 text-emerald-700' :
                                visitor.status === 'Pre-Autorizado' ? 'bg-sky-50 text-sky-700' : 
                                visitor.status === 'Saiu' ? 'bg-gray-50 text-gray-600' : 'bg-rose-50 text-rose-700'
                              }`}>
                                {visitor.status === 'Pre-Autorizado' ? 'PRE-AUT' : visitor.status}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                               <span className="text-xs text-gray-600">{visitor.type}</span>
                            </td>
                            <td className="py-3 px-3 text-right text-xs text-gray-500 font-mono">
                              {new Date(visitor.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                            </td>
                            <td className="py-3 px-3 text-center cursor-pointer" onClick={() => setActiveQrCodeVisitor(visitor)}>
                               <ProceduralQRCode value={`express-${visitor.id}`} size={32} />
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-slate-700">
                               {visitor.exitCode || '---'}
                            </td>
                            <td className="py-3 px-3 text-right">
                               <div className="flex gap-1 justify-end">
                                 <button
                                   onClick={() => {
                                      const createdAt = new Date(visitor.createdAt);
                                      const dataVisita = createdAt.toLocaleDateString('pt-BR');
                                      const horarioVisita = createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                      const validade = visitor.expirationTime ? new Date(visitor.expirationTime).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Não definido';
                                      const message = `🏢 ${themeSettings.appName}\n\nCONVITE DE ACESSO\n\nVisitante: ${visitor.name}\nTipo: ${visitor.type}\nData: ${dataVisita}\nHorário: ${horarioVisita}\n\nUnidade: ${visitor.unitToVisit}\nResponsável: ${visitor.hostName}\n\nCódigo de Acesso: ${visitor.exitCode}\n\nApresente este código ou o QR Code na portaria para liberação do acesso.\n\nValidade: ${validade}\n\nObrigado.\n\nQR Code:\nhttps://sistema.com/convite/express-${visitor.id}`;
                                      navigator.clipboard.writeText(message);
                                      alert('Convite copiado!');
                                   }}
                                   className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-1 rounded cursor-pointer"
                                 >
                                   Copiar
                                 </button>
                                 <button 
                                   onClick={() => {
                                      const createdAt = new Date(visitor.createdAt);
                                      const dataVisita = createdAt.toLocaleDateString('pt-BR');
                                      const horarioVisita = createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                      const validade = visitor.expirationTime ? new Date(visitor.expirationTime).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Não definido';
                                      const message = `🏢 ${themeSettings.appName}\n\nCONVITE DE ACESSO\n\nVisitante: ${visitor.name}\nTipo: ${visitor.type}\nData: ${dataVisita}\nHorário: ${horarioVisita}\n\nUnidade: ${visitor.unitToVisit}\nResponsável: ${visitor.hostName}\n\nCódigo de Acesso: ${visitor.exitCode}\n\nApresente este código ou o QR Code na portaria para liberação do acesso.\n\nValidade: ${validade}\n\nObrigado.\n\nQR Code:\nhttps://sistema.com/convite/express-${visitor.id}`;
                                      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
                                   }}
                                   className="text-[9px] bg-[#25D366] text-white px-1.5 py-1 rounded cursor-pointer"
                                 >
                                   WhatsApp
                                 </button>
                                 {navigator.share && (
                                   <button
                                     onClick={async () => {
                                      const createdAt = new Date(visitor.createdAt);
                                      const dataVisita = createdAt.toLocaleDateString('pt-BR');
                                      const horarioVisita = createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                      const validade = visitor.expirationTime ? new Date(visitor.expirationTime).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Não definido';
                                      const message = `🏢 ${themeSettings.appName}\n\nCONVITE DE ACESSO\n\nVisitante: ${visitor.name}\nTipo: ${visitor.type}\nData: ${dataVisita}\nHorário: ${horarioVisita}\n\nUnidade: ${visitor.unitToVisit}\nResponsável: ${visitor.hostName}\n\nCódigo de Acesso: ${visitor.exitCode}\n\nApresente este código ou o QR Code na portaria para liberação do acesso.\n\nValidade: ${validade}\n\nObrigado.\n\nQR Code:\nhttps://sistema.com/convite/express-${visitor.id}`;
                                      try {
                                        await navigator.share({ title: 'Convite de Acesso', text: message });
                                      } catch (err) {
                                        console.error('Erro ao compartilhar:', err);
                                      }
                                     }}
                                     className="text-[9px] bg-sky-600 text-white px-1.5 py-1 rounded cursor-pointer"
                                     >
                                     Compartilhar
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

              <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-6" id="my-incidents-table">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Minhas Ocorrências</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Histórico de ocorrências registradas pela sua unidade.</p>
                  </div>
                </div>
                
                {myIncidents.length === 0 ? (
                  <div className="text-center py-10 bg-gray-50 rounded-xl" id="no-my-incidents">
                    <AlertTriangle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 font-medium">Nenhuma ocorrência registrada.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm" id="my-incidents-grid">
                      <thead>
                        <tr className="border-b border-gray-100 text-gray-400 font-medium text-xs uppercase bg-gray-25/50">
                          <th className="py-2.5 px-3">Título</th>
                          <th className="py-2.5 px-3">Categoria</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Data</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-150">
                        {myIncidents.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((incident) => (
                          <tr key={incident.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => setSelectedIncident(incident)}>
                            <td className="py-3 px-3">
                              <div className="font-semibold text-gray-900">{incident.title}</div>
                              <div className="text-[10px] text-gray-500 mt-1 italic">
                                  {(incident.replies || []).length > 0 ? (
                                      <span className="text-sky-700 font-semibold italic">Última tratativa: {((incident.replies || [])[(incident.replies || []).length - 1].content).substring(0, 40)}...</span>
                                  ) : "Nenhuma resposta ainda."}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                               <span className="text-xs text-gray-600">{incident.category}</span>
                            </td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                                incident.status === 'Resolvido' ? 'bg-emerald-50 text-emerald-700' :
                                incident.status === 'Em Andamento' ? 'bg-sky-50 text-sky-700' : 
                                'bg-amber-50 text-amber-700'
                              }`}>
                                {incident.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right text-xs text-gray-500 font-mono">
                              {new Date(incident.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {selectedIncident && <IncidentDetailsModal incident={selectedIncident} onClose={() => setSelectedIncident(null)} />}

              <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-6" id="my-encomendas-table">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Encomendas</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Histórico de todas as encomendas por status no condomínio.</p>
                  </div>
                </div>
                
                {encomendas.length === 0 ? (
                  <div className="text-center py-10 bg-gray-50 rounded-xl" id="no-my-encomendas">
                    <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 font-medium">Nenhuma encomenda registrada.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Pendentes Section */}
                    <div>
                        <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">Aguardando Retirada</h4>
                        {encomendas.filter(enc => enc.status !== 'Entregue').length === 0 ? (
                          <p className="text-xs text-slate-400 italic">Nenhuma encomenda pendente.</p>
                        ) : (
                           <div className="overflow-x-auto border border-amber-100 rounded-xl bg-amber-50/20">
                             <table className="w-full text-left text-sm">
                               <tbody className="divide-y divide-amber-100">
                                {encomendas.filter(enc => enc.status !== 'Entregue')
                                  .sort((a,b) => new Date(b.dataRecebimento).getTime() - new Date(a.dataRecebimento).getTime())
                                  .map((enc) => (
                                    <tr key={enc.id} className="hover:bg-amber-50/50">
                                      <td className="py-3 px-3 font-semibold text-gray-900">{enc.codigoRastreio}</td>
                                      <td className="py-3 px-3 text-xs text-gray-500 font-mono">{enc.torre} - Apt {enc.apartamento}</td>
                                      <td className="py-3 px-3 text-right text-xs text-amber-700 font-bold">{enc.status}</td>
                                    </tr>
                                  ))}
                               </tbody>
                             </table>
                           </div>
                        )}
                    </div>

                    {/* Entregues Section */}
                    <div>
                        <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">Entregues</h4>
                        {encomendas.filter(enc => enc.status === 'Entregue').length === 0 ? (
                          <p className="text-xs text-slate-400 italic">Nenhuma encomenda entregue.</p>
                        ) : (
                           <div className="overflow-x-auto border border-emerald-100 rounded-xl bg-emerald-50/20">
                             <table className="w-full text-left text-sm">
                               <tbody className="divide-y divide-emerald-100">
                                {encomendas.filter(enc => enc.status === 'Entregue')
                                  .sort((a,b) => new Date(b.dataRecebimento).getTime() - new Date(a.dataRecebimento).getTime())
                                  .slice(0, 5) // Last 5
                                  .map((enc) => (
                                    <tr key={enc.id} className="hover:bg-emerald-50/50">
                                      <td className="py-3 px-3 font-semibold text-gray-900">{enc.codigoRastreio}</td>
                                      <td className="py-3 px-3 text-xs text-gray-500 font-mono">{enc.torre} - Apt {enc.apartamento}</td>
                                      <td className="py-3 px-3 text-right text-xs text-emerald-700 font-bold">{enc.status}</td>
                                    </tr>
                                  ))}
                               </tbody>
                             </table>
                           </div>
                        )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          </div>

        {/* Right Column: General Notice Summary */}
        <div className="space-y-6">
          
          {/* Live Online Residents Panel */}
          {currentUser.role === 'Administrador' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4 shadow-xs" id="dashboard-online-panel">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider font-mono">Moradores Online no App</h4>
                </div>
                <span className="bg-emerald-50 text-emerald-700 font-extrabold px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider">
                  {residents.filter(r => onlineResidentIds.includes(r.id)).length} Ativos
                </span>
              </div>

              {residents.filter(r => onlineResidentIds.includes(r.id)).length === 0 ? (
                <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                  <p className="text-xs text-zinc-400 font-medium">Nenhum morador conectado no momento.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {residents.filter(r => onlineResidentIds.includes(r.id)).map((r) => (
                    <div key={r.id} className="flex items-center justify-between bg-emerald-50/10 border border-emerald-100/30 p-2.5 rounded-xl text-xs hover:border-emerald-200/50 transition-all">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Round Avatar and Green dot overlay */}
                        <div className="relative shrink-0">
                          {r.avatarUrl ? (
                            <img 
                              src={r.avatarUrl} 
                              alt={r.name} 
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 rounded-full object-cover border-2 border-emerald-500/50"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-900 border border-emerald-500 text-white font-black text-[9px] flex items-center justify-center uppercase">
                              {r.name.split(' ').filter(word => !word.toLowerCase().startsWith('dra.') && !word.toLowerCase().startsWith('dr.')).map(n => n[0]).filter(Boolean).slice(0, 2).join('') || 'MR'}
                            </div>
                          )}
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border border-white rounded-full"></span>
                        </div>
                        
                        <div className="min-w-0">
                          <div className="font-extrabold text-slate-800 truncate flex items-center gap-1">
                            <span>{r.name.split(' ')[0]} {r.name.split(' ').slice(-1)[0]}</span>
                            {currentUser.id === r.id && (
                              <span className="bg-sky-50 text-sky-700 text-[7px] px-1 rounded font-black uppercase tracking-wider border border-sky-100 scale-90">Você</span>
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-400 font-mono font-bold uppercase block">{r.unit}</span>
                        </div>
                      </div>

                      {onToggleResidentOnline && (
                        <button
                          type="button"
                          onClick={() => onToggleResidentOnline(r.id)}
                          className="text-[9px] text-zinc-400 hover:text-red-650 hover:bg-rose-50 hover:border-rose-200 hover:border border border-transparent px-2 py-1 rounded-lg transition-all cursor-pointer"
                          title="Simular fechamento do app / Desconectar"
                        >
                          Sair
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Simulated Connect block - WAS REMOVED AS REQUESTED BY USER */}
            </div>
          )}


          {/* Quick Stats on bookings/incidents */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4 shadow-xs" id="dashboard-notice-panel">
            <h4 className="text-sm font-semibold text-gray-950 uppercase tracking-widest text-slate-400">Próximos Compromissos</h4>
            
            <div className="space-y-3">
              <span className="text-xs font-semibold text-gray-900 block border-b border-gray-100 pb-2">
                {isMorador ? 'Minhas Reservas Ativas' : 'Reservas Confirmadas nos Próximos Dias'}
              </span>
              {bookings.filter(b => (b.status === 'Confirmado' || b.status === 'Pendente') && (!isMorador || b.unit === myUnit)).length === 0 ? (
                 <p className="text-xs text-gray-400 italic">Nenhuma reserva ativa encontrada.</p>
              ) : (
                bookings.filter(b => (b.status === 'Confirmado' || b.status === 'Pendente') && (!isMorador || b.unit === myUnit)).slice(0, 5).map((b) => {
                const area = commonAreas.find(a => a.id === b.areaId);
                const resident = residents.find(r => r.id === b.residentId);
                return (
                  <div key={b.id} className="p-3 bg-gray-50 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => setSelectedBookingForDetails(b)}>
                    {/* Avatar + Resident Info */}
                    <div className="flex items-center gap-2">
                      {resident?.avatarUrl ? (
                         <img src={resident.avatarUrl} alt={b.residentName} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                         <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs">
                           {b.residentName.charAt(0)}
                         </div>
                      )}
                      <div>
                        <div className="text-xs font-bold text-slate-800">{b.residentName}</div>
                        <div className="text-[10px] text-slate-500">{b.unit}</div>
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col items-end">
                      <div className="text-xs font-semibold text-gray-900">
                        {area?.name || b.areaId}
                      </div>
                      <div className="text-[10px] font-mono font-bold text-sky-700">
                        {b.date.split('-').reverse().join('/')} | {b.startTime} - {b.endTime}
                      </div>
                      <span className="text-[10px] text-gray-500 block mt-0.5 flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded-md font-bold text-[9px] ${b.status === 'Pendente' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{b.status}</span>
                        {b.status === 'Pendente' && b.createdAt && (
                          <PaymentCountdown createdAt={b.createdAt} />
                        )}
                      </span>
                    </div>
                  </div>
                );
              })
              )}
              
              {/* Painel Completo de Agendamentos (Administrador) */}
              {!isMorador && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-950 uppercase tracking-widest text-slate-800 mb-4">Agenda Completa</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {bookings.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(b => (
                      <div key={b.id} className="text-[11px] p-2 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                        <span className="font-bold">{b.date.split('-').reverse().join('/')} - {b.areaId}</span>
                        <span className={b.status === 'Confirmado' ? 'text-emerald-600' : 'text-amber-600'}>{b.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedBookingForDetails && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/65 backdrop-blur-xs select-none animate-fadeIn">
                  <div className="bg-white rounded-2xl border border-gray-100 max-w-sm w-full shadow-2xl p-6 relative">
                    <button
                      onClick={() => setSelectedBookingForDetails(null)}
                      className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-gray-50 p-1.5 rounded-lg transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Detalhes da Reserva</h3>
                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Espaço</span>
                        <p className="text-sm font-semibold">{selectedBookingForDetails.areaId === 'salao_festas' ? 'Salão de Festas' : selectedBookingForDetails.areaId === 'churrasqueira' ? 'Churrasqueira' : selectedBookingForDetails.areaId === 'piscina' ? 'Piscina' : 'Quadra'}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Data/Horário</span>
                        <p className="text-sm font-mono">{selectedBookingForDetails.date.split('-').reverse().join('/')} | {selectedBookingForDetails.startTime} - {selectedBookingForDetails.endTime}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Convidados ({selectedBookingForDetails.guestsCount})</span>
                        {selectedBookingForDetails.guests && selectedBookingForDetails.guests.length > 0 ? (
                          <div className="mt-2 bg-sky-50 p-3 rounded-lg border border-sky-100 text-xs text-sky-800">
                            {selectedBookingForDetails.guests.map(g => g.name || 'Convidado').join(', ')}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">Nenhum convidado listado.</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedBookingForDetails(null)}
                      className="w-full mt-6 bg-slate-900 text-white rounded-lg py-2 text-sm font-semibold"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
      {/* QR Code Invitation Modal overlay */}
      {activeQrCodeVisitor && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl relative select-none">
            
            {/* Modal header */}
            <div className="flex justify-between items-center pb-3 border-b border-gray-105">
              <span className="text-xs font-bold text-gray-400 block uppercase tracking-wide">Convite Digital Inteligente</span>
              <button 
                onClick={() => setActiveQrCodeVisitor(null)}
                className="text-gray-400 hover:text-black font-bold p-1 text-sm bg-gray-50 rounded-full w-6 h-6 flex items-center justify-center border"
              >
                ✕
              </button>
            </div>

            {/* QR Code details */}
            <div className="my-6 flex flex-col items-center">
              <div className="p-4 bg-sky-50 rounded-2xl mb-4 border border-sky-100 relative">
                <div className="w-40 h-40 bg-white border border-gray-150 rounded-xl flex items-center justify-center p-2.5 shadow-sm">
                  <ProceduralQRCode value={`express-${activeQrCodeVisitor.id}`} size={144} />
                </div>
                <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-650 to-sky-600 text-white text-[9px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-widest shadow-md">
                  Aprovação Expressa
                </div>
              </div>

              <h4 className="text-lg font-bold text-gray-900 mt-2">{activeQrCodeVisitor.name}</h4>
              <p className="text-xs text-gray-500 font-semibold mb-3">{activeQrCodeVisitor.type === 'Regular' ? 'Visitante Residencial' : 'Prestador de Serviços'}</p>

               {/* Numeric Code Display */}
              <div className="bg-zinc-100 border border-zinc-200 rounded-xl px-6 py-2 mb-3">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block mb-0.5">Código de Acesso</span>
                <span className="text-3xl font-black font-mono text-zinc-900 tracking-[0.2em]">{activeQrCodeVisitor.exitCode}</span>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-xl mt-1 w-full text-left space-y-1.5 border border-gray-100">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-450">Unidade Destino:</span>
                  <span className="font-semibold text-gray-800">{activeQrCodeVisitor.unitToVisit}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-450">Anfitrião:</span>
                  <span className="font-semibold text-gray-800">{activeQrCodeVisitor.hostName}</span>
                </div>
                {activeQrCodeVisitor.vehiclePlate && (
                  <div className="flex justify-between items-center text-xs border-t border-gray-100/50 pt-2 mt-1">
                    <span className="text-gray-450">Placa do Veículo:</span>
                    <MercosulPlate plate={activeQrCodeVisitor.vehiclePlate} />
                  </div>
                )}
                <div className="flex justify-between text-xs border-t border-gray-100 pt-1.5 mt-1.5">
                  <span className="text-gray-450">Validade do Passe:</span>
                  <span className="font-semibold text-emerald-700 text-right">
                    {getDurationLabel(activeQrCodeVisitor.validityDuration)}
                    {activeQrCodeVisitor.expirationTime && (
                      <span className="block text-[10px] text-gray-500 font-mono font-medium">
                        Até {new Date(activeQrCodeVisitor.expirationTime).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Share and Action buttons */}
            <div className="space-y-2">
              <button
                onClick={() => {
                  const createdAt = new Date(activeQrCodeVisitor.createdAt);
                  const dataVisita = createdAt.toLocaleDateString('pt-BR');
                  const horarioVisita = createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                  const validade = activeQrCodeVisitor.expirationTime ? new Date(activeQrCodeVisitor.expirationTime).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Não definido';

                  const message = `🏢 ${themeSettings.appName}

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
                  alert('Convite copiado para a área de transferência!');
                }}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2.5 rounded-xl transition-colors shrink-0"
              >
                Copiar Convite
              </button>
              
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const createdAt = new Date(activeQrCodeVisitor.createdAt);
                    const dataVisita = createdAt.toLocaleDateString('pt-BR');
                    const horarioVisita = createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    const validade = activeQrCodeVisitor.expirationTime ? new Date(activeQrCodeVisitor.expirationTime).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Não definido';

                    const message = `🏢 ${themeSettings.appName}

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
                  className="flex-1 bg-[#25D366] hover:bg-[#1ebd5d] text-white text-xs font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  WhatsApp
                </button>
                <button
                  onClick={async () => {
                     const createdAt = new Date(activeQrCodeVisitor.createdAt);
                     const dataVisita = createdAt.toLocaleDateString('pt-BR');
                     const horarioVisita = createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                     const validade = activeQrCodeVisitor.expirationTime ? new Date(activeQrCodeVisitor.expirationTime).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Não definido';

                     const message = `🏢 ${themeSettings.appName}

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
                     
                     if (navigator.share) {
                        try {
                           await navigator.share({
                              title: 'Convite de Acesso',
                              text: message
                           });
                        } catch (err) {
                           console.error('Erro ao compartilhar:', err);
                        }
                     } else {
                        alert('Compartilhamento não suportado neste navegador.');
                     }
                  }}
                  className="flex-1 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  Compartilhar
                </button>
              </div>

              <button
                onClick={() => setActiveQrCodeVisitor(null)}
                className="w-full bg-gray-100 text-gray-700 text-xs font-semibold py-2 rounded-xl"
              >
                Fechar
              </button>
            </div>
            
          </div>
        </div>
      )}
      
    </div>
  );
}
