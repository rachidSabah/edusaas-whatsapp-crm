'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Calendar as CalendarIcon,
  Layers,
  BookOpen,
  School,
  MapPin,
  Clock,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Group {
  id: string;
  name: string;
  code: string | null;
}

interface Course {
  id: string;
  name: string;
}

interface Teacher {
  id: string;
  name: string;
}

interface Classroom {
  id: string;
  name: string;
}

interface Schedule {
  id: string;
  date: string;
  timeSlot: string | null;
  courseId: string | null;
  teacherId: string | null;
  classroomId: string | null;
  groupId: string | null;
  notes: string | null;
  courseName?: string;
  teacherName?: string;
  classroomName?: string;
  groupName?: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Dim' },
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mer' },
  { value: 4, label: 'Jeu' },
  { value: 5, label: 'Ven' },
  { value: 6, label: 'Sam' },
];

const DAYS_FULL = [
  { value: 0, label: 'Dimanche' },
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
];

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export default function GroupCalendarPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Selected group and date range
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Schedule form
  const [scheduleForm, setScheduleForm] = useState({
    courseId: '',
    teacherId: '',
    classroomId: '',
    timeSlot: '',
    notes: '',
  });

  // Days of week selection
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Monday to Friday by default

  // Dialogs
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [previewCount, setPreviewCount] = useState(0);

  // Calendar view
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const fetchData = async () => {
    try {
      const [groupsRes, coursesRes, teachersRes, classroomsRes] = await Promise.all([
        fetch('/api/groups'),
        fetch('/api/courses'),
        fetch('/api/teachers'),
        fetch('/api/classrooms'),
      ]);

      if (groupsRes.ok) {
        const data = await groupsRes.json();
        setGroups(data.groups || []);
      }
      if (coursesRes.ok) {
        const data = await coursesRes.json();
        setCourses(data.courses || []);
      }
      if (teachersRes.ok) {
        const data = await teachersRes.json();
        setTeachers(data.teachers || []);
      }
      if (classroomsRes.ok) {
        const data = await classroomsRes.json();
        setClassrooms(data.classrooms || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedules = async () => {
    if (!selectedGroupId) {
      setSchedules([]);
      return;
    }

    try {
      const params = new URLSearchParams();
      params.append('groupId', selectedGroupId);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/group-schedule?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSchedules(data.schedules || []);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [selectedGroupId, startDate, endDate]);

  // Calculate preview count when form changes
  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      let count = 0;
      
      while (start <= end) {
        if (selectedDays.includes(start.getDay())) {
          count++;
        }
        start.setDate(start.getDate() + 1);
      }
      setPreviewCount(count);
    } else {
      setPreviewCount(0);
    }
  }, [startDate, endDate, selectedDays]);

  const handleDayToggle = (day: number) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  const handleCreateBatch = async () => {
    if (!selectedGroupId || !startDate || !endDate) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/group-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: selectedGroupId,
          startDate,
          endDate,
          courseId: scheduleForm.courseId || null,
          teacherId: scheduleForm.teacherId || null,
          classroomId: scheduleForm.classroomId || null,
          timeSlot: scheduleForm.timeSlot || null,
          daysOfWeek: selectedDays,
          notes: scheduleForm.notes || null,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setConfirmDialogOpen(false);
        fetchSchedules();
        // Reset form
        setScheduleForm({
          courseId: '',
          teacherId: '',
          classroomId: '',
          timeSlot: '',
          notes: '',
        });
      } else {
        alert(data.error || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('Error creating batch:', error);
      alert('Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Supprimer cette séance?')) return;
    
    try {
      const response = await fetch(`/api/schedule?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchSchedules();
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
    }
  };

  const handleDeleteAllSchedules = async () => {
    if (!selectedGroupId) return;
    if (!confirm('Supprimer toutes les séances de ce groupe dans la période sélectionnée?')) return;

    try {
      const params = new URLSearchParams();
      params.append('groupId', selectedGroupId);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/group-schedule?${params}`, { method: 'DELETE' });
      if (response.ok) {
        fetchSchedules();
      }
    } catch (error) {
      console.error('Error deleting schedules:', error);
    }
  };

  // Calendar rendering helpers
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const getSchedulesForDate = (dateStr: string) => {
    return schedules.filter(s => s.date === dateStr);
  };

  const formatDate = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const today = new Date();
    const todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate());

    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="h-24 bg-slate-50/50"></div>
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDate(year, month, day);
      const daySchedule = getSchedulesForDate(dateStr);
      const isToday = dateStr === todayStr;
      const isInRange = startDate && endDate && dateStr >= startDate && dateStr <= endDate;

      days.push(
        <div
          key={day}
          className={cn(
            'h-24 border border-slate-100 p-1 transition',
            isToday && 'bg-green-50 border-green-200',
            isInRange && !isToday && 'bg-blue-50 border-blue-200'
          )}
        >
          <div className={cn(
            'text-sm font-medium mb-1',
            isToday ? 'text-green-600' : 'text-slate-600'
          )}>
            {day}
          </div>
          <div className="space-y-1 overflow-hidden max-h-16">
            {daySchedule.slice(0, 2).map((s, idx) => (
              <div
                key={s.id}
                className="text-xs p-1 rounded bg-blue-100 text-blue-700 truncate flex items-center gap-1"
                title={`${s.courseName || 'Cours'} - ${s.timeSlot || ''}`}
              >
                <Clock className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{s.timeSlot || s.courseName || 'Cours'}</span>
              </div>
            ))}
            {daySchedule.length > 2 && (
              <div className="text-xs text-slate-500 text-center">
                +{daySchedule.length - 2} autres
              </div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Calendrier de Groupe</h1>
          <p className="text-slate-600">Planifiez les séances pour un groupe sur une période</p>
        </div>
      </div>

      {/* Group and Date Selection */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-600" />
            Configuration
          </CardTitle>
          <CardDescription>Sélectionnez le groupe et la période</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Groupe</Label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un groupe" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date de début</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Date de fin</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => {
                  if (previewCount > 0) {
                    setConfirmDialogOpen(true);
                  }
                }}
                disabled={!selectedGroupId || !startDate || !endDate || previewCount === 0}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Planifier ({previewCount} séances)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Days of Week Selection */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Jours de la semaine</CardTitle>
          <CardDescription>Sélectionnez les jours à planifier</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {DAYS_FULL.map((day) => (
              <label
                key={day.value}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition',
                  selectedDays.includes(day.value)
                    ? 'bg-green-50 border-green-300 text-green-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                )}
              >
                <Checkbox
                  checked={selectedDays.includes(day.value)}
                  onCheckedChange={() => handleDayToggle(day.value)}
                />
                <span className="font-medium">{day.label}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Schedule Form */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Détails de la séance</CardTitle>
          <CardDescription>Configuration commune pour toutes les séances</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Cours
              </Label>
              <Select
                value={scheduleForm.courseId}
                onValueChange={(value) => setScheduleForm({ ...scheduleForm, courseId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un cours" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <School className="w-4 h-4" />
                Enseignant
              </Label>
              <Select
                value={scheduleForm.teacherId}
                onValueChange={(value) => setScheduleForm({ ...scheduleForm, teacherId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un enseignant" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Salle
              </Label>
              <Select
                value={scheduleForm.classroomId}
                onValueChange={(value) => setScheduleForm({ ...scheduleForm, classroomId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une salle" />
                </SelectTrigger>
                <SelectContent>
                  {classrooms.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Horaire
              </Label>
              <Input
                type="time"
                value={scheduleForm.timeSlot}
                onChange={(e) => setScheduleForm({ ...scheduleForm, timeSlot: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={scheduleForm.notes}
              onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
              placeholder="Notes optionnelles..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Calendar View */}
      {selectedGroupId && (
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <CardTitle className="text-xl">
                  {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(new Date())}
                >
                  Aujourd'hui
                </Button>
                {schedules.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={handleDeleteAllSchedules}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer tout
                  </Button>
                )}
              </div>
            </div>
            {selectedGroup && (
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                  {selectedGroup.name}
                </Badge>
                <span className="text-sm text-slate-500">
                  {schedules.length} séance(s) planifiée(s)
                </span>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-8 text-slate-500">Chargement...</div>
            ) : (
              <div className="grid grid-cols-7">
                {/* Day headers */}
                {DAYS_OF_WEEK.map((day) => (
                  <div
                    key={day.value}
                    className="h-10 flex items-center justify-center text-sm font-medium text-slate-600 bg-slate-50 border-b"
                  >
                    {day.label}
                  </div>
                ))}
                {/* Calendar days */}
                {renderCalendar()}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Scheduled Sessions List */}
      {schedules.length > 0 && (
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Séances planifiées</CardTitle>
            <CardDescription>Liste détaillée des séances</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-xs text-slate-500">
                        {new Date(schedule.date).toLocaleDateString('fr-FR', { weekday: 'short' })}
                      </div>
                      <div className="font-semibold text-slate-900">
                        {new Date(schedule.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {schedule.timeSlot && (
                        <Badge variant="outline" className="font-mono">
                          {schedule.timeSlot}
                        </Badge>
                      )}
                      {schedule.courseName && (
                        <span className="font-medium text-slate-900">{schedule.courseName}</span>
                      )}
                      {schedule.teacherName && (
                        <span className="text-sm text-slate-500">{schedule.teacherName}</span>
                      )}
                      {schedule.classroomName && (
                        <Badge variant="secondary">{schedule.classroomName}</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => handleDeleteSchedule(schedule.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la planification</DialogTitle>
            <DialogDescription>
              Vous allez créer <strong>{previewCount} séances</strong> pour le groupe{' '}
              <strong>{selectedGroup?.name}</strong> du{' '}
              <strong>{new Date(startDate).toLocaleDateString('fr-FR')}</strong> au{' '}
              <strong>{new Date(endDate).toLocaleDateString('fr-FR')}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">Jours sélectionnés:</span>
                <span className="font-medium">
                  {selectedDays.map(d => DAYS_FULL.find(day => day.value === d)?.label).join(', ')}
                </span>
              </div>
              {scheduleForm.courseId && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Cours:</span>
                  <span className="font-medium">{courses.find(c => c.id === scheduleForm.courseId)?.name}</span>
                </div>
              )}
              {scheduleForm.teacherId && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Enseignant:</span>
                  <span className="font-medium">{teachers.find(t => t.id === scheduleForm.teacherId)?.name}</span>
                </div>
              )}
              {scheduleForm.classroomId && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Salle:</span>
                  <span className="font-medium">{classrooms.find(c => c.id === scheduleForm.classroomId)?.name}</span>
                </div>
              )}
              {scheduleForm.timeSlot && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Horaire:</span>
                  <span className="font-medium">{scheduleForm.timeSlot}</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleCreateBatch}
              disabled={saving}
              className="bg-gradient-to-r from-green-500 to-emerald-600"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Créer {previewCount} séances
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
