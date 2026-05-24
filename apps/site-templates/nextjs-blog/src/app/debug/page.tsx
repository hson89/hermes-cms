import React from 'react'
import { getTenantBySlug } from '../../lib/cms'

export default async function DebugPage() {
  const payloadUrl = process.env.PAYLOAD_URL
  const apiKey = process.env.PAYLOAD_API_KEY ? 'Present (Hidden)' : 'MISSING'
  
  let tenantData = null
  let error = null

  try {
    tenantData = await getTenantBySlug('frontend-demo-5656')
  } catch (e: any) {
    error = e.message
  }

  return (
    <div className="p-10 font-mono text-xs space-y-4">
      <h1 className="text-xl font-bold">Debug Dashboard</h1>
      <div className="space-y-1">
        <p><strong>PAYLOAD_URL:</strong> {payloadUrl || 'NOT SET'}</p>
        <p><strong>PAYLOAD_API_KEY:</strong> {apiKey}</p>
      </div>
      <hr />
      <div>
        <h2 className="font-bold">Tenant Resolution Test (frontend-demo-5656):</h2>
        <pre className="bg-surface-container-low p-4 rounded-xl mt-2">
          {tenantData ? JSON.stringify(tenantData, null, 2) : (error || 'NULL (Not Found)')}
        </pre>
      </div>
    </div>
  )
}
