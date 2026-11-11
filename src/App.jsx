import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Register from './pages/Register';
import TeacherDashboard from './pages/TeacherDashboard';
import WeakExam from './pages/WeakExam';
import TeacherStorage from './pages/TeacherStorage';
import StudentDashboard from './pages/StudentDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import QuestionBuilder from './pages/QuestionBuilder';
import TakeExam from './pages/TakeExam';
import ExamResult from './pages/ExamResult';
import ExamStats from './pages/ExamStats';
import TeacherCabinet from './pages/TeacherCabinet';
import TeacherAi from './pages/TeacherAi';
import GroupDetail from './pages/GroupDetail';
import StudentProfile from './pages/StudentProfile';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminTeachers from './pages/AdminTeachers';
import AdminExamDetail from './pages/AdminExamDetail';
import TeacherUsers from './pages/TeacherUsers';
import JoinStudent from './pages/JoinStudent';
import NewStudents from './pages/NewStudents';
import NewTeachers from './pages/NewTeachers';
import PromoAd from './pages/PromoAd';
import Home from './pages/Home';
import BrowseTeachers from './pages/BrowseTeachers';
import PublicExamZone from './pages/PublicExamZone';
import TakePipelineExam from './pages/TakePipelineExam';
import StudentSubscriptions from './pages/StudentSubscriptions';
import RepublicExam from './pages/RepublicExam';
import RepublicTake from './pages/RepublicTake';
import RepublicResult from './pages/RepublicResult';
import StudentSyllabus from './pages/StudentSyllabus';
import StudentAccount from './pages/StudentAccount';
import StudentWallet from './pages/StudentWallet';
import DailyChallenge from './pages/DailyChallenge';
import StudentProgress from './pages/StudentProgress';
import WeekendWeak from './pages/WeekendWeak';
import WeekendTake from './pages/WeekendTake';
import WeekendResult from './pages/WeekendResult';
import Day6Review from './pages/Day6Review';
import Day6Take from './pages/Day6Take';
import Day6Result from './pages/Day6Result';
import Legal from './pages/Legal';
import UrgentBroadcastHost from './components/UrgentBroadcastHost';

function App() {
  return (
    <>
      <UrgentBroadcastHost />
      <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/exams" element={<PublicExamZone />} />
      <Route path="/teachers" element={<BrowseTeachers />} />
      <Route path="/teachers/:id" element={<BrowseTeachers />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/register" element={<Register />} />
      <Route path="/register/teacher" element={<Register />} />
      <Route path="/register/student" element={<Register />} />
      <Route path="/join/:code" element={<JoinStudent />} />
      <Route path="/reklam" element={<PromoAd />} />
      <Route path="/privacy" element={<Legal />} />
      <Route path="/terms" element={<Legal />} />
      <Route path="/support" element={<Legal />} />
      <Route path="/delete-account" element={<Legal />} />

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
        path="/admin/new-teachers"
        element={
          <ProtectedRoute allowedRoles={['Admin']}>
            <NewTeachers />
          </ProtectedRoute>
        }
      />
      <Route path="/admin/exams" element={<Navigate to="/teacher" replace />} />
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
        path="/teacher/new-students"
        element={
          <ProtectedRoute allowedRoles={['Teacher', 'Admin']}>
            <NewStudents />
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
        path="/teacher/weak"
        element={
          <ProtectedRoute allowedRoles={['Teacher', 'Admin']}>
            <WeakExam />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/storage"
        element={
          <ProtectedRoute allowedRoles={['Teacher', 'Admin']}>
            <TeacherStorage />
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
        path="/teacher/ai"
        element={
          <ProtectedRoute allowedRoles={['Teacher', 'Admin']}>
            <TeacherAi />
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
        path="/teacher/dim/:examId"
        element={
          <ProtectedRoute allowedRoles={['Teacher', 'Admin']}>
            <TakePipelineExam preview />
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
        path="/student/syllabus"
        element={
          <ProtectedRoute allowedRoles={['Student']}>
            <StudentSyllabus />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/syllabus/:topicId"
        element={
          <ProtectedRoute allowedRoles={['Student']}>
            <StudentSyllabus />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/account"
        element={
          <ProtectedRoute allowedRoles={['Student']}>
            <StudentAccount />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/wallet"
        element={
          <ProtectedRoute allowedRoles={['Student']}>
            <StudentWallet />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/progress"
        element={
          <ProtectedRoute allowedRoles={['Student']}>
            <StudentProgress />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/daily"
        element={
          <ProtectedRoute allowedRoles={['Student']}>
            <DailyChallenge />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/weekend"
        element={
          <ProtectedRoute allowedRoles={['Student']}>
            <WeekendWeak />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/weekend/take"
        element={
          <ProtectedRoute allowedRoles={['Student']}>
            <WeekendTake />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/weekend/result/:week"
        element={
          <ProtectedRoute allowedRoles={['Student']}>
            <WeekendResult />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/day6"
        element={
          <ProtectedRoute allowedRoles={['Student']}>
            <Day6Review />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/day6/take"
        element={
          <ProtectedRoute allowedRoles={['Student']}>
            <Day6Take />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/day6/result/:cycleKey"
        element={
          <ProtectedRoute allowedRoles={['Student']}>
            <Day6Result />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/saved"
        element={<Navigate to="/student/public?saved=1" replace />}
      />
      <Route
        path="/student/republic"
        element={
          <ProtectedRoute allowedRoles={['Student']}>
            <RepublicExam />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/republic/take"
        element={
          <ProtectedRoute allowedRoles={['Student']}>
            <RepublicTake />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/republic/result/:month"
        element={
          <ProtectedRoute allowedRoles={['Student']}>
            <RepublicResult />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/subscriptions"
        element={
          <ProtectedRoute allowedRoles={['Student']}>
            <StudentSubscriptions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/subscriptions/:groupKey"
        element={
          <ProtectedRoute allowedRoles={['Student']}>
            <StudentSubscriptions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/public"
        element={
          <ProtectedRoute allowedRoles={['Student']}>
            <PublicExamZone embedded />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/teachers"
        element={
          <ProtectedRoute allowedRoles={['Student']}>
            <BrowseTeachers embedded />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/teachers/:id"
        element={
          <ProtectedRoute allowedRoles={['Student']}>
            <BrowseTeachers embedded />
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
        path="/student/dim/:examId"
        element={
          <ProtectedRoute allowedRoles={['Student']}>
            <TakePipelineExam />
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

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}

export default App;
