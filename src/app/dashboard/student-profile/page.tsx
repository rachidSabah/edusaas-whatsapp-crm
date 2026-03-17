'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
  BookOpen,
  Plus,
  Loader2,
  Eye,
} from 'lucide-react';
import Link from 'next/link';
import { LogbookModal } from '@/components/LogbookModal';

interface StudentLog {
  id: string;
  type: string;
  date: string;
  time: string;
  description: string;
  severity: string;
  createdAt: string;
  createdBy?: string;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  group: string;
  program: string;
  status: string;
  enrollmentDate: string;
  parent1Name?: string;
  parent1Phone?: string;
  parent2Name?: string;
  parent2Phone?: string;
}

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  remarks?: string;
}

// Loading fallback component
function ProfileLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-slate-600">Chargement du profil...</p>
      </div>
    </div>
  );
}

// Main content component that uses useSearchParams
function StudentProfileContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const studentId = searchParams.get('id');

  const [student, setStudent] = useState<Student | null>(null);
  const [logs, setLogs] = useState<StudentLog[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [logbookOpen, setLogbookOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      return;
    }
    fetchStudentData();
  }, [studentId]);

  const fetchStudentData = async () => {
    try {
      setLoading(true);

      // Fetch student details
      const studentRes = await fetch(`/api/students?id=${studentId}`);
      const studentData = await studentRes.json();
      setStudent(studentData.student);

      // Fetch student logs
      const logsRes = await fetch(`/api/student-logs?studentId=${studentId}`);
      const logsData = await logsRes.json();
      setLogs(logsData.logs || []);

      // Fetch attendance records
      const attendanceRes = await fetch(`/api/attendance?studentId=${studentId}`);
      if (attendanceRes.ok) {
        const attendanceData = await attendanceRes.json();
        setAttendance(attendanceData.records || []);
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async () => {
    try {
      setDownloading(true);
      const response = await fetch('/api/student-logs/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `livret_${student?.firstName}_${student?.lastName}_${new Date().toISOString().split('T')[0]}.docx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Erreur lors du téléchargement du rapport');
    } finally {
      setDownloading(false);
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critique':
        return 'destructive';
      case 'important':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getAttendanceStats = () => {
    const total = attendance.length;
    const present = attendance.filter(a => a.status === 'PRESENT').length;
    const absent = attendance.filter(a => a.status === 'ABSENT').length;
    const late = attendance.filter(a => a.status === 'LATE').length;

    return { total, present, absent, late };
  };

  const incidentCounts = {
    avertissement: logs.filter(l => l.type === 'avertissement').length,
    incident: logs.filter(l => l.type === 'incident').length,
    mise_a_pied: logs.filter(l => l.type === 'mise_a_pied').length,
    termination: logs.filter(l => l.type === 'termination').length,
  };

  if (loading) {
    return <ProfileLoading />;
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="pt-6 text-center">
            <p className="text-slate-600 mb-4">Étudiant non trouvé</p>
            <Link href="/dashboard/students">
              <Button variant="outline">Retour</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const attendanceStats = getAttendanceStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/students">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {student.firstName} {student.lastName}
            </h1>
            <p className="text-slate-600">{student.group} • {student.program}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setLogbookOpen(true)}
            variant="outline"
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Ajouter un incident
          </Button>
          <Button
            onClick={downloadReport}
            disabled={downloading}
            className="gap-2 bg-gradient-to-r from-blue-500 to-blue-600"
          >
            {downloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {downloading ? 'Téléchargement...' : 'Télécharger'}
          </Button>
        </div>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-slate-600">Email</p>
              <p className="font-medium break-all">{student.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Téléphone</p>
              <p className="font-medium">{student.phone || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Statut</p>
              <Badge variant="outline">{student.status}</Badge>
            </div>
            <div>
              <p className="text-sm text-slate-600">Date d'inscription</p>
              <p className="font-medium">
                {new Date(student.enrollmentDate).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>

          {/* Parents Information */}
          {(student.parent1Name || student.parent2Name) && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-semibold text-slate-900 mb-4">Informations des parents</h3>
              <div className="grid grid-cols-2 gap-4">
                {student.parent1Name && (
                  <div>
                    <p className="text-sm text-slate-600">Parent 1</p>
                    <p className="font-medium">{student.parent1Name}</p>
                    {student.parent1Phone && (
                      <p className="text-sm text-slate-500">{student.parent1Phone}</p>
                    )}
                  </div>
                )}
                {student.parent2Name && (
                  <div>
                    <p className="text-sm text-slate-600">Parent 2</p>
                    <p className="font-medium">{student.parent2Name}</p>
                    {student.parent2Phone && (
                      <p className="text-sm text-slate-500">{student.parent2Phone}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="logbook" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="logbook" className="gap-2">
            <BookOpen className="w-4 h-4" />
            Livret de bord ({logs.length})
          </TabsTrigger>
          <TabsTrigger value="attendance">Présence ({attendance.length})</TabsTrigger>
          <TabsTrigger value="summary">Résumé</TabsTrigger>
        </TabsList>

        {/* Logbook Tab */}
        <TabsContent value="logbook" className="space-y-4">
          {logs.length === 0 ? (
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6 text-center text-slate-500">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucun incident enregistré</p>
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
                          <Badge variant={getSeverityColor(log.severity)}>
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
                          {log.createdBy && (
                            <div className="text-xs text-slate-500">
                              Par: {log.createdBy}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-4">
          {attendance.length === 0 ? (
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6 text-center text-slate-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucun enregistrement de présence</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Attendance Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-0 shadow-md">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {attendanceStats.total}
                      </div>
                      <p className="text-sm text-slate-600 mt-2">Total</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-md">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">
                        {attendanceStats.present}
                      </div>
                      <p className="text-sm text-slate-600 mt-2">Présent</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-md">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-600">
                        {attendanceStats.absent}
                      </div>
                      <p className="text-sm text-slate-600 mt-2">Absent</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-md">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-yellow-600">
                        {attendanceStats.late}
                      </div>
                      <p className="text-sm text-slate-600 mt-2">En retard</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Attendance List */}
              <Card className="border-0 shadow-md">
                <CardContent className="pt-6">
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {attendance.map((record) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">
                            {new Date(record.date).toLocaleDateString('fr-FR')}
                          </p>
                          {record.remarks && (
                            <p className="text-sm text-slate-600">{record.remarks}</p>
                          )}
                        </div>
                        <Badge
                          variant={
                            record.status === 'PRESENT'
                              ? 'default'
                              : record.status === 'ABSENT'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {record.status === 'PRESENT'
                            ? 'Présent'
                            : record.status === 'ABSENT'
                              ? 'Absent'
                              : 'En retard'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600">
                    {incidentCounts.avertissement}
                  </div>
                  <p className="text-sm text-slate-600 mt-2">Avertissements</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">
                    {incidentCounts.incident}
                  </div>
                  <p className="text-sm text-slate-600 mt-2">Incidents</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">
                    {incidentCounts.mise_a_pied}
                  </div>
                  <p className="text-sm text-slate-600 mt-2">Mises à pied</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-700">
                    {incidentCounts.termination}
                  </div>
                  <p className="text-sm text-slate-600 mt-2">Exclusions</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Logbook Modal */}
      <LogbookModal
        open={logbookOpen}
        onOpenChange={setLogbookOpen}
        studentId={studentId || ''}
        studentName={`${student.firstName} ${student.lastName}`}
        onSuccess={() => {
          fetchStudentData();
        }}
      />
    </div>
  );
}

// Default export with Suspense wrapper
export default function StudentProfilePage() {
  return (
    <Suspense fallback={<ProfileLoading />}>
      <StudentProfileContent />
    </Suspense>
  );
}
