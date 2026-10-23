import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';
import { Server } from 'socket.io';
import { content } from './content';
import { registerPhotoRoutes } from './photos';
import { sweepRooms } from './rooms';
import { registerSocketHandlers, type LemneServer } from './socket';

const PORT = Number(process.env.PORT ?? 3000);
const isProd = process.env.NODE_ENV === 'production';

const app = Fastify({ logger: { level: isProd ? 'info' : 'debug' } });

app.get('/health', async () => ({ ok: true }));

const io: LemneServer = new Server(app.server);
registerSocketHandlers(io);
registerPhotoRoutes(app, io);

const webDist = fileURLToPath(new URL('../../web/dist/', import.meta.url));
if (isProd && existsSync(webDist)) {
  await app.register(fastifyStatic, { root: webDist });
  // SPA fallback so /host/ABCD and /play/ABCD survive a refresh.
  app.setNotFoundHandler((_req, reply) => reply.sendFile('index.html'));
}

setInterval(() => sweepRooms(Date.now()), 60_000).unref();

await app.listen({ port: PORT, host: '0.0.0.0' });
app.log.info(
  `content: ${content.slides.length} slides, ${content.titles.length} titles, ${content.prompts.length} prompts`,
);
