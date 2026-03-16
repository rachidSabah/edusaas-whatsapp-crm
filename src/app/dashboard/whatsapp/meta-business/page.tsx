'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertCircle,
  CheckCircle,
  Loader,
  Send,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MetaBusinessPage() {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const [credentials, setCredentials] = useState({
    phoneNumberId: '995426510331154',
    accessToken: 'EAALaU12ECDQBQ7jK1bvfJi3BOwUeZBWy3XgeE6DegEFJbGEneAIAVbZBj6AZAUh0NiL2YxhuFaHDtV9yaOUDbQ9skCqnO3mXIRnkjbcdKWyzFtmH2cdkEYqjX1eGSh2VmL5XlvfH0IdTqPkYIXC2zrmdqTei6KfX6xE5omLrXMuUqMZCoNtoKiYOt4928yEcMlFZCoIswrjVmPkMgY1uZARdEBZBpIAVIX4bznTac2uIRUGFM9P6qBZAAiAgM95ZAfjxdzoOsHkRDksLgmQfyRFcq',
  });

  const [message, setMessage] = useState({
    to: '',
    type: 'text',
    text: 'Bonjour! Ceci est un message de test.',
    templateName: 'hello_world',
    templateLanguage: 'en_US',
  });

  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);

  const [testResult, setTestResult] = useState<{
    success: boolean;
    phoneNumber?: string;
    error?: string;
  } | null>(null);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(
        `/api/whatsapp/send-meta?phoneNumberId=${credentials.phoneNumberId}&accessToken=${encodeURIComponent(credentials.accessToken)}`
      );
      const data = await response.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({
        success: false,
        error: 'Erreur de connexion',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!credentials.phoneNumberId || !credentials.accessToken || !message.to) {
      alert('Veuillez remplir tous les champs requis');
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const response = await fetch('/api/whatsapp/send-meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumberId: credentials.phoneNumberId,
          accessToken: credentials.accessToken,
          to: message.to,
          type: message.type,
          text: message.type === 'text' ? message.text : undefined,
          templateName: message.type === 'template' ? message.templateName : undefined,
          templateLanguage: message.type === 'template' ? message.templateLanguage : undefined,
        }),
      });

      const data = await response.json();
      setResult({
        success: data.success,
        message: data.message || data.error,
        details: data,
      });
    } catch (error) {
      setResult({
        success: false,
        message: 'Erreur lors de l\'envoi',
        details: error,
      });
    } finally {
      setSending(false);
    }
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(credentials.accessToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">WhatsApp Business API (Meta)</h1>
        <p className="text-slate-600 mt-2">
          Envoyez des messages via l'API officielle Meta WhatsApp Business
        </p>
      </div>

      {/* Credentials Card */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Identifiants Meta</CardTitle>
          <CardDescription>
            Configurez vos identifiants Meta WhatsApp Business
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phoneNumberId">Phone Number ID</Label>
              <Input
                id="phoneNumberId"
                value={credentials.phoneNumberId}
                onChange={(e) =>
                  setCredentials({ ...credentials, phoneNumberId: e.target.value })
                }
                placeholder="Ex: 995426510331154"
              />
              <p className="text-xs text-slate-500">
                Trouvez cet ID dans Meta App Dashboard
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessToken">Access Token</Label>
              <div className="flex gap-2">
                <Input
                  id="accessToken"
                  type="password"
                  value={credentials.accessToken}
                  onChange={(e) =>
                    setCredentials({ ...credentials, accessToken: e.target.value })
                  }
                  placeholder="Votre token d'accès Meta"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyToken}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              {copied && <p className="text-xs text-green-600">✓ Copié</p>}
            </div>
          </div>

          <Button
            onClick={handleTestConnection}
            disabled={testing}
            variant="outline"
            className="w-full"
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
                {testResult.success ? 'Connexion réussie!' : 'Erreur de connexion'}
              </AlertTitle>
              {testResult.phoneNumber && (
                <AlertDescription className="text-green-700 mt-1">
                  Numéro WhatsApp: {testResult.phoneNumber}
                </AlertDescription>
              )}
              {testResult.error && (
                <AlertDescription className="text-red-700 mt-1">
                  {testResult.error}
                </AlertDescription>
              )}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Message Composer */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-green-600" />
            Composer un Message
          </CardTitle>
          <CardDescription>
            Envoyez un message via Meta WhatsApp Business API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="to">Numéro de téléphone (destinataire)</Label>
            <Input
              id="to"
              value={message.to}
              onChange={(e) => setMessage({ ...message, to: e.target.value })}
              placeholder="Ex: +212 6XX XXX XXX ou 212XXXXXXXXX"
            />
            <p className="text-xs text-slate-500">
              Format: +33612345678 ou 33612345678
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type de message</Label>
            <Select
              value={message.type}
              onValueChange={(value) => setMessage({ ...message, type: value })}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Message texte</SelectItem>
                <SelectItem value="template">Template (hello_world)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {message.type === 'text' && (
            <div className="space-y-2">
              <Label htmlFor="text">Contenu du message</Label>
              <Textarea
                id="text"
                value={message.text}
                onChange={(e) => setMessage({ ...message, text: e.target.value })}
                placeholder="Entrez votre message..."
                rows={4}
              />
            </div>
          )}

          {message.type === 'template' && (
            <div className="space-y-4">
              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="w-4 h-4 text-blue-600" />
                <AlertTitle className="text-blue-900">Template hello_world</AlertTitle>
                <AlertDescription className="text-blue-700 text-sm mt-1">
                  Ce template doit être approuvé dans Meta App Dashboard avant utilisation.
                </AlertDescription>
              </Alert>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="templateName">Nom du template</Label>
                  <Input
                    id="templateName"
                    value={message.templateName}
                    onChange={(e) =>
                      setMessage({ ...message, templateName: e.target.value })
                    }
                    placeholder="Ex: hello_world"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="templateLanguage">Langue</Label>
                  <Select
                    value={message.templateLanguage}
                    onValueChange={(value) =>
                      setMessage({ ...message, templateLanguage: value })
                    }
                  >
                    <SelectTrigger id="templateLanguage">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en_US">English (US)</SelectItem>
                      <SelectItem value="fr_FR">Français</SelectItem>
                      <SelectItem value="es_ES">Español</SelectItem>
                      <SelectItem value="de_DE">Deutsch</SelectItem>
                      <SelectItem value="ar_AR">العربية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={handleSendMessage}
            disabled={sending}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {sending ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Envoyer le Message
              </>
            )}
          </Button>

          {result && (
            <Alert
              className={cn(
                result.success
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              )}
            >
              <AlertCircle
                className={cn(
                  'w-4 h-4',
                  result.success ? 'text-green-600' : 'text-red-600'
                )}
              />
              <AlertTitle
                className={result.success ? 'text-green-900' : 'text-red-900'}
              >
                {result.message}
              </AlertTitle>
              {result.details?.messageId && (
                <AlertDescription className="text-green-700 mt-1">
                  ID du message: {result.details.messageId}
                </AlertDescription>
              )}
              {result.details?.details?.error?.message && (
                <AlertDescription className="text-red-700 mt-1">
                  {result.details.details.error.message}
                </AlertDescription>
              )}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Documentation */}
      <Card className="border-0 shadow-md bg-slate-50">
        <CardHeader>
          <CardTitle>Documentation et Ressources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <h4 className="font-medium text-slate-900">Commande cURL équivalente:</h4>
            <div className="bg-white p-3 rounded border border-slate-200 text-xs font-mono overflow-x-auto">
              <code className="text-slate-700">
                curl -X POST https://graph.facebook.com/v22.0/995426510331154/messages \<br />
                -H 'Authorization: Bearer YOUR_TOKEN' \<br />
                -H 'Content-Type: application/json' \<br />
                -d '{"{"}' \<br />
                &nbsp;&nbsp;"messaging_product": "whatsapp", \<br />
                &nbsp;&nbsp;"to": "33612345678", \<br />
                &nbsp;&nbsp;"type": "text", \<br />
                &nbsp;&nbsp;"text": {"{"}' "body": "Bonjour!" {"}"}' \<br />
                {'}'}'
              </code>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-slate-900">Liens utiles:</h4>
            <ul className="space-y-1">
              <li>
                <a
                  href="https://developers.facebook.com/docs/whatsapp/cloud-api/reference/send-messages"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1"
                >
                  Documentation API Meta WhatsApp
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1"
                >
                  Guide de démarrage
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1"
                >
                  Codes d'erreur
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
