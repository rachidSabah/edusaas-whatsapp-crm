'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  Phone, 
  CheckCircle, 
  XCircle, 
  Clock,
  RefreshCw,
  Smartphone,
  ExternalLink,
  Send,
  Maximize2,
  Minimize2,
  X,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  QrCode,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WhatsAppAccount {
  id: string;
  phoneNumber: string;
  accountName: string | null;
  connectionStatus: string;
  deviceId: string | null;
  lastConnected: string | null;
  isActive: number;
  isDefault: number;
  createdAt: string;
}

interface QRState {
  isOpen: boolean;
  accountId: string | null;
  qrCodeUrl: string | null;
  loading: boolean;
  status: string;
  message: string;
}

export default function WhatsAppPage() {
  const [accounts, setAccounts] = useState<WhatsAppAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    phoneNumber: '',
    accountName: '',
  });
  
  // QR Code state
  const [qrState, setQrState] = useState<QRState>({
    isOpen: false,
    accountId: null,
    qrCodeUrl: null,
    loading: false,
    status: 'idle',
    message: '',
  });

  const [quickSend, setQuickSend] = useState({
    phoneNumber: '',
    message: '',
  });

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/whatsapp-accounts');
      const data = await response.json();
      setAccounts(data.accounts || []);
    } catch (error) {
      console.error('Error fetching WhatsApp accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/whatsapp-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          isDefault: accounts.length === 0 ? 1 : 0,
        }),
      });

      if (response.ok) {
        setDialogOpen(false);
        setFormData({ phoneNumber: '', accountName: '' });
        fetchAccounts();
      } else {
        const data = await response.json();
        alert(data.error || 'Erreur lors de l\'ajout');
      }
    } catch (error) {
      console.error('Error creating WhatsApp account:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce compte?')) return;
    try {
      const response = await fetch(`/api/whatsapp-accounts?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchAccounts();
      }
    } catch (error) {
      console.error('Error deleting WhatsApp account:', error);
    }
  };

  // Connect via Baileys QR Code
  const handleConnect = async (account: WhatsAppAccount) => {
    setQrState({
      ...qrState,
      isOpen: true,
      accountId: account.id,
      loading: true,
      status: 'generating',
      message: 'Génération du code QR...',
    });

    try {
      const response = await fetch(`/api/whatsapp/qr?accountId=${account.id}`);
      const data = await response.json();

      if (data.success) {
        setQrState({
          ...qrState,
          isOpen: true,
          accountId: account.id,
          qrCodeUrl: data.qrCodeUrl,
          loading: false,
          status: 'waiting',
          message: data.message,
        });

        // Start polling for status
        startPollingStatus(account.id);
      } else {
        setQrState({
          ...qrState,
          loading: false,
          status: 'error',
          message: data.error || 'Erreur lors de la génération du QR code',
        });
      }
    } catch (error) {
      setQrState({
        ...qrState,
        loading: false,
        status: 'error',
        message: 'Erreur de connexion au service WhatsApp',
      });
    }
  };

  const startPollingStatus = (accountId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/whatsapp/qr?accountId=${accountId}`);
        const data = await response.json();

        if (data.connectionStatus === 'connected') {
          clearInterval(interval);
          setQrState(prev => ({
            ...prev,
            status: 'connected',
            message: 'Connecté avec succès!',
          }));
          fetchAccounts();
          setTimeout(() => {
            setQrState(prev => ({ ...prev, isOpen: false }));
          }, 2000);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 3000);

    // Stop polling if modal is closed
    return () => clearInterval(interval);
  };

  const handleSendMessage = (phone: string, message: string = '') => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const encodedMessage = encodeURIComponent(message);
    const waUrl = `https://wa.me/${cleanPhone}${message ? `?text=${encodedMessage}` : ''}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDisconnect = async (id: string) => {
    try {
      const response = await fetch('/api/whatsapp-accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, connectionStatus: 'disconnected' }),
      });
      if (response.ok) {
        fetchAccounts();
      }
    } catch (error) {
      console.error('Error disconnecting WhatsApp account:', error);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      for (const account of accounts) {
        if (account.isDefault) {
          await fetch('/api/whatsapp-accounts', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: account.id, isDefault: 0 }),
          });
        }
      }
      await fetch('/api/whatsapp-accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isDefault: 1 }),
      });
      fetchAccounts();
    } catch (error) {
      console.error('Error setting default account:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <Badge className="bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3 mr-1" />
            Connecté
          </Badge>
        );
      case 'disconnected':
        return (
          <Badge className="bg-slate-100 text-slate-700">
            <XCircle className="w-3 h-3 mr-1" />
            Déconnecté
          </Badge>
        );
      case 'connecting':
        return (
          <Badge className="bg-yellow-100 text-yellow-700">
            <Clock className="w-3 h-3 mr-1" />
            Connexion...
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* QR Code Modal */}
      <Dialog open={qrState.isOpen} onOpenChange={(open) => setQrState({ ...qrState, isOpen: open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connexion WhatsApp Baileys</DialogTitle>
            <DialogDescription>
              Scannez ce code QR avec votre application WhatsApp sur votre téléphone
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            {qrState.loading ? (
              <div className="flex flex-col items-center space-y-2">
                <Loader2 className="w-12 h-12 animate-spin text-green-600" />
                <p className="text-sm text-slate-500">{qrState.message}</p>
              </div>
            ) : qrState.qrCodeUrl ? (
              <div className="relative p-4 bg-white rounded-xl border-2 border-slate-100 shadow-inner">
                <img 
                  src={qrState.qrCodeUrl} 
                  alt="WhatsApp QR Code" 
                  className="w-64 h-64"
                />
                {qrState.status === 'connected' && (
                  <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center rounded-xl">
                    <CheckCircle className="w-16 h-16 text-green-500 mb-2" />
                    <p className="font-bold text-green-700">Connecté!</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <XCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
                <p className="text-sm text-red-600">{qrState.message}</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => qrState.accountId && handleConnect(accounts.find(a => a.id === qrState.accountId)!)}
                >
                  Réessayer
                </Button>
              </div>
            )}
            <div className="text-center">
              <p className="text-sm font-medium text-slate-700">{qrState.message}</p>
              <p className="text-xs text-slate-500 mt-1">
                Allez dans WhatsApp &gt; Appareils connectés &gt; Connecter un appareil
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQrState({ ...qrState, isOpen: false })}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">WhatsApp</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-slate-600">Gérez vos comptes WhatsApp</p>
            <Badge variant="outline" className="text-xs">Baileys (Gratuit)</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => window.location.href = '/dashboard/whatsapp/meta-business'}
          >
            <Send className="w-4 h-4 mr-2" />
            Envoyer via Meta Business
          </Button>
          <Button 
            variant="outline"
            onClick={() => window.location.href = '/dashboard/whatsapp/meta-setup'}
          >
            Configuration Meta API
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-gradient-to-r from-green-500 to-emerald-600"
                disabled={accounts.length >= 2}
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un compte
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un compte WhatsApp</DialogTitle>
                <DialogDescription>
                  Entrez le numéro de téléphone du compte WhatsApp à connecter
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Numéro de téléphone</Label>
                    <Input
                      id="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      placeholder="Ex: +212 6XX XXX XXX"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountName">Nom du compte (optionnel)</Label>
                    <Input
                      id="accountName"
                      value={formData.accountName}
                      onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                      placeholder="Ex: Compte principal, Support..."
                    />
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
      </div>

      {/* Quick Send */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-green-600" />
            Envoi Rapide WhatsApp
          </CardTitle>
          <CardDescription>
            Envoyez un message WhatsApp directement via wa.me
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Numéro de téléphone</Label>
              <Input
                value={quickSend.phoneNumber}
                onChange={(e) => setQuickSend({ ...quickSend, phoneNumber: e.target.value })}
                placeholder="+212 6XX XXX XXX"
              />
            </div>
            <div className="space-y-2">
              <Label>Message (optionnel)</Label>
              <Input
                value={quickSend.message}
                onChange={(e) => setQuickSend({ ...quickSend, message: e.target.value })}
                placeholder="Bonjour..."
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => handleSendMessage(quickSend.phoneNumber, quickSend.message)}
                disabled={!quickSend.phoneNumber}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Ouvrir WhatsApp
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accounts Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-8 text-slate-500">
            Chargement...
          </div>
        ) : accounts.length === 0 ? (
          <div className="col-span-full">
            <Card className="border-0 shadow-md">
              <CardContent className="py-12">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">Aucun compte WhatsApp</h3>
                  <p className="text-slate-500 mb-4">
                    Connectez votre premier compte WhatsApp pour commencer
                  </p>
                  <Button
                    onClick={() => setDialogOpen(true)}
                    className="bg-gradient-to-r from-green-500 to-emerald-600"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un compte
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          accounts.map((account) => (
            <Card key={account.id} className={cn(
              "border-0 shadow-md hover:shadow-lg transition",
              account.isDefault === 1 && "ring-2 ring-green-400"
            )}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                      <MessageSquare className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {account.accountName || 'Compte WhatsApp'}
                        {account.isDefault === 1 && (
                          <Badge className="bg-green-600 text-white text-xs">Par défaut</Badge>
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-1 text-sm text-slate-500">
                        <Phone className="w-3 h-3" />
                        {account.phoneNumber}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {account.isDefault !== 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-green-600 hover:text-green-700"
                        onClick={() => handleSetDefault(account.id)}
                      >
                        Par défaut
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500"
                      onClick={() => handleDelete(account.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Statut</span>
                  {getStatusBadge(account.connectionStatus)}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Dernière connexion</span>
                  <span className="text-slate-500">{formatDate(account.lastConnected)}</span>
                </div>

                <div className="flex gap-2 pt-2">
                  {account.connectionStatus === 'connected' ? (
                    <>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleDisconnect(account.id)}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Déconnecter
                      </Button>
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => handleSendMessage(account.phoneNumber)}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Ouvrir
                      </Button>
                    </>
                  ) : (
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => handleConnect(account)}
                    >
                      <QrCode className="w-4 h-4 mr-2" />
                      Afficher le Code QR
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
            <MessageSquare className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Comment utiliser WhatsApp Baileys?</h4>
              <p className="text-sm text-blue-700 mt-1">
                Cliquez sur "Afficher le Code QR" pour générer un code de connexion. Scannez-le avec votre application WhatsApp mobile. Cette méthode est gratuite et ne nécessite pas l'API Meta Business.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
