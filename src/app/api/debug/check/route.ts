export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-hybrid';
import { getDbContext } from '@/lib/db-hybrid';

/**
 * Debug endpoint to check system status
 * This helps troubleshoot issues in production
 */
export async function GET(request: NextRequest) {
  const requestId = `debug_${Date.now()}`;
  console.log(`[${requestId}] === DEBUG CHECK START ===`);
  
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    steps: [],
  };
  
  try {
    // Step 1: Check authentication
    console.log(`[${requestId}] Step 1: Checking authentication...`);
    let user;
    try {
      user = await requireAuth();
      results.steps.push({ step: 'authentication', status: 'success', user: { id: user.id, email: user.email, role: user.role, organizationId: user.organizationId } });
    } catch (authError) {
      results.steps.push({ step: 'authentication', status: 'failed', error: authError instanceof Error ? authError.message : String(authError) });
      return NextResponse.json(results, { status: 401 });
    }
    
    // Step 2: Check database connection
    console.log(`[${requestId}] Step 2: Checking database...`);
    const db = getDbContext();
    results.steps.push({ step: 'database_context', status: 'success' });
    
    // Step 3: Check user's organization
    console.log(`[${requestId}] Step 3: Checking organization...`);
    if (user.organizationId) {
      try {
        const orgs = await db.query<{ id: string; name: string; slug: string }>(
          `SELECT id, name, slug FROM organizations WHERE id = ?`,
          [user.organizationId]
        );
        if (orgs.length > 0) {
          results.steps.push({ step: 'organization', status: 'success', organization: orgs[0] });
        } else {
          results.steps.push({ step: 'organization', status: 'warning', message: 'Organization ID set but not found in database' });
        }
      } catch (orgError) {
        results.steps.push({ step: 'organization', status: 'failed', error: orgError instanceof Error ? orgError.message : String(orgError) });
      }
    } else {
      results.steps.push({ step: 'organization', status: 'warning', message: 'No organization ID for user' });
    }
    
    // Step 4: Check courses table
    console.log(`[${requestId}] Step 4: Checking courses table...`);
    try {
      const coursesCount = await db.query<{ count: number }>(
        `SELECT COUNT(*) as count FROM courses WHERE organizationId = ?`,
        [user.organizationId]
      );
      results.steps.push({ step: 'courses_table', status: 'success', count: coursesCount[0]?.count || 0 });
    } catch (courseError) {
      results.steps.push({ step: 'courses_table', status: 'failed', error: courseError instanceof Error ? courseError.message : String(courseError) });
    }
    
    // Step 5: Check groups table
    console.log(`[${requestId}] Step 5: Checking groups table...`);
    try {
      const groupsCount = await db.query<{ count: number }>(
        `SELECT COUNT(*) as count FROM groups WHERE organizationId = ?`,
        [user.organizationId]
      );
      results.steps.push({ step: 'groups_table', status: 'success', count: groupsCount[0]?.count || 0 });
    } catch (groupError) {
      results.steps.push({ step: 'groups_table', status: 'failed', error: groupError instanceof Error ? groupError.message : String(groupError) });
    }
    
    // Step 6: Test insert capability (create and immediately delete a test record)
    console.log(`[${requestId}] Step 6: Testing insert capability...`);
    if (user.organizationId) {
      const testId = `test_${Date.now()}`;
      try {
        // Test course insert
        await db.execute(
          `INSERT INTO courses (id, organizationId, title, name, isActive) VALUES (?, ?, ?, ?, 1)`,
          [testId, user.organizationId, 'Test Course', 'Test Course']
        );
        await db.execute(`DELETE FROM courses WHERE id = ?`, [testId]);
        results.steps.push({ step: 'insert_test', status: 'success', message: 'Successfully inserted and deleted test record' });
      } catch (insertError) {
        results.steps.push({ step: 'insert_test', status: 'failed', error: insertError instanceof Error ? insertError.message : String(insertError) });
      }
    } else {
      results.steps.push({ step: 'insert_test', status: 'skipped', message: 'No organization ID' });
    }
    
    console.log(`[${requestId}] === DEBUG CHECK COMPLETE ===`);
    return NextResponse.json({ success: true, ...results });
    
  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error);
    results.steps.push({ step: 'unexpected_error', status: 'failed', error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ success: false, ...results }, { status: 500 });
  }
}
