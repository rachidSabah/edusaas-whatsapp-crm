'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertCircle,
  Download,
  ArrowLeft,
  Calendar,
  Clock,
  User,
  FileText,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';

interface StudentLog {
  id: string;
  type: string;
  date: string;
  time: string;
  description: string;
  severity: string;
  createdAt: string;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  group: string;
}

export default function StudentProfilePage() {
  const searchParams = useSearchParams();
  const studentId = searchParams.get('id');

  const [student, setStudent] = useState<Student | null>(null);
  const [logs, setLogs] = useState<StudentLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    fetchStudentData();
  }, [studentId]);

  const fetchStudentData = async () => {
    try {
      // Fetch student details
      const studentRes = await fetch(`/api/students?id=${studentId}`);
      const studentData = await studentRes.json();
      setStudent(studentData.student);

      // Fetch student logs
      const logsRes = await fetch(`/api/student-logs?studentId=${studentId}`);
      const logsData = await logsRes.json();
      setLogs(logsData.logs || []);
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async () => {
    try {
      const response = await fetch('/api/student-logs/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          studentName: student ? `${student.firstName} ${student.lastName}` : 'Student',
          logs,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rapport_${student?.firstName}_${student?.lastName}.docx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Erreur lors du téléchargement du rapport');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'avertissement':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'incident':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'mise_a_pied':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'termination':
        return <XCircle className="w-4 h-4 text-red-700" />;
      default:
        return <FileText className="w-4 h-4 text-slate-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      avertissement: 'Avertissement',
      incident: 'Incident',
      mise_a_pied: 'Mise à pied',
      termination: 'Exclusion',
      autre: 'Autre',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="pt-6 text-center">
            <p className="text-slate-600 mb-4">Étudiant non trouvé</p>
            <Link href="/dashboard/attendance">
              <Button variant="outline">Retour</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/attendance">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {student.firstName} {student.lastName}
            </h1>
            <p className="text-slate-600">{student.group}</p>
          </div>
        </div>
        <Button onClick={downloadReport} className="gap-2">
          <Download className="w-4 h-4" />
          Télécharger le rapport
        </Button>
      </div>

      {/* Student Info */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Informations personnelles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-600">Email</p>
              <p className="font-medium">{student.email}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Téléphone</p>
              <p className="font-medium">{student.phone || 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="logs" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="logs">Livret de bord ({logs.length})</TabsTrigger>
          <TabsTrigger value="summary">Résumé</TabsTrigger>
        </TabsList>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          {logs.length === 0 ? (
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6 text-center text-slate-500">
                Aucun incident enregistré
              </CardContent>
            </Card>
          ) : (
            logs.map((log) => (
              <Card key={log.id} className="border-0 shadow-md">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="mt-1">{getTypeIcon(log.type)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{getTypeLabel(log.type)}</h3>
                          <Badge
                            variant={
                              log.severity === 'critique'
                                ? 'destructive'
                                : log.severity === 'important'
                                  ? 'secondary'
                                  : 'outline'
                            }
                          >
                            {log.severity}
                          </Badge>
                        </div>
                        <p className="text-slate-700 mb-3">{log.description}</p>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(log.date).toLocaleDateString('fr-FR')}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {log.time}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600">
                    {logs.filter((l) => l.type === 'avertissement').length}
                  </div>
                  <p className="text-sm text-slate-600 mt-2">Avertissements</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">
                    {logs.filter((l) => l.type === 'incident').length}
                  </div>
                  <p className="text-sm text-slate-600 mt-2">Incidents</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">
                    {logs.filter((l) => l.type === 'mise_a_pied').length}
                  </div>
                  <p className="text-sm text-slate-600 mt-2">Mises à pied</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-700">
                    {logs.filter((l) => l.type === 'termination').length}
                  </div>
                  <p className="text-sm text-slate-600 mt-2">Exclusions</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
