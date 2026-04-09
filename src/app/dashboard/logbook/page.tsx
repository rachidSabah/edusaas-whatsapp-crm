'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  BookOpen,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  Calendar,
  MapPin,
  Users,
  FileText,
  Loader2,
  Filter,
  Bell,
  BellOff,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Student {
  id: string;
  fullName: string;
  groupId: string | null;
}

interface LogEntry {
  id: string;
  studentId: string;
  studentName?: string;
  groupName?: string;
  type: string;
  category: string;
  date: string;
  time: string;
  description: string;
  severity: string;
  status: string;
  actionTaken: string | null;
  followUpRequired: number;
  followUpDate: string | null;
  followUpNotes: string | null;
  reportedByName: string | null;
  witnessNames: string | null;
  location: string | null;
  parentNotified: number;
  parentNotifiedAt: string | null;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

const LOG_TYPES = [
  { value: 'incident', label: 'Incident', color: 'bg-red-100 text-red-700' },
  { value: 'disciplinary', label: 'Disciplinaire', color: 'bg-orange-100 text-orange-700' },
  { value: 'behavioral', label: 'Comportement', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'academic', label: 'Académique', color: 'bg-blue-100 text-blue-700' },
  { value: 'attendance', label: 'Absence/Retard', color: 'bg-purple-100 text-purple-700' },
  { value: 'positive', label: 'Positive', color: 'bg-green-100 text-green-700' },
];

const CATEGORIES = [
  { value: 'general', label: 'Général' },
  { value: 'disruption', label: 'Trouble de classe' },
  { value: 'fighting', label: 'Bagarre/Violence' },
  { value: 'bullying', label: 'Harcèlement' },
  { value: 'cheating', label: 'Tricherie' },
  { value: 'damage', label: 'Dégradation' },
  { value: 'theft', label: 'Vol' },
  { value: 'insubordination', label: 'Insubordination' },
  { value: 'dress_code', label: 'Code vestimentaire' },
  { value: 'late', label: 'Retard' },
  { value: 'absence', label: 'Absence non justifiée' },
  { value: 'achievement', label: 'Réussite/Mérite' },
  { value: 'help', label: 'Aide/Engagement' },
  { value: 'other', label: 'Autre' },
];

const SEVERITY_LEVELS = [
  { value: 'low', label: 'Faible', color: 'bg-slate-100 text-slate-700' },
  { value: 'normal', label: 'Normal', color: 'bg-blue-100 text-blue-700' },
  { value: 'high', label: 'Élevé', color: 'bg-orange-100 text-orange-700' },
  { value: 'critical', label: 'Critique', color: 'bg-red-100 text-red-700' },
];

const STATUS_OPTIONS = [
  { value: 'open', label: 'Ouvert', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'investigating', label: 'En cours', color: 'bg-blue-100 text-blue-700' },
  { value: 'resolved', label: 'Résolu', color: 'bg-green-100 text-green-700' },
  { value: 'closed', label: 'Fermé', color: 'bg-slate-100 text-slate-700' },
];

export default function LogBookPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null);
  const [viewingLog, setViewingLog] = useState<LogEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    studentId: '',
    type: 'incident',
    category: 'general',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    description: '',
    severity: 'normal',
    status: 'open',
    actionTaken: '',
    followUpRequired: false,
    followUpDate: '',
    followUpNotes: '',
    reportedByName: '',
    witnessNames: '',
    location: '',
    parentNotified: false,
    resolution: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const logsRes = await fetch('/api/student-logs');
      const logsData = await logsRes.json();
      setLogs(logsData.logs || []);

      const studentsRes = await fetch('/api/students');
      const studentsData = await studentsRes.json();
      setStudents(studentsData.students || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage({ type: 'error', text: 'Erreur lors du chargement des données' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const url = '/api/student-logs';
      const method = editingLog ? 'PUT' : 'POST';

      const body = editingLog
        ? { ...formData, id: editingLog.id }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        setDialogOpen(false);
        setEditingLog(null);
        resetForm();
        setMessage({ type: 'success', text: editingLog ? 'Entrée modifiée avec succès' : 'Entrée créée avec succès' });
        await fetchData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Erreur lors de la sauvegarde' });
      }
    } catch (error) {
      console.error('Save error:', error);
      setMessage({ type: 'error', text: 'Erreur de connexion au serveur' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette entrée?')) return;

    try {
      const response = await fetch(`/api/student-logs?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Entrée supprimée' });
        fetchData();
      }
    } catch (error) {
      console.error('Delete error:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la suppression' });
    }
  };

  const handleEdit = (log: LogEntry) => {
    setEditingLog(log);
    setFormData({
      studentId: log.studentId,
      type: log.type,
      category: log.category || 'general',
      date: log.date,
      time: log.time,
      description: log.description,
      severity: log.severity,
      status: log.status,
      actionTaken: log.actionTaken || '',
      followUpRequired: log.followUpRequired === 1,
      followUpDate: log.followUpDate || '',
      followUpNotes: log.followUpNotes || '',
      reportedByName: log.reportedByName || '',
      witnessNames: log.witnessNames || '',
      location: log.location || '',
      parentNotified: log.parentNotified === 1,
      resolution: log.resolution || '',
    });
    setDialogOpen(true);
  };

  const handleView = (log: LogEntry) => {
    setViewingLog(log);
    setViewDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      studentId: '',
      type: 'incident',
      category: 'general',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      description: '',
      severity: 'normal',
      status: 'open',
      actionTaken: '',
      followUpRequired: false,
      followUpDate: '',
      followUpNotes: '',
      reportedByName: '',
      witnessNames: '',
      location: '',
      parentNotified: false,
      resolution: '',
    });
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.studentName?.toLowerCase().includes(search.toLowerCase()) ||
      log.description.toLowerCase().includes(search.toLowerCase());

    const matchesType = filterType === 'all' || log.type === filterType;
    const matchesStatus = filterStatus === 'all' || log.status === filterStatus;
    const matchesTab = activeTab === 'all' || log.type === activeTab;

    return matchesSearch && matchesType && matchesStatus && matchesTab;
  });

  const getTypeBadge = (type: string) => {
    const typeInfo = LOG_TYPES.find((t) => t.value === type);
    return (
      <Badge className={typeInfo?.color || 'bg-slate-100 text-slate-700'}>
        {typeInfo?.label || type}
      </Badge>
    );
  };

  const getSeverityBadge = (severity: string) => {
    const sevInfo = SEVERITY_LEVELS.find((s) => s.value === severity);
    return (
      <Badge className={sevInfo?.color || 'bg-slate-100 text-slate-700'}>
        {sevInfo?.label || severity}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusInfo = STATUS_OPTIONS.find((s) => s.value === status);
    return (
      <Badge className={statusInfo?.color || 'bg-slate-100 text-slate-700'}>
        {statusInfo?.label || status}
      </Badge>
    );
  };

  // Stats
  const stats = {
    total: logs.length,
    open: logs.filter((l) => l.status === 'open').length,
    critical: logs.filter((l) => l.severity === 'critical').length,
    followUp: logs.filter((l) => l.followUpRequired === 1 && l.status !== 'closed').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-green-600" />
            Cahier de Texte
          </h1>
          <p className="text-slate-600">Gérez les incidents et rapports disciplinaires</p>
        </div>
        <Button
          className="bg-gradient-to-r from-green-500 to-emerald-600"
          onClick={() => {
            setEditingLog(null);
            resetForm();
            setDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle entrée
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-slate-500">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.open}</p>
                <p className="text-sm text-slate-500">Ouverts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.critical}</p>
                <p className="text-sm text-slate-500">Critiques</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Bell className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.followUp}</p>
                <p className="text-sm text-slate-500">Suivis</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Message */}
      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}
          className={message.type === 'success' ? 'border-green-500 bg-green-50' : ''}>
          {message.type === 'success' ? <CheckCircle className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4" />}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="all">Tous</TabsTrigger>
          <TabsTrigger value="incident">Incidents</TabsTrigger>
          <TabsTrigger value="disciplinary">Discipline</TabsTrigger>
          <TabsTrigger value="behavioral">Comportement</TabsTrigger>
          <TabsTrigger value="academic">Académique</TabsTrigger>
          <TabsTrigger value="attendance">Présence</TabsTrigger>
          <TabsTrigger value="positive">Positif</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {/* Filters */}
          <Card className="border-0 shadow-md mb-6">
            <CardContent className="py-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Rechercher par étudiant ou description..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-full md:w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous types</SelectItem>
                    {LOG_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous statuts</SelectItem>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="border-0 shadow-md">
            <CardContent className="p-0">
              {loading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 mx-auto animate-spin text-green-600" />
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Aucune entrée trouvée</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Étudiant</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Sévérité</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {format(new Date(log.date), 'dd MMM yyyy', { locale: fr })}
                            </p>
                            <p className="text-xs text-slate-500">{log.time}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{log.studentName}</p>
                            {log.groupName && (
                              <p className="text-xs text-slate-500">{log.groupName}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getTypeBadge(log.type)}</TableCell>
                        <TableCell>
                          <p className="max-w-xs truncate">{log.description}</p>
                        </TableCell>
                        <TableCell>{getSeverityBadge(log.severity)}</TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Voir détails"
                              onClick={() => handleView(log)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Modifier"
                              onClick={() => handleEdit(log)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500"
                              title="Supprimer"
                              onClick={() => handleDelete(log.id)}
                            >
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
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingLog ? 'Modifier l\'entrée' : 'Nouvelle entrée'}
            </DialogTitle>
            <DialogDescription>
              Remplissez les informations de l'incident ou du rapport
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              {/* Student Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Étudiant *</Label>
                  <Select
                    value={formData.studentId}
                    onValueChange={(v) => setFormData({ ...formData, studentId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un étudiant" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) => setFormData({ ...formData, type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LOG_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Category and Severity */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Catégorie</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) => setFormData({ ...formData, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sévérité</Label>
                  <Select
                    value={formData.severity}
                    onValueChange={(v) => setFormData({ ...formData, severity: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEVERITY_LEVELS.map((sev) => (
                        <SelectItem key={sev.value} value={sev.value}>
                          {sev.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Heure *</Label>
                  <Input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label>Lieu</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Ex: Salle 101, Cour de récréation..."
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Décrivez l'incident en détail..."
                  rows={4}
                />
              </div>

              {/* Reported By and Witnesses */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Rapporté par</Label>
                  <Input
                    value={formData.reportedByName}
                    onChange={(e) => setFormData({ ...formData, reportedByName: e.target.value })}
                    placeholder="Nom de la personne"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Témoins</Label>
                  <Input
                    value={formData.witnessNames}
                    onChange={(e) => setFormData({ ...formData, witnessNames: e.target.value })}
                    placeholder="Noms des témoins"
                  />
                </div>
              </div>

              <Separator />

              {/* Action Taken */}
              <div className="space-y-2">
                <Label>Action prise</Label>
                <Textarea
                  value={formData.actionTaken}
                  onChange={(e) => setFormData({ ...formData, actionTaken: e.target.value })}
                  placeholder="Décrivez les actions prises..."
                  rows={2}
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Parent Notification */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium">Parents notifiés</p>
                  <p className="text-sm text-slate-500">Les parents ont été informés de cet incident</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.parentNotified}
                  onChange={(e) => setFormData({ ...formData, parentNotified: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
              </div>

              {/* Follow Up */}
              <div className="space-y-3 p-3 bg-amber-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Suivi requis</p>
                    <p className="text-sm text-slate-500">Cette affaire nécessite un suivi</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.followUpRequired}
                    onChange={(e) => setFormData({ ...formData, followUpRequired: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                </div>
                {formData.followUpRequired && (
                  <div className="space-y-2">
                    <Label>Date de suivi</Label>
                    <Input
                      type="date"
                      value={formData.followUpDate}
                      onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                    />
                    <Label>Notes de suivi</Label>
                    <Textarea
                      value={formData.followUpNotes}
                      onChange={(e) => setFormData({ ...formData, followUpNotes: e.target.value })}
                      placeholder="Notes pour le suivi..."
                      rows={2}
                    />
                  </div>
                )}
              </div>

              {/* Resolution */}
              {editingLog && (
                <div className="space-y-2">
                  <Label>Résolution</Label>
                  <Textarea
                    value={formData.resolution}
                    onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                    placeholder="Comment l'incident a été résolu..."
                    rows={2}
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={saving} className="bg-green-600">
                {saving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enregistrement...</>
                ) : (
                  editingLog ? 'Modifier' : 'Créer'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-green-600" />
              Détails de l'entrée
            </DialogTitle>
          </DialogHeader>

          {viewingLog && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <User className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-lg">{viewingLog.studentName}</p>
                  {viewingLog.groupName && (
                    <p className="text-sm text-slate-500">{viewingLog.groupName}</p>
                  )}
                </div>
                <div className="ml-auto flex gap-2">
                  {getTypeBadge(viewingLog.type)}
                  {getSeverityBadge(viewingLog.severity)}
                  {getStatusBadge(viewingLog.status)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>{format(new Date(viewingLog.date), 'dd MMMM yyyy', { locale: fr })} à {viewingLog.time}</span>
                </div>
                {viewingLog.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>{viewingLog.location}</span>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-slate-500">Description</Label>
                <p className="mt-1 whitespace-pre-wrap">{viewingLog.description}</p>
              </div>

              {viewingLog.reportedByName && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="text-sm">Rapporté par: <strong>{viewingLog.reportedByName}</strong></span>
                </div>
              )}

              {viewingLog.witnessNames && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="text-sm">Témoins: <strong>{viewingLog.witnessNames}</strong></span>
                </div>
              )}

              {viewingLog.actionTaken && (
                <div>
                  <Label className="text-slate-500">Action prise</Label>
                  <p className="mt-1">{viewingLog.actionTaken}</p>
                </div>
              )}

              <div className="flex gap-4">
                {viewingLog.parentNotified === 1 ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <Bell className="w-4 h-4" />
                    <span className="text-sm">Parents notifiés</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-slate-400">
                    <BellOff className="w-4 h-4" />
                    <span className="text-sm">Parents non notifiés</span>
                  </div>
                )}
              </div>

              {viewingLog.followUpRequired === 1 && (
                <div className="p-3 bg-amber-50 rounded-lg">
                  <p className="font-medium text-amber-800">Suivi requis</p>
                  {viewingLog.followUpDate && (
                    <p className="text-sm text-amber-700">Date: {viewingLog.followUpDate}</p>
                  )}
                  {viewingLog.followUpNotes && (
                    <p className="text-sm text-amber-700 mt-1">{viewingLog.followUpNotes}</p>
                  )}
                </div>
              )}

              {viewingLog.resolution && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <Label className="text-green-700">Résolution</Label>
                  <p className="mt-1 text-green-800">{viewingLog.resolution}</p>
                </div>
              )}

              <p className="text-xs text-slate-400">
                Créé le {format(new Date(viewingLog.createdAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Fermer
            </Button>
            {viewingLog && (
              <Button
                className="bg-green-600"
                onClick={() => {
                  setViewDialogOpen(false);
                  handleEdit(viewingLog);
                }}
              >
                Modifier
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
