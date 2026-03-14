export const runtime = 'edge';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-edge';
import { Sidebar } from '@/components/layout/sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    console.error('Dashboard auth error:', error);
    redirect('/login');
  }

  if (!user) {
    redirect('/login');
  }

  // Fetch user with organization
  const userData = {
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    organization: user.organizationId ? { name: 'Mon Organisation' } : null,
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar user={userData} />
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
