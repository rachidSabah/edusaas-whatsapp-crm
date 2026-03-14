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
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { 
  ClipboardList, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  User,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Task {
  id: string;
  title: string;
  description: string | null;
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

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminé',
  OVERDUE: 'En retard',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-700',
  MEDIUM: 'bg-orange-100 text-orange-700',
  HIGH: 'bg-red-100 text-red-700',
  URGENT: 'bg-red-200 text-red-800',
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Basse',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute',
  URGENT: 'Urgente',
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'my' | 'all'>('my');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (viewMode === 'my') params.append('me', 'true');

      const response = await fetch(`/api/tasks?${params}`);
      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, viewMode]);

  const handleViewTask = (task: Task) => {
    setSelectedTask(task);
    setDetailOpen(true);
  };

  const handleUpdateStatus = async (taskId: string, newStatus: string, progress?: number) => {
    setUpdating(true);
    try {
      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, status: newStatus, progress }),
      });

      if (response.ok) {
        fetchTasks();
        if (selectedTask?.id === taskId) {
          const data = await response.json();
          setSelectedTask(data.task);
        }
      }
    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => (
    <Badge className={STATUS_COLORS[status] || STATUS_COLORS.PENDING}>
      {STATUS_LABELS[status] || status}
    </Badge>
  );

  const getPriorityBadge = (priority: string) => (
    <Badge className={PRIORITY_COLORS[priority] || PRIORITY_COLORS.MEDIUM}>
      {PRIORITY_LABELS[priority] || priority}
    </Badge>
  );

  const isOverdue = (dueDate: string, status: string) => {
    return status !== 'COMPLETED' && new Date(dueDate) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Mes Tâches</h1>
          <p className="text-slate-600">Gérez vos tâches et suivez votre progression</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'my' ? 'default' : 'outline'}
            onClick={() => setViewMode('my')}
            className={viewMode === 'my' ? 'bg-green-600' : ''}
          >
            Mes tâches
          </Button>
          <Button
            variant={viewMode === 'all' ? 'default' : 'outline'}
            onClick={() => setViewMode('all')}
            className={viewMode === 'all' ? 'bg-green-600' : ''}
          >
            Toutes
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tasks.filter(t => t.status === 'PENDING').length}</p>
                <p className="text-sm text-slate-500">En attente</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tasks.filter(t => t.status === 'IN_PROGRESS').length}</p>
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
                <p className="text-2xl font-bold">{tasks.filter(t => t.status === 'COMPLETED').length}</p>
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
                <p className="text-2xl font-bold">{tasks.filter(t => t.status === 'OVERDUE' || isOverdue(t.dueDate, t.status)).length}</p>
                <p className="text-sm text-slate-500">En retard</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card className="border-0 shadow-md">
        <CardContent className="pt-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="PENDING">En attente</SelectItem>
              <SelectItem value="IN_PROGRESS">En cours</SelectItem>
              <SelectItem value="COMPLETED">Terminé</SelectItem>
              <SelectItem value="OVERDUE">En retard</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-green-600" />
          </div>
        ) : tasks.length === 0 ? (
          <Card className="border-0 shadow-md">
            <CardContent className="py-12">
              <div className="text-center text-slate-500">
                <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucune tâche trouvée</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          tasks.map((task) => (
            <Card 
              key={task.id} 
              className={`border-0 shadow-md cursor-pointer transition-all hover:shadow-lg ${
                isOverdue(task.dueDate, task.status) ? 'border-l-4 border-l-red-500' : ''
              }`}
              onClick={() => handleViewTask(task)}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{task.title}</h3>
                      {getStatusBadge(task.status)}
                      {getPriorityBadge(task.priority)}
                    </div>
                    {task.description && (
                      <p className="text-slate-600 text-sm mb-3 line-clamp-2">{task.description}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Échéance: {format(new Date(task.dueDate), 'd MMM yyyy', { locale: fr })}</span>
                      </div>
                      {task.assignedToName && (
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>Assigné à: {task.assignedToName}</span>
                        </div>
                      )}
                    </div>
                    {task.status !== 'PENDING' && task.progress > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>Progression</span>
                          <span>{task.progress}%</span>
                        </div>
                        <Progress value={task.progress} className="h-2" />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Task Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedTask?.title}</DialogTitle>
            <DialogDescription>Détails de la tâche</DialogDescription>
          </DialogHeader>
          
          {selectedTask && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-500">Statut</Label>
                  <div className="mt-1">{getStatusBadge(selectedTask.status)}</div>
                </div>
                <div>
                  <Label className="text-slate-500">Priorité</Label>
                  <div className="mt-1">{getPriorityBadge(selectedTask.priority)}</div>
                </div>
                <div>
                  <Label className="text-slate-500">Date de début</Label>
                  <p className="mt-1">{format(new Date(selectedTask.startDate), 'd MMMM yyyy', { locale: fr })}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Date d'échéance</Label>
                  <p className={`mt-1 ${isOverdue(selectedTask.dueDate, selectedTask.status) ? 'text-red-600 font-medium' : ''}`}>
                    {format(new Date(selectedTask.dueDate), 'd MMMM yyyy', { locale: fr })}
                  </p>
                </div>
              </div>

              {selectedTask.description && (
                <div>
                  <Label className="text-slate-500">Description</Label>
                  <p className="mt-1 text-slate-700">{selectedTask.description}</p>
                </div>
              )}

              {selectedTask.assignedToName && (
                <div>
                  <Label className="text-slate-500">Assigné à</Label>
                  <p className="mt-1">{selectedTask.assignedToName}</p>
                </div>
              )}

              {selectedTask.status !== 'PENDING' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-slate-500">Progression</Label>
                    <span className="text-sm font-medium">{selectedTask.progress}%</span>
                  </div>
                  <Progress value={selectedTask.progress} className="h-3" />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                {selectedTask.status === 'PENDING' && (
                  <Button
                    onClick={() => handleUpdateStatus(selectedTask.id, 'IN_PROGRESS', 10)}
                    disabled={updating}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {updating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Commencer
                  </Button>
                )}
                {selectedTask.status === 'IN_PROGRESS' && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleUpdateStatus(selectedTask.id, 'IN_PROGRESS', Math.min((selectedTask.progress || 0) + 25, 100))}
                      disabled={updating}
                    >
                      +25% Progression
                    </Button>
                    <Button
                      onClick={() => handleUpdateStatus(selectedTask.id, 'COMPLETED', 100)}
                      disabled={updating}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Marquer terminé
                    </Button>
                  </>
                )}
                {(selectedTask.status === 'OVERDUE' || isOverdue(selectedTask.dueDate, selectedTask.status)) && (
                  <Button
                    onClick={() => handleUpdateStatus(selectedTask.id, 'IN_PROGRESS', selectedTask.progress || 10)}
                    disabled={updating}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    Reprendre
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
