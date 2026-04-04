'use client';

import { useEffect, useState, useRef } from 'react';
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
  Loader2,
  Edit2,
  CheckCircle,
  BookOpen,
  Download,
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

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export default function KnowledgeBasePage() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragAreaRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: 'Général',
  });

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
        setFormData({ question: '', answer: '', category: 'Général' });
        setEditingId(null);
        fetchItems();
        setUploadMessage({
          type: 'success',
          text: editingId ? 'Q&R modifiée avec succès' : 'Q&R ajoutée avec succès',
        });
        setTimeout(() => setUploadMessage(null), 3000);
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
        setUploadMessage({ type: 'success', text: 'Q&R supprimée' });
        setTimeout(() => setUploadMessage(null), 3000);
      } else {
        alert('Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Erreur lors de la suppression');
    }
  };

  // Drag and Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragAreaRef.current) {
      dragAreaRef.current.classList.add('bg-blue-50', 'border-blue-400');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragAreaRef.current) {
      dragAreaRef.current.classList.remove('bg-blue-50', 'border-blue-400');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragAreaRef.current) {
      dragAreaRef.current.classList.remove('bg-blue-50', 'border-blue-400');
    }

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const handleFiles = async (files: File[]) => {
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif',
    ];

    const newFiles: UploadedFile[] = files
      .filter((file) => validTypes.includes(file.type))
      .map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 0,
        status: 'pending' as const,
      }));

    if (files.some((f) => !validTypes.includes(f.type))) {
      setUploadMessage({
        type: 'error',
        text: 'Certains fichiers ne sont pas supportés. Utilisez PDF, DOCX, TXT ou images.',
      });
    }

    setUploadedFiles([...uploadedFiles, ...newFiles]);

    // Process each file
    for (const file of files) {
      if (!validTypes.includes(file.type)) continue;
      await processFile(file);
    }
  };

  const processFile = async (file: File) => {
    try {
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.name === file.name ? { ...f, status: 'uploading' as const, progress: 30 } : f
        )
      );

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/whatsapp/knowledge-base/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();

      // Add extracted items to knowledge base
      if (data.items && data.items.length > 0) {
        const newItems = data.items.map((item: any) => ({
          id: `kb_${Date.now()}_${Math.random()}`,
          question: item.question,
          answer: item.answer,
          category: item.category || 'Document',
          source: 'document' as const,
          sourceFile: file.name,
          createdAt: new Date().toISOString().split('T')[0],
        }));

        setItems((prev) => [...prev, ...newItems]);
      }

      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.name === file.name
            ? { ...f, status: 'success' as const, progress: 100 }
            : f
        )
      );

      setUploadMessage({
        type: 'success',
        text: `${file.name} traité avec succès. ${data.items?.length || 0} Q&R extraites.`,
      });
    } catch (error) {
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.name === file.name
            ? {
                ...f,
                status: 'error' as const,
                error: 'Erreur lors du traitement',
              }
            : f
        )
      );

      setUploadMessage({
        type: 'error',
        text: `Erreur lors du traitement de ${file.name}`,
      });
    }

    setTimeout(() => setUploadMessage(null), 5000);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Base de Connaissance</h1>
          <p className="text-slate-600 mt-2">
            Gérez vos Q&R et uploadez des documents pour que l'IA apprenne et réponde automatiquement
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                setEditingId(null);
                setFormData({ question: '', answer: '', category: 'Général' });
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle Q&R
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
                  <Label htmlFor="category">Catégorie</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    placeholder="Ex: Horaires, Contact, Absences..."
                  />
                </div>
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
                  className="bg-green-600 hover:bg-green-700"
                >
                  {editingId ? 'Modifier' : 'Ajouter'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Messages */}
      {uploadMessage && (
        <Alert className={uploadMessage.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
          {uploadMessage.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-green-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600" />
          )}
          <AlertTitle className={uploadMessage.type === 'success' ? 'text-green-900' : 'text-red-900'}>
            {uploadMessage.type === 'success' ? 'Succès' : 'Erreur'}
          </AlertTitle>
          <AlertDescription className={uploadMessage.type === 'success' ? 'text-green-700' : 'text-red-700'}>
            {uploadMessage.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Section */}
      <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            Importer des Documents
          </CardTitle>
          <CardDescription>
            Uploadez des fichiers PDF, DOCX, TXT ou des images pour que l'IA extraie automatiquement les Q&R
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drag & Drop Area */}
          <div
            ref={dragAreaRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center cursor-pointer transition-colors hover:border-blue-400 hover:bg-blue-50"
          >
            <div className="flex flex-col items-center gap-2">
              <FileText className="w-12 h-12 text-blue-400" />
              <div>
                <p className="font-semibold text-slate-900">Déposez vos fichiers ici</p>
                <p className="text-sm text-slate-600">ou cliquez pour sélectionner</p>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Formats supportés: PDF, DOCX, TXT, JPG, PNG, GIF (Max 10MB)
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.gif"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="mt-4"
            >
              <Upload className="w-4 h-4 mr-2" />
              Sélectionner des fichiers
            </Button>
          </div>

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-900">Fichiers en cours</h3>
              {uploadedFiles.map((file, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
                  <FileText className="w-4 h-4 text-slate-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                    <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                  {file.status === 'uploading' && (
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 transition-all"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    </div>
                  )}
                  {file.status === 'success' && (
                    <Badge className="bg-green-100 text-green-700">✓ Traité</Badge>
                  )}
                  {file.status === 'error' && (
                    <Badge className="bg-red-100 text-red-700">✗ Erreur</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Knowledge Base Items */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Q&R Disponibles ({items.length})</h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : items.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-8 text-center">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">Aucune Q&R pour le moment. Commencez par ajouter ou importer des documents.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {items.map((item) => (
              <Card key={item.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900">{item.question}</h3>
                        <Badge variant="outline" className="text-xs">
                          {item.category}
                        </Badge>
                        {item.source === 'document' && (
                          <Badge className="bg-blue-100 text-blue-700 text-xs">
                            📄 {item.sourceFile}
                          </Badge>
                        )}
                      </div>
                      <p className="text-slate-600 text-sm">{item.answer}</p>
                      <p className="text-xs text-slate-500 mt-2">Ajoutée le {item.createdAt}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditItem(item)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
