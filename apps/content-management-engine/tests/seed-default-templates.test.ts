import { jest } from '@jest/globals'

const mockFind = jest.fn()
const mockCreate = jest.fn().mockResolvedValue({ id: 'created-id' })
const mockUpdate = jest.fn().mockResolvedValue({ id: 'updated-id' })
const mockDelete = jest.fn().mockResolvedValue({ id: 'deleted-id' })

const mockPayloadInstance = {
  find: mockFind,
  create: mockCreate,
  update: mockUpdate,
  delete: mockDelete,
}

// Use unstable_mockModule for ESM mocking of third party and config modules
jest.unstable_mockModule('payload', () => ({
  getPayload: jest.fn().mockResolvedValue(mockPayloadInstance),
}))

jest.unstable_mockModule('../src/payload.config', () => ({
  default: {},
}))

describe('seed-default-templates script', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should create or update the default template if it already exists', async () => {
    mockFind.mockResolvedValue({
      docs: [
        {
          id: 'template-123',
          slug: 'aurelian-spectre-v12',
          isGlobal: true,
        },
      ],
    })

    const { seed } = await import('../src/scripts/seed-default-templates')
    await seed()

    expect(mockFind).toHaveBeenCalledWith(expect.objectContaining({
      collection: 'page-templates',
      where: {
        slug: { equals: 'aurelian-spectre-v12' },
        isGlobal: { equals: true },
      },
    }))
    expect(mockCreate).toHaveBeenCalled()
    expect(mockUpdate).toHaveBeenCalled()
  })
})
