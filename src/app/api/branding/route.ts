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
    const body = await request.json();

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
          footerText, facebookUrl, twitterUrl, linkedinUrl, instagramUrl, contactEmail, contactPhone, customCss
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          nullIfUndefined(contactPhone), nullIfUndefined(customCss)
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
