'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  FileText, Plus, Edit, Trash2, Copy, Eye, MoreVertical, 
  MessageSquare, Clock, DollarSign, Megaphone, Star, Settings
} from 'lucide-react';
import { TEMPLATE_CATEGORY_LABELS, TEMPLATE_VARIABLES, TEMPLATE_TRIGGER_LABELS } from '@/lib/constants';

interface Template {
  id: string;
  organizationId: string | null;
  name: string;
  category: string;
  subject: string | null;
  content: string;
  variables: string | null;
  isSystem: number;
  triggerAction: string | null;
  signature: string | null;
  isActive: boolean;
  createdAt: string;
}

const categoryIcons: Record<string, any> = {
  ABSENCE_NOTIFICATION: MessageSquare,
  LATE_NOTIFICATION: Clock,
  PAYMENT_REMINDER: DollarSign,
  ADMIN_COMMUNICATION: Megaphone,
  GENERAL: FileText,
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [viewingTemplate, setViewingTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'GENERAL',
    subject: '',
    content: '',
    triggerAction: '',
    signature: 'Administration',
  });

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEditingSystem = editingTemplate?.isSystem === 1;
      
      const url = editingTemplate && !isEditingSystem
        ? `/api/templates?id=${editingTemplate.id}`
        : '/api/templates';
      const method = editingTemplate && !isEditingSystem ? 'PUT' : 'POST';

      const body: any = {
        ...formData,
        triggerAction: formData.triggerAction || null,
      };

      // If editing a system template, duplicate it
      if (isEditingSystem && editingTemplate) {
        body.duplicateFrom = editingTemplate.id;
      } else if (editingTemplate) {
        body.id = editingTemplate.id;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setDialogOpen(false);
        setEditingTemplate(null);
        setFormData({ 
          name: '', 
          category: 'GENERAL', 
          subject: '', 
          content: '', 
          triggerAction: '',
          signature: 'Administration' 
        });
        fetchTemplates();
      } else {
        const data = await response.json();
        alert(data.error || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce template?')) return;
    try {
      const response = await fetch(`/api/templates?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchTemplates();
      } else {
        const data = await response.json();
        alert(data.error);
      }
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      category: template.category,
      subject: template.subject || '',
      content: template.content,
      triggerAction: template.triggerAction || '',
      signature: template.signature || 'Administration',
    });
    setDialogOpen(true);
  };

  const handleDuplicate = (template: Template) => {
    setEditingTemplate(null);
    setFormData({
      name: `${template.name} (copie)`,
      category: template.category,
      subject: template.subject || '',
      content: template.content,
      triggerAction: template.triggerAction || '',
      signature: template.signature || 'Administration',
    });
    setDialogOpen(true);
  };

  const handleView = (template: Template) => {
    setViewingTemplate(template);
    setViewDialogOpen(true);
  };

  const insertVariable = (variable: string) => {
    setFormData({
      ...formData,
      content: formData.content + `{${variable}}`,
    });
  };

  const getCategoryBadge = (category: string) => {
    const labels = TEMPLATE_CATEGORY_LABELS;
    const colors: Record<string, string> = {
      ABSENCE_NOTIFICATION: 'bg-red-100 text-red-700 border-red-200',
      LATE_NOTIFICATION: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      PAYMENT_REMINDER: 'bg-orange-100 text-orange-700 border-orange-200',
      ADMIN_COMMUNICATION: 'bg-blue-100 text-blue-700 border-blue-200',
      WELCOME_MESSAGE: 'bg-green-100 text-green-700 border-green-200',
      GENERAL: 'bg-slate-100 text-slate-700 border-slate-200',
      MARKETING: 'bg-purple-100 text-purple-700 border-purple-200',
    };
    return (
      <Badge className={colors[category] || colors.GENERAL} variant="outline">
        {labels[category]?.fr || category}
      </Badge>
    );
  };

  const getTriggerBadge = (trigger: string | null) => {
    if (!trigger) return null;
    const labels = TEMPLATE_TRIGGER_LABELS;
    return (
      <Badge variant="outline" className="text-xs">
        ⚡ {labels[trigger]?.fr || trigger}
      </Badge>
    );
  };

  // Group templates by category
  const groupedTemplates = templates.reduce((acc, template) => {
    const cat = template.category || 'GENERAL';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(template);
    return acc;
  }, {} as Record<string, Template[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Templates de messages</h1>
          <p className="text-slate-600">Gérez vos modèles de messages WhatsApp pour les parents</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-green-500 to-emerald-600" onClick={() => {
              setEditingTemplate(null);
              setFormData({ 
                name: '', 
                category: 'GENERAL', 
                subject: '', 
                content: '', 
                triggerAction: '',
                signature: 'Administration' 
              });
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate?.isSystem === 1 
                  ? 'Personnaliser le template système' 
                  : editingTemplate 
                    ? 'Modifier le template' 
                    : 'Nouveau template'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom du template</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Notification d'absence"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Catégorie</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TEMPLATE_CATEGORY_LABELS).map(([key, value]) => (
                          <SelectItem key={key} value={key}>
                            {value.fr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="triggerAction">Déclencheur automatique</Label>
                    <Select
                      value={formData.triggerAction || 'none'}
                      onValueChange={(value) => setFormData({ ...formData, triggerAction: value === 'none' ? '' : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Aucun" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucun (manuel)</SelectItem>
                        {Object.entries(TEMPLATE_TRIGGER_LABELS).map(([key, value]) => (
                          <SelectItem key={key} value={key}>
                            {value.fr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signature">Signature</Label>
                    <Select
                      value={formData.signature}
                      onValueChange={(value) => setFormData({ ...formData, signature: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Administration">Administration</SelectItem>
                        <SelectItem value="{organisation}">{`{organisation}`}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Sujet (optionnel)</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Objet du message"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Contenu du message</Label>
                    <div className="flex gap-1 flex-wrap">
                      {TEMPLATE_VARIABLES.slice(0, 6).map((v) => (
                        <Button
                          key={v.name}
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-xs h-6 px-2"
                          onClick={() => insertVariable(v.name)}
                        >
                          {`{${v.name}}`}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Chers parents, nous vous informons que..."
                    rows={8}
                    required
                    className="font-mono text-sm"
                  />
                  <div className="flex flex-wrap gap-1 mt-2">
                    {TEMPLATE_VARIABLES.slice(6).map((v) => (
                      <Button
                        key={v.name}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs h-6"
                        onClick={() => insertVariable(v.name)}
                      >
                        {`{${v.name}}`}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    💡 Cliquez sur une variable pour l'insérer. Les variables seront remplacées automatiquement lors de l'envoi.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="bg-gradient-to-r from-green-500 to-emerald-600">
                  {editingTemplate?.isSystem === 1 
                    ? 'Créer une copie personnalisée' 
                    : editingTemplate 
                      ? 'Modifier' 
                      : 'Créer'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates by Category */}
      {loading ? (
        <div className="text-center py-8 text-slate-500">Chargement...</div>
      ) : templates.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500">Aucun template disponible</p>
              <p className="text-sm text-slate-400 mt-1">
                Exécutez la migration pour créer les templates par défaut
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedTemplates).map(([category, categoryTemplates]) => {
          const Icon = categoryIcons[category] || FileText;
          return (
            <div key={category} className="space-y-4">
              <div className="flex items-center gap-2">
                <Icon className="w-5 h-5 text-slate-500" />
                <h2 className="text-lg font-semibold text-slate-800">
                  {TEMPLATE_CATEGORY_LABELS[category]?.fr || category}
                </h2>
                <Badge variant="secondary" className="text-xs">
                  {categoryTemplates.length}
                </Badge>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryTemplates.map((template) => (
                  <Card key={template.id} className={`border-0 shadow-md hover:shadow-lg transition ${template.isSystem === 1 ? 'ring-2 ring-blue-100' : ''}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${template.isSystem === 1 ? 'bg-blue-100' : 'bg-slate-100'}`}>
                            {template.isSystem === 1 ? (
                              <Star className="w-5 h-5 text-blue-600" />
                            ) : (
                              <FileText className="w-5 h-5 text-slate-600" />
                            )}
                          </div>
                          <div>
                            <CardTitle className="text-base">{template.name}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              {template.isSystem === 1 && (
                                <Badge variant="outline" className="text-xs bg-blue-50">
                                  Système
                                </Badge>
                              )}
                              {getTriggerBadge(template.triggerAction)}
                            </div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(template)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Voir
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(template)}>
                              <Edit className="w-4 h-4 mr-2" />
                              {template.isSystem === 1 ? 'Personnaliser' : 'Modifier'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                              <Copy className="w-4 h-4 mr-2" />
                              Dupliquer
                            </DropdownMenuItem>
                            {template.isSystem !== 1 && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(template.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Supprimer
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-600 line-clamp-3 whitespace-pre-line">
                        {template.content}
                      </p>
                      <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                        <span>
                          {(template.content.match(/\{[^}]+\}/g) || []).length} variables
                        </span>
                        {template.signature && (
                          <span className="text-slate-500">
                            ✓ {template.signature}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* View Template Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingTemplate?.name}</DialogTitle>
          </DialogHeader>
          {viewingTemplate && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {getCategoryBadge(viewingTemplate.category)}
                {viewingTemplate.isSystem === 1 && (
                  <Badge variant="outline" className="bg-blue-50">Template système</Badge>
                )}
                {getTriggerBadge(viewingTemplate.triggerAction)}
              </div>
              
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-700 whitespace-pre-line font-mono">
                  {viewingTemplate.content}
                </p>
                {viewingTemplate.signature && (
                  <p className="text-sm text-slate-500 mt-3 italic">
                    {viewingTemplate.signature.replace('{organisation}', '[Nom de votre organisation]')}
                  </p>
                )}
              </div>

              <div className="text-sm text-slate-500">
                <p><strong>Variables disponibles:</strong></p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {(viewingTemplate.content.match(/\{[^}]+\}/g) || []).map((v, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {v}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                  Fermer
                </Button>
                <Button onClick={() => {
                  setViewDialogOpen(false);
                  handleEdit(viewingTemplate);
                }}>
                  <Edit className="w-4 h-4 mr-2" />
                  {viewingTemplate.isSystem === 1 ? 'Personnaliser' : 'Modifier'}
                </Button>
                <Button variant="secondary" onClick={() => {
                  setViewDialogOpen(false);
                  handleDuplicate(viewingTemplate);
                }}>
                  <Copy className="w-4 h-4 mr-2" />
                  Dupliquer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
