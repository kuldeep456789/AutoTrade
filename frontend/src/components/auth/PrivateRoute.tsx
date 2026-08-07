import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';

interface Props {
  children: React.ReactNode;
}

const PrivateRoute = ({ children }: Props) => {
  const userInfo = useSelector((state: RootState) => state.auth.userInfo);
  const location = useLocation();

  const token = userInfo?.accessToken || (userInfo as any)?.token || localStorage.getItem('token') || localStorage.getItem('accessToken');

  if (!userInfo || !token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
