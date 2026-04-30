import { FastifyInstance } from 'fastify';
import { and, desc, sql, eq } from 'drizzle-orm';
import { getDatabase } from '../db.js';
import { runs, tests } from '../schema.js';

export async function registerTrendsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/trends', async (request, reply) => {
    const db = getDatabase();
    const query = request.query as Record<string, string>;

    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    const file = query.file as string | undefined;
    const groupBy = query.groupBy as 'day' | 'run' || 'day';

    const conditions: import('drizzle-orm').SQL[] = [];
    if (from) conditions.push(sql`${runs.startedAt} >= ${from}`);
    if (to) conditions.push(sql`${runs.startedAt} <= ${to}`);

    const runList = await db
      .select({
        id: runs.id,
        startedAt: runs.startedAt,
        totalTests: runs.totalTests,
        passed: runs.passed,
        failed: runs.failed,
        flaky: runs.flaky,
        skipped: runs.skipped,
      })
      .from(runs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(runs.startedAt))
      .limit(500);

    if (groupBy === 'day') {
      const dailyStats: Record<string, { total: number; passed: number; failed: number; flaky: number; skipped: number }> = {};

      for (const run of runList) {
        const day = run.startedAt?.toISOString().split('T')[0] || '';
        if (!dailyStats[day]) {
          dailyStats[day] = { total: 0, passed: 0, failed: 0, flaky: 0, skipped: 0 };
        }
        dailyStats[day].total += run.totalTests || 0;
        dailyStats[day].passed += run.passed || 0;
        dailyStats[day].failed += run.failed || 0;
        dailyStats[day].flaky += run.flaky || 0;
        dailyStats[day].skipped += run.skipped || 0;
      }

      const timeline = Object.entries(dailyStats)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, stats]) => ({
          date,
          ...stats,
          passRate: stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0,
        }));

      reply.send({
        groupBy: 'day',
        timeline,
      });
    } else {
      const timeline = runList.map((run) => ({
        runId: run.id,
        date: run.startedAt?.toISOString() || '',
        totalTests: run.totalTests || 0,
        passed: run.passed || 0,
        failed: run.failed || 0,
        flaky: run.flaky || 0,
        skipped: run.skipped || 0,
        passRate: (run.totalTests || 0) > 0 ? Math.round(((run.passed || 0) / (run.totalTests || 0)) * 100) : 0,
      }));

      reply.send({
        groupBy: 'run',
        timeline,
      });
    }
  });

  app.get('/api/v1/trends/recurring-failures', async (request, reply) => {
    const db = getDatabase();
    const query = request.query as Record<string, string>;

    const from = query.from ? new Date(query.from) : undefined;
    const limit = Math.min(parseInt(query.limit || '20'), 100);

    const failureConditions = [sql`${tests.status} = 'failed'`];

    if (from) {
      const testIds = await db
        .select({ id: tests.id, runStarted: runs.startedAt })
        .from(tests)
        .innerJoin(runs, eq(tests.runId, runs.id))
        .where(sql`${runs.startedAt} >= ${from}`);

      const ids = testIds.map((t) => t.id);
      if (ids.length === 0) {
        reply.send({ failures: [] });
        return;
      }

      failureConditions.push(sql`${tests.id} IN (${ids.join(',')})`);
    }

    const failures = await db
      .select({
        file: tests.file,
        line: tests.line,
        title: tests.title,
        errorText: tests.errorText,
        failureCount: sql`COUNT(*)::int`.as('failure_count'),
        lastFailed: sql`MAX(${tests.id}::text)`.as('last_failed'),
      })
      .from(tests)
      .where(and(...failureConditions))
      .groupBy(tests.file, tests.line, tests.title, tests.errorText)
      .having(sql`COUNT(*) > 1`)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(limit);

    reply.send({
      failures,
    });
  });
}
