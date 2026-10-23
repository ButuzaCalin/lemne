import { existsSync } from 'node:fs';
import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';
import { Server } from 'socket.io';
import { content } from './content';
import { lanAddress } from './lan';
import { contentDir, webDist } from './paths';
import { registerPhotoRoutes } from './photos';
import { sweepRooms } from './rooms';
import { registerSocketHandlers, type LemneServer } from './socket';

export interface StartOptions {
  port: number;
  /** Serve the built web app too (production and the desktop app). */
  serveWeb: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  /** Fall back to any free port when `port` is taken (desktop app). */
  anyPortIfBusy?: boolean;
}

export interface RunningServer {
  port: number;
  close: () => Promise<void>;
}

export async function startServer(opts: StartOptions): Promise<RunningServer> {
  const app = Fastify({ logger: { level: opts.logLevel ?? 'info' } });

  app.get('/health', async () => ({ ok: true }));
  // Lets a TV opened at localhost put the Wi-Fi address in its join QR code.
  app.get('/api/lan', async () => ({ address: lanAddress() }));

  const io: LemneServer = new Server(app.server);
  registerSocketHandlers(io);
  registerPhotoRoutes(app, io);

  // Slide images made by `npm run content:images`, in dev and production alike.
  const contentImages = `${contentDir}images/`;
  if (existsSync(contentImages)) {
    await app.register(fastifyStatic, {
      root: contentImages,
      prefix: '/images/',
      decorateReply: false,
      maxAge: '7d',
    });
  }

  if (opts.serveWeb && existsSync(webDist)) {
    await app.register(fastifyStatic, { root: webDist });
    // SPA fallback so /host/ABCD and /play/ABCD survive a refresh.
    app.setNotFoundHandler((_req, reply) => reply.sendFile('index.html'));
  }

  const sweep = setInterval(() => sweepRooms(Date.now()), 60_000);
  sweep.unref();

  try {
    await app.listen({ port: opts.port, host: '0.0.0.0' });
  } catch (err) {
    if (!opts.anyPortIfBusy || (err as NodeJS.ErrnoException).code !== 'EADDRINUSE') throw err;
    await app.listen({ port: 0, host: '0.0.0.0' });
  }
  app.log.info(
    `content: ${content.slides.length} slides, ${content.titles.length} titles, ${content.prompts.length} prompts`,
  );

  const address = app.server.address();
  return {
    port: typeof address === 'object' && address ? address.port : opts.port,
    close: async () => {
      clearInterval(sweep);
      io.close();
      await app.close();
    },
  };
}
