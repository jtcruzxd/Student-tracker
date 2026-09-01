import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, CalendarCheck, TrendingUp, AlertTriangle,
  Clock, CheckCircle, XCircle, BookOpen, ChevronRight,
  ClipboardList, BarChart2
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { dashboardApi } from '../api';
import type { DashboardData } from '../types';
import { PageLoader } from '../components/ui/Spinner';
import { format } from 'date-fns';

const COLORS = ['#D96868', '#e07e7e', '#eab308', '#91AE6E', '#689D4B'];

function StatCard({ icon, label, value, sub, color = 'rose' }: {
  icon: React.ReactNode; label: string; value: string | number;
  sub?: string; color?: string;
}) {
  const bg: Record<string, string> = {
    rose:   'bg-primary-50 text-primary-600',
    green:  'bg-sage-50 text-sage-600',
    red:    'bg-primary-100 text-primary-700',
    yellow: 'bg-amber-50 text-amber-600',
    purple: 'bg-violet-50 text-violet-600',
  };
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${bg[color] ?? bg.rose}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.get()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;
  if (!data) return <p className="text-red-500">Failed to load dashboard.</p>;

  const { todayAttendance: ta, gradeDistribution: gd } = data;

  const pieData = [
    { name: 'Failing (<60)', value: gd.failing },
    { name: 'Poor (60–69)', value: gd.poor },
    { name: 'Fair (70–79)', value: gd.fair },
    { name: 'Good (80–89)', value: gd.good },
    { name: 'Excellent (90+)', value: gd.excellent },
  ].filter(d => d.value > 0);

  const attBarData = ta.total > 0 ? [
    { name: 'Present', value: ta.present, fill: '#689D4B' },
    { name: 'Absent',  value: ta.absent,  fill: '#D96868' },
    { name: 'Late',    value: ta.late,    fill: '#eab308' },
    { name: 'Excused', value: ta.excused, fill: '#91AE6E' },
  ] : [];

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Date */}
      <p className="text-sm text-gray-500">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Users size={22} />} label="Total Students" value={data.totalStudents} sub={`${data.totalClasses} classes`} color="rose" />
        <StatCard icon={<CalendarCheck size={22} />} label="Today Present" value={ta.present}
          sub={ta.total > 0 ? `${ta.presentPct}% attendance rate` : 'No sessions today'} color="green" />
        <StatCard icon={<XCircle size={22} />} label="Today Absent" value={ta.absent}
          sub={ta.total > 0 ? `${ta.total} total recorded` : ''} color="red" />
        <StatCard icon={<TrendingUp size={22} />} label="Class Average"
          value={data.classAvg != null ? `${data.classAvg}%` : '—'}
          sub="Overall grade average" color="purple" />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today Attendance */}
        <div className="card p-5 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Today's Attendance</h2>
            <Link to="/attendance" className="text-xs hover:underline flex items-center gap-0.5" style={{ color: '#D96868' }}>
              View <ChevronRight size={12} />
            </Link>
          </div>
          {ta.total === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-gray-400">
              <CalendarCheck size={32} className="mb-2 opacity-50" />
              <p className="text-sm">No attendance sessions recorded today</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { label: 'Present', val: ta.present, icon: <CheckCircle size={14} />, cls: 'text-sage-700 bg-sage-50' },
                  { label: 'Absent',  val: ta.absent,  icon: <XCircle size={14} />,     cls: 'text-primary-700 bg-primary-50' },
                  { label: 'Late',    val: ta.late,    icon: <Clock size={14} />,        cls: 'text-amber-700 bg-amber-50' },
                  { label: 'Excused', val: ta.excused, icon: <CalendarCheck size={14} />, cls: 'text-sky-700 bg-sky-50' },
                ].map(({ label, val, icon, cls }) => (
                  <div key={label} className={`rounded-lg p-3 flex items-center gap-2 ${cls}`}>
                    {icon}
                    <div>
                      <p className="text-lg font-bold leading-none">{val}</p>
                      <p className="text-xs opacity-75">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={attBarData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {attBarData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </div>

        {/* Grade Distribution */}
        <div className="card p-5 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Grade Distribution</h2>
            <Link to="/grades" className="text-xs hover:underline flex items-center gap-0.5" style={{ color: '#D96868' }}>
              View <ChevronRight size={12} />
            </Link>
          </div>
          {pieData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <BarChart2 size={32} className="mb-2 opacity-50" />
              <p className="text-sm">No grade data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v} entries`, '']} />
                <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Low Attendance */}
        <div className="card p-5 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" />
              Low Attendance
            </h2>
            <Link to="/students" className="text-xs hover:underline flex items-center gap-0.5" style={{ color: '#D96868' }}>
              View all <ChevronRight size={12} />
            </Link>
          </div>
          {data.lowAttendanceStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <CheckCircle size={32} className="mb-2 text-green-400 opacity-75" />
              <p className="text-sm">All students above 75%</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {data.lowAttendanceStudents.map(s => (
                <li key={s.id}>
                  <Link to={`/students/${s.id}`} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-primary-50 transition-colors group">
                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold flex-shrink-0">
                      {s.fullName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{s.fullName}</p>
                      <p className="text-xs text-gray-400">{s.studentId}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-sm font-bold text-primary-600">{s.pct}%</span>
                      <p className="text-xs text-gray-400">{s.total} days</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Upcoming Activities</h2>
            <Link to="/activities" className="text-xs hover:underline flex items-center gap-0.5" style={{ color: '#D96868' }}>
              View all <ChevronRight size={12} />
            </Link>
          </div>
          {data.upcomingActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-gray-400">
              <ClipboardList size={28} className="mb-2 opacity-50" />
              <p className="text-sm">No upcoming activities</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {data.upcomingActivities.map(a => (
                <li key={a.id} className="py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#f4f8f0' }}>
                    <ClipboardList size={14} style={{ color: '#689D4B' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
                    <p className="text-xs text-gray-400">{a.class?.name} · {a.type}</p>
                  </div>
                  {a.dueDate && (
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {format(new Date(a.dueDate), 'MMM d')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent Grades */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Grades</h2>
            <Link to="/grades" className="text-xs hover:underline flex items-center gap-0.5" style={{ color: '#D96868' }}>
              View all <ChevronRight size={12} />
            </Link>
          </div>
          {data.recentGrades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-gray-400">
              <BookOpen size={28} className="mb-2 opacity-50" />
              <p className="text-sm">No recent grades</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {data.recentGrades.slice(0, 5).map(g => (
                <li key={g.id} className="py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fdf3f3' }}>
                    <BookOpen size={14} style={{ color: '#D96868' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{g.title}</p>
                    <p className="text-xs text-gray-400 truncate">{g.student?.fullName} · {g.category}</p>
                  </div>
                  <span className={`text-sm font-bold flex-shrink-0 ${g.percentage >= 75 ? 'text-sage-600' : 'text-primary-600'}`}>
                    {g.percentage.toFixed(1)}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
