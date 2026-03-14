'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
import { BookOpen, Plus, Edit, Trash2, Clock, Search } from 'lucide-react';

interface Course {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  duration: string | null;
  fee: number | null;
  isActive: number;
  createdAt: string;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    duration: '',
    fee: '',
  });

  const fetchCourses = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);

      const response = await fetch(`/api/courses?${params}`);
      const data = await response.json();
      setCourses(data.courses || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCourse
        ? `/api/courses`
        : '/api/courses';
      const method = editingCourse ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingCourse?.id,
          name: formData.name,
          code: formData.code || null,
          description: formData.description || null,
          duration: formData.duration || null,
          fee: formData.fee ? parseFloat(formData.fee) : 0,
        }),
      });

      if (response.ok) {
        setDialogOpen(false);
        setEditingCourse(null);
        setFormData({ name: '', code: '', description: '', duration: '', fee: '' });
        fetchCourses();
      } else {
        const data = await response.json();
        alert(data.error || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Error saving course:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce cours?')) return;
    try {
      const response = await fetch(`/api/courses?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchCourses();
      }
    } catch (error) {
      console.error('Error deleting course:', error);
    }
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      name: course.name,
      code: course.code || '',
      description: course.description || '',
      duration: course.duration || '',
      fee: course.fee?.toString() || '',
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Cours</h1>
          <p className="text-slate-600">Gérez les cours et programmes de formation</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-green-500 to-emerald-600">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau cours
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCourse ? 'Modifier le cours' : 'Nouveau cours'}
              </DialogTitle>
              <DialogDescription>
                Remplissez les informations du cours
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom du cours *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Anglais niveau intermédiaire"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code">Code</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="Ex: ANG-INT"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Durée</Label>
                    <Input
                      id="duration"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      placeholder="Ex: 30 heures"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fee">Frais (MAD)</Label>
                    <Input
                      id="fee"
                      type="number"
                      step="0.01"
                      value={formData.fee}
                      onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                      placeholder="Ex: 1500"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Description du cours..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-green-500 to-emerald-600">
                  {editingCourse ? 'Modifier' : 'Créer'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-md">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Rechercher un cours..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Courses Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-8 text-slate-500">
            Chargement...
          </div>
        ) : courses.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500">Aucun cours créé</p>
            <p className="text-sm text-slate-400 mt-1">Créez votre premier cours en cliquant sur le bouton ci-dessus</p>
          </div>
        ) : (
          courses.map((course) => (
            <Card key={course.id} className="border-0 shadow-md hover:shadow-lg transition">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{course.name}</CardTitle>
                      <div className="flex gap-2 mt-1">
                        {course.code && (
                          <Badge variant="outline" className="text-xs">
                            {course.code}
                          </Badge>
                        )}
                        {course.duration && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {course.duration}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(course)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500"
                      onClick={() => handleDelete(course.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {course.description && (
                  <p className="text-sm text-slate-600 line-clamp-3">{course.description}</p>
                )}
                {course.fee && course.fee > 0 && (
                  <p className="text-sm font-medium text-green-600 mt-2">
                    {course.fee.toLocaleString()} MAD
                  </p>
                )}
                <div className="mt-4 text-xs text-slate-400">
                  Créé le {new Date(course.createdAt).toLocaleDateString('fr-FR')}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
