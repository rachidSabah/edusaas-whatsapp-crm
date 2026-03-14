'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Users, Plus, Search, Edit, Phone, Mail } from 'lucide-react';
import { CONTACT_TAG_LABELS } from '@/lib/constants';

interface Contact {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  tags: string[];
  source: string | null;
  leadStatus: string | null;
  lastContactAt: string | null;
  createdAt: string;
  _count?: {
    conversations: number;
  };
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    tags: [] as string[],
    source: '',
  });

  const fetchContacts = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (tagFilter && tagFilter !== 'all') params.append('tag', tagFilter);

      const response = await fetch(`/api/contacts?${params}`);
      const data = await response.json();
      setContacts(data.contacts || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [search, tagFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setDialogOpen(false);
        setFormData({ name: '', phone: '', email: '', tags: [], source: '' });
        fetchContacts();
      }
    } catch (error) {
      console.error('Error creating contact:', error);
    }
  };

  const getTagBadge = (tag: string) => {
    const colors: Record<string, string> = {
      PROSPECT: 'bg-blue-100 text-blue-700',
      STUDENT: 'bg-green-100 text-green-700',
      PARENT: 'bg-purple-100 text-purple-700',
      GRADUATE: 'bg-orange-100 text-orange-700',
      LEAD: 'bg-yellow-100 text-yellow-700',
      VIP: 'bg-pink-100 text-pink-700',
    };
    const labels = CONTACT_TAG_LABELS;
    return (
      <Badge className={colors[tag] || 'bg-slate-100 text-slate-700'}>
        {labels[tag]?.fr || tag}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Contacts</h1>
          <p className="text-slate-600">Gérez vos contacts CRM WhatsApp</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-green-500 to-emerald-600">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un contact
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un contact</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone WhatsApp</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+212 6XX XXX XXX"
                    required
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
              <DialogFooter>
                <Button type="submit" className="bg-gradient-to-r from-green-500 to-emerald-600">
                  Ajouter
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
                  placeholder="Rechercher un contact..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={tagFilter || undefined} onValueChange={setTagFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="PROSPECT">Prospect</SelectItem>
                <SelectItem value="STUDENT">Étudiant</SelectItem>
                <SelectItem value="PARENT">Parent</SelectItem>
                <SelectItem value="GRADUATE">Diplômé</SelectItem>
                <SelectItem value="VIP">VIP</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Contacts Table */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Conversations</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2 text-slate-500">
                      <Users className="w-5 h-5 animate-pulse" />
                      Chargement...
                    </div>
                  </TableCell>
                </TableRow>
              ) : contacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="text-slate-500">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Aucun contact trouvé</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                          <span className="text-green-700 font-medium">
                            {contact.name?.charAt(0) || contact.phone.slice(-2)}
                          </span>
                        </div>
                        <div>
                          <p>{contact.name || 'Contact inconnu'}</p>
                          {contact.leadStatus && (
                            <p className="text-xs text-slate-500">{contact.leadStatus}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Phone className="w-4 h-4 text-slate-400" />
                        {contact.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      {contact.email ? (
                        <div className="flex items-center gap-1">
                          <Mail className="w-4 h-4 text-slate-400" />
                          {contact.email}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {contact.tags.map((tag) => (
                          <span key={tag}>{getTagBadge(tag)}</span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{contact.source || 'WhatsApp'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{contact._count?.conversations || 0}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
