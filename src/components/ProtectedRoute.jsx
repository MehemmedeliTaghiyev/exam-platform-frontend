import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Skeleton } from './ui';
import { normalizeRole } from '../lib/utils';

function homeForRole(role) {
  if (role === 'Admin') return '/admin';
  if (role === 'Teacher') return '/teacher';
  if (role === 'Student') return '/student';
  return '/login';
}

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface p-8 dark:bg-[#0b1220]">
        <div className="mx-auto max-w-4xl space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  const role = normalizeRole(user.role);
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={homeForRole(role)} replace />;
  }
  return children;
}
