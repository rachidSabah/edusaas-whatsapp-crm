'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  FileText, 
  Download, 
  Users, 
  GraduationCap,
  CheckCircle,
  XCircle,
  Clock,
  FileSpreadsheet,
  Loader2,
  AlertCircle,
  FileDown,
} from 'lucide-react';

interface Student {
  id: string;
  fullName: string;
  groupName: string | null;
}

interface Group {
  id: string;
  name: string;
  currentYear: number;
}

interface StudentReport {
  student: {
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    groupName: string | null;
    currentYear: number;
    avertissements: number;
    miseAPied: number;
  };
  month: string | null;
  attendance: Array<{
    id: string;
    date: string;
    status: string;
    notes: string | null;
    session: string | null;
  }>;
  summary: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    total: number;
  };
}

interface GroupReport {
  group: {
    id: string;
    name: string;
    currentYear: number;
  };
  month: string | null;
  dates: string[];
  attendanceMatrix: Array<{
    studentId: string;
    studentName: string;
    currentYear: number;
    avertissements: number;
    miseAPied: number;
    attendance: Record<string, string>;
    summary: {
      present: number;
      absent: number;
      late: number;
      excused: number;
    };
  }>;
  groupSummary: {
    totalStudents: number;
    totalDays: number;
    averageAttendance: number;
  };
}

export default function ReportsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  // Student report state
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedStudentMonth, setSelectedStudentMonth] = useState<string>('');
  const [studentReport, setStudentReport] = useState<StudentReport | null>(null);
  const [studentReportLoading, setStudentReportLoading] = useState(false);

  // Group report state
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedGroupMonth, setSelectedGroupMonth] = useState<string>('');
  const [groupReport, setGroupReport] = useState<GroupReport | null>(null);
  const [groupReportLoading, setGroupReportLoading] = useState(false);

  // Generate month options for the last 12 months
  const monthOptions = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    monthOptions.push({ value, label });
  }

  const fetchData = async () => {
    try {
      const [studentsRes, groupsRes] = await Promise.all([
        fetch('/api/students?status=ACTIVE'),
        fetch('/api/groups'),
      ]);

      if (studentsRes.ok) {
        const data = await studentsRes.json();
        setStudents(data.students || []);
      }
      if (groupsRes.ok) {
        const data = await groupsRes.json();
        setGroups(data.groups || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchStudentReport = async () => {
    if (!selectedStudentId) return;
    setStudentReportLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('studentId', selectedStudentId);
      if (selectedStudentMonth && selectedStudentMonth !== 'all') params.append('month', selectedStudentMonth);

      const response = await fetch(`/api/reports/attendance/student?${params}`);
      const data = await response.json();
      setStudentReport(data.report);
    } catch (error) {
      console.error('Error fetching student report:', error);
    } finally {
      setStudentReportLoading(false);
    }
  };

  const fetchGroupReport = async () => {
    if (!selectedGroupId) return;
    setGroupReportLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('groupId', selectedGroupId);
      if (selectedGroupMonth && selectedGroupMonth !== 'all') params.append('month', selectedGroupMonth);

      const response = await fetch(`/api/reports/attendance/group?${params}`);
      const data = await response.json();
      setGroupReport(data.report);
    } catch (error) {
      console.error('Error fetching group report:', error);
    } finally {
      setGroupReportLoading(false);
    }
  };

  // Export Student Report
  const handleExportStudentDocx = () => {
    if (!selectedStudentId) return;
    const params = new URLSearchParams();
    params.append('studentId', selectedStudentId);
    params.append('format', 'docx');
    if (selectedStudentMonth && selectedStudentMonth !== 'all') params.append('month', selectedStudentMonth);
    window.open(`/api/reports/attendance/student/export?${params}`, '_blank');
  };

  const handleExportStudentExcel = () => {
    if (!selectedStudentId) return;
    const params = new URLSearchParams();
    params.append('studentId', selectedStudentId);
    params.append('format', 'xlsx');
    if (selectedStudentMonth && selectedStudentMonth !== 'all') params.append('month', selectedStudentMonth);
    window.open(`/api/reports/attendance/student/export?${params}`, '_blank');
  };

  // Export Group Report
  const handleExportGroupDocx = () => {
    if (!selectedGroupId) return;
    const params = new URLSearchParams();
    params.append('groupId', selectedGroupId);
    params.append('format', 'docx');
    if (selectedGroupMonth && selectedGroupMonth !== 'all') params.append('month', selectedGroupMonth);
    window.open(`/api/reports/attendance/group/export?${params}`, '_blank');
  };

  const handleExportGroupExcel = () => {
    if (!selectedGroupId) return;
    const params = new URLSearchParams();
    params.append('groupId', selectedGroupId);
    params.append('format', 'xlsx');
    if (selectedGroupMonth && selectedGroupMonth !== 'all') params.append('month', selectedGroupMonth);
    window.open(`/api/reports/attendance/group/export?${params}`, '_blank');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return (
          <Badge className="bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3 mr-1" />
            Présent
          </Badge>
        );
      case 'ABSENT':
        return (
          <Badge className="bg-red-100 text-red-700">
            <XCircle className="w-3 h-3 mr-1" />
            Absent
          </Badge>
        );
      case 'LATE':
        return (
          <Badge className="bg-yellow-100 text-yellow-700">
            <Clock className="w-3 h-3 mr-1" />
            Retard
          </Badge>
        );
      case 'EXCUSED':
        return (
          <Badge className="bg-blue-100 text-blue-700">
            <AlertCircle className="w-3 h-3 mr-1" />
            Excusé
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Rapports</h1>
        <p className="text-slate-600">Générez des rapports de présence pour les étudiants et groupes</p>
      </div>

      {/* Student Attendance Report */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>Rapport de présence étudiant</CardTitle>
                <CardDescription>Générez un rapport individuel pour un étudiant</CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleExportStudentDocx}
                disabled={!studentReport}
                title="Export DOCX - Format A4 Portrait"
              >
                <FileDown className="w-4 h-4 mr-2" />
                DOCX
              </Button>
              <Button 
                variant="outline" 
                onClick={handleExportStudentExcel}
                disabled={!studentReport}
                title="Export Excel - Format Paysage"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <Label>Étudiant</Label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Sélectionner un étudiant" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.fullName} {s.groupName && `(${s.groupName})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mois</Label>
              <Select value={selectedStudentMonth || undefined} onValueChange={setSelectedStudentMonth}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Tous les mois" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les mois</SelectItem>
                  {monthOptions.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="opacity-0">Action</Label>
              <Button
                onClick={fetchStudentReport}
                disabled={!selectedStudentId || studentReportLoading}
                className="bg-gradient-to-r from-green-500 to-emerald-600"
              >
                {studentReportLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Chargement...
                  </>
                ) : (
                  'Générer'
                )}
              </Button>
            </div>
          </div>

          {studentReport && (
            <div className="space-y-4 mt-6">
              {/* Student Info */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-lg font-bold text-blue-600">
                    {studentReport.student.fullName?.charAt(0) || '?'}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{studentReport.student.fullName}</h3>
                  <p className="text-sm text-slate-500">
                    {studentReport.student.groupName || 'Aucun groupe'}
                    {studentReport.student.currentYear && ` • ${studentReport.student.currentYear === 1 ? '1ère Année' : '2ème Année'}`}
                    {studentReport.student.email && ` • ${studentReport.student.email}`}
                  </p>
                </div>
                {studentReport.student.avertissements > 0 && (
                  <Badge className="bg-orange-100 text-orange-700">
                    {studentReport.student.avertissements} avertissement(s)
                  </Badge>
                )}
              </div>

              {/* Summary */}
              <div className="grid grid-cols-5 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-700">{studentReport.summary.present}</p>
                  <p className="text-xs text-green-600">Présents</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-700">{studentReport.summary.absent}</p>
                  <p className="text-xs text-red-600">Absents</p>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-700">{studentReport.summary.late}</p>
                  <p className="text-xs text-yellow-600">Retards</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-700">{studentReport.summary.excused}</p>
                  <p className="text-xs text-blue-600">Excusé</p>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <p className="text-2xl font-bold text-slate-700">
                    {studentReport.summary.total > 0 
                      ? Math.round((studentReport.summary.present / studentReport.summary.total) * 100)
                      : 0}%
                  </p>
                  <p className="text-xs text-slate-600">Taux présence</p>
                </div>
              </div>

              {/* Attendance Table */}
              {studentReport.attendance.length > 0 && (
                <div className="max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Séance</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentReport.attendance.map((att) => (
                        <TableRow key={att.id}>
                          <TableCell>{formatDate(att.date)}</TableCell>
                          <TableCell>{getStatusBadge(att.status)}</TableCell>
                          <TableCell>{att.session || '-'}</TableCell>
                          <TableCell>{att.notes || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Group Attendance Report */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <CardTitle>Rapport de présence groupe</CardTitle>
                <CardDescription>Générez un rapport collectif pour un groupe</CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleExportGroupDocx}
                disabled={!groupReport}
                title="Export DOCX - Format A4 Portrait"
              >
                <FileDown className="w-4 h-4 mr-2" />
                DOCX
              </Button>
              <Button 
                variant="outline" 
                onClick={handleExportGroupExcel}
                disabled={!groupReport}
                title="Export Excel - Format Paysage"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <Label>Groupe</Label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Sélectionner un groupe" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name} {g.currentYear && `(${g.currentYear === 1 ? '1ère Année' : '2ème Année'})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mois</Label>
              <Select value={selectedGroupMonth || undefined} onValueChange={setSelectedGroupMonth}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Tous les mois" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les mois</SelectItem>
                  {monthOptions.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="opacity-0">Action</Label>
              <Button
                onClick={fetchGroupReport}
                disabled={!selectedGroupId || groupReportLoading}
                className="bg-gradient-to-r from-green-500 to-emerald-600"
              >
                {groupReportLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Chargement...
                  </>
                ) : (
                  'Générer'
                )}
              </Button>
            </div>
          </div>

          {groupReport && (
            <div className="space-y-4 mt-6">
              {/* Group Summary */}
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-700">{groupReport.groupSummary.totalStudents}</p>
                  <p className="text-xs text-purple-600">Étudiants</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-700">{groupReport.groupSummary.totalDays}</p>
                  <p className="text-xs text-blue-600">Jours</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg col-span-2">
                  <p className="text-2xl font-bold text-green-700">{groupReport.groupSummary.averageAttendance}%</p>
                  <p className="text-xs text-green-600">Présence moyenne</p>
                </div>
              </div>

              {/* Attendance Matrix */}
              {groupReport.attendanceMatrix.length > 0 && (
                <div className="max-h-80 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-white">Étudiant</TableHead>
                        <TableHead className="text-center">Année</TableHead>
                        <TableHead className="text-center">Présent</TableHead>
                        <TableHead className="text-center">Absent</TableHead>
                        <TableHead className="text-center">Retard</TableHead>
                        <TableHead className="text-center">Taux</TableHead>
                        <TableHead className="text-center">Avert.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupReport.attendanceMatrix.map((row) => {
                        const total = row.summary.present + row.summary.absent + row.summary.late + row.summary.excused;
                        const rate = total > 0 ? Math.round((row.summary.present / total) * 100) : 0;
                        
                        return (
                          <TableRow key={row.studentId}>
                            <TableCell className="font-medium sticky left-0 bg-white">
                              {row.studentName}
                            </TableCell>
                            <TableCell className="text-center text-sm">
                              {row.currentYear === 1 ? '1ère' : '2ème'}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-green-600 font-medium">{row.summary.present}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-red-600 font-medium">{row.summary.absent}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-yellow-600 font-medium">{row.summary.late}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge 
                                className={rate >= 80 ? 'bg-green-100 text-green-700' : 
                                           rate >= 50 ? 'bg-yellow-100 text-yellow-700' : 
                                           'bg-red-100 text-red-700'}
                              >
                                {rate}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {row.avertissements > 0 && (
                                <span className="text-orange-600 font-medium">{row.avertissements}</span>
                              )}
                              {row.miseAPied > 0 && (
                                <Badge className="bg-red-100 text-red-700 ml-1">MP</Badge>
                              )}
                              {row.avertissements === 0 && row.miseAPied === 0 && '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-0 shadow-md bg-slate-50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-slate-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-slate-900">À propos des rapports</h4>
              <p className="text-sm text-slate-600 mt-1">
                Les rapports de présence vous permettent de suivre la participation des étudiants.
                Exportez les données au format DOCX (A4 portrait) ou Excel (paysage) pour une analyse plus approfondie.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
