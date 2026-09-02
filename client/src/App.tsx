import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import StudentProfile from './pages/StudentProfile';
import Attendance from './pages/Attendance';
import Grades from './pages/Grades';
import Activities from './pages/Activities';
import Classes from './pages/Classes';
import ImportExport from './pages/ImportExport';
import Settings from './pages/Settings';

import Materials from './pages/Materials';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: { fontSize: '14px', maxWidth: '400px' },
              success: { iconTheme: { primary: '#689D4B', secondary: '#fff' } },
              error: { iconTheme: { primary: '#D96868', secondary: '#fff' } },
            }}
          />
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />

            {/* Protected — everything inside Layout requires auth */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="students" element={<Students />} />
              <Route path="students/:id" element={<StudentProfile />} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="grades" element={<Grades />} />
              <Route path="activities" element={<Activities />} />
              <Route path="materials" element={<Materials />} />
              <Route path="classes" element={<Classes />} />
              <Route path="import-export" element={<ImportExport />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
