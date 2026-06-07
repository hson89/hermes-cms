import { getPayload } from 'payload'
import config from '../payload.config'

async function run() {
  const payload = await getPayload({ config: await config })
  const media = await payload.find({
    collection: 'media' as any,
  })
  console.log('Media docs:', media.docs.map(d => ({ id: d.id, alt: d.alt, filename: d.filename, url: d.url })))
  process.exit(0)
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
