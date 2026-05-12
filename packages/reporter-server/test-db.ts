import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import { tests } from './src/schema';

const getDatabase = () => {
    const client = postgres('postgres://postgres:postgres@localhost:5432/playwright_reporter');
    return drizzle(client);
};

async function run() {
    try {
        const db = getDatabase();
        const res = await db.select({
            title: tests.title,
            failureCount: sql`COUNT(*)::int`.as('failure_count'),
        }).from(tests).groupBy(tests.file, tests.title);
        console.log(res);
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
run();
