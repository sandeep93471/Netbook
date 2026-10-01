import pino from 'pino'

// Structured JSON logging — every line is machine-parseable (level, msg, reqId,
// latency). In development we pretty-print if pino-pretty is installed; in
// production plain JSON is what log aggregators (Render/Datadog) expect.
const isProd = process.env.NODE_ENV === 'production'

let transport
if (!isProd) {
  try {
    await import('pino-pretty') // resolves only if the devDep is installed
    transport = {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
    }
  } catch {
    transport = undefined // plain JSON is fine too — never crash over cosmetics
  }
}

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  transport,
  base: { service: 'netbook-api' },
})
