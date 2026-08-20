import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  PAYMENT_GATEWAY: z.enum(['fake']).default('fake'),

  /**
   * Chave do Gemini. Vive só aqui, no servidor: o navegador chama /api do Ergane
   * e nunca vê a credencial. Ausente, o módulo cai no interpretador local.
   */
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().min(1).default('gemini-2.5-flash'),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
