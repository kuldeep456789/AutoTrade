import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import type { RootState } from '../../store/store';

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const userInfo = useSelector((state: RootState) => state.auth.userInfo);

  if (!userInfo || userInfo.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
