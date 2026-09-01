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
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onUpload(file);
  };
  return (
    <label
      className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all ${
        dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
      }`}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
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

function ImportResult({ result, onDismiss }: { result: ImportResult; onDismiss: () => void }) {
  return (
    <div className="rounded-xl border overflow-hidden">
      <div className={`flex items-center justify-between p-4 ${result.errors.length === 0 ? 'bg-green-50 border-b border-green-100' : 'bg-yellow-50 border-b border-yellow-100'}`}>
        <div className="flex items-center gap-2">
          {result.errors.length === 0
            ? <CheckCircle size={18} className="text-green-600" />
            : <AlertCircle size={18} className="text-yellow-600" />}
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

export default function ImportExport() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [importingStudents, setImportingStudents] = useState(false);
  const [importingGrades, setImportingGrades] = useState(false);
  const [studentImportResult, setStudentImportResult] = useState<ImportResult | null>(null);
  const [gradeImportResult, setGradeImportResult] = useState<ImportResult | null>(null);

  // Export filters
  const [exportStudentsClass, setExportStudentsClass] = useState('');
  const [exportStudentsFormat, setExportStudentsFormat] = useState('csv');
  const [exportAttClass, setExportAttClass] = useState('');
  const [exportAttFrom, setExportAttFrom] = useState('');
  const [exportAttTo, setExportAttTo] = useState('');
  const [exportAttFormat, setExportAttFormat] = useState('csv');
  const [exportGradesClass, setExportGradesClass] = useState('');
  const [exportGradesStudent, setExportGradesStudent] = useState('');
  const [exportGradesCat, setExportGradesCat] = useState('');
  const [exportGradesFormat, setExportGradesFormat] = useState('csv');

  useEffect(() => {
    Promise.all([classesApi.list(), studentsApi.list()])
      .then(([c, s]) => { setClasses(c); setStudents(s); });
  }, []);

  const handleStudentImport = async (file: File) => {
    setImportingStudents(true);
    setStudentImportResult(null);
    try {
      const result = await importApi.students(file);
      setStudentImportResult(result);
      if (result.imported > 0) toast.success(`${result.imported} students imported`);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Import failed'); }
    finally { setImportingStudents(false); }
  };

  const handleGradeImport = async (file: File) => {
    setImportingGrades(true);
    setGradeImportResult(null);
    try {
      const result = await importApi.grades(file);
      setGradeImportResult(result);
      if (result.imported > 0) toast.success(`${result.imported} grade entries imported`);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Import failed'); }
    finally { setImportingGrades(false); }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Import Section */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Upload size={18} className="text-blue-600" />
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
              <FileText size={15} className="text-blue-500" />
              <h3 className="font-medium text-sm text-gray-800">Import Students</h3>
            </div>
            <FileUploader
              label="Upload Students CSV/XLSX"
              accept=".csv,.xlsx,.xls"
              onUpload={handleStudentImport}
              loading={importingStudents}
            />
            {studentImportResult && (
              <ImportResult result={studentImportResult} onDismiss={() => setStudentImportResult(null)} />
            )}
            <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
              <p className="font-medium text-gray-600 mb-1">Required columns:</p>
              <p><code className="bg-white px-1 rounded border border-gray-100">Student ID</code>, <code className="bg-white px-1 rounded border border-gray-100">Full Name</code>, <code className="bg-white px-1 rounded border border-gray-100">Class</code></p>
              <p className="mt-1">Optional: <code className="bg-white px-1 rounded border border-gray-100">Email</code>, <code className="bg-white px-1 rounded border border-gray-100">Guardian Contact</code></p>
              <p className="mt-1 text-gray-300">Class must match an existing class name exactly.</p>
            </div>
          </div>

          {/* Import Grades */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText size={15} className="text-purple-500" />
              <h3 className="font-medium text-sm text-gray-800">Import Grades</h3>
            </div>
            <FileUploader
              label="Upload Grades CSV/XLSX"
              accept=".csv,.xlsx,.xls"
              onUpload={handleGradeImport}
              loading={importingGrades}
            />
            {gradeImportResult && (
              <ImportResult result={gradeImportResult} onDismiss={() => setGradeImportResult(null)} />
            )}
            <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
              <p className="font-medium text-gray-600 mb-1">Required columns:</p>
              <p><code className="bg-white px-1 rounded border border-gray-100">Student ID</code>, <code className="bg-white px-1 rounded border border-gray-100">Title</code>, <code className="bg-white px-1 rounded border border-gray-100">Category</code>, <code className="bg-white px-1 rounded border border-gray-100">Score</code>, <code className="bg-white px-1 rounded border border-gray-100">Max Score</code>, <code className="bg-white px-1 rounded border border-gray-100">Date</code></p>
              <p className="mt-1">Category: QUIZ, ASSIGNMENT, RECITATION, EXAM, PROJECT, CUSTOM</p>
              <p className="mt-1">Optional: <code className="bg-white px-1 rounded border border-gray-100">Remarks</code></p>
            </div>
          </div>
        </div>
      </div>

      {/* Export Section */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
            <Download size={18} className="text-green-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Export Data</h2>
            <p className="text-xs text-gray-500">Download records as CSV or Excel files</p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Export Students */}
          <div className="rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter size={14} className="text-gray-400" />
              <h3 className="font-medium text-sm">Student List</h3>
            </div>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-40">
                <label className="label">Class (optional)</label>
                <select className="input" value={exportStudentsClass} onChange={e => setExportStudentsClass(e.target.value)}>
                  <option value="">All Classes</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Format</label>
                <select className="input w-24" value={exportStudentsFormat} onChange={e => setExportStudentsFormat(e.target.value)}>
                  <option value="csv">CSV</option>
                  <option value="xlsx">Excel</option>
                </select>
              </div>
              <button
                className="btn-primary"
                onClick={() => exportApi.students({ classId: exportStudentsClass || undefined, format: exportStudentsFormat })}
              >
                <Download size={14} /> Export Students
              </button>
            </div>
          </div>

          {/* Export Attendance */}
          <div className="rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter size={14} className="text-gray-400" />
              <h3 className="font-medium text-sm">Attendance Records</h3>
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
              <div>
                <label className="label">Format</label>
                <select className="input w-24" value={exportAttFormat} onChange={e => setExportAttFormat(e.target.value)}>
                  <option value="csv">CSV</option>
                  <option value="xlsx">Excel</option>
                </select>
              </div>
              <button
                className="btn-primary"
                onClick={() => exportApi.attendance({
                  classId: exportAttClass || undefined,
                  from: exportAttFrom || undefined,
                  to: exportAttTo || undefined,
                  format: exportAttFormat,
                })}
              >
                <Download size={14} /> Export Attendance
              </button>
            </div>
          </div>

          {/* Export Grades */}
          <div className="rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter size={14} className="text-gray-400" />
              <h3 className="font-medium text-sm">Grade Records</h3>
            </div>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-36">
                <label className="label">Class (optional)</label>
                <select className="input" value={exportGradesClass} onChange={e => { setExportGradesClass(e.target.value); setExportGradesStudent(''); }}>
                  <option value="">All Classes</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-36">
                <label className="label">Student (optional)</label>
                <select className="input" value={exportGradesStudent} onChange={e => setExportGradesStudent(e.target.value)}>
                  <option value="">All Students</option>
                  {(exportGradesClass ? students.filter(s => s.classId === exportGradesClass) : students).map(s => (
                    <option key={s.id} value={s.id}>{s.fullName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Category</label>
                <select className="input w-36" value={exportGradesCat} onChange={e => setExportGradesCat(e.target.value)}>
                  <option value="">All</option>
                  {GRADE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Format</label>
                <select className="input w-24" value={exportGradesFormat} onChange={e => setExportGradesFormat(e.target.value)}>
                  <option value="csv">CSV</option>
                  <option value="xlsx">Excel</option>
                </select>
              </div>
              <button
                className="btn-primary"
                onClick={() => exportApi.grades({
                  classId: exportGradesClass || undefined,
                  studentId: exportGradesStudent || undefined,
                  category: exportGradesCat || undefined,
                  format: exportGradesFormat,
                })}
              >
                <Download size={14} /> Export Grades
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
