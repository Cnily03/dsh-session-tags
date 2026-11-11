/**
 * Shared constants and the bilingual message dictionaries for the tag
 * surfaces. Imported by both halves so the namespace, routes, palette, and
 * limits never drift.
 *
 * @module dsh-session-tags/locale
 */
import type { Dictionary, Locale } from './types'

/** Locale namespace registered with `ctx.locale.register`. */
export const NS = 'sessionTags'

/** Authenticated Host route the client reads the whole tag map from. */
export const LIST_ROUTE = 'api/session.tags'

/** Authenticated Host route the client writes one Session's tag list to. */
export const SET_ROUTE = 'api/session.tags.set'

/** Preset color keys, in palette order. */
export const PRESET_COLORS = ['deepseek', 'blue', 'violet', 'red', 'amber', 'green', 'neutral'] as const

/** One key of {@link PRESET_COLORS}. */
export type PresetColor = (typeof PRESET_COLORS)[number]

/** Most tags one Session may carry. */
export const MAX_TAGS = 32

/** Most characters a tag label may carry after trimming. */
export const MAX_TEXT_LENGTH = 32

/** Most characters a tag id may carry. */
export const MAX_ID_LENGTH = 64

const en: Dictionary = {
  'row.tagsAria': 'Session tags: {tags}',
  'header.addTitle': 'Add tag',
  'header.addAria': 'Add a tag to this session',
  'editor.placeholder': 'Tag text',
  'editor.add': 'Add',
  'editor.limitAria': 'At most {count} tags per session',
  'editor.colorAria': 'Color: {color}',
  'chip.removeAria': 'Remove tag {text}',
  'chip.fixAria': 'Toggle pinning tag {text} to the session list',
  'chip.fixTitle': 'Pin to the session list',
  'chip.unfixTitle': 'Unpin from the session list',
}

const zh: Dictionary = {
  'row.tagsAria': '会话标签：{tags}',
  'header.addTitle': '添加标签',
  'header.addAria': '为此会话添加标签',
  'editor.placeholder': '标签文字',
  'editor.add': '添加',
  'editor.limitAria': '每个会话最多 {count} 个标签',
  'editor.colorAria': '颜色：{color}',
  'chip.removeAria': '移除标签 {text}',
  'chip.fixAria': '切换标签 {text} 在会话列表的固定状态',
  'chip.fixTitle': '固定到会话列表',
  'chip.unfixTitle': '从会话列表取消固定',
}

/** The two shipped-language dictionaries, keyed by locale. */
export const dictionaries: Record<Locale, Dictionary> = { en, zh }
