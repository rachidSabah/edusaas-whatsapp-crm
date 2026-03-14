'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { 
  Send, Users, MessageSquare, Search, Loader2, 
  CheckCircle, XCircle, AlertCircle, DollarSign, FileText
} from 'lucide-react';

interface Student {
  id: string;
  fullName: string;
  groupName: string | null;
  parent1Name: string | null;
  parent1Phone: string | null;
  parent1Whatsapp: number;
  parent2Name: string | null;
  parent2Phone: string | null;
  parent2Whatsapp: number;
}

interface Template {
  id: string;
  name: string;
  category: string;
  content: string;
  signature: string | null;
}

interface Group {
  id: string;
  name: string;
}

const MESSAGE_TYPES = [
  { value: 'PAYMENT_DELAY', label: 'Retard de paiement', icon: DollarSign, color: 'text-orange-600' },
  { value: 'ADMIN_MESSAGE', label: 'Message administratif', icon: FileText, color: 'text-blue-600' },
  { value: 'CUSTOM', label: 'Message personnalisé', icon: MessageSquare, color: 'text-green-600' },
];

export default function MessagingPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [messageType, setMessageType] = useState<string>('CUSTOM');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customMessage, setCustomMessage] = useState('');
  const [resultDialog, setResultDialog] = useState<{
    open: boolean;
    success: number;
    failed: number;
    results: { studentName: string; parentName: string; phone: string; success: boolean }[];
  }>({ open: false, success: 0, failed: 0, results: [] });

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/groups');
      const data = await response.json();
      setGroups(data.groups || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      const data = await response.json();
      // Include all relevant template categories for messaging
      const relevantCategories = [
        'PAYMENT_REMINDER', 
        'ADMIN_COMMUNICATION', 
        'GENERAL',
        'ABSENCE_NOTIFICATION',
        'LATE_NOTIFICATION'
      ];
      setTemplates((data.templates || []).filter((t: Template) => 
        relevantCategories.includes(t.category)
      ));
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('status', 'ACTIVE');
      if (selectedGroup && selectedGroup !== 'all') {
        params.append('groupId', selectedGroup);
      }
      if (search) {
        params.append('search', search);
      }

      const response = await fetch(`/api/students?${params}`);
      const data = await response.json();
      
      // Filter students who have at least one parent with WhatsApp enabled
      const studentsWithWhatsApp = (data.students || []).filter((s: Student) => 
        (s.parent1Phone && s.parent1Whatsapp === 1) || (s.parent2Phone && s.parent2Whatsapp === 1)
      );
      
      setStudents(studentsWithWhatsApp);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
    fetchTemplates();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [selectedGroup, search]);

  const toggleStudent = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const toggleAll = () => {
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(students.map(s => s.id)));
    }
  };

  const handleSendMessage = async () => {
    if (selectedStudents.size === 0) return;

    setSending(true);
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: Array.from(selectedStudents),
          message: messageType === 'CUSTOM' ? customMessage : undefined,
          templateId: messageType !== 'CUSTOM' ? selectedTemplate : undefined,
          messageType,
        }),
      });

      const data = await response.json();
      
      setResultDialog({
        open: true,
        success: data.totalSent || 0,
        failed: (data.totalAttempted || 0) - (data.totalSent || 0),
        results: data.results || [],
      });

      if (data.totalSent > 0) {
        setSelectedStudents(new Set());
      }
    } catch (error) {
      console.error('Error sending messages:', error);
    } finally {
      setSending(false);
    }
  };

  const canSend = () => {
    if (selectedStudents.size === 0) return false;
    if (messageType === 'CUSTOM' && !customMessage.trim()) return false;
    if (messageType !== 'CUSTOM' && !selectedTemplate) return false;
    return true;
  };

  const getWhatsAppCount = (student: Student) => {
    let count = 0;
    if (student.parent1Phone && student.parent1Whatsapp === 1) count++;
    if (student.parent2Phone && student.parent2Whatsapp === 1) count++;
    return count;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Envoi de messages</h1>
          <p className="text-slate-600">Envoyez des messages WhatsApp aux parents</p>
        </div>
        <Button
          onClick={handleSendMessage}
          disabled={!canSend() || sending}
          className="bg-gradient-to-r from-green-500 to-emerald-600"
        >
          {sending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Envoi en cours...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Envoyer ({selectedStudents.size} sélectionnés)
            </>
          )}
        </Button>
      </div>

      {/* Message Type Selection */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Type de message</CardTitle>
          <CardDescription>Choisissez le type de message à envoyer</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {MESSAGE_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <Button
                  key={type.value}
                  variant={messageType === type.value ? 'default' : 'outline'}
                  className={`h-auto py-4 flex flex-col gap-2 ${messageType === type.value ? 'bg-green-600 hover:bg-green-700' : ''}`}
                  onClick={() => setMessageType(type.value)}
                >
                  <Icon className={`w-6 h-6 ${messageType === type.value ? 'text-white' : type.color}`} />
                  <span className="text-sm">{type.label}</span>
                </Button>
              );
            })}
          </div>

          {messageType === 'CUSTOM' ? (
            <div className="space-y-2">
              <Label>Message personnalisé</Label>
              <Textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Tapez votre message ici..."
                rows={5}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Template de message</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

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
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tous les groupes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les groupes</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Students List */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Étudiants avec parents WhatsApp</CardTitle>
              <CardDescription>
                {students.length} étudiant(s) avec au moins un parent configuré pour WhatsApp
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={toggleAll}>
              {selectedStudents.size === students.length ? 'Tout désélectionner' : 'Tout sélectionner'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Étudiant</TableHead>
                <TableHead>Groupe</TableHead>
                <TableHead>Parents WhatsApp</TableHead>
                <TableHead className="text-center">Destinataires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="w-6 h-6 mx-auto animate-spin text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="text-slate-500">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Aucun étudiant avec parent WhatsApp trouvé</p>
                      <p className="text-sm mt-1">
                        Configurez les numéros de téléphone des parents et activez WhatsApp pour envoyer des messages.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                students.map((student) => (
                  <TableRow 
                    key={student.id}
                    className={selectedStudents.has(student.id) ? 'bg-green-50' : ''}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedStudents.has(student.id)}
                        onCheckedChange={() => toggleStudent(student.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{student.fullName}</TableCell>
                    <TableCell>
                      {student.groupName ? (
                        <Badge variant="outline">{student.groupName}</Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {student.parent1Phone && student.parent1Whatsapp === 1 && (
                          <div className="flex items-center gap-2 text-sm">
                            <MessageSquare className="w-3 h-3 text-green-500" />
                            <span>{student.parent1Name || 'Parent 1'}</span>
                            <span className="text-slate-400">({student.parent1Phone})</span>
                          </div>
                        )}
                        {student.parent2Phone && student.parent2Whatsapp === 1 && (
                          <div className="flex items-center gap-2 text-sm">
                            <MessageSquare className="w-3 h-3 text-green-500" />
                            <span>{student.parent2Name || 'Parent 2'}</span>
                            <span className="text-slate-400">({student.parent2Phone})</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-green-100 text-green-700">
                        {getWhatsAppCount(student)} destinataire(s)
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Results Dialog */}
      <Dialog open={resultDialog.open} onOpenChange={(open) => setResultDialog({ ...resultDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Résultat de l'envoi</DialogTitle>
            <DialogDescription>
              {resultDialog.success > 0 && (
                <span className="text-green-600">{resultDialog.success} message(s) envoyé(s) avec succès</span>
              )}
              {resultDialog.failed > 0 && (
                <span className="text-red-600 ml-2">{resultDialog.failed} échec(s)</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Étudiant</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resultDialog.results.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.studentName}</TableCell>
                    <TableCell>{r.parentName}</TableCell>
                    <TableCell>{r.phone}</TableCell>
                    <TableCell>
                      {r.success ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button onClick={() => setResultDialog({ ...resultDialog, open: false })}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
