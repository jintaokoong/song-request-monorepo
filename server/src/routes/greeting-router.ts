import { GreetingSchema } from '../schemas/greeting'
import {
  FastifyPluginCallback,
  FastifyPluginOptions,
  RawServerBase,
} from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'

const greetingRouter: FastifyPluginCallback<FastifyPluginOptions, RawServerBase, TypeBoxTypeProvider> = (api, opts, done,) => {
  api.post('/greeting', { schema: {  body: GreetingSchema, tags: ['greeting'] } }, (req, resp) => {
    const { name } = req.body
    resp.send({ message: `Hello ${name}` })
  })
  done();
}

export default greetingRouter;
