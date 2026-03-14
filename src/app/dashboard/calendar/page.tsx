'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Clock,
  BookOpen,
  GraduationCap,
  MapPin,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface Group {
  id: string;
  name: string;
}

const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export default function CalendarPage() {
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    timeSlot: '',
    courseId: '',
    teacherId: '',
    classroomId: '',
    groupId: '',
    notes: '',
  });

  // Filters
  const [filterTeacher, setFilterTeacher] = useState<string>('');
  const [filterGroup, setFilterGroup] = useState<string>('');
  const [filterCourse, setFilterCourse] = useState<string>('');

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const fetchData = async () => {
    try {
      const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
      const params = new URLSearchParams();
      params.append('month', monthStr);
      if (filterTeacher && filterTeacher !== 'all') params.append('teacherId', filterTeacher);
      if (filterGroup && filterGroup !== 'all') params.append('groupId', filterGroup);
      if (filterCourse && filterCourse !== 'all') params.append('courseId', filterCourse);

      const [scheduleRes, coursesRes, teachersRes, classroomsRes, groupsRes] = await Promise.all([
        fetch(`/api/schedule?${params}`),
        fetch('/api/courses'),
        fetch('/api/teachers'),
        fetch('/api/classrooms'),
        fetch('/api/groups'),
      ]);

      if (scheduleRes.ok) {
        const data = await scheduleRes.json();
        setSchedule(data.schedule || []);
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
      if (groupsRes.ok) {
        const data = await groupsRes.json();
        setGroups(data.groups || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentYear, currentMonth, filterTeacher, filterGroup, filterCourse]);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const getScheduleForDate = (dateStr: string) => {
    return schedule.filter(s => s.date === dateStr);
  };

  const formatDate = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleDayClick = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    setSelectedDate(date);
    setDialogOpen(true);
    setScheduleForm({
      timeSlot: '',
      courseId: '',
      teacherId: '',
      classroomId: '',
      groupId: '',
      notes: '',
    });
  };

  const handleCreateSchedule = async () => {
    if (!selectedDate) return;

    try {
      const response = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formatDate(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()),
          ...scheduleForm,
          courseId: scheduleForm.courseId || null,
          teacherId: scheduleForm.teacherId || null,
          classroomId: scheduleForm.classroomId || null,
          groupId: scheduleForm.groupId || null,
        }),
      });

      if (response.ok) {
        setDialogOpen(false);
        fetchData();
      }
    } catch (error) {
      console.error('Error creating schedule:', error);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Supprimer cette séance?')) return;
    try {
      const response = await fetch(`/api/schedule?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const today = new Date();
    const todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate());

    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="h-28 bg-slate-50/50"></div>
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDate(currentYear, currentMonth, day);
      const daySchedule = getScheduleForDate(dateStr);
      const isToday = dateStr === todayStr;

      days.push(
        <div
          key={day}
          className={cn(
            'h-28 border border-slate-100 p-1 cursor-pointer hover:bg-slate-50 transition',
            isToday && 'bg-green-50 border-green-200'
          )}
          onClick={() => handleDayClick(day)}
        >
          <div className={cn(
            'text-sm font-medium mb-1',
            isToday ? 'text-green-600' : 'text-slate-600'
          )}>
            {day}
          </div>
          <div className="space-y-1 overflow-hidden max-h-20">
            {daySchedule.slice(0, 3).map((s, idx) => (
              <div
                key={s.id}
                className="text-xs p-1 rounded bg-blue-100 text-blue-700 truncate flex items-center gap-1"
                title={`${s.courseName || 'Cours'} - ${s.timeSlot || ''}`}
              >
                <Clock className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{s.timeSlot || s.courseName || 'Cours'}</span>
              </div>
            ))}
            {daySchedule.length > 3 && (
              <div className="text-xs text-slate-500 text-center">
                +{daySchedule.length - 3} autres
              </div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Calendrier</h1>
          <p className="text-slate-600">Planifiez les cours et séances</p>
        </div>
        <Button
          onClick={() => {
            setSelectedDate(new Date());
            setDialogOpen(true);
          }}
          className="bg-gradient-to-r from-green-500 to-emerald-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Planifier une séance
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-md">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-slate-500">Enseignant</Label>
              <Select value={filterTeacher || undefined} onValueChange={setFilterTeacher}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-500">Groupe</Label>
              <Select value={filterGroup || undefined} onValueChange={setFilterGroup}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-500">Cours</Label>
              <Select value={filterCourse || undefined} onValueChange={setFilterCourse}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <CardTitle className="text-xl">
                {MONTHS[currentMonth]} {currentYear}
              </CardTitle>
              <Button variant="outline" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
            >
              Aujourd'hui
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-8 text-slate-500">Chargement...</div>
          ) : (
            <div className="grid grid-cols-7">
              {/* Day headers */}
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="h-10 flex items-center justify-center text-sm font-medium text-slate-600 bg-slate-50 border-b"
                >
                  {day}
                </div>
              ))}
              {/* Calendar days */}
              {renderCalendar()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Planifier une séance</DialogTitle>
            <DialogDescription>
              {selectedDate && (
                <span className="flex items-center gap-2 mt-1">
                  <CalendarIcon className="w-4 h-4" />
                  {selectedDate.toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="timeSlot">Horaire</Label>
              <Input
                id="timeSlot"
                type="time"
                value={scheduleForm.timeSlot}
                onChange={(e) => setScheduleForm({ ...scheduleForm, timeSlot: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course">Cours</Label>
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
              <Label htmlFor="teacher">Enseignant</Label>
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
              <Label htmlFor="classroom">Salle</Label>
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
              <Label htmlFor="group">Groupe</Label>
              <Select
                value={scheduleForm.groupId}
                onValueChange={(value) => setScheduleForm({ ...scheduleForm, groupId: value })}
              >
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
          </div>
          
          {/* Existing schedule for selected date */}
          {selectedDate && (
            <div className="border-t pt-4">
              <Label className="text-sm font-medium text-slate-700">Séances existantes</Label>
              <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                {getScheduleForDate(formatDate(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())).length === 0 ? (
                  <p className="text-sm text-slate-500">Aucune séance planifiée</p>
                ) : (
                  getScheduleForDate(formatDate(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())).map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                      <div className="text-sm">
                        <span className="font-medium">{s.timeSlot || '-'}</span>
                        <span className="mx-2">•</span>
                        <span>{s.courseName || 'Cours'}</span>
                        {s.teacherName && (
                          <>
                            <span className="mx-2">•</span>
                            <span className="text-slate-600">{s.teacherName}</span>
                          </>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-500"
                        onClick={() => handleDeleteSchedule(s.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleCreateSchedule}
              className="bg-gradient-to-r from-green-500 to-emerald-600"
            >
              Planifier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
