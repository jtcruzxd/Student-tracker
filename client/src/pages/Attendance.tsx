import { useEffect, useState, useCallback } from 'react';
import { CalendarCheck, Plus, Trash2, Pencil, Filter, CheckCircle, XCircle, Clock, ChevronDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { attendanceApi, classesApi, studentsApi } from '../api';
import type { AttendanceSession, Class, Student, AttendanceStatus } from '../types';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { PageLoader } from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { AttendanceBadge } from '../components/ui/StatusBadge';

const STATUSES: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];

const statusColors: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-green-500',
  ABSENT: 'bg-red-500',
  LATE: 'bg-yellow-400',
  EXCUSED: 'bg-blue-400',
};

function StatusToggle({ status, onChange }: { status: AttendanceStatus; onChange: (s: AttendanceStatus) => void }) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-gray-200">
      {STATUSES.map(s => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
            status === s
              ? s === 'PRESENT' ? 'bg-green-500 text-white'
                : s === 'ABSENT' ? 'bg-red-500 text-white'
                : s === 'LATE' ? 'bg-yellow-400 text-white'
                : 'bg-blue-400 text-white'
              : 'bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          {s.charAt(0) + s.slice(1).toLowerCase()}
        </button>
      ))}
    </div>
  );
}

export default function Attendance() {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  // Create session state
  const [createOpen, setCreateOpen] = useState(false);
  const [newDate, setNewDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [newClassId, setNewClassId] = useState('');
  const [newRecords, setNewRecords] = useState<{ studentId: string; name: string; status: AttendanceStatus; notes: string }[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [creating, setCreating] = useState(false);

  // Edit session state
  const [editSession, setEditSession] = useState<AttendanceSession | null>(null);
  const [editRecords, setEditRecords] = useState<{ studentId: string; name: string; status: AttendanceStatus; notes: string }[]>([]);
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<AttendanceSession | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Expanded rows
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      attendanceApi.sessions({
        classId: filterClass || undefined,
        from: filterFrom || undefined,
        to: filterTo || undefined,
      }),
      classesApi.list(),
    ]).then(([s, c]) => {
      setSessions(s);
      setClasses(c);
    }).finally(() => setLoading(false));
  }, [filterClass, filterFrom, filterTo]);

  useEffect(() => { load(); }, [load]);

  const loadStudentsForClass = async (classId: string) => {
    if (!classId) { setNewRecords([]); return; }
    setLoadingStudents(true);
    try {
      const students: Student[] = await studentsApi.list({ classId });
      setNewRecords(students.map(s => ({ studentId: s.id, name: s.fullName, status: 'PRESENT', notes: '' })));
    } finally { setLoadingStudents(false); }
  };

  const handleClassChange = async (classId: string) => {
    setNewClassId(classId);
    await loadStudentsForClass(classId);
  };

  const handleCreate = async () => {
    if (!newDate || !newClassId) { toast.error('Date and class are required'); return; }
    setCreating(true);
    try {
      await attendanceApi.createSession({
        date: newDate,
        classId: newClassId,
        records: newRecords.map(r => ({ studentId: r.studentId, status: r.status, notes: r.notes || undefined })),
      });
      toast.success('Attendance session created');
      setCreateOpen(false);
      setNewClassId('');
      setNewRecords([]);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to create session');
    } finally { setCreating(false); }
  };

  const openEdit = (session: AttendanceSession) => {
    setEditSession(session);
    setEditRecords(session.records.map(r => ({
      studentId: r.studentId,
      name: r.student?.fullName ?? r.studentId,
      status: r.status,
      notes: r.notes ?? '',
    })));
  };

  const handleSaveEdit = async () => {
    if (!editSession) return;
    setSaving(true);
    try {
      await attendanceApi.updateSession(editSession.id, editRecords.map(r => ({
        studentId: r.studentId, status: r.status, notes: r.notes || undefined
      })));
      toast.success('Attendance updated');
      setEditSession(null);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await attendanceApi.deleteSession(deleteTarget.id);
      toast.success('Session deleted');
      setDeleteTarget(null);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete');
    } finally { setDeleting(false); }
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const getSummary = (session: AttendanceSession) => {
    const r = session.records;
    return {
      present: r.filter(x => x.status === 'PRESENT').length,
      absent: r.filter(x => x.status === 'ABSENT').length,
      late: r.filter(x => x.status === 'LATE').length,
      excused: r.filter(x => x.status === 'EXCUSED').length,
      total: r.length,
    };
  };

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Attendance</h1>
          <p className="text-sm text-gray-500 mt-0.5">{sessions.length} session{sessions.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary" onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> Record Attendance
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-40">
          <Filter size={15} className="text-gray-400 flex-shrink-0" />
          <select className="input" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
            <option value="">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500 whitespace-nowrap">From</label>
          <input type="date" className="input w-40" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">To</label>
          <input type="date" className="input w-40" value={filterTo} onChange={e => setFilterTo(e.target.value)} />
        </div>
        {(filterClass || filterFrom || filterTo) && (
          <button className="btn-ghost btn-sm" onClick={() => { setFilterClass(''); setFilterFrom(''); setFilterTo(''); }}>
            Clear
          </button>
        )}
      </div>

      {/* Sessions list */}
      <div className="space-y-3">
        {loading ? <PageLoader /> : sessions.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<CalendarCheck size={28} />}
              title="No attendance sessions"
              description="Record your first attendance session to get started."
              action={<button className="btn-primary btn-sm" onClick={() => setCreateOpen(true)}><Plus size={14} /> Record Attendance</button>}
            />
          </div>
        ) : sessions.map(session => {
          const sum = getSummary(session);
          const isExpanded = expanded.has(session.id);
          return (
            <div key={session.id} className="card overflow-hidden">
              <div
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleExpand(session.id)}
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <CalendarCheck size={18} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{format(parseISO(session.date), 'EEEE, MMMM d, yyyy')}</span>
                    <span className="badge-blue">{session.class?.name}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {/* Mini bar */}
                    <div className="flex h-1.5 rounded-full overflow-hidden w-24 bg-gray-100">
                      {sum.total > 0 && ([
                        { key: 'PRESENT', count: sum.present },
                        { key: 'LATE', count: sum.late },
                        { key: 'EXCUSED', count: sum.excused },
                        { key: 'ABSENT', count: sum.absent },
                      ] as { key: AttendanceStatus; count: number }[]).map(({ key, count }) => count > 0 && (
                        <div key={key} className={`${statusColors[key]} h-full`} style={{ width: `${(count / sum.total) * 100}%` }} />
                      ))}
                    </div>
                    <span className="text-xs text-gray-400">
                      {sum.present}P · {sum.absent}A · {sum.late}L · {sum.excused}E · {sum.total} total
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button className="btn-ghost btn-sm p-1.5" title="Edit" onClick={e => { e.stopPropagation(); openEdit(session); }}>
                    <Pencil size={15} />
                  </button>
                  <button className="btn-ghost btn-sm p-1.5 text-red-500 hover:bg-red-50" title="Delete" onClick={e => { e.stopPropagation(); setDeleteTarget(session); }}>
                    <Trash2 size={15} />
                  </button>
                  <ChevronDown size={16} className={`text-gray-400 transition-transform ml-1 ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-50 p-4">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="table-th">Student</th>
                        <th className="table-th">Status</th>
                        <th className="table-th">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {session.records.map(r => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="table-td font-medium">{r.student?.fullName}</td>
                          <td className="table-td"><AttendanceBadge status={r.status} /></td>
                          <td className="table-td text-gray-400">{r.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create Session Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} onSubmit={handleCreate} title="Record Attendance" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date *</label>
              <input type="date" className="input" value={newDate} onChange={e => setNewDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Class *</label>
              <select className="input" value={newClassId} onChange={e => handleClassChange(e.target.value)}>
                <option value="">Select class…</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {loadingStudents ? (
            <p className="text-sm text-gray-400 text-center py-4">Loading students…</p>
          ) : newRecords.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Student Attendance</label>
                <div className="flex gap-1">
                  {STATUSES.map(s => (
                    <button key={s} type="button" onClick={() => setNewRecords(r => r.map(x => ({ ...x, status: s })))}
                      className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 text-gray-600">
                      All {s.charAt(0)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
                {newRecords.map((r, i) => (
                  <div key={r.studentId} className="flex items-center gap-3 p-3 hover:bg-gray-50">
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {r.name.charAt(0)}
                    </div>
                    <span className="text-sm font-medium flex-1">{r.name}</span>
                    <div className="w-56">
                      <StatusToggle status={r.status} onChange={s => {
                        const next = [...newRecords];
                        next[i] = { ...next[i], status: s };
                        setNewRecords(next);
                      }} />
                    </div>
                    <input className="input w-28 text-xs" placeholder="Notes" value={r.notes}
                      onChange={e => { const next = [...newRecords]; next[i].notes = e.target.value; setNewRecords(next); }} />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><CheckCircle size={12} className="text-green-500" />{newRecords.filter(r => r.status === 'PRESENT').length} present</span>
                <span className="flex items-center gap-1"><XCircle size={12} className="text-red-500" />{newRecords.filter(r => r.status === 'ABSENT').length} absent</span>
                <span className="flex items-center gap-1"><Clock size={12} className="text-yellow-500" />{newRecords.filter(r => r.status === 'LATE').length} late</span>
                <span className="flex items-center gap-1"><CalendarCheck size={12} className="text-blue-500" />{newRecords.filter(r => r.status === 'EXCUSED').length} excused</span>
              </div>
            </div>
          ) : newClassId ? (
            <p className="text-sm text-gray-400 text-center py-4">No students in this class.</p>
          ) : null}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button className="btn-secondary" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</button>
          <button className="btn-primary" onClick={handleCreate} disabled={creating || !newClassId || !newDate}>
            {creating ? 'Saving…' : 'Save Attendance'}
          </button>
        </div>
      </Modal>

      {/* Edit Session Modal */}
      <Modal open={!!editSession} onClose={() => setEditSession(null)} onSubmit={handleSaveEdit} title="Edit Attendance" size="lg">
        {editSession && (
          <>
            <p className="text-sm text-gray-500 mb-4">
              {format(parseISO(editSession.date), 'EEEE, MMMM d, yyyy')} · {editSession.class?.name}
            </p>
            <div className="max-h-80 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
              {editRecords.map((r, i) => (
                <div key={r.studentId} className="flex items-center gap-3 p-3 hover:bg-gray-50">
                  <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {r.name.charAt(0)}
                  </div>
                  <span className="text-sm font-medium flex-1">{r.name}</span>
                  <div className="w-56">
                    <StatusToggle status={r.status} onChange={s => {
                      const next = [...editRecords];
                      next[i] = { ...next[i], status: s };
                      setEditRecords(next);
                    }} />
                  </div>
                  <input className="input w-28 text-xs" placeholder="Notes" value={r.notes}
                    onChange={e => { const next = [...editRecords]; next[i].notes = e.target.value; setEditRecords(next); }} />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button className="btn-secondary" onClick={() => setEditSession(null)} disabled={saving}>Cancel</button>
              <button className="btn-primary" onClick={handleSaveEdit} disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Session"
        message={`Delete attendance session for ${deleteTarget ? format(parseISO(deleteTarget.date), 'MMM d, yyyy') : ''}? All attendance records for this session will be removed.`}
        loading={deleting}
      />
    </div>
  );
}
