import { startServer } from './server';

const isProd = process.env.NODE_ENV === 'production';

await startServer({
  port: Number(process.env.PORT ?? 3000),
  serveWeb: isProd,
  logLevel: isProd ? 'info' : 'debug',
});
