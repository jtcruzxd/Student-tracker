export interface Class {
  id: string;
  name: string;
  gradeLevel: string;
  section?: string;
  schoolYear: string;
  createdAt: string;
  updatedAt: string;
  _count?: { students: number; activities?: number };
}

export interface Student {
  id: string;
  studentId: string;
  fullName: string;
  email?: string;
  guardianContact?: string;
  classId: string;
  class: Class;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { attendanceRecords: number; gradeEntries: number };
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export interface AttendanceSession {
  id: string;
  date: string;
  classId: string;
  class: Class;
  createdAt: string;
  updatedAt: string;
  records: AttendanceRecord[];
  _count?: { records: number };
}

export interface AttendanceRecord {
  id: string;
  status: AttendanceStatus;
  notes?: string;
  sessionId: string;
  session?: AttendanceSession;
  studentId: string;
  student?: Student;
  createdAt: string;
  updatedAt: string;
}

export type GradeCategory = 'QUIZ' | 'ASSIGNMENT' | 'RECITATION' | 'EXAM' | 'PROJECT' | 'CUSTOM';

export interface GradeEntry {
  id: string;
  title: string;
  category: GradeCategory;
  score: number;
  maxScore: number;
  percentage: number;
  remarks?: string;
  date: string;
  studentId: string;
  student?: Student;
  activityId?: string;
  activity?: Activity;
  createdAt: string;
  updatedAt: string;
}

export type ActivityType = 'QUIZ' | 'ASSIGNMENT' | 'RECITATION' | 'EXAM' | 'PROJECT';

export interface Activity {
  id: string;
  title: string;
  type: ActivityType;
  description?: string;
  dueDate?: string;
  activityDate?: string;
  maxScore: number;
  classId: string;
  class: Class;
  createdAt: string;
  updatedAt: string;
  scores?: ActivityScore[];
  _count?: { scores: number };
}

export interface ActivityScore {
  id: string;
  score?: number;
  submitted: boolean;
  notes?: string;
  studentId: string;
  student?: Student;
  activityId: string;
  activity?: Activity;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardData {
  totalStudents: number;
  totalClasses: number;
  todayAttendance: {
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    presentPct: number;
    sessions: number;
  };
  lowAttendanceStudents: Array<{
    id: string;
    fullName: string;
    studentId: string;
    pct: number;
    total: number;
  }>;
  recentActivities: Activity[];
  upcomingActivities: Activity[];
  recentGrades: GradeEntry[];
  gradeDistribution: {
    failing: number;
    poor: number;
    fair: number;
    good: number;
    excellent: number;
  };
  classAvg: number | null;
}

export interface StudentStats {
  attendance: {
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    attendancePct: number;
  };
  grades: {
    overallAvg: number | null;
    byCategory: Record<string, { count: number; avg: number }>;
    totalEntries: number;
  };
}

export interface GradeSummary {
  summary: Record<string, { count: number; avg: number; entries: GradeEntry[] }>;
  overall: number | null;
  total: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ImportResult {
  imported: number;
  errors: Array<{ row: number; message: string }>;
}
