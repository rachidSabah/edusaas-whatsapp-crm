'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Mail, 
  Send, 
  Inbox, 
  FileText, 
  Trash2, 
  AlertOctagon,
  Star,
  StarOff,
  Search,
  Plus,
  Loader2,
  Paperclip,
  Reply,
  Forward,
  Clock,
  CheckCircle,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface EmailMessage {
  id: string;
  toEmail: string | null;
  toName: string | null;
  fromEmail: string | null;
  fromName: string | null;
  subject: string;
  body: string;
  htmlBody: string | null;
  attachments: string | null;
  direction: string;
  status: string;
  isRead: number;
  isStarred: number;
  isImportant: number;
  sentAt: string | null;
  receivedAt: string | null;
  createdAt: string;
}

interface EmailFolder {
  id: string;
  name: string;
  type: string;
  unreadCount: number;
}

const FOLDER_ICONS: Record<string, any> = {
  inbox: Inbox,
  sent: Send,
  drafts: FileText,
  junk: AlertOctagon,
  deleted: Trash2,
};

export default function EmailClientPage() {
  const [folders, setFolders] = useState<EmailFolder[]>([]);
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [selectedFolder, setSelectedFolder] = useState('inbox');
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const [composeData, setComposeData] = useState({
    to: '',
    subject: '',
    body: '',
    cc: '',
    bcc: '',
  });

  const [sending, setSending] = useState(false);

  const fetchFolders = async () => {
    try {
      const response = await fetch('/api/email?folders=true');
      const data = await response.json() as { folders: EmailFolder[] };
      setFolders(data.folders || []);
    } catch (error) {
      console.error('Error fetching folders:', error);
    }
  };

  const fetchEmails = async (folder: string) => {
    setLoadingEmails(true);
    try {
      const response = await fetch(`/api/email?folder=${folder}&search=${search}`);
      const data = await response.json() as { emails: EmailMessage[] };
      setEmails(data.emails || []);
    } catch (error) {
      console.error('Error fetching emails:', error);
    } finally {
      setLoadingEmails(false);
    }
  };

  useEffect(() => {
    fetchFolders();
  }, []);

  useEffect(() => {
    fetchEmails(selectedFolder);
  }, [selectedFolder, search]);

  useEffect(() => {
    if (emails.length > 0 && !loading) {
      setLoading(false);
    }
  }, [emails, loading]);

  const handleSelectEmail = async (email: EmailMessage) => {
    setSelectedEmail(email);
    if (!email.isRead) {
      await fetch('/api/email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: email.id, isRead: true }),
      });
      fetchEmails(selectedFolder);
    }
  };

  const handleToggleStar = async (email: EmailMessage) => {
    await fetch('/api/email', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: email.id, isStarred: !email.isStarred }),
    });
    fetchEmails(selectedFolder);
  };

  const handleSendEmail = async () => {
    if (!composeData.to || !composeData.subject) {
      alert('Veuillez remplir le destinataire et le sujet');
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: composeData.to,
          subject: composeData.subject,
          body: composeData.body,
          cc: composeData.cc || null,
          bcc: composeData.bcc || null,
        }),
      });

      if (response.ok) {
        setComposeOpen(false);
        setComposeData({ to: '', subject: '', body: '', cc: '', bcc: '' });
        fetchEmails(selectedFolder);
        alert('Email envoyé avec succès');
      } else {
        const data = await response.json() as { error?: string };
        alert(data.error || 'Erreur lors de l\'envoi');
      }
    } catch (error) {
      console.error('Send error:', error);
      alert('Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteEmail = async (email: EmailMessage) => {
    if (!confirm('Supprimer cet email?')) return;
    
    await fetch(`/api/email?id=${email.id}`, { method: 'DELETE' });
    setSelectedEmail(null);
    fetchEmails(selectedFolder);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      sent: 'bg-blue-100 text-blue-700',
      delivered: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      draft: 'bg-slate-100 text-slate-700',
    };
    const labels: Record<string, string> = {
      pending: 'En attente',
      sent: 'Envoyé',
      delivered: 'Délivré',
      failed: 'Échec',
      draft: 'Brouillon',
    };
    return (
      <Badge className={colors[status] || colors.pending}>
        {labels[status] || status}
      </Badge>
    );
  };

  const totalUnread = folders.reduce((acc, f) => acc + (f.unreadCount || 0), 0);

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="grid grid-cols-12 gap-4 h-full">
        {/* Sidebar - Folders */}
        <Card className="col-span-2 border-0 shadow-md flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="w-5 h-5 text-green-600" />
                Email
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <div className="p-2">
              <Button 
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600"
                onClick={() => setComposeOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouveau
              </Button>
            </div>
            <ScrollArea className="h-full">
              <div className="p-2 space-y-1">
                {folders.map((folder) => {
                  const Icon = FOLDER_ICONS[folder.type] || Mail;
                  return (
                    <Button
                      key={folder.id}
                      variant={selectedFolder === folder.type ? 'secondary' : 'ghost'}
                      className={`w-full justify-start ${selectedFolder === folder.type ? 'bg-green-50 text-green-700' : ''}`}
                      onClick={() => setSelectedFolder(folder.type)}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      <span className="flex-1 text-left">{folder.name}</span>
                      {folder.unreadCount > 0 && (
                        <Badge className="bg-green-600 text-white text-xs">
                          {folder.unreadCount}
                        </Badge>
                      )}
                    </Button>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Email List */}
        <Card className="col-span-4 border-0 shadow-md flex flex-col">
          <CardHeader className="pb-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full">
              {loadingEmails ? (
                <div className="p-4 text-center">
                  <Loader2 className="w-6 h-6 mx-auto animate-spin text-green-600" />
                </div>
              ) : emails.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Aucun email</p>
                </div>
              ) : (
                emails.map((email) => (
                  <div
                    key={email.id}
                    onClick={() => handleSelectEmail(email)}
                    className={`p-4 border-b cursor-pointer hover:bg-slate-50 transition ${
                      !email.isRead ? 'bg-blue-50' : ''
                    } ${selectedEmail?.id === email.id ? 'bg-green-50' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`font-medium truncate ${!email.isRead ? 'text-slate-900' : 'text-slate-600'}`}>
                            {selectedFolder === 'sent' 
                              ? (email.toName || email.toEmail)
                              : (email.fromName || email.fromEmail)
                            }
                          </p>
                          <span className="text-xs text-slate-400 flex-shrink-0">
                            {format(new Date(email.createdAt), 'd MMM', { locale: fr })}
                          </span>
                        </div>
                        <p className={`text-sm truncate ${!email.isRead ? 'font-medium' : 'text-slate-600'}`}>
                          {email.subject}
                        </p>
                        <p className="text-xs text-slate-400 truncate mt-1">
                          {email.body.substring(0, 60)}...
                        </p>
                      </div>
                      {email.isStarred && (
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Email Content */}
        <Card className="col-span-6 border-0 shadow-md flex flex-col">
          {selectedEmail ? (
            <>
              <CardHeader className="pb-3 border-b">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">{selectedEmail.subject}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      {selectedFolder === 'sent' ? (
                        <p className="text-sm text-slate-600">
                          À: {selectedEmail.toName || selectedEmail.toEmail}
                        </p>
                      ) : (
                        <p className="text-sm text-slate-600">
                          De: {selectedEmail.fromName || selectedEmail.fromEmail}
                        </p>
                      )}
                      {getStatusBadge(selectedEmail.status)}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {format(new Date(selectedEmail.createdAt), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleToggleStar(selectedEmail)}>
                      {selectedEmail.isStarred ? (
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      ) : (
                        <StarOff className="w-4 h-4" />
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setComposeOpen(true)}>
                      <Reply className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Forward className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeleteEmail(selectedEmail)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-4">
                <ScrollArea className="h-full">
                  {selectedEmail.htmlBody ? (
                    <div dangerouslySetInnerHTML={{ __html: selectedEmail.htmlBody }} />
                  ) : (
                    <p className="whitespace-pre-line text-slate-700">{selectedEmail.body}</p>
                  )}
                  {selectedEmail.attachments && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium text-slate-500 mb-2">Pièces jointes</p>
                      <div className="flex flex-wrap gap-2">
                        {JSON.parse(selectedEmail.attachments).map((file: string, i: number) => (
                          <Button key={i} variant="outline" size="sm">
                            <Paperclip className="w-4 h-4 mr-2" />
                            {file}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              <div className="text-center">
                <Mail className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Sélectionnez un email</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Compose Dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nouveau message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="to">À *</Label>
              <Input
                id="to"
                type="email"
                value={composeData.to}
                onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
                placeholder="email@exemple.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cc">Cc</Label>
                <Input
                  id="cc"
                  type="email"
                  value={composeData.cc}
                  onChange={(e) => setComposeData({ ...composeData, cc: e.target.value })}
                  placeholder="cc@exemple.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bcc">Cci</Label>
                <Input
                  id="bcc"
                  type="email"
                  value={composeData.bcc}
                  onChange={(e) => setComposeData({ ...composeData, bcc: e.target.value })}
                  placeholder="cci@exemple.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Sujet *</Label>
              <Input
                id="subject"
                value={composeData.subject}
                onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                placeholder="Sujet de l'email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Message</Label>
              <Textarea
                id="body"
                value={composeData.body}
                onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                placeholder="Votre message..."
                rows={10}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSendEmail} disabled={sending} className="bg-green-600">
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configuration Email</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-600">
              Configurez vos paramètres email sur la page de configuration dédiée.
            </p>
            <Button 
              className="mt-4" 
              variant="outline"
              onClick={() => {
                setSettingsOpen(false);
                window.location.href = '/dashboard/settings';
              }}
            >
              <Settings className="w-4 h-4 mr-2" />
              Accéder aux paramètres
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
