import { validateContentItem } from '../../../src/collections/ContentItems/validation'

describe('ContentItems Dynamic Field Validator', () => {
  const mockSchema = {
    name: 'Luxury Watches',
    fields: [
      {
        name: 'title',
        type: 'text',
        required: true,
      },
      {
        name: 'price',
        type: 'number',
        required: false,
      },
      {
        name: 'brand',
        type: 'select',
        required: true,
        options: ['rolex', 'omega', 'patek'],
      },
      {
        name: 'serial_number',
        type: 'text',
        required: true,
        unique: true,
      },
      {
        name: 'in_stock',
        type: 'boolean',
        required: false,
      }
    ]
  }

  let findCalls: any[] = []
  let findResult: any = { docs: [] }

  const mockPayload: any = {
    find: async (query: any) => {
      findCalls.push(query)
      return findResult
    },
  }

  beforeEach(() => {
    findCalls = []
    findResult = { docs: [] }
  })

  it('should pass validation if all fields match their schema and uniqueness constraints are met', async () => {
    findResult = { docs: [] }

    const fieldsData = {
      title: 'Submariner 2026',
      price: 12500,
      brand: 'rolex',
      serial_number: 'SUB-12345',
      in_stock: true,
    }

    const errors = await validateContentItem(fieldsData, mockSchema, 'tenant-123', mockPayload)
    expect(errors).toEqual([])
  })

  it('should return errors for missing required fields', async () => {
    findResult = { docs: [] }

    const fieldsData = {
      price: 12500,
    }

    const errors = await validateContentItem(fieldsData, mockSchema, 'tenant-123', mockPayload)
    
    expect(errors).toContainEqual({ field: 'title', message: 'Field "title" is required.' })
    expect(errors).toContainEqual({ field: 'brand', message: 'Field "brand" is required.' })
    expect(errors).toContainEqual({ field: 'serial_number', message: 'Field "serial_number" is required.' })
  })

  it('should return errors for invalid types', async () => {
    findResult = { docs: [] }

    const fieldsData = {
      title: 'Submariner 2026',
      price: 'twelve thousand',
      brand: 'rolex',
      serial_number: 'SUB-12345',
      in_stock: 'yes',
    }

    const errors = await validateContentItem(fieldsData, mockSchema, 'tenant-123', mockPayload)
    
    expect(errors).toContainEqual({ field: 'price', message: 'Field "price" must be a number.' })
    expect(errors).toContainEqual({ field: 'in_stock', message: 'Field "in_stock" must be a boolean.' })
  })

  it('should return errors for invalid select options', async () => {
    findResult = { docs: [] }

    const fieldsData = {
      title: 'Submariner 2026',
      price: 12500,
      brand: 'seiko',
      serial_number: 'SUB-12345',
    }

    const errors = await validateContentItem(fieldsData, mockSchema, 'tenant-123', mockPayload)
    
    expect(errors).toContainEqual({
      field: 'brand',
      message: 'Field "brand" must be one of: rolex, omega, patek.',
    })
  })

  it('should return errors if unique field is already taken within the same tenant', async () => {
    findResult = {
      docs: [{ id: 'other-item-id', serial_number: 'SUB-12345' }]
    }

    const fieldsData = {
      title: 'Sea Dweller',
      price: 14000,
      brand: 'rolex',
      serial_number: 'SUB-12345',
    }

    const errors = await validateContentItem(fieldsData, mockSchema, 'tenant-123', mockPayload)
    
    expect(errors).toContainEqual({
      field: 'serial_number',
      message: 'Value "SUB-12345" for unique field "serial_number" is already taken.',
    })

    expect(findCalls.length).toBe(1)
    expect(findCalls[0]).toEqual({
      collection: 'content-items',
      where: {
        and: [
          { tenant: { equals: 'tenant-123' } },
          { 'fieldsData.serial_number': { equals: 'SUB-12345' } }
        ]
      },
      limit: 1,
      overrideAccess: true,
    })
  })

  it('should pass uniqueness validation if duplicate value belongs to a different tenant', async () => {
    findResult = { docs: [] }

    const fieldsData = {
      title: 'Sea Dweller',
      price: 14000,
      brand: 'rolex',
      serial_number: 'SUB-12345',
    }

    const errors = await validateContentItem(fieldsData, mockSchema, 'tenant-123', mockPayload)
    expect(errors).toEqual([])
  })

  it('should pass uniqueness validation if matching document is the current document being updated', async () => {
    findResult = {
      docs: [{ id: 'current-item-id', serial_number: 'SUB-12345' }]
    }

    const fieldsData = {
      title: 'Submariner 2026',
      price: 12500,
      brand: 'rolex',
      serial_number: 'SUB-12345',
    }

    const errors = await validateContentItem(fieldsData, mockSchema, 'tenant-123', mockPayload, 'current-item-id')
    expect(errors).toEqual([])
  })
})
