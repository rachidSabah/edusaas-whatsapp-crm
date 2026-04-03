'use client';

import { useState, useEffect } from 'react';
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
  BookOpen,
  GraduationCap,
  Loader2,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Mail,
  Phone
} from 'lucide-react';

interface BrandingSettings {
  logo: string | null;
  logoWidth: number;
  appName: string;
  tagline: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  heroTitle: string;
  heroSubtitle: string;
  heroButtonText: string;
  heroButtonLink: string;
  heroBackgroundImage: string | null;
  heroBackgroundGradient: string;
  showFeatures: boolean;
  feature1Title: string;
  feature1Description: string;
  feature1Icon: string;
  feature2Title: string;
  feature2Description: string;
  feature2Icon: string;
  feature3Title: string;
  feature3Description: string;
  feature3Icon: string;
  footerText: string;
  facebookUrl: string | null;
  twitterUrl: string | null;
  linkedinUrl: string | null;
  instagramUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  customCss: string | null;
}

const DEFAULT_BRANDING: BrandingSettings = {
  logo: null,
  logoWidth: 40,
  appName: 'EduSaaS',
  tagline: 'Education Management Platform',
  primaryColor: '#10b981',
  secondaryColor: '#6366f1',
  accentColor: '#f59e0b',
  heroTitle: 'Transform Your Educational Institution',
  heroSubtitle: 'Complete management solution for schools, training centers, and educational organizations',
  heroButtonText: 'Get Started',
  heroButtonLink: '/login',
  heroBackgroundImage: null,
  heroBackgroundGradient: 'from-green-600 to-emerald-700',
  showFeatures: true,
  feature1Title: 'Student Management',
  feature1Description: 'Complete student lifecycle management from enrollment to graduation',
  feature1Icon: 'GraduationCap',
  feature2Title: 'Communication Hub',
  feature2Description: 'Integrated WhatsApp and email communication tools',
  feature2Icon: 'MessageSquare',
  feature3Title: 'Analytics & Reports',
  feature3Description: 'Comprehensive reporting and analytics dashboard',
  feature3Icon: 'BarChart3',
  footerText: '© 2026 EduSaaS. All rights reserved.',
  facebookUrl: null,
  twitterUrl: null,
  linkedinUrl: null,
  instagramUrl: null,
  contactEmail: null,
  contactPhone: null,
  customCss: null,
};

// Icon mapping
const iconMap: Record<string, any> = {
  GraduationCap,
  MessageSquare,
  BarChart3,
  Users,
  Calendar,
  Bot,
  BookOpen,
  HeadphonesIcon,
  Globe,
  Shield,
  Smartphone,
};

export default function LandingPage() {
  const [branding, setBranding] = useState<BrandingSettings>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const response = await fetch('/api/branding');
        const data = await response.json();
        if (data.branding) {
          setBranding({ ...DEFAULT_BRANDING, ...data.branding });
        }
      } catch (error) {
        console.error('Failed to fetch branding:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBranding();
  }, []);

  // Get icon component
  const getIcon = (iconName: string) => {
    return iconMap[iconName] || MessageSquare;
  };

  // Parse gradient classes
  const getGradientClass = (gradient: string) => {
    if (gradient.includes('from-')) {
      return gradient;
    }
    return `from-[${branding.primaryColor}] to-[${branding.secondaryColor}]`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: branding.primaryColor }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Custom CSS */}
      {branding.customCss && (
        <style dangerouslySetInnerHTML={{ __html: branding.customCss }} />
      )}

      {/* Header */}
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            {branding.logo ? (
              <img
                src={branding.logo}
                alt={branding.appName}
                style={{ maxWidth: branding.logoWidth, maxHeight: 40 }}
                className="rounded"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})` }}
              >
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
            )}
            <span className="text-xl font-bold text-slate-800">{branding.appName}</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-slate-600 hover:text-slate-900 transition">Features</Link>
            <Link href="#pricing" className="text-slate-600 hover:text-slate-900 transition">Pricing</Link>
            <Link href="#contact" className="text-slate-600 hover:text-slate-900 transition">Contact</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/register">
              <Button
                className="hover:opacity-90"
                style={{
                  background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})`
                }}
              >
                Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center">
          <Badge
            className="mb-6"
            style={{
              backgroundColor: `${branding.primaryColor}20`,
              color: branding.primaryColor
            }}
          >
            <Zap className="w-3 h-3 mr-1" />
            {branding.tagline}
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
            {branding.heroTitle}
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto">
            {branding.heroSubtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={branding.heroButtonLink || '/register'}>
              <Button
                size="lg"
                className="px-8 hover:opacity-90"
                style={{
                  background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})`
                }}
              >
                {branding.heroButtonText}
              </Button>
            </Link>
            <Link href="#demo">
              <Button size="lg" variant="outline" className="px-8">
                See Demo
              </Button>
            </Link>
          </div>
          <p className="text-sm text-slate-500 mt-4">14-day free trial • No credit card required</p>
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
                  <span className="text-slate-400 text-sm">dashboard.{branding.appName.toLowerCase().replace(/\s/g, '')}.app</span>
                </div>
              </div>
              <div className="p-6 bg-slate-50">
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-1 bg-white rounded-lg p-4 shadow-sm">
                    <div className="space-y-3">
                      <div className="h-6 bg-slate-200 rounded w-3/4"></div>
                      <div className="h-4 bg-slate-100 rounded w-full"></div>
                      <div className="h-4 bg-slate-100 rounded w-full"></div>
                      <div className="h-4 rounded w-full" style={{ backgroundColor: `${branding.primaryColor}40` }}></div>
                      <div className="h-4 bg-slate-100 rounded w-full"></div>
                    </div>
                  </div>
                  <div className="col-span-3 space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { title: 'Conversations', value: '156', color: branding.primaryColor },
                        { title: 'Students', value: '342', color: branding.secondaryColor },
                        { title: 'Attendance', value: '94%', color: branding.accentColor }
                      ].map((stat, i) => (
                        <div key={i} className="bg-white rounded-lg p-4 shadow-sm">
                          <div className={`w-2 h-2 rounded-full mb-2`} style={{ backgroundColor: stat.color }}></div>
                          <div className="text-2xl font-bold text-slate-800">{stat.value}</div>
                          <div className="text-sm text-slate-500">{stat.title}</div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                        <div className="h-6 rounded-full w-20" style={{ backgroundColor: `${branding.primaryColor}30` }}></div>
                      </div>
                      <div className="space-y-3">
                        {[1, 2, 3].map((_, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-full"></div>
                            <div className="flex-1">
                              <div className="h-3 bg-slate-200 rounded w-1/3 mb-1"></div>
                              <div className="h-2 bg-slate-100 rounded w-2/3"></div>
                            </div>
                            <div className="h-6 rounded w-16" style={{ backgroundColor: `${branding.primaryColor}20` }}></div>
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
      {branding.showFeatures && (
        <section id="features" className="py-20 px-4 bg-white">
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                Complete Solution for Your Institution
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Everything you need to manage your school, communicate with parents, and automate responses.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  title: branding.feature1Title,
                  description: branding.feature1Description,
                  icon: getIcon(branding.feature1Icon),
                  color: branding.primaryColor
                },
                {
                  title: branding.feature2Title,
                  description: branding.feature2Description,
                  icon: getIcon(branding.feature2Icon),
                  color: branding.secondaryColor
                },
                {
                  title: branding.feature3Title,
                  description: branding.feature3Description,
                  icon: getIcon(branding.feature3Icon),
                  color: branding.accentColor
                }
              ].map((feature, i) => (
                <Card key={i} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader>
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                      style={{ backgroundColor: `${feature.color}15` }}
                    >
                      <feature.icon className="w-6 h-6" style={{ color: feature.color }} />
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
      )}

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Transparent Pricing
            </h2>
            <p className="text-lg text-slate-600">Choose the plan that fits your institution</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: 'Starter',
                price: '299',
                period: '/month',
                description: 'Ideal for small academies',
                features: ['100 students', '3 users', '500 AI messages/day', '10 templates', 'Email support'],
                popular: false
              },
              {
                name: 'Professional',
                price: '799',
                period: '/month',
                description: 'For growing schools',
                features: ['500 students', '10 users', '2000 AI messages/day', '50 templates', 'Priority support', 'Advanced reports'],
                popular: true
              },
              {
                name: 'Enterprise',
                price: '1999',
                period: '/month',
                description: 'For large institutions',
                features: ['Unlimited students', 'Unlimited users', '10000 AI messages/day', 'Unlimited templates', 'Dedicated support', 'API access', 'Training included'],
                popular: false
              }
            ].map((plan, i) => (
              <Card
                key={i}
                className={`relative ${plan.popular ? 'border-2 shadow-xl' : 'border shadow-lg'}`}
                style={plan.popular ? { borderColor: branding.primaryColor } : {}}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge style={{ backgroundColor: branding.primaryColor }} className="text-white">Most Popular</Badge>
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
                        <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: branding.primaryColor }} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link href="/register" className="block">
                    <Button
                      className="w-full hover:opacity-90"
                      variant={plan.popular ? 'default' : 'outline'}
                      style={plan.popular ? {
                        background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})`
                      } : {}}
                    >
                      Get Started
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
                Why choose {branding.appName}?
              </h2>
              <div className="space-y-6">
                {[
                  { icon: Globe, title: 'Multi-Tenant', description: 'Each organization has its own isolated space with data, users, and configuration.' },
                  { icon: Shield, title: 'Advanced Security', description: 'Secure authentication, data encryption, and GDPR compliance.' },
                  { icon: Smartphone, title: 'No WhatsApp Business API', description: 'Connect your personal WhatsApp directly, without Business API fees.' },
                  { icon: BarChart3, title: 'Complete Analytics', description: 'Track conversations, response rates, attendance, and performance in real-time.' }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-6 h-6" style={{ color: branding.primaryColor }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
                      <p className="text-slate-300">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div
              className="rounded-2xl p-8 text-center"
              style={{ background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})` }}
            >
              <h3 className="text-2xl font-bold mb-4">Ready to start?</h3>
              <p className="mb-6 text-white/90">
                Join schools that trust {branding.appName} for their education management.
              </p>
              <Link href="/register">
                <Button size="lg" variant="secondary" className="bg-white hover:bg-slate-100" style={{ color: branding.primaryColor }}>
                  Create Free Account
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
                {branding.logo ? (
                  <img
                    src={branding.logo}
                    alt={branding.appName}
                    style={{ maxWidth: branding.logoWidth, maxHeight: 40 }}
                    className="rounded"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})` }}
                  >
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                )}
                <span className="text-xl font-bold text-white">{branding.appName}</span>
              </div>
              <p className="text-sm">{branding.tagline}</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#features" className="hover:text-white transition">Features</Link></li>
                <li><Link href="#pricing" className="hover:text-white transition">Pricing</Link></li>
                <li><Link href="#" className="hover:text-white transition">API</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white transition">Documentation</Link></li>
                <li><Link href="#" className="hover:text-white transition">Help Center</Link></li>
                <li><Link href="#" className="hover:text-white transition">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Contact</h4>
              <ul className="space-y-3 text-sm">
                {branding.contactEmail && (
                  <li className="flex items-center gap-2">
                    <Mail className="w-4 h-4" style={{ color: branding.primaryColor }} />
                    {branding.contactEmail}
                  </li>
                )}
                {branding.contactPhone && (
                  <li className="flex items-center gap-2">
                    <Phone className="w-4 h-4" style={{ color: branding.primaryColor }} />
                    {branding.contactPhone}
                  </li>
                )}
                <li className="flex gap-3 pt-2">
                  {branding.facebookUrl && (
                    <a href={branding.facebookUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                      <Facebook className="w-5 h-5" />
                    </a>
                  )}
                  {branding.twitterUrl && (
                    <a href={branding.twitterUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                      <Twitter className="w-5 h-5" />
                    </a>
                  )}
                  {branding.linkedinUrl && (
                    <a href={branding.linkedinUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                      <Linkedin className="w-5 h-5" />
                    </a>
                  )}
                  {branding.instagramUrl && (
                    <a href={branding.instagramUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                      <Instagram className="w-5 h-5" />
                    </a>
                  )}
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center text-sm">
            <p>{branding.footerText}</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <Link href="/privacy-policy" className="hover:text-white transition">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-white transition">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
