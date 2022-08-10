import { Type } from '@sinclair/typebox';

export const GreetingSchema = Type.Object({
  name: Type.String(),
});
