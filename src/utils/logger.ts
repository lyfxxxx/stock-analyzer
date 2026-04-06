type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  timestamp: string
  level: LogLevel
  module: string
  message: string
  context?: unknown
}

const isProduction = import.meta.env.PROD

function formatTimestamp(): string {
  return new Date().toISOString()
}

function formatLog(entry: LogEntry): string {
  const ctx = entry.context !== undefined ? ` ${JSON.stringify(entry.context)}` : ''
  return `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.module}] ${entry.message}${ctx}`
}

function log(level: LogLevel, module: string, message: string, context?: unknown): void {
  // Disable debug logs in production
  if (level === 'debug' && isProduction) return

  const entry: LogEntry = {
    timestamp: formatTimestamp(),
    level,
    module,
    message,
    context,
  }

  const formatted = formatLog(entry)

  switch (level) {
    case 'debug':
      console.debug(formatted)
      break
    case 'info':
      console.info(formatted)
      break
    case 'warn':
      console.warn(formatted)
      break
    case 'error':
      console.error(formatted)
      break
  }
}

export const logger = {
  debug: (module: string, message: string, context?: unknown) => log('debug', module, message, context),
  info: (module: string, message: string, context?: unknown) => log('info', module, message, context),
  warn: (module: string, message: string, context?: unknown) => log('warn', module, message, context),
  error: (module: string, message: string, context?: unknown) => log('error', module, message, context),
}
