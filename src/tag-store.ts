/**
 * One observable tag map shared by the sidebar rows, the conversation header,
 * and the save face. A tiny store the slot components subscribe to through
 * `useSyncExternalStore`; the save face publishes into it before every POST so
 * both surfaces re-render together, and reverts a session's slice when the Host
 * refuses.
 *
 * Snapshots reuse unchanged per-session arrays — and every untagged session
 * reads one shared frozen empty slice — so a row whose session was not touched
 * keeps its selector's reference and does not re-render.
 *
 * @module dsh-session-tags/tag-store
 */
import type { SessionId, Tag, TagMap } from './types'

/** The tag store surface the slot components and the save face use. */
export interface TagStore {
  getSnapshot(): TagMap
  subscribe(listener: () => void): () => void
  tagsOf(sessionId: SessionId): readonly Tag[]
  replaceAll(tags: TagMap): void
  setSessionTags(sessionId: SessionId, tags: readonly Tag[]): void
  dispose(): void
}

/** One shared empty slice: untagged sessions keep a single stable reference. */
const EMPTY: readonly Tag[] = Object.freeze([])

/** Create one empty tag store. */
export function createTagStore(): TagStore {
  let snapshot: TagMap = {}
  const listeners = new Set<() => void>()
  const publish = (): void => {
    for (const listener of [...listeners]) {
      try {
        listener()
      } catch (error) {
        console.error('session-tags: tag store subscriber crashed:', error)
      }
    }
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    tagsOf(sessionId) {
      return snapshot[sessionId] ?? EMPTY
    },
    replaceAll(tags) {
      const next: Record<string, readonly Tag[]> = {}
      for (const [sessionId, value] of Object.entries(tags)) next[sessionId] = value.length === 0 ? EMPTY : value
      snapshot = next
      publish()
    },
    setSessionTags(sessionId, tags) {
      snapshot = { ...snapshot, [sessionId]: tags.length === 0 ? EMPTY : tags }
      publish()
    },
    dispose() {
      snapshot = {}
      listeners.clear()
    },
  }
}
