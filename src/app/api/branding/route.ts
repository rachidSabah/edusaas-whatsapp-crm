export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getDbContext } from '@/lib/db-hybrid';

interface BrandingSettings {
  id: string;
  organizationId: string;
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
  showFeatures: number;
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
  showPricing: number;
  pricingTitle: string;
  pricingSubtitle: string;
  plan1Name: string;
  plan1Price: string;
  plan1Period: string;
  plan1Description: string;
  plan1Features: string;
  plan1Highlighted: number;
  plan1ButtonText: string;
  plan2Name: string;
  plan2Price: string;
  plan2Period: string;
  plan2Description: string;
  plan2Features: string;
  plan2Highlighted: number;
  plan2ButtonText: string;
  plan3Name: string;
  plan3Price: string;
  plan3Period: string;
  plan3Description: string;
  plan3Features: string;
  plan3Highlighted: number;
  plan3ButtonText: string;
  createdAt: string;
  updatedAt: string;
}

// Helper to convert undefined to null for D1 compatibility
function nullIfUndefined(value: any): any {
  return value === undefined ? null : value;
}

// Default branding fallback
const DEFAULT_BRANDING: Partial<BrandingSettings> = {
  appName: 'EduSaaS',
  tagline: 'Education Management Platform',
  primaryColor: '#10b981',
  secondaryColor: '#6366f1',
  accentColor: '#f59e0b',
  heroTitle: 'Transform Your Educational Institution',
  heroSubtitle: 'Complete management solution for schools, training centers, and educational organizations',
  heroButtonText: 'Get Started',
  heroButtonLink: '/login',
  heroBackgroundGradient: 'from-green-600 to-emerald-700',
  showFeatures: 1,
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
  logoWidth: 40,
  // Pricing defaults
  showPricing: 1,
  pricingTitle: 'Transparent Pricing',
  pricingSubtitle: 'Choose the plan that fits your institution',
  plan1Name: 'Starter',
  plan1Price: '299',
  plan1Period: '/month',
  plan1Description: 'Ideal for small academies',
  plan1Features: '100 students|3 users|500 AI messages/day|10 templates|Email support',
  plan1Highlighted: 0,
  plan1ButtonText: 'Get Started',
  plan2Name: 'Professional',
  plan2Price: '799',
  plan2Period: '/month',
  plan2Description: 'For growing schools',
  plan2Features: '500 students|10 users|2000 AI messages/day|50 templates|Priority support|Advanced reports',
  plan2Highlighted: 1,
  plan2ButtonText: 'Get Started',
  plan3Name: 'Enterprise',
  plan3Price: '1999',
  plan3Period: '/month',
  plan3Description: 'For large institutions',
  plan3Features: 'Unlimited students|Unlimited users|10000 AI messages/day|Unlimited templates|Dedicated support|API access|Training included',
  plan3Highlighted: 0,
  plan3ButtonText: 'Contact Sales',
};

/**
 * GET /api/branding
 * Public endpoint - returns branding for the first organization (or specific org)
 */
export async function GET(request: NextRequest) {
  try {
    const db = getDbContext();
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    let branding: BrandingSettings | null = null;

    if (organizationId) {
      // Get branding for specific organization
      const results = await db.query<BrandingSettings>(
        `SELECT * FROM branding_settings WHERE organizationId = ?`,
        [organizationId]
      );
      branding = results[0] || null;
    } else {
      // Get first branding (for public landing page)
      const results = await db.query<BrandingSettings>(
        `SELECT * FROM branding_settings LIMIT 1`
      );
      branding = results[0] || null;
    }

    if (!branding) {
      // Return default branding if none exists
      return NextResponse.json({
        branding: DEFAULT_BRANDING,
        isDefault: true,
      }, {
        headers: {
          'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        },
      });
    }

    return NextResponse.json({
      branding: {
        ...branding,
        showFeatures: branding.showFeatures === 1,
        showPricing: branding.showPricing === 1,
        plan1Highlighted: branding.plan1Highlighted === 1,
        plan2Highlighted: branding.plan2Highlighted === 1,
        plan3Highlighted: branding.plan3Highlighted === 1,
      },
      isDefault: false,
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    });
  } catch (error) {
    console.error('Get branding error:', error);
    // Return default branding on error
    return NextResponse.json({
      branding: DEFAULT_BRANDING,
      isDefault: true,
      error: 'Failed to load branding',
    });
  }
}

/**
 * PUT /api/branding
 * Protected endpoint - updates branding for the user's organization
 */
export async function PUT(request: NextRequest) {
  try {
    // Import auth dynamically to avoid edge runtime issues
    const { requireAuth } = await import('@/lib/auth-hybrid');
    const user = await requireAuth();

    if (!user.organizationId) {
      return NextResponse.json(
        { error: 'No organization associated' },
        { status: 400 }
      );
    }

    // Check if user has permission (SUPER_ADMIN, ORG_ADMIN, or SCHOOL_MANAGER)
    const allowedRoles = ['SUPER_ADMIN', 'ORG_ADMIN', 'SCHOOL_MANAGER'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized - Insufficient permissions' },
        { status: 403 }
      );
    }

    const db = getDbContext();
    const body = await request.json() as Partial<BrandingSettings>;

    // Extract branding fields
    const {
      logo,
      logoWidth,
      appName,
      tagline,
      primaryColor,
      secondaryColor,
      accentColor,
      heroTitle,
      heroSubtitle,
      heroButtonText,
      heroButtonLink,
      heroBackgroundImage,
      heroBackgroundGradient,
      showFeatures,
      feature1Title,
      feature1Description,
      feature1Icon,
      feature2Title,
      feature2Description,
      feature2Icon,
      feature3Title,
      feature3Description,
      feature3Icon,
      footerText,
      facebookUrl,
      twitterUrl,
      linkedinUrl,
      instagramUrl,
      contactEmail,
      contactPhone,
      customCss,
      // Pricing fields
      showPricing,
      pricingTitle,
      pricingSubtitle,
      plan1Name,
      plan1Price,
      plan1Period,
      plan1Description,
      plan1Features,
      plan1Highlighted,
      plan1ButtonText,
      plan2Name,
      plan2Price,
      plan2Period,
      plan2Description,
      plan2Features,
      plan2Highlighted,
      plan2ButtonText,
      plan3Name,
      plan3Price,
      plan3Period,
      plan3Description,
      plan3Features,
      plan3Highlighted,
      plan3ButtonText,
    } = body;

    // Check if branding exists for this organization
    const existing = await db.query<{ id: string }>(
      `SELECT id FROM branding_settings WHERE organizationId = ?`,
      [user.organizationId]
    );

    if (existing.length > 0) {
      // Update existing branding
      await db.execute(
        `UPDATE branding_settings SET
          logo = COALESCE(?, logo),
          logoWidth = COALESCE(?, logoWidth),
          appName = COALESCE(?, appName),
          tagline = COALESCE(?, tagline),
          primaryColor = COALESCE(?, primaryColor),
          secondaryColor = COALESCE(?, secondaryColor),
          accentColor = COALESCE(?, accentColor),
          heroTitle = COALESCE(?, heroTitle),
          heroSubtitle = COALESCE(?, heroSubtitle),
          heroButtonText = COALESCE(?, heroButtonText),
          heroButtonLink = COALESCE(?, heroButtonLink),
          heroBackgroundImage = COALESCE(?, heroBackgroundImage),
          heroBackgroundGradient = COALESCE(?, heroBackgroundGradient),
          showFeatures = COALESCE(?, showFeatures),
          feature1Title = COALESCE(?, feature1Title),
          feature1Description = COALESCE(?, feature1Description),
          feature1Icon = COALESCE(?, feature1Icon),
          feature2Title = COALESCE(?, feature2Title),
          feature2Description = COALESCE(?, feature2Description),
          feature2Icon = COALESCE(?, feature2Icon),
          feature3Title = COALESCE(?, feature3Title),
          feature3Description = COALESCE(?, feature3Description),
          feature3Icon = COALESCE(?, feature3Icon),
          footerText = COALESCE(?, footerText),
          facebookUrl = COALESCE(?, facebookUrl),
          twitterUrl = COALESCE(?, twitterUrl),
          linkedinUrl = COALESCE(?, linkedinUrl),
          instagramUrl = COALESCE(?, instagramUrl),
          contactEmail = COALESCE(?, contactEmail),
          contactPhone = COALESCE(?, contactPhone),
          customCss = COALESCE(?, customCss),
          showPricing = COALESCE(?, showPricing),
          pricingTitle = COALESCE(?, pricingTitle),
          pricingSubtitle = COALESCE(?, pricingSubtitle),
          plan1Name = COALESCE(?, plan1Name),
          plan1Price = COALESCE(?, plan1Price),
          plan1Period = COALESCE(?, plan1Period),
          plan1Description = COALESCE(?, plan1Description),
          plan1Features = COALESCE(?, plan1Features),
          plan1Highlighted = COALESCE(?, plan1Highlighted),
          plan1ButtonText = COALESCE(?, plan1ButtonText),
          plan2Name = COALESCE(?, plan2Name),
          plan2Price = COALESCE(?, plan2Price),
          plan2Period = COALESCE(?, plan2Period),
          plan2Description = COALESCE(?, plan2Description),
          plan2Features = COALESCE(?, plan2Features),
          plan2Highlighted = COALESCE(?, plan2Highlighted),
          plan2ButtonText = COALESCE(?, plan2ButtonText),
          plan3Name = COALESCE(?, plan3Name),
          plan3Price = COALESCE(?, plan3Price),
          plan3Period = COALESCE(?, plan3Period),
          plan3Description = COALESCE(?, plan3Description),
          plan3Features = COALESCE(?, plan3Features),
          plan3Highlighted = COALESCE(?, plan3Highlighted),
          plan3ButtonText = COALESCE(?, plan3ButtonText),
          updatedAt = CURRENT_TIMESTAMP
        WHERE organizationId = ?`,
        [
          nullIfUndefined(logo), nullIfUndefined(logoWidth), nullIfUndefined(appName), nullIfUndefined(tagline), 
          nullIfUndefined(primaryColor), nullIfUndefined(secondaryColor), nullIfUndefined(accentColor),
          nullIfUndefined(heroTitle), nullIfUndefined(heroSubtitle), nullIfUndefined(heroButtonText), 
          nullIfUndefined(heroButtonLink), nullIfUndefined(heroBackgroundImage), nullIfUndefined(heroBackgroundGradient),
          showFeatures ? 1 : 0,
          nullIfUndefined(feature1Title), nullIfUndefined(feature1Description), nullIfUndefined(feature1Icon),
          nullIfUndefined(feature2Title), nullIfUndefined(feature2Description), nullIfUndefined(feature2Icon),
          nullIfUndefined(feature3Title), nullIfUndefined(feature3Description), nullIfUndefined(feature3Icon),
          nullIfUndefined(footerText), nullIfUndefined(facebookUrl), nullIfUndefined(twitterUrl), 
          nullIfUndefined(linkedinUrl), nullIfUndefined(instagramUrl), nullIfUndefined(contactEmail), 
          nullIfUndefined(contactPhone), nullIfUndefined(customCss),
          // Pricing fields
          showPricing ? 1 : 0,
          nullIfUndefined(pricingTitle), nullIfUndefined(pricingSubtitle),
          nullIfUndefined(plan1Name), nullIfUndefined(plan1Price), nullIfUndefined(plan1Period),
          nullIfUndefined(plan1Description), nullIfUndefined(plan1Features), plan1Highlighted ? 1 : 0,
          nullIfUndefined(plan1ButtonText),
          nullIfUndefined(plan2Name), nullIfUndefined(plan2Price), nullIfUndefined(plan2Period),
          nullIfUndefined(plan2Description), nullIfUndefined(plan2Features), plan2Highlighted ? 1 : 0,
          nullIfUndefined(plan2ButtonText),
          nullIfUndefined(plan3Name), nullIfUndefined(plan3Price), nullIfUndefined(plan3Period),
          nullIfUndefined(plan3Description), nullIfUndefined(plan3Features), plan3Highlighted ? 1 : 0,
          nullIfUndefined(plan3ButtonText),
          user.organizationId
        ]
      );
    } else {
      // Create new branding
      const id = `branding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await db.execute(
        `INSERT INTO branding_settings (
          id, organizationId, logo, logoWidth, appName, tagline, primaryColor, secondaryColor, accentColor,
          heroTitle, heroSubtitle, heroButtonText, heroButtonLink, heroBackgroundImage, heroBackgroundGradient,
          showFeatures, feature1Title, feature1Description, feature1Icon,
          feature2Title, feature2Description, feature2Icon,
          feature3Title, feature3Description, feature3Icon,
          footerText, facebookUrl, twitterUrl, linkedinUrl, instagramUrl, contactEmail, contactPhone, customCss,
          showPricing, pricingTitle, pricingSubtitle,
          plan1Name, plan1Price, plan1Period, plan1Description, plan1Features, plan1Highlighted, plan1ButtonText,
          plan2Name, plan2Price, plan2Period, plan2Description, plan2Features, plan2Highlighted, plan2ButtonText,
          plan3Name, plan3Price, plan3Period, plan3Description, plan3Features, plan3Highlighted, plan3ButtonText
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, user.organizationId, nullIfUndefined(logo), nullIfUndefined(logoWidth) || 40, 
          nullIfUndefined(appName), nullIfUndefined(tagline), nullIfUndefined(primaryColor), 
          nullIfUndefined(secondaryColor), nullIfUndefined(accentColor),
          nullIfUndefined(heroTitle), nullIfUndefined(heroSubtitle), nullIfUndefined(heroButtonText), 
          nullIfUndefined(heroButtonLink), nullIfUndefined(heroBackgroundImage), nullIfUndefined(heroBackgroundGradient),
          showFeatures ? 1 : 1,
          nullIfUndefined(feature1Title), nullIfUndefined(feature1Description), nullIfUndefined(feature1Icon),
          nullIfUndefined(feature2Title), nullIfUndefined(feature2Description), nullIfUndefined(feature2Icon),
          nullIfUndefined(feature3Title), nullIfUndefined(feature3Description), nullIfUndefined(feature3Icon),
          nullIfUndefined(footerText), nullIfUndefined(facebookUrl), nullIfUndefined(twitterUrl), 
          nullIfUndefined(linkedinUrl), nullIfUndefined(instagramUrl), nullIfUndefined(contactEmail), 
          nullIfUndefined(contactPhone), nullIfUndefined(customCss),
          // Pricing fields
          showPricing ? 1 : 1,
          nullIfUndefined(pricingTitle) || 'Transparent Pricing',
          nullIfUndefined(pricingSubtitle) || 'Choose the plan that fits your institution',
          nullIfUndefined(plan1Name) || 'Starter',
          nullIfUndefined(plan1Price) || '299',
          nullIfUndefined(plan1Period) || '/month',
          nullIfUndefined(plan1Description) || 'Ideal for small academies',
          nullIfUndefined(plan1Features) || '100 students|3 users|500 AI messages/day',
          plan1Highlighted ? 1 : 0,
          nullIfUndefined(plan1ButtonText) || 'Get Started',
          nullIfUndefined(plan2Name) || 'Professional',
          nullIfUndefined(plan2Price) || '799',
          nullIfUndefined(plan2Period) || '/month',
          nullIfUndefined(plan2Description) || 'For growing schools',
          nullIfUndefined(plan2Features) || '500 students|10 users|2000 AI messages/day',
          plan2Highlighted ? 1 : 1,
          nullIfUndefined(plan2ButtonText) || 'Get Started',
          nullIfUndefined(plan3Name) || 'Enterprise',
          nullIfUndefined(plan3Price) || '1999',
          nullIfUndefined(plan3Period) || '/month',
          nullIfUndefined(plan3Description) || 'For large institutions',
          nullIfUndefined(plan3Features) || 'Unlimited students|Unlimited users|API access',
          plan3Highlighted ? 1 : 0,
          nullIfUndefined(plan3ButtonText) || 'Contact Sales'
        ]
      );
    }

    // Fetch updated branding
    const results = await db.query<BrandingSettings>(
      `SELECT * FROM branding_settings WHERE organizationId = ?`,
      [user.organizationId]
    );

    return NextResponse.json({
      success: true,
      branding: {
        ...results[0],
        showFeatures: results[0].showFeatures === 1,
        showPricing: results[0].showPricing === 1,
        plan1Highlighted: results[0].plan1Highlighted === 1,
        plan2Highlighted: results[0].plan2Highlighted === 1,
        plan3Highlighted: results[0].plan3Highlighted === 1,
      },
    });
  } catch (error) {
    console.error('Update branding error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
