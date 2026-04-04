'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, QrCode, CheckCircle, AlertCircle, Smartphone, RefreshCw } from 'lucide-react';

interface QRStatus {
  status: 'connecting' | 'pending' | 'connected' | 'waiting' | 'error';
  qrCode?: string;
  phoneNumber?: string;
  message?: string;
  lastActivity?: string;
}

export default function BaileysQRPage() {
  const [qrStatus, setQRStatus] = useState<QRStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch QR code status
  const fetchQRStatus = async () => {
    try {
      const response = await fetch('/api/whatsapp/baileys/qr');
      const data = await response.json();

      if (response.ok) {
        setQRStatus(data);
        setError(null);
      } else {
        setQRStatus({ status: 'error', message: data.message });
        if (response.status === 404) {
          setError('Aucune session trouvée. Cliquez sur "Démarrer la connexion" pour commencer.');
        }
      }
    } catch (err) {
      console.error('Error fetching QR status:', err);
      setError('Erreur lors de la récupération du QR code');
      setQRStatus({ status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Initiate new connection
  const handleStartConnection = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/whatsapp/baileys/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: 'default' }),
      });

      const data = await response.json();
      setQRStatus(data);
      setError(null);
      setAutoRefresh(true);
    } catch (err) {
      console.error('Error starting connection:', err);
      setError('Erreur lors du démarrage de la connexion');
    } finally {
      setLoading(false);
    }
  };

  // Disconnect session
  const handleDisconnect = async () => {
    if (!confirm('Êtes-vous sûr de vouloir déconnecter cette session?')) return;

    try {
      const response = await fetch('/api/whatsapp/baileys/qr', {
        method: 'DELETE',
      });

      if (response.ok) {
        setQRStatus({ status: 'waiting', message: 'Session déconnectée' });
        setAutoRefresh(false);
      }
    } catch (err) {
      console.error('Error disconnecting:', err);
      setError('Erreur lors de la déconnexion');
    }
  };

  // Auto-refresh QR code every 5 seconds if pending
  useEffect(() => {
    fetchQRStatus();

    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchQRStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'connecting':
        return 'bg-blue-100 text-blue-800';
      case 'waiting':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Connecté';
      case 'pending':
        return 'En attente de scan';
      case 'connecting':
        return 'Connexion en cours...';
      case 'waiting':
        return 'En attente';
      case 'error':
        return 'Erreur';
      default:
        return 'Inconnu';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Connexion WhatsApp Baileys</h1>
        <p className="text-slate-600 mt-2">
          Connectez votre compte WhatsApp personnel comme solution de secours (Gratuit)
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <AlertTitle className="text-red-900">Erreur</AlertTitle>
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {/* Status Card */}
      {qrStatus && (
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              État de la Connexion
            </CardTitle>
            <Badge className={getStatusColor(qrStatus.status)}>
              {getStatusLabel(qrStatus.status)}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {qrStatus.phoneNumber && (
              <div>
                <p className="text-sm text-slate-600">Numéro de téléphone</p>
                <p className="font-semibold text-slate-900">{qrStatus.phoneNumber}</p>
              </div>
            )}

            {qrStatus.lastActivity && (
              <div>
                <p className="text-sm text-slate-600">Dernière activité</p>
                <p className="font-semibold text-slate-900">
                  {new Date(qrStatus.lastActivity).toLocaleString('fr-FR')}
                </p>
              </div>
            )}

            {qrStatus.message && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">{qrStatus.message}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* QR Code Display */}
      {qrStatus?.status === 'pending' && qrStatus.qrCode && (
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Code QR à Scanner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
              <img
                src={qrStatus.qrCode}
                alt="WhatsApp QR Code"
                className="w-64 h-64 border-4 border-white shadow-lg rounded-lg"
              />
            </div>

            <div className="space-y-2 text-center">
              <p className="font-semibold text-slate-900">
                Scannez ce code QR avec votre téléphone
              </p>
              <p className="text-sm text-slate-600">
                Ouvrez WhatsApp → Appareils connectés → Connecter un appareil
              </p>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>⏱️ Le code QR expire dans 2 minutes.</strong> Si vous ne voyez pas le code se mettre à jour,
                cliquez sur "Rafraîchir le QR".
              </p>
            </div>

            <Button
              onClick={fetchQRStatus}
              variant="outline"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rafraîchissement...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Rafraîchir le QR
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Connected State */}
      {qrStatus?.status === 'connected' && (
        <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-emerald-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Connecté avec Succès
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-green-100 border border-green-300 rounded-lg">
              <p className="text-green-900">
                ✓ Votre compte WhatsApp est maintenant connecté et prêt à recevoir des messages.
              </p>
            </div>

            <Button
              onClick={handleDisconnect}
              variant="outline"
              className="w-full text-red-600 border-red-200 hover:bg-red-50"
            >
              Déconnecter
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {(!qrStatus || qrStatus.status === 'waiting' || qrStatus.status === 'error') && (
        <div className="flex gap-3">
          <Button
            onClick={handleStartConnection}
            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Démarrage...
              </>
            ) : (
              <>
                <QrCode className="w-4 h-4 mr-2" />
                Démarrer la Connexion
              </>
            )}
          </Button>
        </div>
      )}

      {/* Info Section */}
      <Card className="border-0 shadow-md bg-slate-50">
        <CardHeader>
          <CardTitle className="text-sm">ℹ️ À Propos de Baileys</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          <p>
            <strong>Baileys</strong> est une solution gratuite qui utilise votre compte WhatsApp personnel pour envoyer et recevoir des messages.
          </p>
          <p>
            <strong>Avantages :</strong>
            <ul className="list-disc list-inside mt-1">
              <li>Gratuit - pas de frais mensuels</li>
              <li>Solution de secours si l'API Meta rencontre un problème</li>
              <li>Accès illimité aux messages</li>
            </ul>
          </p>
          <p>
            <strong>Limitations :</strong>
            <ul className="list-disc list-inside mt-1">
              <li>Nécessite un téléphone avec WhatsApp installé</li>
              <li>La session peut se déconnecter si le téléphone se déconnecte</li>
              <li>Pas de support officiel de WhatsApp</li>
            </ul>
          </p>
          <p className="pt-2 text-yellow-700 bg-yellow-50 p-2 rounded">
            💡 <strong>Conseil :</strong> Utilisez Baileys comme secours. Préférez l'API WhatsApp Business (Meta) pour votre système principal.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
