'use client';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Conditions d'Utilisation</h1>
          <p className="text-slate-600">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>
        </div>

        {/* Content */}
        <div className="prose prose-slate max-w-none space-y-6 text-slate-700">
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Acceptation des conditions</h2>
            <p>
              En accédant et en utilisant EduSaaS WhatsApp CRM (ci-après « l'Application »), vous acceptez d'être lié par
              ces Conditions d'Utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser l'Application.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Description du service</h2>
            <p>
              EduSaaS WhatsApp CRM est une plateforme de gestion des communications WhatsApp pour les institutions
              éducatives. L'Application permet de :
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Envoyer et recevoir des messages via l'API WhatsApp Business Meta.</li>
              <li>Gérer les conversations avec les parents et les étudiants.</li>
              <li>Utiliser l'IA pour générer des réponses automatiques.</li>
              <li>Envoyer des notifications d'absence et de retard.</li>
              <li>Gérer une base de connaissance pour les réponses fréquentes.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Compte utilisateur</h2>
            <p>
              Vous êtes responsable du maintien de la confidentialité de vos identifiants de connexion. Vous acceptez
              d'être responsable de toutes les activités effectuées sous votre compte. Vous devez informer immédiatement
              notre équipe de toute utilisation non autorisée de votre compte.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Utilisation acceptable</h2>
            <p>Vous acceptez de ne pas utiliser l'Application pour :</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Envoyer du spam, du harcèlement ou des messages abusifs.</li>
              <li>Violer les droits d'autrui ou les lois applicables.</li>
              <li>Accéder à des données sans autorisation.</li>
              <li>Contourner les mesures de sécurité de l'Application.</li>
              <li>Utiliser l'Application à des fins illégales ou non autorisées.</li>
              <li>Transmettre des logiciels malveillants ou du contenu nuisible.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Propriété intellectuelle</h2>
            <p>
              L'Application et tout son contenu (code, design, fonctionnalités) sont la propriété exclusive de nos
              développeurs et partenaires. Vous ne pouvez pas reproduire, modifier ou distribuer l'Application sans
              autorisation écrite.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Limitation de responsabilité</h2>
            <p>
              L'Application est fournie « en l'état ». Nous ne garantissons pas que l'Application sera sans erreurs ou
              interruptions. Nous ne serons pas responsables des dommages directs, indirects ou consécutifs résultant de
              l'utilisation de l'Application.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">7. Suspension et résiliation</h2>
            <p>
              Nous nous réservons le droit de suspendre ou de résilier votre accès à l'Application à tout moment si vous
              violez ces Conditions d'Utilisation ou nos politiques. En cas de résiliation, vous perdrez l'accès à votre
              compte et à vos données.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">8. Frais et paiement</h2>
            <p>
              Certaines fonctionnalités de l'Application peuvent être payantes. Les frais seront indiqués avant votre
              achat. Vous acceptez de payer les frais applicables selon les conditions d'abonnement que vous avez
              choisies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">9. Modifications des conditions</h2>
            <p>
              Nous pouvons modifier ces Conditions d'Utilisation à tout moment. Les modifications seront affichées sur
              cette page. Votre utilisation continue de l'Application après les modifications constitue votre acceptation
              des nouvelles conditions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">10. Loi applicable</h2>
            <p>
              Ces Conditions d'Utilisation sont régies par les lois applicables. Tout litige sera résolu par les
              tribunaux compétents.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">11. Contact</h2>
            <p>
              Pour toute question concernant ces Conditions d'Utilisation, contactez-nous à :{' '}
              <strong>cabinmanager776@gmail.com</strong>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
