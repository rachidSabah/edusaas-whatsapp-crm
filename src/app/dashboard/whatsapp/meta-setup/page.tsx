'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Loader,
  Copy,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetaConfig {
  configured: boolean;
  id?: string;
  businessAccountId?: string;
  phoneNumberId?: string;
  isActive?: boolean;
  webhookUrl?: string;
}

export default function MetaSetupPage() {
  const [config, setConfig] = useState<MetaConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    businessAccountId: '',
    phoneNumberId: '',
    accessToken: '',
    verifyToken: '',
  });

  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    phoneNumber?: string;
  } | null>(null);

  // Fetch current configuration
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/whatsapp/meta-config');
        const data = await response.json();
        setConfig(data);
        if (data.configured) {
          setFormData({
            businessAccountId: data.businessAccountId || '',
            phoneNumberId: data.phoneNumberId || '',
            accessToken: '',
            verifyToken: '',
          });
        }
      } catch (error) {
        console.error('Error fetching config:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const handleCopyWebhook = () => {
    if (config?.webhookUrl) {
      navigator.clipboard.writeText(config.webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTestConnection = async () => {
    if (!formData.accessToken || !formData.phoneNumberId) {
      alert('Veuillez remplir les champs requis');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/whatsapp/meta-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: formData.accessToken,
          phoneNumberId: formData.phoneNumberId,
        }),
      });

      const data = await response.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Erreur lors du test de connexion',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!formData.businessAccountId || !formData.phoneNumberId || !formData.accessToken) {
      alert('Veuillez remplir tous les champs requis');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/whatsapp/meta-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(data.config);
        alert('Configuration sauvegardée avec succès!');
      } else {
        const error = await response.json();
        alert(`Erreur: ${error.error}`);
      }
    } catch (error) {
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette configuration?')) return;

    try {
      const response = await fetch('/api/whatsapp/meta-config', {
        method: 'DELETE',
      });

      if (response.ok) {
        setConfig({ configured: false });
        setFormData({
          businessAccountId: '',
          phoneNumberId: '',
          accessToken: '',
          verifyToken: '',
        });
        alert('Configuration supprimée');
      }
    } catch (error) {
      alert('Erreur lors de la suppression');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Configuration Meta WhatsApp Business</h1>
        <p className="text-slate-600 mt-2">
          Configurez l'API WhatsApp Business officielle de Meta pour envoyer des messages
        </p>
      </div>

      {/* Status Card */}
      {config?.configured && (
        <Card className="border-0 shadow-md bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="font-medium text-green-900">Configuration Active</h3>
                <p className="text-sm text-green-700">
                  Votre API Meta WhatsApp Business est configurée et prête à l'emploi
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Form */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Détails de Configuration</CardTitle>
          <CardDescription>
            Entrez vos identifiants Meta WhatsApp Business
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="businessAccountId">Business Account ID</Label>
              <Input
                id="businessAccountId"
                value={formData.businessAccountId}
                onChange={(e) =>
                  setFormData({ ...formData, businessAccountId: e.target.value })
                }
                placeholder="Ex: 803001539495988"
                disabled={saving}
              />
              <p className="text-xs text-slate-500">
                Trouvez cet ID dans Meta App Dashboard → WhatsApp → Settings
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumberId">Phone Number ID</Label>
              <Input
                id="phoneNumberId"
                value={formData.phoneNumberId}
                onChange={(e) =>
                  setFormData({ ...formData, phoneNumberId: e.target.value })
                }
                placeholder="Ex: 123456789012345"
                disabled={saving}
              />
              <p className="text-xs text-slate-500">
                ID du numéro de téléphone WhatsApp Business
              </p>
            </div>
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
              disabled={saving}
            />
            <p className="text-xs text-slate-500">
              Générez un token dans Meta App Dashboard → Tools → Tokens
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="verifyToken">Verify Token (optionnel)</Label>
            <Input
              id="verifyToken"
              value={formData.verifyToken}
              onChange={(e) =>
                setFormData({ ...formData, verifyToken: e.target.value })
              }
              placeholder="Token pour vérifier les webhooks"
              disabled={saving}
            />
            <p className="text-xs text-slate-500">
              Utilisé pour vérifier les webhooks entrants
            </p>
          </div>

          {/* Test Result */}
          {testResult && (
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
                {testResult.message}
              </AlertTitle>
              {testResult.phoneNumber && (
                <AlertDescription className="text-green-700">
                  Numéro WhatsApp: {testResult.phoneNumber}
                </AlertDescription>
              )}
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleTestConnection}
              variant="outline"
              disabled={testing || saving}
              className="flex-1"
            >
              {testing ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Test en cours...
                </>
              ) : (
                'Tester la Connexion'
              )}
            </Button>

            <Button
              onClick={handleSave}
              disabled={saving || testing}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {saving ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                'Sauvegarder'
              )}
            </Button>

            {config?.configured && (
              <Button
                onClick={handleDelete}
                variant="destructive"
                disabled={saving}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Webhook Configuration */}
      {config?.webhookUrl && (
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Configuration du Webhook</CardTitle>
            <CardDescription>
              Configurez cette URL dans Meta Dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <div className="flex gap-2">
                <Input
                  value={config.webhookUrl}
                  readOnly
                  className="bg-slate-50"
                />
                <Button
                  onClick={handleCopyWebhook}
                  variant="outline"
                  size="icon"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              {copied && (
                <p className="text-sm text-green-600">✓ Copié dans le presse-papiers</p>
              )}
            </div>

            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertTitle>Instructions de Configuration</AlertTitle>
              <AlertDescription className="mt-2 space-y-2">
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Allez à Meta App Dashboard</li>
                  <li>Navigez vers WhatsApp → Configuration</li>
                  <li>Collez cette URL dans le champ Webhook URL</li>
                  <li>Entrez votre Verify Token</li>
                  <li>Abonnez-vous aux événements: messages, message_status</li>
                  <li>Cliquez sur Vérifier et Enregistrer</li>
                </ol>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Setup Guide */}
      <Card className="border-0 shadow-md bg-blue-50">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <h3 className="font-medium text-blue-900">Guide de Configuration Complet</h3>
            <ol className="space-y-2 text-sm text-blue-800">
              <li>
                <strong>1. Créer une App Meta:</strong> Allez sur{' '}
                <a
                  href="https://developers.facebook.com/apps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-600"
                >
                  Meta App Dashboard
                </a>
              </li>
              <li>
                <strong>2. Obtenir les Identifiants:</strong> Trouvez votre Business Account ID et
                Phone Number ID dans les paramètres WhatsApp
              </li>
              <li>
                <strong>3. Générer un Token:</strong> Créez un token d'accès avec les permissions
                whatsapp_business_messaging
              </li>
              <li>
                <strong>4. Configurer le Webhook:</strong> Utilisez l'URL ci-dessus et définissez
                un Verify Token
              </li>
              <li>
                <strong>5. Tester la Connexion:</strong> Cliquez sur "Tester la Connexion" pour
                vérifier les identifiants
              </li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
