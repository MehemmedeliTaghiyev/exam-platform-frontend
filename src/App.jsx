import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import QuestionBuilder from './pages/QuestionBuilder';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Müəllim Marşrutu */}
      <Route 
        path="/teacher" 
        element={
          <ProtectedRoute allowedRoles={['Teacher', 'Admin']}>
            <TeacherDashboard />
          </ProtectedRoute>
        } 
      />

      {/* Tələbə Marşrutu */}
      <Route 
        path="/student" 
        element={
          <ProtectedRoute allowedRoles={['Student']}>
            <StudentDashboard />
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

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;