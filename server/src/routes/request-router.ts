import {
  FastifyPluginCallback,
  FastifyPluginOptions,
  RawServerBase,
} from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import date from '../../utils/date'
import { faker } from '@faker-js/faker'
import { Type } from '@sinclair/typebox'
import { last, tail } from 'ramda'

const FindRequestSchema = Type.Object({
  limit: Type.Number({
    default: 10,
  }),
  cursor: Type.Optional(Type.String()),
})

const requestRouter:  FastifyPluginCallback<FastifyPluginOptions, RawServerBase, TypeBoxTypeProvider> = (api, opt, done) => {
  api.get('/', { schema: { tags: ['request'], querystring: FindRequestSchema } }, (req, resp) => {
    return api.prisma.request.findMany({
      cursor: req.query.cursor ? { id: req.query.cursor } : undefined,
      take: req.query.limit,
      skip: 1,
      orderBy: [{ key: 'desc' }, { createdAt: 'asc' }],
    }).then(requests => {
      return {
        cursor: last(requests)?.id,
        data: requests,
      }
    })
  })

  api.post('/generate', { schema: { tags: ['request'] } }, (req, res) => {
    const createdAt = date.getRandomDate(new Date(2022, 6, 1), new Date());
    const key = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate());
    const updatedAt = date.getRandomDate(createdAt, new Date());
    return api.prisma.configuration.findFirst({
      where: {
        key: 'accept',
      }
    }).then((config) => {
      if (!config || config.value === 'false') return res.status(400).send({ message: 'not accepting'});
      return api.prisma.request.create({
        data: {
          title: faker.music.songName(),
          requester: 'unknown',
          key,
          createdAt,
          updatedAt,
        }
      }).then(req => res.send(req));
    })
  })
  done();
}

export default requestRouter
