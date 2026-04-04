'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Palette,
  Type,
  Image,
  Layout,
  Save,
  RotateCcw,
  Eye,
  Monitor,
  Smartphone,
  Loader2,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Star,
} from 'lucide-react';

interface BrandingSettings {
  id?: string;
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
  // Pricing fields
  showPricing: boolean;
  pricingTitle: string;
  pricingSubtitle: string;
  plan1Name: string;
  plan1Price: string;
  plan1Period: string;
  plan1Description: string;
  plan1Features: string;
  plan1Highlighted: boolean;
  plan1ButtonText: string;
  plan2Name: string;
  plan2Price: string;
  plan2Period: string;
  plan2Description: string;
  plan2Features: string;
  plan2Highlighted: boolean;
  plan2ButtonText: string;
  plan3Name: string;
  plan3Price: string;
  plan3Period: string;
  plan3Description: string;
  plan3Features: string;
  plan3Highlighted: boolean;
  plan3ButtonText: string;
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
  // Pricing defaults
  showPricing: true,
  pricingTitle: 'Transparent Pricing',
  pricingSubtitle: 'Choose the plan that fits your institution',
  plan1Name: 'Starter',
  plan1Price: '299',
  plan1Period: '/month',
  plan1Description: 'Ideal for small academies',
  plan1Features: '100 students|3 users|500 AI messages/day|10 templates|Email support',
  plan1Highlighted: false,
  plan1ButtonText: 'Get Started',
  plan2Name: 'Professional',
  plan2Price: '799',
  plan2Period: '/month',
  plan2Description: 'For growing schools',
  plan2Features: '500 students|10 users|2000 AI messages/day|50 templates|Priority support|Advanced reports',
  plan2Highlighted: true,
  plan2ButtonText: 'Get Started',
  plan3Name: 'Enterprise',
  plan3Price: '1999',
  plan3Period: '/month',
  plan3Description: 'For large institutions',
  plan3Features: 'Unlimited students|Unlimited users|10000 AI messages/day|Unlimited templates|Dedicated support|API access|Training included',
  plan3Highlighted: false,
  plan3ButtonText: 'Contact Sales',
};

export default function BrandingSettingsPage() {
  const [branding, setBranding] = useState<BrandingSettings>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  // Fetch branding settings
  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const response = await fetch('/api/branding');
        const data = await response.json();
        if (data.branding) {
          setBranding({
            ...DEFAULT_BRANDING,
            ...data.branding,
          });
        }
      } catch (err) {
        console.error('Failed to fetch branding:', err);
        setError('Failed to load branding settings');
      } finally {
        setLoading(false);
      }
    };
    fetchBranding();
  }, []);

  // Handle logo upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) {
        setError('Logo file must be less than 500KB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setBranding({ ...branding, logo: event.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle save
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const response = await fetch('/api/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(branding),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save branding');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save branding');
    } finally {
      setSaving(false);
    }
  };

  // Handle reset to defaults
  const handleReset = () => {
    if (confirm('Are you sure you want to reset all branding to default values?')) {
      setBranding(DEFAULT_BRANDING);
    }
  };

  // Update field helper
  const updateField = (field: keyof BrandingSettings, value: any) => {
    setBranding({ ...branding, [field]: value });
  };

  // Parse features for preview
  const parseFeatures = (features: string) => {
    return features.split('|').map(f => f.trim()).filter(f => f);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Branding Settings</h1>
          <p className="text-slate-600">Customize your landing page appearance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-green-500 to-emerald-600"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : saved ? (
              <CheckCircle className="w-4 h-4 mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Saved Alert */}
      {saved && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          Branding settings saved successfully!
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Settings Tabs */}
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="general">
              <Type className="w-4 h-4 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="colors">
              <Palette className="w-4 h-4 mr-2" />
              Colors
            </TabsTrigger>
            <TabsTrigger value="hero">
              <Layout className="w-4 h-4 mr-2" />
              Hero
            </TabsTrigger>
            <TabsTrigger value="pricing">
              <DollarSign className="w-4 h-4 mr-2" />
              Pricing
            </TabsTrigger>
            <TabsTrigger value="footer">
              <Image className="w-4 h-4 mr-2" />
              Footer
            </TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>General Branding</CardTitle>
                <CardDescription>Basic branding elements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Logo Upload */}
                <div className="space-y-2">
                  <Label>Logo</Label>
                  <div className="flex items-center gap-4">
                    {branding.logo ? (
                      <img
                        src={branding.logo}
                        alt="Logo"
                        style={{ maxWidth: branding.logoWidth || 40, maxHeight: 40 }}
                        className="rounded"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white font-bold">
                        {branding.appName?.charAt(0) || 'E'}
                      </div>
                    )}
                    <div>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="w-full"
                      />
                      <p className="text-xs text-slate-500 mt-1">Max 500KB, PNG or SVG recommended</p>
                    </div>
                  </div>
                </div>

                {/* Logo Width */}
                <div className="space-y-2">
                  <Label htmlFor="logoWidth">Logo Width (px)</Label>
                  <Input
                    id="logoWidth"
                    type="number"
                    value={branding.logoWidth}
                    onChange={(e) => updateField('logoWidth', parseInt(e.target.value) || 40)}
                    min={20}
                    max={200}
                  />
                </div>

                {/* App Name */}
                <div className="space-y-2">
                  <Label htmlFor="appName">Application Name</Label>
                  <Input
                    id="appName"
                    value={branding.appName}
                    onChange={(e) => updateField('appName', e.target.value)}
                    placeholder="EduSaaS"
                  />
                </div>

                {/* Tagline */}
                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input
                    id="tagline"
                    value={branding.tagline || ''}
                    onChange={(e) => updateField('tagline', e.target.value)}
                    placeholder="Education Management Platform"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Features Section */}
            <Card className="mt-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Features Section</CardTitle>
                    <CardDescription>Highlight your key features</CardDescription>
                  </div>
                  <Switch
                    checked={branding.showFeatures}
                    onCheckedChange={(checked) => updateField('showFeatures', checked)}
                  />
                </div>
              </CardHeader>
              {branding.showFeatures && (
                <CardContent className="space-y-6">
                  {/* Feature 1 */}
                  <div className="space-y-2 p-3 bg-slate-50 rounded-lg">
                    <Label>Feature 1</Label>
                    <Input
                      value={branding.feature1Title}
                      onChange={(e) => updateField('feature1Title', e.target.value)}
                      placeholder="Feature title"
                    />
                    <Textarea
                      value={branding.feature1Description}
                      onChange={(e) => updateField('feature1Description', e.target.value)}
                      placeholder="Feature description"
                      rows={2}
                    />
                  </div>

                  {/* Feature 2 */}
                  <div className="space-y-2 p-3 bg-slate-50 rounded-lg">
                    <Label>Feature 2</Label>
                    <Input
                      value={branding.feature2Title}
                      onChange={(e) => updateField('feature2Title', e.target.value)}
                      placeholder="Feature title"
                    />
                    <Textarea
                      value={branding.feature2Description}
                      onChange={(e) => updateField('feature2Description', e.target.value)}
                      placeholder="Feature description"
                      rows={2}
                    />
                  </div>

                  {/* Feature 3 */}
                  <div className="space-y-2 p-3 bg-slate-50 rounded-lg">
                    <Label>Feature 3</Label>
                    <Input
                      value={branding.feature3Title}
                      onChange={(e) => updateField('feature3Title', e.target.value)}
                      placeholder="Feature title"
                    />
                    <Textarea
                      value={branding.feature3Description}
                      onChange={(e) => updateField('feature3Description', e.target.value)}
                      placeholder="Feature description"
                      rows={2}
                    />
                  </div>
                </CardContent>
              )}
            </Card>
          </TabsContent>

          {/* Colors Tab */}
          <TabsContent value="colors">
            <Card>
              <CardHeader>
                <CardTitle>Color Scheme</CardTitle>
                <CardDescription>Customize your brand colors</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Primary</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={branding.primaryColor}
                        onChange={(e) => updateField('primaryColor', e.target.value)}
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={branding.primaryColor}
                        onChange={(e) => updateField('primaryColor', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secondaryColor">Secondary</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={branding.secondaryColor}
                        onChange={(e) => updateField('secondaryColor', e.target.value)}
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={branding.secondaryColor}
                        onChange={(e) => updateField('secondaryColor', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accentColor">Accent</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={branding.accentColor}
                        onChange={(e) => updateField('accentColor', e.target.value)}
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={branding.accentColor}
                        onChange={(e) => updateField('accentColor', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Custom CSS */}
                <div className="space-y-2 pt-4">
                  <Label htmlFor="customCss">Custom CSS (Advanced)</Label>
                  <Textarea
                    id="customCss"
                    value={branding.customCss || ''}
                    onChange={(e) => updateField('customCss', e.target.value)}
                    placeholder=".custom-class { color: red; }"
                    rows={4}
                    className="font-mono text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Hero Tab */}
          <TabsContent value="hero">
            <Card>
              <CardHeader>
                <CardTitle>Hero Section</CardTitle>
                <CardDescription>Main landing page banner</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="heroTitle">Title</Label>
                  <Input
                    id="heroTitle"
                    value={branding.heroTitle}
                    onChange={(e) => updateField('heroTitle', e.target.value)}
                    placeholder="Transform Your Educational Institution"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="heroSubtitle">Subtitle</Label>
                  <Textarea
                    id="heroSubtitle"
                    value={branding.heroSubtitle}
                    onChange={(e) => updateField('heroSubtitle', e.target.value)}
                    placeholder="Complete management solution..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="heroButtonText">Button Text</Label>
                    <Input
                      id="heroButtonText"
                      value={branding.heroButtonText}
                      onChange={(e) => updateField('heroButtonText', e.target.value)}
                      placeholder="Get Started"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="heroButtonLink">Button Link</Label>
                    <Input
                      id="heroButtonLink"
                      value={branding.heroButtonLink}
                      onChange={(e) => updateField('heroButtonLink', e.target.value)}
                      placeholder="/login"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="heroBackgroundGradient">Background Gradient</Label>
                  <Input
                    id="heroBackgroundGradient"
                    value={branding.heroBackgroundGradient}
                    onChange={(e) => updateField('heroBackgroundGradient', e.target.value)}
                    placeholder="from-green-600 to-emerald-700"
                  />
                  <p className="text-xs text-slate-500">Use Tailwind gradient classes</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pricing Tab */}
          <TabsContent value="pricing">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Pricing Section</CardTitle>
                    <CardDescription>Customize your pricing plans</CardDescription>
                  </div>
                  <Switch
                    checked={branding.showPricing}
                    onCheckedChange={(checked) => updateField('showPricing', checked)}
                  />
                </div>
              </CardHeader>
              {branding.showPricing && (
                <CardContent className="space-y-6">
                  {/* Pricing Header */}
                  <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-lg">
                    <div className="space-y-2">
                      <Label htmlFor="pricingTitle">Pricing Title</Label>
                      <Input
                        id="pricingTitle"
                        value={branding.pricingTitle}
                        onChange={(e) => updateField('pricingTitle', e.target.value)}
                        placeholder="Transparent Pricing"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pricingSubtitle">Pricing Subtitle</Label>
                      <Input
                        id="pricingSubtitle"
                        value={branding.pricingSubtitle}
                        onChange={(e) => updateField('pricingSubtitle', e.target.value)}
                        placeholder="Choose the plan that fits your institution"
                      />
                    </div>
                  </div>

                  {/* Plan 1 */}
                  <div className="space-y-3 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Plan 1</Badge>
                        <span className="font-medium">{branding.plan1Name}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Name</Label>
                        <Input
                          value={branding.plan1Name}
                          onChange={(e) => updateField('plan1Name', e.target.value)}
                          placeholder="Starter"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Price</Label>
                        <Input
                          value={branding.plan1Price}
                          onChange={(e) => updateField('plan1Price', e.target.value)}
                          placeholder="299"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Period</Label>
                        <Input
                          value={branding.plan1Period}
                          onChange={(e) => updateField('plan1Period', e.target.value)}
                          placeholder="/month"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Button Text</Label>
                        <Input
                          value={branding.plan1ButtonText}
                          onChange={(e) => updateField('plan1ButtonText', e.target.value)}
                          placeholder="Get Started"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Description</Label>
                      <Input
                        value={branding.plan1Description}
                        onChange={(e) => updateField('plan1Description', e.target.value)}
                        placeholder="Ideal for small academies"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Features (separate with |)</Label>
                      <Textarea
                        value={branding.plan1Features}
                        onChange={(e) => updateField('plan1Features', e.target.value)}
                        placeholder="100 students|3 users|500 AI messages/day"
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* Plan 2 */}
                  <div className="space-y-3 p-4 border-2 rounded-lg" style={{ borderColor: branding.primaryColor }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge style={{ backgroundColor: branding.primaryColor }}>Plan 2</Badge>
                        <span className="font-medium">{branding.plan2Name}</span>
                        {branding.plan2Highlighted && (
                          <Badge variant="secondary" className="ml-2">
                            <Star className="w-3 h-3 mr-1" />
                            Popular
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Highlight</Label>
                        <Switch
                          checked={branding.plan2Highlighted}
                          onCheckedChange={(checked) => updateField('plan2Highlighted', checked)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Name</Label>
                        <Input
                          value={branding.plan2Name}
                          onChange={(e) => updateField('plan2Name', e.target.value)}
                          placeholder="Professional"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Price</Label>
                        <Input
                          value={branding.plan2Price}
                          onChange={(e) => updateField('plan2Price', e.target.value)}
                          placeholder="799"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Period</Label>
                        <Input
                          value={branding.plan2Period}
                          onChange={(e) => updateField('plan2Period', e.target.value)}
                          placeholder="/month"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Button Text</Label>
                        <Input
                          value={branding.plan2ButtonText}
                          onChange={(e) => updateField('plan2ButtonText', e.target.value)}
                          placeholder="Get Started"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Description</Label>
                      <Input
                        value={branding.plan2Description}
                        onChange={(e) => updateField('plan2Description', e.target.value)}
                        placeholder="For growing schools"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Features (separate with |)</Label>
                      <Textarea
                        value={branding.plan2Features}
                        onChange={(e) => updateField('plan2Features', e.target.value)}
                        placeholder="500 students|10 users|2000 AI messages/day"
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* Plan 3 */}
                  <div className="space-y-3 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Plan 3</Badge>
                        <span className="font-medium">{branding.plan3Name}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Name</Label>
                        <Input
                          value={branding.plan3Name}
                          onChange={(e) => updateField('plan3Name', e.target.value)}
                          placeholder="Enterprise"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Price</Label>
                        <Input
                          value={branding.plan3Price}
                          onChange={(e) => updateField('plan3Price', e.target.value)}
                          placeholder="1999"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Period</Label>
                        <Input
                          value={branding.plan3Period}
                          onChange={(e) => updateField('plan3Period', e.target.value)}
                          placeholder="/month"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Button Text</Label>
                        <Input
                          value={branding.plan3ButtonText}
                          onChange={(e) => updateField('plan3ButtonText', e.target.value)}
                          placeholder="Contact Sales"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Description</Label>
                      <Input
                        value={branding.plan3Description}
                        onChange={(e) => updateField('plan3Description', e.target.value)}
                        placeholder="For large institutions"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Features (separate with |)</Label>
                      <Textarea
                        value={branding.plan3Features}
                        onChange={(e) => updateField('plan3Features', e.target.value)}
                        placeholder="Unlimited students|Unlimited users|10000 AI messages/day"
                        rows={2}
                      />
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </TabsContent>

          {/* Footer Tab */}
          <TabsContent value="footer">
            <Card>
              <CardHeader>
                <CardTitle>Footer Settings</CardTitle>
                <CardDescription>Footer content and social links</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="footerText">Footer Text</Label>
                  <Input
                    id="footerText"
                    value={branding.footerText}
                    onChange={(e) => updateField('footerText', e.target.value)}
                    placeholder="© 2026 EduSaaS. All rights reserved."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">Contact Email</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={branding.contactEmail || ''}
                      onChange={(e) => updateField('contactEmail', e.target.value)}
                      placeholder="contact@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactPhone">Contact Phone</Label>
                    <Input
                      id="contactPhone"
                      value={branding.contactPhone || ''}
                      onChange={(e) => updateField('contactPhone', e.target.value)}
                      placeholder="+1 234 567 890"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="facebookUrl">Facebook URL</Label>
                    <Input
                      id="facebookUrl"
                      value={branding.facebookUrl || ''}
                      onChange={(e) => updateField('facebookUrl', e.target.value)}
                      placeholder="https://facebook.com/..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="twitterUrl">Twitter URL</Label>
                    <Input
                      id="twitterUrl"
                      value={branding.twitterUrl || ''}
                      onChange={(e) => updateField('twitterUrl', e.target.value)}
                      placeholder="https://twitter.com/..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                    <Input
                      id="linkedinUrl"
                      value={branding.linkedinUrl || ''}
                      onChange={(e) => updateField('linkedinUrl', e.target.value)}
                      placeholder="https://linkedin.com/..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instagramUrl">Instagram URL</Label>
                    <Input
                      id="instagramUrl"
                      value={branding.instagramUrl || ''}
                      onChange={(e) => updateField('instagramUrl', e.target.value)}
                      placeholder="https://instagram.com/..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Live Preview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Live Preview</h2>
            <div className="flex gap-2">
              <Button
                variant={previewMode === 'desktop' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreviewMode('desktop')}
              >
                <Monitor className="w-4 h-4" />
              </Button>
              <Button
                variant={previewMode === 'mobile' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreviewMode('mobile')}
              >
                <Smartphone className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Card className="overflow-hidden">
            <div
              className={`mx-auto bg-white border transition-all ${
                previewMode === 'mobile' ? 'max-w-[375px]' : 'w-full'
              }`}
            >
              {/* Hero Preview */}
              <div
                className={`bg-gradient-to-r ${branding.heroBackgroundGradient} text-white p-8 text-center`}
              >
                <div className="flex items-center justify-center gap-2 mb-4">
                  {branding.logo ? (
                    <img
                      src={branding.logo}
                      alt="Logo"
                      style={{ maxWidth: branding.logoWidth || 40, maxHeight: 40 }}
                    />
                  ) : (
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-xl font-bold">
                      {branding.appName?.charAt(0) || 'E'}
                    </div>
                  )}
                  <span className="text-xl font-bold">{branding.appName}</span>
                </div>
                <h1 className="text-2xl font-bold mb-2">{branding.heroTitle}</h1>
                <p className="text-sm opacity-90 mb-4">{branding.heroSubtitle}</p>
                <button
                  className="bg-white text-gray-900 px-6 py-2 rounded-lg font-medium text-sm"
                  style={{ backgroundColor: 'white', color: branding.primaryColor }}
                >
                  {branding.heroButtonText}
                </button>
              </div>

              {/* Features Preview */}
              {branding.showFeatures && (
                <div className="p-6 bg-slate-50">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                      <div
                        className="w-8 h-8 mx-auto mb-2 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: branding.primaryColor + '20' }}
                      >
                        <span style={{ color: branding.primaryColor }}>📚</span>
                      </div>
                      <h3 className="text-xs font-semibold">{branding.feature1Title}</h3>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                      <div
                        className="w-8 h-8 mx-auto mb-2 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: branding.secondaryColor + '20' }}
                      >
                        <span style={{ color: branding.secondaryColor }}>💬</span>
                      </div>
                      <h3 className="text-xs font-semibold">{branding.feature2Title}</h3>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                      <div
                        className="w-8 h-8 mx-auto mb-2 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: branding.accentColor + '20' }}
                      >
                        <span style={{ color: branding.accentColor }}>📊</span>
                      </div>
                      <h3 className="text-xs font-semibold">{branding.feature3Title}</h3>
                    </div>
                  </div>
                </div>
              )}

              {/* Pricing Preview */}
              {branding.showPricing && (
                <div className="p-4 bg-white">
                  <h3 className="text-center font-bold mb-1">{branding.pricingTitle}</h3>
                  <p className="text-center text-xs text-slate-500 mb-4">{branding.pricingSubtitle}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {/* Plan 1 */}
                    <div className="text-center p-2 border rounded-lg">
                      <h4 className="text-xs font-semibold">{branding.plan1Name}</h4>
                      <div className="text-sm font-bold" style={{ color: branding.primaryColor }}>
                        {branding.plan1Price}
                      </div>
                      <p className="text-[10px] text-slate-500">{branding.plan1Period}</p>
                    </div>
                    {/* Plan 2 */}
                    <div className="text-center p-2 border-2 rounded-lg relative" style={{ borderColor: branding.primaryColor }}>
                      {branding.plan2Highlighted && (
                        <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px]" style={{ backgroundColor: branding.primaryColor }}>
                          Popular
                        </Badge>
                      )}
                      <h4 className="text-xs font-semibold">{branding.plan2Name}</h4>
                      <div className="text-sm font-bold" style={{ color: branding.primaryColor }}>
                        {branding.plan2Price}
                      </div>
                      <p className="text-[10px] text-slate-500">{branding.plan2Period}</p>
                    </div>
                    {/* Plan 3 */}
                    <div className="text-center p-2 border rounded-lg">
                      <h4 className="text-xs font-semibold">{branding.plan3Name}</h4>
                      <div className="text-sm font-bold" style={{ color: branding.primaryColor }}>
                        {branding.plan3Price}
                      </div>
                      <p className="text-[10px] text-slate-500">{branding.plan3Period}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer Preview */}
              <div className="p-4 bg-slate-900 text-white text-center">
                <p className="text-xs text-slate-400">{branding.footerText}</p>
              </div>
            </div>
          </Card>

          <p className="text-sm text-slate-500 text-center">
            <Eye className="w-4 h-4 inline mr-1" />
            Preview is approximate. View the actual page to see exact rendering.
          </p>
        </div>
      </div>
    </div>
  );
}
