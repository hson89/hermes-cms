import { describe, it, expect, jest } from '@jest/globals'

describe('Schema Change Auto-Detection Logic', () => {
  it('should not notify on initial load (transition from null)', () => {
    let lastSchema: any = null
    const currentSchema = [{ name: 'title', type: 'text' }]
    const appendMock = jest.fn()
    
    // Simulate useEffect behavior
    const triggerEffect = (schemaVal: any) => {
      if (lastSchema !== null && schemaVal) {
        const oldFieldsStr = JSON.stringify(lastSchema)
        const newFieldsStr = JSON.stringify(schemaVal)
        if (oldFieldsStr !== newFieldsStr) {
          appendMock({
            role: 'user',
            content: [{ type: 'text', text: 'The content type schema has been updated. Please revise the plan to match the new schema fields and update the draft accordingly.' }]
          })
        }
      }
      if (schemaVal) {
        lastSchema = schemaVal
      }
    }

    triggerEffect(currentSchema)
    expect(appendMock).not.toHaveBeenCalled()
    expect(lastSchema).toEqual(currentSchema)
  })

  it('should notify when schema actually changes post-load', () => {
    let lastSchema: any = [{ name: 'title', type: 'text' }]
    const currentSchema = [{ name: 'title', type: 'text' }, { name: 'body', type: 'richText' }]
    const appendMock = jest.fn()
    
    const triggerEffect = (schemaVal: any) => {
      if (lastSchema !== null && schemaVal) {
        const oldFieldsStr = JSON.stringify(lastSchema)
        const newFieldsStr = JSON.stringify(schemaVal)
        if (oldFieldsStr !== newFieldsStr) {
          appendMock({
            role: 'user',
            content: [{ type: 'text', text: 'The content type schema has been updated. Please revise the plan to match the new schema fields and update the draft accordingly.' }]
          })
        }
      }
      if (schemaVal) {
        lastSchema = schemaVal
      }
    }

    triggerEffect(currentSchema)
    expect(appendMock).toHaveBeenCalledTimes(1)
    expect(lastSchema).toEqual(currentSchema)
  })

  it('should notify when schemaSwitched is true and historyLoaded becomes true', () => {
    const appendMock = jest.fn()
    const onSchemaSwitchedSentMock = jest.fn()
    
    // Simulate the useEffect hook for schemaSwitched
    const triggerSchemaSwitchedEffect = (
      schemaSwitched: boolean,
      historyLoaded: boolean,
      isRunning: boolean
    ) => {
      if (schemaSwitched && historyLoaded && !isRunning) {
        appendMock({
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'The content type schema has been updated. Please revise the plan to match the new schema fields and update the draft accordingly.',
            },
          ],
        })
        onSchemaSwitchedSentMock()
      }
    }

    // 1. Should not notify if history is not loaded yet
    triggerSchemaSwitchedEffect(true, false, false)
    expect(appendMock).not.toLocaleString()
    expect(onSchemaSwitchedSentMock).not.toHaveBeenCalled()

    // 2. Should not notify if isRunning is true (actively generating)
    triggerSchemaSwitchedEffect(true, true, true)
    expect(appendMock).not.toLocaleString()
    expect(onSchemaSwitchedSentMock).not.toHaveBeenCalled()

    // 3. Should notify once history is loaded and not running
    triggerSchemaSwitchedEffect(true, true, false)
    expect(appendMock).toHaveBeenCalledTimes(1)
    expect(onSchemaSwitchedSentMock).toHaveBeenCalledTimes(1)
  })
})
