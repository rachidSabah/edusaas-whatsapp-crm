'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  HardDrive, Calendar
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/backup');
      const data = await response.json();
      setHistory(data.history || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleCreateBackup = async () => {
    setCreating(true);
    setError(null);
    try {
      const response = await fetch('/api/backup', { method: 'POST' });
      const data = await response.json();

      if (data.success) {
        // Download the backup
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = data.filename;
        link.click();
        URL.revokeObjectURL(url);

        setSuccess(`Sauvegarde créée avec ${data.recordCount} enregistrements`);
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoring(true);
    setError(null);

    try {
      const text = await file.text();
      const backupData: BackupData = JSON.parse(text);

      // Validate backup structure
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

  const getTotalRecordCount = () => {
    if (!restorePreview) return 0;
    return Object.values(restorePreview.tables).reduce((sum, table) => sum + table.length, 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Sauvegarde & Restauration</h1>
        <p className="text-slate-600">Gérez les sauvegardes de vos données</p>
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

      {/* Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Download className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <CardTitle>Créer une sauvegarde</CardTitle>
                <CardDescription>Exporter toutes vos données</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-4">
              Créez une sauvegarde complète de toutes vos données: étudiants, groupes, présences, 
              templates, conversations et plus. Le fichier sera téléchargé au format JSON.
            </p>
            <Button 
              onClick={handleCreateBackup}
              disabled={creating}
              className="bg-gradient-to-r from-green-500 to-emerald-600"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Créer la sauvegarde
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Upload className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>Restaurer</CardTitle>
                <CardDescription>Importer une sauvegarde</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-4">
              Restaurez vos données à partir d'un fichier de sauvegarde précédent. 
              Vous pouvez choisir d'écraser les données existantes ou de les fusionner.
            </p>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button 
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={restoring}
            >
              {restoring ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Lecture...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Sélectionner un fichier
                </>
              )}
            </Button>
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
              <CardDescription>Vos dernières sauvegardes</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-500">
              <Loader2 className="w-6 h-6 mx-auto animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Aucune sauvegarde effectuée</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Taille</TableHead>
                  <TableHead>Enregistrements</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {format(new Date(record.createdAt), 'd MMMM yyyy à HH:mm', { locale: fr })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{record.type}</Badge>
                    </TableCell>
                    <TableCell>{formatSize(record.size)}</TableCell>
                    <TableCell>{record.recordCount}</TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Restore Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Aperçu de la restauration</DialogTitle>
            <DialogDescription>
              Vérifiez les données avant de restaurer
            </DialogDescription>
          </DialogHeader>
          
          {restorePreview && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Version:</span>
                  <span className="font-medium">{restorePreview.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Date:</span>
                  <span className="font-medium">
                    {format(new Date(restorePreview.timestamp), 'd MMMM yyyy HH:mm', { locale: fr })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Organisation:</span>
                  <span className="font-medium">{restorePreview.organizationName || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Total enregistrements:</span>
                  <span className="font-medium">{getTotalRecordCount()}</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Tables incluses:</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(restorePreview.tables).map(([table, data]) => (
                    (data as any[]).length > 0 && (
                      <Badge key={table} variant="outline" className="text-xs">
                        {table}: {(data as any[]).length}
                      </Badge>
                    )
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="overwrite"
                  checked={overwrite}
                  onCheckedChange={(checked) => setOverwrite(checked as boolean)}
                />
                <Label htmlFor="overwrite" className="text-sm">
                  Écraser les données existantes
                </Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleRestore}
              disabled={restoring}
              className="bg-gradient-to-r from-blue-500 to-blue-600"
            >
              {restoring ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Restauration...
                </>
              ) : (
                <>
                  <FileJson className="w-4 h-4 mr-2" />
                  Restaurer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
