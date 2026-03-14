'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Archive, 
  Search, 
  Eye, 
  GraduationCap,
  Mail,
  Phone,
  Users,
  Calendar,
  Trophy,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';

interface ArchivedStudent {
  id: string;
  originalStudentId: string;
  studentName: string;
  studentEmail: string | null;
  studentPhone: string | null;
  groupName: string | null;
  academicYears: string | null;
  coursesCompleted: string | null;
  attendanceSummary: string | null;
  graduationDate: string;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function ArchivePage() {
  const [archivedStudents, setArchivedStudents] = useState<ArchivedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [selectedStudent, setSelectedStudent] = useState<ArchivedStudent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchArchivedStudents = async (page: number = 1) => {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '20');
      if (search) params.append('search', search);

      const response = await fetch(`/api/archive?${params}`);
      const data = await response.json();
      setArchivedStudents(data.archivedStudents || []);
      setPagination(data.pagination || pagination);
    } catch (error) {
      console.error('Error fetching archived students:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchArchivedStudents(1);
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [search]);

  const handleViewDetails = (student: ArchivedStudent) => {
    setSelectedStudent(student);
    setDialogOpen(true);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const parseAttendanceSummary = (summary: string | null) => {
    if (!summary) return { present: 0, absent: 0, late: 0 };
    try {
      return JSON.parse(summary);
    } catch {
      return { present: 0, absent: 0, late: 0 };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Archives</h1>
        <p className="text-slate-600">Consultez les dossiers des étudiants diplômés</p>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-md">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Rechercher un étudiant diplômé..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Archive className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{pagination.total}</p>
                <p className="text-sm text-slate-500">Diplômés archivés</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {archivedStudents.filter(s => {
                    const att = parseAttendanceSummary(s.attendanceSummary);
                    return att.present > att.absent;
                  }).length}
                </p>
                <p className="text-sm text-slate-500">Excellente présence</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {new Set(archivedStudents.map(s => s.groupName).filter(Boolean)).size}
                </p>
                <p className="text-sm text-slate-500">Groupes représentés</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Archives Table */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Étudiant</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Groupe</TableHead>
                <TableHead>Date de diplômation</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2 text-slate-500">
                      <Archive className="w-5 h-5 animate-pulse" />
                      Chargement...
                    </div>
                  </TableCell>
                </TableRow>
              ) : archivedStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="text-slate-500">
                      <Archive className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Aucun étudiant archivé trouvé</p>
                      {search && (
                        <p className="text-sm mt-1">Essayez une autre recherche</p>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                archivedStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <Trophy className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium">{student.studentName}</p>
                          {student.coursesCompleted && (
                            <p className="text-xs text-slate-500">{student.coursesCompleted}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        {student.studentEmail && (
                          <div className="flex items-center gap-1 text-slate-600">
                            <Mail className="w-3 h-3" />
                            {student.studentEmail}
                          </div>
                        )}
                        {student.studentPhone && (
                          <div className="flex items-center gap-1 text-slate-600">
                            <Phone className="w-3 h-3" />
                            {student.studentPhone}
                          </div>
                        )}
                        {!student.studentEmail && !student.studentPhone && (
                          <span className="text-slate-400">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {student.groupName ? (
                        <Badge variant="outline">{student.groupName}</Badge>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-slate-600">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {formatDate(student.graduationDate)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(student)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Détails
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Affichage de {((pagination.page - 1) * pagination.limit) + 1} à{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} sur {pagination.total} résultats
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => fetchArchivedStudents(pagination.page - 1)}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchArchivedStudents(pagination.page + 1)}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}

      {/* Student Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-purple-600" />
              Dossier de l'étudiant diplômé
            </DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-6">
              {/* Student Info */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
                  <span className="text-2xl font-bold text-purple-600">
                    {selectedStudent.studentName?.charAt(0) || '?'}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{selectedStudent.studentName}</h3>
                  <p className="text-sm text-slate-500">
                    Diplômé le {formatDate(selectedStudent.graduationDate)}
                  </p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2">
                <h4 className="font-medium text-slate-700">Coordonnées</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="w-4 h-4 text-slate-400" />
                    {selectedStudent.studentEmail || '-'}
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400" />
                    {selectedStudent.studentPhone || '-'}
                  </div>
                </div>
              </div>

              {/* Group Info */}
              <div className="space-y-2">
                <h4 className="font-medium text-slate-700">Formation</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Users className="w-4 h-4 text-slate-400" />
                    Groupe: <strong>{selectedStudent.groupName || '-'}</strong>
                  </div>
                  {selectedStudent.coursesCompleted && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <GraduationCap className="w-4 h-4 text-slate-400" />
                      Cours: <strong>{selectedStudent.coursesCompleted}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Attendance Summary */}
              <div className="space-y-2">
                <h4 className="font-medium text-slate-700">Résumé des présences</h4>
                {(() => {
                  const att = parseAttendanceSummary(selectedStudent.attendanceSummary);
                  const total = att.present + att.absent + att.late;
                  const presentRate = total > 0 ? Math.round((att.present / total) * 100) : 0;
                  
                  return (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <CheckCircle className="w-5 h-5 mx-auto text-green-600 mb-1" />
                          <p className="text-lg font-bold text-green-700">{att.present}</p>
                          <p className="text-xs text-green-600">Présents</p>
                        </div>
                        <div className="text-center p-3 bg-red-50 rounded-lg">
                          <XCircle className="w-5 h-5 mx-auto text-red-600 mb-1" />
                          <p className="text-lg font-bold text-red-700">{att.absent}</p>
                          <p className="text-xs text-red-600">Absents</p>
                        </div>
                        <div className="text-center p-3 bg-yellow-50 rounded-lg">
                          <Clock className="w-5 h-5 mx-auto text-yellow-600 mb-1" />
                          <p className="text-lg font-bold text-yellow-700">{att.late}</p>
                          <p className="text-xs text-yellow-600">Retards</p>
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-slate-500">
                          Taux de présence: <strong className="text-green-600">{presentRate}%</strong>
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
