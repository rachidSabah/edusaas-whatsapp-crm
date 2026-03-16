'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, User, Building2, Bot, MessageSquare, Save, QrCode, 
  Send, Loader2, Sparkles, RefreshCw, CheckCircle, XCircle,
  Upload, FileText, Trash2, Download, Clock, Mail, Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AI_MODELS, initPuter, isPuterLoaded, aiChat, getKV, setKV } from '@/lib/puter';

interface Organization {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  country?: string | null;
  plan: string;
  aiEnabled: boolean;
  aiDailyLimit: number;
  whatsappConnected: boolean;
  whatsappPhone: string | null;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AISettings {
  enabled: boolean;
  model: string;
  autoReply: boolean;
  systemPrompt: string;
}

interface EmailConfig {
  id: string;
  provider: string;
  smtpHost: string | null;
  smtpPort: number;
  smtpUser: string | null;
  smtpPassword: string | null;
  imapHost: string | null;
  imapPort: number;
  imapUser: string | null;
  imapPassword: string | null;
  brevoApiKey: string | null;
  gmailClientId: string | null;
  gmailClientSecret: string | null;
  gmailRefreshToken: string | null;
  fromEmail: string | null;
  fromName: string | null;
  isDefault: number;
  isActive: number;
}

function SettingsPageContent() {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab') || 'organization';
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  
  // Update tab when URL changes
  useEffect(() => {
    const newTab = searchParams.get('tab');
    if (newTab && newTab !== activeTab) {
      setActiveTab(newTab);
    }
  }, [searchParams, activeTab]);
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: 'Morocco',
    aiEnabled: true,
  });
  const [isNewOrg, setIsNewOrg] = useState(false);

  // AI Settings
  const [aiSettings, setAiSettings] = useState<AISettings>({
    enabled: true,
    model: 'gpt-4o-mini',
    autoReply: true,
    systemPrompt: `Tu es un assistant IA pour une école de langues au Maroc appelée {organisation}.
Tu réponds aux questions des parents et étudiants en français de manière professionnelle et amicale.

Instructions:
- Réponds toujours en français
- Sois professionnel mais amical
- Si tu ne connais pas la réponse, dis-le poliment et propose de contacter l'administration
- Sois concis mais complet`,
  });

  // AI Chat Test
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [puterReady, setPuterReady] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Email Settings
  const [emailConfigs, setEmailConfigs] = useState<EmailConfig[]>([]);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [editingConfig, setEditingConfig] = useState<EmailConfig | null>(null);
  const [emailFormData, setEmailFormData] = useState({
    provider: 'smtp',
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    imapHost: '',
    imapPort: 993,
    imapUser: '',
    imapPassword: '',
    brevoApiKey: '',
    gmailClientId: '',
    gmailClientSecret: '',
    gmailRefreshToken: '',
    fromEmail: '',
    fromName: '',
    isDefault: true,
    isActive: true,
  });

  const fetchOrganization = async () => {
    try {
      const response = await fetch('/api/organizations');
      const data = await response.json();
      
      // Handle both single organization and array of organizations
      const orgs = data.organizations || (data.organization ? [data.organization] : []);
      
      if (orgs.length > 0) {
        // If user is SUPER_ADMIN, show the first organization (they can switch if needed)
        // If regular user, show their organization
        const org = orgs[0];
        setOrganization(org);
        setFormData({
          name: org.name || '',
          email: org.email || '',
          phone: org.phone || '',
          address: org.address || '',
          city: org.city || '',
          country: org.country || 'Morocco',
          aiEnabled: org.aiEnabled ?? true,
        });
        setIsNewOrg(false);
      } else {
        // No organization exists - set up for creating a new one
        setIsNewOrg(true);
      }
    } catch (error) {
      console.error('Error fetching organization:', error);
      setIsNewOrg(true);
    } finally {
      setLoading(false);
    }
  };

  // Fetch email configurations
  const fetchEmailConfigs = async () => {
    setEmailLoading(true);
    try {
      const response = await fetch('/api/email/config');
      const data = await response.json();
      setEmailConfigs(data.configs || []);
    } catch (error) {
      console.error('Error fetching email configs:', error);
    } finally {
      setEmailLoading(false);
    }
  };

  // Initialize Puter.js
  useEffect(() => {
    const init = async () => {
      const loaded = await initPuter();
      setPuterReady(loaded);
      
      if (loaded) {
        // Load saved AI settings
        const savedSettings = await getKV<AISettings>('ai_settings');
        if (savedSettings) {
          setAiSettings(savedSettings);
        }
      }
    };
    
    init();
    fetchOrganization();
    fetchEmailConfigs();
  }, []);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isNewOrg) {
        // Create new organization
        const slug = formData.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
        const response = await fetch('/api/organizations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: formData.name,
            slug: slug || `org-${Date.now()}`,
            email: formData.email,
            phone: formData.phone || null,
            address: formData.address || null,
            city: formData.city || null,
            country: formData.country || 'Morocco',
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Create organization error:', errorData);
          throw new Error(errorData.error || 'Erreur lors de la création');
        }

        const data = await response.json();
        setOrganization(data.organization);
        setIsNewOrg(false);
      } else if (organization?.id) {
        // Update existing organization
        console.log('Updating organization:', organization.id, formData);
        const response = await fetch('/api/organizations', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            id: organization.id,
            ...formData,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Update organization error:', errorData);
          throw new Error(errorData.error || 'Erreur lors de l\'enregistrement');
        }
      } else {
        throw new Error('Aucune organisation à mettre à jour');
      }

      // Save AI settings to Puter KV
      if (puterReady) {
        await setKV('ai_settings', aiSettings);
      }

      // Small delay to show saving state
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Refresh organization data
      await fetchOrganization();
      alert('Paramètres enregistrés avec succès!');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      alert(error.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  // Test AI Chat
  const handleSendChat = async () => {
    if (!chatInput.trim() || !puterReady) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput,
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await aiChat(chatInput, {
        model: aiSettings.model,
        systemPrompt: aiSettings.systemPrompt.replace('{organisation}', organization?.name || 'notre école'),
      });

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Désolé, une erreur est survenue. Veuillez réessayer.',
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  // Save email configuration
  const handleSaveEmailConfig = async () => {
    setEmailSaving(true);
    try {
      const payload = {
        id: editingConfig?.id,
        ...emailFormData,
      };

      const response = await fetch('/api/email/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'enregistrement');
      }

      alert(data.message || 'Configuration enregistrée avec succès!');
      fetchEmailConfigs();
      setEditingConfig(null);
      setEmailFormData({
        provider: 'smtp',
        smtpHost: '',
        smtpPort: 587,
        smtpUser: '',
        smtpPassword: '',
        imapHost: '',
        imapPort: 993,
        imapUser: '',
        imapPassword: '',
        brevoApiKey: '',
        gmailClientId: '',
        gmailClientSecret: '',
        gmailRefreshToken: '',
        fromEmail: '',
        fromName: '',
        isDefault: true,
        isActive: true,
      });
    } catch (error: any) {
      console.error('Error saving email config:', error);
      alert(error.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setEmailSaving(false);
    }
  };

  // Delete email configuration
  const handleDeleteEmailConfig = async (id: string) => {
    if (!confirm('Supprimer cette configuration email?')) return;
    
    try {
      const response = await fetch(`/api/email/config?id=${id}`, { method: 'DELETE' });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la suppression');
      }
      
      alert('Configuration supprimée avec succès!');
      fetchEmailConfigs();
    } catch (error: any) {
      alert(error.message || 'Erreur lors de la suppression');
    }
  };

  // Edit existing config
  const handleEditConfig = (config: EmailConfig) => {
    setEditingConfig(config);
    setEmailFormData({
      provider: config.provider,
      smtpHost: config.smtpHost || '',
      smtpPort: config.smtpPort || 587,
      smtpUser: config.smtpUser || '',
      smtpPassword: '', // Don't prefill masked passwords
      imapHost: config.imapHost || '',
      imapPort: config.imapPort || 993,
      imapUser: config.imapUser || '',
      imapPassword: '',
      brevoApiKey: '',
      gmailClientId: config.gmailClientId || '',
      gmailClientSecret: '',
      gmailRefreshToken: '',
      fromEmail: config.fromEmail || '',
      fromName: config.fromName || '',
      isDefault: config.isDefault === 1,
      isActive: config.isActive === 1,
    });
  };

  const getPlanBadge = (plan: string) => {
    const colors: Record<string, string> = {
      starter: 'bg-slate-100 text-slate-700',
      professional: 'bg-blue-100 text-blue-700',
      enterprise: 'bg-purple-100 text-purple-700',
    };
    const labels: Record<string, string> = {
      starter: 'Starter',
      professional: 'Professionnel',
      enterprise: 'Entreprise',
    };
    return (
      <Badge className={colors[plan] || colors.starter}>
        {labels[plan] || plan}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Paramètres</h1>
          <p className="text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Paramètres</h1>
          <p className="text-slate-600">Configurez votre organisation et vos préférences</p>
        </div>
        <div className="flex items-center gap-2">
          {puterReady && (
            <Badge className="bg-green-100 text-green-700">
              <CheckCircle className="w-3 h-3 mr-1" />
              Puter.js actif
            </Badge>
          )}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-green-500 to-emerald-600"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Enregistrement...' : isNewOrg ? 'Créer l\'organisation' : 'Enregistrer'}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="organization">Organisation</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="ai">Intelligence Artificielle</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="account">Compte</TabsTrigger>
        </TabsList>

        {/* Organization Tab */}
        <TabsContent value="organization" className="space-y-6">
          {isNewOrg && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-900">Nouvelle organisation</h4>
                    <p className="text-sm text-amber-700">
                      Remplissez les informations ci-dessous pour créer votre organisation. 
                      Vous pourrez les modifier ultérieurement.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-0 shadow-md">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle>{isNewOrg ? 'Créer une organisation' : 'Informations de l\'organisation'}</CardTitle>
                    <CardDescription>{isNewOrg ? 'Configurez votre nouvel établissement' : 'Informations générales de votre établissement'}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom de l'organisation</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Ville</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Adresse</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Plan & Status */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle>Abonnement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Plan actuel</span>
                  {organization && getPlanBadge(organization.plan)}
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Limite IA/jour</span>
                  <span className="font-medium">{organization?.aiDailyLimit || 500}</span>
                </div>
                <Button variant="outline" className="w-full">
                  Mettre à niveau
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Email Tab */}
        <TabsContent value="email" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Email Configuration Form */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle>{editingConfig ? 'Modifier la configuration' : 'Nouvelle configuration email'}</CardTitle>
                    <CardDescription>Configurez votre serveur email</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Provider Selection */}
                <div className="space-y-2">
                  <Label>Fournisseur</Label>
                  <Select
                    value={emailFormData.provider}
                    onValueChange={(value) => setEmailFormData({ ...emailFormData, provider: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="smtp">SMTP / IMAP (Générique)</SelectItem>
                      <SelectItem value="brevo">Brevo (Sendinblue)</SelectItem>
                      <SelectItem value="gmail">Gmail (OAuth)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* From Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email d'envoi *</Label>
                    <Input
                      type="email"
                      value={emailFormData.fromEmail}
                      onChange={(e) => setEmailFormData({ ...emailFormData, fromEmail: e.target.value })}
                      placeholder="contact@ecole.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nom d'envoi</Label>
                    <Input
                      value={emailFormData.fromName}
                      onChange={(e) => setEmailFormData({ ...emailFormData, fromName: e.target.value })}
                      placeholder="Mon École"
                    />
                  </div>
                </div>

                {/* SMTP Settings */}
                {(emailFormData.provider === 'smtp' || emailFormData.provider === 'brevo') && (
                  <>
                    <Separator />
                    <h4 className="font-medium text-sm text-slate-600">Configuration SMTP (Envoi)</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2 space-y-2">
                        <Label>Serveur SMTP</Label>
                        <Input
                          value={emailFormData.smtpHost}
                          onChange={(e) => setEmailFormData({ ...emailFormData, smtpHost: e.target.value })}
                          placeholder="smtp.example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Port</Label>
                        <Input
                          type="number"
                          value={emailFormData.smtpPort}
                          onChange={(e) => setEmailFormData({ ...emailFormData, smtpPort: parseInt(e.target.value) || 587 })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Utilisateur</Label>
                        <Input
                          value={emailFormData.smtpUser}
                          onChange={(e) => setEmailFormData({ ...emailFormData, smtpUser: e.target.value })}
                          placeholder="user@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Mot de passe</Label>
                        <Input
                          type="password"
                          value={emailFormData.smtpPassword}
                          onChange={(e) => setEmailFormData({ ...emailFormData, smtpPassword: e.target.value })}
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Brevo API Key */}
                {emailFormData.provider === 'brevo' && (
                  <div className="space-y-2">
                    <Label>Clé API Brevo</Label>
                    <Input
                      type="password"
                      value={emailFormData.brevoApiKey}
                      onChange={(e) => setEmailFormData({ ...emailFormData, brevoApiKey: e.target.value })}
                      placeholder="xkeysib-..."
                    />
                  </div>
                )}

                {/* Gmail OAuth */}
                {emailFormData.provider === 'gmail' && (
                  <>
                    <Separator />
                    <h4 className="font-medium text-sm text-slate-600">Configuration Gmail OAuth</h4>
                    <div className="space-y-2">
                      <Label>Client ID</Label>
                      <Input
                        value={emailFormData.gmailClientId}
                        onChange={(e) => setEmailFormData({ ...emailFormData, gmailClientId: e.target.value })}
                        placeholder="xxx.apps.googleusercontent.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Client Secret</Label>
                      <Input
                        type="password"
                        value={emailFormData.gmailClientSecret}
                        onChange={(e) => setEmailFormData({ ...emailFormData, gmailClientSecret: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Refresh Token</Label>
                      <Input
                        type="password"
                        value={emailFormData.gmailRefreshToken}
                        onChange={(e) => setEmailFormData({ ...emailFormData, gmailRefreshToken: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {/* Status */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Configuration active</p>
                    <p className="text-sm text-slate-500">Utiliser cette configuration pour l'envoi</p>
                  </div>
                  <Switch
                    checked={emailFormData.isActive}
                    onCheckedChange={(checked) => setEmailFormData({ ...emailFormData, isActive: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Par défaut</p>
                    <p className="text-sm text-slate-500">Utiliser comme configuration principale</p>
                  </div>
                  <Switch
                    checked={emailFormData.isDefault}
                    onCheckedChange={(checked) => setEmailFormData({ ...emailFormData, isDefault: checked })}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  {editingConfig && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingConfig(null);
                        setEmailFormData({
                          provider: 'smtp',
                          smtpHost: '',
                          smtpPort: 587,
                          smtpUser: '',
                          smtpPassword: '',
                          imapHost: '',
                          imapPort: 993,
                          imapUser: '',
                          imapPassword: '',
                          brevoApiKey: '',
                          gmailClientId: '',
                          gmailClientSecret: '',
                          gmailRefreshToken: '',
                          fromEmail: '',
                          fromName: '',
                          isDefault: true,
                          isActive: true,
                        });
                      }}
                    >
                      Annuler
                    </Button>
                  )}
                  <Button
                    onClick={handleSaveEmailConfig}
                    disabled={emailSaving || !emailFormData.fromEmail}
                    className="bg-gradient-to-r from-blue-500 to-blue-600"
                  >
                    {emailSaving ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enregistrement...</>
                    ) : (
                      <><Save className="w-4 h-4 mr-2" />Enregistrer</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Existing Configurations */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <CardTitle>Configurations existantes</CardTitle>
                    <CardDescription>Gérez vos configurations email</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {emailLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                  </div>
                ) : emailConfigs.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Aucune configuration email</p>
                    <p className="text-sm">Créez votre première configuration ci-contre</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {emailConfigs.map((config) => (
                      <div
                        key={config.id}
                        className="border rounded-lg p-4 hover:bg-slate-50 transition"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{config.fromName || config.fromEmail}</p>
                              {config.isDefault === 1 && (
                                <Badge className="bg-blue-100 text-blue-700">Par défaut</Badge>
                              )}
                              {config.isActive === 1 ? (
                                <Badge className="bg-green-100 text-green-700">Actif</Badge>
                              ) : (
                                <Badge variant="outline">Inactif</Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-500">{config.fromEmail}</p>
                            <p className="text-xs text-slate-400 mt-1">
                              Fournisseur: {config.provider.toUpperCase()}
                              {config.smtpHost && ` • ${config.smtpHost}:${config.smtpPort}`}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditConfig(config)}
                            >
                              Modifier
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500"
                              onClick={() => handleDeleteEmailConfig(config.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Email Info */}
          <Card className="border-0 shadow-md bg-blue-50">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Configuration Email</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    <strong>SMTP:</strong> Pour l'envoi d'emails via votre serveur ou un service tiers.<br/>
                    <strong>Brevo:</strong> Service d'envoi email français avec API simple.<br/>
                    <strong>Gmail:</strong> Utilisez votre compte Gmail avec OAuth2.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Tab */}
        <TabsContent value="ai" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* AI Configuration */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle>Configuration de l'IA</CardTitle>
                    <CardDescription>Paramètres de l'intelligence artificielle</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* AI Status */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">IA activée</p>
                    <p className="text-sm text-slate-500">Activer l'intelligence artificielle</p>
                  </div>
                  <Switch
                    checked={aiSettings.enabled}
                    onCheckedChange={(checked) => setAiSettings({ ...aiSettings, enabled: checked })}
                  />
                </div>

                <Separator />

                {/* Model Selection */}
                <div className="space-y-2">
                  <Label>Modèle IA</Label>
                  <Select
                    value={aiSettings.model}
                    onValueChange={(value) => setAiSettings({ ...aiSettings, model: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un modèle" />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_MODELS.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex items-center gap-2">
                            <span>{model.name}</span>
                            <span className="text-xs text-slate-500">({model.provider})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">
                    Powered by Puter.js - Pas de clé API requise
                  </p>
                </div>

                {/* Auto Reply */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Réponses automatiques</p>
                    <p className="text-sm text-slate-500">L'IA répond automatiquement aux messages WhatsApp</p>
                  </div>
                  <Switch
                    checked={aiSettings.autoReply}
                    onCheckedChange={(checked) => setAiSettings({ ...aiSettings, autoReply: checked })}
                  />
                </div>

                <Separator />

                {/* System Prompt */}
                <div className="space-y-2">
                  <Label>Prompt système</Label>
                  <Textarea
                    value={aiSettings.systemPrompt}
                    onChange={(e) => setAiSettings({ ...aiSettings, systemPrompt: e.target.value })}
                    rows={6}
                    placeholder="Définissez le comportement de l'IA..."
                  />
                  <p className="text-xs text-slate-500">
                    Utilisez {`{organisation}`} pour insérer le nom de l'organisation
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* AI Test Chat */}
            <Card className="border-0 shadow-md flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <CardTitle>Test de l'IA</CardTitle>
                    <CardDescription>Testez les réponses de l'IA</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                {!puterReady ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <RefreshCw className="w-8 h-8 mx-auto mb-3 text-slate-400 animate-spin" />
                      <p className="text-slate-500">Chargement de Puter.js...</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Chat Messages */}
                    <ScrollArea className="flex-1 h-[300px] border rounded-lg p-4 mb-4">
                      {chatMessages.length === 0 ? (
                        <div className="h-full flex items-center justify-center">
                          <div className="text-center text-slate-500">
                            <Sparkles className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                            <p className="text-sm">Posez une question pour tester l'IA</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {chatMessages.map((msg) => (
                            <div
                              key={msg.id}
                              className={cn(
                                "flex",
                                msg.role === 'user' ? "justify-end" : "justify-start"
                              )}
                            >
                              <div
                                className={cn(
                                  "max-w-[80%] rounded-lg px-4 py-2",
                                  msg.role === 'user'
                                    ? "bg-green-600 text-white"
                                    : "bg-slate-100 text-slate-900"
                                )}
                              >
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                <p className={cn(
                                  "text-xs mt-1",
                                  msg.role === 'user' ? "text-green-200" : "text-slate-500"
                                )}>
                                  {msg.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          ))}
                          {chatLoading && (
                            <div className="flex justify-start">
                              <div className="bg-slate-100 rounded-lg px-4 py-2">
                                <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                              </div>
                            </div>
                          )}
                          <div ref={chatEndRef} />
                        </div>
                      )}
                    </ScrollArea>

                    {/* Chat Input */}
                    <div className="flex gap-2">
                      <Input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendChat();
                          }
                        }}
                        placeholder="Tapez votre message..."
                        disabled={chatLoading}
                      />
                      <Button
                        onClick={handleSendChat}
                        disabled={!chatInput.trim() || chatLoading}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* AI Features Info */}
          <Card className="border-0 shadow-md bg-purple-50">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-purple-900">Fonctionnalités IA avec Puter.js</h4>
                  <p className="text-sm text-purple-700 mt-1">
                    <strong>Modèles disponibles:</strong> GPT-4o, Claude 3.5 Sonnet, Gemini 2.0, Llama 3.1, et plus.<br/>
                    <strong>Stockage cloud:</strong> Fichiers et base de données sans serveur.<br/>
                    <strong>Gratuit:</strong> Aucune clé API requise, tout fonctionne dans le navigateur.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WhatsApp Tab */}
        <TabsContent value="whatsapp" className="space-y-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <CardTitle>Paramètres WhatsApp</CardTitle>
                  <CardDescription>Configuration de la connexion WhatsApp</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Connection Status */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Statut de connexion</p>
                  <p className="text-sm text-slate-500">État actuel de la connexion WhatsApp</p>
                </div>
                {organization?.whatsappConnected ? (
                  <Badge className="bg-green-100 text-green-700">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Connecté
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-slate-500">
                    <XCircle className="w-3 h-3 mr-1" />
                    Non connecté
                  </Badge>
                )}
              </div>

              <Separator />

              {/* Phone Number */}
              {organization?.whatsappPhone && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Numéro connecté</span>
                  <span className="font-medium">{organization.whatsappPhone}</span>
                </div>
              )}

              {/* Connect Button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.location.href = '/dashboard/whatsapp'}
              >
                <QrCode className="w-4 h-4 mr-2" />
                {organization?.whatsappConnected ? 'Gérer les comptes WhatsApp' : 'Connecter WhatsApp'}
              </Button>
            </CardContent>
          </Card>

          {/* WhatsApp Info */}
          <Card className="border-0 shadow-md bg-green-50">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-900">Comment fonctionne WhatsApp?</h4>
                  <p className="text-sm text-green-700 mt-1">
                    <strong>Envoi direct:</strong> Utilisez wa.me pour envoyer des messages sans API.<br/>
                    <strong>WhatsApp Web:</strong> Connectez votre compte via le navigateur intégré.<br/>
                    <strong>Multi-comptes:</strong> Configurez jusqu'à 2 comptes WhatsApp.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <CardTitle>Compte</CardTitle>
                  <CardDescription>Vos paramètres personnels</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Langue</Label>
                <Select defaultValue="fr">
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar">العربية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" className="w-full">
                Changer le mot de passe
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Wrapper component with Suspense for useSearchParams
export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    }>
      <SettingsPageContent />
    </Suspense>
  );
}
