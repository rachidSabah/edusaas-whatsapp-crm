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
  Copy,
  Loader,
  Save,
  Settings,
  Webhook,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WebhookConfig {
  id: string;
  webhookUrl: string;
  verifyToken: string;
  subscribedEvents: string[];
  isConfigured: boolean;
  lastUpdated: string;
}

export default function WebhookConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const [config, setConfig] = useState<WebhookConfig>({
    id: '',
    webhookUrl: 'https://admin.cabincrew.academy/api/webhook',
    verifyToken: '',
    subscribedEvents: ['messages', 'message_status', 'message_template_status_update'],
    isConfigured: false,
    lastUpdated: '',
  });

  const [formData, setFormData] = useState({
    webhookUrl: '',
    verifyToken: '',
  });

  const [saveResult, setSaveResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/whatsapp/webhook-config');
      const data = await response.json();
      if (data.config) {
        setConfig(data.config);
        setFormData({
          webhookUrl: data.config.webhookUrl,
          verifyToken: data.config.verifyToken,
        });
      }
    } catch (error) {
      console.error('Error fetching webhook config:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async () => {
    if (!formData.webhookUrl || !formData.verifyToken) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    setSaving(true);
    setSaveResult(null);

    try {
      const response = await fetch('/api/whatsapp/webhook-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: formData.webhookUrl,
          verifyToken: formData.verifyToken,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSaveResult({
          success: true,
          message: 'Configuration du Webhook sauvegardée avec succès!',
        });
        setConfig(data.config);
      } else {
        setSaveResult({
          success: false,
          message: data.error || 'Erreur lors de la sauvegarde',
        });
      }
    } catch (error) {
      setSaveResult({
        success: false,
        message: 'Erreur lors de la sauvegarde',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const generateVerifyToken = () => {
    const token = `verify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setFormData({ ...formData, verifyToken: token });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Configuration du Webhook</h1>
        <p className="text-slate-600 mt-2">
          Configurez l'URL du Webhook et le Token de vérification pour recevoir les messages Meta
        </p>
      </div>

      {/* Main Configuration Card */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="w-5 h-5 text-blue-600" />
            Paramètres du Webhook
          </CardTitle>
          <CardDescription>
            Entrez votre URL de Webhook personnalisée et votre Token de vérification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Webhook URL */}
          <div className="space-y-2">
            <Label htmlFor="webhookUrl">URL du Webhook</Label>
            <div className="flex gap-2">
              <Input
                id="webhookUrl"
                value={formData.webhookUrl}
                onChange={(e) =>
                  setFormData({ ...formData, webhookUrl: e.target.value })
                }
                placeholder="Ex: https://admin.cabincrew.academy/api/webhook"
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleCopy(formData.webhookUrl, 'webhookUrl')}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            {copied === 'webhookUrl' && (
              <p className="text-xs text-green-600">✓ Copié dans le presse-papiers</p>
            )}
            <p className="text-xs text-slate-500">
              Cette URL sera utilisée par Meta pour envoyer les messages entrants
            </p>
          </div>

          {/* Verify Token */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="verifyToken">Token de Vérification</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={generateVerifyToken}
                className="text-blue-600 hover:text-blue-700"
              >
                Générer un Token
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                id="verifyToken"
                type="password"
                value={formData.verifyToken}
                onChange={(e) =>
                  setFormData({ ...formData, verifyToken: e.target.value })
                }
                placeholder="Entrez ou générez un token"
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleCopy(formData.verifyToken, 'verifyToken')}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            {copied === 'verifyToken' && (
              <p className="text-xs text-green-600">✓ Copié dans le presse-papiers</p>
            )}
            <p className="text-xs text-slate-500">
              Ce token doit correspondre à celui configuré dans Meta Dashboard
            </p>
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 h-10"
          >
            {saving ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Sauvegarde en cours...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Sauvegarder la Configuration
              </>
            )}
          </Button>

          {/* Save Result */}
          {saveResult && (
            <Alert
              className={cn(
                saveResult.success
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              )}
            >
              <AlertCircle
                className={cn(
                  'w-4 h-4',
                  saveResult.success ? 'text-green-600' : 'text-red-600'
                )}
              />
              <AlertTitle
                className={saveResult.success ? 'text-green-900' : 'text-red-900'}
              >
                {saveResult.message}
              </AlertTitle>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Current Configuration */}
      {config.isConfigured && (
        <Card className="border-0 shadow-md bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Configuration Actuelle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-green-700 font-medium">URL du Webhook</p>
              <p className="text-sm text-green-900 font-mono mt-1">{config.webhookUrl}</p>
            </div>
            <div>
              <p className="text-sm text-green-700 font-medium">Événements Abonnés</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                {config.subscribedEvents.map((event) => (
                  <Badge key={event} className="bg-green-600 text-white">
                    {event}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-green-700 font-medium">Dernière Mise à Jour</p>
              <p className="text-sm text-green-900 mt-1">
                {new Date(config.lastUpdated).toLocaleString('fr-FR')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions Card */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-600" />
            Instructions de Configuration Meta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="space-y-3 list-decimal list-inside">
            <li className="text-slate-700">
              Allez sur{' '}
              <a
                href="https://developers.facebook.com/apps"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                Meta App Dashboard
                <ExternalLink className="w-3 h-3" />
              </a>
            </li>
            <li className="text-slate-700">
              Naviguez vers <strong>WhatsApp → Configuration</strong>
            </li>
            <li className="text-slate-700">
              Dans la section <strong>Webhook</strong>, collez cette URL :
              <div className="bg-slate-100 p-3 rounded mt-2 font-mono text-sm break-all">
                {formData.webhookUrl}
              </div>
            </li>
            <li className="text-slate-700">
              Entrez votre Token de Vérification :
              <div className="bg-slate-100 p-3 rounded mt-2 font-mono text-sm break-all">
                {formData.verifyToken || '(À générer)'}
              </div>
            </li>
            <li className="text-slate-700">
              Abonnez-vous aux événements suivants :
              <ul className="list-disc list-inside mt-2 ml-4 space-y-1">
                <li>
                  <strong>messages</strong> - Pour recevoir les messages entrants
                </li>
                <li>
                  <strong>message_status</strong> - Pour les confirmations d'envoi
                </li>
                <li>
                  <strong>message_template_status_update</strong> - Pour les templates
                </li>
              </ul>
            </li>
            <li className="text-slate-700">
              Cliquez sur <strong>Vérifier et Enregistrer</strong>
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Baileys QR Code Info */}
      <Card className="border-0 shadow-md bg-purple-50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-purple-900">À propos du Code QR Baileys</h4>
              <p className="text-sm text-purple-700 mt-1">
                Si vous utilisez Baileys (connexion gratuite), assurez-vous de scanner le code QR
                affiché sur le portail WhatsApp Web officiel ou toute autre application WhatsApp
                officielle. Si cela ne fonctionne pas, mettez à jour l'application ou rafraîchissez
                la page.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
