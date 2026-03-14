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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { GraduationCap, Plus, Edit, Trash2, Search, Upload, Download, Mail, Phone } from 'lucide-react';

interface Teacher {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  speciality: string | null;
  isActive: number;
  createdAt: string;
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    speciality: '',
  });

  const fetchTeachers = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);

      const response = await fetch(`/api/teachers?${params}`);
      const data = await response.json();
      setTeachers(data.teachers || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, [search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingTeacher
        ? '/api/teachers'
        : '/api/teachers';
      const method = editingTeacher ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          id: editingTeacher?.id,
        }),
      });

      if (response.ok) {
        setDialogOpen(false);
        setEditingTeacher(null);
        setFormData({ name: '', email: '', phone: '', speciality: '' });
        fetchTeachers();
      } else {
        const data = await response.json();
        alert(data.error || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Error saving teacher:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet enseignant?')) return;
    try {
      const response = await fetch(`/api/teachers?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchTeachers();
      }
    } catch (error) {
      console.error('Error deleting teacher:', error);
    }
  };

  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      name: teacher.name,
      email: teacher.email || '',
      phone: teacher.phone || '',
      speciality: teacher.speciality || '',
    });
    setDialogOpen(true);
  };

  const handleImportExcel = () => {
    // Placeholder for Excel import functionality
    alert('L\'importation Excel sera bientôt disponible. Cette fonctionnalité permet d\'importer une liste d\'enseignants depuis un fichier Excel.');
  };

  const handleExportExcel = () => {
    // Placeholder for Excel export functionality
    alert('L\'exportation Excel sera bientôt disponible. Cette fonctionnalité permet d\'exporter la liste des enseignants vers un fichier Excel.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Enseignants</h1>
          <p className="text-slate-600">Gérez les enseignants de votre établissement</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleImportExcel}>
            <Upload className="w-4 h-4 mr-2" />
            Importer
          </Button>
          <Button variant="outline" onClick={handleExportExcel}>
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-green-500 to-emerald-600">
                <Plus className="w-4 h-4 mr-2" />
                Nouvel enseignant
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingTeacher ? 'Modifier l\'enseignant' : 'Nouvel enseignant'}
                </DialogTitle>
                <DialogDescription>
                  Remplissez les informations de l'enseignant
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom complet</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Jean Dupont"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="Ex: jean.dupont@email.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Téléphone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="Ex: +212 6XX XXX XXX"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="speciality">Spécialité</Label>
                    <Input
                      id="speciality"
                      value={formData.speciality}
                      onChange={(e) => setFormData({ ...formData, speciality: e.target.value })}
                      placeholder="Ex: Mathématiques, Anglais, Informatique..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" className="bg-gradient-to-r from-green-500 to-emerald-600">
                    {editingTeacher ? 'Modifier' : 'Créer'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-md">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Rechercher un enseignant..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Teachers Table */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Spécialité</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2 text-slate-500">
                      <GraduationCap className="w-5 h-5 animate-pulse" />
                      Chargement...
                    </div>
                  </TableCell>
                </TableRow>
              ) : teachers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="text-slate-500">
                      <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Aucun enseignant trouvé</p>
                      <p className="text-sm mt-1">Ajoutez votre premier enseignant en cliquant sur le bouton ci-dessus</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                teachers.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <span className="text-purple-700 font-medium">
                            {teacher.name?.charAt(0) || '?'}
                          </span>
                        </div>
                        <span>{teacher.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {teacher.email ? (
                        <div className="flex items-center gap-1 text-slate-600">
                          <Mail className="w-4 h-4 text-slate-400" />
                          {teacher.email}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {teacher.phone ? (
                        <div className="flex items-center gap-1 text-slate-600">
                          <Phone className="w-4 h-4 text-slate-400" />
                          {teacher.phone}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {teacher.speciality ? (
                        <Badge variant="outline">{teacher.speciality}</Badge>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(teacher)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500"
                        onClick={() => handleDelete(teacher.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
