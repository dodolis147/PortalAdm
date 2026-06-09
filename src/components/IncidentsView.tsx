import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, MessageSquare, Plus, CheckCircle, Sparkles, Send, Loader2, RefreshCw, Trash2, X, Edit2, Check
} from 'lucide-react';
import { Incident, Resident, IncidentReply } from '../types';
import { toUpperText } from '../lib/utils';
import IncidentPhotoUpload from './IncidentPhotoUpload';
import IncidentDetailsModal from './IncidentDetailsModal';

interface IncidentsViewProps {
  incidents: Incident[];
  residents: Resident[];
  onAddIncident: (incident: Incident) => void;
  onAddIncidentReply: (incidentId: string, reply: IncidentReply) => void;
  onRemoveIncident: (incidentId: string) => void;
  onUpdateIncidentStatus: (incidentId: string, status: 'Aberto' | 'Em Andamento' | 'Resolvido') => void;
  onUpdateIncident: (incident: Incident) => void;
  currentUser: { id: string; name: string; unit?: string; role: 'MASTER' | 'Administrador' | 'Porteiro' | 'Morador' };
  incidentCategories?: string[];
  onSaveIncidentCategories?: (categories: string[]) => void;
}

export default function IncidentsView({
  incidents,
  residents,
  onAddIncident,
  onAddIncidentReply,
  onRemoveIncident,
  onUpdateIncidentStatus,
  onUpdateIncident,
  currentUser,
  incidentCategories,
  onSaveIncidentCategories
}: IncidentsViewProps) {
  React.useEffect(() => {
    console.log("[INCIDENTS_VIEW_DEBUG] Incidents list updated:", incidents.length);
  }, [incidents]);

  const [activeFilter, setActiveFilter] = useState<'all' | 'Pendente' | 'Aberto' | 'Em Andamento' | 'Resolvido'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [expandedIncident, setExpandedIncident] = useState<Incident | null>(null);

  // Fallback default categories including Maintenance (Manutenção) as requested
  const defaultCategories = [
    'Barulho', 
    'Vazamento', 
    'Infraestrutura', 
    'Segurança', 
    'Manutenção',
    'Outro'
  ];
  const activeCategories = incidentCategories || defaultCategories;

  // Form states (Creating an incident)
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('Barulho');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('');
  const [incidentPhotos, setIncidentPhotos] = useState<string[]>([]);

  // Category management modal states
  const [showManageCategoriesModal, setShowManageCategoriesModal] = useState(false);
  const [newCategoryText, setNewCategoryText] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryText, setEditCategoryText] = useState<string>('');

  // Incident edit mode states
  const [isEditingIncident, setIsEditingIncident] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Replaying state
  const [replyText, setReplyText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const isMorador = currentUser.role === 'Morador';

  useEffect(() => {
    if (showAddForm) {
      if (currentUser.unit && currentUser.unit.trim()) {
        setUnit(currentUser.unit);
      } else if (currentUser.name && currentUser.name.trim()) {
        setUnit(currentUser.name);
      } else if (currentUser.role === 'Porteiro') {
        setUnit('PORTARIA');
      } else if (currentUser.role === 'Administrador' || currentUser.role === 'MASTER') {
        setUnit('ADMINISTRAÇÃO');
      } else {
        setUnit('PORTARIA');
      }
    }
  }, [currentUser, showAddForm]);

  const filteredIncidents = incidents.filter(i => {
    const iUnit = i.unit.toLowerCase().replace(/\s+/g, '');
    const cUnit = (currentUser.unit || '').toLowerCase().replace(/\s+/g, '');
    if (isMorador && iUnit !== cUnit) return false;
    
    // Status Filter
    let matchesStatus = true;
    if (activeFilter === 'all') matchesStatus = true;
    else if (activeFilter === 'Pendente') matchesStatus = i.status === 'Aberto' || i.status === 'Em Andamento';
    else matchesStatus = i.status === activeFilter;
    
    if (!matchesStatus) return false;

    // Search Query
    if (searchQuery.trim() === '') return true;
    const lowerQuery = searchQuery.toLowerCase();
    return (
      i.title.toLowerCase().includes(lowerQuery) ||
      i.description.toLowerCase().includes(lowerQuery) ||
      i.unit.toLowerCase().includes(lowerQuery)
    );
  });

  const handleAddCategory = () => {
    if (!newCategoryText.trim()) return;
    const cleanCatName = newCategoryText.trim();
    if (activeCategories.includes(cleanCatName)) {
      alert('Esta categoria já está cadastrada!');
      return;
    }

    const updated = [...activeCategories, cleanCatName];
    if (onSaveIncidentCategories) {
      onSaveIncidentCategories(updated);
    }
    setNewCategoryText('');
  };

  const handleRemoveCategory = (catName: string) => {
    if (activeCategories.length <= 1) {
      alert('Você precisa manter pelo menos uma categoria cadastrada.');
      return;
    }
    if (window.confirm(`Tem certeza de que deseja remover a categoria "${catName}"?`)) {
      const updated = activeCategories.filter(c => c !== catName);
      if (onSaveIncidentCategories) {
        onSaveIncidentCategories(updated);
      }
      if (category === catName) {
        setCategory(updated[0] || '');
      }
    }
  };

  const handleStartEditCategory = (catName: string) => {
    setEditingCategory(catName);
    setEditCategoryText(catName);
  };

  const handleSaveEditCategory = (oldCatName: string) => {
    if (!editCategoryText.trim()) return;
    const cleanCatName = editCategoryText.trim();
    if (cleanCatName === oldCatName) {
      setEditingCategory(null);
      return;
    }
    if (activeCategories.includes(cleanCatName)) {
      alert('Esta categoria já existe!');
      return;
    }

    const updated = activeCategories.map(c => c === oldCatName ? cleanCatName : c);
    if (onSaveIncidentCategories) {
      onSaveIncidentCategories(updated);
    }
    
    if (category === oldCatName) {
      setCategory(cleanCatName);
    }
    setEditingCategory(null);
  };

  const handleCreateIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !unit) {
      alert('Por favor, preencha todos os campos obrigatórios (Título, Descrição e Unidade).');
      return;
    }

    const newInc: Incident = toUpperText({
      id: crypto.randomUUID(),
      title,
      category,
      description,
      unit,
      status: 'Aberto',
      date: new Date().toISOString().split('T')[0],
      replies: [],
      photoUrls: incidentPhotos, // Save photos
    });

    onAddIncident(newInc);
    alert('Ocorrência registrada com sucesso! A administração foi notificada.');

    // Clear and close
    setTitle('');
    setCategory(activeCategories[0] || 'Barulho');
    setDescription('');
    setUnit('');
    setIncidentPhotos([]); // Clear photos
    setShowAddForm(false);
  };

  // AI-powered reply drafting
  const handleGenerateAiReply = async (incident: Incident) => {
    setAiLoading(true);

    try {
      const response = await fetch('/api/gemini/reply-incident', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          incidentTitle: incident.title,
          incidentDescription: incident.description,
          incidentCategory: incident.category,
          residentUnit: incident.unit
        })
      });
      const data = await response.json();
      if (response.ok) {
        setReplyText(data.text);
      } else {
        setReplyText(data.fallback || `Prezado morador da unidade ${incident.unit}, agradecemos seu chamado. Iniciaremos uma investigação predial brevemente.`);
      }
    } catch (e: any) {
      console.error(e);
      setReplyText(`Prezado morador da unidade ${incident.unit},\n\nAgradecemos o envio do seu chamado sobre "${incident.title}". Registramos sua ocorrência no portal administrativo da diretoria correspondente.\n\nFaremos uma análise local e providenciaremos as devidas correções ou avisos técnicos.\n\nAtenciosamente,\nA Administração.`);
    } finally {
      setAiLoading(false);
    }
  };

  const handlePostReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident || !replyText.trim()) return;

    const newReply: IncidentReply = {
      id: crypto.randomUUID(),
      author: currentUser.name || 'Suporte CondoAccess',
      role: currentUser.role || 'Morador',
      content: replyText,
      date: new Date().toISOString()
    };

    onAddIncidentReply(selectedIncident.id, newReply);
    
    // Also auto-promote to Em Andamento if status was Aberto
    if (selectedIncident.status === 'Aberto') {
      onUpdateIncidentStatus(selectedIncident.id, 'Em Andamento');
      // Update selected state reference immediately
      setSelectedIncident(prev => prev ? { ...prev, status: 'Em Andamento', replies: [...(prev.replies || []), newReply] } : null);
    } else {
      setSelectedIncident(prev => prev ? { ...prev, replies: [...(prev.replies || []), newReply] } : null);
    }

    setReplyText('');
    alert('Resposta enviada ao morador!');
  };

  const promoteIncidentStatus = (id: string, newStats: 'Aberto' | 'Em Andamento' | 'Resolvido') => {
    onUpdateIncidentStatus(id, newStats);
    setSelectedIncident(prev => prev ? { ...prev, status: newStats } : null);
    alert(`Status da ocorrência alterado para: ${newStats}.`);
  };

  const handleSaveIncidentEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident) return;
    if (!editTitle.trim() || !editDescription.trim() || !editCategory.trim()) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const updatedIncident: Incident = {
      ...selectedIncident,
      title: editTitle.trim(),
      category: editCategory.trim(),
      description: editDescription.trim()
    };

    onUpdateIncident(updatedIncident);
    setSelectedIncident(updatedIncident);
    setIsEditingIncident(false);
  };

  const canEditIncident = selectedIncident 
    ? (currentUser.role === 'MASTER' || currentUser.role === 'Administrador' || selectedIncident.unit === currentUser.unit)
    : false;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in" id="incidents-screen">
      
      {/* Left Columns: Ticket listings and filters */}
      <div className="lg:col-span-2 space-y-4">
        
        {/* Actions bar and Filters */}
        <div className="flex flex-wrap gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex flex-wrap gap-2 select-none justify-center">
            {['all', 'Pendente', 'Aberto', 'Em Andamento', 'Resolvido'].map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors whitespace-nowrap ${
                  activeFilter === f
                    ? 'bg-slate-900 text-white'
                    : 'bg-gray-55 hover:bg-gray-100 text-gray-600'
                }`}
              >
                {f === 'all' ? 'Ver Todas' : f}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Buscar ocorrência..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-sky-500 w-full sm:w-48"
            />
            
            {(currentUser.role === 'Administrador' || currentUser.role === 'MASTER') && (
              <button
                onClick={() => setShowManageCategoriesModal(true)}
                className="flex-1 md:flex-none border border-gray-200 hover:border-gray-300 hover:bg-gray-55 text-gray-750 px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-white"
                title="Configurar Categorias de Ocorrência"
                type="button"
              >
                <RefreshCw className="w-3.5 h-3.5 text-indigo-500" /> Configurar Categorias
              </button>
            )}

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex-1 md:flex-none bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Registrar Ocorrência
            </button>
          </div>
        </div>

        {/* Filing Form block */}
        {showAddForm && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs" id="add-incident-form-container">
            <div className="border-b border-gray-100 pb-3 mb-5">
              <h3 className="text-lg font-semibold text-gray-900">Registrar Ocorrência</h3>
              <p className="text-xs text-gray-500 mt-0.5">Utilize para relatar perturbação de sossego, infiltrações ou danos prediais.</p>
            </div>

            <form onSubmit={handleCreateIncident} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Title */}
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-gray-650 block mb-1">Assunto / Título Curto *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Barulho excessivo do vizinho após 22h"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Category choice */}
                <div>
                  <label className="text-xs font-semibold text-gray-650 block mb-1">Categoria da Ocorrência *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-sky-500"
                  >
                    {activeCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Association unit */}
                <div>
                  <label className="text-xs font-semibold text-gray-650 block mb-1">Unidade Relatante *</label>
                  <input
                    type="text"
                    readOnly
                    required
                    value={unit}
                    className="w-full bg-gray-55 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-400 focus:outline-none cursor-not-allowed font-medium"
                  />
                </div>

                <div className="md:col-span-2 text-xs text-gray-500 flex items-center bg-gray-50 p-3 rounded-lg border">
                  As ocorrências registradas passam por mediação interna da portaria e do conselho de administração antes de converterem em advertências legais.
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-650 block mb-1">Descrição Detalhada do Fato *</label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Seja descritivo. Indique horários, nomes, detalhes de canos se for vazamento, etc."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-sky-500 font-sans"
                />
              </div>

              <IncidentPhotoUpload 
                photos={incidentPhotos}
                onPhotosChange={setIncidentPhotos}
                title={title}
              />

              <div className="flex justify-end gap-2 border-t pt-2 border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="bg-gray-105 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-black text-white px-5 py-2 rounded-xl text-xs font-semibold"
                >
                  Protocolar Chamado
                </button>
              </div>
            </form>
          </div>
        )}

        {/* List of incidents */}
        <div className="space-y-3" id="incidents-ticket-list">
          {filteredIncidents.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
              <AlertTriangle className="w-12 h-12 text-gray-200 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-500 uppercase">Nenhuma ocorrência encontrada</p>
              <p className="text-xs text-gray-400 mt-1">Nenhum chamado pendente no status selecionado.</p>
            </div>
          ) : (
            filteredIncidents.map((incident) => (
              <div 
                key={incident.id}
                onClick={() => {
                  setSelectedIncident(incident);
                  setExpandedIncident(incident);
                  setIsEditingIncident(false);
                }}
                className={`rounded-2xl border p-5 cursor-pointer hover:shadow-xs transition-shadow ${
                  selectedIncident?.id === incident.id ? 'bg-white border-slate-800 ring-1 ring-slate-800' : 
                  incident.status === 'Resolvido' ? 'bg-emerald-100 border-emerald-300' : 
                  incident.status === 'Em Andamento' ? 'bg-amber-100 border-amber-300' :
                  incident.status === 'Aberto' ? 'bg-sky-100 border-sky-300' :
                  incident.status === 'Pendente' ? 'bg-rose-100 border-rose-300' : 'bg-white border-gray-100'
                }`}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="space-y-1">
                    <span className="bg-gray-100 text-gray-700 border border-gray-200 px-2 py-0.5 rounded text-[9px] font-bold uppercase">
                      {incident.category}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-800">
                        {residents.find(r => r.unit === incident.unit)?.name || 'Morador'}
                      </span>
                      <span className="text-xs font-bold text-slate-700 bg-white/50 px-1 rounded inline-block">
                        Unidade: {incident.unit}
                      </span>
                      <h4 className="text-sm font-bold text-gray-910 leading-tight tracking-tight pt-1">{incident.title}</h4>
                      <span className="text-[10px] text-gray-600 font-mono font-bold mt-1 uppercase">
                        Protocolo: {incident.date.split('-').reverse().join('/')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 items-center">
                    {(currentUser.role === 'Administrador' || currentUser.role === 'MASTER') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Deseja excluir esta ocorrência permanentemente?')) {
                            onRemoveIncident(incident.id);
                          }
                        }}
                        className="text-gray-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Excluir Ocorrência"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase text-center shrink-0 ${
                      incident.status === 'Aberto' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                      incident.status === 'Em Andamento' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                      'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    }`}>
                      {incident.status}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-3 truncate lines-2 leading-relaxed">
                  {incident.description}
                </p>

                {incident.photoUrls && incident.photoUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    <img 
                      src={incident.photoUrls[0]} 
                      alt="Thumbnail da ocorrência" 
                      className="w-16 h-16 rounded-lg object-cover border border-gray-200" 
                    />
                    {incident.photoUrls.length > 1 && (
                      <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center border border-gray-200 text-xs text-gray-500 font-bold">
                        +{incident.photoUrls.length - 1}
                      </div>
                    )}
                  </div>
                )}

                <div className="border-t border-gray-100 pt-3 mt-4 flex items-center justify-between text-xs text-gray-400">
                  <span className="font-medium flex items-center gap-1">
                    <MessageSquare className={`w-3.5 h-3.5 ${incident.status === 'Resolvido' ? 'text-indigo-500' : ''}`} />
                    {(incident.replies || []).length} Respostas e Notificações
                  </span>
                  <span className={`${incident.status === 'Resolvido' ? 'text-indigo-600' : 'text-sky-650'} hover:underline font-semibold font-sans`}>Ver Detalhes →</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Column: Interaction Thread details */}
      <div className="lg:col-span-1">
        {selectedIncident ? (
          <div className="bg-white rounded-2xl border border-gray-150 p-6 space-y-5 shadow-xs" id="incident-thread-details">
            {isEditingIncident ? (
              <form onSubmit={handleSaveIncidentEdit} className="space-y-4">
                <div className="border-b border-gray-150 pb-3 mb-2 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-gray-901 uppercase tracking-tight">Editar Protocolo</h3>
                    <p className="text-[10px] text-gray-400">Modifique as informações gerais deste chamado.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingIncident(false)}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-450 block mb-1">Título / Assunto *</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-gray-55 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-slate-800 font-sans text-gray-800"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-450 block mb-1">Categoria *</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full bg-gray-55 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-slate-800 text-gray-800"
                  >
                    {activeCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-450 block mb-1">Relato Descritivo *</label>
                  <textarea
                    required
                    rows={6}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full bg-gray-55 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-slate-800 font-sans text-gray-800"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsEditingIncident(false)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-slate-900 hover:bg-black text-white px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </form>
            ) : (
              <>
                {/* Thread Header */}
                <div>
                  <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Detalhes do Protocolo</span>
                    
                    {/* Actions and Status Toggler Trigger */}
                    <div className="flex gap-1 items-center">
                      {canEditIncident && (
                        <button
                          onClick={() => {
                            setEditTitle(selectedIncident.title);
                            setEditCategory(selectedIncident.category);
                            setEditDescription(selectedIncident.description);
                            setIsEditingIncident(true);
                          }}
                          className="text-[10px] bg-gray-100 hover:bg-gray-200 border px-2 py-0.5 rounded-lg text-gray-600 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Editar esta ocorrência"
                        >
                          <Edit2 className="w-2.5 h-2.5" /> Editar
                        </button>
                      )}
                      
                      {(currentUser.role === 'Administrador' || currentUser.role === 'MASTER' || currentUser.role === 'Porteiro') && (
                        <>
                          <button 
                            onClick={() => promoteIncidentStatus(selectedIncident.id, 'Em Andamento')}
                            className="text-[10px] bg-amber-55 text-amber-700 hover:bg-amber-150 border px-1.5 py-1 rounded-lg font-bold cursor-pointer transition-colors"
                          >
                            Atender
                          </button>
                          <button 
                            onClick={() => promoteIncidentStatus(selectedIncident.id, 'Resolvido')}
                            className="text-[10px] bg-emerald-55 text-emerald-700 hover:bg-emerald-150 border px-1.5 py-1 rounded-lg font-bold cursor-pointer transition-colors"
                          >
                            Resolver
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <h3 className="text-md font-bold text-gray-901 leading-snug">{selectedIncident.title}</h3>
                  <p className="text-[10px] text-gray-450 mt-1">Unidade: {selectedIncident.unit} | Status: <strong className="uppercase text-slate-800">{selectedIncident.status}</strong></p>
                </div>

                {/* Original content message */}
                <div className="bg-slate-50 p-4 rounded-xl border border-gray-100">
                  <span className="text-[9px] font-bold text-gray-400 block mb-1">RELATO DO MORADOR:</span>
                  <p className="text-xs text-gray-700 leading-relaxed font-sans whitespace-pre-wrap">{selectedIncident.description}</p>
                  {selectedIncident.photoUrls && selectedIncident.photoUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {selectedIncident.photoUrls.map((url, i) => (
                        <img key={i} src={url} alt={`Evidência ${i + 1}`} className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
                      ))}
                    </div>
                  )}
                </div>

                {/* Existing replies list */}
                <div className="space-y-3.5">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block border-b border-gray-100 pb-1.5">Tratativas oficiais:</span>
                  
                  {!selectedIncident.replies || selectedIncident.replies.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Nenhum retorno formulado ainda. Responda abaixo.</p>
                  ) : (
                    <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                      {(selectedIncident.replies || []).map((reply) => (
                        <div key={reply.id} className="bg-gray-50/50 p-3 rounded-xl text-xs space-y-1 border">
                          <div className="flex justify-between font-bold text-[10px] text-gray-700">
                            <span>{reply.author}</span>
                            <span className="text-gray-400 text-[9px]">{new Date(reply.date).toLocaleDateString()}</span>
                          </div>
                          <p className="text-gray-650 leading-relaxed font-sans">{reply.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submit answer with AI Helper inside */}
                <div className="border-t border-gray-100 pt-4 space-y-3.5" id="response-drafting-block">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700 block">Escrever Nova Tratativa:</span>
                  </div>

                  <form onSubmit={handlePostReply} className="space-y-3.5">
                    <textarea
                      required
                      rows={4}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Escreva a resposta administrativa ou use a sugestão de IA acima para otimizar tempo de redação..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-sky-500 font-sans text-gray-850"
                    />

                    <button
                      type="submit"
                      className="w-full bg-slate-950 hover:bg-black text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" /> Enviar Resposta
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="hidden lg:flex flex-col items-center justify-center text-center py-20 bg-gray-50 border border-dashed rounded-2xl h-full border-gray-200">
            <MessageSquare className="w-10 h-10 text-gray-300 mb-2" />
            <p className="text-xs text-gray-500 font-medium font-sans">Selecione uma ocorrência para ver as tratativas prediais completas.</p>
          </div>
        )}
      </div>
      
    </div>

      {/* Dynamic categories management modal */}
      {showManageCategoriesModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-slate-800" id="manage-categories-modal">
          <div className="bg-white rounded-2xl border border-gray-100 max-w-sm w-full shadow-lg overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin-slow" />
                <h3 className="font-semibold text-xs uppercase tracking-wider">Categorias de Ocorrência</h3>
              </div>
              <button
                onClick={() => setShowManageCategoriesModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              <p className="text-xs text-gray-500">
                Adicione novas categorias ou remova as existentes. Recomenda-se manter pelo menos os padrões para consistência.
              </p>

              {/* Inline input to register standard Categories */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nova categoria (ex: Elevador, Portão)"
                  value={newCategoryText}
                  onChange={(e) => setNewCategoryText(e.target.value)}
                  className="flex-1 text-xs border border-gray-200 focus:border-indigo-500 rounded-xl px-3 py-2 outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCategory();
                    }
                  }}
                />
                <button
                  onClick={handleAddCategory}
                  type="button"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </button>
              </div>

              {/* List of active categories */}
              <div className="border border-gray-100 rounded-xl overflow-hidden bg-gray-50/50 divide-y divide-gray-100 max-h-[40vh] overflow-y-auto">
                {activeCategories.map((cat) => (
                  <div key={cat} className="p-3 flex items-center justify-between text-xs text-slate-705 bg-white hover:bg-slate-50 transition-colors">
                    {editingCategory === cat ? (
                      <div className="flex items-center gap-1.5 w-full">
                        <input
                          type="text"
                          value={editCategoryText}
                          onChange={(e) => setEditCategoryText(e.target.value)}
                          className="flex-1 text-xs border border-indigo-500 rounded-lg px-2 py-1 outline-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveEditCategory(cat);
                            } else if (e.key === 'Escape') {
                              setEditingCategory(null);
                            }
                          }}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEditCategory(cat)}
                          className="p-1 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors cursor-pointer"
                          title="Salvar alteração"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCategory(null)}
                          className="p-1 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-lg transition-colors cursor-pointer"
                          title="Cancelar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="font-semibold font-sans">{cat}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEditCategory(cat)}
                            className="p-1 hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
                            title="Editar categoria"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveCategory(cat)}
                            className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-650 rounded-lg transition-colors cursor-pointer"
                            title="Excluir categoria"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-55 flex justify-end">
              <button
                onClick={() => setShowManageCategoriesModal(false)}
                className="bg-slate-900 hover:bg-black text-white px-5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                type="button"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
      {expandedIncident && (
        <IncidentDetailsModal 
          incident={expandedIncident} 
          onClose={() => setExpandedIncident(null)} 
        />
      )}
    </>
  );
}
