'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Layers, Plus, Edit, Trash2, Users, Calendar, ArrowUpRight, Loader2, Pencil } from 'lucide-react';

interface Group {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  capacity: number | null;
  year1StartDate: string | null;
  year1EndDate: string | null;
  year2StartDate: string | null;
  year2EndDate: string | null;
  currentYear: number;
  createdAt: string;
  studentCount?: number;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    capacity: '',
    year1StartDate: '',
    year1EndDate: '',
    year2StartDate: '',
    year2EndDate: '',
    currentYear: '1',
  });
  
  // Promotion/Rename state
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [promoteToYear, setPromoteToYear] = useState('2');
  const [processing, setProcessing] = useState(false);

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/groups', {
        headers: {
          'Cache-Control': 'no-store',
        },
      });
      const data = await response.json();
      setGroups(data.groups || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const url = editingGroup
        ? `/api/groups?id=${editingGroup.id}`
        : '/api/groups';
      const method = editingGroup ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          id: editingGroup?.id,
          capacity: formData.capacity ? parseInt(formData.capacity) : null,
          currentYear: parseInt(formData.currentYear) || 1,
        }),
      });

      const responseData = await response.json();

      if (response.ok && responseData.success !== false) {
        setDialogOpen(false);
        setEditingGroup(null);
        setFormData({
          name: '',
          code: '',
          description: '',
          capacity: '',
          year1StartDate: '',
          year1EndDate: '',
          year2StartDate: '',
          year2EndDate: '',
          currentYear: '1',
        });
        
        // Immediately add/update in local state for instant UI feedback
        if (editingGroup) {
          // Update existing group in local state
          setGroups(prev => prev.map(g => g.id === editingGroup.id 
            ? { ...g, ...responseData.group, studentCount: g.studentCount || 0 } 
            : g
          ));
        } else if (responseData.group) {
          // Add new group to local state immediately
          const newGroup: Group = {
            ...responseData.group,
            studentCount: 0
          };
          setGroups(prev => [newGroup, ...prev]);
          console.log('[Groups] Added new group to UI:', newGroup.name);
        }
        
        // Removed re-fetch timeout to prevent race condition with Turso sync overwriting optimistic UI state
      } else {
        console.error('Error response:', responseData);
        alert(responseData.error || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Error saving group:', error);
      alert('Erreur de connexion au serveur');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce groupe?')) return;
    try {
      const response = await fetch(`/api/groups?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchGroups();
      }
    } catch (error) {
      console.error('Error deleting group:', error);
    }
  };

  const handleEdit = (group: Group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      code: group.code || '',
      description: group.description || '',
      capacity: group.capacity?.toString() || '',
      year1StartDate: group.year1StartDate || '',
      year1EndDate: group.year1EndDate || '',
      year2StartDate: group.year2StartDate || '',
      year2EndDate: group.year2EndDate || '',
      currentYear: group.currentYear?.toString() || '1',
    });
    setDialogOpen(true);
  };

  // Open rename dialog
  const handleRename = (group: Group) => {
    setSelectedGroup(group);
    setNewGroupName(group.name);
    setShowRenameDialog(true);
  };

  // Open promote dialog
  const handlePromote = (group: Group) => {
    setSelectedGroup(group);
    setPromoteToYear((group.currentYear + 1).toString());
    setShowPromoteDialog(true);
  };

  // Rename group
  const doRename = async () => {
    if (!selectedGroup || !newGroupName.trim()) return;
    setProcessing(true);
    try {
      const response = await fetch('/api/groups/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: selectedGroup.id,
          action: 'rename',
          newName: newGroupName.trim(),
        }),
      });
      if (response.ok) {
        setShowRenameDialog(false);
        fetchGroups();
      } else {
        const error = await response.json();
        alert(error.error || 'Erreur lors du renommage');
      }
    } catch (error) {
      console.error('Rename error:', error);
    } finally {
      setProcessing(false);
    }
  };

  // Promote group
  const doPromote = async () => {
    if (!selectedGroup) return;
    setProcessing(true);
    try {
      const response = await fetch('/api/groups/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: selectedGroup.id,
          action: 'promote',
          promoteToYear: parseInt(promoteToYear),
        }),
      });
      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        setShowPromoteDialog(false);
        fetchGroups();
      } else {
        const error = await response.json();
        alert(error.error || 'Erreur lors de la promotion');
      }
    } catch (error) {
      console.error('Promote error:', error);
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Groupes</h1>
          <p className="text-slate-600">Gérez les groupes et classes de votre établissement</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-green-500 to-emerald-600">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau groupe
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingGroup ? 'Modifier le groupe' : 'Nouveau groupe'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom du groupe</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Groupe A1"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code">Code</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="Ex: A1-2024"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Description du groupe..."
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Capacité maximale</Label>
                    <Input
                      id="capacity"
                      type="number"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                      placeholder="Ex: 30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currentYear">Année en cours</Label>
                    <Select
                      value={formData.currentYear}
                      onValueChange={(value) => setFormData({ ...formData, currentYear: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1ère Année</SelectItem>
                        <SelectItem value="2">2ème Année</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Study Period - Year 1 */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Période d'études - 1ère Année
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="year1StartDate">Date de début</Label>
                      <Input
                        id="year1StartDate"
                        type="date"
                        value={formData.year1StartDate}
                        onChange={(e) => setFormData({ ...formData, year1StartDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="year1EndDate">Date de fin</Label>
                      <Input
                        id="year1EndDate"
                        type="date"
                        value={formData.year1EndDate}
                        onChange={(e) => setFormData({ ...formData, year1EndDate: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Study Period - Year 2 */}
                <div className="border-t pt-4">
                  <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Période d'études - 2ème Année
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="year2StartDate">Date de début</Label>
                      <Input
                        id="year2StartDate"
                        type="date"
                        value={formData.year2StartDate}
                        onChange={(e) => setFormData({ ...formData, year2StartDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="year2EndDate">Date de fin</Label>
                      <Input
                        id="year2EndDate"
                        type="date"
                        value={formData.year2EndDate}
                        onChange={(e) => setFormData({ ...formData, year2EndDate: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-green-500 to-emerald-600">
                  {editingGroup ? 'Modifier' : 'Créer'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Groups Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-8 text-slate-500">
            Chargement...
          </div>
        ) : groups.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <Layers className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500">Aucun groupe créé</p>
          </div>
        ) : (
          groups.map((group) => (
            <Card key={group.id} className="border-0 shadow-md hover:shadow-lg transition">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Layers className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{group.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        {group.code && (
                          <Badge variant="outline" className="text-xs">
                            {group.code}
                          </Badge>
                        )}
                        <Badge className="bg-blue-100 text-blue-700 text-xs">
                          {group.currentYear === 1 ? '1ère Année' : '2ème Année'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(group)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500"
                      onClick={() => handleDelete(group.id)}
                      disabled={(group.studentCount || 0) > 0}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {group.description && (
                  <p className="text-sm text-slate-600 mb-4">{group.description}</p>
                )}
                
                {/* Study Period Info */}
                {(group.year1StartDate || group.year2StartDate) && (
                  <div className="text-xs text-slate-500 mb-3 space-y-1">
                    {group.year1StartDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>1ère Année: {formatDate(group.year1StartDate)} - {formatDate(group.year1EndDate)}</span>
                      </div>
                    )}
                    {group.year2StartDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>2ème Année: {formatDate(group.year2StartDate)} - {formatDate(group.year2EndDate)}</span>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-slate-500">
                    <Users className="w-4 h-4" />
                    <span>{group.studentCount || 0} étudiants</span>
                  </div>
                  {group.capacity && (
                    <span className="text-slate-400">
                      Capacité: {group.capacity}
                    </span>
                  )}
                </div>
                
                {/* Action buttons */}
                <div className="flex gap-2 mt-3 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => handleRename(group)}
                  >
                    <Pencil className="w-3 h-3 mr-1" />
                    Renommer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                    onClick={() => handlePromote(group)}
                  >
                    <ArrowUpRight className="w-3 h-3 mr-1" />
                    Promouvoir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renommer le groupe</DialogTitle>
            <DialogDescription>Modifier le nom du groupe "{selectedGroup?.name}"</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="newName">Nouveau nom</Label>
            <Input
              id="newName"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Nouveau nom du groupe"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>Annuler</Button>
            <Button onClick={doRename} disabled={processing || !newGroupName.trim()}>
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Renommer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Promote Dialog */}
      <Dialog open={showPromoteDialog} onOpenChange={setShowPromoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promouvoir le groupe</DialogTitle>
            <DialogDescription>
              Promouvoir tous les étudiants du groupe "{selectedGroup?.name}" vers l'année suivante
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
              <p><strong>Groupe:</strong> {selectedGroup?.name}</p>
              <p><strong>Année actuelle:</strong> {selectedGroup?.currentYear === 1 ? '1ère Année' : '2ème Année'}</p>
              <p><strong>Nombre d'étudiants:</strong> {selectedGroup?.studentCount || 0}</p>
            </div>
            <div>
              <Label htmlFor="promoteToYear">Promouvoir vers</Label>
              <Select value={promoteToYear} onValueChange={setPromoteToYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1ère Année</SelectItem>
                  <SelectItem value="2">2ème Année</SelectItem>
                  <SelectItem value="3">3ème Année</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPromoteDialog(false)}>Annuler</Button>
            <Button onClick={doPromote} disabled={processing} className="bg-blue-500 hover:bg-blue-600">
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Promouvoir les étudiants
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
