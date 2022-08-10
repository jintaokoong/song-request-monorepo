import {
  FastifyPluginCallback,
  FastifyPluginOptions,
  RawServerBase,
} from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'

const ResponseSchema = Type.Object({
  message: Type.String(),
})

const rootRouter: FastifyPluginCallback<FastifyPluginOptions, RawServerBase, TypeBoxTypeProvider> = (
  api, opt, done) => {
  api.get('/', { schema: { response: { 200: ResponseSchema } } },
    () => ({ message: 'service is up!' }))
  done()
}
export default rootRouter
