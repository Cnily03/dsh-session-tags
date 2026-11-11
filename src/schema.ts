/**
 * Minimal zod-compatible record schema for the `session_tags` storage domain.
 * The Harness ships no public type package for plugins and the domain layer
 * consumes only a schema's `parse` (validating stored records at open), so this
 * hand-rolled validator keeps the bundle dependency-free while enforcing
 * exactly the stored shape: one `tags` array of preset-colored tags with
 * bounded ids, labels, and a pin flag. Records written before the pin flag
 * existed parse with `fixed: false`.
 *
 * @module dsh-session-tags/schema
 */

import type { PresetColor } from './locale'
import { MAX_ID_LENGTH, MAX_TAGS, MAX_TEXT_LENGTH, PRESET_COLORS } from './locale'
import type { Tag, TagRecord } from './types'

/** The zod-shaped surface the storage domain's open path calls. */
export interface RecordSchema {
  parse(raw: unknown): TagRecord
  safeParse(raw: unknown): { success: true; data: TagRecord } | { success: false; error: { message: string } }
}

/** Whether one value is a plain JSON object. */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Reject one value with a path-qualified message. */
function fail(path: string, reason: string): never {
  throw new Error(`tags${path}: ${reason}`)
}

/** Whether one string is a preset color key. */
const isPresetColor = (value: string): value is PresetColor => (PRESET_COLORS as readonly string[]).includes(value)

/** Validate one unknown as a single stored tag. */
const parseTag = (raw: unknown, index: number): Tag => {
  if (!isRecord(raw)) fail(`[${index}]`, 'expected a tag object')
  const { id, color, text, fixed } = raw
  if (typeof id !== 'string' || id.length < 1 || id.length > MAX_ID_LENGTH) {
    fail(`[${index}].id`, `expected a string of 1-${MAX_ID_LENGTH} characters`)
  }
  if (typeof color !== 'string' || !isPresetColor(color)) {
    fail(`[${index}].color`, 'expected one of the preset color keys')
  }
  if (typeof text !== 'string' || text.trim().length < 1 || text.length > MAX_TEXT_LENGTH) {
    fail(`[${index}].text`, `expected a string of 1-${MAX_TEXT_LENGTH} characters after trimming`)
  }
  if (fixed !== undefined && typeof fixed !== 'boolean') fail(`[${index}].fixed`, 'expected a boolean')
  return { id, color, text: text.trim(), fixed: fixed === true }
}

/** Validate one unknown as one whole stored record. */
const validate = (raw: unknown): TagRecord => {
  if (!isRecord(raw)) throw new Error('tags: expected a record object')
  const { tags } = raw
  if (!Array.isArray(tags)) fail('', 'expected an array')
  if (tags.length > MAX_TAGS) fail('', `expected at most ${MAX_TAGS} tags`)
  return { tags: tags.map((tag, index) => parseTag(tag, index)) }
}

/** Describe one failure. */
const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error))

/** The `session_tags` record schema. */
export const recordSchema: RecordSchema = {
  parse: (raw) => validate(raw),
  safeParse: (raw) => {
    try {
      return { success: true, data: validate(raw) }
    } catch (error) {
      return { success: false, error: { message: messageOf(error) } }
    }
  },
}
