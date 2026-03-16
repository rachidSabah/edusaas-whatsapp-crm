'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  Download, Upload, History, Database, Loader2, 
  CheckCircle, XCircle, AlertCircle, FileJson,
  HardDrive, Calendar, Cloud, Settings, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BackupRecord {
  id: string;
  type: string;
  size: number;
  recordCount: number;
  status: string;
  createdAt: string;
  provider?: string;
}

interface BackupData {
  version: string;
  timestamp: string;
  organizationId: string | null;
  organizationName: string | null;
  tables: { [key: string]: any[] };
  checksum: string;
}

export default function BackupPage() {
  const [history, setHistory] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [restorePreview, setRestorePreview] = useState<BackupData | null>(null);
  const [overwrite, setOverwrite] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cloudConfig, setCloudConfig] = useState({
    enabled: false,
    bucketName: '',
    apiKey: '',
    interval: 'daily'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/backup');
      const data = await response.json();
      setHistory(data.history || []);
      if (data.cloudConfig) setCloudConfig(data.cloudConfig);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleCreateBackup = async (provider = 'local') => {
    setCreating(true);
    setError(null);
    try {
      const response = await fetch('/api/backup', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider })
      });
      const data = await response.json();

      if (data.success) {
        if (provider === 'local') {
          const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = data.filename;
          link.click();
          URL.revokeObjectURL(url);
        }

        setSuccess(`Sauvegarde ${provider === 'google' ? 'Cloud' : ''} créée avec ${data.recordCount} enregistrements`);
        fetchHistory();
      } else {
        setError(data.error || 'Erreur lors de la création');
      }
    } catch (error) {
      setError('Erreur de connexion');
    } finally {
      setCreating(false);
    }
  };

  const handleSaveCloudConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/backup/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cloudConfig)
      });
      if (response.ok) {
        setSuccess('Configuration Cloud sauvegardée');
      }
    } catch (error) {
      setError('Erreur lors de la sauvegarde de la configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoring(true);
    setError(null);

    try {
      const text = await file.text();
      const backupData: BackupData = JSON.parse(text);

      if (!backupData.version || !backupData.tables || !backupData.checksum) {
        setError('Fichier de sauvegarde invalide');
        setRestoring(false);
        return;
      }

      setRestorePreview(backupData);
      setRestoreDialogOpen(true);
    } catch (error) {
      setError('Erreur lors de la lecture du fichier');
    } finally {
      setRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRestore = async () => {
    if (!restorePreview) return;

    setRestoring(true);
    try {
      const response = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backupData: restorePreview,
          overwrite,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const counts = Object.entries(data.restored)
          .filter(([, count]) => (count as number) > 0)
          .map(([table, count]) => `${table}: ${count}`)
          .join(', ');
        setSuccess(`Restauration réussie. ${counts}`);
        setRestoreDialogOpen(false);
        setRestorePreview(null);
        fetchHistory();
      } else {
        setError(data.error || 'Erreur lors de la restauration');
      }
    } catch (error) {
      setError('Erreur de connexion');
    } finally {
      setRestoring(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />Terminé</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700"><AlertCircle className="w-3 h-3 mr-1" />En cours</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" />Échec</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Sauvegarde & Restauration</h1>
          <p className="text-slate-600">Gérez les sauvegardes locales et Cloud (Google Cloud)</p>
        </div>
        <Button variant="outline" onClick={fetchHistory} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-red-700">
              <XCircle className="w-5 h-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {success && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <p>{success}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Local Backup */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Download className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <CardTitle>Sauvegarde Locale</CardTitle>
                <CardDescription>Télécharger un fichier JSON</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              Exportez toutes vos données (étudiants, présences, etc.) dans un fichier sécurisé sur votre ordinateur.
            </p>
            <Button 
              onClick={() => handleCreateBackup('local')}
              disabled={creating}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              Télécharger la sauvegarde
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-500">Ou restaurer</span></div>
            </div>
            <input type="file" ref={fileInputRef} accept=".json" onChange={handleFileSelect} className="hidden" />
            <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={restoring}>
              <Upload className="w-4 h-4 mr-2" /> Importer un fichier
            </Button>
          </CardContent>
        </Card>

        {/* Google Cloud Backup */}
        <Card className="border-0 shadow-md lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Cloud className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Google Cloud Backup (Incrémental)</CardTitle>
                  <CardDescription>Sauvegarde automatique type JetBackup</CardDescription>
                </div>
              </div>
              <Badge variant={cloudConfig.enabled ? "default" : "secondary"}>
                {cloudConfig.enabled ? "Activé" : "Désactivé"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nom du Bucket Google Cloud</Label>
                <Input 
                  placeholder="mon-bucket-sauvegarde" 
                  value={cloudConfig.bucketName}
                  onChange={(e) => setCloudConfig({...cloudConfig, bucketName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Clé API / Service Account</Label>
                <Input 
                  type="password" 
                  placeholder="JSON Key..." 
                  value={cloudConfig.apiKey}
                  onChange={(e) => setCloudConfig({...cloudConfig, apiKey: e.target.value})}
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <Label>Fréquence de sauvegarde</Label>
                <select 
                  className="w-full h-10 px-3 rounded-md border border-slate-200"
                  value={cloudConfig.interval}
                  onChange={(e) => setCloudConfig({...cloudConfig, interval: e.target.value})}
                >
                  <option value="hourly">Toutes les heures</option>
                  <option value="daily">Quotidien (Recommandé)</option>
                  <option value="weekly">Hebdomadaire</option>
                </select>
              </div>
              <div className="flex items-end pb-1">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="cloud-enabled" 
                    checked={cloudConfig.enabled}
                    onCheckedChange={(checked) => setCloudConfig({...cloudConfig, enabled: !!checked})}
                  />
                  <Label htmlFor="cloud-enabled">Activer la sauvegarde auto</Label>
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={handleSaveCloudConfig}>
                <Settings className="w-4 h-4 mr-2" /> Enregistrer la config
              </Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => handleCreateBackup('google')}
                disabled={creating || !cloudConfig.enabled}
              >
                <Cloud className="w-4 h-4 mr-2" /> Lancer une sauvegarde Cloud maintenant
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backup History */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <History className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <CardTitle>Historique des sauvegardes</CardTitle>
              <CardDescription>Liste de toutes les sauvegardes effectuées</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Taille</TableHead>
                <TableHead>Enregistrements</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    Aucune sauvegarde trouvée
                  </TableCell>
                </TableRow>
              ) : (
                history.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {format(new Date(record.createdAt), 'Pp', { locale: fr })}
                    </TableCell>
                    <TableCell className="capitalize">{record.type}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {record.provider === 'google' ? <Cloud className="w-3 h-3 text-blue-500" /> : <HardDrive className="w-3 h-3 text-slate-500" />}
                        {record.provider === 'google' ? 'Google Cloud' : 'Local'}
                      </div>
                    </TableCell>
                    <TableCell>{formatSize(record.size)}</TableCell>
                    <TableCell>{record.recordCount}</TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Restaurer</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Restore Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer la restauration</DialogTitle>
            <DialogDescription>
              Vous êtes sur le point de restaurer les données suivantes :
            </DialogDescription>
          </DialogHeader>
          
          {restorePreview && (
            <div className="space-y-4 py-4">
              <div className="bg-slate-50 p-3 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Date de sauvegarde:</span>
                  <span className="font-medium">{format(new Date(restorePreview.timestamp), 'Pp', { locale: fr })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Version:</span>
                  <span className="font-medium">{restorePreview.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total enregistrements:</span>
                  <span className="font-medium">
                    {Object.values(restorePreview.tables).reduce((sum, t) => sum + t.length, 0)}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="overwrite" 
                  checked={overwrite}
                  onCheckedChange={(checked) => setOverwrite(!!checked)}
                />
                <Label htmlFor="overwrite" className="text-sm font-normal">
                  Écraser les données existantes (Recommandé pour une restauration complète)
                </Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreDialogOpen(false)}>Annuler</Button>
            <Button 
              onClick={handleRestore}
              disabled={restoring}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {restoring ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Lancer la restauration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
