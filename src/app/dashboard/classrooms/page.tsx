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
import { MapPin, Plus, Edit, Trash2, Users, Search, Building, Layers } from 'lucide-react';

interface Classroom {
  id: string;
  name: string;
  code: string | null;
  capacity: number;
  building: string | null;
  floor: string | null;
  facilities: string | null;
  isActive: number;
  createdAt: string;
}

export default function ClassroomsPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    capacity: '',
    building: '',
    floor: '',
    facilities: '',
  });

  const fetchClassrooms = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);

      const response = await fetch(`/api/classrooms?${params}`, {
        headers: {
          'Cache-Control': 'no-store',
        },
      });
      const data = await response.json();
      setClassrooms(data.classrooms || []);
    } catch (error) {
      console.error('Error fetching classrooms:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, [search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editingClassroom ? 'PUT' : 'POST';

      const response = await fetch('/api/classrooms', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          id: editingClassroom?.id,
          capacity: formData.capacity ? parseInt(formData.capacity) : 30,
        }),
      });

      if (response.ok) {
        setDialogOpen(false);
        setEditingClassroom(null);
        setFormData({ name: '', code: '', capacity: '', building: '', floor: '', facilities: '' });
        // Attendre un peu puis rafraîchir
        await new Promise(resolve => setTimeout(resolve, 1000));
        await fetchClassrooms();
      } else {
        const data = await response.json();
        alert(data.error || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Error saving classroom:', error);
      alert('Erreur de connexion au serveur');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette salle?')) return;
    try {
      const response = await fetch(`/api/classrooms?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchClassrooms();
      }
    } catch (error) {
      console.error('Error deleting classroom:', error);
    }
  };

  const handleEdit = (classroom: Classroom) => {
    setEditingClassroom(classroom);
    setFormData({
      name: classroom.name,
      code: classroom.code || '',
      capacity: classroom.capacity?.toString() || '',
      building: classroom.building || '',
      floor: classroom.floor || '',
      facilities: classroom.facilities || '',
    });
    setDialogOpen(true);
  };

  const getLocationString = (classroom: Classroom) => {
    const parts = [];
    if (classroom.building) parts.push(classroom.building);
    if (classroom.floor) parts.push(classroom.floor);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Salles de classe</h1>
          <p className="text-slate-600">Gérez les salles et espaces de votre établissement</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-green-500 to-emerald-600">
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle salle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingClassroom ? 'Modifier la salle' : 'Nouvelle salle'}
              </DialogTitle>
              <DialogDescription>
                Remplissez les informations de la salle
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom de la salle *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Salle A1"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code">Code</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="Ex: A1-101"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Capacité</Label>
                    <Input
                      id="capacity"
                      type="number"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                      placeholder="Ex: 30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="building">Bâtiment</Label>
                    <Input
                      id="building"
                      value={formData.building}
                      onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                      placeholder="Ex: Bâtiment A"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="floor">Étage</Label>
                    <Input
                      id="floor"
                      value={formData.floor}
                      onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                      placeholder="Ex: 1er étage"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facilities">Équipements</Label>
                  <Input
                    id="facilities"
                    value={formData.facilities}
                    onChange={(e) => setFormData({ ...formData, facilities: e.target.value })}
                    placeholder="Ex: Projecteur, Tableau blanc, Climatisation"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-green-500 to-emerald-600">
                  {editingClassroom ? 'Modifier' : 'Créer'}
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
              placeholder="Rechercher une salle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Classrooms Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-8 text-slate-500">
            Chargement...
          </div>
        ) : classrooms.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <MapPin className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500">Aucune salle créée</p>
            <p className="text-sm text-slate-400 mt-1">Créez votre première salle en cliquant sur le bouton ci-dessus</p>
          </div>
        ) : (
          classrooms.map((classroom) => (
            <Card key={classroom.id} className="border-0 shadow-md hover:shadow-lg transition">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{classroom.name}</CardTitle>
                      {classroom.code && (
                        <Badge variant="outline" className="text-xs mt-1">{classroom.code}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(classroom)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500"
                      onClick={() => handleDelete(classroom.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span>Capacité: <strong>{classroom.capacity || 30}</strong> places</span>
                  </div>
                  {getLocationString(classroom) && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Building className="w-4 h-4 text-slate-400" />
                      <span>{getLocationString(classroom)}</span>
                    </div>
                  )}
                  {classroom.facilities && (
                    <div className="flex items-start gap-2 text-sm text-slate-600">
                      <Layers className="w-4 h-4 text-slate-400 mt-0.5" />
                      <span className="text-xs">{classroom.facilities}</span>
                    </div>
                  )}
                </div>
                <div className="mt-4 text-xs text-slate-400">
                  Créé le {new Date(classroom.createdAt).toLocaleDateString('fr-FR')}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
