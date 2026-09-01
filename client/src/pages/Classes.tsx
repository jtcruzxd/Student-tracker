import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Pencil, GraduationCap, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { classesApi } from '../api';
import type { Class } from '../types';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { PageLoader } from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';

const INIT_FORM = { name: '', gradeLevel: '', section: '', schoolYear: '2025-2026' };

function validate(form: typeof INIT_FORM) {
  const e: Record<string, string> = {};
  if (!form.name.trim()) e.name = 'Class name is required';
  if (!form.gradeLevel.trim()) e.gradeLevel = 'Grade level is required';
  if (!form.schoolYear.trim()) e.schoolYear = 'School year is required';
  return e;
}

function ClassForm({ form, setForm, errors }: {
  form: typeof INIT_FORM;
  setForm: (f: typeof INIT_FORM) => void;
  errors: Record<string, string>;
}) {
  const set = (k: keyof typeof INIT_FORM, v: string) => setForm({ ...form, [k]: v });
  return (
    <div className="space-y-4">
      <div>
        <label className="label">Class Name *</label>
        <input className={`input ${errors.name ? 'input-error' : ''}`} value={form.name}
          onChange={e => set('name', e.target.value)} placeholder="e.g. Grade 10 – Rizal" />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Grade Level *</label>
          <input className={`input ${errors.gradeLevel ? 'input-error' : ''}`} value={form.gradeLevel}
            onChange={e => set('gradeLevel', e.target.value)} placeholder="e.g. Grade 10" />
          {errors.gradeLevel && <p className="text-xs text-red-500 mt-1">{errors.gradeLevel}</p>}
        </div>
        <div>
          <label className="label">Section</label>
          <input className="input" value={form.section}
            onChange={e => set('section', e.target.value)} placeholder="e.g. Rizal" />
        </div>
      </div>
      <div>
        <label className="label">School Year *</label>
        <input className={`input ${errors.schoolYear ? 'input-error' : ''}`} value={form.schoolYear}
          onChange={e => set('schoolYear', e.target.value)} placeholder="e.g. 2025-2026" />
        {errors.schoolYear && <p className="text-xs text-red-500 mt-1">{errors.schoolYear}</p>}
      </div>
    </div>
  );
}

export default function Classes() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<Class | null>(null);
  const [form, setForm] = useState({ ...INIT_FORM });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Class | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    classesApi.list().then(setClasses).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm({ ...INIT_FORM }); setFormErrors({}); setEditTarget(null); setModal('add'); };
  const openEdit = (c: Class) => {
    setForm({ name: c.name, gradeLevel: c.gradeLevel, section: c.section ?? '', schoolYear: c.schoolYear });
    setFormErrors({});
    setEditTarget(c);
    setModal('edit');
  };

  const handleSave = async () => {
    const errs = validate(form);
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setSaving(true);
    try {
      const payload = { ...form, section: form.section || undefined };
      if (modal === 'add') { await classesApi.create(payload); toast.success('Class created'); }
      else if (editTarget) { await classesApi.update(editTarget.id, payload); toast.success('Class updated'); }
      setModal(null);
      load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await classesApi.delete(deleteTarget.id);
      toast.success('Class deleted');
      setDeleteTarget(null);
      load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed to delete'); }
    finally { setDeleting(false); }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Classes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{classes.length} class{classes.length !== 1 ? 'es' : ''}</p>
        </div>
        <button className="btn-primary" onClick={openAdd}><Plus size={16} /> Add Class</button>
      </div>

      {loading ? <PageLoader /> : classes.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<GraduationCap size={28} />}
            title="No classes yet"
            description="Add your first class to start managing students."
            action={<button className="btn-primary btn-sm" onClick={openAdd}><Plus size={14} /> Add Class</button>}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {classes.map(c => (
            <div key={c.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <GraduationCap size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{c.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{c.gradeLevel}{c.section ? ` · ${c.section}` : ''}</p>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button className="btn-ghost btn-sm p-1.5" onClick={() => openEdit(c)}><Pencil size={14} /></button>
                  <button className="btn-ghost btn-sm p-1.5 text-red-500 hover:bg-red-50" onClick={() => setDeleteTarget(c)}><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Users size={14} className="text-gray-400" />
                  <span>{c._count?.students ?? 0} student{(c._count?.students ?? 0) !== 1 ? 's' : ''}</span>
                </div>
                <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">{c.schoolYear}</span>
              </div>
              <Link
                to={`/students?classId=${c.id}`}
                className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 py-2 rounded-lg border border-blue-100 hover:bg-blue-50 transition-colors"
              >
                <Users size={12} /> View Students
              </Link>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal === 'add' ? 'Add Class' : 'Edit Class'} size="sm">
        <ClassForm form={form} setForm={setForm} errors={formErrors} />
        <div className="flex justify-end gap-3 mt-6">
          <button className="btn-secondary" onClick={() => setModal(null)} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : modal === 'add' ? 'Add Class' : 'Save Changes'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Class"
        message={`Delete "${deleteTarget?.name}"? All students, attendance sessions, activities, and grades in this class will be permanently deleted.`}
        loading={deleting}
      />
    </div>
  );
}
