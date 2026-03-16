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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  AlertCircle,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// WhatsApp Service URL
const WHATSAPP_SERVICE_URL = process.env.NEXT_PUBLIC_WHATSAPP_SERVICE_URL || 'http://localhost:3030';

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

interface EmbeddedBrowserState {
  url: string;
  isOpen: boolean;
  isFullscreen: boolean;
  phoneNumber: string;
  message: string;
}

interface WhatsAppConnectionStatus {
  status: 'connecting' | 'connected' | 'disconnected';
  qrCode?: string;
  phone?: string;
}

export default function WhatsAppPage() {
  const [accounts, setAccounts] = useState<WhatsAppAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    phoneNumber: '',
    accountName: '',
  });
  
  // Baileys connection state
  const [connectionStatus, setConnectionStatus] = useState<WhatsAppConnectionStatus>({
    status: 'disconnected'
  });
  const [connecting, setConnecting] = useState(false);
  const [qrPolling, setQrPolling] = useState<NodeJS.Timeout | null>(null);
  
  // Embedded browser state
  const [browser, setBrowser] = useState<EmbeddedBrowserState>({
    url: '',
    isOpen: false,
    isFullscreen: false,
    phoneNumber: '',
    message: '',
  });
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [browserHistory, setBrowserHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

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

  // Fetch Baileys connection status
  const fetchConnectionStatus = async () => {
    try {
      // Get the current user's organization ID from the session
      const sessionRes = await fetch('/api/auth/session');
      const sessionData = await sessionRes.json();
      
      if (!sessionData.user?.organizationId) {
        return;
      }

      const response = await fetch(`${WHATSAPP_SERVICE_URL}/status?organizationId=${sessionData.user.organizationId}&XTransformPort=3030`);
      if (response.ok) {
        const data = await response.json();
        setConnectionStatus({
          status: data.status,
          qrCode: data.qrCode,
          phone: data.phone,
        });
      }
    } catch (error) {
      console.error('Error fetching connection status:', error);
    }
  };

  // Connect to WhatsApp via Baileys
  const handleBaileysConnect = async () => {
    setConnecting(true);
    try {
      const sessionRes = await fetch('/api/auth/session');
      const sessionData = await sessionRes.json();
      
      if (!sessionData.user?.organizationId) {
        alert('Vous devez être connecté à une organisation');
        setConnecting(false);
        return;
      }

      const response = await fetch(`${WHATSAPP_SERVICE_URL}/connect?XTransformPort=3030`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: sessionData.user.organizationId }),
      });

      if (response.ok) {
        // Start polling for QR code
        const pollInterval = setInterval(async () => {
          await fetchConnectionStatus();
        }, 2000);
        
        setQrPolling(pollInterval);
      }
    } catch (error) {
      console.error('Error connecting:', error);
    }
  };

  // Disconnect from WhatsApp
  const handleBaileysDisconnect = async () => {
    try {
      const sessionRes = await fetch('/api/auth/session');
      const sessionData = await sessionRes.json();
      
      if (qrPolling) {
        clearInterval(qrPolling);
        setQrPolling(null);
      }

      await fetch(`${WHATSAPP_SERVICE_URL}/disconnect?XTransformPort=3030`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: sessionData.user?.organizationId }),
      });

      setConnectionStatus({ status: 'disconnected' });
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (qrPolling) {
        clearInterval(qrPolling);
      }
    };
  }, [qrPolling]);

  // Stop polling when connected
  useEffect(() => {
    if (connectionStatus.status === 'connected' && qrPolling) {
      clearInterval(qrPolling);
      setQrPolling(null);
      setConnecting(false);
    }
  }, [connectionStatus.status, qrPolling]);

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

  // Open WhatsApp Web in embedded browser
  const handleConnect = async (account: WhatsAppAccount) => {
    // Format phone number for WhatsApp Web
    const cleanPhone = account.phoneNumber.replace(/[^0-9]/g, '');
    const whatsappUrl = `https://web.whatsapp.com`;
    
    setBrowser({
      url: whatsappUrl,
      isOpen: true,
      isFullscreen: false,
      phoneNumber: cleanPhone,
      message: '',
    });
    
    setBrowserHistory([whatsappUrl]);
    setHistoryIndex(0);
    
    // Update account status
    try {
      await fetch('/api/whatsapp-accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: account.id, 
          connectionStatus: 'connecting' 
        }),
      });
      fetchAccounts();
    } catch (error) {
      console.error('Error updating account status:', error);
    }
  };

  // Send message via wa.me link (opens in NEW WINDOW - cannot be embedded in iframe)
  const handleSendMessage = (phone: string, message: string = '') => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const encodedMessage = encodeURIComponent(message);
    const waUrl = `https://wa.me/${cleanPhone}${message ? `?text=${encodedMessage}` : ''}`;
    
    // Open in new window/tab - wa.me cannot be embedded in iframe
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
        setBrowser({ ...browser, isOpen: false });
        fetchAccounts();
      }
    } catch (error) {
      console.error('Error disconnecting WhatsApp account:', error);
    }
  };

  // Browser navigation
  const handleGoBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setBrowser({ ...browser, url: browserHistory[newIndex] });
    }
  };

  const handleGoForward = () => {
    if (historyIndex < browserHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setBrowser({ ...browser, url: browserHistory[newIndex] });
    }
  };

  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = browser.url;
    }
  };

  const handleNavigate = (url: string) => {
    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = 'https://' + url;
    }
    setBrowser({ ...browser, url: fullUrl });
    const newHistory = [...browserHistory.slice(0, historyIndex + 1), fullUrl];
    setBrowserHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleSetDefault = async (id: string) => {
    try {
      // Remove default from all accounts
      for (const account of accounts) {
        if (account.isDefault) {
          await fetch('/api/whatsapp-accounts', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: account.id, isDefault: 0 }),
          });
        }
      }
      // Set new default
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
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-700">
            <Clock className="w-3 h-3 mr-1" />
            En attente
          </Badge>
        );
      case 'connecting':
        return (
          <Badge className="bg-blue-100 text-blue-700">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            Connexion...
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">{status}</Badge>
        );
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

  // Embedded Browser Component
  const EmbeddedBrowser = () => (
    <div className={cn(
      "fixed bg-white z-50 flex flex-col shadow-2xl border border-slate-200",
      browser.isFullscreen 
        ? "inset-0 rounded-none" 
        : "inset-4 rounded-xl"
    )}>
      {/* Browser Title Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-100 border-b border-slate-200 rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <button 
              onClick={() => setBrowser({ ...browser, isOpen: false })}
              className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition"
            />
            <button 
              onClick={() => setBrowser({ ...browser, isFullscreen: !browser.isFullscreen })}
              className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition"
            />
            <button 
              onClick={() => setBrowser({ ...browser, isFullscreen: !browser.isfullscreen })}
              className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 transition"
            />
          </div>
        </div>
        <div className="text-xs text-slate-500">WhatsApp Web</div>
        <button
          onClick={() => setBrowser({ ...browser, isOpen: false })}
          className="text-slate-400 hover:text-slate-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Browser Address Bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200">
        <button 
          onClick={handleGoBack}
          disabled={historyIndex <= 0}
          className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </button>
        <button 
          onClick={handleGoForward}
          disabled={historyIndex >= browserHistory.length - 1}
          className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30"
        >
          <ArrowRight className="w-4 h-4 text-slate-600" />
        </button>
        <button 
          onClick={handleRefresh}
          className="p-1.5 rounded hover:bg-slate-200"
        >
          <RotateCcw className="w-4 h-4 text-slate-600" />
        </button>
        <div className="flex-1 flex items-center bg-white rounded-full border border-slate-200 px-3 py-1.5">
          <svg className="w-4 h-4 mr-2 text-green-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          <input
            type="text"
            value={browser.url}
            onChange={(e) => setBrowser({ ...browser, url: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleNavigate(browser.url);
              }
            }}
            className="flex-1 text-sm outline-none text-slate-700"
            placeholder="Entrez une URL..."
          />
        </div>
        <button
          onClick={() => setBrowser({ ...browser, isFullscreen: !browser.isFullscreen })}
          className="p-1.5 rounded hover:bg-slate-200"
        >
          {browser.isFullscreen ? (
            <Minimize2 className="w-4 h-4 text-slate-600" />
          ) : (
            <Maximize2 className="w-4 h-4 text-slate-600" />
          )}
        </button>
      </div>

      {/* Browser Content */}
      <div className="flex-1 bg-white overflow-hidden">
        {browser.url.includes('web.whatsapp.com') ? (
          <iframe
            ref={iframeRef}
            src={browser.url}
            className="w-full h-full border-0"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
            allow="camera; microphone; fullscreen"
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-slate-50">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-green-600" />
              <p className="text-slate-600">Navigateur intégré WhatsApp Web</p>
              <p className="text-sm text-slate-400 mt-2">
                Connectez votre compte WhatsApp via le navigateur intégré
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Embedded Browser Modal */}
      {browser.isOpen && <EmbeddedBrowser />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">WhatsApp</h1>
          <p className="text-slate-600">Gérez vos comptes WhatsApp (jusqu'à 2 comptes)</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-gradient-to-r from-green-500 to-emerald-600"
              disabled={accounts.length >= 2}
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un compte
              {accounts.length >= 2 && <span className="ml-1 text-xs">(max 2)</span>}
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

      {/* Quick Send */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-green-600" />
            Envoi Rapide WhatsApp
          </CardTitle>
          <CardDescription>
            Envoyez un message WhatsApp directement via wa.me (ouvre dans un nouvel onglet)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Numéro de téléphone</Label>
              <Input
                value={browser.phoneNumber}
                onChange={(e) => setBrowser({ ...browser, phoneNumber: e.target.value })}
                placeholder="+212 6XX XXX XXX"
              />
            </div>
            <div className="space-y-2">
              <Label>Message (optionnel)</Label>
              <Input
                value={browser.message}
                onChange={(e) => setBrowser({ ...browser, message: e.target.value })}
                placeholder="Bonjour..."
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => handleSendMessage(browser.phoneNumber, browser.message)}
                disabled={!browser.phoneNumber}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Ouvrir WhatsApp
              </Button>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Format utilisé: https://wa.me/[numéro]?text=[message] - S'ouvre dans un nouvel onglet
          </p>
        </CardContent>
      </Card>

      {/* Baileys WhatsApp Connection */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {connectionStatus.status === 'connected' ? (
              <Wifi className="w-5 h-5 text-green-600" />
            ) : (
              <WifiOff className="w-5 h-5 text-slate-400" />
            )}
            WhatsApp Baileys (Gratuit)
          </CardTitle>
          <CardDescription>
            Connectez WhatsApp via le service Baileys - Aucun frais API
          </CardDescription>
        </CardHeader>
        <CardContent>
          {connectionStatus.status === 'connected' ? (
            <div className="space-y-4">
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">WhatsApp Connecté</AlertTitle>
                <AlertDescription className="text-green-700">
                  {connectionStatus.phone && `Numéro: ${connectionStatus.phone}`}
                  <br />
                  Vous pouvez maintenant envoyer et recevoir des messages automatiquement.
                </AlertDescription>
              </Alert>
              <Button
                onClick={handleBaileysDisconnect}
                variant="outline"
                className="w-full"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Déconnecter WhatsApp
              </Button>
            </div>
          ) : connectionStatus.status === 'connecting' || connecting ? (
            <div className="space-y-4">
              <Alert className="bg-blue-50 border-blue-200">
                <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                <AlertTitle className="text-blue-800">Connexion en cours...</AlertTitle>
                <AlertDescription className="text-blue-700">
                  Scannez le code QR avec votre application WhatsApp
                </AlertDescription>
              </Alert>
              {connectionStatus.qrCode && (
                <div className="bg-white p-4 rounded-lg border text-center">
                  <pre className="text-xs font-mono whitespace-pre-wrap bg-slate-100 p-4 rounded">
                    {connectionStatus.qrCode.substring(0, 100)}...
                  </pre>
                  <p className="text-sm text-slate-500 mt-2">
                    QR Code affiché dans le terminal du service WhatsApp
                  </p>
                </div>
              )}
              <Button
                onClick={handleBaileysDisconnect}
                variant="outline"
                className="w-full"
              >
                Annuler
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert className="bg-slate-50 border-slate-200">
                <AlertCircle className="h-4 w-4 text-slate-600" />
                <AlertTitle className="text-slate-800">WhatsApp Non Connecté</AlertTitle>
                <AlertDescription className="text-slate-600">
                  Cliquez sur le bouton ci-dessous pour connecter votre compte WhatsApp.
                  Un QR code sera généré pour l'authentification.
                </AlertDescription>
              </Alert>
              <Button
                onClick={handleBaileysConnect}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <QrCode className="w-4 h-4 mr-2" />
                Connecter WhatsApp
              </Button>
            </div>
          )}
          <p className="text-xs text-slate-500 mt-3">
            Service Baileys sur le port 3030 - Solution gratuite pour WhatsApp Web
          </p>
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
                    Connectez votre premier compte WhatsApp pour commencer à envoyer des messages
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
                        Définir par défaut
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
                
                {account.deviceId && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Appareil</span>
                    <div className="flex items-center gap-1 text-slate-500">
                      <Smartphone className="w-3 h-3" />
                      <span className="truncate max-w-[120px]">{account.deviceId}</span>
                    </div>
                  </div>
                )}
                
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
                        onClick={() => handleSendMessage(account.phoneNumber.replace(/[^0-9]/g, ''))}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Ouvrir WhatsApp
                      </Button>
                    </>
                  ) : (
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => handleConnect(account)}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Connecter WhatsApp Web
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
              <h4 className="font-medium text-blue-900">Comment utiliser WhatsApp avec EduSaaS?</h4>
              <p className="text-sm text-blue-700 mt-1">
                <strong>Méthode 1 - Envoi direct:</strong> Utilisez l'envoi rapide pour ouvrir WhatsApp avec le numéro et message pré-remplis.<br/>
                <strong>Méthode 2 - WhatsApp Web:</strong> Cliquez sur "Connecter WhatsApp Web" pour utiliser WhatsApp dans le navigateur intégré.<br/>
                <strong>Note:</strong> wa.me ouvre WhatsApp dans un nouvel onglet. Vous pouvez configurer jusqu'à 2 comptes WhatsApp.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
