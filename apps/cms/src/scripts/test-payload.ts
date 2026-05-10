import { getPayload } from 'payload'
import config from '../payload.config'

async function test() {
  console.log('Initializing Payload...')
  const payload = await getPayload({ config })
  console.log('Payload initialized.')

  try {
    console.log('Testing /api/users/me equivalent...')
    // Simulating what the 'me' endpoint does
    const collections = payload.config.collections
    console.log('Collections count:', collections.length)
    
    // Check if any collection has a broken config
    collections.forEach(col => {
      console.log(`Checking collection: ${col.slug}`)
      // Access controls
      if (typeof col.access?.read === 'function') {
        console.log(`  - Read access is a function`)
      }
    })

    console.log('Test completed successfully.')
  } catch (err) {
    console.error('Test failed:', err)
  }
}

test()
