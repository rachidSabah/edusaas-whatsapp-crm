'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { 
  ClipboardList, 
  Plus, 
  Calendar, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  Loader2,
  Edit,
  Trash2,
  Eye,
  Search,
  Download,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Task {
  id: string;
  title: string;
  description: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  createdByName: string | null;
  dueDate: string;
  startDate: string;
  status: string;
  priority: string;
  progress: number;
  attachments: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 border-blue-200',
  COMPLETED: 'bg-green-100 text-green-700 border-green-200',
  OVERDUE: 'bg-red-100 text-red-700 border-red-200',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminé',
  OVERDUE: 'En retard',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-700 border-slate-200',
  MEDIUM: 'bg-orange-100 text-orange-700 border-orange-200',
  HIGH: 'bg-red-100 text-red-700 border-red-200',
  URGENT: 'bg-red-200 text-red-800 border-red-300',
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Basse',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute',
  URGENT: 'Urgente',
};

export default function AssignmentsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedToId: '',
    dueDate: '',
    startDate: '',
    priority: 'MEDIUM',
    attachments: [] as File[],
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tasksRes, usersRes] = await Promise.all([
        fetch('/api/tasks?created=true'),
        fetch('/api/admin/users')
      ]);

      const tasksData = await tasksRes.json() as { tasks: Task[] };
      const usersData = await usersRes.json() as { users: User[] };

      setTasks(tasksData.tasks || []);
      setUsers(usersData.users || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingTask ? '/api/tasks' : '/api/tasks';
      const method = editingTask ? 'PUT' : 'POST';

      let attachmentsData: string[] = [];
      if (formData.attachments.length > 0) {
        attachmentsData = formData.attachments.map(f => f.name);
      }

      const body = {
        ...(editingTask ? { id: editingTask.id } : {}),
        title: formData.title,
        description: formData.description,
        assignedToId: formData.assignedToId || null,
        dueDate: formData.dueDate,
        startDate: formData.startDate || new Date().toISOString().split('T')[0],
        priority: formData.priority,
        attachments: attachmentsData.length > 0 ? attachmentsData : null,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setDialogOpen(false);
        setEditingTask(null);
        setFormData({
          title: '',
          description: '',
          assignedToId: '',
          dueDate: '',
          startDate: '',
          priority: 'MEDIUM',
          attachments: [],
        });
        fetchData();
      } else {
        const data = await response.json() as { error?: string };
        alert(data.error || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette tâche?')) return;
    
    try {
      const response = await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      assignedToId: task.assignedToId || '',
      dueDate: task.dueDate,
      startDate: task.startDate,
      priority: task.priority,
      attachments: [],
    });
    setDialogOpen(true);
  };

  const handleView = (task: Task) => {
    setViewingTask(task);
    setViewDialogOpen(true);
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(search.toLowerCase()) ||
      (task.description?.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'PENDING').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length,
    overdue: tasks.filter(t => t.status === 'OVERDUE' || (t.status !== 'COMPLETED' && new Date(t.dueDate) < new Date())).length,
  };

  const isOverdue = (dueDate: string, status: string) => {
    return status !== 'COMPLETED' && new Date(dueDate) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gestion des Tâches</h1>
          <p className="text-slate-600">Créez et suivez les tâches assignées aux utilisateurs</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-gradient-to-r from-green-500 to-emerald-600"
              onClick={() => {
                setEditingTask(null);
                setFormData({
                  title: '',
                  description: '',
                  assignedToId: '',
                  dueDate: '',
                  startDate: new Date().toISOString().split('T')[0],
                  priority: 'MEDIUM',
                  attachments: [],
                });
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle tâche
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTask ? 'Modifier la tâche' : 'Nouvelle tâche'}
              </DialogTitle>
              <DialogDescription>
                Assignez une tâche à un membre de l&apos;équipe
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titre *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Titre de la tâche"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Description détaillée..."
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="assignedToId">Assigner à</Label>
                    <Select
                      value={formData.assignedToId}
                      onValueChange={(v) => setFormData({ ...formData, assignedToId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Non assigné</SelectItem>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">Priorité</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(v) => setFormData({ ...formData, priority: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Date de début</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Date d&apos;échéance *</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Pièces jointes</Label>
                  <div className="border-2 border-dashed border-slate-200 rounded-lg p-4">
                    <Input
                      type="file"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setFormData({ ...formData, attachments: files });
                      }}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      PDF, DOC, DOCX, XLS, XLSX, images acceptés
                    </p>
                    {formData.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {formData.attachments.map((file, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                            <FileText className="w-4 h-4" />
                            {file.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving} className="bg-green-600">
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sauvegarde...
                    </>
                  ) : editingTask ? 'Modifier' : 'Créer'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-slate-500">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-slate-500">En attente</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Edit className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
                <p className="text-sm text-slate-500">En cours</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-sm text-slate-500">Terminées</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.overdue}</p>
                <p className="text-sm text-slate-500">En retard</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-md">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Priorité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes priorités</SelectItem>
                {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Table */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-green-600" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Aucune tâche trouvée</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tâche</TableHead>
                  <TableHead>Assignée à</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Priorité</TableHead>
                  <TableHead>Progression</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map((task) => (
                  <TableRow 
                    key={task.id}
                    className={isOverdue(task.dueDate, task.status) ? 'bg-red-50' : ''}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{task.title}</p>
                        {task.description && (
                          <p className="text-sm text-slate-500 line-clamp-1">{task.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {task.assignedToName || <span className="text-slate-400">Non assignée</span>}
                    </TableCell>
                    <TableCell>
                      <div className={`flex items-center gap-1 ${isOverdue(task.dueDate, task.status) ? 'text-red-600' : ''}`}>
                        <Calendar className="w-4 h-4" />
                        {format(new Date(task.dueDate), 'd MMM yyyy', { locale: fr })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[task.status]}>
                        {STATUS_LABELS[task.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={PRIORITY_COLORS[task.priority]}>
                        {PRIORITY_LABELS[task.priority]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="w-24">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span>{task.progress}%</span>
                        </div>
                        <Progress value={task.progress} className="h-2" />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleView(task)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(task)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(task.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Task Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewingTask?.title}</DialogTitle>
            <DialogDescription>Détails de la tâche</DialogDescription>
          </DialogHeader>
          {viewingTask && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-500">Statut</Label>
                  <div className="mt-1">
                    <Badge className={STATUS_COLORS[viewingTask.status]}>
                      {STATUS_LABELS[viewingTask.status]}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-slate-500">Priorité</Label>
                  <div className="mt-1">
                    <Badge className={PRIORITY_COLORS[viewingTask.priority]}>
                      {PRIORITY_LABELS[viewingTask.priority]}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-slate-500">Date de début</Label>
                  <p className="mt-1">{format(new Date(viewingTask.startDate), 'd MMMM yyyy', { locale: fr })}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Date d&apos;échéance</Label>
                  <p className={`mt-1 ${isOverdue(viewingTask.dueDate, viewingTask.status) ? 'text-red-600 font-medium' : ''}`}>
                    {format(new Date(viewingTask.dueDate), 'd MMMM yyyy', { locale: fr })}
                  </p>
                </div>
                <div>
                  <Label className="text-slate-500">Assignée à</Label>
                  <p className="mt-1">{viewingTask.assignedToName || 'Non assignée'}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Créée par</Label>
                  <p className="mt-1">{viewingTask.createdByName || 'N/A'}</p>
                </div>
              </div>

              {viewingTask.description && (
                <div>
                  <Label className="text-slate-500">Description</Label>
                  <p className="mt-1 text-slate-700 whitespace-pre-line">{viewingTask.description}</p>
                </div>
              )}

              {viewingTask.progress > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-slate-500">Progression</Label>
                    <span className="text-sm font-medium">{viewingTask.progress}%</span>
                  </div>
                  <Progress value={viewingTask.progress} className="h-3" />
                </div>
              )}

              {viewingTask.attachments && (
                <div>
                  <Label className="text-slate-500">Pièces jointes</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {JSON.parse(viewingTask.attachments).map((file: string, i: number) => (
                      <Button key={i} variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        {file}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
