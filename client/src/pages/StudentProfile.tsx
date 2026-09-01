import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Mail, Phone, GraduationCap, CalendarCheck,
  BookOpen, ClipboardList, CheckCircle, XCircle,
  Clock, AlertTriangle, Pencil, Trash2
} from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { studentsApi, gradesApi, classesApi } from '../api';
import type { Student, GradeSummary, GradeCategory, Class } from '../types';
import { PageLoader } from '../components/ui/Spinner';
import { AttendanceBadge, GradeBadge, PercentageBadge } from '../components/ui/StatusBadge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';

const CATEGORY_COLORS: Record<GradeCategory, string> = {
  QUIZ: '#3b82f6', ASSIGNMENT: '#8b5cf6', RECITATION: '#eab308',
  EXAM: '#ef4444', PROJECT: '#22c55e', CUSTOM: '#6b7280',
};

function AttendanceBar({ pct }: { pct: number }) {
  const color = pct >= 90 ? 'bg-green-500' : pct >= 75 ? 'bg-blue-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
      <div className={`${color} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

export default function StudentProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [summary, setSummary] = useState<GradeSummary | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ studentId: '', fullName: '', email: '', guardianContact: '', classId: '' });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'attendance' | 'grades' | 'activities'>('attendance');

  const loadStudent = () => {
    if (!id) return;
    Promise.all([studentsApi.get(id), gradesApi.summary(id), classesApi.list()])
      .then(([s, sum, c]) => { setStudent(s); setSummary(sum); setClasses(c); })
      .catch(() => toast.error('Failed to load student'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadStudent(); }, [id]);

  const openEdit = () => {
    if (!student) return;
    setEditForm({
      studentId: student.studentId,
      fullName: student.fullName,
      email: student.email ?? '',
      guardianContact: student.guardianContact ?? '',
      classId: student.classId,
    });
    setEditErrors({});
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    const errs: Record<string, string> = {};
    if (!editForm.studentId.trim()) errs.studentId = 'Student ID is required';
    if (!editForm.fullName.trim()) errs.fullName = 'Full name is required';
    if (!editForm.classId) errs.classId = 'Class is required';
    if (Object.keys(errs).length) { setEditErrors(errs); return; }
    setSaving(true);
    try {
      await studentsApi.update(student!.id, { ...editForm, email: editForm.email || undefined });
      toast.success('Student updated');
      setEditOpen(false);
      setLoading(true);
      loadStudent();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!student) return;
    setDeleting(true);
    try {
      await studentsApi.delete(student.id);
      toast.success('Student deleted');
      navigate('/students');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete');
    } finally { setDeleting(false); }
  };

  if (loading) return <PageLoader />;
  if (!student) return <div className="text-red-500">Student not found.</div>;

  const att = student.attendanceRecords ?? [];
  const totalAtt = att.length;
  const presentCount = att.filter(r => r.status === 'PRESENT').length;
  const absentCount = att.filter(r => r.status === 'ABSENT').length;
  const lateCount = att.filter(r => r.status === 'LATE').length;
  const excusedCount = att.filter(r => r.status === 'EXCUSED').length;
  const attPct = totalAtt > 0 ? Math.round(((presentCount + lateCount) / totalAtt) * 100) : 0;
  const lowAtt = attPct < 75 && totalAtt > 0;

  const cats: GradeCategory[] = ['QUIZ', 'ASSIGNMENT', 'RECITATION', 'EXAM', 'PROJECT'];
  const radarData = cats.map(cat => ({
    category: cat,
    avg: summary?.summary[cat]?.avg ?? 0,
    fullMark: 100,
  }));

  const tabs = [
    { key: 'attendance', label: 'Attendance', icon: <CalendarCheck size={15} /> },
    { key: 'grades', label: 'Grades', icon: <BookOpen size={15} /> },
    { key: 'activities', label: 'Activities', icon: <ClipboardList size={15} /> },
  ] as const;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <Link to="/students" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors text-sm">
          <ArrowLeft size={16} /> Back to Students
        </Link>
        <div className="flex gap-2">
          <button className="btn-secondary btn-sm" onClick={openEdit}>
            <Pencil size={14} /> Edit
          </button>
          <button className="btn-danger btn-sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      {/* Profile card */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center text-2xl font-bold flex-shrink-0">
            {student.fullName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{student.fullName}</h2>
                <p className="text-sm text-gray-500 font-mono mt-0.5">{student.studentId}</p>
              </div>
              {lowAtt && (
                <span className="flex items-center gap-1 badge bg-red-100 text-red-700">
                  <AlertTriangle size={12} /> Low Attendance
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
              <span className="flex items-center gap-1.5"><GraduationCap size={14} className="text-gray-400" />{student.class?.name}</span>
              {student.email && <span className="flex items-center gap-1.5"><Mail size={14} className="text-gray-400" />{student.email}</span>}
              {student.guardianContact && <span className="flex items-center gap-1.5"><Phone size={14} className="text-gray-400" />{student.guardianContact}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Attendance Rate</p>
          <p className={`text-2xl font-bold ${lowAtt ? 'text-red-600' : 'text-green-600'}`}>{attPct}%</p>
          <AttendanceBar pct={attPct} />
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Days Present</p>
          <p className="text-2xl font-bold text-gray-900">{presentCount + lateCount}</p>
          <p className="text-xs text-gray-400">of {totalAtt} total</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Overall Grade Avg</p>
          <p className={`text-2xl font-bold ${(summary?.overall ?? 0) >= 75 ? 'text-blue-600' : 'text-red-500'}`}>
            {summary?.overall != null ? `${summary.overall}%` : '—'}
          </p>
          <p className="text-xs text-gray-400">{summary?.total ?? 0} grade entries</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Activities</p>
          <p className="text-2xl font-bold text-gray-900">{student.activityScores?.length ?? 0}</p>
          <p className="text-xs text-gray-400">assigned activities</p>
        </div>
      </div>

      {/* Grade radar */}
      {(summary?.total ?? 0) > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Performance by Category</h3>
          <div className="flex flex-col lg:flex-row gap-6">
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="category" tick={{ fontSize: 12 }} />
                <Radar name="Average %" dataKey="avg" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, 'Average']} />
              </RadarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-3 lg:w-64 flex-shrink-0 content-start">
              {cats.map(cat => {
                const d = summary?.summary[cat];
                return (
                  <div key={cat} className="p-3 rounded-lg border border-gray-100 bg-gray-50">
                    <span className="text-xs font-medium" style={{ color: CATEGORY_COLORS[cat] }}>{cat}</span>
                    <p className="text-lg font-bold text-gray-900 mt-0.5">
                      {d && d.count > 0 ? `${d.avg.toFixed(1)}%` : '—'}
                    </p>
                    <p className="text-xs text-gray-400">{d?.count ?? 0} entr{(d?.count ?? 0) === 1 ? 'y' : 'ies'}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="card overflow-hidden">
        <div className="flex border-b border-gray-100 bg-gray-50">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
                activeTab === t.key ? 'bg-white border-b-2 border-blue-600 text-blue-700' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* Attendance Tab */}
          {activeTab === 'attendance' && (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {[
                  { label: 'Present', val: presentCount, icon: <CheckCircle size={14} />, cls: 'text-green-700 bg-green-50 border-green-200' },
                  { label: 'Absent', val: absentCount, icon: <XCircle size={14} />, cls: 'text-red-700 bg-red-50 border-red-200' },
                  { label: 'Late', val: lateCount, icon: <Clock size={14} />, cls: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
                  { label: 'Excused', val: excusedCount, icon: <CalendarCheck size={14} />, cls: 'text-blue-700 bg-blue-50 border-blue-200' },
                ].map(({ label, val, icon, cls }) => (
                  <div key={label} className={`rounded-lg border p-3 flex items-center gap-2 ${cls}`}>
                    {icon}
                    <div>
                      <p className="text-lg font-bold">{val}</p>
                      <p className="text-xs opacity-75">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
              {att.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No attendance records yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="table-th">Date</th>
                        <th className="table-th">Class</th>
                        <th className="table-th">Status</th>
                        <th className="table-th">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {att.map(r => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="table-td">{r.session ? format(new Date(r.session.date), 'MMM d, yyyy') : '—'}</td>
                          <td className="table-td text-gray-500">{r.session?.class?.name ?? '—'}</td>
                          <td className="table-td"><AttendanceBadge status={r.status} /></td>
                          <td className="table-td text-gray-400">{r.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Grades Tab */}
          {activeTab === 'grades' && (
            <div>
              {!student.gradeEntries?.length ? (
                <p className="text-sm text-gray-400 text-center py-6">No grade entries yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="table-th">Date</th>
                        <th className="table-th">Title</th>
                        <th className="table-th">Category</th>
                        <th className="table-th">Score</th>
                        <th className="table-th">Percentage</th>
                        <th className="table-th">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {student.gradeEntries.map(g => (
                        <tr key={g.id} className="hover:bg-gray-50">
                          <td className="table-td">{format(new Date(g.date), 'MMM d, yyyy')}</td>
                          <td className="table-td font-medium">{g.title}</td>
                          <td className="table-td"><GradeBadge category={g.category} /></td>
                          <td className="table-td">{g.score}/{g.maxScore}</td>
                          <td className="table-td"><PercentageBadge pct={g.percentage} /></td>
                          <td className="table-td text-gray-400">{g.remarks || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Activities Tab */}
          {activeTab === 'activities' && (
            <div>
              {!student.activityScores?.length ? (
                <p className="text-sm text-gray-400 text-center py-6">No activity scores yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="table-th">Activity</th>
                        <th className="table-th">Type</th>
                        <th className="table-th">Due / Date</th>
                        <th className="table-th">Score</th>
                        <th className="table-th">Status</th>
                        <th className="table-th">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {student.activityScores.map(sc => (
                        <tr key={sc.id} className="hover:bg-gray-50">
                          <td className="table-td font-medium">{sc.activity?.title}</td>
                          <td className="table-td"><GradeBadge category={sc.activity?.type as GradeCategory} /></td>
                          <td className="table-td text-gray-500">
                            {sc.activity?.dueDate ? format(new Date(sc.activity.dueDate), 'MMM d, yyyy')
                              : sc.activity?.activityDate ? format(new Date(sc.activity.activityDate), 'MMM d, yyyy') : '—'}
                          </td>
                          <td className="table-td">
                            {sc.score != null ? `${sc.score}/${sc.activity?.maxScore}` : <span className="text-gray-400">Not scored</span>}
                          </td>
                          <td className="table-td">
                            {sc.submitted
                              ? <span className="badge-green">Submitted</span>
                              : <span className="badge-gray">Pending</span>}
                          </td>
                          <td className="table-td text-gray-400">{sc.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Student"
        message={`Are you sure you want to delete ${student.fullName}? This will permanently remove all their records.`}
        loading={deleting}
      />

      {/* Edit Student Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Student" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Student ID *</label>
              <input className={`input ${editErrors.studentId ? 'input-error' : ''}`}
                value={editForm.studentId} onChange={e => setEditForm(f => ({ ...f, studentId: e.target.value }))} />
              {editErrors.studentId && <p className="text-xs text-red-500 mt-1">{editErrors.studentId}</p>}
            </div>
            <div>
              <label className="label">Class *</label>
              <select className={`input ${editErrors.classId ? 'input-error' : ''}`}
                value={editForm.classId} onChange={e => setEditForm(f => ({ ...f, classId: e.target.value }))}>
                <option value="">Select class…</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {editErrors.classId && <p className="text-xs text-red-500 mt-1">{editErrors.classId}</p>}
            </div>
          </div>
          <div>
            <label className="label">Full Name *</label>
            <input className={`input ${editErrors.fullName ? 'input-error' : ''}`}
              value={editForm.fullName} onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))} />
            {editErrors.fullName && <p className="text-xs text-red-500 mt-1">{editErrors.fullName}</p>}
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={editForm.email}
              onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} placeholder="student@school.edu" />
          </div>
          <div>
            <label className="label">Guardian Contact</label>
            <input className="input" value={editForm.guardianContact}
              onChange={e => setEditForm(f => ({ ...f, guardianContact: e.target.value }))} placeholder="09xxxxxxxxx" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button className="btn-secondary" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={handleSaveEdit} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
