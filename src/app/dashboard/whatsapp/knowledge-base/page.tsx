'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Plus,
  Trash2,
  Upload,
  FileText,
  AlertCircle,
  Loader,
  Edit2,
  CheckCircle,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface KnowledgeItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  source: 'manual' | 'document';
  sourceFile?: string;
  createdAt: string;
}

export default function KnowledgeBasePage() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: 'General',
  });

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState('');

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/whatsapp/knowledge-base');
      const data = await response.json();
      setItems(data.items || []);
    } catch (error) {
      console.error('Error fetching knowledge base:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.question || !formData.answer) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId
        ? `/api/whatsapp/knowledge-base?id=${editingId}`
        : '/api/whatsapp/knowledge-base';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setDialogOpen(false);
        setFormData({ question: '', answer: '', category: 'General' });
        setEditingId(null);
        fetchItems();
      } else {
        const data = await response.json();
        alert(data.error || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleEditItem = (item: KnowledgeItem) => {
    setFormData({
      question: item.question,
      answer: item.answer,
      category: item.category,
    });
    setEditingId(item.id);
    setDialogOpen(true);
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet élément?')) return;

    try {
      const response = await fetch(`/api/whatsapp/knowledge-base?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchItems();
      } else {
        alert('Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!uploadFile) {
      alert('Veuillez sélectionner un fichier');
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif',
    ];

    if (!allowedTypes.includes(uploadFile.type)) {
      alert('Format de fichier non supporté. Utilisez PDF, DOCX, TXT ou images.');
      return;
    }

    setUploading(true);
    setUploadMessage('');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('file', uploadFile);

      const response = await fetch('/api/whatsapp/knowledge-base/upload', {
        method: 'POST',
        body: formDataToSend,
      });

      const data = await response.json();

      if (response.ok) {
        setUploadMessage(`✓ Fichier traité avec succès! ${data.itemsCreated} éléments ajoutés.`);
        setUploadFile(null);
        fetchItems();
      } else {
        setUploadMessage(`Erreur: ${data.error}`);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadMessage('Erreur lors de l\'upload du fichier');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Base de Connaissance</h1>
          <p className="text-slate-600 mt-2">
            Gérez les questions/réponses pour l'IA WhatsApp
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-gradient-to-r from-blue-500 to-blue-600"
              onClick={() => {
                setEditingId(null);
                setFormData({ question: '', answer: '', category: 'General' });
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter une Q&R
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Modifier' : 'Ajouter'} une Question/Réponse
              </DialogTitle>
              <DialogDescription>
                Ajoutez une nouvelle paire question/réponse à la base de connaissance
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddItem}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="question">Question</Label>
                  <Input
                    id="question"
                    value={formData.question}
                    onChange={(e) =>
                      setFormData({ ...formData, question: e.target.value })
                    }
                    placeholder="Ex: Quels sont les horaires?"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="answer">Réponse</Label>
                  <Textarea
                    id="answer"
                    value={formData.answer}
                    onChange={(e) =>
                      setFormData({ ...formData, answer: e.target.value })
                    }
                    placeholder="Entrez la réponse..."
                    rows={4}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Catégorie</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    placeholder="Ex: Horaires, Tarifs, Général..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-blue-500 to-blue-600"
                >
                  {editingId ? 'Modifier' : 'Ajouter'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* File Upload Card */}
      <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            Importer des Documents
          </CardTitle>
          <CardDescription>
            Téléchargez des fichiers (PDF, DOCX, TXT) pour extraire automatiquement les Q&R
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFileUpload} className="space-y-4">
            <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center hover:border-blue-400 transition">
              <input
                type="file"
                id="fileInput"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.gif"
                className="hidden"
              />
              <label htmlFor="fileInput" className="cursor-pointer">
                <FileText className="w-12 h-12 mx-auto mb-2 text-blue-400" />
                <p className="font-medium text-slate-900">
                  {uploadFile ? uploadFile.name : 'Cliquez pour sélectionner un fichier'}
                </p>
                <p className="text-sm text-slate-500">
                  PDF, DOCX, TXT ou images (JPG, PNG, GIF)
                </p>
              </label>
            </div>

            {uploadMessage && (
              <Alert
                className={cn(
                  uploadMessage.startsWith('✓')
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                )}
              >
                <AlertCircle
                  className={cn(
                    'w-4 h-4',
                    uploadMessage.startsWith('✓')
                      ? 'text-green-600'
                      : 'text-red-600'
                  )}
                />
                <AlertDescription
                  className={uploadMessage.startsWith('✓') ? 'text-green-700' : 'text-red-700'}
                >
                  {uploadMessage}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={!uploadFile || uploading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {uploading ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Traitement en cours...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Importer et Traiter
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Knowledge Items List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Éléments de la Base</h2>

        {loading ? (
          <div className="text-center py-8 text-slate-500">Chargement...</div>
        ) : items.length === 0 ? (
          <Card className="border-0 shadow-md">
            <CardContent className="py-12">
              <div className="text-center">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  Base de connaissance vide
                </h3>
                <p className="text-slate-500">
                  Ajoutez des questions/réponses ou importez un document
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {items.map((item) => (
              <Card key={item.id} className="border-0 shadow-md hover:shadow-lg transition">
                <CardContent className="py-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900 text-lg">
                          {item.question}
                        </h4>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {item.category}
                          </Badge>
                          <Badge
                            className={cn(
                              'text-xs',
                              item.source === 'document'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-blue-100 text-blue-700'
                            )}
                          >
                            {item.source === 'document' ? '📄 Document' : '✍️ Manuel'}
                          </Badge>
                          {item.sourceFile && (
                            <Badge variant="outline" className="text-xs">
                              {item.sourceFile}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEditItem(item)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded border border-slate-200">
                      <p className="text-sm text-slate-700">{item.answer}</p>
                    </div>

                    <div className="text-xs text-slate-500">
                      Créé le: {new Date(item.createdAt).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Info Card */}
      <Card className="border-0 shadow-md bg-amber-50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-900">Comment ça marche?</h4>
              <p className="text-sm text-amber-700 mt-1">
                La base de connaissance est utilisée par l'IA Puter pour répondre automatiquement aux messages WhatsApp. Vous pouvez ajouter des Q&R manuellement ou importer des documents (PDF, DOCX). L'IA utilisera ces informations pour fournir des réponses précises et contextuelles.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
