-- Branding Settings Table
-- Stores customization for landing page per organization

CREATE TABLE IF NOT EXISTS branding_settings (
  id TEXT PRIMARY KEY,
  organizationId TEXT UNIQUE NOT NULL,
  
  -- Logo & Branding
  logo TEXT,
  logoWidth INTEGER DEFAULT 40,
  appName TEXT DEFAULT 'EduSaaS',
  tagline TEXT DEFAULT 'Education Management Platform',
  
  -- Colors
  primaryColor TEXT DEFAULT '#10b981',
  secondaryColor TEXT DEFAULT '#6366f1',
  accentColor TEXT DEFAULT '#f59e0b',
  
  -- Hero Section
  heroTitle TEXT DEFAULT 'Transform Your Educational Institution',
  heroSubtitle TEXT DEFAULT 'Complete management solution for schools, training centers, and educational organizations',
  heroButtonText TEXT DEFAULT 'Get Started',
  heroButtonLink TEXT DEFAULT '/login',
  heroBackgroundImage TEXT,
  heroBackgroundGradient TEXT DEFAULT 'from-green-600 to-emerald-700',
  
  -- Features Section
  showFeatures INTEGER DEFAULT 1,
  feature1Title TEXT DEFAULT 'Student Management',
  feature1Description TEXT DEFAULT 'Complete student lifecycle management from enrollment to graduation',
  feature1Icon TEXT DEFAULT 'GraduationCap',
  feature2Title TEXT DEFAULT 'Communication Hub',
  feature2Description TEXT DEFAULT 'Integrated WhatsApp and email communication tools',
  feature2Icon TEXT DEFAULT 'MessageSquare',
  feature3Title TEXT DEFAULT 'Analytics & Reports',
  feature3Description TEXT DEFAULT 'Comprehensive reporting and analytics dashboard',
  feature3Icon TEXT DEFAULT 'BarChart3',
  
  -- Footer Section
  footerText TEXT DEFAULT '© 2026 EduSaaS. All rights reserved.',
  facebookUrl TEXT,
  twitterUrl TEXT,
  linkedinUrl TEXT,
  instagramUrl TEXT,
  contactEmail TEXT,
  contactPhone TEXT,
  
  -- Custom CSS
  customCss TEXT,
  
  -- Metadata
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Insert default branding for existing organization
INSERT OR IGNORE INTO branding_settings (
  id, organizationId, appName, heroTitle, heroSubtitle
) VALUES (
  'branding_default',
  'org_1773318948848_gbk3n5e8d',
  'EduSaaS',
  'Transform Your Educational Institution',
  'Complete management solution for schools, training centers, and educational organizations'
);
