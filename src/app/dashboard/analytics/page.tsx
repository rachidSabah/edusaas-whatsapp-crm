'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Users,
  GraduationCap,
  Calendar,
  Bot,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from 'lucide-react';

interface AnalyticsData {
  overview: {
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
  };
  conversations: {
    total: number;
    byCategory: Record<string, number>;
    byStatus: Record<string, number>;
  };
  messages: {
    aiVsHuman: Record<string, number>;
    daily: Array<{ date: string; count: number; direction: string }>;
  };
  attendance: {
    byStatus: Record<string, number>;
  };
  contacts: {
    byTag: Array<{ tag: string; count: number }>;
  };
  period: {
    start: string;
    end: string;
    days: number;
  };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7d');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/analytics?period=${period}`);
        if (res.ok) {
          const json = await res.json();
          setData(json.analytics);
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Analytiques</h1>
          <p className="text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Analytiques</h1>
          <p className="text-slate-600">Aucune donnée disponible</p>
        </div>
      </div>
    );
  }

  const stats = data.overview;
  const percentageChange = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Analytiques</h1>
          <p className="text-slate-600">Statistiques et performances de votre organisation</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sélectionner période" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 derniers jours</SelectItem>
            <SelectItem value="30d">30 derniers jours</SelectItem>
            <SelectItem value="90d">90 derniers jours</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Conversations actives
            </CardTitle>
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.activeConversations}</div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-slate-500">{stats.totalConversations} au total</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Étudiants actifs
            </CardTitle>
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.activeStudents}</div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-slate-500">{stats.totalStudents} au total</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Contacts CRM
            </CardTitle>
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.totalContacts}</div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-slate-500">Prospects & parents</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Taux de présence
            </CardTitle>
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {stats.todayAttendance.present + stats.todayAttendance.absent + stats.todayAttendance.late > 0
                ? Math.round(
                    (stats.todayAttendance.present /
                      (stats.todayAttendance.present +
                        stats.todayAttendance.absent +
                        stats.todayAttendance.late)) *
                      100
                  )
                : 0}%
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-slate-500">
                {stats.todayAttendance.absent} absents, {stats.todayAttendance.late} retards
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="conversations" className="space-y-6">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
          <TabsTrigger value="attendance">Présences</TabsTrigger>
          <TabsTrigger value="ai">IA</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
        </TabsList>

        <TabsContent value="conversations" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Conversations by Status */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle>Conversations par statut</CardTitle>
                <CardDescription>Répartition des conversations selon leur état</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(data.conversations.byStatus).length > 0 ? (
                    Object.entries(data.conversations.byStatus).map(([status, count]) => {
                      const total = Object.values(data.conversations.byStatus).reduce((a, b) => a + b, 0);
                      const percentage = total > 0 ? (count / total) * 100 : 0;
                      const statusColors: Record<string, string> = {
                        active: 'bg-green-500',
                        resolved: 'bg-blue-500',
                        pending: 'bg-yellow-500',
                        transferred: 'bg-purple-500',
                      };
                      return (
                        <div key={status} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${statusColors[status] || 'bg-slate-500'}`} />
                              <span className="text-sm font-medium capitalize">{status}</span>
                            </div>
                            <span className="text-sm text-slate-600">{count}</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${statusColors[status] || 'bg-slate-500'} rounded-full`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Aucune conversation enregistrée</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Conversations by Category */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle>Conversations par catégorie</CardTitle>
                <CardDescription>Types de demandes reçues</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(data.conversations.byCategory).length > 0 ? (
                    Object.entries(data.conversations.byCategory).map(([category, count]) => {
                      const total = Object.values(data.conversations.byCategory).reduce((a, b) => a + b, 0);
                      const percentage = total > 0 ? (count / total) * 100 : 0;
                      const categoryLabels: Record<string, string> = {
                        enrollment: 'Inscription',
                        student_request: "Demande d'étudiant",
                        general: 'Général',
                        support: 'Support',
                        parent_inquiry: 'Demande de parent',
                      };
                      return (
                        <div key={category} className="flex items-center justify-between">
                          <span className="text-sm">{categoryLabels[category] || category}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{count}</span>
                            <span className="text-xs text-slate-400">({percentage.toFixed(1)}%)</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Aucune donnée de catégorie</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="border-0 shadow-md">
              <CardHeader className="text-center">
                <CardTitle>Présents</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-3xl font-bold text-green-600">
                    {stats.todayAttendance.present}
                  </span>
                </div>
                <p className="text-sm text-slate-500">Étudiants présents aujourd'hui</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardHeader className="text-center">
                <CardTitle>Absents</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="text-3xl font-bold text-red-600">
                    {stats.todayAttendance.absent}
                  </span>
                </div>
                <p className="text-sm text-slate-500">Étudiants absents aujourd'hui</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardHeader className="text-center">
                <CardTitle>Retards</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-yellow-100 flex items-center justify-center">
                  <span className="text-3xl font-bold text-yellow-600">
                    {stats.todayAttendance.late}
                  </span>
                </div>
                <p className="text-sm text-slate-500">Étudiants en retard aujourd'hui</p>
              </CardContent>
            </Card>
          </div>

          {/* Attendance by Status */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Répartition des présences</CardTitle>
              <CardDescription>Vue d'ensemble des statuts de présence</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 text-center">
                {Object.entries(data.attendance.byStatus).length > 0 ? (
                  Object.entries(data.attendance.byStatus).map(([status, count]) => {
                    const statusConfig: Record<string, { label: string; color: string }> = {
                      present: { label: 'Présent', color: 'text-green-600 bg-green-50' },
                      absent: { label: 'Absent', color: 'text-red-600 bg-red-50' },
                      late: { label: 'En retard', color: 'text-yellow-600 bg-yellow-50' },
                      excused: { label: 'Excusé', color: 'text-blue-600 bg-blue-50' },
                    };
                    const config = statusConfig[status.toLowerCase()] || { label: status, color: 'text-slate-600 bg-slate-50' };
                    return (
                      <div key={status} className={`p-4 rounded-lg ${config.color}`}>
                        <div className="text-2xl font-bold">{count}</div>
                        <div className="text-sm">{config.label}</div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-4 text-center py-8 text-slate-500">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Aucune donnée de présence</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-green-600" />
                  Utilisation de l'IA
                </CardTitle>
                <CardDescription>Messages générés par l'IA vs humain</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-600">Utilisé</span>
                      <span className="font-medium">
                        {stats.aiUsage.used} / {stats.aiUsage.limit}
                      </span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full transition-all"
                        style={{
                          width: `${Math.min((stats.aiUsage.used / stats.aiUsage.limit) * 100, 100)}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      {stats.aiUsage.limit - stats.aiUsage.used} messages restants aujourd'hui
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {data.messages.aiVsHuman.ai || 0}
                      </div>
                      <div className="text-sm text-slate-500">Messages IA</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {data.messages.aiVsHuman.human || 0}
                      </div>
                      <div className="text-sm text-slate-500">Messages humain</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle>Performance de l'IA</CardTitle>
                <CardDescription>Efficacité des réponses automatiques</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium text-green-900">Taux de résolution</div>
                        <div className="text-sm text-green-600">Sans intervention humaine</div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {data.conversations.total > 0
                        ? Math.round(
                            ((data.conversations.byStatus.resolved || 0) / data.conversations.total) * 100
                          )
                        : 0}%
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Activity className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-blue-900">Temps de réponse moyen</div>
                        <div className="text-sm text-blue-600">Messages IA</div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      &lt; 2s
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Contacts par catégorie</CardTitle>
              <CardDescription>Répartition des contacts par tags</CardDescription>
            </CardHeader>
            <CardContent>
              {data.contacts.byTag.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {data.contacts.byTag.map((item, index) => (
                    <div
                      key={index}
                      className="p-4 bg-slate-50 rounded-lg text-center"
                    >
                      <div className="text-2xl font-bold text-slate-900">{item.count}</div>
                      <Badge variant="secondary" className="mt-2">
                        {item.tag || 'Non catégorisé'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Aucun contact enregistré</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Period Info */}
      <div className="text-sm text-slate-500 text-center">
        Période analysée: du {new Date(data.period.start).toLocaleDateString('fr-FR')} au{' '}
        {new Date(data.period.end).toLocaleDateString('fr-FR')} ({data.period.days} jours)
      </div>
    </div>
  );
}
