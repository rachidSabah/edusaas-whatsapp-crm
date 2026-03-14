'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  MessageSquare,
  Users,
  GraduationCap,
  Calendar,
  TrendingUp,
  Bot,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  BookOpen,
  Building2,
  Loader2,
} from 'lucide-react';

interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  totalContacts: number;
  totalConversations: number;
  activeConversations: number;
  todayAttendance: {
    present: number;
    absent: number;
    late: number;
  };
  aiUsage: {
    used: number;
    limit: number;
  };
}

interface RecentConversation {
  id: string;
  contactName: string;
  lastMessage: string;
  status: string;
  createdAt: string;
}

interface SetupStatus {
  needsSetup: boolean;
  hasOrganization: boolean;
  hasOrganizations: boolean;
  userRole: string;
  organizationId: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentConversations, setRecentConversations] = useState<RecentConversation[]>([]);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupLoading, setSetupLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, conversationsRes, setupRes] = await Promise.all([
          fetch('/api/analytics'),
          fetch('/api/conversations?limit=5'),
          fetch('/api/setup'),
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData.analytics?.overview);
        }

        if (conversationsRes.ok) {
          const convData = await conversationsRes.json();
          setRecentConversations(convData.conversations || []);
        }

        if (setupRes.ok) {
          const setupData = await setupRes.json();
          setSetupStatus(setupData);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSetup = async () => {
    setSetupLoading(true);
    try {
      const res = await fetch('/api/setup', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSetupStatus({
          needsSetup: false,
          hasOrganization: true,
          hasOrganizations: true,
          userRole: 'SUPER_ADMIN',
          organizationId: data.organizationId,
        });
        // Refresh the page to load with new organization
        window.location.reload();
      } else {
        const error = await res.json();
        alert(`Setup failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Setup error:', error);
      alert('Setup failed. Please try again.');
    } finally {
      setSetupLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tableau de bord</h1>
          <p className="text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // Show setup wizard for SUPER_ADMIN without organization
  if (setupStatus?.needsSetup && setupStatus?.userRole === 'SUPER_ADMIN') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Bienvenue, Super Admin!</h1>
          <p className="text-slate-600">Configurons votre espace de travail</p>
        </div>

        <Card className="border-0 shadow-lg max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Configuration initiale requise</CardTitle>
            <CardDescription>
              En tant que Super Admin, vous devez créer une organisation pour commencer à utiliser le système.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertTitle>Action requise</AlertTitle>
              <AlertDescription>
                Cliquez sur le bouton ci-dessous pour créer automatiquement une organisation par défaut. 
                Vous pourrez la personnaliser ultérieurement dans les paramètres.
              </AlertDescription>
            </Alert>
            
            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Ce qui sera créé:</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Organisation "EduSaaS Admin Organization"
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Plan Enterprise avec 1000 messages IA/jour
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Accès complet à toutes les fonctionnalités
                </li>
              </ul>
            </div>

            <Button 
              onClick={handleSetup} 
              disabled={setupLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              size="lg"
            >
              {setupLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Configuration en cours...
                </>
              ) : (
                <>
                  <Building2 className="w-4 h-4 mr-2" />
                  Créer mon organisation
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Conversations actives',
      value: stats?.activeConversations || 0,
      description: `${stats?.totalConversations || 0} au total`,
      icon: MessageSquare,
      color: 'text-green-600 bg-green-50',
      trend: '+12%',
    },
    {
      title: 'Étudiants',
      value: stats?.totalStudents || 0,
      description: `${stats?.activeStudents || 0} actifs`,
      icon: GraduationCap,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      title: 'Contacts CRM',
      value: stats?.totalContacts || 0,
      description: 'Prospects & parents',
      icon: Users,
      color: 'text-purple-600 bg-purple-50',
    },
    {
      title: 'Présence aujourd\'hui',
      value: stats?.todayAttendance.present || 0,
      description: `${stats?.todayAttendance.absent || 0} absents, ${stats?.todayAttendance.late || 0} retards`,
      icon: Calendar,
      color: 'text-orange-600 bg-orange-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Tableau de bord</h1>
        <p className="text-slate-600">Bienvenue sur votre espace de gestion</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <Card key={i} className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                {stat.title}
              </CardTitle>
              <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
              <p className="text-xs text-slate-500 mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Conversations */}
        <Card className="lg:col-span-2 border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Conversations récentes</CardTitle>
              <CardDescription>Les derniers échanges WhatsApp</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              Voir tout
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentConversations.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Aucune conversation récente</p>
                </div>
              ) : (
                recentConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-green-700 font-medium">
                        {conversation.contactName?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900 truncate">
                          {conversation.contactName || 'Contact inconnu'}
                        </p>
                        {conversation.status === 'active' && (
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            Actif
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 truncate">
                        {conversation.lastMessage}
                      </p>
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(conversation.createdAt).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* AI Usage & Quick Actions */}
        <div className="space-y-6">
          {/* AI Usage */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-green-600" />
                Utilisation IA
              </CardTitle>
              <CardDescription>Messages générés aujourd'hui</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600">Utilisé</span>
                    <span className="font-medium">
                      {stats?.aiUsage.used || 0} / {stats?.aiUsage.limit || 500}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full"
                      style={{
                        width: `${Math.min(
                          ((stats?.aiUsage.used || 0) / (stats?.aiUsage.limit || 500)) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  {stats?.aiUsage.limit - (stats?.aiUsage.used || 0)} messages restants aujourd'hui
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Attendance Summary */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-orange-600" />
                Présences du jour
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-lg font-bold text-slate-900">
                    {stats?.todayAttendance.present || 0}
                  </p>
                  <p className="text-xs text-slate-500">Présents</p>
                </div>
                <div>
                  <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-red-100 flex items-center justify-center">
                    <XCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <p className="text-lg font-bold text-slate-900">
                    {stats?.todayAttendance.absent || 0}
                  </p>
                  <p className="text-xs text-slate-500">Absents</p>
                </div>
                <div>
                  <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-yellow-100 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                  <p className="text-lg font-bold text-slate-900">
                    {stats?.todayAttendance.late || 0}
                  </p>
                  <p className="text-xs text-slate-500">Retards</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Actions rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => router.push('/dashboard/students')}
              >
                <GraduationCap className="w-4 h-4 mr-2" />
                Ajouter un étudiant
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => router.push('/dashboard/attendance')}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Marquer les présences
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => router.push('/dashboard/knowledge-base')}
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Ajouter à la base de connaissances
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
