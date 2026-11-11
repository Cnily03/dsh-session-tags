/**
 * Minimal structural types for the DeepSeek Harness runtime seams this plugin
 * touches. The Harness ships no public type package for plugins, so these cover
 * only the members used here — enough for a strict build, not a full model.
 *
 * @module dsh-session-tags/types
 */
import type { PresetColor } from './locale'

/** A branded Session id string. */
export type SessionId = string

/** The two shipped UI languages this plugin localizes. */
export type Locale = 'en' | 'zh'

/** A flat message dictionary keyed by dotted message id. */
export type Dictionary = Record<string, string>

/** Locale interpolation parameters. */
export type LocaleParams = Record<string, string>

/** The bound translator returned by `ctx.locale.bind`. */
export type Translate = (key: string, params?: LocaleParams) => string

/** One tag on one Session: a stable id, a preset color key, the label, and
 * whether the tag is pinned to the sidebar session list. */
export interface Tag {
  readonly id: string
  readonly color: PresetColor
  readonly text: string
  readonly fixed: boolean
}

/** Every Session's tags, keyed by Session id. */
export type TagMap = Record<SessionId, readonly Tag[]>

/** The record shape stored in the `session_tags` domain, per Session id. */
export interface TagRecord {
  readonly tags: readonly Tag[]
}

/** The outcome the client save face resolves to. */
export interface SaveOutcome {
  readonly ok: boolean
}

/** Replace one Session's whole tag list; resolves whether the Host accepted it. */
export type SetTags = (sessionId: SessionId, tags: readonly Tag[]) => Promise<SaveOutcome>
