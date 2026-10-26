import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { OrgProvider } from './contexts/OrgContext';

// Auth
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DemoEntry } from './pages/auth/DemoEntry';
import { DemoBar } from './components/demo/DemoBar';

// Admin
import { AdminOverview } from './pages/admin/AdminOverview';
import { AdminSettings } from './pages/admin/AdminSettings';
import { PositionsManager } from './pages/PositionsManager';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminAnalytics } from './pages/admin/AdminAnalytics';
import { AdminUserProfile } from './pages/admin/AdminUserProfile';

// HR
import { HRDashboard } from './pages/hr/HRDashboard';
import { HRCourseList } from './pages/hr/HRCourseList';
import { CourseConstructor } from './pages/hr/CourseConstructor';
import { CourseGenerator } from './pages/hr/CourseGenerator';
import { HRUsers } from './pages/hr/HRUsers';
import { HRPrintTests } from './pages/hr/HRPrintTests';
import { HRAnalytics } from './pages/hr/HRAnalytics';

// Student
import { StudentDashboard } from './pages/student/StudentDashboard';
import { StudentCourse } from './pages/student/StudentCourse';
import { CourseCatalog } from './pages/student/CourseCatalog';
import { MyCertificates } from './pages/student/MyCertificates';
import { CertificateView } from './pages/student/CertificateView';
import { VerifyCertificate } from './pages/VerifyCertificate';
import { ProfilePage } from './pages/ProfilePage';
import { LandingPage } from './pages/LandingPage';
import { StudentCourseProgress } from './pages/StudentCourseProgress';

// Guards
import { ProtectedRoute } from './components/ProtectedRoute';

function RootRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/welcome" replace />;

  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'hr') return <Navigate to="/hr" replace />;
  return <Navigate to="/dashboard" replace />;
}

function App() {
  return (
    <OrgProvider>
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/welcome" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/demo/:role" element={<DemoEntry />} />
        <Route path="/verify/:number" element={<VerifyCertificate />} />

        {/* Root redirect */}
        <Route path="/" element={<RootRedirect />} />

        {/* Profile — доступен любой авторизованной роли */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        {/* Детальное прохождение курса студентом — для HR и админа */}
        <Route
          path="/progress/:userId/:courseId"
          element={
            <ProtectedRoute requiredRole="hr">
              <StudentCourseProgress />
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminOverview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/groups"
          element={
            <ProtectedRoute requiredRole="admin">
              <PositionsManager />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users/:userId"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminUserProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminAnalytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminSettings />
            </ProtectedRoute>
          }
        />

        {/* Student routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requiredRole="student">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/courses/:courseId"
          element={
            <ProtectedRoute requiredRole="student">
              <StudentCourse />
            </ProtectedRoute>
          }
        />
        <Route
          path="/catalog"
          element={
            <ProtectedRoute requiredRole="student">
              <CourseCatalog />
            </ProtectedRoute>
          }
        />
        <Route
          path="/certificates"
          element={
            <ProtectedRoute requiredRole="student">
              <MyCertificates />
            </ProtectedRoute>
          }
        />
        <Route
          path="/certificates/:number"
          element={
            <ProtectedRoute requiredRole="student">
              <CertificateView />
            </ProtectedRoute>
          }
        />

        {/* HR routes */}
        <Route
          path="/hr"
          element={
            <ProtectedRoute requiredRole="hr">
              <HRDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/analytics"
          element={
            <ProtectedRoute requiredRole="hr">
              <HRAnalytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/courses"
          element={
            <ProtectedRoute requiredRole="hr">
              <HRCourseList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/courses/generate"
          element={
            <ProtectedRoute requiredRole="hr">
              <CourseGenerator />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/courses/new"
          element={
            <ProtectedRoute requiredRole="hr">
              <CourseConstructor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/courses/:courseId/edit"
          element={
            <ProtectedRoute requiredRole="hr">
              <CourseConstructor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/users"
          element={
            <ProtectedRoute requiredRole="hr">
              <HRUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/positions"
          element={
            <ProtectedRoute requiredRole="hr">
              <PositionsManager />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/print-tests"
          element={
            <ProtectedRoute requiredRole="hr">
              <HRPrintTests />
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <DemoBar />
    </BrowserRouter>
    </OrgProvider>
  );
}

export default App;
