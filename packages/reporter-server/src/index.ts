import { createApp } from './server.js';
import { initializeDatabase } from './db.js';

const PORT = parseInt(process.env.REPORTER_PORT || '8400');

async function main(): Promise<void> {
  console.log('Initializing database...');
  await initializeDatabase();

  console.log('Creating Fastify app...');
  const app = await createApp();

  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Reporter server listening on http://0.0.0.0:${PORT}`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

main();
