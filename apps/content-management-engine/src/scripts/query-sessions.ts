import { getPayload } from 'payload'
import config from '../payload.config'

async function run() {
  console.log('Initializing Payload...')
  const payload = await getPayload({ config })
  console.log('Payload initialized.')

  try {
    const sessions = await payload.find({
      collection: 'drafting-sessions',
    })
    console.log('--- DRAFTING SESSIONS ---')
    console.log(JSON.stringify(sessions.docs, null, 2))
  } catch (err) {
    console.error('Failed to query sessions:', err)
  }
}

run()
