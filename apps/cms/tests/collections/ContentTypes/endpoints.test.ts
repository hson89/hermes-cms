import { generateSchemaEndpoint, getSessionStatusEndpoint, exportSchemaEndpoint, exportSchemaTSEndpoint } from '../../../src/collections/ContentTypes/endpoints'

describe('generateSchemaEndpoint CMS Handler', () => {
  let originalFetch: any

  beforeAll(() => {
    originalFetch = global.fetch
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  it('should return 401 if user is not authenticated', async () => {
    const mockReq: any = {
      user: null,
    }

    const response = await (generateSchemaEndpoint.handler as any)(mockReq)
    const json = await response.json()

    expect(response.status).toBe(401)
    expect(json.error).toBe('Unauthorized')
  })

  it('should return 403 if user does not belong to a tenant', async () => {
    const mockReq: any = {
      user: {
        id: '123',
        collection: 'users',
        // no tenants array
      },
    }

    const response = await (generateSchemaEndpoint.handler as any)(mockReq)
    const json = await response.json()

    expect(response.status).toBe(403)
    expect(json.error).toBe('User does not belong to a tenant.')
  })

  it('should return 400 if prompt is missing or empty', async () => {
    const mockReq: any = {
      user: {
        id: '123',
        tenants: [{ tenant: '456' }],
        collection: 'users',
      },
      json: async () => ({ prompt: '' }),
    }

    const response = await (generateSchemaEndpoint.handler as any)(mockReq)
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toBe('prompt is required.')
  })

  it('should successfully proxy to AI service with snake_case keys in payload', async () => {
    const mockReq: any = {
      user: {
        id: 'user-123',
        tenants: [{ tenant: 'tenant-456' }],
        collection: 'users',
      },
      json: async () => ({ prompt: 'Create a blog post schema' }),
    }

    const fetchCalls: any[] = []
    global.fetch = (async (url: string, options: any) => {
      fetchCalls.push([url, options])
      return {
        ok: true,
        json: async () => ({
          sessionId: 'session-789',
          status: 'completed',
        }),
      }
    }) as any

    const response = await (generateSchemaEndpoint.handler as any)(mockReq)
    const json = await response.json()

    expect(response.status).toBe(202)
    expect(json.sessionId).toBe('session-789')
    expect(json.status).toBe('processing')

    // Verify the arguments passed to global.fetch
    expect(fetchCalls.length).toBe(1)
    const [url, options] = fetchCalls[0]
    expect(url).toContain('/api/ai/generate-schema')
    expect(options.method).toBe('POST')

    const body = JSON.parse(options.body)
    expect(body.prompt).toBe('Create a blog post schema')
    
    // CRITICAL: Must be snake_case to match FastAPI validation models!
    expect(body.tenant_id).toBe('tenant-456')
    expect(body.user_id).toBe('user-123')
  })
})

describe('getSessionStatusEndpoint CMS Handler', () => {
  let originalFetch: any

  beforeAll(() => {
    originalFetch = global.fetch
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  it('should return 401 if user is not authenticated', async () => {
    const mockReq: any = {
      user: null,
    }

    const response = await (getSessionStatusEndpoint.handler as any)(mockReq)
    const json = await response.json()

    expect(response.status).toBe(401)
    expect(json.error).toBe('Unauthorized')
  })

  it('should return 403 if user does not belong to a tenant', async () => {
    const mockReq: any = {
      user: {
        id: '123',
        collection: 'users',
        // no tenants
      },
    }

    const response = await (getSessionStatusEndpoint.handler as any)(mockReq)
    const json = await response.json()

    expect(response.status).toBe(403)
    expect(json.error).toBe('User does not belong to a tenant.')
  })

  it('should return 400 if session ID is missing from req.url', async () => {
    const mockReq: any = {
      user: {
        id: '123',
        tenants: [{ tenant: '456' }],
        collection: 'users',
      },
      url: 'http://localhost:3000/api/content-types/sessions/',
    }

    const response = await (getSessionStatusEndpoint.handler as any)(mockReq)
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toBe('Session ID is required.')
  })

  it('should successfully proxy session retrieval GET request to AI microservice', async () => {
    const mockReq: any = {
      user: {
        id: '123',
        tenants: [{ tenant: 'tenant-456' }],
        collection: 'users',
      },
      url: 'http://localhost:3000/api/content-types/sessions/session-xyz',
    }

    const fetchCalls: any[] = []
    global.fetch = (async (url: string, options: any) => {
      fetchCalls.push([url, options])
      return {
        ok: true,
        json: async () => ({
          session_id: 'session-xyz',
          status: 'completed',
          schema: {
            name: 'Luxury Watches',
            fields: [],
          },
        }),
      }
    }) as any

    const response = await (getSessionStatusEndpoint.handler as any)(mockReq)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.session_id).toBe('session-xyz')
    expect(json.status).toBe('completed')
    expect(json.schema.name).toBe('Luxury Watches')

    expect(fetchCalls.length).toBe(1)
    const [url, options] = fetchCalls[0]
    expect(url).toContain('/api/ai/sessions/session-xyz')
    expect(options.method).toBe('GET')
    expect(options.headers['X-Internal-Secret']).toBeDefined()
  })
})

describe('exportSchemaEndpoint CMS Handler', () => {
  it('should return 401 if user is not authenticated', async () => {
    const mockReq: any = {
      user: null,
    }

    const response = await (exportSchemaEndpoint.handler as any)(mockReq)
    const json = await response.json()

    expect(response.status).toBe(401)
    expect(json.error).toBe('Unauthorized')
  })

  it('should find content type and return dynamic JSON schema download', async () => {
    const findByIDCalls: any[] = []
    const mockReq: any = {
      user: { id: 'user-123' },
      url: 'http://localhost:3000/api/content-types/ct-abc/export',
      payload: {
        findByID: async (args: any) => {
          findByIDCalls.push(args)
          return {
            id: 'ct-abc',
            name: 'Luxury Watches',
            slug: 'luxury-watches',
            schema: {
              fields: [
                { name: 'model', type: 'text', required: true },
                { name: 'price', type: 'number' },
              ]
            }
          }
        }
      }
    }

    const response = await (exportSchemaEndpoint.handler as any)(mockReq)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/json')
    expect(response.headers.get('Content-Disposition')).toContain('filename="luxury-watches.json"')
    expect(json.fields.length).toBe(2)
    expect(json.fields[0].name).toBe('model')

    expect(findByIDCalls.length).toBe(1)
    expect(findByIDCalls[0]).toEqual({
      collection: 'content-types',
      id: 'ct-abc',
      overrideAccess: true,
    })
  })
})

describe('exportSchemaTSEndpoint CMS Handler', () => {
  it('should return 401 if user is not authenticated', async () => {
    const mockReq: any = {
      user: null,
    }

    const response = await (exportSchemaTSEndpoint.handler as any)(mockReq)
    const json = await response.json()

    expect(response.status).toBe(401)
    expect(json.error).toBe('Unauthorized')
  })

  it('should find content type and return dynamically generated static TypeScript collection configuration', async () => {
    const findByIDCalls: any[] = []
    const mockReq: any = {
      user: { id: 'user-123' },
      url: 'http://localhost:3000/api/content-types/ct-abc/export/ts',
      payload: {
        findByID: async (args: any) => {
          findByIDCalls.push(args)
          return {
            id: 'ct-abc',
            name: 'Luxury Watches',
            slug: 'luxury-watches',
            schema: {
              fields: [
                { name: 'model', type: 'text', required: true },
                { name: 'price', type: 'number' },
              ]
            }
          }
        }
      }
    }

    const response = await (exportSchemaTSEndpoint.handler as any)(mockReq)
    const tsCode = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/plain')
    expect(response.headers.get('Content-Disposition')).toContain('filename="LuxuryWatches.ts"')
    expect(tsCode).toContain("export const LuxuryWatches: CollectionConfig")
    expect(tsCode).toContain("name: 'model'")
    expect(tsCode).toContain("type: 'text'")
    expect(tsCode).toContain("required: true")
    expect(tsCode).toContain("name: 'price'")
    expect(tsCode).toContain("type: 'number'")

    expect(findByIDCalls.length).toBe(1)
    expect(findByIDCalls[0]).toEqual({
      collection: 'content-types',
      id: 'ct-abc',
      overrideAccess: true,
    })
  })
})
