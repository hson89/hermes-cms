import { jest } from '@jest/globals'

const mockFind = jest.fn()
const mockCreate = jest.fn()
const mockUpdate = jest.fn()

const mockPayloadInstance = {
  find: mockFind,
  create: mockCreate,
  update: mockUpdate,
}

// Use unstable_mockModule for ESM mocking of third party and config modules
jest.unstable_mockModule('payload', () => ({
  getPayload: jest.fn().mockResolvedValue(mockPayloadInstance),
}))

jest.unstable_mockModule('../src/payload.config', () => ({
  default: {},
}))

describe('seed-default-templates script', () => {
  let mockExit: any

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock process.exit to not throw so that it resolves cleanly in microtasks
    mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
      return undefined as never
    })
  })

  afterEach(() => {
    mockExit.mockRestore()
  })

  it('should exit early if the default template already exists', async () => {
    mockFind.mockResolvedValue({
      docs: [
        {
          id: 'template-123',
          slug: 'aurelian-spectre-v12',
          isGlobal: true,
        },
      ],
    })

    await import('../src/scripts/seed-default-templates')

    // Wait for the asynchronous .then() promise chain to run
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(mockFind).toHaveBeenCalledWith(expect.objectContaining({
      collection: 'page-templates',
      where: {
        slug: { equals: 'aurelian-spectre-v12' },
        isGlobal: { equals: true },
      },
    }))
    expect(mockExit).toHaveBeenCalledWith(0)
    expect(mockCreate).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})
