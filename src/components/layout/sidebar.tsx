'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  GraduationCap,
  Calendar,
  FileText,
  BookOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  Building2,
  Layers,
  BarChart3,
  School,
  Presentation,
  MapPin,
  CalendarDays,
  Smartphone,
  Archive,
  FileBarChart,
  HardDrive,
  Bot,
  ClipboardList,
  Shield,
  UserCircle,
  Send,
  Mail,
  ClipboardCheck,
  Brain,
  Webhook,
  Phone,
} from 'lucide-react';

const menuItems = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/dashboard/conversations', label: 'Conversations', icon: MessageSquare },
  { href: '/dashboard/contacts', label: 'Contacts', icon: Users },
  { href: '/dashboard/students', label: 'Étudiants', icon: GraduationCap },
  { href: '/dashboard/groups', label: 'Groupes', icon: Layers },
  { href: '/dashboard/group-calendar', label: 'Calendrier Groupe', icon: CalendarDays },
  { href: '/dashboard/courses', label: 'Cours', icon: BookOpen },
  { href: '/dashboard/teachers', label: 'Enseignants', icon: School },
  { href: '/dashboard/classrooms', label: 'Salles', icon: MapPin },
  { href: '/dashboard/calendar', label: 'Calendrier', icon: Calendar },
  { href: '/dashboard/attendance', label: 'Présences', icon: CalendarDays },
  { href: '/dashboard/academic-years', label: 'Années académiques', icon: Presentation },
  { href: '/dashboard/templates', label: 'Templates', icon: FileText },
  { href: '/dashboard/messaging', label: 'Envoi Messages', icon: Send },
  { href: '/dashboard/knowledge-base', label: 'Base de connaissances', icon: BookOpen },
  { href: '/dashboard/whatsapp', label: 'WhatsApp', icon: Smartphone },
  { href: '/dashboard/whatsapp/multi-numbers', label: 'Multi-Numéros', icon: Phone },
  { href: '/dashboard/whatsapp/meta-business', label: 'Envoyer via Meta', icon: Send },
  { href: '/dashboard/whatsapp/knowledge-base', label: 'Base de Connaissance', icon: BookOpen },
  { href: '/dashboard/whatsapp/ai-automation', label: 'IA & Automatisation', icon: Brain },
  { href: '/dashboard/whatsapp/webhook-config', label: 'Config Webhook', icon: Webhook },
  { href: '/dashboard/ai-settings', label: 'Configuration IA', icon: Bot },
  { href: '/dashboard/reports', label: 'Rapports', icon: FileBarChart },
  { href: '/dashboard/backup', label: 'Sauvegarde', icon: HardDrive },
  { href: '/dashboard/archive', label: 'Archives', icon: Archive },
  { href: '/dashboard/analytics', label: 'Analytiques', icon: BarChart3 },
];

// Role-specific menu items
const adminMenuItems = [
  { href: '/dashboard/admin', label: 'Administration', icon: Shield, roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'SCHOOL_MANAGER'] },
  { href: '/dashboard/assignments', label: 'Tâches & Assignations', icon: ClipboardCheck, roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'SCHOOL_MANAGER'] },
];

const userMenuItems = [
  { href: '/dashboard/tasks', label: 'Mes Tâches', icon: ClipboardList },
  { href: '/dashboard/chat', label: 'Chat', icon: MessageSquare },
  { href: '/dashboard/email', label: 'Email', icon: Mail },
  { href: '/dashboard/profile', label: 'Mon Profil', icon: UserCircle },
  { href: '/dashboard/settings', label: 'Paramètres', icon: Settings },
];

interface SidebarProps {
  user: {
    name: string;
    email: string;
    role: string;
    avatar?: string | null;
    organization?: {
      name: string;
    } | null;
  };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }, []);

  return (
    <div
      className={cn(
        'flex flex-col h-screen bg-slate-900 text-white transition-all duration-300',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg">EduSaaS</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-slate-400 hover:text-white hover:bg-slate-800"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </Button>
      </div>

      {/* Organization */}
      {!collapsed && user.organization && (
        <div className="px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Building2 className="w-4 h-4" />
            <span className="truncate">{user.organization.name}</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4" aria-label="Main navigation">
        <ul className="space-y-1 px-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const isWhatsAppSub = item.href.includes('/dashboard/whatsapp/') && item.href !== '/dashboard/whatsapp';
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                    isWhatsAppSub && 'pl-8 text-sm',
                    isActive
                      ? 'bg-green-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  )}
                  title={collapsed ? item.label : undefined}
                  aria-label={collapsed ? item.label : undefined}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
          
          {/* Admin Section */}
          {adminMenuItems.filter(item => item.roles.includes(user.role)).length > 0 && (
            <>
              {!collapsed && <li className="pt-4 pb-2 px-3 text-xs font-semibold text-slate-500 uppercase" aria-hidden="true">Administration</li>}
              {adminMenuItems.filter(item => item.roles.includes(user.role)).map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                        isActive
                          ? 'bg-purple-600 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      )}
                      title={collapsed ? item.label : undefined}
                      aria-label={collapsed ? item.label : undefined}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </>
          )}
          
          {/* User Section */}
          {!collapsed && <li className="pt-4 pb-2 px-3 text-xs font-semibold text-slate-500 uppercase" aria-hidden="true">Mon Espace</li>}
          {userMenuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                    isActive
                      ? 'bg-green-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  )}
                  title={collapsed ? item.label : undefined}
                  aria-label={collapsed ? item.label : undefined}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Menu */}
      <div className="p-4 border-t border-slate-800">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                'w-full justify-start gap-3 text-slate-300 hover:text-white hover:bg-slate-800',
                collapsed && 'justify-center px-0'
              )}
              aria-label="User menu"
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src={user.avatar || undefined} />
                <AvatarFallback className="bg-green-600">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/profile" className="cursor-pointer">
                <User className="w-4 h-4 mr-2" />
                Profil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="w-4 h-4 mr-2" />
              Paramètres
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleLogout} className="text-red-500 cursor-pointer">
              <LogOut className="w-4 h-4 mr-2" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
