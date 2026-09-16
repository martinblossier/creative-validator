import { isCreativeAuthenticated } from '@/lib/creative-auth';
import { CreativeLogin } from '@/components/creative/CreativeLogin';
import { CreativeDashboard } from '@/components/creative/CreativeDashboard';

export default function CreativePage() {
  const authenticated = isCreativeAuthenticated();

  return authenticated ? <CreativeDashboard /> : <CreativeLogin />;
}
