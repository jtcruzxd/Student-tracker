import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Upload, Trash2, Pencil, Download, Eye, FolderOpen,
  FileText, File, X, Plus, Search, ChevronDown, ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { materialsApi, classesApi } from '../api';
import type { Material, Class } from '../types';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { PageLoader } from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';

// ─── Helpers ──────────────────────────────────────────────────────────────

const FILE_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  PDF:  { icon: '📄', color: '#D96868', bg: '#fdf3f3' },
  PPTX: { icon: '📊', color: '#d97706', bg: '#fffbeb' },
  PPT:  { icon: '📊', color: '#d97706', bg: '#fffbeb' },
  DOCX: { icon: '📝', color: '#2563eb', bg: '#eff6ff' },
  DOC:  { icon: '📝', color: '#2563eb', bg: '#eff6ff' },
  XLSX: { icon: '📈', color: '#689D4B', bg: '#f4f8f0' },
  XLS:  { icon: '📈', color: '#689D4B', bg: '#f4f8f0' },
  PNG:  { icon: '🖼️', color: '#7c3aed', bg: '#f5f3ff' },
  JPG:  { icon: '🖼️', color: '#7c3aed', bg: '#f5f3ff' },
  TXT:  { icon: '📃', color: '#6b7280', bg: '#f9fafb' },
  OTHER:{ icon: '📎', color: '#6b7280', bg: '#f9fafb' },
};

function fileIcon(type: string) {
  return FILE_ICONS[type] ?? FILE_ICONS.OTHER;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Checks if the file can be shown inline in the browser
function isViewable(type: string): boolean {
  return ['PDF', 'PNG', 'JPG', 'GIF', 'WEBP', 'TXT'].includes(type);
}

// For Office files, use Google Docs Viewer
function isOffice(type: string): boolean {
  return ['PPTX', 'PPT', 'DOCX', 'DOC', 'XLSX', 'XLS'].includes(type);
}

// ─── File Viewer Modal ────────────────────────────────────────────────────

function FileViewer({ material, onClose }: { material: Material; onClose: () => void }) {
  const fileUrl = materialsApi.fileUrl(material.id);
  const office = isOffice(material.fileType);
  const viewable = isViewable(material.fileType);
  const isImage = ['PNG', 'JPG', 'GIF', 'WEBP'].includes(material.fileType);

  // Google Docs Viewer URL for Office files
  const googleViewerUrl = office
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(
        window.location.origin + fileUrl
      )}&embedded=true`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm">
      {/* Header bar */}
      <div className="flex items-center gap-3 px-5 py-3 bg-gray-900 border-b border-white/10 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{material.title}</p>
          <p className="text-xs text-gray-400">{material.fileName} · {formatBytes(material.fileSize)}</p>
        </div>
        <button
          onClick={() => materialsApi.download(material.id, material.fileName).catch(e => toast.error(e.message))}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-white/10 hover:bg-white/20 transition-colors"
        >
          <Download size={13} /> Download
        </button>
        {office && googleViewerUrl && (
          <a href={googleViewerUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-white/10 hover:bg-white/20 transition-colors">
            <ExternalLink size={13} /> Open in Google
          </a>
        )}
        <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-gray-800 flex items-center justify-center">
        {isImage ? (
          <img src={fileUrl} alt={material.title} className="max-w-full max-h-full object-contain" />
        ) : material.fileType === 'TXT' ? (
          <iframe src={fileUrl} className="w-full h-full bg-white" title={material.title} />
        ) : material.fileType === 'PDF' ? (
          <iframe
            src={`${fileUrl}#toolbar=1&navpanes=1`}
            className="w-full h-full"
            title={material.title}
          />
        ) : office && googleViewerUrl ? (
          <iframe
            src={googleViewerUrl}
            className="w-full h-full bg-white"
            title={material.title}
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        ) : (
          <div className="flex flex-col items-center gap-4 text-center p-8">
            <div className="text-6xl">{fileIcon(material.fileType).icon}</div>
            <p className="text-white font-medium">{material.fileName}</p>
            <p className="text-gray-400 text-sm">This file type cannot be previewed in the browser.</p>
            <button
              onClick={() => materialsApi.download(material.id, material.fileName).catch(e => toast.error(e.message))}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: '#D96868' }}
            >
              <Download size={15} /> Download to view
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Upload Modal ─────────────────────────────────────────────────────────

function UploadModal({
  open, onClose, onUploaded, classes,
}: {
  open: boolean; onClose: () => void; onUploaded: () => void; classes: Class[];
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [classId, setClassId] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => { setFile(null); setTitle(''); setDescription(''); setClassId(''); setErrors({}); };

  const handleClose = () => { reset(); onClose(); };

  const handleFile = (f: File) => {
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
  };

  const handleUpload = async () => {
    const e: Record<string, string> = {};
    if (!file) e.file = 'Please select a file';
    if (!title.trim()) e.title = 'Title is required';
    if (!classId) e.classId = 'Please select a class';
    if (Object.keys(e).length) { setErrors(e); return; }

    setUploading(true);
    try {
      await materialsApi.upload(file!, title.trim(), classId, description || undefined);
      toast.success('Material uploaded successfully');
      reset();
      onUploaded();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally { setUploading(false); }
  };

  return (
    <Modal open={open} onClose={handleClose} onSubmit={handleUpload} title="Upload Material" size="md">
      <div className="space-y-4">
        {/* Drop zone */}
        <div
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            dragOver ? 'border-primary-400 bg-primary-50' : errors.file ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
          }`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onClick={() => inputRef.current?.click()}
        >
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl">{fileIcon(file.name.split('.').pop()?.toUpperCase() ?? 'OTHER').icon}</span>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-800 truncate max-w-xs">{file.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{formatBytes(file.size)}</p>
              </div>
              <button type="button" onClick={e => { e.stopPropagation(); setFile(null); }}
                className="p-1 rounded-full hover:bg-gray-200 text-gray-400 ml-2">
                <X size={14} />
              </button>
            </div>
          ) : (
            <>
              <Upload size={24} className="text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">Click or drag a file here</p>
              <p className="text-xs text-gray-400 mt-1">PDF, PPT, PPTX, DOC, DOCX, XLS, XLSX, images — up to 25 MB</p>
            </>
          )}
          <input ref={inputRef} type="file"
            accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.txt"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
          />
        </div>
        {errors.file && <p className="text-xs text-red-500 -mt-2">{errors.file}</p>}

        {/* Class */}
        <div>
          <label className="label">Class *</label>
          <select className={`input ${errors.classId ? 'input-error' : ''}`}
            value={classId} onChange={e => setClassId(e.target.value)}>
            <option value="">Select class…</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {errors.classId && <p className="text-xs text-red-500 mt-1">{errors.classId}</p>}
        </div>

        {/* Title */}
        <div>
          <label className="label">Title *</label>
          <input className={`input ${errors.title ? 'input-error' : ''}`}
            value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Chapter 3 – Linear Equations" />
          {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="label">Description <span className="text-gray-400 font-normal">(optional)</span></label>
          <textarea className="input" rows={2}
            value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Brief notes about this material…" />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button className="btn-secondary" onClick={handleClose} disabled={uploading}>Cancel</button>
        <button className="btn-primary" onClick={handleUpload} disabled={uploading || !file}>
          {uploading
            ? <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Uploading…
              </span>
            : <><Plus size={14} /> Upload</>}
        </button>
      </div>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function Materials() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState('');
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');
  const [expandedClass, setExpandedClass] = useState<Set<string>>(new Set());

  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewer, setViewer] = useState<Material | null>(null);

  // Edit modal
  const [editTarget, setEditTarget] = useState<Material | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Material | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      materialsApi.list(filterClass ? { classId: filterClass } : {}),
      classesApi.list(),
    ]).then(([m, c]) => {
      setMaterials(m);
      setClasses(c);
      // Auto-expand all classes on first load
      setExpandedClass(new Set(c.map(cls => cls.id)));
    }).finally(() => setLoading(false));
  }, [filterClass]);

  useEffect(() => { load(); }, [load]);

  const filtered = materials.filter(m => {
    if (filterType && m.fileType !== filterType) return false;
    if (search && !m.title.toLowerCase().includes(search.toLowerCase()) &&
        !m.fileName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Group by class
  const grouped = classes.reduce<Record<string, { cls: Class; items: Material[] }>>((acc, cls) => {
    acc[cls.id] = { cls, items: filtered.filter(m => m.classId === cls.id) };
    return acc;
  }, {});

  const openEdit = (m: Material) => {
    setEditTarget(m); setEditTitle(m.title); setEditDesc(m.description ?? '');
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    setEditSaving(true);
    try {
      await materialsApi.update(editTarget.id, { title: editTitle, description: editDesc || undefined });
      toast.success('Updated');
      setEditTarget(null);
      load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed'); }
    finally { setEditSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await materialsApi.delete(deleteTarget.id);
      toast.success('Material deleted');
      setDeleteTarget(null);
      load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed'); }
    finally { setDeleting(false); }
  };

  const fileTypes = [...new Set(materials.map(m => m.fileType))].sort();

  const totalByClass = (classId: string) => filtered.filter(m => m.classId === classId).length;

  return (
    <div className="space-y-5 max-w-6xl">

      {/* ── Header ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Teaching Materials</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length} file{filtered.length !== 1 ? 's' : ''} across {classes.length} class{classes.length !== 1 ? 'es' : ''}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setUploadOpen(true)}>
          <Upload size={15} /> Upload Material
        </button>
      </div>

      {/* ── Filters ────────────────────────────────── */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search by title or filename…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-48" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
          <option value="">All Classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {fileTypes.length > 0 && (
          <select className="input w-32" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            {fileTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        {(filterClass || filterType || search) && (
          <button className="btn-ghost btn-sm" onClick={() => { setFilterClass(''); setFilterType(''); setSearch(''); }}>
            Clear
          </button>
        )}
      </div>

      {/* ── Content ────────────────────────────────── */}
      {loading ? <PageLoader /> : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<FolderOpen size={28} />}
            title="No materials yet"
            description="Upload PDFs, presentations, or documents for your classes."
            action={<button className="btn-primary btn-sm" onClick={() => setUploadOpen(true)}><Upload size={14} /> Upload Material</button>}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {classes.map(cls => {
            const items = grouped[cls.id]?.items ?? [];
            if (items.length === 0) return null;
            const isExpanded = expandedClass.has(cls.id);

            return (
              <div key={cls.id} className="card overflow-hidden">
                {/* Class header */}
                <div
                  className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedClass(prev => {
                    const n = new Set(prev);
                    n.has(cls.id) ? n.delete(cls.id) : n.add(cls.id);
                    return n;
                  })}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: '#f4f8f0' }}>
                    <FolderOpen size={18} style={{ color: '#689D4B' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{cls.name}</p>
                    <p className="text-xs text-gray-400">{cls.gradeLevel}{cls.section ? ` · ${cls.section}` : ''} · {totalByClass(cls.id)} file{totalByClass(cls.id) !== 1 ? 's' : ''}</p>
                  </div>
                  <ChevronDown size={16} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>

                {/* Files grid */}
                {isExpanded && (
                  <div className="border-t border-gray-50 p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {items.map(m => {
                        const fi = fileIcon(m.fileType);
                        const canView = isViewable(m.fileType) || isOffice(m.fileType);
                        return (
                          <div key={m.id} className="group rounded-xl border border-gray-100 p-4 hover:shadow-md transition-all hover:border-gray-200 bg-white">
                            {/* File type icon + info */}
                            <div className="flex items-start gap-3">
                              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                                style={{ background: fi.bg }}>
                                {fi.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{m.title}</p>
                                <p className="text-xs text-gray-400 truncate mt-0.5">{m.fileName}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                                    style={{ background: fi.bg, color: fi.color }}>
                                    {m.fileType}
                                  </span>
                                  <span className="text-xs text-gray-300">{formatBytes(m.fileSize)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Description */}
                            {m.description && (
                              <p className="text-xs text-gray-500 mt-2 line-clamp-2">{m.description}</p>
                            )}

                            {/* Date + actions */}
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                              <span className="text-xs text-gray-400">
                                {format(new Date(m.createdAt), 'MMM d, yyyy')}
                              </span>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {canView && (
                                  <button
                                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                                    title="View"
                                    onClick={() => setViewer(m)}
                                  >
                                    <Eye size={14} />
                                  </button>
                                )}
                                <button
                                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                                  title="Download"
                                  onClick={() => materialsApi.download(m.id, m.fileName).catch(e => toast.error(e.message))}
                                >
                                  <Download size={14} />
                                </button>
                                <button
                                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                                  title="Edit"
                                  onClick={() => openEdit(m)}
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                                  title="Delete"
                                  onClick={() => setDeleteTarget(m)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Upload Modal ──────────────────────────── */}
      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={load}
        classes={classes}
      />

      {/* ── Edit Modal ────────────────────────────── */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} onSubmit={handleSaveEdit} title="Edit Material" size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input className="input" value={editTitle}
              onChange={e => setEditTitle(e.target.value)} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={2} value={editDesc}
              onChange={e => setEditDesc(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button className="btn-secondary" onClick={() => setEditTarget(null)} disabled={editSaving}>Cancel</button>
          <button className="btn-primary" onClick={handleSaveEdit} disabled={editSaving}>
            {editSaving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </Modal>

      {/* ── Delete Confirm ────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Material"
        message={`Delete "${deleteTarget?.title}"? The file will be permanently removed.`}
        loading={deleting}
      />

      {/* ── File Viewer ───────────────────────────── */}
      {viewer && <FileViewer material={viewer} onClose={() => setViewer(null)} />}
    </div>
  );
}
