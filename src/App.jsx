import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import QuestionBuilder from './pages/QuestionBuilder';
import TakeExam from './pages/TakeExam';
import ExamResult from './pages/ExamResult';
import ExamStats from './pages/ExamStats';
import TeacherCabinet from './pages/TeacherCabinet';
import GroupDetail from './pages/GroupDetail';
import StudentProfile from './pages/StudentProfile';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminTeachers from './pages/AdminTeachers';
import AdminExamDetail from './pages/AdminExamDetail';
import TeacherUsers from './pages/TeacherUsers';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['Admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/teachers"
        element={
          <ProtectedRoute allowedRoles={['Admin']}>
            <AdminTeachers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/exams/:id"
        element={
          <ProtectedRoute allowedRoles={['Admin']}>
            <AdminExamDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={['Admin']}>
            <AdminUsers />
          </ProtectedRoute>
        }
      />

      <Route
        path="/teacher/users"
        element={
          <ProtectedRoute allowedRoles={['Teacher', 'Admin']}>
            <TeacherUsers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher"
        element={
          <ProtectedRoute allowedRoles={['Teacher', 'Admin']}>
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/cabinet"
        element={
          <ProtectedRoute allowedRoles={['Teacher', 'Admin']}>
            <TeacherCabinet />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/groups/:id"
        element={
          <ProtectedRoute allowedRoles={['Teacher', 'Admin']}>
            <GroupDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/students/:id"
        element={
          <ProtectedRoute allowedRoles={['Teacher', 'Admin']}>
            <StudentProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/exams/:examId/review"
        element={
          <ProtectedRoute allowedRoles={['Teacher', 'Admin']}>
            <ExamResult />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/exams/:id/stats"
        element={
          <ProtectedRoute allowedRoles={['Teacher', 'Admin']}>
            <ExamStats />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/exams/:id"
        element={
          <ProtectedRoute allowedRoles={['Teacher', 'Admin']}>
            <QuestionBuilder />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={['Student']}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/exams/:examId/review"
        element={
          <ProtectedRoute allowedRoles={['Student']}>
            <ExamResult />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/exams/:id"
        element={
          <ProtectedRoute allowedRoles={['Student']}>
            <TakeExam />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/exam-result/exam/:examId"
        element={
          <ProtectedRoute allowedRoles={['Student']}>
            <ExamResult />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/exam-result/:submissionId"
        element={
          <ProtectedRoute allowedRoles={['Student']}>
            <ExamResult />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
