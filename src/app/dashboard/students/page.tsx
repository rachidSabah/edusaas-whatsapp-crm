'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  GraduationCap, Plus, Search, Edit, AlertCircle, 
  Download, Upload, FileSpreadsheet, Loader2, MessageSquare, BookOpen, Eye
} from 'lucide-react';
import { LogbookModal } from '@/components/LogbookModal';
import { useRouter } from 'next/navigation';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  status: string;
  program: string | null;
  group: { id: string; name: string } | null;
  parent: { id: string; fullName: string; phone: string } | null;
  enrollmentDate: string;
  // Parent 1 Information
  parent1Name: string | null;
  parent1Phone: string | null;
  parent1Whatsapp: number;
  // Parent 2 Information
  parent2Name: string | null;
  parent2Phone: string | null;
  parent2Whatsapp: number;
}

interface Group {
  id: string;
  name: string;
  _count?: { students: number };
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logbookOpen, setLogbookOpen] = useState(false);
  const [selectedStudentForLog, setSelectedStudentForLog] = useState<Student | null>(null);
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    program: '',
    groupId: '',
    parentId: '',
    notes: '',
    // Parent 1 Information
    parent1Name: '',
    parent1Phone: '',
    parent1Whatsapp: false,
    // Parent 2 Information
    parent2Name: '',
    parent2Phone: '',
    parent2Whatsapp: false,
  });

  const fetchStudents = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/students?${params}`, {
        headers: {
          'Cache-Control': 'no-store',
        },
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch students');
      }
      const data = await response.json();
      setStudents(data.students || []);
      // Show message if provided by API
      if (data.message && data.students?.length === 0) {
        setError(data.message);
      } else {
        setError(null);
      }
    } catch (error: any) {
      console.error('Error fetching students:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/groups');
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchGroups();
  }, [search, statusFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = '/api/students';
      const method = editingStudent ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          id: editingStudent?.id,
          groupId: formData.groupId || null,
        }),
      });

      if (response.ok) {
        setDialogOpen(false);
        setEditingStudent(null);
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          program: '',
          groupId: '',
          parentId: '',
          notes: '',
          parent1Name: '',
          parent1Phone: '',
          parent1Whatsapp: false,
          parent2Name: '',
          parent2Phone: '',
          parent2Whatsapp: false,
        });
        fetchStudents();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to save student');
      }
    } catch (error) {
      console.error('Error saving student:', error);
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email || '',
      phone: student.phone || '',
      program: student.program || '',
      groupId: student.group?.id || '',
      parentId: student.parent?.id || '',
      notes: '',
      parent1Name: student.parent1Name || '',
      parent1Phone: student.parent1Phone || '',
      parent1Whatsapp: student.parent1Whatsapp === 1,
      parent2Name: student.parent2Name || '',
      parent2Phone: student.parent2Phone || '',
      parent2Whatsapp: student.parent2Whatsapp === 1,
    });
    setDialogOpen(true);
  };

  const handleDoubleClick = (student: Student) => {
    router.push(`/dashboard/student-profile?id=${student.id}`);
  };

  const handleOpenLogbook = (student: Student) => {
    setSelectedStudentForLog(student);
    setLogbookOpen(true);
  };

  const handleViewProfile = (student: Student) => {
    router.push(`/dashboard/student-profile?id=${student.id}`);
  };

  // Export students to CSV
  const handleExportStudents = () => {
    const headers = ['Prénom', 'Nom', 'Email', 'Téléphone', 'Programme', 'Groupe', 'Statut', 
                     'Parent 1 Nom', 'Parent 1 Téléphone', 'Parent 1 WhatsApp',
                     'Parent 2 Nom', 'Parent 2 Téléphone', 'Parent 2 WhatsApp'];
    
    const rows = students.map(student => [
      student.firstName,
      student.lastName,
      student.email || '',
      student.phone || '',
      student.program || '',
      student.group?.name || '',
      student.status,
      student.parent1Name || '',
      student.parent1Phone || '',
      student.parent1Whatsapp ? 'Oui' : 'Non',
      student.parent2Name || '',
      student.parent2Phone || '',
      student.parent2Whatsapp ? 'Oui' : 'Non'
    ]);

    // Create CSV content with BOM for Excel UTF-8 support
    const BOM = '\uFEFF';
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `etudiants_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import students from CSV
  const handleImportStudents = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      // Skip header row
      const dataLines = lines.slice(1);
      
      let imported = 0;
      const errors: string[] = [];

      for (const line of dataLines) {
        try {
          // Parse CSV line (handle quoted values)
          const values = line.match(/("([^"]|"")*"|[^,]*)/g)?.map(v => 
            v.replace(/^"|"$/g, '').replace(/""/g, '"').trim()
          ) || [];

          if (values.length < 2) continue;

          const [firstName, lastName, email, phone, program, groupName, 
                 parent1Name, parent1Phone, parent2Name, parent2Phone] = values;

          if (!firstName || !lastName) {
            errors.push(`Ligne ignorée: Prénom ou nom manquant`);
            continue;
          }

          // Find group by name
          let groupId: string | null = null;
          if (groupName) {
            const group = groups.find(g => g.name.toLowerCase() === groupName.toLowerCase());
            if (group) groupId = group.id;
          }

          const response = await fetch('/api/students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              firstName,
              lastName,
              email: email || null,
              phone: phone || null,
              program: program || null,
              groupId,
              parent1Name: parent1Name || null,
              parent1Phone: parent1Phone || null,
              parent2Name: parent2Name || null,
              parent2Phone: parent2Phone || null,
            }),
          });

          if (response.ok) {
            imported++;
          } else {
            const data = await response.json();
            errors.push(`${firstName} ${lastName}: ${data.error || 'Erreur'}`);
          }
        } catch (err) {
          errors.push(`Erreur de parsing: ${line.substring(0, 50)}...`);
        }
      }

      if (imported > 0) {
        fetchStudents();
        alert(`Import terminé: ${imported} étudiant(s) importé(s)${errors.length > 0 ? `\n\nErreurs:\n${errors.slice(0, 5).join('\n')}` : ''}`);
      } else {
        alert(`Aucun étudiant importé.\n\nErreurs:\n${errors.slice(0, 10).join('\n')}`);
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('Erreur lors de l\'import du fichier');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-700',
      INACTIVE: 'bg-slate-100 text-slate-700',
      GRADUATED: 'bg-blue-100 text-blue-700',
      WITHDRAWN: 'bg-red-100 text-red-700',
      ON_LEAVE: 'bg-yellow-100 text-yellow-700',
    };
    const labels: Record<string, string> = {
      ACTIVE: 'Actif',
      INACTIVE: 'Inactif',
      GRADUATED: 'Diplômé',
      WITHDRAWN: 'Retiré',
      ON_LEAVE: 'En congé',
    };
    return (
      <Badge className={colors[status] || colors.ACTIVE}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Étudiants</h1>
          <p className="text-slate-600">Gérez les étudiants de votre établissement</p>
        </div>
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="text-center py-8 text-red-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-3" />
              <p>{error}</p>
              <p className="text-sm text-slate-500 mt-2">Veuillez vous connecter avec un compte organisation.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Étudiants</h1>
          <p className="text-slate-600">Gérez les étudiants de votre établissement</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv"
            onChange={handleImportStudents}
            className="hidden"
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Importer CSV
          </Button>
          <Button variant="outline" onClick={handleExportStudents} disabled={students.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-green-500 to-emerald-600" onClick={() => {
                setEditingStudent(null);
                setFormData({
                  firstName: '',
                  lastName: '',
                  email: '',
                  phone: '',
                  program: '',
                  groupId: '',
                  parentId: '',
                  notes: '',
                  parent1Name: '',
                  parent1Phone: '',
                  parent1Whatsapp: false,
                  parent2Name: '',
                  parent2Phone: '',
                  parent2Whatsapp: false,
                });
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingStudent ? 'Modifier l\'étudiant' : 'Ajouter un étudiant'}
                </DialogTitle>
                <DialogDescription>
                  Remplissez les informations de l'étudiant
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-4 py-4">
                  {/* Student Information */}
                  <div className="col-span-2">
                    <h4 className="font-medium text-slate-900 mb-3 border-b pb-2">Informations de l'étudiant</h4>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Prénom</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nom</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="program">Programme</Label>
                    <Input
                      id="program"
                      value={formData.program}
                      onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="group">Groupe</Label>
                    <Select
                      value={formData.groupId || 'none'}
                      onValueChange={(value) => setFormData({ ...formData, groupId: value === 'none' ? '' : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un groupe" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucun groupe</SelectItem>
                        {groups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Parent 1 Information */}
                  <div className="col-span-2 mt-4">
                    <h4 className="font-medium text-slate-900 mb-3 border-b pb-2">Parent 1</h4>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parent1Name">Nom du parent 1</Label>
                    <Input
                      id="parent1Name"
                      value={formData.parent1Name}
                      onChange={(e) => setFormData({ ...formData, parent1Name: e.target.value })}
                      placeholder="Nom complet du parent 1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parent1Phone">Téléphone du parent 1</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="parent1Phone"
                        value={formData.parent1Phone}
                        onChange={(e) => setFormData({ ...formData, parent1Phone: e.target.value })}
                        placeholder="+212 6XX XXX XXX"
                        className="flex-1"
                      />
                      <label className="flex items-center gap-2 whitespace-nowrap cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.parent1Whatsapp}
                          onChange={(e) => setFormData({ ...formData, parent1Whatsapp: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
                        />
                        <span className="text-sm text-slate-600">WhatsApp</span>
                      </label>
                    </div>
                  </div>
                  
                  {/* Parent 2 Information */}
                  <div className="col-span-2 mt-4">
                    <h4 className="font-medium text-slate-900 mb-3 border-b pb-2">Parent 2</h4>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parent2Name">Nom du parent 2</Label>
                    <Input
                      id="parent2Name"
                      value={formData.parent2Name}
                      onChange={(e) => setFormData({ ...formData, parent2Name: e.target.value })}
                      placeholder="Nom complet du parent 2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parent2Phone">Téléphone du parent 2</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="parent2Phone"
                        value={formData.parent2Phone}
                        onChange={(e) => setFormData({ ...formData, parent2Phone: e.target.value })}
                        placeholder="+212 6XX XXX XXX"
                        className="flex-1"
                      />
                      <label className="flex items-center gap-2 whitespace-nowrap cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.parent2Whatsapp}
                          onChange={(e) => setFormData({ ...formData, parent2Whatsapp: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
                        />
                        <span className="text-sm text-slate-600">WhatsApp</span>
                      </label>
                    </div>
                  </div>
                  
                  {/* Notes */}
                  <div className="col-span-2 space-y-2 mt-4">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" className="bg-gradient-to-r from-green-500 to-emerald-600">
                    {editingStudent ? 'Modifier' : 'Ajouter'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-md">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Rechercher un étudiant..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="ACTIVE">Actif</SelectItem>
                <SelectItem value="INACTIVE">Inactif</SelectItem>
                <SelectItem value="GRADUATED">Diplômé</SelectItem>
                <SelectItem value="WITHDRAWN">Retiré</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Groupe</TableHead>
                <TableHead>Programme</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2 text-slate-500">
                      <GraduationCap className="w-5 h-5 animate-pulse" />
                      Chargement...
                    </div>
                  </TableCell>
                </TableRow>
              ) : students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="text-slate-500">
                      <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Aucun étudiant trouvé</p>
                      <p className="text-sm mt-1">Ajoutez votre premier étudiant ou importez un fichier CSV.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                students.map((student) => (
                  <TableRow key={student.id} onDoubleClick={() => handleDoubleClick(student)} className="cursor-pointer hover:bg-slate-50">
                    <TableCell className="font-medium">
                      <div>
                        <p>{student.fullName}</p>
                        {/* Show new parent info with WhatsApp indicators */}
                        {(student.parent1Name || student.parent2Name) && (
                          <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                            {student.parent1Name && (
                              <div className="flex items-center gap-1">
                                <span>Parent 1: {student.parent1Name}</span>
                                {student.parent1Phone && (
                                  <span className="text-slate-400">({student.parent1Phone})</span>
                                )}
                                {student.parent1Whatsapp === 1 && (
                                  <MessageSquare className="w-3 h-3 text-green-500" />
                                )}
                              </div>
                            )}
                            {student.parent2Name && (
                              <div className="flex items-center gap-1">
                                <span>Parent 2: {student.parent2Name}</span>
                                {student.parent2Phone && (
                                  <span className="text-slate-400">({student.parent2Phone})</span>
                                )}
                                {student.parent2Whatsapp === 1 && (
                                  <MessageSquare className="w-3 h-3 text-green-500" />
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        {/* Legacy parent field for backward compatibility */}
                        {student.parent && !student.parent1Name && !student.parent2Name && (
                          <p className="text-xs text-slate-500">
                            Parent: {student.parent.fullName}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{student.email || '-'}</TableCell>
                    <TableCell>{student.phone || '-'}</TableCell>
                    <TableCell>
                      {student.group ? (
                        <Badge variant="outline">{student.group.name}</Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{student.program || '-'}</TableCell>
                    <TableCell>{getStatusBadge(student.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Voir le profil (double-clic)"
                          onClick={() => handleViewProfile(student)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Livret de bord"
                          onClick={() => handleOpenLogbook(student)}
                        >
                          <BookOpen className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(student)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Logbook Modal */}
      {selectedStudentForLog && (
        <LogbookModal
          open={logbookOpen}
          onOpenChange={setLogbookOpen}
          studentId={selectedStudentForLog.id}
          studentName={`${selectedStudentForLog.firstName} ${selectedStudentForLog.lastName}`}
          onSuccess={() => {
            // Refresh students list if needed
            fetchStudents();
          }}
        />
      )}

      {/* Import Help */}
      <Card className="border-0 shadow-md bg-slate-50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="w-5 h-5 text-slate-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-slate-900">Format CSV pour l'import</h4>
              <p className="text-sm text-slate-600 mt-1">
                Le fichier CSV doit contenir les colonnes: Prénom, Nom, Email, Téléphone, Programme, Groupe, Parent 1 Nom, Parent 1 Téléphone, Parent 2 Nom, Parent 2 Téléphone.
                La première ligne doit être l'en-tête. Les colonnes Parent sont optionnelles.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
