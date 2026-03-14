'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { MessageSquare, Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    organizationName: '',
    organizationSlug: '',
    acceptTerms: false,
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleOrganizationNameChange = (name: string) => {
    setFormData({
      ...formData,
      organizationName: name,
      organizationSlug: generateSlug(name),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      setLoading(false);
      return;
    }

    if (!formData.acceptTerms) {
      setError('Vous devez accepter les conditions d\'utilisation');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          organizationName: formData.organizationName || undefined,
          organizationSlug: formData.organizationSlug || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Redirect to login with success message
      router.push('/login?registered=true');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-800">EduSaaS</span>
          </Link>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Créer un compte</CardTitle>
            <CardDescription>
              Inscrivez votre école et commencez l'essai gratuit de 14 jours
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Organization Info */}
              <div className="space-y-4">
                <h3 className="font-medium text-slate-900">Informations de l'établissement</h3>
                <div className="space-y-2">
                  <Label htmlFor="organizationName">Nom de l'établissement</Label>
                  <Input
                    id="organizationName"
                    placeholder="Ex: Infohas Academy"
                    value={formData.organizationName}
                    onChange={(e) => handleOrganizationNameChange(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organizationSlug">Identifiant unique</Label>
                  <div className="flex items-center">
                    <span className="text-slate-500 text-sm mr-2">edusaas.app/</span>
                    <Input
                      id="organizationSlug"
                      placeholder="infohas-academy"
                      value={formData.organizationSlug}
                      onChange={(e) => setFormData({ ...formData, organizationSlug: e.target.value })}
                      disabled={loading}
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Utilisé pour votre URL personnalisée
                  </p>
                </div>
              </div>

              {/* Admin User Info */}
              <div className="space-y-4">
                <h3 className="font-medium text-slate-900">Administrateur du compte</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom complet</Label>
                    <Input
                      id="name"
                      placeholder="Ahmed Benali"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="ahmed@ecole.ma"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Mot de passe</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmer</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={formData.acceptTerms}
                  onCheckedChange={(checked) => setFormData({ ...formData, acceptTerms: checked as boolean })}
                />
                <label
                  htmlFor="terms"
                  className="text-sm text-slate-600 leading-tight peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  J'accepte les{' '}
                  <Link href="#" className="text-green-600 hover:underline">
                    conditions d'utilisation
                  </Link>{' '}
                  et la{' '}
                  <Link href="#" className="text-green-600 hover:underline">
                    politique de confidentialité
                  </Link>
                </label>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création...
                  </>
                ) : (
                  'Créer mon compte'
                )}
              </Button>
              <p className="text-sm text-slate-600 text-center">
                Déjà inscrit?{' '}
                <Link href="/login" className="text-green-600 hover:underline font-medium">
                  Se connecter
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
