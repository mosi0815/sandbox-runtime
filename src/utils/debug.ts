/**
 * Simple debug logging for standalone sandbox
 */
export function logForDebugging(
  message: string,
  options?: { level?: 'info' | 'error' | 'warn' },
): void {
  // Only log if SRT_DEBUG environment variable is set
  // Using SRT_DEBUG instead of DEBUG to avoid conflicts with other tools
  // (DEBUG is commonly used by Node.js debug libraries and VS Code)
  if (!process.env.SRT_DEBUG) {
    return
  }

  const level = options?.level || 'info'
  const prefix = '[SandboxDebug]'
  const lines = message.split('\n')

  // Always use stderr to avoid corrupting stdout JSON streams
  const write =
    level === 'warn'
      ? (line: string) => console.warn(line)
      : (line: string) => console.error(line)
  for (const line of lines) {
    write(`${prefix} ${line}`)
  }
}
