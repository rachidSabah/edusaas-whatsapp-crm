'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Phone,
  AlertCircle,
  Copy,
  Loader,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetaNumber {
  id: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  accessToken: string;
  isActive: boolean;
  isPrimary: boolean;
  createdAt: string;
}

export default function MultiNumbersPage() {
  const [numbers, setNumbers] = useState<MetaNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    phoneNumberId: '',
    accessToken: '',
  });

  const [testResult, setTestResult] = useState<{
    id: string;
    success: boolean;
    phoneNumber?: string;
    error?: string;
  } | null>(null);

  const fetchNumbers = async () => {
    try {
      const response = await fetch('/api/whatsapp/multi-numbers');
      const data = await response.json();
      setNumbers(data.numbers || []);
    } catch (error) {
      console.error('Error fetching numbers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNumbers();
  }, []);

  const handleAddNumber = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.phoneNumberId || !formData.accessToken) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    try {
      const response = await fetch('/api/whatsapp/multi-numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumberId: formData.phoneNumberId,
          accessToken: formData.accessToken,
        }),
      });

      if (response.ok) {
        setDialogOpen(false);
        setFormData({ phoneNumberId: '', accessToken: '' });
        fetchNumbers();
      } else {
        const data = await response.json();
        alert(data.error || 'Erreur lors de l\'ajout');
      }
    } catch (error) {
      console.error('Error adding number:', error);
      alert('Erreur lors de l\'ajout du numéro');
    }
  };

  const handleTestNumber = async (number: MetaNumber) => {
    setTesting(number.id);
    setTestResult(null);

    try {
      const response = await fetch(
        `/api/whatsapp/send-meta?phoneNumberId=${number.phoneNumberId}&accessToken=${encodeURIComponent(number.accessToken)}`
      );
      const data = await response.json();
      setTestResult({
        id: number.id,
        success: data.success,
        phoneNumber: data.phoneNumber,
        error: data.error,
      });
    } catch (error) {
      setTestResult({
        id: number.id,
        success: false,
        error: 'Erreur de connexion',
      });
    } finally {
      setTesting(null);
    }
  };

  const handleDeleteNumber = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce numéro?')) return;

    try {
      const response = await fetch(`/api/whatsapp/multi-numbers?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchNumbers();
      } else {
        alert('Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Error deleting number:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleSetPrimary = async (id: string) => {
    try {
      const response = await fetch('/api/whatsapp/multi-numbers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isPrimary: true }),
      });

      if (response.ok) {
        fetchNumbers();
      }
    } catch (error) {
      console.error('Error setting primary:', error);
    }
  };

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Multi-Numéros WhatsApp</h1>
          <p className="text-slate-600 mt-2">
            Gérez plusieurs numéros Meta WhatsApp Business
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-green-500 to-emerald-600">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un Numéro
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un Numéro WhatsApp Business</DialogTitle>
              <DialogDescription>
                Entrez les identifiants Meta pour un nouveau numéro WhatsApp
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddNumber}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumberId">Phone Number ID</Label>
                  <Input
                    id="phoneNumberId"
                    value={formData.phoneNumberId}
                    onChange={(e) =>
                      setFormData({ ...formData, phoneNumberId: e.target.value })
                    }
                    placeholder="Ex: 995426510331154"
                    required
                  />
                  <p className="text-xs text-slate-500">
                    Trouvez cet ID dans Meta App Dashboard
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accessToken">Access Token</Label>
                  <Input
                    id="accessToken"
                    type="password"
                    value={formData.accessToken}
                    onChange={(e) =>
                      setFormData({ ...formData, accessToken: e.target.value })
                    }
                    placeholder="Votre token d'accès Meta"
                    required
                  />
                  <p className="text-xs text-slate-500">
                    Générez un token dans Meta App Dashboard
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-green-500 to-emerald-600">
                  Ajouter
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Numbers Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-8 text-slate-500">
            Chargement...
          </div>
        ) : numbers.length === 0 ? (
          <div className="col-span-full">
            <Card className="border-0 shadow-md">
              <CardContent className="py-12">
                <div className="text-center">
                  <Phone className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    Aucun numéro configuré
                  </h3>
                  <p className="text-slate-500 mb-4">
                    Ajoutez votre premier numéro Meta WhatsApp Business
                  </p>
                  <Button
                    onClick={() => setDialogOpen(true)}
                    className="bg-gradient-to-r from-green-500 to-emerald-600"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un Numéro
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          numbers.map((number) => (
            <Card
              key={number.id}
              className={cn(
                'border-0 shadow-md hover:shadow-lg transition',
                number.isPrimary && 'ring-2 ring-green-400'
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                      <Phone className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {number.displayPhoneNumber || 'WhatsApp'}
                        {number.isPrimary && (
                          <Badge className="bg-green-600 text-white text-xs">Primaire</Badge>
                        )}
                        {number.isActive && (
                          <Badge className="bg-blue-100 text-blue-700 text-xs">Actif</Badge>
                        )}
                      </CardTitle>
                      <div className="text-xs text-slate-500 mt-1">
                        ID: {number.phoneNumberId}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500"
                    onClick={() => handleDeleteNumber(number.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Token Display */}
                <div className="space-y-2">
                  <Label className="text-xs text-slate-600">Access Token</Label>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      value={number.accessToken}
                      readOnly
                      className="bg-slate-50 text-xs"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopyToken(number.accessToken)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  {copied === number.accessToken && (
                    <p className="text-xs text-green-600">✓ Copié</p>
                  )}
                </div>

                {/* Test Result */}
                {testResult?.id === number.id && (
                  <Alert
                    className={cn(
                      testResult.success
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    )}
                  >
                    <AlertCircle
                      className={cn(
                        'w-4 h-4',
                        testResult.success ? 'text-green-600' : 'text-red-600'
                      )}
                    />
                    <AlertTitle
                      className={testResult.success ? 'text-green-900' : 'text-red-900'}
                    >
                      {testResult.success ? 'Connexion réussie' : 'Erreur de connexion'}
                    </AlertTitle>
                    {testResult.phoneNumber && (
                      <AlertDescription className="text-green-700 text-sm mt-1">
                        Numéro: {testResult.phoneNumber}
                      </AlertDescription>
                    )}
                    {testResult.error && (
                      <AlertDescription className="text-red-700 text-sm mt-1">
                        {testResult.error}
                      </AlertDescription>
                    )}
                  </Alert>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleTestNumber(number)}
                    disabled={testing === number.id}
                  >
                    {testing === number.id ? (
                      <>
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                        Test...
                      </>
                    ) : (
                      'Tester'
                    )}
                  </Button>
                  {!number.isPrimary && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleSetPrimary(number.id)}
                    >
                      Définir comme Primaire
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Info Card */}
      <Card className="border-0 shadow-md bg-blue-50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Gestion Multi-Numéros</h4>
              <p className="text-sm text-blue-700 mt-1">
                Vous pouvez configurer plusieurs numéros Meta WhatsApp Business. Le numéro primaire sera utilisé par défaut pour les envois automatiques. Chaque numéro peut recevoir et envoyer des messages indépendamment.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
