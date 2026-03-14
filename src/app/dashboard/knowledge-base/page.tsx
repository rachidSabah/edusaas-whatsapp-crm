'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { BookOpen, Plus, Edit, Trash2, Search, Sparkles } from 'lucide-react';
import { KNOWLEDGE_CATEGORY_LABELS } from '@/lib/constants';

interface KnowledgeEntry {
  id: string;
  question: string;
  answer: string;
  category: string;
  keywords: string | null;
  priority: number;
  isActive: boolean;
  createdAt: string;
}

export default function KnowledgeBasePage() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: 'GENERAL',
    keywords: '',
    priority: 0,
  });

  const fetchEntries = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (categoryFilter && categoryFilter !== 'all') params.append('category', categoryFilter);

      const response = await fetch(`/api/knowledge-base?${params}`);
      const data = await response.json();
      setEntries(data.entries || []);
    } catch (error) {
      console.error('Error fetching knowledge base:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [search, categoryFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingEntry
        ? `/api/knowledge-base?id=${editingEntry.id}`
        : '/api/knowledge-base';
      const method = editingEntry ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          id: editingEntry?.id,
        }),
      });

      if (response.ok) {
        setDialogOpen(false);
        setEditingEntry(null);
        setFormData({ question: '', answer: '', category: 'GENERAL', keywords: '', priority: 0 });
        fetchEntries();
      }
    } catch (error) {
      console.error('Error saving knowledge entry:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette entrée?')) return;
    try {
      const response = await fetch(`/api/knowledge-base?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchEntries();
      }
    } catch (error) {
      console.error('Error deleting knowledge entry:', error);
    }
  };

  const handleEdit = (entry: KnowledgeEntry) => {
    setEditingEntry(entry);
    setFormData({
      question: entry.question,
      answer: entry.answer,
      category: entry.category,
      keywords: entry.keywords || '',
      priority: entry.priority,
    });
    setDialogOpen(true);
  };

  const getCategoryBadge = (category: string) => {
    const labels = KNOWLEDGE_CATEGORY_LABELS;
    const colors: Record<string, string> = {
      ENROLLMENT: 'bg-green-100 text-green-700',
      PRICING: 'bg-yellow-100 text-yellow-700',
      COURSES: 'bg-blue-100 text-blue-700',
      SCHEDULE: 'bg-purple-100 text-purple-700',
      POLICIES: 'bg-red-100 text-red-700',
      GENERAL: 'bg-slate-100 text-slate-700',
      FAQ: 'bg-orange-100 text-orange-700',
    };
    return (
      <Badge className={colors[category] || colors.GENERAL}>
        {labels[category]?.fr || category}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Base de connaissances</h1>
          <p className="text-slate-600">Enseignez à l'IA les réponses spécifiques à votre établissement</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-green-500 to-emerald-600">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter une entrée
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingEntry ? 'Modifier l\'entrée' : 'Nouvelle entrée'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="question">Question / Déclencheur</Label>
                  <Input
                    id="question"
                    value={formData.question}
                    onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                    placeholder="Ex: Quels sont les tarifs des cours?"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="answer">Réponse</Label>
                  <Textarea
                    id="answer"
                    value={formData.answer}
                    onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                    placeholder="Nos cours commencent à partir de..."
                    rows={4}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Catégorie</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(KNOWLEDGE_CATEGORY_LABELS).map(([key, value]) => (
                          <SelectItem key={key} value={key}>
                            {value.fr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priorité</Label>
                    <Input
                      id="priority"
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="keywords">Mots-clés (séparés par des virgules)</Label>
                  <Input
                    id="keywords"
                    value={formData.keywords}
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                    placeholder="tarif, prix, coût, formation"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="bg-gradient-to-r from-green-500 to-emerald-600">
                  {editingEntry ? 'Modifier' : 'Ajouter'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-md">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Rechercher dans la base de connaissances..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={categoryFilter || undefined} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {Object.entries(KNOWLEDGE_CATEGORY_LABELS).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value.fr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Entries */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-slate-500">Chargement...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500">Aucune entrée trouvée</p>
            <p className="text-sm text-slate-400 mt-2">
              Ajoutez des questions et réponses pour entraîner l'IA
            </p>
          </div>
        ) : (
          entries.map((entry) => (
            <Card key={entry.id} className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Sparkles className="w-5 h-5 text-green-500" />
                      <p className="font-medium text-slate-900">{entry.question}</p>
                      {getCategoryBadge(entry.category)}
                      {entry.priority > 0 && (
                        <Badge variant="outline" className="text-xs">
                          Priorité: {entry.priority}
                        </Badge>
                      )}
                    </div>
                    <p className="text-slate-600 mt-2">{entry.answer}</p>
                    {entry.keywords && (
                      <p className="text-xs text-slate-400 mt-2">
                        Mots-clés: {entry.keywords}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(entry)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500"
                      onClick={() => handleDelete(entry.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
