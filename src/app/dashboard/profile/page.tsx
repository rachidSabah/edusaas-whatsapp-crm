'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Save, 
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { ROLE_LABELS } from '@/lib/constants';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  avatar: string | null;
  organizationId: string | null;
  createdAt: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile');
      const data = await response.json();
      if (response.ok) {
        setUser(data.user);
        setFormData({
          name: data.user.name || '',
          email: data.user.email || '',
          phone: data.user.phone || '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    // Validate passwords if changing
    if (formData.newPassword || formData.confirmPassword) {
      if (!formData.currentPassword) {
        setMessage({ type: 'error', text: 'Veuillez entrer votre mot de passe actuel' });
        setSaving(false);
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        setMessage({ type: 'error', text: 'Les nouveaux mots de passe ne correspondent pas' });
        setSaving(false);
        return;
      }
      if (formData.newPassword.length < 6) {
        setMessage({ type: 'error', text: 'Le mot de passe doit contenir au moins 6 caractères' });
        setSaving(false);
        return;
      }
    }

    try {
      const updateData: Record<string, any> = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
      };

      if (formData.newPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        setMessage({ type: 'success', text: 'Profil mis à jour avec succès' });
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        }));
      } else {
        setMessage({ type: 'error', text: data.error || 'Erreur lors de la mise à jour' });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Erreur de connexion' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Mon Profil</h1>
        <p className="text-slate-600">Gérez vos informations personnelles et votre mot de passe</p>
      </div>

      {/* Message */}
      {message && (
        <div className={`flex items-center gap-2 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Profile Info */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-green-600" />
            Informations personnelles
          </CardTitle>
          <CardDescription>
            Vos informations de base
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center text-white text-2xl font-bold">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <h3 className="text-lg font-semibold">{user?.name}</h3>
              <p className="text-slate-500">{user?.email}</p>
              <Badge className="mt-1 bg-green-100 text-green-700">
                {ROLE_LABELS[user?.role || '']?.fr || user?.role}
              </Badge>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            Membre depuis {new Date(user?.createdAt || '').toLocaleDateString('fr-FR', { 
              year: 'numeric', 
              month: 'long' 
            })}
          </p>
        </CardContent>
      </Card>

      {/* Edit Form */}
      <form onSubmit={handleSubmit}>
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Modifier le profil</CardTitle>
            <CardDescription>
              Mettez à jour vos informations personnelles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom complet</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="pl-10"
                  placeholder="Votre nom"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10"
                  placeholder="votre@email.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="pl-10"
                  placeholder="+212 6XX XXX XXX"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Password Change */}
        <Card className="border-0 shadow-md mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-green-600" />
              Changer le mot de passe
            </CardTitle>
            <CardDescription>
              Laissez vide si vous ne souhaitez pas changer le mot de passe
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Mot de passe actuel</Label>
              <Input
                id="currentPassword"
                type="password"
                value={formData.currentPassword}
                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                placeholder="••••••••"
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nouveau mot de passe</Label>
              <Input
                id="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="••••••••"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end mt-6">
          <Button
            type="submit"
            disabled={saving}
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
                Enregistrer les modifications
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
