import type { AttendanceStatus, GradeCategory } from '../../types';

export function AttendanceBadge({ status }: { status: AttendanceStatus }) {
  const map: Record<AttendanceStatus, string> = {
    PRESENT: 'badge-green',
    ABSENT: 'badge-red',
    LATE: 'badge-yellow',
    EXCUSED: 'badge-blue',
  };
  return <span className={map[status]}>{status}</span>;
}

export function GradeBadge({ category }: { category: GradeCategory }) {
  const map: Record<GradeCategory, string> = {
    QUIZ: 'badge-blue',
    ASSIGNMENT: 'badge-purple',
    RECITATION: 'badge-yellow',
    EXAM: 'badge-red',
    PROJECT: 'badge-green',
    CUSTOM: 'badge-gray',
  };
  return <span className={map[category]}>{category}</span>;
}

export function PercentageBadge({ pct }: { pct: number }) {
  const cls = pct >= 90 ? 'badge-green' : pct >= 80 ? 'badge-blue' : pct >= 70 ? 'badge-yellow' : 'badge-red';
  return <span className={cls}>{pct.toFixed(1)}%</span>;
}

export function ScoreStatusBadge({ pct }: { pct: number }) {
  if (pct >= 90) return <span className="badge-green">Excellent</span>;
  if (pct >= 80) return <span className="badge-blue">Good</span>;
  if (pct >= 70) return <span className="badge-yellow">Satisfactory</span>;
  if (pct >= 60) return <span className="badge-purple">Passing</span>;
  return <span className="badge-red">Failing</span>;
}
