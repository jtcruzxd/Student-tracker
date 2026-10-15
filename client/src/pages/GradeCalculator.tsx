import { useEffect, useState, useCallback } from 'react';
import {
  Calculator, Plus, Trash2, Save, Play, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle, Info, GraduationCap, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { classesApi, criteriaApi } from '../api';
import type { Class, GradingCriterion, StudentGradeResult } from '../types';
import { PageLoader } from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { value: 'QUIZ',        label: 'Quiz' },
  { value: 'ASSIGNMENT',  label: 'Assignment' },
  { value: 'RECITATION',  label: 'Recitation' },
  { value: 'EXAM',        label: 'Exam' },
  { value: 'PROJECT',     label: 'Project' },
  { value: 'ATTENDANCE',  label: 'Class Standing (Attendance)' },
  { value: 'CUSTOM',      label: 'Custom' },
];

const CATEGORY_COLORS: Record<string, string> = {
  QUIZ:        'bg-blue-100 text-blue-700',
  ASSIGNMENT:  'bg-purple-100 text-purple-700',
  RECITATION:  'bg-orange-100 text-orange-700',
  EXAM:        'bg-red-100 text-red-700',
  PROJECT:     'bg-green-100 text-green-700',
  ATTENDANCE:  'bg-teal-100 text-teal-700',
  CUSTOM:      'bg-gray-100 text-gray-600',
};

type DraftCriterion = { label: string; category: string; weight: string };

const EMPTY_ROW: DraftCriterion = { label: '', category: 'QUIZ', weight: '' };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function gradeColor(g: number | null) {
  if (g === null) return 'text-gray-400';
  if (g >= 90) return 'text-green-600';
  if (g >= 85) return 'text-blue-600';
  if (g >= 80) return 'text-indigo-600';
  if (g >= 75) return 'text-yellow-600';
  return 'text-red-600';
}

function gradeBg(g: number | null) {
  if (g === null) return 'bg-gray-50';
  if (g >= 90) return 'bg-green-50';
  if (g >= 85) return 'bg-blue-50';
  if (g >= 80) return 'bg-indigo-50';
  if (g >= 75) return 'bg-yellow-50';
  return 'bg-red-50';
}

function gradeLabel(g: number | null) {
  if (g === null) return '—';
  if (g >= 90) return 'Outstanding';
  if (g >= 85) return 'Very Satisfactory';
  if (g >= 80) return 'Satisfactory';
  if (g >= 75) return 'Fairly Satisfactory';
  return 'Did Not Meet';
}

// ─── Criteria Editor ─────────────────────────────────────────────────────────

function CriteriaEditor({
  draft, setDraft, onSave, saving,
}: {
  draft: DraftCriterion[];
  setDraft: React.Dispatch<React.SetStateAction<DraftCriterion[]>>;
  onSave: () => void;
  saving: boolean;
}) {
  const total = draft.reduce((s, r) => s + (parseFloat(r.weight) || 0), 0);
  const remaining = Math.round((100 - total) * 10) / 10;
  const isValid = draft.length > 0
    && draft.every(r => r.label.trim() && r.category && parseFloat(r.weight) > 0)
    && Math.round(total * 10) / 10 <= 100;

  const update = (i: number, field: keyof DraftCriterion, val: string) => {
    setDraft(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: val };
      // Auto-fill label when category changes and label is still the old default
      if (field === 'category') {
        const oldDefault = CATEGORY_OPTIONS.find(o => o.value === prev[i].category)?.label ?? '';
        if (!prev[i].label || prev[i].label === oldDefault) {
          const newDefault = CATEGORY_OPTIONS.find(o => o.value === val)?.label ?? '';
          next[i].label = newDefault;
        }
      }
      return next;
    });
  };

  const addRow = () => {
    setDraft(prev => {
      const newRow = { ...EMPTY_ROW };
      const usedCats = prev.map(r => r.category);
      const nextCat = CATEGORY_OPTIONS.find(o => !usedCats.includes(o.value));
      if (nextCat) {
        newRow.category = nextCat.value;
        newRow.label = nextCat.label;
      }
      // Auto-fill remaining weight
      const used = prev.reduce((s, r) => s + (parseFloat(r.weight) || 0), 0);
      const rem = Math.round((100 - used) * 10) / 10;
      if (rem > 0) newRow.weight = String(rem);
      return [...prev, newRow];
    });
  };

  const removeRow = (i: number) => setDraft(prev => prev.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      {/* Rows */}
      <div className="space-y-2">
        {draft.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            {/* Category */}
            <select
              className="input w-52 flex-shrink-0"
              value={row.category}
              onChange={e => update(i, 'category', e.target.value)}
            >
              {CATEGORY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {/* Label */}
            <input
              className="input flex-1 min-w-0"
              placeholder="Display label…"
              value={row.label}
              onChange={e => update(i, 'label', e.target.value)}
            />

            {/* Weight */}
            <div className="relative flex-shrink-0 w-24">
              <input
                type="number"
                className="input pr-7 w-full text-right"
                placeholder="0"
                min="0"
                max="100"
                step="0.5"
                value={row.weight}
                onChange={e => update(i, 'weight', e.target.value)}
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">%</span>
            </div>

            {/* Remove */}
            <button
              type="button"
              onClick={() => removeRow(i)}
              className="btn-ghost btn-sm p-1.5 text-red-400 hover:bg-red-50 flex-shrink-0"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      {/* Weight totals bar */}
      <div className="rounded-xl overflow-hidden h-3 bg-gray-100 flex">
        {draft.map((row, i) => {
          const w = parseFloat(row.weight) || 0;
          if (w <= 0) return null;
          return (
            <div
              key={i}
              className={`h-full transition-all ${Object.values(CATEGORY_COLORS)[i % Object.values(CATEGORY_COLORS).length].split(' ')[0]}`}
              style={{ width: `${Math.min(w, 100)}%` }}
              title={`${row.label}: ${w}%`}
            />
          );
        })}
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className={`font-medium ${total > 100 ? 'text-red-600' : total === 100 ? 'text-green-600' : 'text-gray-500'}`}>
          Total: {Math.round(total * 10) / 10}%
          {total < 100 && total > 0 && <span className="text-gray-400 font-normal ml-1">({remaining}% remaining)</span>}
          {total === 100 && <CheckCircle size={14} className="inline ml-1 text-green-500" />}
          {total > 100 && <AlertTriangle size={14} className="inline ml-1 text-red-500" />}
        </span>
        <button type="button" onClick={addRow} className="btn-ghost btn-sm flex items-center gap-1">
          <Plus size={14} /> Add criterion
        </button>
      </div>

      {total < 100 && total > 0 && (
        <p className="text-xs text-amber-600 flex items-center gap-1">
          <Info size={12} />
          Weights total {Math.round(total * 10) / 10}%. The final grade will be scaled to 100% using only criteria that have data.
        </p>
      )}

      <div className="flex justify-end pt-1">
        <button
          className="btn-primary"
          onClick={onSave}
          disabled={saving || !isValid}
        >
          {saving
            ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</span>
            : <><Save size={14} /> Save Criteria</>}
        </button>
      </div>
    </div>
  );
}

// ─── Results Table ────────────────────────────────────────────────────────────

function ResultsTable({ results }: { results: StudentGradeResult[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const passing = results.filter(r => r.transmutedGrade !== null && r.transmutedGrade >= 75).length;
  const failing = results.filter(r => r.transmutedGrade !== null && r.transmutedGrade < 75).length;
  const noData  = results.filter(r => r.transmutedGrade === null).length;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{passing}</p>
          <p className="text-xs text-gray-500 mt-0.5">Passing (≥75)</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-red-500">{failing}</p>
          <p className="text-xs text-gray-500 mt-0.5">Failing (&lt;75)</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-gray-400">{noData}</p>
          <p className="text-xs text-gray-500 mt-0.5">No data</p>
        </div>
      </div>

      {/* Student rows */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="table-th w-6"></th>
              <th className="table-th">Student</th>
              <th className="table-th">ID</th>
              {results[0]?.breakdown.map(b => (
                <th key={b.category} className="table-th text-center hidden md:table-cell">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[b.category] ?? 'bg-gray-100 text-gray-600'}`}>
                    {b.label}
                    <span className="text-gray-400 font-normal ml-0.5">({b.weight}%)</span>
                  </span>
                </th>
              ))}
              <th className="table-th text-center">Final Grade</th>
              <th className="table-th text-center">Transmuted</th>
              <th className="table-th">Descriptor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {results.map(r => {
              const isExp = expanded.has(r.studentId);
              return (
                <>
                  <tr
                    key={r.studentId}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${gradeBg(r.transmutedGrade)}`}
                    onClick={() => toggle(r.studentId)}
                  >
                    <td className="table-td text-gray-400">
                      {isExp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </td>
                    <td className="table-td font-medium text-gray-900">{r.fullName}</td>
                    <td className="table-td text-xs text-gray-400 font-mono">{r.studentNo}</td>
                    {r.breakdown.map(b => (
                      <td key={b.category} className="table-td text-center hidden md:table-cell">
                        {b.avg !== null ? (
                          <span className="text-sm font-medium">{b.avg.toFixed(1)}%</span>
                        ) : (
                          <span className="text-gray-300 text-sm">—</span>
                        )}
                      </td>
                    ))}
                    <td className="table-td text-center">
                      <span className={`text-base font-bold ${gradeColor(r.finalGrade)}`}>
                        {r.finalGrade !== null ? `${r.finalGrade.toFixed(2)}%` : '—'}
                      </span>
                    </td>
                    <td className="table-td text-center">
                      <span className={`text-xl font-bold ${gradeColor(r.transmutedGrade)}`}>
                        {r.transmutedGrade ?? '—'}
                      </span>
                    </td>
                    <td className="table-td">
                      <span className={`text-xs font-medium ${gradeColor(r.transmutedGrade)}`}>
                        {gradeLabel(r.transmutedGrade)}
                      </span>
                    </td>
                  </tr>

                  {/* Expanded breakdown row */}
                  {isExp && (
                    <tr key={`${r.studentId}-detail`} className="bg-gray-50/80">
                      <td></td>
                      <td colSpan={99} className="px-4 py-3">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                          {r.breakdown.map(b => (
                            <div key={b.category} className="bg-white rounded-lg border border-gray-100 p-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${CATEGORY_COLORS[b.category] ?? 'bg-gray-100 text-gray-600'}`}>
                                  {b.label}
                                </span>
                                <span className="text-xs text-gray-400">{b.weight}%</span>
                              </div>
                              <p className="text-lg font-bold text-gray-800 mt-1">
                                {b.avg !== null ? `${b.avg.toFixed(1)}%` : <span className="text-gray-300">—</span>}
                              </p>
                              {b.contribution !== null && (
                                <p className="text-xs text-gray-400 mt-0.5">
                                  Contribution: <span className="font-medium text-gray-600">{b.contribution.toFixed(2)}%</span>
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                        {r.usedWeight < r.totalWeight && (
                          <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                            <Info size={11} />
                            Grade based on {r.usedWeight}% of {r.totalWeight}% total weight — some criteria have no data yet.
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GradeCalculator() {
  const [classes, setClasses]         = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [criteria, setCriteria]       = useState<GradingCriterion[]>([]);
  const [draft, setDraft]             = useState<DraftCriterion[]>([]);
  const [results, setResults]         = useState<StudentGradeResult[] | null>(null);

  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingCriteria, setLoadingCriteria] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [calculating, setCalculating] = useState(false);

  // Load classes once
  useEffect(() => {
    classesApi.list()
      .then(setClasses)
      .finally(() => setLoadingClasses(false));
  }, []);

  // Load criteria whenever class changes
  const loadCriteria = useCallback(async (classId: string) => {
    if (!classId) { setCriteria([]); setDraft([]); setResults(null); return; }
    setLoadingCriteria(true);
    setResults(null);
    try {
      const data = await criteriaApi.list(classId);
      setCriteria(data);
      setDraft(data.map(c => ({ label: c.label, category: c.category, weight: String(c.weight) })));
    } finally {
      setLoadingCriteria(false);
    }
  }, []);

  useEffect(() => { loadCriteria(selectedClass); }, [selectedClass, loadCriteria]);

  const handleSave = async () => {
    if (!selectedClass) return;
    setSaving(true);
    try {
      const payload = draft
        .filter(r => r.label.trim() && r.category && parseFloat(r.weight) > 0)
        .map(r => ({ label: r.label.trim(), category: r.category, weight: parseFloat(r.weight) }));
      const saved = await criteriaApi.save(selectedClass, payload);
      setCriteria(saved);
      setDraft(saved.map(c => ({ label: c.label, category: c.category, weight: String(c.weight) })));
      toast.success('Grading criteria saved');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleCalculate = async () => {
    if (!selectedClass) return;
    setCalculating(true);
    try {
      const data = await criteriaApi.calculate(selectedClass);
      setResults(data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to calculate grades');
    } finally {
      setCalculating(false);
    }
  };

  const selectedClassName = classes.find(c => c.id === selectedClass)?.name ?? '';
  const totalWeight = draft.reduce((s, r) => s + (parseFloat(r.weight) || 0), 0);
  const hasSavedCriteria = criteria.length > 0;

  return (
    <div className="space-y-5 max-w-7xl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Grade Calculator</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Set weighted grading criteria per class and compute final grades
          </p>
        </div>
      </div>

      {/* Class selector */}
      <div className="card p-4">
        <label className="label mb-2">Select Class</label>
        {loadingClasses ? (
          <div className="h-10 bg-gray-100 rounded-lg animate-pulse w-64" />
        ) : (
          <select
            className="input w-full sm:w-72"
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
          >
            <option value="">Choose a class…</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      {!selectedClass ? (
        <div className="card">
          <EmptyState
            icon={<GraduationCap size={28} />}
            title="Select a class to get started"
            description="Choose a class above to configure its grading criteria and calculate final grades."
          />
        </div>
      ) : loadingCriteria ? (
        <PageLoader />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── Left panel: Criteria editor ── */}
          <div className="lg:col-span-1 space-y-4">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Calculator size={17} className="text-blue-500" />
                  Grading Criteria
                </h2>
                {hasSavedCriteria && (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle size={12} /> Saved
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-400 mb-4">
                Define how each component contributes to the final grade. Weights should total 100%.
              </p>

              {draft.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-400 mb-3">No criteria yet</p>
                  <button className="btn-primary btn-sm" onClick={() => setDraft([{ ...EMPTY_ROW, label: 'Quiz', category: 'QUIZ', weight: '' }])}>
                    <Plus size={14} /> Add First Criterion
                  </button>
                </div>
              ) : (
                <CriteriaEditor draft={draft} setDraft={setDraft} onSave={handleSave} saving={saving} />
              )}
            </div>

            {/* How it works */}
            <div className="card p-4 bg-blue-50 border border-blue-100">
              <h3 className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1">
                <Info size={12} /> How it works
              </h3>
              <ul className="text-xs text-blue-600 space-y-1 list-disc list-inside">
                <li>Each criterion maps to a grade category (Quiz, Exam, etc.)</li>
                <li><strong>Class Standing</strong> uses attendance — present & excused count as attended</li>
                <li>The average percentage for each category is multiplied by its weight</li>
                <li>Final grade is the sum of all weighted contributions</li>
                <li>Transmuted grade follows the Philippine grading scale</li>
              </ul>
            </div>
          </div>

          {/* ── Right panel: Results ── */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">
                Final Grades
                {selectedClassName && <span className="text-gray-400 font-normal ml-2">— {selectedClassName}</span>}
              </h2>
              <div className="flex gap-2">
                {results && (
                  <button className="btn-secondary btn-sm flex items-center gap-1.5" onClick={handleCalculate} disabled={calculating}>
                    <RefreshCw size={14} className={calculating ? 'animate-spin' : ''} /> Recalculate
                  </button>
                )}
                <button
                  className="btn-primary flex items-center gap-1.5"
                  onClick={handleCalculate}
                  disabled={calculating || !hasSavedCriteria}
                  title={!hasSavedCriteria ? 'Save criteria first' : ''}
                >
                  {calculating
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Calculating…</>
                    : <><Play size={14} /> Calculate Grades</>}
                </button>
              </div>
            </div>

            {!hasSavedCriteria ? (
              <div className="card">
                <EmptyState
                  icon={<Calculator size={28} />}
                  title="No criteria saved yet"
                  description="Configure and save grading criteria on the left, then click Calculate Grades."
                />
              </div>
            ) : !results ? (
              <div className="card">
                <EmptyState
                  icon={<Play size={28} />}
                  title="Ready to calculate"
                  description={`Criteria set: ${criteria.map(c => `${c.label} (${c.weight}%)`).join(' · ')}. Click Calculate Grades to generate results.`}
                />
              </div>
            ) : results.length === 0 ? (
              <div className="card">
                <EmptyState
                  icon={<GraduationCap size={28} />}
                  title="No students in this class"
                  description="Add students to this class first."
                />
              </div>
            ) : (
              <ResultsTable results={results} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
