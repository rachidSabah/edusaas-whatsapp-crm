'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { CalendarDays, Plus, Edit, Trash2, Calendar, Clock } from 'lucide-react';

interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  durationMonths: number;
  isActive: number;
  createdAt: string;
}

export default function AcademicYearsPage() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
  });

  const fetchAcademicYears = async () => {
    try {
      const response = await fetch('/api/academic-years');
      const data = await response.json();
      setAcademicYears(data.academicYears || []);
    } catch (error) {
      console.error('Error fetching academic years:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingYear
        ? '/api/academic-years'
        : '/api/academic-years';
      const method = editingYear ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          id: editingYear?.id,
        }),
      });

      if (response.ok) {
        setDialogOpen(false);
        setEditingYear(null);
        setFormData({ name: '', startDate: '', endDate: '' });
        fetchAcademicYears();
      } else {
        const data = await response.json();
        alert(data.error || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Error saving academic year:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette année académique?')) return;
    try {
      const response = await fetch(`/api/academic-years?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchAcademicYears();
      }
    } catch (error) {
      console.error('Error deleting academic year:', error);
    }
  };

  const handleEdit = (year: AcademicYear) => {
    setEditingYear(year);
    setFormData({
      name: year.name,
      startDate: year.startDate,
      endDate: year.endDate,
    });
    setDialogOpen(true);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const isActive = (year: AcademicYear) => {
    const today = new Date();
    const start = new Date(year.startDate);
    const end = new Date(year.endDate);
    return today >= start && today <= end;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Années académiques</h1>
          <p className="text-slate-600">Gérez les périodes académiques de votre établissement</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-green-500 to-emerald-600">
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle année
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingYear ? 'Modifier l\'année académique' : 'Nouvelle année académique'}
              </DialogTitle>
              <DialogDescription>
                Définissez la période de l'année académique
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom de l'année</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: 2024-2025"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Date de début</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">Date de fin</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-green-500 to-emerald-600">
                  {editingYear ? 'Modifier' : 'Créer'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Academic Years Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-8 text-slate-500">
            Chargement...
          </div>
        ) : academicYears.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500">Aucune année académique créée</p>
            <p className="text-sm text-slate-400 mt-1">Créez votre première année académique en cliquant sur le bouton ci-dessus</p>
          </div>
        ) : (
          academicYears.map((year) => (
            <Card key={year.id} className={`border-0 shadow-md hover:shadow-lg transition ${isActive(year) ? 'ring-2 ring-green-500' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isActive(year) ? 'bg-green-100' : 'bg-slate-100'}`}>
                      <CalendarDays className={`w-5 h-5 ${isActive(year) ? 'text-green-600' : 'text-slate-600'}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{year.name}</CardTitle>
                      {isActive(year) && (
                        <Badge className="bg-green-100 text-green-700 mt-1">
                          En cours
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(year)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500"
                      onClick={() => handleDelete(year.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">
                      Du <strong>{formatDate(year.startDate)}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">
                      Au <strong>{formatDate(year.endDate)}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">
                      Durée: <strong>{year.durationMonths || 9} mois</strong>
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
