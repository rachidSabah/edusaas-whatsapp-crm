export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { tursoExecute, tursoQuery, type CloudflareEnv } from '@/lib/turso-http';

// System templates in French
const SYSTEM_TEMPLATES = [
  {
    id: 'tpl_general_001',
    name: 'Message général',
    category: 'GENERAL',
    content: `Chers parents,

{Message}

Nous restons à votre disposition pour toute information complémentaire.

Cordialement,`,
    triggerAction: 'GENERAL',
    signature: 'Administration {organisation}',
    variables: '["Message", "organisation"]'
  },
  {
    id: 'tpl_absence_001',
    name: 'Notification d\'absence',
    category: 'ABSENCE_NOTIFICATION',
    content: `Chers parents,

Nous vous informons que votre enfant {StudentName}, élève du groupe {GroupName}, a été marqué(e) absent(e) ce jour, {Date}.

Nous vous prions de bien vouloir justifier cette absence en contactant l'administration dans les plus brefs délais.

Pour toute information complémentaire, n'hésitez pas à nous contacter.

Cordialement,`,
    triggerAction: 'ABSENT',
    signature: 'Administration {organisation}',
    variables: '["StudentName", "GroupName", "Date", "organisation"]'
  },
  {
    id: 'tpl_retard_001',
    name: 'Notification de retard',
    category: 'LATE_NOTIFICATION',
    content: `Chers parents,

Nous vous informons que votre enfant {StudentName}, élève du groupe {GroupName}, est arrivé(e) en retard le {Date} à {Time}.

Nous vous rappelons que la ponctualité est essentielle pour le bon déroulement des cours et le respect des autres élèves.

Nous vous prions de veiller à ce que votre enfant arrive à l'heure pour les prochaines séances.

Cordialement,`,
    triggerAction: 'LATE',
    signature: 'Administration {organisation}',
    variables: '["StudentName", "GroupName", "Date", "Time", "organisation"]'
  },
  {
    id: 'tpl_payment_001',
    name: 'Rappel de paiement',
    category: 'PAYMENT_REMINDER',
    content: `Chers parents,

Nous vous rappelons que le paiement concernant {StudentName} pour le mois de {Month} n'a pas encore été effectué.

Montant dû : {Amount} MAD
Date limite : {DueDate}

Nous vous prions de régulariser cette situation dans les plus brefs délais.

Pour toute question relative au paiement, veuillez contacter l'administration.

Cordialement,`,
    triggerAction: 'PAYMENT_DELAY',
    signature: 'Administration {organisation}',
    variables: '["StudentName", "Month", "Amount", "DueDate", "organisation"]'
  },
  {
    id: 'tpl_admin_001',
    name: 'Communication administrative',
    category: 'ADMIN_COMMUNICATION',
    content: `Chers parents,

{Message}

Nous restons à votre disposition pour toute information complémentaire.

Cordialement,`,
    triggerAction: 'ADMIN_COMMUNICATION',
    signature: 'Administration {organisation}',
    variables: '["Message", "organisation"]'
  }
];

export async function GET(request: NextRequest) {
  try {
    const ctx = getRequestContext();
    const env = ctx.env as CloudflareEnv;
    const dbUrl = env.TURSO_DATABASE_URL;
    const dbToken = env.TURSO_AUTH_TOKEN;

    // Check existing templates
    const existing = await tursoQuery(dbUrl, dbToken, 
      `SELECT id, name FROM templates WHERE isSystem = 1`
    );

    return NextResponse.json({
      systemTemplatesCount: existing.length,
      existingTemplates: existing,
      templatesToSeed: SYSTEM_TEMPLATES.length
    });
  } catch (error: any) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = getRequestContext();
    const env = ctx.env as CloudflareEnv;
    const dbUrl = env.TURSO_DATABASE_URL;
    const dbToken = env.TURSO_AUTH_TOKEN;

    const results: { id: string; name: string; status: string }[] = [];
    const now = new Date().toISOString();

    for (const template of SYSTEM_TEMPLATES) {
      try {
        // Check if exists
        const existing = await tursoQuery(dbUrl, dbToken,
          `SELECT id FROM templates WHERE id = ?`,
          [template.id]
        );

        if (existing.length > 0) {
          // Update existing
          await tursoExecute(dbUrl, dbToken,
            `UPDATE templates SET 
              name = ?, category = ?, content = ?, triggerAction = ?, signature = ?, variables = ?, updatedAt = ?
             WHERE id = ?`,
            [template.name, template.category, template.content, template.triggerAction, template.signature, template.variables, now, template.id]
          );
          results.push({ id: template.id, name: template.name, status: 'updated' });
        } else {
          // Insert new
          await tursoExecute(dbUrl, dbToken,
            `INSERT INTO templates (id, organizationId, name, category, content, triggerAction, signature, variables, isSystem, isActive, createdAt, updatedAt)
             VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)`,
            [template.id, template.name, template.category, template.content, template.triggerAction, template.signature, template.variables, now, now]
          );
          results.push({ id: template.id, name: template.name, status: 'created' });
        }
      } catch (err: any) {
        results.push({ id: template.id, name: template.name, status: `error: ${err.message}` });
      }
    }

    return NextResponse.json({
      message: 'Templates seeded successfully',
      results,
      totalSeeded: results.filter(r => r.status !== 'error').length
    });
  } catch (error: any) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
