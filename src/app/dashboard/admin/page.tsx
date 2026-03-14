'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Users,
  UserPlus,
  Search,
  Edit,
  Trash2,
  Loader2,
  Shield,
  UserCheck,
  UserX,
  GraduationCap,
} from 'lucide-react';
import { USER_ROLES, ROLE_LABELS, USER_STATUS, USER_STATUS_LABELS } from '@/lib/constants';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: number;
  createdAt: string;
  lastLogin: string | null;
}

interface Teacher {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  speciality: string | null;
  isActive: number;
}

type TabType = 'users' | 'teachers';

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<User | Teacher | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'USER',
    password: '',
    subject: '',
    status: 'ACTIVE',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'users') {
        const response = await fetch('/api/admin/users');
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        const response = await fetch('/api/teachers');
        const data = await response.json();
        setTeachers(data.teachers || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingItem
        ? `/${activeTab === 'users' ? 'api/admin/users' : 'api/teachers'}`
        : `/${activeTab === 'users' ? 'api/admin/users' : 'api/teachers'}`;
      
      const method = editingItem ? 'PUT' : 'POST';
      
      const body = activeTab === 'users' 
        ? {
            ...formData,
            id: editingItem?.id,
            isActive: formData.status === 'ACTIVE' ? 1 : 0,
          }
        : {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            speciality: formData.subject,
            isActive: formData.status === 'ACTIVE' ? 1 : 0,
            ...(editingItem?.id ? { id: editingItem.id } : {}),
          };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setDialogOpen(false);
        setEditingItem(null);
        setFormData({
          name: '',
          email: '',
          phone: '',
          role: 'USER',
          password: '',
          subject: '',
          status: 'ACTIVE',
        });
        fetchData();
      } else {
        const data = await response.json();
        alert(data.error || 'Erreur');
      }
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet élément?')) return;
    
    try {
      const url = activeTab === 'users' 
        ? `/api/admin/users?id=${id}` 
        : `/api/teachers?id=${id}`;
      
      const response = await fetch(url, { method: 'DELETE' });
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleEdit = (item: User | Teacher) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      email: item.email,
      phone: item.phone || '',
      role: 'role' in item ? item.role : 'TEACHER',
      password: '',
      subject: 'speciality' in item ? item.speciality || '' : '',
      status: 'isActive' in item 
        ? (item.isActive ? 'ACTIVE' : 'INACTIVE')
        : 'ACTIVE',
    });
    setDialogOpen(true);
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (isActive: number) => (
    <Badge className={isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
      {isActive ? 'Actif' : 'Inactif'}
    </Badge>
  );

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      SUPER_ADMIN: 'bg-purple-100 text-purple-700',
      ORG_ADMIN: 'bg-blue-100 text-blue-700',
      SCHOOL_MANAGER: 'bg-indigo-100 text-indigo-700',
      TEACHER: 'bg-green-100 text-green-700',
      CHAT_OPERATOR: 'bg-teal-100 text-teal-700',
      USER: 'bg-slate-100 text-slate-700',
    };
    const labels: Record<string, string> = {
      SUPER_ADMIN: 'Super Admin',
      ORG_ADMIN: 'Admin',
      SCHOOL_MANAGER: 'Gestionnaire',
      TEACHER: 'Enseignant',
      CHAT_OPERATOR: 'Opérateur',
      USER: 'Utilisateur',
    };
    return (
      <Badge className={colors[role] || colors.USER}>
        {labels[role] || role}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Administration</h1>
          <p className="text-slate-600">Gérez les utilisateurs et les enseignants</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <Button
          variant="ghost"
          onClick={() => setActiveTab('users')}
          className={`rounded-none border-b-2 ${
            activeTab === 'users' 
              ? 'border-green-600 text-green-600' 
              : 'border-transparent'
          }`}
        >
          <Users className="w-4 h-4 mr-2" />
          Utilisateurs
        </Button>
        <Button
          variant="ghost"
          onClick={() => setActiveTab('teachers')}
          className={`rounded-none border-b-2 ${
            activeTab === 'teachers' 
              ? 'border-green-600 text-green-600' 
              : 'border-transparent'
          }`}
        >
          <GraduationCap className="w-4 h-4 mr-2" />
          Enseignants
        </Button>
      </div>

      {/* Content */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-gradient-to-r from-green-500 to-emerald-600"
                  onClick={() => {
                    setEditingItem(null);
                    setFormData({
                      name: '',
                      email: '',
                      phone: '',
                      role: 'USER',
                      password: '',
                      subject: '',
                      status: 'ACTIVE',
                    });
                  }}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Ajouter {activeTab === 'users' ? 'un utilisateur' : 'un enseignant'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingItem 
                      ? `Modifier ${activeTab === 'users' ? 'l\'utilisateur' : 'l\'enseignant'}`
                      : `Ajouter ${activeTab === 'users' ? 'un utilisateur' : 'un enseignant'}`
                    }
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Nom complet</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Téléphone</Label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    {activeTab === 'users' && (
                      <div className="space-y-2">
                        <Label>Rôle</Label>
                        <Select
                          value={formData.role}
                          onValueChange={(v) => setFormData({ ...formData, role: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USER">Utilisateur</SelectItem>
                            <SelectItem value="TEACHER">Enseignant</SelectItem>
                            <SelectItem value="SCHOOL_MANAGER">Gestionnaire École</SelectItem>
                            <SelectItem value="ORG_ADMIN">Administrateur</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {activeTab === 'users' && !editingItem && (
                      <div className="space-y-2">
                        <Label>Mot de passe</Label>
                        <Input
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          placeholder="Mot de passe initial"
                        />
                      </div>
                    )}
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
                          <SelectItem value="ACTIVE">Actif</SelectItem>
                          <SelectItem value="INACTIVE">Inactif</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={saving} className="bg-green-600">
                      {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      {editingItem ? 'Modifier' : 'Ajouter'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-green-600" />
            </div>
          ) : activeTab === 'users' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      Aucun utilisateur trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phone || '-'}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{getStatusBadge(user.isActive)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(user)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500"
                            onClick={() => handleDelete(user.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Matière</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeachers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      Aucun enseignant trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTeachers.map((teacher) => (
                    <TableRow key={teacher.id}>
                      <TableCell className="font-medium">{teacher.name}</TableCell>
                      <TableCell>{teacher.email}</TableCell>
                      <TableCell>{teacher.phone || '-'}</TableCell>
                      <TableCell>{teacher.speciality || '-'}</TableCell>
                      <TableCell>{getStatusBadge(teacher.isActive)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(teacher)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500"
                            onClick={() => handleDelete(teacher.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
