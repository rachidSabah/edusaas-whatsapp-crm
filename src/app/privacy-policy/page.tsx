'use client';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Politique de Confidentialité</h1>
          <p className="text-slate-600">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>
        </div>

        {/* Content */}
        <div className="prose prose-slate max-w-none space-y-6 text-slate-700">
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Introduction</h2>
            <p>
              EduSaaS WhatsApp CRM (ci-après « l'Application ») s'engage à protéger votre vie privée et à vous fournir une
              expérience transparente concernant la collecte et l'utilisation de vos données personnelles. Cette Politique
              de Confidentialité explique comment nous collectons, utilisons, partageons et protégeons vos informations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Données que nous collectons</h2>
            <p>Nous collectons les types de données suivants :</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Données de compte</strong> : Nom, adresse e-mail, numéro de téléphone, organisation et rôle
                utilisateur.
              </li>
              <li>
                <strong>Données de communication</strong> : Messages WhatsApp, historique de conversations, pièces jointes
                et métadonnées de communication.
              </li>
              <li>
                <strong>Données d'étudiant</strong> : Nom, numéro de téléphone des parents, présences, notes et
                informations académiques.
              </li>
              <li>
                <strong>Données d'utilisation</strong> : Adresse IP, type de navigateur, pages visitées, durée de visite
                et actions effectuées dans l'Application.
              </li>
              <li>
                <strong>Données de paiement</strong> : Informations de facturation et d'abonnement (traitées de manière
                sécurisée par nos prestataires).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Utilisation de vos données</h2>
            <p>Nous utilisons vos données pour :</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Fournir et maintenir l'Application et ses fonctionnalités.</li>
              <li>Envoyer des messages WhatsApp en votre nom via l'API Meta WhatsApp Business.</li>
              <li>Générer des réponses automatiques basées sur l'IA et votre base de connaissance.</li>
              <li>Envoyer des notifications d'absence aux parents via WhatsApp.</li>
              <li>Analyser l'utilisation et améliorer nos services.</li>
              <li>Respecter les obligations légales et réglementaires.</li>
              <li>Prévenir la fraude et la malveillance.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Partage de vos données</h2>
            <p>
              Nous ne vendons jamais vos données personnelles. Cependant, nous pouvons les partager avec les tiers
              suivants :
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Meta Platforms, Inc.</strong> : Pour l'envoi de messages via l'API WhatsApp Business (conformément
                aux conditions de Meta).
              </li>
              <li>
                <strong>Puter</strong> : Pour le traitement et l'IA générant des réponses automatiques.
              </li>
              <li>
                <strong>Turso</strong> : Pour le stockage sécurisé de vos données dans notre base de données.
              </li>
              <li>
                <strong>Cloudflare</strong> : Pour l'hébergement et la distribution de l'Application.
              </li>
              <li>
                <strong>Prestataires de paiement</strong> : Pour traiter les transactions d'abonnement.
              </li>
              <li>
                <strong>Autorités légales</strong> : Si requis par la loi ou pour protéger nos droits.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Sécurité des données</h2>
            <p>
              Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles pour protéger vos données
              contre l'accès non autorisé, la modification ou la destruction. Cependant, aucune transmission sur Internet
              n'est 100 % sécurisée. Nous vous recommandons de maintenir vos identifiants confidentiels.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Rétention des données</h2>
            <p>
              Nous conservons vos données aussi longtemps que nécessaire pour fournir l'Application et respecter nos
              obligations légales. Vous pouvez demander la suppression de vos données à tout moment via la page de
              suppression des données.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">7. Droits de l'utilisateur (RGPD)</h2>
            <p>Si vous êtes situé en Europe, vous avez le droit de :</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Accéder à vos données personnelles.</li>
              <li>Corriger les données inexactes.</li>
              <li>Demander la suppression de vos données.</li>
              <li>Restreindre le traitement de vos données.</li>
              <li>Porter vos données vers un autre service.</li>
              <li>Vous opposer au traitement automatisé.</li>
            </ul>
            <p className="mt-4">
              Pour exercer ces droits, contactez-nous à <strong>cabinmanager776@gmail.com</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">8. Cookies et suivi</h2>
            <p>
              L'Application utilise des cookies pour améliorer votre expérience utilisateur. Vous pouvez contrôler les
              cookies via les paramètres de votre navigateur.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">9. Modifications de cette politique</h2>
            <p>
              Nous pouvons mettre à jour cette Politique de Confidentialité à tout moment. Les modifications seront
              affichées sur cette page avec la date de mise à jour.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">10. Contact</h2>
            <p>
              Pour toute question concernant cette Politique de Confidentialité, contactez-nous à :{' '}
              <strong>cabinmanager776@gmail.com</strong>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
