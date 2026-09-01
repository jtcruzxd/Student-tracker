import { Settings as SettingsIcon, Database, Info, Server } from 'lucide-react';

export default function Settings() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <SettingsIcon size={18} className="text-gray-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Application Settings</h2>
            <p className="text-xs text-gray-500">Configuration and system information</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
            <div className="flex items-center gap-2">
              <Server size={15} className="text-gray-400" />
              <span className="text-sm text-gray-700">API Server</span>
            </div>
            <span className="text-sm font-mono text-gray-500">http://localhost:3001</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
            <div className="flex items-center gap-2">
              <Database size={15} className="text-gray-400" />
              <span className="text-sm text-gray-700">Database</span>
            </div>
            <span className="text-sm font-mono text-gray-500">SQLite (Prisma ORM)</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
            <div className="flex items-center gap-2">
              <Info size={15} className="text-gray-400" />
              <span className="text-sm text-gray-700">Version</span>
            </div>
            <span className="text-sm font-mono text-gray-500">1.0.0</span>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Attendance Status Guide</h3>
        <div className="space-y-2 text-sm">
          {[
            { status: 'PRESENT', color: 'bg-green-100 text-green-800', desc: 'Student attended the class.' },
            { status: 'ABSENT', color: 'bg-red-100 text-red-800', desc: 'Student did not attend and was not excused.' },
            { status: 'LATE', color: 'bg-yellow-100 text-yellow-800', desc: 'Student arrived after the scheduled start time.' },
            { status: 'EXCUSED', color: 'bg-blue-100 text-blue-800', desc: 'Student was absent with an approved excuse.' },
          ].map(({ status, color, desc }) => (
            <div key={status} className="flex items-center gap-3">
              <span className={`badge ${color} w-20 justify-center flex-shrink-0`}>{status}</span>
              <span className="text-gray-500">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Grade Performance Guide</h3>
        <div className="space-y-2 text-sm">
          {[
            { range: '90–100%', label: 'Excellent', color: 'bg-green-100 text-green-800' },
            { range: '80–89%', label: 'Good', color: 'bg-blue-100 text-blue-800' },
            { range: '70–79%', label: 'Satisfactory', color: 'bg-yellow-100 text-yellow-800' },
            { range: '60–69%', label: 'Passing', color: 'bg-purple-100 text-purple-800' },
            { range: 'Below 60%', label: 'Failing', color: 'bg-red-100 text-red-800' },
          ].map(({ range, label, color }) => (
            <div key={label} className="flex items-center gap-3">
              <span className={`badge ${color} w-24 justify-center flex-shrink-0`}>{label}</span>
              <span className="text-gray-500">{range}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
