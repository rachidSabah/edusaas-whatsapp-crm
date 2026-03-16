'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Save,
  TestTube,
  Loader2,
  Trash2,
  Star,
  CheckCircle,
  XCircle,
  Server,
  Mail,
  Key,
  Shield,
  Download,
} from 'lucide-react';

interface EmailConfig {
  id: string;
  provider: string;
  fromEmail: string;
  fromName: string | null;
  isDefault: number;
  isActive: number;
  smtpHost: string | null;
  smtpPort: number;
  smtpUser: string | null;
  smtpPassword: string | null;
  imapHost: string | null;
  imapPort: number;
  imapUser: string | null;
  imapPassword: string | null;
  popHost: string | null;
  popPort: number;
  popUser: string | null;
  popPassword: string | null;
  brevoApiKey: string | null;
  mailchimpApiKey: string | null;
  mailchimpListId: string | null;
  gmailClientId: string | null;
  gmailClientSecret: string | null;
  gmailRefreshToken: string | null;
}

const PROVIDERS = [
  { value: 'smtp', label: 'Serveur SMTP / IMAP', description: 'Configuration personnalisée', icon: Server },
  { value: 'brevo', label: 'Brevo (Sendinblue)', description: 'Service email transactionnel', icon: Mail },
  { value: 'mailchimp', label: 'Mailchimp', description: 'Mailchimp Transactional', icon: Mail },
  { value: 'gmail', label: 'Gmail', description: 'Compte Gmail via OAuth2', icon: Mail },
  { value: 'microsoft', label: 'Microsoft 365', description: 'Exchange Online / Outlook', icon: Mail },
];

export default function EmailSettingsPage() {
  const router = useRouter();
  const [configs, setConfigs] = useState<EmailConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<EmailConfig>>({
    provider: 'smtp',
    fromEmail: '',
    fromName: '',
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    imapHost: '',
    imapPort: 993,
    imapUser: '',
    imapPassword: '',
    popHost: '',
    popPort: 995,
    popUser: '',
    popPassword: '',
    brevoApiKey: '',
    mailchimpApiKey: '',
    mailchimpListId: '',
    gmailClientId: '',
    gmailClientSecret: '',
    gmailRefreshToken: '',
    isDefault: true,
    isActive: true,
  });

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const response = await fetch('/api/email/config');
      const data = await response.json() as { configs: EmailConfig[] };
      setConfigs(data.configs || []);
      
      if (data.configs && data.configs.length > 0) {
        const first = data.configs[0];
        setFormData({
          id: first.id,
          provider: first.provider,
          fromEmail: first.fromEmail,
          fromName: first.fromName || '',
          smtpHost: first.smtpHost || '',
          smtpPort: first.smtpPort || 587,
          smtpUser: first.smtpUser || '',
          smtpPassword: '',
          imapHost: first.imapHost || '',
          imapPort: first.imapPort || 993,
          imapUser: first.imapUser || '',
          imapPassword: '',
          popHost: first.popHost || '',
          popPort: first.popPort || 995,
          popUser: first.popUser || '',
          popPassword: '',
          brevoApiKey: '',
          mailchimpApiKey: '',
          mailchimpListId: first.mailchimpListId || '',
          gmailClientId: first.gmailClientId || '',
          gmailClientSecret: '',
          gmailRefreshToken: '',
          isDefault: first.isDefault === 1,
          isActive: first.isActive === 1,
        });
      }
    } catch (error) {
      console.error('Error fetching configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.fromEmail) {
      alert('L\'email expéditeur est requis');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/email/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        fetchConfigs();
        alert('Configuration sauvegardée avec succès');
      } else {
        const data = await response.json();
        alert(data.error || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!formData.fromEmail) {
      alert('L\'email expéditeur est requis pour tester');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/email/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, test: true }),
      });

      const data = await response.json();
      setTestResult({
        success: data.success,
        message: data.message || (data.success ? 'Connexion réussie!' : 'Échec de la connexion'),
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Erreur lors du test de connexion',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const response = await fetch('/api/email/config?id=' + deleteId, {
        method: 'DELETE',
      });

      if (response.ok) {
        setConfigs(configs.filter(function(c) { return c.id !== deleteId; }));
        setDeleteId(null);
      } else {
        const data = await response.json();
        alert(data.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await fetch('/api/email/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id, isDefault: true }),
      });
      fetchConfigs();
    } catch (error) {
      console.error('Set default error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={function() { router.push('/dashboard/email'); }}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Configuration Email</h1>
          <p className="text-slate-500">Configurez vos fournisseurs email pour l'envoi et la réception</p>
        </div>
      </div>

      {configs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Comptes configurés</CardTitle>
            <CardDescription>Liste des configurations email actives</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {configs.map(function(config) {
                return (
                  <div key={config.id} className="flex items-center justify-between p-3 rounded-lg border bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className={"w-10 h-10 rounded-lg flex items-center justify-center " + (config.isActive ? "bg-green-100" : "bg-slate-200")}>
                        <Mail className={"w-5 h-5 " + (config.isActive ? "text-green-600" : "text-slate-400")} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{config.fromEmail}</p>
                          {config.isDefault === 1 && (
                            <Badge className="bg-yellow-100 text-yellow-700">
                              <Star className="w-3 h-3 mr-1" />
                              Par défaut
                            </Badge>
                          )}
                          {!config.isActive && <Badge variant="secondary">Inactif</Badge>}
                        </div>
                        <p className="text-sm text-slate-500">
                          {PROVIDERS.find(function(p) { return p.value === config.provider; })?.label || config.provider}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {config.isDefault !== 1 && (
                        <Button variant="outline" size="sm" onClick={function() { handleSetDefault(config.id); }}>
                          Définir par défaut
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={function() { setDeleteId(config.id); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {formData.id ? 'Modifier la configuration' : 'Nouvelle configuration'}
          </CardTitle>
          <CardDescription>
            Configurez votre fournisseur email pour l&apos;envoi (SMTP) et la réception (IMAP/POP)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Fournisseur</Label>
            <Select value={formData.provider} onValueChange={function(v) { setFormData({...formData, provider: v}); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map(function(p) {
                  return (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fromEmail">Email expéditeur *</Label>
              <Input
                id="fromEmail"
                type="email"
                value={formData.fromEmail}
                onChange={function(e) { setFormData({...formData, fromEmail: e.target.value}); }}
                placeholder="noreply@monentreprise.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromName">Nom expéditeur</Label>
              <Input
                id="fromName"
                value={formData.fromName}
                onChange={function(e) { setFormData({...formData, fromName: e.target.value}); }}
                placeholder="Mon Entreprise"
              />
            </div>
          </div>

          {(formData.provider === 'smtp' || formData.provider === 'microsoft') && (
            <div className="space-y-6">
              {/* SMTP Section */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Server className="w-4 h-4" />
                    Configuration SMTP (Envoi)
                  </CardTitle>
                  <CardDescription>Paramètres du serveur d&apos;envoi</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="smtpHost">Hôte SMTP</Label>
                      <Input
                        id="smtpHost"
                        value={formData.smtpHost}
                        onChange={function(e) { setFormData({...formData, smtpHost: e.target.value}); }}
                        placeholder="smtp.example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtpPort">Port</Label>
                      <Input
                        id="smtpPort"
                        type="number"
                        value={formData.smtpPort}
                        onChange={function(e) { setFormData({...formData, smtpPort: parseInt(e.target.value) || 587}); }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="smtpUser">Utilisateur SMTP</Label>
                      <Input
                        id="smtpUser"
                        value={formData.smtpUser}
                        onChange={function(e) { setFormData({...formData, smtpUser: e.target.value}); }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtpPassword">Mot de passe SMTP</Label>
                      <Input
                        id="smtpPassword"
                        type="password"
                        value={formData.smtpPassword}
                        onChange={function(e) { setFormData({...formData, smtpPassword: e.target.value}); }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* IMAP Section */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Configuration IMAP (Réception)
                  </CardTitle>
                  <CardDescription>Paramètres pour recevoir les emails dans le CRM</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="imapHost">Hôte IMAP</Label>
                      <Input
                        id="imapHost"
                        value={formData.imapHost}
                        onChange={function(e) { setFormData({...formData, imapHost: e.target.value}); }}
                        placeholder="imap.example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="imapPort">Port</Label>
                      <Input
                        id="imapPort"
                        type="number"
                        value={formData.imapPort}
                        onChange={function(e) { setFormData({...formData, imapPort: parseInt(e.target.value) || 993}); }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="imapUser">Utilisateur IMAP</Label>
                      <Input
                        id="imapUser"
                        value={formData.imapUser}
                        onChange={function(e) { setFormData({...formData, imapUser: e.target.value}); }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="imapPassword">Mot de passe IMAP</Label>
                      <Input
                        id="imapPassword"
                        type="password"
                        value={formData.imapPassword}
                        onChange={function(e) { setFormData({...formData, imapPassword: e.target.value}); }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* POP Section (Optional) */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-slate-500">
                    <Download className="w-4 h-4" />
                    Configuration POP3 (Alternative)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="popHost">Hôte POP</Label>
                      <Input
                        id="popHost"
                        value={formData.popHost}
                        onChange={function(e) { setFormData({...formData, popHost: e.target.value}); }}
                        placeholder="pop.example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="popPort">Port</Label>
                      <Input
                        id="popPort"
                        type="number"
                        value={formData.popPort}
                        onChange={function(e) { setFormData({...formData, popPort: parseInt(e.target.value) || 995}); }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {formData.provider === 'brevo' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Configuration Brevo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="brevoApiKey">Clé API Brevo</Label>
                  <Input
                    id="brevoApiKey"
                    type="password"
                    value={formData.brevoApiKey}
                    onChange={function(e) { setFormData({...formData, brevoApiKey: e.target.value}); }}
                    placeholder="xkeysib-..."
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {formData.provider === 'mailchimp' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Configuration Mailchimp</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mailchimpApiKey">Clé API Mailchimp</Label>
                  <Input
                    id="mailchimpApiKey"
                    type="password"
                    value={formData.mailchimpApiKey}
                    onChange={function(e) { setFormData({...formData, mailchimpApiKey: e.target.value}); }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {formData.provider === 'gmail' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Configuration Gmail OAuth2
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gmailClientId">Client ID</Label>
                  <Input
                    id="gmailClientId"
                    value={formData.gmailClientId}
                    onChange={function(e) { setFormData({...formData, gmailClientId: e.target.value}); }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gmailClientSecret">Client Secret</Label>
                  <Input
                    id="gmailClientSecret"
                    type="password"
                    value={formData.gmailClientSecret}
                    onChange={function(e) { setFormData({...formData, gmailClientSecret: e.target.value}); }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gmailRefreshToken">Refresh Token</Label>
                  <Input
                    id="gmailRefreshToken"
                    type="password"
                    value={formData.gmailRefreshToken}
                    onChange={function(e) { setFormData({...formData, gmailRefreshToken: e.target.value}); }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <Label>Compte par défaut</Label>
              <p className="text-sm text-slate-500">Utilisé pour l&apos;envoi d&apos;emails</p>
            </div>
            <Switch
              checked={formData.isDefault}
              onCheckedChange={function(c) { setFormData({...formData, isDefault: c}); }}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <Label>Actif</Label>
              <p className="text-sm text-slate-500">Activez ce compte pour l&apos;utiliser</p>
            </div>
            <Switch
              checked={formData.isActive}
              onCheckedChange={function(c) { setFormData({...formData, isActive: c}); }}
            />
          </div>

          {testResult && (
            <div className={"flex items-center gap-2 p-4 rounded-lg " + (testResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700")}>
              {testResult.success ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              {testResult.message}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleTest} disabled={testing}>
              {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TestTube className="w-4 h-4 mr-2" />}
              Tester
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Sauvegarder
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={function() { setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce compte?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
