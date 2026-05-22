import { Langfuse } from 'langfuse'

const public_key = process.env.LANGFUSE_PUBLIC_KEY
const secret_key = process.env.LANGFUSE_SECRET_KEY
const host = process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com'

export const langfuse =
  public_key && secret_key
    ? new Langfuse({
        publicKey: public_key,
        secretKey: secret_key,
        baseUrl: host,
      })
    : null

if (!langfuse && process.env.NODE_ENV !== 'test') {
  console.info('Langfuse is not configured. Tracing will be disabled.')
}
