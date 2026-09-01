import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, Filter, Trash2, Pencil, ChevronUp, ChevronDown, Users, Eye, ArrowDownAZ, ArrowUpAZ, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { studentsApi, classesApi } from '../api';
import type { Student, Class } from '../types';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { PageLoader } from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';

type SortField = 'fullName' | 'studentId' | 'class';
type SortDir = 'asc' | 'desc';

const INIT_FORM = { studentId: '', fullName: '', email: '', guardianContact: '', classId: '' };

// Auto-capitalize each word in a name string
const toTitleCase = (s: string) =>
  s.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

function StudentForm({ form, setForm, classes, errors }: {
  form: typeof INIT_FORM;
  setForm: (f: typeof INIT_FORM) => void;
  classes: Class[];
  errors: Record<string, string>;
}) {
  const set = (key: keyof typeof INIT_FORM, val: string) => setForm({ ...form, [key]: val });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Student ID *</label>
          <input className={`input ${errors.studentId ? 'input-error' : ''}`} value={form.studentId}
            onChange={e => set('studentId', e.target.value)} placeholder="e.g. 2026-001" />
          {errors.studentId && <p className="text-xs text-red-500 mt-1">{errors.studentId}</p>}
        </div>
        <div>
          <label className="label">Class *</label>
          <select className={`input ${errors.classId ? 'input-error' : ''}`} value={form.classId}
            onChange={e => set('classId', e.target.value)}>
            <option value="">Select class…</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {errors.classId && <p className="text-xs text-red-500 mt-1">{errors.classId}</p>}
        </div>
      </div>
      <div>
        <label className="label">Full Name *</label>
        <input className={`input ${errors.fullName ? 'input-error' : ''}`} value={form.fullName}
          onChange={e => set('fullName', toTitleCase(e.target.value))} placeholder="e.g. Maria Clara Santos" />
        {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
      </div>
      <div>
        <label className="label">Email</label>
        <input className="input" type="email" value={form.email}
          onChange={e => set('email', e.target.value)} placeholder="student@school.edu" />
      </div>
      <div>
        <label className="label">Guardian Contact</label>
        <input className="input" value={form.guardianContact}
          onChange={e => set('guardianContact', e.target.value)} placeholder="09xxxxxxxxx" />
      </div>
    </div>
  );
}

function validate(form: typeof INIT_FORM) {
  const errs: Record<string, string> = {};
  if (!form.studentId.trim()) errs.studentId = 'Student ID is required';
  if (!form.fullName.trim()) errs.fullName = 'Full name is required';
  if (!form.classId) errs.classId = 'Class is required';
  return errs;
}

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchParams] = useSearchParams();
  const [filterClass, setFilterClass] = useState(searchParams.get('classId') ?? '');
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({ field: 'fullName', dir: 'asc' });
  const [showNoGrades, setShowNoGrades] = useState(false);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [form, setForm] = useState({ ...INIT_FORM });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, c] = await Promise.all([
      studentsApi.list({ search: search || undefined, classId: filterClass || undefined }),
      classesApi.list(),
    ]);
    setStudents(s);
    setClasses(c);
    setLoading(false);
  }, [search, filterClass]);

  useEffect(() => { load(); }, [load]);

  const sorted = [...students]
    .filter(s => !showNoGrades || (s._count?.gradeEntries ?? 0) === 0)
    .sort((a, b) => {
    let av = '', bv = '';
    if (sort.field === 'fullName') { av = a.fullName; bv = b.fullName; }
    if (sort.field === 'studentId') { av = a.studentId; bv = b.studentId; }
    if (sort.field === 'class') { av = a.class?.name ?? ''; bv = b.class?.name ?? ''; }
    return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const toggleSort = (field: SortField) => {
    setSort(s => s.field === field ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' });
  };

  const SortIcon = ({ field }: { field: SortField }) =>
    sort.field === field
      ? sort.dir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />
      : <ChevronUp size={13} className="opacity-20" />;

  const openAdd = () => { setForm({ ...INIT_FORM }); setFormErrors({}); setEditTarget(null); setModal('add'); };
  const openEdit = (s: Student) => {
    setForm({ studentId: s.studentId, fullName: s.fullName, email: s.email ?? '', guardianContact: s.guardianContact ?? '', classId: s.classId });
    setFormErrors({});
    setEditTarget(s);
    setModal('edit');
  };

  const handleSave = async () => {
    const errs = validate(form);
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setSaving(true);
    try {
      if (modal === 'add') {
        await studentsApi.create(form);
        toast.success('Student added successfully');
      } else if (editTarget) {
        await studentsApi.update(editTarget.id, form);
        toast.success('Student updated successfully');
      }
      setModal(null);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await studentsApi.delete(deleteTarget.id);
      toast.success('Student deleted');
      setDeleteTarget(null);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Students</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {sorted.length} of {students.length} student{students.length !== 1 ? 's' : ''}
            {showNoGrades && <span className="ml-2 text-amber-600 font-medium">· No grades filter active</span>}
          </p>
        </div>
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={16} /> Add Student
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search by name, ID, or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Filter size={16} className="text-gray-400 flex-shrink-0" />
          <select className="input w-44" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
            <option value="">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* A→Z quick sort button */}
        <button
          className={`btn-secondary btn-sm flex items-center gap-1.5 flex-shrink-0 ${sort.field === 'fullName' && sort.dir === 'asc' ? 'border-blue-300 text-blue-700 bg-blue-50' : sort.field === 'fullName' ? 'border-purple-300 text-purple-700 bg-purple-50' : ''}`}
          onClick={() => toggleSort('fullName')}
          title="Sort alphabetically by name"
        >
          {sort.field === 'fullName' && sort.dir === 'desc' ? <ArrowUpAZ size={15} /> : <ArrowDownAZ size={15} />}
          {sort.field === 'fullName' ? (sort.dir === 'asc' ? 'A → Z' : 'Z → A') : 'A → Z'}
        </button>

        {/* No grades filter */}
        <button
          className={`btn-sm flex items-center gap-1.5 rounded-lg border font-medium transition-colors flex-shrink-0 ${
            showNoGrades
              ? 'bg-amber-500 text-white border-amber-500'
              : 'bg-white text-amber-600 border-amber-300 hover:bg-amber-50'
          }`}
          onClick={() => setShowNoGrades(v => !v)}
          title="Show students with no grades"
        >
          <AlertTriangle size={14} />
          No Grades
          {showNoGrades && (
            <span className="ml-1 bg-white/30 text-white rounded px-1 text-xs">
              {students.filter(s => (s._count?.gradeEntries ?? 0) === 0).length}
            </span>
          )}
        </button>

        {(search || filterClass || showNoGrades) && (
          <button className="btn-ghost btn-sm flex-shrink-0" onClick={() => { setSearch(''); setFilterClass(''); setShowNoGrades(false); }}>
            Clear all
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? <PageLoader /> : sorted.length === 0 ? (
          <EmptyState
            icon={<Users size={28} />}
            title="No students found"
            description={search || filterClass ? 'Try adjusting your search or filters.' : 'Add your first student to get started.'}
            action={!search && !filterClass ? <button className="btn-primary btn-sm" onClick={openAdd}><Plus size={14} /> Add Student</button> : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {([['studentId', 'Student ID'], ['fullName', 'Full Name'], ['class', 'Class']] as [SortField, string][]).map(([field, label]) => (
                    <th key={field} className="table-th cursor-pointer select-none hover:bg-gray-100" onClick={() => toggleSort(field)}>
                      <span className="flex items-center gap-1">{label}<SortIcon field={field} /></span>
                    </th>
                  ))}
                  <th className="table-th">Email</th>
                  <th className="table-th">Guardian</th>
                  <th className="table-th">Records</th>
                  <th className="table-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sorted.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td font-mono text-xs text-gray-500">{s.studentId}</td>
                    <td className="table-td">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {s.fullName.charAt(0)}
                        </div>
                        <Link to={`/students/${s.id}`} className="font-medium text-gray-900 hover:text-blue-600 transition-colors">
                          {s.fullName}
                        </Link>
                      </div>
                    </td>
                    <td className="table-td">
                      <span className="badge-blue">{s.class?.name}</span>
                    </td>
                    <td className="table-td text-gray-500">{s.email || '—'}</td>
                    <td className="table-td text-gray-500">{s.guardianContact || '—'}</td>
                    <td className="table-td">
                      <span className="text-xs text-gray-400">
                        {s._count?.attendanceRecords ?? 0} att · {s._count?.gradeEntries ?? 0} grades
                      </span>
                    </td>
                    <td className="table-td">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/students/${s.id}`} className="btn-ghost btn-sm p-1.5" title="View profile">
                          <Eye size={15} />
                        </Link>
                        <button className="btn-ghost btn-sm p-1.5" title="Edit" onClick={() => openEdit(s)}>
                          <Pencil size={15} />
                        </button>
                        <button className="btn-ghost btn-sm p-1.5 text-red-500 hover:bg-red-50" title="Delete" onClick={() => setDeleteTarget(s)}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal === 'add' ? 'Add Student' : 'Edit Student'} size="md">
        <StudentForm form={form} setForm={setForm} classes={classes} errors={formErrors} />
        <div className="flex justify-end gap-3 mt-6">
          <button className="btn-secondary" onClick={() => setModal(null)} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : modal === 'add' ? 'Add Student' : 'Save Changes'}
          </button>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Student"
        message={`Are you sure you want to delete ${deleteTarget?.fullName}? This will permanently remove all their attendance records, grades, and activity scores.`}
        loading={deleting}
      />
    </div>
  );
}
