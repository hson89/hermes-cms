const PAYLOAD_URL = 'http://localhost:3000'
const API_KEY = 'demo-api-key-123456789'
const slug = 'frontend-demo-5656'

async function test() {
  const url = `${PAYLOAD_URL}/api/tenants?where[slug][equals]=${slug}`
  console.log(`Fetching: ${url}`)
  const res = await fetch(url, {
    headers: {
      'Authorization': `API-Key ${API_KEY}`,
      'Content-Type': 'application/json',
    }
  })

  console.log(`Status: ${res.status}`)
  const data = await res.json()
  console.log('Response:', JSON.stringify(data, null, 2))
}

test().catch(console.error)
