import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Users,
  Calendar,
  Bot,
  Globe,
  Shield,
  Smartphone,
  BarChart3,
  CheckCircle,
  Zap,
  HeadphonesIcon,
  BookOpen
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-800">EduSaaS</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-slate-600 hover:text-slate-900 transition">Fonctionnalités</Link>
            <Link href="#pricing" className="text-slate-600 hover:text-slate-900 transition">Tarifs</Link>
            <Link href="#contact" className="text-slate-600 hover:text-slate-900 transition">Contact</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Connexion</Button>
            </Link>
            <Link href="/register">
              <Button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
                Essai Gratuit
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center">
          <Badge className="mb-6 bg-green-100 text-green-700 hover:bg-green-100">
            <Zap className="w-3 h-3 mr-1" />
            Nouveau: Intégration WhatsApp IA
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
            Gestion Scolaire Intelligente<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-emerald-600">
              Propulsée par WhatsApp & IA
            </span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto">
            CRM WhatsApp multi-tenant avec réponses automatiques IA, gestion des étudiants, 
            suivi des présences et notifications automatiques aux parents. 
            La solution complète pour les écoles et académies.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 px-8">
                Commencer Gratuitement
              </Button>
            </Link>
            <Link href="#demo">
              <Button size="lg" variant="outline" className="px-8">
                Voir la Démo
              </Button>
            </Link>
          </div>
          <p className="text-sm text-slate-500 mt-4">Essai gratuit de 14 jours • Aucune carte requise</p>
        </div>

        {/* Hero Image/Dashboard Preview */}
        <div className="container mx-auto mt-16">
          <div className="bg-gradient-to-b from-slate-100 to-slate-50 rounded-2xl p-8 shadow-2xl border">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-slate-800 px-4 py-3 flex items-center gap-2">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="flex-1 text-center">
                  <span className="text-slate-400 text-sm">dashboard.edusaas.app</span>
                </div>
              </div>
              <div className="p-6 bg-slate-50">
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-1 bg-white rounded-lg p-4 shadow-sm">
                    <div className="space-y-3">
                      <div className="h-6 bg-slate-200 rounded w-3/4"></div>
                      <div className="h-4 bg-slate-100 rounded w-full"></div>
                      <div className="h-4 bg-slate-100 rounded w-full"></div>
                      <div className="h-4 bg-green-200 rounded w-full"></div>
                      <div className="h-4 bg-slate-100 rounded w-full"></div>
                    </div>
                  </div>
                  <div className="col-span-3 space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { title: 'Conversations', value: '156', color: 'bg-green-500' },
                        { title: 'Étudiants', value: '342', color: 'bg-blue-500' },
                        { title: 'Taux Présence', value: '94%', color: 'bg-purple-500' }
                      ].map((stat, i) => (
                        <div key={i} className="bg-white rounded-lg p-4 shadow-sm">
                          <div className={`w-2 h-2 ${stat.color} rounded-full mb-2`}></div>
                          <div className="text-2xl font-bold text-slate-800">{stat.value}</div>
                          <div className="text-sm text-slate-500">{stat.title}</div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                        <div className="h-6 bg-green-100 rounded-full w-20"></div>
                      </div>
                      <div className="space-y-3">
                        {[1, 2, 3].map((_, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-full"></div>
                            <div className="flex-1">
                              <div className="h-3 bg-slate-200 rounded w-1/3 mb-1"></div>
                              <div className="h-2 bg-slate-100 rounded w-2/3"></div>
                            </div>
                            <div className="h-6 bg-green-100 rounded w-16"></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Une Solution Complète pour Votre Établissement
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Tout ce dont vous avez besoin pour gérer votre école, communiquer avec les parents 
              et automatiser vos réponses WhatsApp.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: MessageSquare,
                title: 'CRM WhatsApp',
                description: 'Gérez tous vos contacts WhatsApp, suivez les conversations et classez vos prospects automatiquement.',
                color: 'text-green-600 bg-green-50'
              },
              {
                icon: Bot,
                title: 'Réponses IA Automatiques',
                description: 'Notre IA répond automatiquement aux questions d\'inscription, tarifs et horaires grâce à votre base de connaissances.',
                color: 'text-blue-600 bg-blue-50'
              },
              {
                icon: Users,
                title: 'Gestion des Étudiants',
                description: 'Fiche complète pour chaque étudiant: informations, groupe, parents, documents et historique.',
                color: 'text-purple-600 bg-purple-50'
              },
              {
                icon: Calendar,
                title: 'Suivi des Présences',
                description: 'Marquez les présences par groupe, envoyez automatiquement des notifications aux parents en cas d\'absence.',
                color: 'text-orange-600 bg-orange-50'
              },
              {
                icon: BookOpen,
                title: 'Base de Connaissances IA',
                description: 'Enseignez à l\'IA les réponses spécifiques à votre établissement: tarifs, programmes, politiques.',
                color: 'text-pink-600 bg-pink-50'
              },
              {
                icon: HeadphonesIcon,
                title: 'Boîte de Réception Unifiée',
                description: 'Toutes les conversations WhatsApp centralisées avec transfert vers un conseiller humain si nécessaire.',
                color: 'text-cyan-600 bg-cyan-50'
              }
            ].map((feature, i) => (
              <Card key={i} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-slate-600 text-base">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Comment ça fonctionne
            </h2>
            <p className="text-lg text-slate-600">En 3 étapes simples</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Connectez WhatsApp',
                description: 'Scannez le QR code avec votre téléphone WhatsApp pour connecter votre compte en toute sécurité.'
              },
              {
                step: '2',
                title: 'Configurez votre IA',
                description: 'Ajoutez vos formations, tarifs, horaires à la base de connaissances pour des réponses personnalisées.'
              },
              {
                step: '3',
                title: 'Gérez tout',
                description: 'Les réponses automatiques, les étudiants, les présences et les notifications parents sont gérés automatiquement.'
              }
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">{item.title}</h3>
                <p className="text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Tarifs Transparents
            </h2>
            <p className="text-lg text-slate-600">Choisissez le plan adapté à votre établissement</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: 'Starter',
                price: '299',
                period: '/mois',
                description: 'Idéal pour les petites académies',
                features: [
                  '100 étudiants',
                  '3 utilisateurs',
                  '500 messages IA/jour',
                  '10 templates',
                  'Support email'
                ],
                popular: false
              },
              {
                name: 'Professionnel',
                price: '799',
                period: '/mois',
                description: 'Pour les écoles en croissance',
                features: [
                  '500 étudiants',
                  '10 utilisateurs',
                  '2000 messages IA/jour',
                  '50 templates',
                  'Support prioritaire',
                  'Rapports avancés'
                ],
                popular: true
              },
              {
                name: 'Entreprise',
                price: '1999',
                period: '/mois',
                description: 'Pour les grandes institutions',
                features: [
                  'Étudiants illimités',
                  'Utilisateurs illimités',
                  '10000 messages IA/jour',
                  'Templates illimités',
                  'Support dédié',
                  'API access',
                  'Formation incluse'
                ],
                popular: false
              }
            ].map((plan, i) => (
              <Card key={i} className={`relative ${plan.popular ? 'border-2 border-green-500 shadow-xl' : 'border shadow-lg'}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-green-500 text-white">Plus Populaire</Badge>
                  </div>
                )}
                <CardHeader className="text-center pt-8">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                    <span className="text-slate-500">{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-2 text-slate-600">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link href="/register" className="block">
                    <Button className={`w-full ${plan.popular ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700' : ''}`} variant={plan.popular ? 'default' : 'outline'}>
                      Commencer
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 px-4 bg-gradient-to-b from-slate-900 to-slate-800 text-white">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Pourquoi choisir EduSaaS?
              </h2>
              <div className="space-y-6">
                {[
                  {
                    icon: Globe,
                    title: 'Multi-Tenant',
                    description: 'Chaque organisation dispose de son espace isolé avec ses propres données, utilisateurs et configuration.'
                  },
                  {
                    icon: Shield,
                    title: 'Sécurité Avancée',
                    description: 'Authentification sécurisée, chiffrement des données et conformité RGPD pour protéger vos informations.'
                  },
                  {
                    icon: Smartphone,
                    title: 'Sans API WhatsApp Business',
                    description: 'Connectez votre WhatsApp personnel directement, sans frais de l\'API Business.'
                  },
                  {
                    icon: BarChart3,
                    title: 'Analytics Complets',
                    description: 'Suivez les conversations, taux de réponse, présence et performances en temps réel.'
                  }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
                      <p className="text-slate-300">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-8 text-center">
              <h3 className="text-2xl font-bold mb-4">Prêt à démarrer?</h3>
              <p className="mb-6 text-white/90">
                Rejoignez Infohas Academy et d'autres écoles qui font confiance à EduSaaS.
              </p>
              <Link href="/register">
                <Button size="lg" variant="secondary" className="bg-white text-green-600 hover:bg-slate-100">
                  Créer mon compte gratuit
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-slate-900 text-slate-300 py-12 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white">EduSaaS</span>
              </div>
              <p className="text-sm">
                Solution CRM WhatsApp IA pour écoles et académies au Maroc.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Produit</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#features" className="hover:text-white transition">Fonctionnalités</Link></li>
                <li><Link href="#pricing" className="hover:text-white transition">Tarifs</Link></li>
                <li><Link href="#" className="hover:text-white transition">API</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white transition">Documentation</Link></li>
                <li><Link href="#" className="hover:text-white transition">Centre d'aide</Link></li>
                <li><Link href="#" className="hover:text-white transition">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Contact</h4>
              <ul className="space-y-2 text-sm">
                <li>contact@edusaas.ma</li>
                <li>+212 5XX XXX XXX</li>
                <li>Rabat, Maroc</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center text-sm">
            <p>&copy; 2024 EduSaaS. Tous droits réservés.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <Link href="#" className="hover:text-white transition">Politique de confidentialité</Link>
              <Link href="#" className="hover:text-white transition">Conditions d'utilisation</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
