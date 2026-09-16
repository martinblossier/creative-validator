import { isAdminAuthenticated } from '@/lib/admin-auth';
import { AdminLogin } from '@/components/admin/AdminLogin';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

export default function AdminPage() {
  const authenticated = isAdminAuthenticated();

  return authenticated ? <AdminDashboard /> : <AdminLogin />;
}
