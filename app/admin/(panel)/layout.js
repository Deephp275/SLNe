import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import { isLocalMode, COOKIE } from '@/lib/local/auth';
import { verifySession } from '@/lib/local/security';

export const metadata = { title: 'Admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }) {
  // Real session check on the server (the cookie alone is not enough)
  if (isLocalMode() && !verifySession((await cookies()).get(COOKIE)?.value)) redirect('/admin/login');
  return <AdminShell>{children}</AdminShell>;
}
