import fastify from 'fastify';
import swagger from '@fastify/swagger';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import greetingRouter from './routes/greeting-router';
import rootRouter from './routes/root-router';
import requestRouter from './routes/request-router';

import dotenv from 'dotenv';

import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { prisma } from '@/configurations/prisma';
import fastifyCors from '@fastify/cors';
import configRouter from '@/routes/config-router';

// Use TypeScript module augmentation to declare the type of server.prisma to be PrismaClient
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

dotenv.config();

const prismaPlugin: FastifyPluginAsync = fp(async (server, options) => {
  await prisma.$connect();
  // Make Prisma Client available through the fastify server instance: server.prisma
  server.decorate('prisma', prisma);
  server.addHook('onClose', async (server) => {
    await server.prisma.$disconnect();
  });
});

const app = fastify().withTypeProvider<TypeBoxTypeProvider>();
app.register(fastifyCors);
app.register(prismaPlugin);
app.register(swagger, {
  openapi: {
    info: {
      title: 'Test swagger',
      description: 'testing the fastify swagger api',
      version: '0.1.0',
    },
    components: {
      securitySchemes: {
        apiKey: {
          type: 'apiKey',
          name: 'x-api-key',
          in: 'header',
        },
      },
    },
    servers: [
      {
        url: 'http://localhost:4000',
      },
    ],
  },
  exposeRoute: true,
});

app.register(greetingRouter);
app.register(configRouter, { prefix: '/api/config' });
app.register(requestRouter, { prefix: '/api/requests' });
app.register(rootRouter);

app.listen({ port: 4000 }).then((address) => {
  console.log(`✨  server listening on ${address}`);
});
