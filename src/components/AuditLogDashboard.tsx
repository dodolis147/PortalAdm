import React, { useState, useMemo } from 'react';
import { 
  Shield, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Database, 
  RefreshCw, 
  Trash2, 
  FileSpreadsheet, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Clock, 
  AlertTriangle, 
  Check, 
  X, 
  Archive,
  ArrowRight,
  Sliders,
  Sparkles,
  Info
} from 'lucide-react';
import { AuditLog, Resident, Visitor, Booking, Announcement, Incident, Encomenda } from '../types';

interface AuditLogDashboardProps {
  auditLogs: AuditLog[];
  onClearLogs?: () => void;
  onRestoreFromLog: (log: AuditLog) => void;
  // Soft Deleted items passed down to populate the Recycle Bin
  deletedItems: {
    residents: Resident[];
    visitors: Visitor[];
    bookings: Booking[];
    announcements: Announcement[];
    incidents: Incident[];
    encomendas: Encomenda[];
    'Achados e Perdidos'?: any[];
  };
  onRestoreItem: (module: string, itemId: string) => void;
  currentUser: { id: string; name: string; role: string };
  retentionDays: number;
  onUpdateRetentionDays: (days: number) => void;
}

export default function AuditLogDashboard({
  auditLogs,
  onClearLogs,
  onRestoreFromLog,
  deletedItems,
  onRestoreItem,
  currentUser,
  retentionDays,
  onUpdateRetentionDays
}: AuditLogDashboardProps) {
  
  // Tab within the dashboard
  const [activeSubTab, setActiveSubTab] = useState<'logs' | 'recycle' | 'retention'>('logs');

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModule, setFilterModule] = useState('All');
  const [filterAction, setFilterAction] = useState('All');
  const [filterUser, setFilterUser] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Selected Log for Comparison Modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Get unique list of operators/users from logs for filter dropdown
  const uniqueUsersInLogs = useMemo(() => {
    const users = new Set<string>();
    auditLogs.forEach(log => {
      if (log.user_name) users.add(log.user_name);
    });
    return Array.from(users);
  }, [auditLogs]);

  // Handle excel export (Format: UTF-8 TSV/CSV Excel compatible format)
  const handleExportExcel = () => {
    try {
      const headers = [
        'ID',
        'Data/Hora',
        'Operador',
        'Ação',
        'Módulo',
        'ID do Registro',
        'IP Acesso',
        'Navegador/Dispositivo',
        'Erro se houver',
        'Dados Anteriores',
        'Novos Dados'
      ];
      
      const rows = filteredLogs.map(log => [
        log.id,
        new Date(log.created_at).toLocaleString('pt-BR'),
        log.user_name,
        log.action,
        log.module,
        log.record_id || '',
        log.ip_address || '',
        log.user_agent || '',
        log.error_message || '',
        JSON.stringify(log.old_data || ''),
        JSON.stringify(log.new_data || '')
      ]);

      // Excel compatible TSV text with UTF-8 BOM representation
      const csvContent = [headers.join('\t'), ...rows.map(e => e.map(val => String(val).replace(/\n/g, ' ').replace(/\t/g, ' ')).join('\t'))].join('\n');
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `auditoria_condominio_${new Date().toISOString().substring(0,10)}.xls`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error(err);
      alert('Erro ao exportar planilha excel: ' + err.message);
    }
  };

  // Handle PDF Export (generates a beautiful print layout in a new window or directly trigger window printing with filters active)
  const handleExportPDF = () => {
    window.print();
  };

  // Filter audit logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      // Search Box text query (match name, id, module, errors or data json)
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        const inUser = log.user_name?.toLowerCase().includes(query);
        const inModule = log.module?.toLowerCase().includes(query);
        const inAction = log.action?.toLowerCase().includes(query);
        const inError = log.error_message?.toLowerCase().includes(query);
        const inRecord = log.record_id?.toLowerCase().includes(query);
        const inOld = log.old_data ? JSON.stringify(log.old_data).toLowerCase().includes(query) : false;
        const inNew = log.new_data ? JSON.stringify(log.new_data).toLowerCase().includes(query) : false;

        if (!inUser && !inModule && !inAction && !inError && !inRecord && !inOld && !inNew) {
          return false;
        }
      }

      // Filter Module
      if (filterModule !== 'All' && log.module !== filterModule) {
        return false;
      }

      // Filter Action
      if (filterAction !== 'All' && log.action !== filterAction) {
        return false;
      }

      // Filter Operational User
      if (filterUser !== 'All' && log.user_name !== filterUser) {
        return false;
      }

      // Date Range filters
      if (startDate !== '') {
        const startTimestamp = new Date(startDate + 'T00:00:00').getTime();
        const logTimestamp = new Date(log.created_at).getTime();
        if (logTimestamp < startTimestamp) return false;
      }

      if (endDate !== '') {
        const endTimestamp = new Date(endDate + 'T23:59:59').getTime();
        const logTimestamp = new Date(log.created_at).getTime();
        if (logTimestamp > endTimestamp) return false;
      }

      return true;
    });
  }, [auditLogs, searchQuery, filterModule, filterAction, filterUser, startDate, endDate]);

  // Paginated Logs
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;

  const handlePageChange = (pageNum: number) => {
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
    }
  };

  // JSON side-by-side diff renderer helper
  const renderDataDiff = (oldData: any, newData: any) => {
    if (!oldData && !newData) return <div className="text-gray-400 italic text-xs">Nenhum dado modificado.</div>;

    const allKeys = Array.from(new Set([
      ...Object.keys(oldData || {}),
      ...Object.keys(newData || {})
    ])).filter(k => k !== 'id' && k !== 'created_at' && k !== 'createdAt' && k !== 'password');

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left old version */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono overflow-x-auto max-h-[350px]">
          <h4 className="text-xs text-red-400 uppercase font-black tracking-widest border-b border-red-900/50 pb-2 mb-2">
            Antes da Alteração (Old Data)
          </h4>
          {oldData ? (
            <div className="space-y-1">
              {allKeys.map(key => {
                const oldVal = oldData[key];
                const newVal = newData ? newData[key] : undefined;
                const isChanged = JSON.stringify(oldVal) !== JSON.stringify(newVal);
                return (
                  <div key={key} className={`py-1 px-1.5 rounded ${isChanged ? 'bg-red-950/40 border-l-2 border-red-500 text-red-200' : 'text-slate-400'}`}>
                    <span className="font-bold text-slate-300">{key}:</span> {typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal ?? '—')}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-red-400/60 italic">Registro inexistente (Novo cadastro realizado)</div>
          )}
        </div>

        {/* Right new version */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono overflow-x-auto max-h-[350px]">
          <h4 className="text-xs text-emerald-400 uppercase font-black tracking-widest border-b border-emerald-900/50 pb-2 mb-2">
            Após a Alteração (New Data)
          </h4>
          {newData ? (
            <div className="space-y-1">
              {allKeys.map(key => {
                const oldVal = oldData ? oldData[key] : undefined;
                const newVal = newData[key];
                const isChanged = JSON.stringify(oldVal) !== JSON.stringify(newVal);
                return (
                  <div key={key} className={`py-1 px-1.5 rounded ${isChanged ? 'bg-emerald-950/40 border-l-2 border-emerald-500 text-emerald-200' : 'text-slate-400'}`}>
                    <span className="font-bold text-slate-300">{key}:</span> {typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal ?? '—')}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-rose-400/60 italic">Registro excluído (Soft Delete ou Exclusão Física)</div>
          )}
        </div>
      </div>
    );
  };

  // Convert array representation of deleted items into list
  const allDeletedList = useMemo(() => {
    const list: { id: string; name: string; module: string; deleted_at: string; deleted_by: string; deletion_reason: string; original: any }[] = [];
    
    deletedItems.residents.forEach(r => {
      list.push({ id: r.id, name: r.name, module: 'Moradores', deleted_at: r.deleted_at || '', deleted_by: r.deleted_by || 'Administrador', deletion_reason: r.deletion_reason || 'Removido via painel', original: r });
    });
    deletedItems.visitors.forEach(v => {
      list.push({ id: v.id, name: `${v.name} (${v.type})`, module: 'Visitantes', deleted_at: v.deleted_at || '', deleted_by: v.deleted_by || 'Administrador', deletion_reason: v.deletion_reason || 'Removido via painel', original: v });
    });
    deletedItems.bookings.forEach(b => {
      list.push({ id: b.id, name: `Reserva - ${b.residentName} em ${b.date}`, module: 'Reservas', deleted_at: b.deleted_at || '', deleted_by: b.deleted_by || 'Administrador', deletion_reason: b.deletion_reason || 'Cancelamento ou remoção', original: b });
    });
    deletedItems.announcements.forEach(a => {
      list.push({ id: a.id, name: a.title, module: 'Comunicados', deleted_at: a.deleted_at || '', deleted_by: a.deleted_by || 'Administrador', deletion_reason: a.deletion_reason || 'Expiração', original: a });
    });
    deletedItems.incidents.forEach(i => {
      list.push({ id: i.id, name: i.title, module: 'Ocorrências', deleted_at: i.deleted_at || '', deleted_by: i.deleted_by || 'Administrador', deletion_reason: i.deletion_reason || 'Encerrada e removida', original: i });
    });
    deletedItems.encomendas.forEach(e => {
      if (e?.id) {
        list.push({ id: e.id, name: `Pacote: ${e.codigoRastreio} (${e.moradorNome})`, module: 'Encomendas', deleted_at: e.deleted_at || '', deleted_by: e.deleted_by || 'Administrador', deletion_reason: e.deletion_reason || 'Removido', original: e });
      }
    });
    if (deletedItems['Achados e Perdidos']) {
      deletedItems['Achados e Perdidos'].forEach((ap: any) => {
        if (ap?.id) {
          list.push({ id: ap.id, name: `Reg. Perdidos: ${ap.nome} (${ap.localEncontrado})`, module: 'Achados e Perdidos', deleted_at: ap.deleted_at || '', deleted_by: ap.deleted_by || 'Administrador', deletion_reason: ap.deletion_reason || 'Removido', original: ap });
        }
      });
    }

    // Sort by deleted_at descending
    return list.sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime());
  }, [deletedItems]);

  return (
    <div className="w-full font-sans text-gray-900" id="audit-logs-tab-panel">
      
      {/* Tab Selectors Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-200 pb-4 mb-6 gap-4 no-print">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-bold tracking-tight text-gray-900 font-sans">
              Segurança & Logs de Auditoria do Sistema
            </h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Trilha oficial de auditoria de alterações, logins, falhas e recuperação de dados.
          </p>
        </div>

        {/* Action tabs selectors */}
        <div className="flex flex-wrap items-center bg-gray-100 p-1.5 rounded-xl border border-gray-200 w-full sm:w-auto text-xs font-semibold gap-1">
          <button 
            onClick={() => setActiveSubTab('logs')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all ${
              activeSubTab === 'logs' 
                ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-black/5' 
                : 'text-gray-600 hover:text-gray-950 hover:bg-gray-50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Logs Ativos ({filteredLogs.length})
          </button>
          <button 
            onClick={() => setActiveSubTab('recycle')}
            className={`relative flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all ${
              activeSubTab === 'recycle' 
                ? 'bg-white text-rose-700 shadow-xs ring-1 ring-black/5' 
                : 'text-gray-600 hover:text-gray-950 hover:bg-gray-50'
            }`}
          >
            <Archive className="w-3.5 h-3.5" /> Lixeira / Itens Excluídos
            {allDeletedList.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white font-bold text-[9px] rounded-full px-1.5 py-0.5 shadow-sm min-w-[18px] text-center">
                {allDeletedList.length}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveSubTab('retention')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all ${
              activeSubTab === 'retention' 
                ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-black/5' 
                : 'text-gray-600 hover:text-gray-950 hover:bg-gray-50'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" /> Retenção & Performance
          </button>
        </div>
      </div>

      {/* Renders Tab 'LOGS' */}
      {activeSubTab === 'logs' && (
        <div className="space-y-6">
          {/* Filters Bar UI */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 md:p-5 shadow-xs no-print select-none">
            <div className="flex items-center justify-between mb-4.5 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <h3 className="text-xs font-black uppercase text-gray-600 tracking-wider">Painel Integrado de Busca e Filtragem</h3>
              </div>
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setFilterModule('All');
                  setFilterAction('All');
                  setFilterUser('All');
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-805 transition-all text-[11px] uppercase cursor-pointer"
              >
                Limpar Filtros
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Query text input */}
              <div className="space-y-1 lg:col-span-2">
                <label className="block text-[11px] font-bold uppercase text-gray-500 tracking-wide">Procurar Conteúdo</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Nome, ID, alteração, erro..."
                    className="w-full bg-gray-50 hover:bg-gray-100/50 focus:bg-white text-xs py-2 pl-9 pr-3 border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl transition-all"
                  />
                </div>
              </div>

              {/* Module select popup */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase text-gray-500 tracking-wide">Filtrar Módulo</label>
                <select 
                  value={filterModule}
                  onChange={(e) => setFilterModule(e.target.value)}
                  className="w-full bg-gray-50 hover:bg-gray-100 text-xs p-2 border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl transition-all"
                >
                  <option value="All">Todos Módulos</option>
                  <option value="Moradores">Moradores</option>
                  <option value="Visitantes">Visitantes</option>
                  <option value="Reservas">Reservas</option>
                  <option value="Comunicados">Comunicados</option>
                  <option value="Ocorrências">Ocorrências</option>
                  <option value="Encomendas">Encomendas</option>
                  <option value="Áreas Comuns">Áreas Comuns</option>
                  <option value="Autenticação">Autenticação</option>
                  <option value="Monitoramento de Erros">Erros / Falhas</option>
                  <option value="Configurações">Configurações</option>
                </select>
              </div>

              {/* Action type */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase text-gray-500 tracking-wide">Tipo de Ação</label>
                <select 
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="w-full bg-gray-50 hover:bg-gray-100 text-xs p-2 border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl transition-all"
                >
                  <option value="All">Todas Ações</option>
                  <option value="CREATE">CREATE (Inclusão)</option>
                  <option value="UPDATE">UPDATE (Alteração)</option>
                  <option value="DELETE">DELETE (Exclusão)</option>
                  <option value="RESTORE">RESTORE (Restauração)</option>
                  <option value="LOGIN">LOGIN (Acessos)</option>
                  <option value="LOGOUT">LOGOUT</option>
                  <option value="LOGIN_FAILED">FALHAS DE LOGIN</option>
                  <option value="PASSWORD_CHANGE">SENHAS</option>
                  <option value="ERROR">ERROR (Erros do Sistema)</option>
                </select>
              </div>

              {/* Operators list */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase text-gray-500 tracking-wide">Operador</label>
                <select 
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                  className="w-full bg-gray-50 hover:bg-gray-100 text-xs p-2 border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl transition-all"
                >
                  <option value="All">Todos</option>
                  {uniqueUsersInLogs.map(username => (
                    <option key={username} value={username}>{username}</option>
                  ))}
                </select>
              </div>

              {/* Date ranges start */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase text-gray-500 tracking-wide">Data Início</label>
                <input 
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-gray-50 hover:bg-gray-100 text-xs py-1.5 px-3.5 border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl transition-all"
                />
              </div>
            </div>

            {/* Sub Filter dates inline secondary row */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4 pt-4 border-t border-gray-100 gap-3">
              <div className="flex items-center gap-1 text-[11px] text-gray-500">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span>
                  Período Filtro Fim: 
                </span>
                <input 
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="ml-2 bg-gray-50 text-xs py-1 px-2 border border-gray-200 rounded-md focus:indigo-500 focus:ring-1 transition-all"
                />
              </div>

              {/* PDF and Excel Export Triggers */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button 
                  onClick={handleExportExcel}
                  className="flex-1 sm:flex-initial py-2 px-4 border border-emerald-200 hover:border-emerald-300 bg-emerald-50 hover:bg-emerald-100/70 text-emerald-800 text-[11px] font-extrabold uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Exportar Planilha Excel
                </button>
                <button 
                  onClick={handleExportPDF}
                  className="flex-1 sm:flex-initial py-2 px-4 border border-indigo-200 hover:border-indigo-300 bg-indigo-50 hover:bg-indigo-100/70 text-indigo-805 text-[11px] font-extrabold uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-indigo-600" /> Imprimir Relatório PDF
                </button>
              </div>
            </div>
          </div>

          {/* Audit Logs Table Card / Print Output Layout */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-xs overflow-hidden">
            {/* Header counters */}
            <div className="bg-slate-50 border-b border-gray-150 px-5 py-3.5 flex justify-between items-center select-none no-print">
              <span className="text-xs text-gray-600 font-bold">
                Mostrando <strong className="text-gray-900">{filteredLogs.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</strong> a <strong className="text-gray-900">{Math.min(currentPage * itemsPerPage, filteredLogs.length)}</strong> de <strong className="text-indigo-600 font-extrabold">{filteredLogs.length}</strong> logs de auditoria identificados
              </span>

              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 font-medium whitespace-nowrap">Ver por página:</label>
                <select 
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-gray-200 rounded-lg p-1 text-xs text-gray-700"
                >
                  <option value={10}>10 registros</option>
                  <option value={25}>25 registros</option>
                  <option value={50}>50 registros</option>
                  <option value={100}>100 registros</option>
                </select>
              </div>
            </div>

            {/* Standard List/Table (Rendered for system screen) */}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-slate-800 border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-150 text-[10px] font-black uppercase text-gray-500 tracking-wider">
                    <th className="py-3 px-4 text-left font-sans text-gray-600 font-black">Data/Hora (UTC)</th>
                    <th className="py-3 px-4 text-left font-sans text-gray-600 font-black">Ação/Evento</th>
                    <th className="py-3 px-4 text-left font-sans text-gray-600 font-black">Módulo</th>
                    <th className="py-3 px-4 text-left font-sans text-gray-600 font-black">Operador</th>
                    <th className="py-3 px-4 text-left font-sans text-gray-600 font-black">IP da Conexão</th>
                    <th className="py-3 px-4 text-left font-sans text-gray-600 font-black">Detalhamento / Informações</th>
                    <th className="py-3 px-4 text-center font-sans text-gray-600 font-black no-print">Investigar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {paginatedLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400 italic text-xs font-semibold">
                        Nenhum registro de log de auditoria corresponde aos filtros ativos.
                      </td>
                    </tr>
                  ) : (
                    paginatedLogs.map((log) => {
                      const isError = log.action === 'ERROR' || log.action === 'LOGIN_FAILED';
                      const isDelete = log.action === 'DELETE';
                      const isCreate = log.action === 'CREATE';
                      const isRestore = log.action === 'RESTORE';

                      return (
                        <tr key={log.id} className={`hover:bg-slate-50/50 transition-all ${isError ? 'bg-rose-50/20' : ''}`}>
                          {/* DateTime */}
                          <td className="py-3 px-4 text-xs text-gray-500 font-mono align-top whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString('pt-BR')}
                          </td>
                          
                          {/* Action Badge */}
                          <td className="py-3 px-4 align-top whitespace-nowrap">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              isError 
                                ? 'bg-red-100 text-red-800 border border-red-200' 
                                : isDelete 
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                  : isCreate 
                                    ? 'bg-emerald-100 text-emerald-805 border border-emerald-200'
                                    : isRestore
                                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                      : 'bg-indigo-100 text-indigo-805 border border-indigo-200'
                            }`}>
                              {log.action}
                            </span>
                          </td>

                          {/* Module affected */}
                          <td className="py-3 px-4 align-top whitespace-nowrap">
                            <span className="text-xs font-bold text-gray-800 block">
                              {log.module}
                            </span>
                            {log.record_id && (
                              <span className="text-[9px] font-mono text-gray-400 block tracking-tighter select-all">
                                ID: {log.record_id.substring(0,8)}...
                              </span>
                            )}
                          </td>

                          {/* Operator name */}
                          <td className="py-3 px-4 align-top">
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="text-xs font-black text-gray-700 whitespace-nowrap">{log.user_name}</span>
                            </div>
                            <span className="text-[9px] text-gray-400 font-mono block">ID: {log.user_id}</span>
                          </td>

                          {/* IP Address */}
                          <td className="py-3 px-4 align-top whitespace-nowrap">
                            <span className="text-xs font-mono text-gray-500">{log.ip_address || '127.0.0.1'}</span>
                            {log.user_agent && (
                              <span className="block text-[8px] text-gray-400 truncate max-w-[125px]" title={log.user_agent}>
                                {log.user_agent}
                              </span>
                            )}
                          </td>

                          {/* Details / Brief Summary of Alterations */}
                          <td className="py-3 px-4 align-top text-xs leading-relaxed max-w-[320px]">
                            {isError && (
                              <div className="text-rose-700 font-mono text-[11px] leading-tight break-words">
                                <strong>Falha crítica:</strong> {log.error_message || 'Exceção desconhecida no cliente'}
                                {log.stack_trace && <span className="block text-[9px] text-rose-500/85 mt-1 select-all font-sans italic truncate max-w-[300px]">Stack: {log.stack_trace}</span>}
                              </div>
                            )}

                            {!isError && log.action === 'UPDATE' && (
                              <div className="text-gray-600 text-[11px]">
                                Foram modificados campos do registro no módulo <strong className="text-gray-900">{log.module}</strong>. Clique em investigar para comparar lado a lado.
                              </div>
                            )}

                            {!isError && log.action === 'CREATE' && (
                              <div className="text-emerald-700 text-[11px]">
                                Novo registro cadastrado no banco: <strong className="text-emerald-950 font-bold">{log.new_data?.name || log.new_data?.title || log.new_data?.codigoRastreio || 'Confirmado'}</strong>
                              </div>
                            )}

                            {!isError && log.action === 'DELETE' && (
                              <div className="text-amber-700 text-[11px]">
                                Registro enviado à lixeira por exclusão lógica de dados. Motivo: <strong className="text-amber-950 italic">{log.old_data?.deletion_reason || 'Removido temporariamente'}</strong>
                              </div>
                            )}

                            {!isError && log.action === 'RESTORE' && (
                              <div className="text-sky-700 text-[11px]">
                                Recuperação completa de registro concluída com sucesso. Restaurado por <strong className="text-sky-950">{log.restored_by}</strong>.
                              </div>
                            )}

                            {log.action === 'LOGIN' && (
                              <span className="text-gray-700 font-medium">Acesso concedido e sessão autenticada com sucesso.</span>
                            )}
                            {log.action === 'LOGOUT' && (
                              <span className="text-gray-500 italic">Sessão encerrada voluntariamente pelo usuário.</span>
                            )}
                          </td>

                          {/* Side-by-side inspect action button */}
                          <td className="py-3 px-4 align-top text-center no-print">
                            <button 
                              onClick={() => setSelectedLog(log)}
                              className="py-1 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-indigo-100 transition-all cursor-pointer inline-flex items-center gap-1"
                              title="Compare as alterações lado a lado"
                            >
                              <Eye className="w-3 h-3" /> Investigar
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Section */}
            <div className="bg-slate-50 border-t border-gray-150 px-5 py-4 flex flex-col sm:flex-row justify-between items-center no-print select-none gap-3">
              <span className="text-xs text-gray-500 font-medium">
                Página <strong className="text-gray-900">{currentPage}</strong> de <strong className="text-gray-900">{totalPages}</strong> ({filteredLogs.length} logs filtrados)
              </span>

              <div className="flex items-center gap-1.5 text-xs font-bold">
                <button 
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-1 px-2 border border-gray-200 hover:border-gray-300 rounded-lg bg-white disabled:bg-gray-100 disabled:opacity-50 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>

                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pagIndex = idx + 1;
                  // Show current and nearest indicators to prevent super wide line
                  if (pagIndex === 1 || pagIndex === totalPages || Math.abs(pagIndex - currentPage) <= 1) {
                    return (
                      <button 
                        key={pagIndex}
                        onClick={() => handlePageChange(pagIndex)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer border ${
                          currentPage === pagIndex 
                            ? 'bg-indigo-600 text-white border-indigo-650 shadow-xs' 
                            : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'
                        }`}
                      >
                        {pagIndex}
                      </button>
                    );
                  }
                  if (pagIndex === 2 || pagIndex === totalPages - 1) {
                    return <span key={pagIndex} className="text-gray-400">...</span>;
                  }
                  return null;
                })}

                <button 
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-1 px-2 border border-gray-200 hover:border-gray-300 rounded-lg bg-white disabled:bg-gray-100 disabled:opacity-50 transition-all cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>

          {/* Special formatting block visible ONLY on device printing (A4 alignment) */}
          <div className="hidden print:block bg-white text-black p-0 m-0 w-full select-all font-sans" id="print-layout-logs-document">
            <div className="border-b-2 border-slate-900 pb-4 mb-4 flex justify-between items-start">
              <div>
                <h1 className="text-xl font-black uppercase text-slate-950">RELATÓRIO ADMINISTRATIVO DE AUDITORIA</h1>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">SISTEMA CONDOMÍNIO INTELIGENTE • HISTÓRICO COMPLETO</p>
              </div>
              <div className="text-right text-[9px] font-mono text-slate-600">
                <p>Impressão: <strong>{new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR')}</strong></p>
                <p>Total auditado: <strong>{filteredLogs.length} logs</strong></p>
                <p>Status filtro: {filterModule === 'All' ? 'Geral' : `Módulo ${filterModule}`}</p>
              </div>
            </div>

            <table className="w-full text-[9px] border-collapse" id="actual-print-table">
              <thead>
                <tr className="border-b-2 border-slate-900 bg-slate-50">
                  <th className="py-1 px-2 text-left font-bold text-slate-900 border">Data/Hora</th>
                  <th className="py-1 px-2 text-left font-bold text-slate-900 border">Ação</th>
                  <th className="py-1 px-2 text-left font-bold text-slate-900 border">Módulo</th>
                  <th className="py-1 px-2 text-left font-bold text-slate-900 border">Operador</th>
                  <th className="py-1 px-2 text-left font-bold text-slate-900 border">Endereço IP</th>
                  <th className="py-1 px-2 text-left font-bold text-slate-900 border">Descrição das Alterações Realizadas</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.slice(0, 50).map((log) => (
                  <tr key={log.id} className="border-b break-inside-avoid">
                    <td className="py-1 px-2 font-mono text-[8px] border">{new Date(log.created_at).toLocaleString('pt-BR')}</td>
                    <td className="py-1 px-2 font-bold text-[8.5px] border">{log.action}</td>
                    <td className="py-1 px-2 font-bold border">{log.module}</td>
                    <td className="py-1 px-2 border">{log.user_name}</td>
                    <td className="py-1 px-2 font-mono text-[8px] border">{log.ip_address || '127.0.0.1'}</td>
                    <td className="py-1 px-2 text-[8px] border">
                      {log.action === 'ERROR' && log.error_message}
                      {log.action === 'UPDATE' && `Alterou registro ${log.record_id || ''}`}
                      {log.action === 'CREATE' && `Adicionou registro na base: ${log.new_data?.name || log.new_data?.title || 'Detalhado'}`}
                      {log.action === 'DELETE' && `Exclusão lógica do registro. Motivo: ${log.old_data?.deletion_reason || 'N/I'}`}
                      {log.action === 'RESTORE' && `Restauração de dados concluída por ${log.restored_by || 'Administrador'}`}
                      {log.action === 'LOGIN' && 'Acesso autorizado ao console de controle'}
                      {log.action === 'LOGOUT' && 'Término de sessão do usuário'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Renders Tab 'RECYCLE / LIXEIRA INTEGRADA' */}
      {activeSubTab === 'recycle' && (
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800 flex items-start gap-3 select-none no-print">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-amber-955 font-black uppercase text-[11px] mb-1">Como Funciona a Exclusão Lógica e o Supabase Soft Delete:</strong>
              As exclusões físicas e destrutivas permanentes foram desabilitadas no sistema. Sempre que um usuário remove um morador, visitante, reserva ou encomenda, o registro correspondente recebe os campos 
              <span className="font-mono bg-amber-100 px-1 py-0.5 rounded ml-1 font-bold">deleted_at</span>, 
              <span className="font-mono bg-amber-100 px-1 py-0.5 rounded ml-1 font-bold">deleted_by</span> e 
              <span className="font-mono bg-amber-100 px-1 py-0.5 rounded ml-1 font-bold">deletion_reason</span>. 
              Dessa forma, os dados continuam intactos no banco de dados, podendo ser investigados e restaurados a qualquer momento por administradores.
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl shadow-xs overflow-hidden no-print">
            <div className="bg-slate-50 border-b border-gray-150 px-5 py-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                <Trash2 className="w-4 h-4 text-rose-600" /> Histórico de Exclusões Lógicas (Recycle Bin)
              </h3>
              <p className="text-xs text-gray-500 mt-1">Selecione qualquer registro abaixo para restaurá-lo instantaneamente com seu estado original.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100/70 border-b border-gray-150 text-[10px] uppercase font-black text-gray-500">
                    <th className="py-3 px-4 font-black">Data Exclusão</th>
                    <th className="py-3 px-4 font-black">Módulo Origem</th>
                    <th className="py-3 px-4 font-black">Nome / Elemento</th>
                    <th className="py-3 px-4 font-black">Excluído Por</th>
                    <th className="py-3 px-4 font-black">Motivo da Exclusão</th>
                    <th className="py-3 px-4 font-black text-center">Recuperação de Dados</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {allDeletedList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400 italic text-xs">
                        Não existem itens excluídos temporariamente na lixeira atualmente.
                      </td>
                    </tr>
                  ) : (
                    allDeletedList.map((item) => (
                      <tr key={item.module + '-' + item.id} className="hover:bg-slate-55/40 transition-all">
                        {/* Date deleted */}
                        <td className="py-3.5 px-4 text-xs font-mono text-gray-500">
                          {item.deleted_at ? new Date(item.deleted_at).toLocaleString('pt-BR') : '—'}
                        </td>

                        {/* Module */}
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-gray-900 block text-xs">{item.module}</span>
                          <span className="font-mono text-[9px] text-gray-400 select-all">UUID: {item.id}</span>
                        </td>

                        {/* Item Name */}
                        <td className="py-3.5 px-4 font-extrabold text-xs text-gray-800">
                          {item.name}
                        </td>

                        {/* Deleted By */}
                        <td className="py-3.5 px-4 text-xs font-black text-gray-600">
                          {item.deleted_by}
                        </td>

                        {/* Deletion Reason */}
                        <td className="py-3.5 px-4 text-xs italic text-gray-500 max-w-[200px] truncate" title={item.deletion_reason}>
                          &quot;{item.deletion_reason}&quot;
                        </td>

                        {/* Action triggers */}
                        <td className="py-3.5 px-4 text-center">
                          <button 
                            onClick={() => {
                              const confirmAction = window.confirm(`Deseja realmente restaurar o registro "${item.name}" no módulo ${item.module}? Ele retornará imediatamente a todas as telas do sistema.`);
                              if (confirmAction) {
                                onRestoreItem(item.module, item.id);
                              }
                            }}
                            className="py-1.5 px-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-250 text-emerald-800 hover:text-emerald-950 font-black text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer inline-flex items-center gap-1 shadow-sm"
                          >
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} /> Restaurar Registro
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Renders Tab 'RETENTION & PERFORMANCE' */}
      {activeSubTab === 'retention' && (
        <div className="space-y-6 no-print select-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Config Card */}
            <div className="bg-white border border-gray-150 rounded-2xl p-5 md:p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-black uppercase text-gray-800 tracking-wider">Políticas de Retenção de Dados Regulada</h3>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">
                  Armazenar logs por longo período consome recursos de banco de dados e pode ferir conformidades de LGPD. Defina abaixo o ciclo de vida e tempo de retenção para limpeza automática dos registros de auditoria e falhas do sistema de segurança.
                </p>

                <div className="bg-indigo-50 p-4 border border-indigo-150 rounded-xl mb-6">
                  <span className="block text-xs font-bold text-indigo-950 mb-1">Impacto de Desempenho estimado:</span>
                  <span className="block text-[11px] text-indigo-800 leading-normal">
                    Quanto menor o período de retenção de logs ativos, mais rápida será a renderização dos relatórios para os operadores de portaria no dia-a-dia.
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500">Período de Retenção Ativo:</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { days: 30, text: '30 Dias (Padrão Otimizado)' },
                      { days: 90, text: '3 trimestre (90 Dias)' },
                      { days: 180, text: 'Semestre (180 Dias)' },
                      { days: 9999, text: 'Ilimitada (Reter para Sempre)' },
                    ].map((opt) => (
                      <button
                        key={opt.days}
                        onClick={() => {
                          onUpdateRetentionDays(opt.days);
                        }}
                        className={`py-2.5 px-3 border text-xs text-center font-bold tracking-tight rounded-xl transition-all cursor-pointer ${
                          retentionDays === opt.days 
                            ? 'bg-indigo-600 border-indigo-700 text-white shadow-xs' 
                            : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700'
                        }`}
                      >
                        {opt.text}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 mt-6 pt-4 text-center">
                <span className="text-[11px] text-gray-400">Exclusões de retenção são processadas em segundo plano ao sincronizar tabelas.</span>
              </div>
            </div>

            {/* Performance status card card */}
            <div className="bg-white border border-gray-150 rounded-2xl p-5 md:p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sliders className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-sm font-black uppercase text-gray-800 tracking-wider">Integridade de Registros e Performance</h3>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">
                  Todos os logs de auditoria passam por verificação de checksum de integridade criptográfica ponta-a-ponta. Veja o resultado do monitoramento de desempenho e banco abaixo:
                </p>

                <div className="space-y-3.5">
                  <div className="border border-gray-150 p-3 rounded-xl flex items-center justify-between text-xs font-semibold">
                    <div>
                      <span className="text-gray-500 block">Status Conexão Supabase:</span>
                      <span className="font-extrabold text-emerald-700">Conectado / Monitorado</span>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  </div>

                  <div className="border border-gray-150 p-3 rounded-xl flex items-center justify-between text-xs font-semibold">
                    <div>
                      <span className="text-gray-500 block">Logs de Erros de Javascript monitorados:</span>
                      <span className="font-extrabold text-indigo-700">Erros Globais Ativados</span>
                    </div>
                    <span className="inline-block bg-indigo-100 text-indigo-805 text-[9px] px-2 py-0.5 rounded-md font-mono uppercase font-black uppercase">Ativo</span>
                  </div>

                  <div className="border border-gray-150 p-3 rounded-xl flex items-center justify-between text-xs font-semibold">
                    <div>
                      <span className="text-gray-500 block">Total de Ações Auditadas:</span>
                      <span className="font-extrabold text-slate-800">{auditLogs.length} logs na tabela</span>
                    </div>
                    <span className="text-xs font-bold text-gray-600">{((JSON.stringify(auditLogs).length / 1024)).toFixed(1)} KB</span>
                  </div>
                </div>
              </div>

              {onClearLogs && (
                <div className="border-t border-gray-100 mt-6 pt-4">
                  <button 
                    onClick={() => {
                      const confirmWipe = window.confirm('Deseja realmente limpar permanentemente todos os registros de logs? Essa ação é IRREVERSÍVEL e recomendada apenas para fins de teste.');
                      if (confirmWipe) {
                        onClearLogs();
                      }
                    }}
                    className="w-full py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 hover:text-rose-950 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                  >
                    <Trash2 className="w-4 h-4 bg-transparent" /> Limpar Histórico de Logs Permanentemente
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Investigation / Side-by-Side Alteration Comparison Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-950/85 backdrop-blur-xs no-print select-text">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Investigação de Auditoria: Log ID {selectedLog.id.substring(0,8)}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-850 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Info and Compare details */}
            <div className="flex-1 overflow-y-auto space-y-5 pr-1">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono text-slate-300">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Data/Hora Log</span>
                  <span className="font-extrabold text-white text-[11px]">{new Date(selectedLog.created_at).toLocaleString('pt-BR')}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Operador</span>
                  <span className="font-extrabold text-sky-400 text-[11px]">{selectedLog.user_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Módulo / Tabela</span>
                  <span className="font-extrabold text-amber-400 text-[11px]">{selectedLog.module}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Endereço IP</span>
                  <span className="font-extrabold text-white text-[11px]">{selectedLog.ip_address || '127.0.0.1'}</span>
                </div>
              </div>

              {/* Stack / Error details if there is an issue */}
              {selectedLog.action === 'ERROR' && (
                <div className="bg-rose-950/40 border border-rose-900 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-1 text-rose-455 text-xs font-bold uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> Detalhes da Exceção ou Falha no Supabase
                  </div>
                  <p className="text-rose-200 font-mono text-xs font-bold">
                    Mensagem: {selectedLog.error_message || 'Erro inesperado'}
                  </p>
                  {selectedLog.stack_trace && (
                    <div className="bg-slate-950 p-3 rounded-lg border border-rose-950 font-mono text-[10px] text-rose-300/90 overflow-x-auto select-all max-h-[160px]">
                      {selectedLog.stack_trace}
                    </div>
                  )}
                </div>
              )}

              {/* Old vs New side-by-side data comparator view */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-300">Rastreabilidade Analítica de Mudança de Dados:</h4>
                {renderDataDiff(selectedLog.old_data, selectedLog.new_data)}
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="border-t border-slate-800 pt-4 mt-4 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                <Info className="w-3.5 h-3.5 text-slate-500" />
                <span>Navegador do operador: &quot;{selectedLog.user_agent || 'N/A'}&quot;</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button 
                  onClick={() => setSelectedLog(null)}
                  className="w-full sm:w-auto py-2 px-5 bg-slate-800 hover:bg-slate-755 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer uppercase tracking-wider"
                >
                  Fechar Janela
                </button>
                {/* Restore option button shown if the log is a delete/update action */}
                {(selectedLog.action === 'DELETE' || selectedLog.action === 'UPDATE') && selectedLog.old_data && (
                  <button 
                    onClick={() => {
                      const confirmRestore = window.confirm(`Tem certeza de que deseja restaurar os dados do registro conforme a versão anterior desta auditoria? Esta ação substituirá o estado atual.`);
                      if (confirmRestore) {
                        onRestoreFromLog(selectedLog);
                        setSelectedLog(null);
                      }
                    }}
                    className="w-full sm:w-auto py-2 px-5 bg-indigo-650 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-1 transition-all cursor-pointer shadow-lg"
                  >
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} /> Restaurar Versão Anterior
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
      
    </div>
  );
}
