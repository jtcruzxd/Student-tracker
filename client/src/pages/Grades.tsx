import { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Trash2, Pencil, BookOpen, Search, LayoutGrid, List, AlertTriangle, ArrowDownAZ, ArrowUpAZ } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { gradesApi, classesApi, studentsApi, activitiesApi } from '../api';
import type { GradeEntry, Class, Student, GradeCategory, Activity } from '../types';
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
  if (!form.title.trim()) e.title = 'Activity is required';
  if (!form.studentId) e.studentId = 'Student is required';
  if (!form.score || isNaN(Number(form.score))) e.score = 'Valid score required';
  if (!form.maxScore || isNaN(Number(form.maxScore)) || Number(form.maxScore) <= 0) e.maxScore = 'Valid max score required';
  if (Number(form.score) > Number(form.maxScore)) e.score = 'Score cannot exceed max score';
  if (!form.date) e.date = 'Date is required';
  return e;
}

// Student autocomplete — filters as you type, only shows provided students
function StudentAutocomplete({ value, onChange, students, error }: {
  value: string;
  onChange: (id: string) => void;
  students: Student[];
  error?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = students.find(s => s.id === value);

  // When value changes externally (form reset), clear query
  useEffect(() => {
    if (!value) setQuery('');
    else if (selected) setQuery(selected.fullName);
  }, [value, selected]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = students.filter(s =>
    !query.trim() || s.fullName.toLowerCase().includes(query.toLowerCase()) ||
    s.studentId.toLowerCase().includes(query.toLowerCase())
  );

  const select = (s: Student) => {
    setQuery(s.fullName);
    onChange(s.id);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          className={`input pl-9 ${error ? 'input-error' : ''}`}
          value={query}
          placeholder={students.length === 0 ? 'Select an activity first…' : 'Type to search student…'}
          disabled={students.length === 0}
          onChange={e => { setQuery(e.target.value); onChange(''); setOpen(true); }}
          onFocus={() => setOpen(true)}
          autoComplete="off"
        />
      </div>
      {open && students.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-400 italic">No students match "{query}"</li>
          ) : filtered.map(s => (
            <li
              key={s.id}
              className={`px-3 py-2.5 text-sm cursor-pointer transition-colors hover:bg-blue-50 ${
                s.id === value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
              }`}
              onMouseDown={e => { e.preventDefault(); select(s); }}
            >
              <span className="font-medium">{s.fullName}</span>
              <span className="text-xs text-gray-400 ml-2">{s.studentId}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GradeForm({ form, setForm, allStudents, activities, errors }: {
  form: typeof INIT_FORM;
  setForm: (f: typeof INIT_FORM) => void;
  allStudents: Student[];
  activities: Activity[];
  errors: Record<string, string>;
}) {
  const set = (k: keyof typeof INIT_FORM, v: string) => setForm({ ...form, [k]: v });
  const pct = form.score && form.maxScore
    ? ((Number(form.score) / Number(form.maxScore)) * 100).toFixed(1)
    : null;

  // When an activity is selected, auto-fill title, category, maxScore, activityId
  // and filter students to only those in that activity's class
  const selectedActivity = activities.find(a => a.id === form.activityId);
  const classStudents = selectedActivity
    ? allStudents.filter(s => s.classId === selectedActivity.classId)
    : [];

  const handleActivityChange = (actId: string) => {
    const act = activities.find(a => a.id === actId);
    if (!act) {
      setForm({ ...form, activityId: '', title: '', maxScore: '', studentId: '' });
      return;
    }
    const catMap: Record<string, GradeCategory> = {
      QUIZ: 'QUIZ', ASSIGNMENT: 'ASSIGNMENT', RECITATION: 'RECITATION',
      EXAM: 'EXAM', PROJECT: 'PROJECT',
    };
    setForm({
      ...form,
      activityId: act.id,
      title: act.title,
      category: catMap[act.type] ?? 'CUSTOM',
      maxScore: String(act.maxScore),
      studentId: '', // reset student when activity changes
    });
  };

  return (
    <div className="space-y-4">
      {/* Step 1: Pick activity */}
      <div>
        <label className="label">Activity / Subject *</label>
        <select
          className={`input ${errors.title ? 'input-error' : ''}`}
          value={form.activityId}
          onChange={e => handleActivityChange(e.target.value)}
        >
          <option value="">Select an activity…</option>
          {activities.map(a => (
            <option key={a.id} value={a.id}>
              {a.title} — {a.class?.name} ({a.type})
            </option>
          ))}
        </select>
        {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
      </div>

      {/* Step 2: Pick student — filtered by activity's class */}
      <div>
        <label className="label">
          Student *
          {selectedActivity && (
            <span className="ml-2 text-xs font-normal text-gray-400">
              {classStudents.length} student{classStudents.length !== 1 ? 's' : ''} in {selectedActivity.class?.name}
            </span>
          )}
        </label>
        <StudentAutocomplete
          value={form.studentId}
          onChange={id => set('studentId', id)}
          students={classStudents}
          error={errors.studentId}
        />
        {errors.studentId && <p className="text-xs text-red-500 mt-1">{errors.studentId}</p>}
      </div>

      {/* Auto-filled fields (still editable) */}
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
          <div className="input bg-gray-50 text-gray-500 select-none">{pct ? `${pct}%` : '—'}</div>
        </div>
      </div>

      <div>
        <label className="label">Remarks</label>
        <input className="input" value={form.remarks} onChange={e => set('remarks', e.target.value)}
          placeholder="Optional remarks" />
      </div>
    </div>
  );
}

export default function Grades() {
  const [grades, setGrades] = useState<GradeEntry[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc'); // A→Z by student name
  const [showAtRisk, setShowAtRisk] = useState(false); // ≤65% grades
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
      activitiesApi.list(),
    ]).then(([g, c, s, a]) => {
      setGrades(g);
      setClasses(c);
      setStudents(s);
      setActivities(a);
    }).finally(() => setLoading(false));
  }, [filterClass, filterCat]);

  useEffect(() => { load(); }, [load]);

  const filtered = grades
    .filter(g =>
      (!search || g.title.toLowerCase().includes(search.toLowerCase()) ||
        g.student?.fullName.toLowerCase().includes(search.toLowerCase())) &&
      (!showAtRisk || g.percentage <= 65)
    )
    .sort((a, b) => {
      const nameA = a.student?.fullName ?? '';
      const nameB = b.student?.fullName ?? '';
      return sortDir === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });

  const openAdd = () => {
    setForm({ ...INIT_FORM });
    setFormErrors({});
    setEditTarget(null);
    setModal('add');
  };

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
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length} entr{filtered.length !== 1 ? 'ies' : 'y'}
            {showAtRisk && <span className="ml-2 text-red-600 font-medium">· At Risk filter active</span>}
          </p>
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
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search activity or student…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-44" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
          <option value="">All Classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input w-40" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* A→Z / Z→A toggle */}
        <button
          className={`btn-secondary btn-sm flex items-center gap-1.5 ${sortDir === 'asc' ? 'border-blue-300 text-blue-700 bg-blue-50' : 'border-purple-300 text-purple-700 bg-purple-50'}`}
          onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
          title="Sort by student name"
        >
          {sortDir === 'asc' ? <ArrowDownAZ size={15} /> : <ArrowUpAZ size={15} />}
          {sortDir === 'asc' ? 'A → Z' : 'Z → A'}
        </button>

        {/* At-risk toggle */}
        <button
          className={`btn-sm flex items-center gap-1.5 rounded-lg border font-medium transition-colors ${
            showAtRisk
              ? 'bg-red-600 text-white border-red-600'
              : 'bg-white text-red-600 border-red-300 hover:bg-red-50'
          }`}
          onClick={() => setShowAtRisk(v => !v)}
          title="Show grades ≤65% (at risk)"
        >
          <AlertTriangle size={14} />
          At Risk (≤65%)
          {showAtRisk && (
            <span className="ml-1 bg-white/30 text-white rounded px-1 text-xs">
              {grades.filter(g => g.percentage <= 65).length}
            </span>
          )}
        </button>

        {(filterClass || filterCat || search || showAtRisk) && (
          <button className="btn-ghost btn-sm" onClick={() => { setFilterClass(''); setFilterCat(''); setSearch(''); setShowAtRisk(false); }}>
            Clear all
          </button>
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
                  <th className="table-th">Activity</th>
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
                  <tr key={g.id} className={`hover:bg-gray-50 ${g.percentage <= 65 ? 'bg-red-50/40' : ''}`}>
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
        <GradeForm
          form={form}
          setForm={setForm}
          allStudents={students}
          activities={activities}
          errors={formErrors}
        />
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
