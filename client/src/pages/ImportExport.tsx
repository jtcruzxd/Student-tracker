import { useEffect, useState } from 'react';
import { Upload, Download, FileText, AlertCircle, CheckCircle, X, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { importApi, exportApi, classesApi, studentsApi } from '../api';
import type { Class, Student, ImportResult, GradeCategory } from '../types';
import Spinner from '../components/ui/Spinner';

const GRADE_CATEGORIES: GradeCategory[] = ['QUIZ', 'ASSIGNMENT', 'RECITATION', 'EXAM', 'PROJECT', 'CUSTOM'];

function FileUploader({ label, accept, onUpload, loading }: {
  label: string; accept: string; onUpload: (f: File) => void; loading: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);
  return (
    <label
      className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all ${
        dragOver ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
      }`}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) onUpload(f); }}
    >
      {loading ? <Spinner /> : <Upload size={24} className="text-gray-400" />}
      <div className="text-center">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">Drag & drop or click to browse</p>
        <p className="text-xs text-gray-300 mt-0.5">Supports CSV and XLSX</p>
      </div>
      <input type="file" accept={accept} className="hidden" disabled={loading}
        onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
    </label>
  );
}

function ImportResultView({ result, onDismiss }: { result: ImportResult; onDismiss: () => void }) {
  return (
    <div className="rounded-xl border overflow-hidden">
      <div className={`flex items-center justify-between p-4 ${
        result.errors.length === 0 ? 'bg-sage-50 border-b border-sage-100' : 'bg-amber-50 border-b border-amber-100'
      }`}>
        <div className="flex items-center gap-2">
          {result.errors.length === 0
            ? <CheckCircle size={18} className="text-sage-600" />
            : <AlertCircle size={18} className="text-amber-600" />}
          <p className="font-medium text-sm text-gray-900">
            {result.imported} row{result.imported !== 1 ? 's' : ''} imported successfully
            {result.errors.length > 0 && ` · ${result.errors.length} error${result.errors.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button onClick={onDismiss} className="p-1 rounded hover:bg-white/50"><X size={16} /></button>
      </div>
      {result.errors.length > 0 && (
        <div className="max-h-48 overflow-y-auto divide-y divide-gray-50 bg-white">
          {result.errors.map((err, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-2.5">
              <span className="text-xs bg-red-100 text-red-600 font-mono px-1.5 py-0.5 rounded flex-shrink-0">Row {err.row}</span>
              <p className="text-xs text-gray-600">{err.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Reusable export button with loading spinner
function ExportBtn({ label, loading, onClick }: { label: string; loading: boolean; onClick: () => void }) {
  return (
    <button
      className="btn-primary flex items-center gap-2 disabled:opacity-60"
      onClick={onClick}
      disabled={loading}
    >
      {loading ? <Spinner size="sm" className="border-white/30 border-t-white" /> : <Download size={14} />}
      {loading ? 'Exporting…' : label}
    </button>
  );
}

export default function ImportExport() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  // Import state
  const [importingStudents, setImportingStudents] = useState(false);
  const [importingGrades, setImportingGrades]     = useState(false);
  const [studentImportResult, setStudentImportResult] = useState<ImportResult | null>(null);
  const [gradeImportResult,   setGradeImportResult]   = useState<ImportResult | null>(null);

  // Export filters
  const [exportStudentsClass,  setExportStudentsClass]  = useState('');
  const [exportStudentsFormat, setExportStudentsFormat] = useState('xlsx');
  const [exportAttClass,       setExportAttClass]       = useState('');
  const [exportAttFrom,        setExportAttFrom]        = useState('');
  const [exportAttTo,          setExportAttTo]          = useState('');
  const [exportAttFormat,      setExportAttFormat]      = useState('xlsx');
  const [exportGradesClass,    setExportGradesClass]    = useState('');
  const [exportGradesStudent,  setExportGradesStudent]  = useState('');
  const [exportGradesCat,      setExportGradesCat]      = useState('');
  const [exportGradesFormat,   setExportGradesFormat]   = useState('xlsx');

  // Export loading states
  const [downloadingStudents,   setDownloadingStudents]   = useState(false);
  const [downloadingAttendance, setDownloadingAttendance] = useState(false);
  const [downloadingGrades,     setDownloadingGrades]     = useState(false);

  useEffect(() => {
    Promise.all([classesApi.list(), studentsApi.list()])
      .then(([c, s]) => { setClasses(c); setStudents(s); });
  }, []);

  const handleStudentImport = async (file: File) => {
    setImportingStudents(true); setStudentImportResult(null);
    try {
      const result = await importApi.students(file);
      setStudentImportResult(result);
      if (result.imported > 0) toast.success(`${result.imported} students imported`);
      else toast.error('No rows were imported');
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Import failed'); }
    finally { setImportingStudents(false); }
  };

  const handleGradeImport = async (file: File) => {
    setImportingGrades(true); setGradeImportResult(null);
    try {
      const result = await importApi.grades(file);
      setGradeImportResult(result);
      if (result.imported > 0) toast.success(`${result.imported} grade entries imported`);
      else toast.error('No rows were imported');
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Import failed'); }
    finally { setImportingGrades(false); }
  };

  const handleExportStudents = async () => {
    setDownloadingStudents(true);
    try {
      await exportApi.students({ classId: exportStudentsClass || undefined, format: exportStudentsFormat });
      toast.success('Students exported');
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Export failed'); }
    finally { setDownloadingStudents(false); }
  };

  const handleExportAttendance = async () => {
    setDownloadingAttendance(true);
    try {
      await exportApi.attendance({
        classId: exportAttClass || undefined,
        from: exportAttFrom || undefined,
        to: exportAttTo || undefined,
        format: exportAttFormat,
      });
      toast.success('Attendance exported');
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Export failed'); }
    finally { setDownloadingAttendance(false); }
  };

  const handleExportGrades = async () => {
    setDownloadingGrades(true);
    try {
      await exportApi.grades({
        classId: exportGradesClass || undefined,
        studentId: exportGradesStudent || undefined,
        category: exportGradesCat || undefined,
        format: exportGradesFormat,
      });
      toast.success('Grades exported');
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Export failed'); }
    finally { setDownloadingGrades(false); }
  };

  const FormatSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <div>
      <label className="label">Format</label>
      <select className="input w-24" value={value} onChange={e => onChange(e.target.value)}>
        <option value="xlsx">Excel</option>
        <option value="csv">CSV</option>
      </select>
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl">

      {/* ── Import ───────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#fdf3f3' }}>
            <Upload size={18} style={{ color: '#D96868' }} />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Import Data</h2>
            <p className="text-xs text-gray-500">Upload CSV or Excel files to bulk-add students or grades</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Import Students */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText size={14} style={{ color: '#D96868' }} />
              <h3 className="font-medium text-sm text-gray-800">Import Students</h3>
            </div>
            <FileUploader label="Upload Students CSV/XLSX" accept=".csv,.xlsx,.xls"
              onUpload={handleStudentImport} loading={importingStudents} />
            {studentImportResult && (
              <ImportResultView result={studentImportResult} onDismiss={() => setStudentImportResult(null)} />
            )}
            <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3 space-y-1">
              <p className="font-medium text-gray-600">Required columns:</p>
              <p><code className="bg-white px-1 rounded border border-gray-100">Student ID</code>, <code className="bg-white px-1 rounded border border-gray-100">Full Name</code>, <code className="bg-white px-1 rounded border border-gray-100">Class</code></p>
              <p>Optional: <code className="bg-white px-1 rounded border border-gray-100">Email</code>, <code className="bg-white px-1 rounded border border-gray-100">Guardian Contact</code></p>
              <p className="text-gray-300">Class must match an existing class name exactly.</p>
            </div>
          </div>

          {/* Import Grades */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText size={14} style={{ color: '#689D4B' }} />
              <h3 className="font-medium text-sm text-gray-800">Import Grades</h3>
            </div>
            <FileUploader label="Upload Grades CSV/XLSX" accept=".csv,.xlsx,.xls"
              onUpload={handleGradeImport} loading={importingGrades} />
            {gradeImportResult && (
              <ImportResultView result={gradeImportResult} onDismiss={() => setGradeImportResult(null)} />
            )}
            <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3 space-y-1">
              <p className="font-medium text-gray-600">Required columns:</p>
              <p><code className="bg-white px-1 rounded border border-gray-100">Student ID</code>, <code className="bg-white px-1 rounded border border-gray-100">Title</code>, <code className="bg-white px-1 rounded border border-gray-100">Category</code>, <code className="bg-white px-1 rounded border border-gray-100">Score</code>, <code className="bg-white px-1 rounded border border-gray-100">Max Score</code>, <code className="bg-white px-1 rounded border border-gray-100">Date</code></p>
              <p>Category: QUIZ, ASSIGNMENT, RECITATION, EXAM, PROJECT, CUSTOM</p>
              <p>Optional: <code className="bg-white px-1 rounded border border-gray-100">Remarks</code></p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Export ───────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#f4f8f0' }}>
            <Download size={18} style={{ color: '#689D4B' }} />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Export Data</h2>
            <p className="text-xs text-gray-500">Download records as styled Excel or CSV files</p>
          </div>
        </div>

        <div className="space-y-4">

          {/* Export Students */}
          <div className="rounded-xl border border-gray-100 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Filter size={13} className="text-gray-400" />
              <h3 className="font-medium text-sm text-gray-800">Student List</h3>
            </div>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-40">
                <label className="label">Class (optional)</label>
                <select className="input" value={exportStudentsClass} onChange={e => setExportStudentsClass(e.target.value)}>
                  <option value="">All Classes</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <FormatSelect value={exportStudentsFormat} onChange={setExportStudentsFormat} />
              <ExportBtn label="Export Students" loading={downloadingStudents} onClick={handleExportStudents} />
            </div>
          </div>

          {/* Export Attendance */}
          <div className="rounded-xl border border-gray-100 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Filter size={13} className="text-gray-400" />
              <h3 className="font-medium text-sm text-gray-800">Attendance Records</h3>
            </div>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-40">
                <label className="label">Class (optional)</label>
                <select className="input" value={exportAttClass} onChange={e => setExportAttClass(e.target.value)}>
                  <option value="">All Classes</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">From</label>
                <input type="date" className="input w-36" value={exportAttFrom} onChange={e => setExportAttFrom(e.target.value)} />
              </div>
              <div>
                <label className="label">To</label>
                <input type="date" className="input w-36" value={exportAttTo} onChange={e => setExportAttTo(e.target.value)} />
              </div>
              <FormatSelect value={exportAttFormat} onChange={setExportAttFormat} />
              <ExportBtn label="Export Attendance" loading={downloadingAttendance} onClick={handleExportAttendance} />
            </div>
          </div>

          {/* Export Grades */}
          <div className="rounded-xl border border-gray-100 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Filter size={13} className="text-gray-400" />
              <h3 className="font-medium text-sm text-gray-800">Grade Records</h3>
            </div>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-36">
                <label className="label">Class (optional)</label>
                <select className="input" value={exportGradesClass}
                  onChange={e => { setExportGradesClass(e.target.value); setExportGradesStudent(''); }}>
                  <option value="">All Classes</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-36">
                <label className="label">Student (optional)</label>
                <select className="input" value={exportGradesStudent} onChange={e => setExportGradesStudent(e.target.value)}>
                  <option value="">All Students</option>
                  {(exportGradesClass ? students.filter(s => s.classId === exportGradesClass) : students)
                    .map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Category</label>
                <select className="input w-36" value={exportGradesCat} onChange={e => setExportGradesCat(e.target.value)}>
                  <option value="">All</option>
                  {GRADE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <FormatSelect value={exportGradesFormat} onChange={setExportGradesFormat} />
              <ExportBtn label="Export Grades" loading={downloadingGrades} onClick={handleExportGrades} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
