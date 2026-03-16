'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Calendar as CalendarIcon,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Save,
  Users,
  MessageSquare,
  Send,
  Loader2,
  Bell,
  BellOff,
  UserCheck,
  Search,
  X,
  FileText,
  Download,
  FileDown,
  CalendarDays,
  BookOpen,
  Settings2,
} from 'lucide-react';
import { StudentLogModal } from '@/components/student-log-modal';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface Student {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string | null;
  address: string | null;
  group: { id: string; name: string } | null;
  parent: { id: string; fullName: string; phone: string } | null;
  parent1Name?: string | null;
  parent1Phone?: string | null;
  parent1Whatsapp?: number;
  parent2Name?: string | null;
  parent2Phone?: string | null;
  parent2Whatsapp?: number;
}

interface Group {
  id: string;
  name: string;
}

interface AttendanceRecord {
  id: string;
  studentId: string;
  student: Student;
  date: string;
  status: string;
  notes: string | null;
  parentNotified: boolean;
}

interface NotificationLog {
  id: string;
  studentId: string;
  studentName: string | null;
  phoneNumber: string;
  parentName: string | null;
  message: string;
  messageType: string;
  status: string;
  sentAt: string;
}

interface ScheduleEvent {
  id: string;
  date: string;
  timeSlot: string;
  groupId: string;
  groupName: string;
  courseId: string;
  courseName: string;
  notes: string | null;
}

const statusOptions = [
  { value: 'PRESENT', label: 'Présent', icon: CheckCircle, color: 'text-green-600 bg-green-50' },
  { value: 'ABSENT', label: 'Absent', icon: XCircle, color: 'text-red-600 bg-red-50' },
  { value: 'LATE', label: 'Retard', icon: Clock, color: 'text-yellow-600 bg-yellow-50' },
  { value: 'EXCUSED', label: 'Excusé', icon: AlertCircle, color: 'text-blue-600 bg-blue-50' },
];

const actionOptions = [
  { value: 'ABSENT', label: 'Absence', icon: XCircle, color: 'bg-red-500 hover:bg-red-600 text-white' },
  { value: 'LATE', label: 'Retard', icon: Clock, color: 'bg-yellow-500 hover:bg-yellow-600 text-white' },
  { value: 'ADMIN', label: 'Message Administratif', icon: FileText, color: 'bg-blue-500 hover:bg-blue-600 text-white' },
];

const MONTHS = [
  { value: '01', label: 'Janvier' },
  { value: '02', label: 'Février' },
  { value: '03', label: 'Mars' },
  { value: '04', label: 'Avril' },
  { value: '05', label: 'Mai' },
  { value: '06', label: 'Juin' },
  { value: '07', label: 'Juillet' },
  { value: '08', label: 'Août' },
  { value: '09', label: 'Septembre' },
  { value: '10', label: 'Octobre' },
  { value: '11', label: 'Novembre' },
  { value: '12', label: 'Décembre' },
];

export default function AttendancePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingRecords, setExistingRecords] = useState<AttendanceRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [notificationResults, setNotificationResults] = useState<{
    show: boolean;
    count: number;
    students: string[];
  }>({ show: false, count: 0, students: [] });
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection state
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  
  // Action pop-up state
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [actionStudent, setActionStudent] = useState<Student | null>(null);
  const [adminMessage, setAdminMessage] = useState('');
  const [sendingAdminMessage, setSendingAdminMessage] = useState(false);
  
  // Parent selection state
  const [parentSelection, setParentSelection] = useState<Record<string, 'parent1' | 'parent2' | 'both'>>({});
  
  // Notification history
  const [recentNotifications, setRecentNotifications] = useState<NotificationLog[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Report generation state
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportType, setReportType] = useState<'individual' | 'group'>('individual');
  const [reportMonth, setReportMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [generatingReport, setGeneratingReport] = useState(false);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<string>('');
  
  // Schedule state
  const [todaySchedule, setTodaySchedule] = useState<ScheduleEvent[]>([]);
  const [showSchedule, setShowSchedule] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [selectedStudentForLog, setSelectedStudentForLog] = useState<{id: string, name: string} | null>(null);
  const router = useRouter();

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/groups');
      if (!response.ok) throw new Error('Erreur lors du chargement des groupes');
      const data = await response.json();
      setGroups(data.groups || []);
    } catch (error: any) {
      console.error('Error fetching groups:', error);
      setError(error.message);
    }
  };

  const fetchStudents = async (groupId?: string) => {
    try {
      const params = new URLSearchParams();
      params.append('status', 'ACTIVE');
      if (groupId && groupId !== 'all') params.append('groupId', groupId);

      const response = await fetch(`/api/students?${params}`);
      if (!response.ok) throw new Error('Erreur lors du chargement des étudiants');
      const data = await response.json();
      setStudents(data.students || []);
      setFilteredStudents(data.students || []);
    } catch (error: any) {
      console.error('Error fetching students:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async (date: Date) => {
    try {
      const params = new URLSearchParams();
      params.append('date', format(date, 'yyyy-MM-dd'));
      if (selectedGroup && selectedGroup !== 'all') params.append('groupId', selectedGroup);

      const response = await fetch(`/api/attendance?${params}`);
      if (!response.ok) throw new Error('Erreur lors du chargement des présences');
      const data = await response.json();
      setExistingRecords(data.attendance || []);

      const attendanceMap: Record<string, string> = {};
      const notesMap: Record<string, string> = {};
      (data.attendance || []).forEach((record: AttendanceRecord) => {
        attendanceMap[record.studentId] = record.status;
        if (record.notes) notesMap[record.studentId] = record.notes;
      });
      setAttendance(attendanceMap);
      setNotes(notesMap);
    } catch (error: any) {
      console.error('Error fetching attendance:', error);
    }
  };

  const fetchRecentNotifications = async () => {
    try {
      const response = await fetch('/api/whatsapp/admin?limit=10');
      if (response.ok) {
        const data = await response.json();
        setRecentNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchTodaySchedule = async () => {
    try {
      const params = new URLSearchParams();
      params.append('date', format(new Date(), 'yyyy-MM-dd'));
      
      const response = await fetch(`/api/schedule?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTodaySchedule(data.schedule || []);
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
    }
  };

  useEffect(() => {
    fetchGroups();
    fetchRecentNotifications();
    fetchTodaySchedule();
  }, []);

  useEffect(() => {
    fetchStudents(selectedGroup);
    fetchAttendance(selectedDate);
  }, [selectedGroup, selectedDate]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredStudents(students);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = students.filter(student => 
      student.fullName.toLowerCase().includes(query) ||
      student.firstName.toLowerCase().includes(query) ||
      student.lastName.toLowerCase().includes(query)
    );
    setFilteredStudents(filtered);
  }, [searchQuery, students]);

  const handleStatusChange = (studentId: string, status: string) => {
    setAttendance((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleParentSelectionChange = (studentId: string, selection: 'parent1' | 'parent2' | 'both') => {
    setParentSelection((prev) => ({ ...prev, [studentId]: selection }));
  };

  const handleStudentSelect = (studentId: string, checked: boolean) => {
    setSelectedStudents(prev => {
      const newSet = new Set(prev);
      if (checked) newSet.add(studentId);
      else newSet.delete(studentId);
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedStudents(new Set(filteredStudents.map(s => s.id)));
    else setSelectedStudents(new Set());
  };

  const openActionDialog = (student: Student) => {
    setActionStudent(student);
    setAdminMessage('');
    setShowActionDialog(true);
  };

  const handleAction = async (action: 'ABSENT' | 'LATE' | 'ADMIN') => {
    if (!actionStudent) return;
    if (action === 'ADMIN') return;
    
    await saveAttendance(actionStudent.id, action);
    setShowActionDialog(false);
    setActionStudent(null);
  };

  const saveAttendance = async (studentId: string, status: string, adminMsg?: string) => {
    setSaving(true);
    try {
      const records = [{
        studentId,
        date: format(selectedDate, 'yyyy-MM-dd'),
        status,
        notes: adminMsg || notes[studentId] || null,
        groupId: selectedGroup !== 'all' ? selectedGroup : undefined,
        sendWhatsApp: sendWhatsApp && (status === 'ABSENT' || status === 'LATE'),
        notifyParents: parentSelection[studentId] || undefined,
      }];

      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records }),
      });

      if (response.ok) {
        const data = await response.json();
        setAttendance(prev => ({ ...prev, [studentId]: status }));
        fetchAttendance(selectedDate);
        fetchRecentNotifications();
        
        if (data.notificationsSent && data.notificationsSent.length > 0) {
          setNotificationResults({
            show: true,
            count: data.notificationsSent.length,
            students: data.notificationsSent.map((n: any) => n.studentName),
          });
          setTimeout(() => setNotificationResults({ show: false, count: 0, students: [] }), 5000);
        }
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
    } finally {
      setSaving(false);
    }
  };

  const sendAdminMessage = async () => {
    if (!actionStudent || !adminMessage.trim()) return;
    
    setSendingAdminMessage(true);
    try {
      const response = await fetch('/api/whatsapp/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: [actionStudent.id],
          messageType: 'ADMIN_COMMUNICATION',
          customMessage: adminMessage,
          notifyParents: parentSelection[actionStudent.id] || 'both',
        }),
      });

      if (response.ok) {
        fetchRecentNotifications();
        setShowActionDialog(false);
        setActionStudent(null);
        setAdminMessage('');
      }
    } catch (error) {
      console.error('Error sending admin message:', error);
    } finally {
      setSendingAdminMessage(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setNotificationResults({ show: false, count: 0, students: [] });
    
    try {
      const records = Object.entries(attendance)
        .filter(([studentId]) => selectedStudents.size === 0 || selectedStudents.has(studentId))
        .map(([studentId, status]) => ({
          studentId,
          date: format(selectedDate, 'yyyy-MM-dd'),
          status,
          notes: notes[studentId] || null,
          groupId: selectedGroup !== 'all' ? selectedGroup : undefined,
          sendWhatsApp: sendWhatsApp && (status === 'ABSENT' || status === 'LATE'),
          notifyParents: parentSelection[studentId] || undefined,
        }));

      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records }),
      });

      if (response.ok) {
        const data = await response.json();
        fetchAttendance(selectedDate);
        fetchRecentNotifications();
        
        if (data.notificationsSent && data.notificationsSent.length > 0) {
          setNotificationResults({
            show: true,
            count: data.notificationsSent.length,
            students: data.notificationsSent.map((n: any) => n.studentName),
          });
        }
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
    } finally {
      setSaving(false);
    }
  };

  const generateReport = async () => {
    setGeneratingReport(true);
    try {
      const params = new URLSearchParams();
      
      if (reportType === 'individual') {
        if (!selectedStudentForReport) {
          alert('Veuillez sélectionner un étudiant');
          setGeneratingReport(false);
          return;
        }
        params.append('studentId', selectedStudentForReport);
      } else {
        if (!selectedGroup || selectedGroup === 'all') {
          alert('Veuillez sélectionner un groupe');
          setGeneratingReport(false);
          return;
        }
        params.append('groupId', selectedGroup);
      }
      
      params.append('month', reportMonth);

      const response = await fetch(`/api/attendance/report?${params}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'rapport_presence.docx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setShowReportDialog(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Erreur lors de la génération du rapport');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Erreur lors de la génération du rapport');
    } finally {
      setGeneratingReport(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const option = statusOptions.find((o) => o.value === status);
    if (!option) return null;
    return (
      <Badge className={option.color}>
        <option.icon className="w-3 h-3 mr-1" />
        {option.label}
      </Badge>
    );
  };

  const hasWhatsAppParents = (student: Student) => {
    return (student.parent1Whatsapp === 1 && student.parent1Phone) || 
           (student.parent2Whatsapp === 1 && student.parent2Phone);
  };

  const getWhatsAppParentsCount = (student: Student) => {
    let count = 0;
    if (student.parent1Whatsapp === 1 && student.parent1Phone) count++;
    if (student.parent2Whatsapp === 1 && student.parent2Phone) count++;
    return count;
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Présences</h1>
          <p className="text-slate-600">Marquez les présences des étudiants</p>
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
          <h1 className="text-3xl font-bold text-slate-900">Présences</h1>
          <p className="text-slate-600">Marquez les présences des étudiants</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* WhatsApp Toggle */}
          <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg border border-green-200">
            <Checkbox
              id="sendWhatsApp"
              checked={sendWhatsApp}
              onCheckedChange={(checked) => setSendWhatsApp(checked as boolean)}
            />
            <label htmlFor="sendWhatsApp" className="text-sm text-green-700 flex items-center gap-1 cursor-pointer">
              {sendWhatsApp ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              WhatsApp {sendWhatsApp ? 'activé' : 'désactivé'}
            </label>
          </div>
          
          {/* Schedule Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSchedule(!showSchedule)}
            className="relative"
          >
            <CalendarDays className="w-4 h-4 mr-2" />
            Emploi du temps
            {todaySchedule.length > 0 && (
              <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {todaySchedule.length}
              </Badge>
            )}
          </Button>
          
          {/* Notifications Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Notifications
            {recentNotifications.length > 0 && (
              <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {recentNotifications.length}
              </Badge>
            )}
          </Button>
          
          {/* Report Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowReportDialog(true)}
            className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
          >
            <FileDown className="w-4 h-4 mr-2" />
            Rapport
          </Button>
          
          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={saving || students.length === 0}
            className="bg-gradient-to-r from-green-500 to-emerald-600"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Enregistrer
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Notification Success */}
      {notificationResults.show && (
        <Card className="border-0 shadow-md bg-green-50 border-green-200">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Send className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-800">
                  {notificationResults.count} message(s) WhatsApp envoyé(s)
                </p>
                <p className="text-sm text-green-600">
                  Parents notifiés: {notificationResults.students.join(', ')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Schedule Panel */}
      {showSchedule && (
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-blue-600" />
              Emploi du temps du jour
            </CardTitle>
            <CardDescription>{format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}</CardDescription>
          </CardHeader>
          <CardContent>
            {todaySchedule.length === 0 ? (
              <p className="text-slate-500 text-center py-4">Aucun cours programmé aujourd'hui</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {todaySchedule.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium">{event.courseName}</p>
                      <p className="text-sm text-slate-500">{event.groupName}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{event.timeSlot}</Badge>
                      <p className="text-xs text-slate-400 mt-1">{event.notes}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Notifications Panel */}
      {showNotifications && recentNotifications.length > 0 && (
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-600" />
              Notifications récentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {recentNotifications.map((notif) => (
                <div key={notif.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-sm">
                  <div>
                    <p className="font-medium">{notif.studentName || 'Étudiant'}</p>
                    <p className="text-slate-500 text-xs">{notif.parentName} • {notif.phoneNumber}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={notif.status === 'sent' ? 'default' : 'secondary'} className="text-xs">
                      {notif.messageType}
                    </Badge>
                    <p className="text-slate-400 text-xs mt-1">
                      {new Date(notif.sentAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="border-0 shadow-md">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search by name */}
            <div className="flex-1 space-y-2">
              <Label>Rechercher un étudiant</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Nom de l'étudiant..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[200px] justify-start">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {format(selectedDate, 'd MMMM yyyy', { locale: fr })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Groupe</Label>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger className="w-[200px]">
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
          </div>
        </CardContent>
      </Card>

      {/* Attendance Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statusOptions.map((option) => {
          const count = Object.values(attendance).filter((s) => s === option.value).length;
          return (
            <Card key={option.value} className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', option.color)}>
                    <option.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-sm text-slate-500">{option.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Attendance Table */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Liste des étudiants</CardTitle>
              <CardDescription>
                {filteredStudents.length} étudiant(s) - {format(selectedDate, 'd MMMM yyyy', { locale: fr })}
                {selectedStudents.size > 0 && ` • ${selectedStudents.size} sélectionné(s)`}
              </CardDescription>
            </div>
            {selectedStudents.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedStudents(new Set())}
              >
                <X className="w-4 h-4 mr-2" />
                Effacer la sélection
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={filteredStudents.length > 0 && selectedStudents.size === filteredStudents.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Étudiant</TableHead>
                  <TableHead>Groupe</TableHead>
                  <TableHead>Parents / WhatsApp</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Notifier</TableHead>
                  <TableHead>État</TableHead>
                  <TableHead>Actions rapides</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Loader2 className="w-6 h-6 mx-auto animate-spin text-slate-400" />
                    </TableCell>
                  </TableRow>
                ) : filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="text-slate-500">
                        <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Aucun étudiant trouvé</p>
                        {searchQuery && <p className="text-sm mt-1">Essayez une autre recherche</p>}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student) => {
                    const waCount = getWhatsAppParentsCount(student);
                    const currentStatus = attendance[student.id];
                    const needsNotification = currentStatus === 'ABSENT' || currentStatus === 'LATE';
                    const isSelected = selectedStudents.has(student.id);
                    
                    return (
                      <TableRow 
                        key={student.id} 
                        className={cn(
                          "cursor-pointer hover:bg-slate-50 transition-colors",
                          needsNotification && sendWhatsApp ? 'bg-green-50/30' : '',
                          isSelected ? 'bg-blue-50/50' : ''
                        )}
                        onDoubleClick={() => router.push(`/dashboard/student-profile?id=${student.id}`)}
                        title="Double-cliquez pour voir le profil complet"
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleStudentSelect(student.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{student.fullName}</TableCell>
                        <TableCell>
                          {student.group ? (
                            <Badge variant="outline">{student.group.name}</Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            {student.parent1Name && (
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`parent1-${student.id}`}
                                  checked={parentSelection[student.id] === 'parent1' || 
                                           parentSelection[student.id] === 'both' || 
                                           (!parentSelection[student.id] && student.parent1Whatsapp === 1)}
                                  disabled={!needsNotification || !sendWhatsApp}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      const current = parentSelection[student.id];
                                      handleParentSelectionChange(student.id, current === 'parent2' ? 'both' : 'parent1');
                                    } else {
                                      const current = parentSelection[student.id];
                                      if (current === 'both') handleParentSelectionChange(student.id, 'parent2');
                                    }
                                  }}
                                  className="data-[state=checked]:bg-green-600"
                                />
                                <div className="text-sm">
                                  <p className="font-medium">{student.parent1Name}</p>
                                  <div className="flex items-center gap-1 text-slate-500">
                                    <span>{student.parent1Phone || '-'}</span>
                                    {student.parent1Whatsapp === 1 && (
                                      <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                                        <MessageSquare className="w-3 h-3 mr-1" />WA
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                            {student.parent2Name && (
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`parent2-${student.id}`}
                                  checked={parentSelection[student.id] === 'parent2' || 
                                           parentSelection[student.id] === 'both' || 
                                           (!parentSelection[student.id] && student.parent2Whatsapp === 1)}
                                  disabled={!needsNotification || !sendWhatsApp}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      const current = parentSelection[student.id];
                                      handleParentSelectionChange(student.id, current === 'parent1' ? 'both' : 'parent2');
                                    } else {
                                      const current = parentSelection[student.id];
                                      if (current === 'both') handleParentSelectionChange(student.id, 'parent1');
                                    }
                                  }}
                                  className="data-[state=checked]:bg-green-600"
                                />
                                <div className="text-sm">
                                  <p className="font-medium">{student.parent2Name}</p>
                                  <div className="flex items-center gap-1 text-slate-500">
                                    <span>{student.parent2Phone || '-'}</span>
                                    {student.parent2Whatsapp === 1 && (
                                      <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                                        <MessageSquare className="w-3 h-3 mr-1" />WA
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                            {!student.parent1Name && !student.parent2Name && student.parent && (
                              <div className="text-sm">
                                <p>{student.parent.fullName}</p>
                                <p className="text-slate-500">{student.parent.phone}</p>
                              </div>
                            )}
                            {!student.parent1Name && !student.parent2Name && !student.parent && (
                              <span className="text-slate-400 text-sm">Aucun parent</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={attendance[student.id] || 'none'}
                            onValueChange={(value) => handleStatusChange(student.id, value === 'none' ? '' : value)}
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">-- Sélectionner --</SelectItem>
                              {statusOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  <div className="flex items-center gap-2">
                                    <option.icon className="w-4 h-4" />
                                    {option.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {needsNotification && sendWhatsApp && hasWhatsAppParents(student) && (
                            <div className="flex items-center gap-1">
                              <UserCheck className="w-4 h-4 text-green-600" />
                              <span className="text-xs text-green-600">{waCount} parent{waCount > 1 ? 's' : ''} WA</span>
                            </div>
                          )}
                          {needsNotification && sendWhatsApp && !hasWhatsAppParents(student) && (
                            <span className="text-xs text-slate-400">Pas de WA</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {needsNotification && (
                            existingRecords.find((r) => r.studentId === student.id)?.parentNotified ? (
                              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                <CheckCircle className="w-3 h-3 mr-1" />Envoyé
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-slate-400">
                                <Send className="w-3 h-3 mr-1" />En attente
                              </Badge>
                            )
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-orange-600 border-orange-200 hover:bg-orange-50 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedStudentForLog({ id: student.id, name: student.fullName });
                                setLogModalOpen(true);
                              }}
                            >
                              <Settings2 className="w-3.5 h-3.5 mr-1" />
                              Organiser
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => openActionDialog(student)} className="text-xs">
                              Actions
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Action pour {actionStudent?.fullName}</DialogTitle>
            <DialogDescription>Sélectionnez une action pour cet étudiant</DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 gap-3 py-4">
            {actionOptions.map((option) => (
              <Button
                key={option.value}
                className={cn("justify-start h-12 text-left", option.color)}
                onClick={() => handleAction(option.value as 'ABSENT' | 'LATE' | 'ADMIN')}
                disabled={saving}
              >
                <option.icon className="w-5 h-5 mr-3" />
                {option.label}
              </Button>
            ))}
          </div>

          {actionStudent && (
            <div className="space-y-3 border-t pt-4">
              <Label>Message administratif (optionnel)</Label>
              <Textarea
                placeholder="Saisissez votre message pour les parents..."
                value={adminMessage}
                onChange={(e) => setAdminMessage(e.target.value)}
                rows={4}
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowActionDialog(false)} className="flex-1">Annuler</Button>
                <Button onClick={sendAdminMessage} disabled={!adminMessage.trim() || sendingAdminMessage} className="flex-1 bg-blue-500 hover:bg-blue-600">
                  {sendingAdminMessage ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Envoyer le message
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Générer un rapport de présence</DialogTitle>
            <DialogDescription>Choisissez le type de rapport et la période</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Type de rapport</Label>
              <Select value={reportType} onValueChange={(v) => setReportType(v as 'individual' | 'group')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Rapport individuel</SelectItem>
                  <SelectItem value="group">Rapport par groupe</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reportType === 'individual' && (
              <div className="space-y-2">
                <Label>Étudiant</Label>
                <Select value={selectedStudentForReport} onValueChange={setSelectedStudentForReport}>
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
            )}

            <div className="space-y-2">
              <Label>Mois</Label>
              <Input
                type="month"
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>Annuler</Button>
            <Button onClick={generateReport} disabled={generatingReport} className="bg-blue-500 hover:bg-blue-600">
              {generatingReport ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Modal */}
      {selectedStudentForLog && (
        <StudentLogModal
          open={logModalOpen}
          onOpenChange={setLogModalOpen}
          studentId={selectedStudentForLog.id}
          studentName={selectedStudentForLog.name}
        />
      )}

      {/* Help Card */}
      <Card className="border-0 shadow-md bg-blue-50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <BookOpen className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Guide d'utilisation</p>
              <ul className="mt-2 space-y-1 text-blue-700">
                <li>• Recherchez un étudiant par nom pour un enregistrement rapide</li>
                <li>• Sélectionnez plusieurs étudiants pour une action groupée</li>
                <li>• Les parents avec <Badge variant="outline" className="text-xs mx-1">WA</Badge> ont WhatsApp activé</li>
                <li>• Générez des rapports de présence en format DOCX</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
