import React, { useState } from 'react';
import { 
  Megaphone, Sparkles, Send, Trash2, Calendar, User, Eye, Loader2, AlertCircle, UploadCloud, X, FileText, Image as ImageIcon
} from 'lucide-react';
import { Announcement } from '../types';
import { toUpperText, isImageUrl } from '../lib/utils';

interface AnnouncementsViewProps {
  announcements: Announcement[];
  onAddAnnouncement: (announcement: Announcement) => void;
  onUpdateAnnouncement: (announcement: Announcement) => void;
  onRemoveAnnouncement: (id: string) => void;
  currentUser: { role: 'MASTER' | 'Administrador' | 'Porteiro' | 'Morador' };
}

export default function AnnouncementsView({
  announcements,
  onAddAnnouncement,
  onUpdateAnnouncement,
  onRemoveAnnouncement,
  currentUser
}: AnnouncementsViewProps) {
  const isAdmin = currentUser.role === 'Administrador' || currentUser.role === 'MASTER';
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<string>('Geral');
  const [author, setAuthor] = useState('Administração Predial');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [categories, setCategories] = useState<string[]>(['Importante', 'Manutenção', 'Geral', 'Segurança']);
  const [tones, setTones] = useState<string[]>(['Polido', 'Alerta', 'Formal']);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Handle local file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachmentUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachmentUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert('Por favor, informe o Título e as Diretrizes do aviso antes de publicar.');
      return;
    }

    if (editingAnnouncement) {
      onUpdateAnnouncement({
        ...editingAnnouncement,
        title: title.trim(),
        content: content.trim(),
        category,
        author: author.trim() || 'Administração Predial',
        attachmentUrl: attachmentUrl || undefined,
      });
      setEditingAnnouncement(null);
    } else {
      const newAnn: Announcement = toUpperText({
        id: crypto.randomUUID(),
        title: title.trim(),
        content: content.trim(),
        category,
        date: new Date().toISOString().split('T')[0],
        author: author.trim() || 'Administração Predial',
        attachmentUrl: attachmentUrl || undefined,
      });
      onAddAnnouncement(newAnn);
    }

    // Clear and hide
    setTitle('');
    setContent('');
    setAttachmentUrl('');
    setCategory('Geral');
    setAuthor('Administração Predial');
    setShowAddForm(false);
  };

  const handleEdit = (ann: Announcement) => {
    setEditingAnnouncement(ann);
    setTitle(ann.title);
    setContent(ann.content);
    setCategory(ann.category);
    setAuthor(ann.author);
    setAttachmentUrl(ann.attachmentUrl || '');
    setShowAddForm(true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="announcements-tab-root">
      
      {/* Left Columns: Announcement Creation Panel */}
      {isAdmin && (
        <div className="lg:col-span-1 space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-gray-100">
              <Megaphone className="w-5 h-5 text-slate-800" />
              <h3 className="lg:text-sm xl:text-md font-semibold text-gray-901 tracking-tight">Criar Novo Comunicado</h3>
            </div>
            
            <p className="text-xs text-gray-500 leading-relaxed mb-4">
              Informe aos condôminos avisos importantes, reuniões importantes, revisões de manutenção ou informativos fiscais.
            </p>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="w-full bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              disabled={!isAdmin}
            >
              {showAddForm ? 'Esconder Formulário' : 'Abrir Formulário de Redação'}
            </button>
          </div>
        </div>

        {/* Regular Publishing Inputs */}
        {showAddForm && (
          <form onSubmit={handlePublish} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-4" id="standard-notice-form">
            <span className="text-xs font-bold text-gray-500 uppercase block tracking-wider">Ajuste Final de Publicação</span>
            
            <div>
              <label className="text-xs font-semibold text-gray-650 block mb-1">Título do Comunicado *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Interdição Temporária dos Elevadores da Torre 1"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-650 block mb-1">Texto Principal do Mural *</label>
              <textarea
                required
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Insira o texto que será lido pelos moradores aqui..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-sky-500 font-sans"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-gray-650 block mb-1">Autoridade</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Administração Predial"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-1.5 text-xs"
                />
              </div>
              
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> {editingAnnouncement ? 'Atualizar Aviso' : 'Publicar no Mural'}
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-gray-100">
              <label className="text-xs font-semibold text-gray-650 block mb-1">Anexo / Imagem do Aviso</label>
              
              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                  isDragging 
                    ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]' 
                    : 'border-gray-200 hover:border-gray-300 bg-gray-50/30'
                }`}
              >
                <input
                  type="file"
                  id="announcement-file-upload"
                  onChange={handleFileChange}
                  accept="image/*,application/pdf"
                  className="hidden"
                />
                <label 
                  htmlFor="announcement-file-upload"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  <UploadCloud className="w-8 h-8 text-gray-400" />
                  <div className="text-xs text-gray-650">
                    <span className="font-semibold text-indigo-600 hover:text-indigo-800">Clique para anexar</span> ou arraste o arquivo aqui
                  </div>
                  <p className="text-[10px] text-gray-400">Suporta Imagens (PNG, JPG, WebP, SVG) ou PDFs</p>
                </label>
              </div>

              {/* URL Input Alternative */}
              <div>
                <p className="text-[10px] text-gray-400 mb-1">Ou insira uma URL para imagem/arquivo:</p>
                <input
                  type="url"
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  placeholder="https://exemplo.com/imagem.png"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Attachment Preview */}
              {attachmentUrl && (
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex items-start gap-2.5">
                  {isImageUrl(attachmentUrl) ? (
                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-100 shrink-0 bg-white">
                      <img 
                        src={attachmentUrl} 
                        alt="Anexo" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 text-indigo-600">
                      <FileText className="w-5 h-5" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-gray-700 truncate">Arquivo Anexado</p>
                    <p className="text-[10px] text-gray-400 truncate">
                      {attachmentUrl.startsWith('data:') ? 'Imagem carregada localmente' : attachmentUrl}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachmentUrl('')}
                    className="p-1 hover:bg-gray-200 text-gray-400 hover:text-gray-600 rounded-lg shrink-0 transition-colors cursor-pointer"
                    title="Remover anexo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </form>
        )}
      </div>
    )}

      {/* Right Column: Visual Mural stream */}
      <div className={isAdmin ? "lg:col-span-2 space-y-4" : "lg:col-span-3 space-y-4"} id="announcements-mural-board">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-901">Mural Informativo do Condomínio</h3>
          <span className="text-xs bg-gray-100 text-gray-600 font-semibold px-2.5 py-1 rounded-full">
            {announcements.length} Recentes
          </span>
        </div>

        {announcements.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-gray-100">
            <Megaphone className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-500 uppercase">Mural de avisos vazio</p>
            <p className="text-xs text-gray-400 mt-1">Gere ou escreva um aviso no menu de redação ao lado.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((ann) => (
              <div 
                key={ann.id}
                className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4 hover:shadow-xs transition-shadow"
              >
                {/* Meta details header and actions */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-2 items-center">
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase ${
                      ann.category === 'Importante' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                      ann.category === 'Manutenção' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 
                      ann.category === 'Segurança' ? 'bg-red-50 text-red-700 border border-red-100' :
                      'bg-indigo-50 text-indigo-700 border border-indigo-100'
                    }`}>
                      {ann.category}
                    </span>
                    
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="font-mono">{ann.date.split('-').reverse().join('/')}</span>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (confirm('Deseja deletar este aviso do mural permanente?')) {
                            onRemoveAnnouncement(ann.id);
                          }
                        }}
                        className="text-gray-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Remover Comunicado"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(ann)}
                        className="text-gray-400 hover:text-sky-600 p-1 rounded-lg hover:bg-sky-50 transition-colors"
                        title="Editar Comunicado"
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <h4 className="text-md font-bold text-gray-950 tracking-tight leading-snug">{ann.title}</h4>
                  <div className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap font-sans">
                    {ann.content}
                  </div>
                  {ann.attachmentUrl && (
                    <div className="mt-3">
                      {isImageUrl(ann.attachmentUrl) ? (
                        <div className="relative group max-w-xl max-h-96 overflow-hidden rounded-xl border border-gray-100 bg-gray-50/50">
                          <img 
                            src={ann.attachmentUrl} 
                            alt={`Anexo de ${ann.title}`} 
                            className="max-h-80 object-contain w-full hover:scale-[1.01] transition-transform duration-300 rounded-xl"
                            referrerPolicy="no-referrer"
                          />
                          <a 
                            href={ann.attachmentUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/85 text-white text-[10px] px-2.5 py-1 rounded-lg transition-colors font-semibold"
                          >
                            Visualizar em tamanho real
                          </a>
                        </div>
                      ) : (
                        <a 
                          href={ann.attachmentUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors hover:underline"
                        >
                          Ver Anexo (Link/Arquivo)
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Sign-off Author */}
                <div className="border-t border-gray-100/80 pt-3 flex items-center gap-1 text-xs text-gray-400 font-medium italic">
                  <User className="w-3.5 h-3.5" />
                  <span>Por: {ann.author}</span>
                </div>
                
              </div>
            ))}
          </div>
        )}


      </div>
      
    </div>
  );
}
