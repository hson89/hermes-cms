import { jest } from '@jest/globals'

jest.mock('../../../src/services/langfuse', () => ({
  langfuse: null,
}))

import { generateSchemaEndpoint, getSessionStatusEndpoint, postSessionMessageEndpoint, exportSchemaEndpoint, exportSchemaTSEndpoint } from '../../../src/collections/ContentTypes/endpoints'

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
    const createCalls: any[] = []
    const mockReq: any = {
      user: {
        id: 'user-123',
        tenants: [{ tenant: 'tenant-456' }],
        collection: 'users',
      },
      json: async () => ({ prompt: 'Create a blog post schema' }),
      payload: {
        create: async (args: any) => {
          createCalls.push(args)
          return { id: 'history-123' }
        }
      }
    }

    const fetchCalls: any[] = []
    global.fetch = (async (url: string, options: any) => {
      fetchCalls.push([url, options])
      return {
        ok: true,
        json: async () => ({
          sessionId: 'session-789',
          status: 'completed',
          content_schema: { name: 'Luxury Watches', fields: [] },
        }),
      }
    }) as any

    const response = await (generateSchemaEndpoint.handler as any)(mockReq)
    const json = await response.json()

    expect(response.status).toBe(202)
    expect(json.sessionId).toBe('session-789')
    expect(json.status).toBe('processing')

    // Verify prompt history log write (T007b)
    expect(createCalls.length).toBe(1)
    expect(createCalls[0].collection).toBe('ai-prompt-history')
    expect(createCalls[0].data.prompt).toBe('Create a blog post schema')
    expect(createCalls[0].data.tenant).toBe('tenant-456')
    expect(createCalls[0].data.user).toBe('user-123')

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
      user: {
        id: 'user-123',
        tenants: [{ tenant: 'tenant-456' }],
      },
      url: 'http://localhost:3000/api/content-types/ct-abc/export',
      payload: {
        findByID: async (args: any) => {
          findByIDCalls.push(args)
          return {
            id: 'ct-abc',
            name: 'Luxury Watches',
            slug: 'luxury-watches',
            tenant: 'tenant-456',
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

  it('should return 403 Forbidden if user tries to export content type from another tenant', async () => {
    const mockReq: any = {
      user: {
        id: 'user-123',
        tenants: [{ tenant: 'tenant-different' }],
      },
      url: 'http://localhost:3000/api/content-types/ct-abc/export',
      payload: {
        findByID: async () => {
          return {
            id: 'ct-abc',
            name: 'Luxury Watches',
            slug: 'luxury-watches',
            tenant: 'tenant-456',
          }
        }
      }
    }

    const response = await (exportSchemaEndpoint.handler as any)(mockReq)
    const json = await response.json()

    expect(response.status).toBe(403)
    expect(json.error).toBe('Forbidden')
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
      user: {
        id: 'user-123',
        tenants: [{ tenant: 'tenant-456' }],
      },
      url: 'http://localhost:3000/api/content-types/ct-abc/export/ts',
      payload: {
        findByID: async (args: any) => {
          findByIDCalls.push(args)
          return {
            id: 'ct-abc',
            name: 'Luxury Watches',
            slug: 'luxury-watches',
            tenant: 'tenant-456',
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

  it('should return 403 Forbidden if user tries to export TS configuration from another tenant', async () => {
    const mockReq: any = {
      user: {
        id: 'user-123',
        tenants: [{ tenant: 'tenant-different' }],
      },
      url: 'http://localhost:3000/api/content-types/ct-abc/export/ts',
      payload: {
        findByID: async () => {
          return {
            id: 'ct-abc',
            name: 'Luxury Watches',
            slug: 'luxury-watches',
            tenant: 'tenant-456',
          }
        }
      }
    }

    const response = await (exportSchemaTSEndpoint.handler as any)(mockReq)
    const json = await response.json()

    expect(response.status).toBe(403)
    expect(json.error).toBe('Forbidden')
  })
})

describe('generateSchemaEndpoint currentSchema support', () => {
  let originalFetch: any

  beforeAll(() => {
    originalFetch = global.fetch
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  it('should successfully pass currentSchema to AI service if provided', async () => {
    const mockReq: any = {
      user: {
        id: 'user-123',
        tenants: [{ tenant: 'tenant-456' }],
        collection: 'users',
      },
      json: async () => ({
        prompt: 'Create a blog post schema',
        currentSchema: { name: 'Existing Watch Schema', fields: [] },
      }),
      payload: {
        create: async () => ({ id: 'history-123' })
      }
    }

    const fetchCalls: any[] = []
    global.fetch = (async (url: string, options: any) => {
      fetchCalls.push([url, options])
      return {
        ok: true,
        json: async () => ({
          sessionId: 'session-789',
          status: 'completed',
          content_schema: { name: 'Luxury Watches', fields: [] },
        }),
      }
    }) as any

    const response = await (generateSchemaEndpoint.handler as any)(mockReq)
    expect(response.status).toBe(202)

    expect(fetchCalls.length).toBe(1)
    const [, options] = fetchCalls[0]
    const body = JSON.parse(options.body)
    expect(body.current_schema).toEqual({ name: 'Existing Watch Schema', fields: [] })
  })
})

describe('postSessionMessageEndpoint CMS Handler', () => {
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

    const response = await (postSessionMessageEndpoint.handler as any)(mockReq)
    const json = await response.json()

    expect(response.status).toBe(401)
    expect(json.error).toBe('Unauthorized')
  })

  it('should return 403 if user does not belong to a tenant', async () => {
    const mockReq: any = {
      user: {
        id: '123',
        collection: 'users',
      },
    }

    const response = await (postSessionMessageEndpoint.handler as any)(mockReq)
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

    const response = await (postSessionMessageEndpoint.handler as any)(mockReq)
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toBe('Session ID is required.')
  })

  it('should return 400 if prompt is missing or empty', async () => {
    const mockReq: any = {
      user: {
        id: '123',
        tenants: [{ tenant: '456' }],
        collection: 'users',
      },
      url: 'http://localhost:3000/api/content-types/sessions/session-xyz/message',
      json: async () => ({ prompt: '' }),
    }

    const response = await (postSessionMessageEndpoint.handler as any)(mockReq)
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toBe('prompt is required.')
  })

  it('should successfully proxy stream POST request to AI microservice', async () => {
    const mockReq: any = {
      user: {
        id: '123',
        tenants: [{ tenant: 'tenant-456' }],
        collection: 'users',
      },
      url: 'http://localhost:3000/api/content-types/sessions/session-xyz/message',
      json: async () => ({
        prompt: 'Add an image field',
        currentSchema: { name: 'Watch', fields: [] },
      }),
    }

    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: hello\n\n'))
        controller.close()
      }
    })
    const fetchCalls: any[] = []
    global.fetch = (async (url: string, options: any) => {
      fetchCalls.push([url, options])
      return {
        ok: true,
        body: mockStream,
      }
    }) as any

    const response = await (postSessionMessageEndpoint.handler as any)(mockReq)

    expect(response.status).toBe(200)
    expect(response.body).toBeDefined()
    const reader = response.body!.getReader()
    const { value } = await reader.read()
    expect(new TextDecoder().decode(value)).toBe('data: hello\n\n')

    expect(fetchCalls.length).toBe(1)
    const [url, options] = fetchCalls[0]
    expect(url).toContain('/api/ai/sessions/session-xyz/message')
    expect(options.method).toBe('POST')
    expect(options.headers['X-Internal-Secret']).toBeDefined()

    const body = JSON.parse(options.body)
    expect(body.prompt).toBe('Add an image field')
    expect(body.current_schema).toEqual({ name: 'Watch', fields: [] })
  })
})
