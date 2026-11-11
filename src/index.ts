/**
 * Host half of the session-tags bundle.
 *
 * Owns one `session_tags` storage domain — a schema-validated, durable KV unit
 * the Harness keeps under its configured storage root — and serves the whole
 * map through one authenticated GET route plus one POST route that replaces a
 * single Session's tag list. A startup sweep drops records whose Session has
 * neither a live Agent nor a stored log, so deleted Sessions leave no tags
 * behind.
 *
 * @module dsh-session-tags
 */
import { recordSchema } from './schema'
import type { TagRecord } from './types'

/** Authenticated GET route returning the whole tag map. */
const LIST_PATH = '/api/session.tags'

/** Authenticated POST route replacing one Session's tag list. */
const SET_PATH = '/api/session.tags.set'

/** The domain declaration: one `sessions` table of tag records. */
const domainSpec = {
  name: 'session_tags',
  version: 1,
  tables: { sessions: { valueSchema: recordSchema } },
}

/** One table of the opened domain, as far as this plugin reads it. */
interface DomainTable {
  get(key: string): TagRecord | undefined
  put(key: string, record: TagRecord): Promise<unknown>
  delete(key: string): Promise<unknown>
  entries(): IterableIterator<[string, TagRecord]>
}

/** The opened `session_tags` domain handle. */
interface DomainHandle {
  table(name: string): DomainTable
  close(): Promise<unknown>
}

/** The members of the Host context this plugin uses. */
export interface HostContext {
  readonly connection: {
    readonly fetch: {
      register(route: {
        path: string
        methods: string[]
        requestBody: 'buffered'
        fetch: (request: Request) => Promise<Response>
      }): () => void
    }
  }
  readonly storageDomain: { open(spec: unknown): Promise<DomainHandle> }
  readonly logger?: { warn?: (message: string) => void; info?: (message: string) => void }
  get(name: string): any
  effect(callback: () => (() => void) | void, label?: string): () => void
}

/** A lossless JSON result envelope. */
type Envelope = { ok: true; value: Record<string, unknown> } | { ok: false; error: { code: string; message: string } }

/** Services the routes need; the sweep's lookups stay optional. */
export const inject = ['connection', 'storageDomain']

/**
 * Open the storage domain, register both routes, then sweep records that
 * reference nothing.
 *
 * `connection.fetch.register` returns a Context effect of its own, so that call
 * is the registration: wrapping it in another `ctx.effect` would nest two. The
 * domain handle still closes through its own effect, so an unmounted plugin
 * releases the domain name promptly instead of waiting for the facility's
 * unmount pass.
 */
export function apply(ctx: HostContext): void {
  const ready = openDomain(ctx)
  ctx.effect(
    () => () => {
      void ready.then((domain) => domain?.close()).catch(() => {})
    },
    'session-tags: storage domain',
  )
  try {
    ctx.connection.fetch.register({
      path: LIST_PATH,
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: () => handleList(ready),
    })
    ctx.connection.fetch.register({
      path: SET_PATH,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: (request) => handleSet(ready, request),
    })
  } catch (error) {
    ctx.logger?.warn?.(`session-tags: route registration failed: ${messageOf(error)}`)
  }
  sweepDanglingTagRecords(ctx, ready).catch((error) => {
    ctx.logger?.warn?.(`session-tags: tag sweep failed: ${messageOf(error)}`)
  })
}

/** Open the `session_tags` domain; a failure logs and leaves both routes 503. */
async function openDomain(ctx: HostContext): Promise<DomainHandle | undefined> {
  try {
    return await ctx.storageDomain.open(domainSpec)
  } catch (error) {
    ctx.logger?.warn?.(`session-tags: storage domain unavailable: ${messageOf(error)}`)
    return undefined
  }
}

/** Answer the whole tag map. */
async function handleList(ready: Promise<DomainHandle | undefined>): Promise<Response> {
  const domain = await ready
  if (domain === undefined) return unavailable()
  const tags: Record<string, unknown> = {}
  for (const [sessionId, record] of domain.table('sessions').entries()) tags[sessionId] = record.tags
  return respond(200, { ok: true, value: { tags } })
}

/** Replace one Session's tag list. */
async function handleSet(ready: Promise<DomainHandle | undefined>, request: Request): Promise<Response> {
  let body: { sessionId?: unknown; tags?: unknown } | null
  try {
    body = (await request.json()) as { sessionId?: unknown; tags?: unknown }
  } catch {
    return respond(400, { ok: false, error: { code: 'bad-request', message: 'request body is not valid JSON' } })
  }
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : ''
  if (sessionId === '') {
    return respond(400, { ok: false, error: { code: 'bad-request', message: 'sessionId is required' } })
  }
  const parsed = recordSchema.safeParse({ tags: body?.tags })
  if (!parsed.success) {
    return respond(400, {
      ok: false,
      error: { code: 'invalid-tags', message: parsed.error.message },
    })
  }
  const domain = await ready
  if (domain === undefined) return unavailable()
  const tags = parsed.data.tags
  try {
    if (tags.length === 0) await domain.table('sessions').delete(sessionId)
    else await domain.table('sessions').put(sessionId, { tags })
  } catch (error) {
    return respond(500, { ok: false, error: { code: 'write-failed', message: messageOf(error) } })
  }
  return respond(200, { ok: true, value: { sessionId, tags } })
}

/** The storage-domain-unavailable response both routes share. */
function unavailable(): Response {
  return respond(503, {
    ok: false,
    error: { code: 'storage/unavailable', message: 'the tag storage domain is not open' },
  })
}

/**
 * Drop tag records that reference neither a live Agent nor a stored log. A
 * Session whose Agent still lives keeps its tags (that Session may only be
 * archived); once the log is gone the record is invisible cruft, so this pass
 * removes it. Without the persistence seam the sweep cannot tell a deleted
 * Session from an unlisted one, so it keeps everything rather than guess.
 */
async function sweepDanglingTagRecords(ctx: HostContext, ready: Promise<DomainHandle | undefined>): Promise<void> {
  const domain = await ready
  if (domain === undefined) return
  const persistence = ctx.get('sessionPersistence')
  if (persistence === undefined) return
  const table = domain.table('sessions')
  for (const [sessionId, record] of [...table.entries()]) {
    try {
      if (record.tags.length === 0) {
        await table.delete(sessionId)
        continue
      }
      if (ctx.get('agents')?.get(sessionId) !== undefined) continue
      if ((await persistence.stat(sessionId)) !== undefined) continue
      await table.delete(sessionId)
      ctx.logger?.info?.(`session-tags: removed tags of deleted session "${sessionId}"`)
    } catch (error) {
      ctx.logger?.warn?.(`session-tags: tag sweep kept "${sessionId}": ${messageOf(error)}`)
    }
  }
}

/** Build one JSON response. */
function respond(status: number, body: Envelope): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

/** Describe one failure. */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
