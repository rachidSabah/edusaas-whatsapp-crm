'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Bot,
  Save,
  RotateCcw,
  MessageSquare,
  Languages,
  FileText,
  Sparkles,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import {
  DEFAULT_AI_CONFIG,
  TONE_DESCRIPTIONS,
  LANGUAGE_DESCRIPTIONS,
  SYSTEM_INSTRUCTION_TEMPLATES,
  AUTO_REPLY_CATEGORY_OPTIONS,
  type AIConfig,
} from '@/app/api/ai-config/constants';

export default function AISettingsPage() {
  const [config, setConfig] = useState<AIConfig>(DEFAULT_AI_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/ai-config');
      if (response.ok) {
        const data = await response.json() as { config: AIConfig };
        setConfig(data.config);
      }
    } catch (error) {
      console.error('Error fetching AI config:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch('/api/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        const data = await response.json() as { config: AIConfig };
        setConfig(data.config);
        setMessage({ type: 'success', text: 'Configuration enregistrée avec succès!' });
      } else {
        const data = await response.json() as { message?: string };
        setMessage({ type: 'error', text: data.message || 'Erreur lors de l\'enregistrement' });
      }
    } catch (error) {
      console.error('Error saving AI config:', error);
      setMessage({ type: 'error', text: 'Erreur lors de l\'enregistrement de la configuration' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Êtes-vous sûr de vouloir réinitialiser la configuration aux valeurs par défaut?')) {
      return;
    }

    setResetting(true);
    setMessage(null);
    try {
      const response = await fetch('/api/ai-config', {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json() as { config: AIConfig };
        setConfig(data.config);
        setMessage({ type: 'success', text: 'Configuration réinitialisée avec succès!' });
      } else {
        const data = await response.json() as { message?: string };
        setMessage({ type: 'error', text: data.message || 'Erreur lors de la réinitialisation' });
      }
    } catch (error) {
      console.error('Error resetting AI config:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la réinitialisation' });
    } finally {
      setResetting(false);
    }
  };

  const applyTemplate = (templateKey: keyof typeof SYSTEM_INSTRUCTION_TEMPLATES) => {
    setConfig({ ...config, systemInstructions: SYSTEM_INSTRUCTION_TEMPLATES[templateKey] });
  };

  const toggleCategory = (categoryValue: string) => {
    const currentCategories = config.autoReplyCategories;
    if (currentCategories.includes(categoryValue)) {
      setConfig({
        ...config,
        autoReplyCategories: currentCategories.filter(c => c !== categoryValue),
      });
    } else {
      setConfig({
        ...config,
        autoReplyCategories: [...currentCategories, categoryValue],
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Bot className="w-8 h-8 text-green-600" />
            Configuration IA
          </h1>
          <p className="text-slate-600 mt-1">
            Personnalisez le comportement de l'assistant IA pour WhatsApp
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} disabled={resetting}>
            {resetting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4 mr-2" />
            )}
            Réinitialiser
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-green-500 to-emerald-600"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Enregistrer
          </Button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`flex items-center gap-2 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Instructions */}
        <Card className="border-0 shadow-md lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600" />
              Instructions Système
            </CardTitle>
            <CardDescription>
              Définissez le comportement et les directives de l'assistant IA
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Templates */}
            <div className="flex flex-wrap gap-2">
              <Label className="text-sm text-slate-600">Modèles prédéfinis:</Label>
              {Object.entries(SYSTEM_INSTRUCTION_TEMPLATES).map(([key, _]) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate(key as keyof typeof SYSTEM_INSTRUCTION_TEMPLATES)}
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  {key === 'default' ? 'Par défaut' : 
                   key === 'strictFormal' ? 'Formel strict' :
                   key === 'friendlyWelcoming' ? 'Amical' : 'Multilingue'}
                </Button>
              ))}
            </div>

            <Textarea
              value={config.systemInstructions}
              onChange={(e) => setConfig({ ...config, systemInstructions: e.target.value })}
              rows={8}
              className="font-mono text-sm"
              placeholder="Entrez les instructions système pour l'IA..."
            />
          </CardContent>
        </Card>

        {/* Response Settings */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-600" />
              Paramètres de Réponse
            </CardTitle>
            <CardDescription>
              Configurez le ton et la langue des réponses
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Response Tone */}
            <div className="space-y-2">
              <Label>Ton de réponse</Label>
              <Select
                value={config.responseTone}
                onValueChange={(value: AIConfig['responseTone']) => 
                  setConfig({ ...config, responseTone: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="formal">Formel</SelectItem>
                  <SelectItem value="friendly">Amical</SelectItem>
                  <SelectItem value="professional">Professionnel</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-slate-500">
                {TONE_DESCRIPTIONS[config.responseTone]}
              </p>
            </div>

            {/* Language */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Languages className="w-4 h-4" />
                Langue de réponse
              </Label>
              <Select
                value={config.language}
                onValueChange={(value: AIConfig['language']) => 
                  setConfig({ ...config, language: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Détection automatique</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="en">Anglais</SelectItem>
                  <SelectItem value="ar">Arabe</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-slate-500">
                {LANGUAGE_DESCRIPTIONS[config.language]}
              </p>
            </div>

            {/* Max Response Length */}
            <div className="space-y-2">
              <Label>Longueur maximale des réponses (caractères)</Label>
              <Input
                type="number"
                value={config.maxResponseLength}
                onChange={(e) => setConfig({ ...config, maxResponseLength: parseInt(e.target.value) || 500 })}
                min={100}
                max={2000}
              />
            </div>
          </CardContent>
        </Card>

        {/* Feature Toggles */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-green-600" />
              Fonctionnalités
            </CardTitle>
            <CardDescription>
              Activez ou désactivez les fonctionnalités de l'IA
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Knowledge Base Integration */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Intégration base de connaissances</Label>
                <p className="text-sm text-slate-500">
                  Utiliser la base de connaissances pour enrichir les réponses
                </p>
              </div>
              <Switch
                checked={config.knowledgeBaseEnabled}
                onCheckedChange={(checked) => setConfig({ ...config, knowledgeBaseEnabled: checked })}
              />
            </div>

            {/* Auto Reply */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Réponse automatique</Label>
                <p className="text-sm text-slate-500">
                  Permettre à l'IA de répondre automatiquement sur WhatsApp
                </p>
              </div>
              <Switch
                checked={config.autoReplyEnabled}
                onCheckedChange={(checked) => setConfig({ ...config, autoReplyEnabled: checked })}
              />
            </div>

            {/* Include Signature */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Inclure une signature</Label>
                <p className="text-sm text-slate-500">
                  Ajouter une signature automatique aux réponses
                </p>
              </div>
              <Switch
                checked={config.includeSignature}
                onCheckedChange={(checked) => setConfig({ ...config, includeSignature: checked })}
              />
            </div>

            {/* Signature Text */}
            {config.includeSignature && (
              <div className="space-y-2">
                <Label>Texte de signature</Label>
                <Textarea
                  value={config.signatureText}
                  onChange={(e) => setConfig({ ...config, signatureText: e.target.value })}
                  rows={3}
                  placeholder="Cordialement,&#10;L'équipe administrative"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Auto-Reply Categories */}
        <Card className="border-0 shadow-md lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-green-600" />
              Catégories de Réponse Automatique
            </CardTitle>
            <CardDescription>
              Sélectionnez les types de questions pour lesquels l'IA peut répondre automatiquement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {AUTO_REPLY_CATEGORY_OPTIONS.map((category) => (
                <div
                  key={category.value}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    config.autoReplyCategories.includes(category.value)
                      ? 'border-green-500 bg-green-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => toggleCategory(category.value)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{category.label}</span>
                    {config.autoReplyCategories.includes(category.value) && (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                  <p className="text-sm text-slate-500">{category.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Config Summary */}
      <Card className="border-0 shadow-md bg-slate-50">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
            <span className="font-medium">Configuration actuelle:</span>
            <Badge variant={config.autoReplyEnabled ? 'default' : 'secondary'}>
              {config.autoReplyEnabled ? 'Auto-réponse active' : 'Auto-réponse désactivée'}
            </Badge>
            <Badge variant="outline">
              Ton: {config.responseTone}
            </Badge>
            <Badge variant="outline">
              Langue: {config.language === 'auto' ? 'Auto' : config.language.toUpperCase()}
            </Badge>
            <Badge variant="outline">
              Base de connaissances: {config.knowledgeBaseEnabled ? 'Oui' : 'Non'}
            </Badge>
            <Badge variant="outline">
              {config.autoReplyCategories.length} catégories actives
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
