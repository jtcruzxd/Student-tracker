import api from './client';
import type {
  Class, Student, AttendanceSession, AttendanceRecord,
  GradeEntry, Activity, ActivityScore, DashboardData,
  StudentStats, GradeSummary, ApiResponse, ImportResult, Material
} from '../types';

// ─── Auth ──────────────────────────────────────────────────────────────────

export const authApi = {
  login: (username: string, password: string) =>
    api.post<ApiResponse<{ token: string; user: { id: string; username: string } }>>(
      '/auth/login', { username, password }
    ).then(r => r.data.data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get<ApiResponse<{ user: { userId: string; username: string } }>>('/auth/me').then(r => r.data.data),
};

// ─── Classes ───────────────────────────────────────────────────────────────

export const classesApi = {
  list: () => api.get<ApiResponse<Class[]>>('/classes').then(r => r.data.data),
  get: (id: string) => api.get<ApiResponse<Class>>(`/classes/${id}`).then(r => r.data.data),
  create: (data: Partial<Class>) => api.post<ApiResponse<Class>>('/classes', data).then(r => r.data.data),
  update: (id: string, data: Partial<Class>) => api.put<ApiResponse<Class>>(`/classes/${id}`, data).then(r => r.data.data),
  delete: (id: string) => api.delete(`/classes/${id}`).then(r => r.data),
};

// ─── Students ──────────────────────────────────────────────────────────────

export const studentsApi = {
  list: (params?: { search?: string; classId?: string; archived?: boolean }) =>
    api.get<ApiResponse<Student[]>>('/students', { params }).then(r => r.data.data),
  get: (id: string) => api.get<ApiResponse<Student>>(`/students/${id}`).then(r => r.data.data),
  stats: (id: string) => api.get<ApiResponse<StudentStats>>(`/students/${id}/stats`).then(r => r.data.data),
  create: (data: Partial<Student>) => api.post<ApiResponse<Student>>('/students', data).then(r => r.data.data),
  update: (id: string, data: Partial<Student>) => api.put<ApiResponse<Student>>(`/students/${id}`, data).then(r => r.data.data),
  delete: (id: string) => api.delete(`/students/${id}`).then(r => r.data),
};

// ─── Attendance ────────────────────────────────────────────────────────────

export const attendanceApi = {
  sessions: (params?: { classId?: string; from?: string; to?: string }) =>
    api.get<ApiResponse<AttendanceSession[]>>('/attendance/sessions', { params }).then(r => r.data.data),
  session: (id: string) => api.get<ApiResponse<AttendanceSession>>(`/attendance/sessions/${id}`).then(r => r.data.data),
  createSession: (data: { date: string; classId: string; records?: { studentId: string; status: string; notes?: string }[] }) =>
    api.post<ApiResponse<AttendanceSession>>('/attendance/sessions', data).then(r => r.data.data),
  updateSession: (id: string, records: { studentId: string; status: string; notes?: string }[]) =>
    api.put<ApiResponse<AttendanceSession>>(`/attendance/sessions/${id}`, { records }).then(r => r.data.data),
  deleteSession: (id: string) => api.delete(`/attendance/sessions/${id}`).then(r => r.data),
  records: (params?: { studentId?: string; status?: string; from?: string; to?: string }) =>
    api.get<ApiResponse<AttendanceRecord[]>>('/attendance/records', { params }).then(r => r.data.data),
  stats: (params?: { classId?: string; date?: string }) =>
    api.get<ApiResponse<{ date: string; total: number; present: number; absent: number; late: number; excused: number; presentPct: number }>>('/attendance/stats', { params }).then(r => r.data.data),
};

// ─── Grades ────────────────────────────────────────────────────────────────

export const gradesApi = {
  list: (params?: { studentId?: string; category?: string; classId?: string }) =>
    api.get<ApiResponse<GradeEntry[]>>('/grades', { params }).then(r => r.data.data),
  get: (id: string) => api.get<ApiResponse<GradeEntry>>(`/grades/${id}`).then(r => r.data.data),
  summary: (studentId: string) => api.get<ApiResponse<GradeSummary>>(`/grades/student/${studentId}/summary`).then(r => r.data.data),
  create: (data: Partial<GradeEntry>) => api.post<ApiResponse<GradeEntry>>('/grades', data).then(r => r.data.data),
  update: (id: string, data: Partial<GradeEntry>) => api.put<ApiResponse<GradeEntry>>(`/grades/${id}`, data).then(r => r.data.data),
  delete: (id: string) => api.delete(`/grades/${id}`).then(r => r.data),
};

// ─── Activities ────────────────────────────────────────────────────────────

export const activitiesApi = {
  list: (params?: { classId?: string; type?: string }) =>
    api.get<ApiResponse<Activity[]>>('/activities', { params }).then(r => r.data.data),
  get: (id: string) => api.get<ApiResponse<Activity>>(`/activities/${id}`).then(r => r.data.data),
  create: (data: Partial<Activity> & { studentIds?: string[] }) =>
    api.post<ApiResponse<Activity>>('/activities', data).then(r => r.data.data),
  update: (id: string, data: Partial<Activity>) =>
    api.put<ApiResponse<Activity>>(`/activities/${id}`, data).then(r => r.data.data),
  delete: (id: string) => api.delete(`/activities/${id}`).then(r => r.data),
  updateScores: (id: string, scores: { studentId: string; score?: number; submitted?: boolean; notes?: string }[]) =>
    api.put<ApiResponse<Activity>>(`/activities/${id}/scores`, { scores }).then(r => r.data.data),
};

// ─── Dashboard ─────────────────────────────────────────────────────────────

export const dashboardApi = {
  get: () => api.get<ApiResponse<DashboardData>>('/dashboard').then(r => r.data.data),
};

// ─── Import / Export ───────────────────────────────────────────────────────

// ─── Import / Export ───────────────────────────────────────────────────────

// Helper: fetch with auth token and trigger a file download
async function downloadFile(url: string, defaultFilename: string) {
  const token = localStorage.getItem('token');
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Export failed (${res.status})`);
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  // Try to use filename from Content-Disposition header
  const disp = res.headers.get('Content-Disposition') ?? '';
  const match = disp.match(/filename="?([^";\n]+)"?/);
  a.href = objectUrl;
  a.download = match?.[1] ?? defaultFilename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
}

export const exportApi = {
  students: (params?: { classId?: string; format?: string }) => {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v)) as Record<string, string>
    ).toString();
    const base = (import.meta.env.VITE_API_URL ?? '') + '/api';
    return downloadFile(`${base}/export/students${query ? '?' + query : ''}`, `students.${params?.format ?? 'csv'}`);
  },
  attendance: (params?: { classId?: string; from?: string; to?: string; format?: string }) => {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v)) as Record<string, string>
    ).toString();
    const base = (import.meta.env.VITE_API_URL ?? '') + '/api';
    return downloadFile(`${base}/export/attendance${query ? '?' + query : ''}`, `attendance.${params?.format ?? 'csv'}`);
  },
  grades: (params?: { studentId?: string; classId?: string; category?: string; format?: string }) => {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v)) as Record<string, string>
    ).toString();
    const base = (import.meta.env.VITE_API_URL ?? '') + '/api';
    return downloadFile(`${base}/export/grades${query ? '?' + query : ''}`, `grades.${params?.format ?? 'csv'}`);
  },
};

export const importApi = {
  students: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post<ApiResponse<ImportResult>>('/import/students', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data.data);
  },
  grades: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post<ApiResponse<ImportResult>>('/import/grades', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data.data);
  },
};

// ─── Materials ─────────────────────────────────────────────────────────────

export const materialsApi = {
  list: (params?: { classId?: string }) =>
    api.get<ApiResponse<Material[]>>('/materials', { params }).then(r => r.data.data),

  upload: (file: File, title: string, classId: string, description?: string) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('title', title);
    fd.append('classId', classId);
    if (description) fd.append('description', description);
    return api.post<ApiResponse<Material>>('/materials', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data.data);
  },

  addLink: (linkUrl: string, title: string, classId: string, description?: string) =>
    api.post<ApiResponse<Material>>('/materials/link', { linkUrl, title, classId, description })
      .then(r => r.data.data),

  update: (id: string, data: { title?: string; description?: string; linkUrl?: string }) =>
    api.patch<ApiResponse<Material>>(`/materials/${id}`, data).then(r => r.data.data),

  delete: (id: string) => api.delete(`/materials/${id}`).then(r => r.data),

  // Returns a URL to view/download the file (with auth token as query param)
  fileUrl: (id: string) => {
    const base = (import.meta.env.VITE_API_URL ?? '') + '/api';
    const token = localStorage.getItem('token') ?? '';
    return `${base}/materials/${id}/file?token=${token}`;
  },

  // Download the file as a blob with auth header
  download: async (id: string, fileName: string) => {
    const token = localStorage.getItem('token');
    const base = (import.meta.env.VITE_API_URL ?? '') + '/api';
    const res = await fetch(`${base}/materials/${id}/file`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Failed to download file');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fileName;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  },
};
