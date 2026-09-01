import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Pencil, Filter, ClipboardList, ChevronDown, Save } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { activitiesApi, classesApi } from '../api';
import type { Activity, Class, ActivityType, ActivityScore } from '../types';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { PageLoader } from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { GradeBadge } from '../components/ui/StatusBadge';

const TYPES: ActivityType[] = ['QUIZ', 'ASSIGNMENT', 'RECITATION', 'EXAM', 'PROJECT'];

const INIT_FORM = {
  title: '', type: 'QUIZ' as ActivityType, description: '', dueDate: '',
  activityDate: '', maxScore: '', classId: '',
};

function validate(form: typeof INIT_FORM) {
  const e: Record<string, string> = {};
  if (!form.title.trim()) e.title = 'Title is required';
  if (!form.classId) e.classId = 'Class is required';
  if (!form.maxScore || isNaN(Number(form.maxScore)) || Number(form.maxScore) <= 0) e.maxScore = 'Valid max score required';
  return e;
}

function ActivityForm({ form, setForm, classes, errors }: {
  form: typeof INIT_FORM; setForm: (f: typeof INIT_FORM) => void;
  classes: Class[]; errors: Record<string, string>;
}) {
  const set = (k: keyof typeof INIT_FORM, v: string) => setForm({ ...form, [k]: v });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Type *</label>
          <select className="input" value={form.type} onChange={e => set('type', e.target.value as ActivityType)}>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Class *</label>
          <select className={`input ${errors.classId ? 'input-error' : ''}`} value={form.classId} onChange={e => set('classId', e.target.value)}>
            <option value="">Select class…</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {errors.classId && <p className="text-xs text-red-500 mt-1">{errors.classId}</p>}
        </div>
      </div>
      <div>
        <label className="label">Title *</label>
        <input className={`input ${errors.title ? 'input-error' : ''}`} value={form.title}
          onChange={e => set('title', e.target.value)} placeholder="e.g. Quiz 1 – Linear Equations" />
        {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input" rows={2} value={form.description}
          onChange={e => set('description', e.target.value)} placeholder="Instructions or details…" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="label">Max Score *</label>
          <input type="number" className={`input ${errors.maxScore ? 'input-error' : ''}`} value={form.maxScore}
            onChange={e => set('maxScore', e.target.value)} placeholder="100" min="0.01" step="0.5" />
          {errors.maxScore && <p className="text-xs text-red-500 mt-1">{errors.maxScore}</p>}
        </div>
        <div>
          <label className="label">Activity Date</label>
          <input type="date" className="input" value={form.activityDate} onChange={e => set('activityDate', e.target.value)} />
        </div>
        <div>
          <label className="label">Due Date</label>
          <input type="date" className="input" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
        </div>
      </div>
    </div>
  );
}

export default function Activities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState('');
  const [filterType, setFilterType] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<Activity | null>(null);
  const [form, setForm] = useState({ ...INIT_FORM });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Activity | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Score entry
  const [scoreActivity, setScoreActivity] = useState<Activity | null>(null);
  const [scoreMap, setScoreMap] = useState<Record<string, { score: string; submitted: boolean; notes: string }>>({});
  const [scoreSaving, setScoreSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      activitiesApi.list({ classId: filterClass || undefined, type: filterType || undefined }),
      classesApi.list(),
    ]).then(([a, c]) => {
      setActivities(a);
      setClasses(c);
    }).finally(() => setLoading(false));
  }, [filterClass, filterType]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm({ ...INIT_FORM }); setFormErrors({}); setEditTarget(null); setModal('add'); };
  const openEdit = (a: Activity) => {
    setForm({
      title: a.title, type: a.type, description: a.description ?? '',
      dueDate: a.dueDate ? format(new Date(a.dueDate), 'yyyy-MM-dd') : '',
      activityDate: a.activityDate ? format(new Date(a.activityDate), 'yyyy-MM-dd') : '',
      maxScore: String(a.maxScore), classId: a.classId,
    });
    setFormErrors({});
    setEditTarget(a);
    setModal('edit');
  };

  const handleSave = async () => {
    const errs = validate(form);
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        maxScore: Number(form.maxScore),
        dueDate: form.dueDate || undefined,
        activityDate: form.activityDate || undefined,
        description: form.description || undefined,
      };
      if (modal === 'add') { await activitiesApi.create(payload); toast.success('Activity created'); }
      else if (editTarget) { await activitiesApi.update(editTarget.id, payload); toast.success('Activity updated'); }
      setModal(null);
      load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await activitiesApi.delete(deleteTarget.id);
      toast.success('Activity deleted');
      setDeleteTarget(null);
      load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed to delete'); }
    finally { setDeleting(false); }
  };

  const openScoring = async (a: Activity) => {
    const full = await activitiesApi.get(a.id);
    setScoreActivity(full);
    const map: typeof scoreMap = {};
    (full.scores ?? []).forEach((sc: ActivityScore) => {
      map[sc.studentId] = {
        score: sc.score != null ? String(sc.score) : '',
        submitted: sc.submitted,
        notes: sc.notes ?? '',
      };
    });
    setScoreMap(map);
  };

  const handleSaveScores = async () => {
    if (!scoreActivity) return;
    setScoreSaving(true);
    try {
      const scores = Object.entries(scoreMap).map(([studentId, v]) => ({
        studentId,
        score: v.score !== '' ? Number(v.score) : undefined,
        submitted: v.submitted,
        notes: v.notes || undefined,
      }));
      await activitiesApi.updateScores(scoreActivity.id, scores);
      toast.success('Scores saved');
      setScoreActivity(null);
      load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed to save scores'); }
    finally { setScoreSaving(false); }
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Activities</h1>
          <p className="text-sm text-gray-500 mt-0.5">{activities.length} activit{activities.length !== 1 ? 'ies' : 'y'}</p>
        </div>
        <button className="btn-primary" onClick={openAdd}><Plus size={16} /> Create Activity</button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-gray-400" />
          <select className="input w-48" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
            <option value="">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <select className="input w-40" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {(filterClass || filterType) && (
          <button className="btn-ghost btn-sm" onClick={() => { setFilterClass(''); setFilterType(''); }}>Clear</button>
        )}
      </div>

      {/* Activity list */}
      {loading ? <PageLoader /> : activities.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<ClipboardList size={28} />}
            title="No activities yet"
            description="Create quizzes, assignments, recitations, and more."
            action={<button className="btn-primary btn-sm" onClick={openAdd}><Plus size={14} /> Create Activity</button>}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map(a => {
            const isExp = expanded.has(a.id);
            const scores = a.scores ?? [];
            const scored = scores.filter(s => s.score != null).length;
            const submitted = scores.filter(s => s.submitted).length;
            const avg = scored > 0
              ? (scores.filter(s => s.score != null).reduce((sum, s) => sum + (s.score! / a.maxScore) * 100, 0) / scored).toFixed(1)
              : null;

            return (
              <div key={a.id} className="card overflow-hidden">
                <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => toggleExpand(a.id)}>
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                    <ClipboardList size={18} className="text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{a.title}</span>
                      <GradeBadge category={a.type} />
                      <span className="badge-gray">{a.class?.name}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-400">
                      <span>Max: {a.maxScore} pts</span>
                      {a.activityDate && <span>Date: {format(new Date(a.activityDate), 'MMM d, yyyy')}</span>}
                      {a.dueDate && <span>Due: {format(new Date(a.dueDate), 'MMM d, yyyy')}</span>}
                      {scores.length > 0 && <span>{scored}/{scores.length} scored · {submitted} submitted {avg ? `· avg ${avg}%` : ''}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button className="btn-primary btn-sm" onClick={e => { e.stopPropagation(); openScoring(a); }}>
                      <Pencil size={13} /> Scores
                    </button>
                    <button className="btn-ghost btn-sm p-1.5" onClick={e => { e.stopPropagation(); openEdit(a); }}><Pencil size={14} /></button>
                    <button className="btn-ghost btn-sm p-1.5 text-red-500 hover:bg-red-50" onClick={e => { e.stopPropagation(); setDeleteTarget(a); }}><Trash2 size={14} /></button>
                    <ChevronDown size={16} className={`text-gray-400 transition-transform ml-1 ${isExp ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {isExp && (
                  <div className="border-t border-gray-50 p-4">
                    {a.description && <p className="text-sm text-gray-500 mb-3">{a.description}</p>}
                    {scores.length === 0 ? (
                      <p className="text-sm text-gray-400">No scores recorded yet.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="table-th">Student</th>
                            <th className="table-th">Score</th>
                            <th className="table-th">Percentage</th>
                            <th className="table-th">Submitted</th>
                            <th className="table-th">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {scores.map(sc => {
                            const pct = sc.score != null ? ((sc.score / a.maxScore) * 100).toFixed(1) : null;
                            return (
                              <tr key={sc.id} className="hover:bg-gray-50">
                                <td className="table-td font-medium">{sc.student?.fullName}</td>
                                <td className="table-td">{sc.score != null ? `${sc.score}/${a.maxScore}` : <span className="text-gray-300">—</span>}</td>
                                <td className="table-td">
                                  {pct ? <span className={`font-medium ${Number(pct) >= 75 ? 'text-green-600' : 'text-red-500'}`}>{pct}%</span> : '—'}
                                </td>
                                <td className="table-td">{sc.submitted ? <span className="badge-green">Yes</span> : <span className="badge-gray">No</span>}</td>
                                <td className="table-td text-gray-400">{sc.notes || '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal === 'add' ? 'Create Activity' : 'Edit Activity'} size="md">
        <ActivityForm form={form} setForm={setForm} classes={classes} errors={formErrors} />
        <div className="flex justify-end gap-3 mt-6">
          <button className="btn-secondary" onClick={() => setModal(null)} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : modal === 'add' ? 'Create Activity' : 'Save Changes'}
          </button>
        </div>
      </Modal>

      {/* Score Entry Modal */}
      <Modal open={!!scoreActivity} onClose={() => setScoreActivity(null)} title={`Scores: ${scoreActivity?.title}`} size="lg">
        {scoreActivity && (
          <>
            <p className="text-sm text-gray-500 mb-4">
              Max score: <strong>{scoreActivity.maxScore}</strong> pts · {scoreActivity.class?.name}
            </p>
            <div className="max-h-96 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
              {(scoreActivity.scores ?? []).map((sc: ActivityScore) => {
                const v = scoreMap[sc.studentId] ?? { score: '', submitted: false, notes: '' };
                const pct = v.score !== '' ? ((Number(v.score) / scoreActivity.maxScore) * 100).toFixed(1) : null;
                return (
                  <div key={sc.studentId} className="flex items-center gap-3 p-3 hover:bg-gray-50">
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {sc.student?.fullName?.charAt(0)}
                    </div>
                    <span className="text-sm font-medium flex-1 min-w-0 truncate">{sc.student?.fullName}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number" min="0" max={scoreActivity.maxScore} step="0.5"
                        className="input w-20 text-center"
                        placeholder="Score"
                        value={v.score}
                        onChange={e => setScoreMap(m => ({ ...m, [sc.studentId]: { ...v, score: e.target.value } }))}
                      />
                      <span className="text-xs text-gray-400 w-12 text-center">{pct ? `${pct}%` : '—'}</span>
                      <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                        <input type="checkbox" checked={v.submitted}
                          onChange={e => setScoreMap(m => ({ ...m, [sc.studentId]: { ...v, submitted: e.target.checked } }))} />
                        Done
                      </label>
                      <input className="input w-28 text-xs" placeholder="Notes" value={v.notes}
                        onChange={e => setScoreMap(m => ({ ...m, [sc.studentId]: { ...v, notes: e.target.value } }))} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button className="btn-secondary" onClick={() => setScoreActivity(null)} disabled={scoreSaving}>Cancel</button>
              <button className="btn-primary" onClick={handleSaveScores} disabled={scoreSaving}>
                <Save size={14} /> {scoreSaving ? 'Saving…' : 'Save Scores'}
              </button>
            </div>
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Activity"
        message={`Delete "${deleteTarget?.title}"? All scores and linked grade entries will be removed.`}
        loading={deleting}
      />
    </div>
  );
}
