export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-hybrid';
import { getDbContext } from '@/lib/db-hybrid';
import { DEFAULT_AI_CONFIG, type AIConfig } from './constants';

interface AIConfigRecord {
  id: string;
  organizationId: string;
  systemInstructions: string;
  responseTone: string;
  language: string;
  knowledgeBaseEnabled: number;
  autoReplyEnabled: number;
  autoReplyCategories: string;
  maxResponseLength: number;
  includeSignature: number;
  signatureText: string;
  createdAt: string;
  updatedAt: string;
}

// SQL to create ai_config table if it doesn't exist
const CREATE_AI_CONFIG_TABLE = `
  CREATE TABLE IF NOT EXISTS ai_config (
    id TEXT PRIMARY KEY,
    organizationId TEXT NOT NULL,
    systemInstructions TEXT,
    responseTone TEXT DEFAULT 'professional',
    language TEXT DEFAULT 'auto',
    knowledgeBaseEnabled INTEGER DEFAULT 1,
    autoReplyEnabled INTEGER DEFAULT 1,
    autoReplyCategories TEXT DEFAULT '["GENERAL", "SCHEDULE", "PRICING", "ENROLLMENT"]',
    maxResponseLength INTEGER DEFAULT 500,
    includeSignature INTEGER DEFAULT 1,
    signatureText TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organizationId)
  )
`;

// Helper function to ensure ai_config table exists
async function ensureTableExists(db: ReturnType<typeof getDbContext>) {
  try {
    await db.execute(CREATE_AI_CONFIG_TABLE);
  } catch (error) {
    console.error('Error creating ai_config table:', error);
    // Table might already exist, ignore error
  }
}

// Get AI configuration for organization
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({
        config: DEFAULT_AI_CONFIG,
        message: 'Aucune organisation associée. Configuration par défaut utilisée.',
      });
    }

    // Ensure table exists
    await ensureTableExists(db);

    // Try to get existing config
    const configs = await db.query<AIConfigRecord>(
      `SELECT * FROM ai_config WHERE organizationId = ?`,
      [user.organizationId]
    );

    if (configs.length === 0) {
      // Return default config if none exists
      return NextResponse.json({
        config: DEFAULT_AI_CONFIG,
        isNew: true,
      });
    }

    const record = configs[0];
    const config: AIConfig = {
      systemInstructions: record.systemInstructions || DEFAULT_AI_CONFIG.systemInstructions,
      responseTone: (record.responseTone as AIConfig['responseTone']) || DEFAULT_AI_CONFIG.responseTone,
      language: (record.language as AIConfig['language']) || DEFAULT_AI_CONFIG.language,
      knowledgeBaseEnabled: record.knowledgeBaseEnabled === 1,
      autoReplyEnabled: record.autoReplyEnabled === 1,
      autoReplyCategories: record.autoReplyCategories ? JSON.parse(record.autoReplyCategories) : DEFAULT_AI_CONFIG.autoReplyCategories,
      maxResponseLength: record.maxResponseLength || DEFAULT_AI_CONFIG.maxResponseLength,
      includeSignature: record.includeSignature === 1,
      signatureText: record.signatureText || DEFAULT_AI_CONFIG.signatureText,
    };

    return NextResponse.json({ config });
  } catch (error) {
    console.error('Get AI config error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Non autorisé', message: 'Veuillez vous connecter pour accéder à cette ressource.' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: 'Erreur interne du serveur', message: 'Une erreur inattendue s\'est produite.' },
      { status: 500 }
    );
  }
}

// Create or update AI configuration
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json(
        { error: 'Aucune organisation associée', message: 'Veuillez contacter l\'administrateur pour rejoindre une organisation.' },
        { status: 400 }
      );
    }

    // Ensure table exists
    await ensureTableExists(db);

    const body = await request.json() as Partial<AIConfig>;
    const config = body;

    // Check if config already exists
    const existing = await db.query<{ id: string }>(
      `SELECT id FROM ai_config WHERE organizationId = ?`,
      [user.organizationId]
    );

    const configId = existing.length > 0 
      ? existing[0].id 
      : `ai_config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const systemInstructions = config.systemInstructions || DEFAULT_AI_CONFIG.systemInstructions;
    const responseTone = config.responseTone || DEFAULT_AI_CONFIG.responseTone;
    const language = config.language || DEFAULT_AI_CONFIG.language;
    const knowledgeBaseEnabled = config.knowledgeBaseEnabled !== undefined ? (config.knowledgeBaseEnabled ? 1 : 0) : 1;
    const autoReplyEnabled = config.autoReplyEnabled !== undefined ? (config.autoReplyEnabled ? 1 : 0) : 1;
    const autoReplyCategories = JSON.stringify(config.autoReplyCategories || DEFAULT_AI_CONFIG.autoReplyCategories);
    const maxResponseLength = config.maxResponseLength || DEFAULT_AI_CONFIG.maxResponseLength;
    const includeSignature = config.includeSignature !== undefined ? (config.includeSignature ? 1 : 0) : 1;
    const signatureText = config.signatureText || DEFAULT_AI_CONFIG.signatureText;

    if (existing.length > 0) {
      // Update existing config
      await db.execute(
        `UPDATE ai_config SET 
          systemInstructions = ?,
          responseTone = ?,
          language = ?,
          knowledgeBaseEnabled = ?,
          autoReplyEnabled = ?,
          autoReplyCategories = ?,
          maxResponseLength = ?,
          includeSignature = ?,
          signatureText = ?,
          updatedAt = CURRENT_TIMESTAMP
          WHERE organizationId = ?`,
        [systemInstructions, responseTone, language, knowledgeBaseEnabled, autoReplyEnabled, 
         autoReplyCategories, maxResponseLength, includeSignature, signatureText, user.organizationId]
      );
    } else {
      // Create new config
      await db.execute(
        `INSERT INTO ai_config (id, organizationId, systemInstructions, responseTone, language, 
         knowledgeBaseEnabled, autoReplyEnabled, autoReplyCategories, maxResponseLength, 
         includeSignature, signatureText)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [configId, user.organizationId, systemInstructions, responseTone, language,
         knowledgeBaseEnabled, autoReplyEnabled, autoReplyCategories, maxResponseLength,
         includeSignature, signatureText]
      );
    }

    const updatedConfig: AIConfig = {
      systemInstructions,
      responseTone: responseTone as AIConfig['responseTone'],
      language: language as AIConfig['language'],
      knowledgeBaseEnabled: knowledgeBaseEnabled === 1,
      autoReplyEnabled: autoReplyEnabled === 1,
      autoReplyCategories: JSON.parse(autoReplyCategories),
      maxResponseLength,
      includeSignature: includeSignature === 1,
      signatureText,
    };

    return NextResponse.json({ 
      config: updatedConfig,
      message: 'Configuration IA enregistrée avec succès' 
    });
  } catch (error) {
    console.error('Save AI config error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Non autorisé', message: 'Veuillez vous connecter pour effectuer cette action.' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: 'Erreur interne du serveur', message: 'Une erreur inattendue s\'est produite lors de l\'enregistrement de la configuration.' },
      { status: 500 }
    );
  }
}

// Reset to default configuration
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json(
        { error: 'Aucune organisation associée', message: 'Veuillez contacter l\'administrateur.' },
        { status: 400 }
      );
    }

    // Delete existing config (soft delete by setting isActive = 0)
    await db.execute(
      `DELETE FROM ai_config WHERE organizationId = ?`,
      [user.organizationId]
    );

    return NextResponse.json({ 
      config: DEFAULT_AI_CONFIG,
      message: 'Configuration réinitialisée aux valeurs par défaut' 
    });
  } catch (error) {
    console.error('Reset AI config error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Non autorisé', message: 'Veuillez vous connecter pour effectuer cette action.' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: 'Erreur interne du serveur', message: 'Une erreur inattendue s\'est produite lors de la réinitialisation.' },
      { status: 500 }
    );
  }
}
