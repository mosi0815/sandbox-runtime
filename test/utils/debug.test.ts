import { afterEach, describe, expect, test } from 'bun:test'
import { logForDebugging } from '../../src/utils/debug.js'

const originalDebug = process.env.SRT_DEBUG
const originalError = console.error
const originalWarn = console.warn

afterEach(() => {
  if (originalDebug === undefined) {
    delete process.env.SRT_DEBUG
  } else {
    process.env.SRT_DEBUG = originalDebug
  }
  console.error = originalError
  console.warn = originalWarn
})

describe('logForDebugging', () => {
  test('prefixes every line of multiline debug messages', () => {
    process.env.SRT_DEBUG = '1'
    const lines: string[] = []
    console.error = (line?: unknown) => {
      lines.push(String(line))
    }

    logForDebugging('{\n  "allowedHosts": [\n    "example.com"\n  ]\n}')

    expect(lines).toEqual([
      '[SandboxDebug] {',
      '[SandboxDebug]   "allowedHosts": [',
      '[SandboxDebug]     "example.com"',
      '[SandboxDebug]   ]',
      '[SandboxDebug] }',
    ])
  })
})
