import {
  FastifyPluginCallback,
  FastifyPluginOptions,
  RawServerBase,
} from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';

const configRouter: FastifyPluginCallback<
  FastifyPluginOptions,
  RawServerBase,
  TypeBoxTypeProvider
> = (api, opts, done) => {
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

  api.get('/', { schema: { tags: ['config'] } }, (req, resp) => {
    return api.prisma.configuration
      .findFirst({
        where: {
          key: 'accept',
        },
      })
      .then((config) => {
        if (!config) return { accept: false };
        return { accept: config.value === 'true' };
      });
  });
  api.post(
    '/',
    { schema: { tags: ['config'], security: [{ apiKey: [] }] } },
    (req, resp) => {
      return api.prisma.configuration
        .findFirst({
          where: {
            key: 'accept',
          },
        })
        .then((config) => {
          if (!config) {
            return api.prisma.configuration.create({
              data: {
                key: 'accept',
                value: 'true',
              },
            });
          } else {
            return api.prisma.configuration.update({
              where: {
                key: 'accept',
              },
              data: {
                value: `${config.value !== 'true'}`,
              },
            });
          }
        });
    }
  );
  done();
};

export default configRouter;
