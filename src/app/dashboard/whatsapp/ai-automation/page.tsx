'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
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
  Save,
  Zap,
  Bell,
  Brain,
  MessageSquare,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIConfig {
  id: string;
  isEnabled: boolean;
  selectedModel?: string;
  responseTemplate: string;
  maxResponseLength: number;
  includeKnowledgeBase: boolean;
  autoRespondToAll: boolean;
  responseDelay: number;
}

interface AbsenceConfig {
  id: string;
  isEnabled: boolean;
  templateName: string;
  sendToParents: boolean;
  primaryPhoneNumberId: string;
  notifyDelay: number;
}

export default function AIAutomationPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [aiConfig, setAiConfig] = useState<AIConfig>({
    id: '',
    isEnabled: true,
    selectedModel: 'default',
    responseTemplate: 'Basé sur notre base de connaissance: {answer}',
    maxResponseLength: 500,
    includeKnowledgeBase: true,
    autoRespondToAll: false,
    responseDelay: 0,
  });

  const [absenceConfig, setAbsenceConfig] = useState<AbsenceConfig>({
    id: '',
    isEnabled: true,
    templateName: 'student_absence',
    sendToParents: true,
    primaryPhoneNumberId: '',
    notifyDelay: 5,
  });

  const [numbers, setNumbers] = useState<Array<{ id: string; displayPhoneNumber: string }>>([]);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/whatsapp/ai-automation');
      const data = await response.json();
      if (data.aiConfig) setAiConfig(data.aiConfig);
      if (data.absenceConfig) setAbsenceConfig(data.absenceConfig);
      if (data.numbers) setNumbers(data.numbers);
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSaveAI = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/whatsapp/ai-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiConfig }),
      });

      if (response.ok) {
        alert('Configuration IA sauvegardée avec succès!');
      } else {
        alert('Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Error saving AI config:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAbsence = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/whatsapp/ai-automation/absence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ absenceConfig }),
      });

      if (response.ok) {
        alert('Configuration d\'absence sauvegardée avec succès!');
      } else {
        alert('Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Error saving absence config:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleTestAI = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/whatsapp/ai-automation/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testMessage: 'Quels sont les horaires?',
          aiConfig,
        }),
      });

      const data = await response.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Erreur lors du test',
      });
    } finally {
      setTesting(false);
    }
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
        <h1 className="text-3xl font-bold text-slate-900">Automatisation IA & Notifications</h1>
        <p className="text-slate-600 mt-2">
          Configurez l'IA Puter pour répondre automatiquement et les notifications d'absence
        </p>
      </div>

      {/* AI Configuration */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            Configuration IA Puter
          </CardTitle>
          <CardDescription>
            Configurez l'IA pour répondre automatiquement aux messages WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <h4 className="font-medium text-slate-900">Activer l'IA</h4>
              <p className="text-sm text-slate-500">L'IA répondra automatiquement aux messages</p>
            </div>
            <Button
              variant={aiConfig.isEnabled ? 'default' : 'outline'}
              onClick={() => setAiConfig({ ...aiConfig, isEnabled: !aiConfig.isEnabled })}
              className={aiConfig.isEnabled ? 'bg-purple-600' : ''}
            >
              {aiConfig.isEnabled ? 'Activé' : 'Désactivé'}
            </Button>
          </div>

          {/* Puter Model Selection */}
          <div className="space-y-2">
            <Label htmlFor="selectedModel">Modèle Puter</Label>
            <Select
              value={aiConfig.selectedModel || 'default'}
              onValueChange={(value) =>
                setAiConfig({ ...aiConfig, selectedModel: value })
              }
            >
              <SelectTrigger id="selectedModel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Modèle par défaut</SelectItem>
                <SelectItem value="gpt-4">GPT-4</SelectItem>
                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                <SelectItem value="claude-3">Claude 3</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              Sélectionnez le modèle IA à utiliser pour les réponses
            </p>
          </div>

          {/* Response Template */}
          <div className="space-y-2">
            <Label htmlFor="responseTemplate">Modèle de Réponse</Label>
            <Textarea
              id="responseTemplate"
              value={aiConfig.responseTemplate}
              onChange={(e) =>
                setAiConfig({ ...aiConfig, responseTemplate: e.target.value })
              }
              placeholder="Modèle: {answer} sera remplacé par la réponse IA"
              rows={3}
            />
            <p className="text-xs text-slate-500">
              Utilisez {'{answer}'} pour insérer la réponse de l'IA
            </p>
          </div>

          {/* Max Response Length */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxResponseLength">Longueur Max de Réponse</Label>
              <Input
                id="maxResponseLength"
                type="number"
                value={aiConfig.maxResponseLength}
                onChange={(e) =>
                  setAiConfig({
                    ...aiConfig,
                    maxResponseLength: parseInt(e.target.value),
                  })
                }
                min="100"
                max="2000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="responseDelay">Délai de Réponse (secondes)</Label>
              <Input
                id="responseDelay"
                type="number"
                value={aiConfig.responseDelay}
                onChange={(e) =>
                  setAiConfig({
                    ...aiConfig,
                    responseDelay: parseInt(e.target.value),
                  })
                }
                min="0"
                max="60"
              />
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded border border-slate-200">
              <input
                type="checkbox"
                id="includeKnowledgeBase"
                checked={aiConfig.includeKnowledgeBase}
                onChange={(e) =>
                  setAiConfig({
                    ...aiConfig,
                    includeKnowledgeBase: e.target.checked,
                  })
                }
                className="w-4 h-4"
              />
              <label htmlFor="includeKnowledgeBase" className="flex-1 cursor-pointer">
                <p className="font-medium text-slate-900">Utiliser la Base de Connaissance</p>
                <p className="text-xs text-slate-500">L'IA utilisera les Q&R de la base</p>
              </label>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded border border-slate-200">
              <input
                type="checkbox"
                id="autoRespondToAll"
                checked={aiConfig.autoRespondToAll}
                onChange={(e) =>
                  setAiConfig({
                    ...aiConfig,
                    autoRespondToAll: e.target.checked,
                  })
                }
                className="w-4 h-4"
              />
              <label htmlFor="autoRespondToAll" className="flex-1 cursor-pointer">
                <p className="font-medium text-slate-900">Répondre à Tous les Messages</p>
                <p className="text-xs text-slate-500">
                  Sinon, répondre uniquement aux questions
                </p>
              </label>
            </div>
          </div>

          {/* Test & Save */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleTestAI}
              disabled={testing}
              className="flex-1"
            >
              {testing ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Test...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Tester l'IA
                </>
              )}
            </Button>

            <Button
              onClick={handleSaveAI}
              disabled={saving}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {saving ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Sauvegarder
                </>
              )}
            </Button>
          </div>

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
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Absence Notifications */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-red-600" />
            Notifications d'Absence
          </CardTitle>
          <CardDescription>
            Envoyez automatiquement des notifications aux parents en cas d'absence
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <h4 className="font-medium text-slate-900">Activer les Notifications</h4>
              <p className="text-sm text-slate-500">
                Notifier les parents des absences/retards
              </p>
            </div>
            <Button
              variant={absenceConfig.isEnabled ? 'default' : 'outline'}
              onClick={() =>
                setAbsenceConfig({ ...absenceConfig, isEnabled: !absenceConfig.isEnabled })
              }
              className={absenceConfig.isEnabled ? 'bg-red-600' : ''}
            >
              {absenceConfig.isEnabled ? 'Activé' : 'Désactivé'}
            </Button>
          </div>

          {/* Primary Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="primaryPhoneNumberId">Numéro Primaire</Label>
            <Select
              value={absenceConfig.primaryPhoneNumberId}
              onValueChange={(value) =>
                setAbsenceConfig({ ...absenceConfig, primaryPhoneNumberId: value })
              }
            >
              <SelectTrigger id="primaryPhoneNumberId">
                <SelectValue placeholder="Sélectionnez un numéro" />
              </SelectTrigger>
              <SelectContent>
                {numbers.map((num) => (
                  <SelectItem key={num.id} value={num.id}>
                    {num.displayPhoneNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              Le numéro utilisé pour envoyer les notifications
            </p>
          </div>

          {/* Template Name */}
          <div className="space-y-2">
            <Label htmlFor="templateName">Nom du Template Meta</Label>
            <Input
              id="templateName"
              value={absenceConfig.templateName}
              onChange={(e) =>
                setAbsenceConfig({ ...absenceConfig, templateName: e.target.value })
              }
              placeholder="Ex: student_absence, student_late"
            />
            <p className="text-xs text-slate-500">
              Le template doit être approuvé dans Meta App Dashboard
            </p>
          </div>

          {/* Notification Delay */}
          <div className="space-y-2">
            <Label htmlFor="notifyDelay">Délai de Notification (minutes)</Label>
            <Input
              id="notifyDelay"
              type="number"
              value={absenceConfig.notifyDelay}
              onChange={(e) =>
                setAbsenceConfig({
                  ...absenceConfig,
                  notifyDelay: parseInt(e.target.value),
                })
              }
              min="0"
              max="120"
            />
            <p className="text-xs text-slate-500">
              Attendre X minutes après le début du cours avant de notifier
            </p>
          </div>

          {/* Send to Parents */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded border border-slate-200">
            <input
              type="checkbox"
              id="sendToParents"
              checked={absenceConfig.sendToParents}
              onChange={(e) =>
                setAbsenceConfig({
                  ...absenceConfig,
                  sendToParents: e.target.checked,
                })
              }
              className="w-4 h-4"
            />
            <label htmlFor="sendToParents" className="flex-1 cursor-pointer">
              <p className="font-medium text-slate-900">Envoyer aux Parents</p>
              <p className="text-xs text-slate-500">
                Notifier les parents via WhatsApp
              </p>
            </label>
          </div>

          {/* Save */}
          <Button
            onClick={handleSaveAbsence}
            disabled={saving}
            className="w-full bg-red-600 hover:bg-red-700"
          >
            {saving ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Sauvegarder
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-md bg-purple-50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Brain className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-purple-900">Comment fonctionne l'IA?</h4>
                <p className="text-sm text-purple-700 mt-1">
                  L'IA Puter traite les messages WhatsApp entrants, les compare avec votre base de
                  connaissance, et répond automatiquement si une correspondance est trouvée.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-900">Notifications d'Absence</h4>
                <p className="text-sm text-red-700 mt-1">
                  Quand un élève est marqué absent, une notification est envoyée automatiquement aux
                  parents via le template Meta configuré.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
