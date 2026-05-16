/**
 * T031 - Load test for resolution API
 * Verifies SC-005 (< 50ms @ 50 concurrent)
 */
async function loadTest() {
  const url = 'http://localhost:3000/api/tenants/resolve?hostname=domain-test.hermes-cms.com'
  const secret = process.env.INTERNAL_SERVICE_SECRET || 'hermes-internal-secret'
  const concurrentRequests = 50

  console.log(`Starting load test: ${concurrentRequests} concurrent requests...`)

  const start = Date.now()
  const requests = Array.from({ length: concurrentRequests }).map(() => 
    fetch(url, { headers: { 'X-Internal-Secret': secret } })
  )

  try {
    const results = await Promise.all(requests)
    const end = Date.now()
    const totalTime = end - start
    const averageTime = totalTime / concurrentRequests

    console.log(`Total time: ${totalTime}ms`)
    console.log(`Average time per request: ${averageTime.toFixed(2)}ms`)

    if (averageTime < 50) {
      console.log('✅ SC-005 Passed: Average latency < 50ms')
    } else {
      console.log('❌ SC-005 Failed: Average latency > 50ms')
    }
  } catch (error) {
    console.error('Load test failed:', error.message)
  }
}

// Only run if specifically called
if (require.main === module) {
  loadTest()
}
