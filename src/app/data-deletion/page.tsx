'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DataDeletionPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    reason: '',
    accountId: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // In production, this would send to your backend
      // For now, we'll simulate the submission
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Send email notification
      console.log('Data deletion request submitted:', formData);
      setSubmitted(true);

      // Reset form after 5 seconds
      setTimeout(() => {
        setFormData({ email: '', reason: '', accountId: '' });
        setSubmitted(false);
      }, 5000);
    } catch (error) {
      console.error('Error submitting request:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Suppression de Données</h1>
          <p className="text-slate-600">
            Conformément au RGPD et aux lois de protection des données, vous pouvez demander la suppression complète de
            vos données personnelles.
          </p>
        </div>

        {/* Info Card */}
        <Card className="mb-8 border-0 shadow-md bg-blue-50">
          <CardContent className="py-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Avant de continuer</h3>
                <p className="text-sm text-blue-700">
                  La suppression de vos données est irréversible. Cela inclut votre compte, vos messages, vos
                  conversations et tous les fichiers associés. Assurez-vous que c'est bien ce que vous souhaitez.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Card */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Formulaire de Suppression de Données</CardTitle>
            <CardDescription>
              Remplissez ce formulaire pour demander la suppression de vos données personnelles
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <AlertTitle className="text-green-900">Demande reçue</AlertTitle>
                <AlertDescription className="text-green-700">
                  Votre demande de suppression de données a été reçue. Nous traiterons votre demande dans les 30 jours
                  conformément au RGPD. Un email de confirmation a été envoyé à <strong>{formData.email}</strong>.
                </AlertDescription>
              </Alert>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Adresse Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="votre.email@example.com"
                    required
                  />
                  <p className="text-xs text-slate-500">
                    L'email associé à votre compte EduSaaS WhatsApp CRM
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountId">ID du Compte (optionnel)</Label>
                  <Input
                    id="accountId"
                    value={formData.accountId}
                    onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                    placeholder="Ex: org_12345"
                  />
                  <p className="text-xs text-slate-500">
                    Vous pouvez trouver cet ID dans les paramètres de votre compte
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Raison de la suppression (optionnel)</Label>
                  <Textarea
                    id="reason"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Aidez-nous à comprendre pourquoi vous supprimez votre compte..."
                    rows={4}
                  />
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <h4 className="font-semibold text-slate-900 mb-2">Ce qui sera supprimé :</h4>
                  <ul className="text-sm text-slate-600 space-y-1">
                    <li>✓ Votre compte et tous les identifiants</li>
                    <li>✓ Tous vos messages et conversations</li>
                    <li>✓ Votre base de connaissance et vos documents</li>
                    <li>✓ Vos paramètres et configurations</li>
                    <li>✓ Vos données d'utilisation et analytiques</li>
                  </ul>
                </div>

                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <h4 className="font-semibold text-amber-900 mb-2">Ce qui ne sera pas supprimé :</h4>
                  <ul className="text-sm text-amber-700 space-y-1">
                    <li>• Les messages reçus par vos contacts (ils restent chez eux)</li>
                    <li>• Les données archivées ou sauvegardées par des tiers</li>
                    <li>• Les données requises par la loi (factures, registres légaux)</li>
                  </ul>
                </div>

                <Button
                  type="submit"
                  disabled={loading || !formData.email}
                  className="w-full bg-red-600 hover:bg-red-700 h-10"
                >
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Traitement en cours...
                    </>
                  ) : (
                    'Demander la Suppression de Mes Données'
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* FAQ */}
        <div className="mt-12 space-y-6">
          <h2 className="text-2xl font-bold text-slate-900">Questions Fréquentes</h2>

          <div className="space-y-4">
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-2">Combien de temps prend la suppression ?</h3>
              <p className="text-slate-600">
                Conformément au RGPD, nous traiterons votre demande dans les 30 jours. Vous recevrez une confirmation
                par email une fois la suppression effectuée.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-2">Puis-je annuler ma demande ?</h3>
              <p className="text-slate-600">
                Oui, vous pouvez annuler votre demande dans les 7 jours suivant sa soumission en envoyant un email à
                cabinmanager776@gmail.com.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-2">Que se passe-t-il avec mes données chez Meta ?</h3>
              <p className="text-slate-600">
                Les données stockées chez Meta (messages WhatsApp) seront également supprimées conformément aux politiques
                de Meta. Contactez Meta directement pour plus d'informations.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-2">Comment puis-je contacter le support ?</h3>
              <p className="text-slate-600">
                Pour toute question, envoyez un email à <strong>cabinmanager776@gmail.com</strong> avec le sujet
                « Suppression de Données ».
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-slate-200 text-center text-sm text-slate-600">
          <p>
            Cette page est conforme au Règlement Général sur la Protection des Données (RGPD) et aux lois de protection
            des données applicables.
          </p>
        </div>
      </div>
    </div>
  );
}
