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
  AlertCircle,
  CheckCircle,
  Key,
} from 'lucide-react';
import { USER_ROLES, ROLE_LABELS, USER_STATUS, USER_STATUS_LABELS } from '@/lib/constants';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Password reset state
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [resetPasswordData, setResetPasswordData] = useState({ newPassword: '', confirmPassword: '' });
  const [resetPasswordSaving, setResetPasswordSaving] = useState(false);
  const [resetPasswordMessage, setResetPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
    setMessage(null);
    try {
      if (activeTab === 'users') {
        const response = await fetch('/api/admin/users');
        const data = await response.json();
        if (!response.ok) {
          setMessage({ type: 'error', text: data.error || 'Erreur lors du chargement des utilisateurs' });
          setUsers([]);
        } else {
          setUsers(data.users || []);
        }
      } else {
        const response = await fetch('/api/teachers');
        const data = await response.json();
        if (!response.ok) {
          setMessage({ type: 'error', text: data.error || 'Erreur lors du chargement des enseignants' });
          setTeachers([]);
        } else {
          setTeachers(data.teachers || []);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage({ type: 'error', text: 'Erreur de connexion au serveur' });
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
    setMessage(null);
    try {
      const url = activeTab === 'users' ? '/api/admin/users' : '/api/teachers';
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

      const data = await response.json();

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
        setMessage({ type: 'success', text: editingItem ? 'Modifié avec succès' : 'Créé avec succès' });
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

  // Handle reset password
  const handleOpenResetPassword = (user: User) => {
    setResetPasswordUser(user);
    setResetPasswordData({ newPassword: '', confirmPassword: '' });
    setResetPasswordMessage(null);
    setResetPasswordDialogOpen(true);
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser) return;
    
    if (!resetPasswordData.newPassword || !resetPasswordData.confirmPassword) {
      setResetPasswordMessage({ type: 'error', text: 'Veuillez remplir tous les champs' });
      return;
    }
    if (resetPasswordData.newPassword !== resetPasswordData.confirmPassword) {
      setResetPasswordMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas' });
      return;
    }
    if (resetPasswordData.newPassword.length < 6) {
      setResetPasswordMessage({ type: 'error', text: 'Le mot de passe doit contenir au moins 6 caractères' });
      return;
    }
    
    setResetPasswordSaving(true);
    setResetPasswordMessage(null);
    
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: resetPasswordUser.id,
          password: resetPasswordData.newPassword,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResetPasswordMessage({ type: 'success', text: 'Mot de passe réinitialisé avec succès!' });
        setTimeout(() => {
          setResetPasswordDialogOpen(false);
          setResetPasswordUser(null);
          setResetPasswordData({ newPassword: '', confirmPassword: '' });
          setResetPasswordMessage(null);
        }, 1500);
      } else {
        setResetPasswordMessage({ type: 'error', text: data.error || 'Erreur lors de la réinitialisation' });
      }
    } catch (error) {
      setResetPasswordMessage({ type: 'error', text: 'Erreur de connexion' });
    } finally {
      setResetPasswordSaving(false);
    }
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

      {/* Message Alert */}
      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className={message.type === 'success' ? 'border-green-500 bg-green-50' : ''}>
          {message.type === 'success' ? <CheckCircle className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4" />}
          <AlertTitle>{message.type === 'success' ? 'Succès' : 'Erreur'}</AlertTitle>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

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
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Modifier"
                            onClick={() => handleEdit(user)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Réinitialiser le mot de passe"
                            onClick={() => handleOpenResetPassword(user)}
                          >
                            <Key className="w-4 h-4 text-amber-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500"
                            title="Supprimer"
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
      
      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-600" />
              Réinitialiser le mot de passe
            </DialogTitle>
            <DialogDescription>
              Réinitialiser le mot de passe pour {resetPasswordUser?.name} ({resetPasswordUser?.email})
            </DialogDescription>
          </DialogHeader>
          
          {resetPasswordMessage && (
            <Alert variant={resetPasswordMessage.type === 'error' ? 'destructive' : 'default'} 
              className={resetPasswordMessage.type === 'success' ? 'border-green-500 bg-green-50' : ''}>
              {resetPasswordMessage.type === 'success' 
                ? <CheckCircle className="h-4 w-4 text-green-600" /> 
                : <AlertCircle className="h-4 w-4" />}
              <AlertDescription>{resetPasswordMessage.text}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nouveau mot de passe</Label>
              <Input
                id="newPassword"
                type="password"
                value={resetPasswordData.newPassword}
                onChange={(e) => setResetPasswordData({ ...resetPasswordData, newPassword: e.target.value })}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={resetPasswordData.confirmPassword}
                onChange={(e) => setResetPasswordData({ ...resetPasswordData, confirmPassword: e.target.value })}
                placeholder="••••••••"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setResetPasswordDialogOpen(false);
              setResetPasswordUser(null);
              setResetPasswordData({ newPassword: '', confirmPassword: '' });
              setResetPasswordMessage(null);
            }}>
              Annuler
            </Button>
            <Button 
              onClick={handleResetPassword}
              disabled={resetPasswordSaving}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {resetPasswordSaving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Réinitialisation...</>
              ) : (
                'Réinitialiser'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
