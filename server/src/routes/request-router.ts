import {
  FastifyPluginCallback,
  FastifyPluginOptions,
  RawServerBase,
} from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import date from '../utils/date';
import { faker } from '@faker-js/faker';
import { Type } from '@sinclair/typebox';
import { last } from 'ramda';

const FindRequestSchema = Type.Object({
  limit: Type.Number({
    default: 10,
  }),
  cursor: Type.Optional(Type.String()),
});

const CreateRequestSchema = Type.Object({
  title: Type.String(),
  requester: Type.Optional(Type.String()),
});

const SingleRequestQuerySchema = Type.Object({
  id: Type.String(),
});
const UpdateRequestBodySchema = Type.Object({
  done: Type.Boolean(),
});

const requestRouter: FastifyPluginCallback<
  FastifyPluginOptions,
  RawServerBase,
  TypeBoxTypeProvider
> = (api, opt, done) => {
  api.addHook('preHandler', function (req, rep, done) {
    if (req.method === 'GET') {
      return done();
    }
    const key = req.headers['x-api-key'];
    if (typeof key !== 'string') {
      rep.code(401);
      return done(new Error('Unauthorized'));
    }
    const envKeys = process.env.API_KEY || '[]';
    const authorizedKeys = new Set(envKeys.split(','));
    if (!key || !authorizedKeys.has(key)) {
      rep.code(401);
      return done(new Error('Unauthorized'));
    }
    done();
  });

  api.get(
    '/',
    { schema: { tags: ['request'], querystring: FindRequestSchema } },
    (req, resp) => {
      return api.prisma.request
        .findMany({
          cursor: req.query.cursor ? { id: req.query.cursor } : undefined,
          take: req.query.limit,
          skip: 1,
          orderBy: [{ key: 'desc' }, { createdAt: 'asc' }],
        })
        .then((requests) => {
          return {
            cursor: last(requests)?.id,
            data: requests,
          };
        });
    }
  );

  api.patch(
    '/:id',
    {
      schema: {
        tags: ['request'],
        params: SingleRequestQuerySchema,
        body: UpdateRequestBodySchema,
        security: [{ apiKey: [] }],
      },
    },
    (req, rep) => {
      return api.prisma.request
        .update({
          where: { id: req.params.id },
          data: {
            done: req.body.done,
            updatedAt: new Date(),
          },
        })
        .then((r) => rep.send(r));
    }
  );

  api.delete(
    '/:id',
    {
      schema: {
        tags: ['request'],
        params: SingleRequestQuerySchema,
        security: [{ apiKey: [] }],
      },
    },
    (req, rep) => {
      return api.prisma.request
        .delete({
          where: { id: req.params.id },
        })
        .then(() => rep.send({}));
    }
  );

  api.post(
    '/',
    {
      schema: {
        tags: ['request'],
        body: CreateRequestSchema,
        security: [{ apiKey: [] }],
      },
    },
    (req, rep) => {
      return api.prisma.configuration
        .findFirst({
          where: { key: 'accept' },
        })
        .then((accept) => {
          if (accept == null || accept.value !== 'true')
            throw new Error('not accepting');
          const now = new Date();
          const key = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          const requester = req.body.requester || '系統';
          return api.prisma.request.create({
            data: {
              key: key,
              title: req.body.title,
              requester,
              done: false,
              createdAt: now,
              updatedAt: now,
            },
          });
        });
    }
  );

  api.post(
    '/generate',
    { schema: { tags: ['request'], security: [{ apiKey: [] }] } },
    (req, res) => {
      const createdAt = date.getRandomDate(new Date(2022, 6, 1), new Date());
      const key = new Date(
        createdAt.getFullYear(),
        createdAt.getMonth(),
        createdAt.getDate()
      );
      const updatedAt = date.getRandomDate(createdAt, new Date());
      return api.prisma.configuration
        .findFirst({
          where: {
            key: 'accept',
          },
        })
        .then((config) => {
          if (!config || config.value === 'false')
            return res.status(400).send({ message: 'not accepting' });
          return api.prisma.request
            .create({
              data: {
                title: faker.music.songName(),
                requester: 'unknown',
                key,
                createdAt,
                updatedAt,
              },
            })
            .then((req) => res.send(req));
        });
    }
  );
  done();
};

export default requestRouter;
