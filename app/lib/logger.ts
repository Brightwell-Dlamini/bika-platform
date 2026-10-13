/**
 * Structured logging for BIKA Platform.
 * Emits JSON-friendly lines for Vercel / container log aggregation.
 * Never logs secrets, tokens, or full PII bodies.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  requestId?: string;
  route?: string;
  userId?: string;
  role?: string;
  incidentId?: string;
  region?: string;
  [key: string]: unknown;
}

function emit(level: LogLevel, message: string, context?: LogContext) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    service: 'bika-platform',
    message,
    ...(context || {}),
  };

  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => emit('debug', message, context),
  info: (message: string, context?: LogContext) => emit('info', message, context),
  warn: (message: string, context?: LogContext) => emit('warn', message, context),
  error: (message: string, context?: LogContext) => emit('error', message, context),
};

/** Generate a short request correlation id for API routes. */
export function newRequestId(): string {
  return `bika-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
