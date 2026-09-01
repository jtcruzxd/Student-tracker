import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Pencil, Filter, BookOpen, Search, LayoutGrid, List } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { gradesApi, classesApi, studentsApi } from '../api';
import type { GradeEntry, Class, Student, GradeCategory } from '../types';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { PageLoader } from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { GradeBadge, PercentageBadge, ScoreStatusBadge } from '../components/ui/StatusBadge';

const CATEGORIES: GradeCategory[] = ['QUIZ', 'ASSIGNMENT', 'RECITATION', 'EXAM', 'PROJECT', 'CUSTOM'];

const INIT_FORM = {
  title: '', category: 'QUIZ' as GradeCategory, score: '', maxScore: '',
  remarks: '', date: format(new Date(), 'yyyy-MM-dd'), studentId: '', activityId: ''
};

function validate(form: typeof INIT_FORM) {
  const e: Record<string, string> = {};
  if (!form.title.trim()) e.title = 'Title is required';
  if (!form.studentId) e.studentId = 'Student is required';
  if (!form.score || isNaN(Number(form.score))) e.score = 'Valid score required';
  if (!form.maxScore || isNaN(Number(form.maxScore)) || Number(form.maxScore) <= 0) e.maxScore = 'Valid max score required';
  if (Number(form.score) > Number(form.maxScore)) e.score = 'Score cannot exceed max score';
  if (!form.date) e.date = 'Date is required';
  return e;
}

function GradeForm({ form, setForm, students, errors }: {
  form: typeof INIT_FORM;
  setForm: (f: typeof INIT_FORM) => void;
  students: Student[];
  errors: Record<string, string>;
}) {
  const set = (k: keyof typeof INIT_FORM, v: string) => setForm({ ...form, [k]: v });
  const pct = form.score && form.maxScore ? ((Number(form.score) / Number(form.maxScore)) * 100).toFixed(1) : null;
  return (
    <div className="space-y-4">
      <div>
        <label className="label">Student *</label>
        <select className={`input ${errors.studentId ? 'input-error' : ''}`} value={form.studentId} onChange={e => set('studentId', e.target.value)}>
          <option value="">Select student…</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.fullName} ({s.studentId}) – {s.class?.name}</option>)}
        </select>
        {errors.studentId && <p className="text-xs text-red-500 mt-1">{errors.studentId}</p>}
      </div>
      <div>
        <label className="label">Title / Activity Name *</label>
        <input className={`input ${errors.title ? 'input-error' : ''}`} value={form.title}
          onChange={e => set('title', e.target.value)} placeholder="e.g. Quiz 1 – Linear Equations" />
        {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Category *</label>
          <select className="input" value={form.category} onChange={e => set('category', e.target.value as GradeCategory)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Date *</label>
          <input type="date" className={`input ${errors.date ? 'input-error' : ''}`} value={form.date}
            onChange={e => set('date', e.target.value)} />
          {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="label">Score *</label>
          <input type="number" className={`input ${errors.score ? 'input-error' : ''}`} value={form.score}
            onChange={e => set('score', e.target.value)} placeholder="0" min="0" step="0.5" />
          {errors.score && <p className="text-xs text-red-500 mt-1">{errors.score}</p>}
        </div>
        <div>
          <label className="label">Max Score *</label>
          <input type="number" className={`input ${errors.maxScore ? 'input-error' : ''}`} value={form.maxScore}
            onChange={e => set('maxScore', e.target.value)} placeholder="100" min="0.01" step="0.5" />
          {errors.maxScore && <p className="text-xs text-red-500 mt-1">{errors.maxScore}</p>}
        </div>
        <div>
          <label className="label">Percentage</label>
          <div className="input bg-gray-50 text-gray-500">{pct ? `${pct}%` : '—'}</div>
        </div>
      </div>
      <div>
        <label className="label">Remarks</label>
        <input className="input" value={form.remarks} onChange={e => set('remarks', e.target.value)} placeholder="Optional remarks" />
      </div>
    </div>
  );
}

export default function Grades() {
  const [grades, setGrades] = useState<GradeEntry[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [view, setView] = useState<'table' | 'cards'>('table');

  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<GradeEntry | null>(null);
  const [form, setForm] = useState({ ...INIT_FORM });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GradeEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      gradesApi.list({ classId: filterClass || undefined, category: filterCat || undefined }),
      classesApi.list(),
      studentsApi.list(),
    ]).then(([g, c, s]) => {
      setGrades(g);
      setClasses(c);
      setStudents(s);
    }).finally(() => setLoading(false));
  }, [filterClass, filterCat]);

  useEffect(() => { load(); }, [load]);

  const filtered = grades.filter(g =>
    !search || g.title.toLowerCase().includes(search.toLowerCase()) ||
    g.student?.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setForm({ ...INIT_FORM }); setFormErrors({}); setEditTarget(null); setModal('add'); };
  const openEdit = (g: GradeEntry) => {
    setForm({
      title: g.title, category: g.category, score: String(g.score), maxScore: String(g.maxScore),
      remarks: g.remarks ?? '', date: format(new Date(g.date), 'yyyy-MM-dd'),
      studentId: g.studentId, activityId: g.activityId ?? '',
    });
    setFormErrors({});
    setEditTarget(g);
    setModal('edit');
  };

  const handleSave = async () => {
    const errs = validate(form);
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setSaving(true);
    try {
      const payload = {
        ...form, score: Number(form.score), maxScore: Number(form.maxScore),
        activityId: form.activityId || undefined,
      };
      if (modal === 'add') { await gradesApi.create(payload); toast.success('Grade added'); }
      else if (editTarget) { await gradesApi.update(editTarget.id, payload); toast.success('Grade updated'); }
      setModal(null);
      load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await gradesApi.delete(deleteTarget.id);
      toast.success('Grade deleted');
      setDeleteTarget(null);
      load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed to delete'); }
    finally { setDeleting(false); }
  };

  // Summary cards by category
  const catSummary = CATEGORIES.map(cat => {
    const entries = filtered.filter(g => g.category === cat);
    const avg = entries.length ? entries.reduce((s, g) => s + g.percentage, 0) / entries.length : null;
    return { cat, count: entries.length, avg };
  }).filter(c => c.count > 0);

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Grades</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} entr{filtered.length !== 1 ? 'ies' : 'y'}</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button onClick={() => setView('table')} className={`px-3 py-2 ${view === 'table' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}><List size={15} /></button>
            <button onClick={() => setView('cards')} className={`px-3 py-2 ${view === 'cards' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}><LayoutGrid size={15} /></button>
          </div>
          <button className="btn-primary" onClick={openAdd}><Plus size={16} /> Add Grade</button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search title or student…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-48" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
          <option value="">All Classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input w-44" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {(filterClass || filterCat || search) && (
          <button className="btn-ghost btn-sm" onClick={() => { setFilterClass(''); setFilterCat(''); setSearch(''); }}>Clear</button>
        )}
      </div>

      {/* Category summary cards */}
      {catSummary.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {catSummary.map(({ cat, count, avg }) => (
            <div key={cat} className="card p-3 text-center cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setFilterCat(cat === filterCat ? '' : cat)}>
              <GradeBadge category={cat} />
              <p className="text-xl font-bold text-gray-900 mt-2">{avg != null ? `${avg.toFixed(1)}%` : '—'}</p>
              <p className="text-xs text-gray-400 mt-0.5">{count} entr{count !== 1 ? 'ies' : 'y'}</p>
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? <PageLoader /> : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<BookOpen size={28} />}
            title="No grades found"
            description="Add grade entries to track student performance."
            action={<button className="btn-primary btn-sm" onClick={openAdd}><Plus size={14} /> Add Grade</button>}
          />
        </div>
      ) : view === 'table' ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-th">Date</th>
                  <th className="table-th">Student</th>
                  <th className="table-th">Title</th>
                  <th className="table-th">Category</th>
                  <th className="table-th">Score</th>
                  <th className="table-th">Percentage</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Remarks</th>
                  <th className="table-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(g => (
                  <tr key={g.id} className="hover:bg-gray-50">
                    <td className="table-td text-gray-500">{format(new Date(g.date), 'MMM d, yyyy')}</td>
                    <td className="table-td">
                      <div className="font-medium">{g.student?.fullName}</div>
                      <div className="text-xs text-gray-400">{g.student?.class?.name}</div>
                    </td>
                    <td className="table-td font-medium">{g.title}</td>
                    <td className="table-td"><GradeBadge category={g.category} /></td>
                    <td className="table-td">{g.score}/{g.maxScore}</td>
                    <td className="table-td"><PercentageBadge pct={g.percentage} /></td>
                    <td className="table-td"><ScoreStatusBadge pct={g.percentage} /></td>
                    <td className="table-td text-gray-400">{g.remarks || '—'}</td>
                    <td className="table-td">
                      <div className="flex justify-end gap-1">
                        <button className="btn-ghost btn-sm p-1.5" onClick={() => openEdit(g)}><Pencil size={14} /></button>
                        <button className="btn-ghost btn-sm p-1.5 text-red-500 hover:bg-red-50" onClick={() => setDeleteTarget(g)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(g => (
            <div key={g.id} className="card p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{g.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{g.student?.fullName}</p>
                </div>
                <GradeBadge category={g.category} />
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-gray-900">{g.percentage.toFixed(1)}%</p>
                  <p className="text-xs text-gray-400">{g.score}/{g.maxScore} points</p>
                </div>
                <ScoreStatusBadge pct={g.percentage} />
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${g.percentage >= 90 ? 'bg-green-500' : g.percentage >= 75 ? 'bg-blue-500' : g.percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(g.percentage, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-gray-50">
                <span className="text-xs text-gray-400">{format(new Date(g.date), 'MMM d, yyyy')}</span>
                <div className="flex gap-1">
                  <button className="btn-ghost btn-sm p-1" onClick={() => openEdit(g)}><Pencil size={13} /></button>
                  <button className="btn-ghost btn-sm p-1 text-red-500 hover:bg-red-50" onClick={() => setDeleteTarget(g)}><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal === 'add' ? 'Add Grade' : 'Edit Grade'} size="md">
        <GradeForm form={form} setForm={setForm} students={students} errors={formErrors} />
        <div className="flex justify-end gap-3 mt-6">
          <button className="btn-secondary" onClick={() => setModal(null)} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : modal === 'add' ? 'Add Grade' : 'Save Changes'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Grade"
        message={`Delete grade entry "${deleteTarget?.title}" for ${deleteTarget?.student?.fullName}?`}
        loading={deleting}
      />
    </div>
  );
}
