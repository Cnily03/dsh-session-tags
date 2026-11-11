/**
 * Client half of the session-tags bundle. Registers read-only tag chips into
 * the sidebar session row (right of the row's time) and an editable chip row
 * into the conversation header (right of the title): header chips remove on
 * hover and reorder by drag, the trailing outline tag opens a popover with a
 * text field and the seven preset colors, and every save publishes through the
 * shared tag store first so both surfaces re-render together — the sidebar row
 * and the header stay in sync without a round trip.
 *
 * Loaded through `window.__ModuleLoader__.load`; `react`, `react-dom`, and the
 * shipped UI primitives are resolved at runtime through the injected `require`,
 * never bundled, so this stays a thin wrapper over the host's own components.
 *
 * @module dsh-session-tags/client
 */

import type { PresetColor } from './locale'
import { dictionaries, LIST_ROUTE, MAX_TAGS, MAX_TEXT_LENGTH, NS, PRESET_COLORS, SET_ROUTE } from './locale'
import { recordSchema } from './schema'
import {
  ADD_CLASS,
  CHIP_CLASS,
  CONFIRM_CLASS,
  CSS,
  HEADER_TAGS_CLASS,
  POP_CLASS,
  POP_INPUT_CLASS,
  REMOVE_CLASS,
  ROW_TAGS_CLASS,
  SWATCH_CLASS,
  SWATCHES_CLASS,
} from './styles'
import { createTagStore, type TagStore } from './tag-store'
import type { SaveOutcome, SessionId, SetTags, Tag, TagMap, Translate } from './types'

/** The runtime `require` the module loader injects. */
type Require = (id: string) => any

/** The sliver of the React runtime this bundle uses, typed so hooks keep generics. */
interface ReactLike {
  createElement(type: unknown, props?: unknown, ...children: unknown[]): unknown
  useState<S>(initial: S | (() => S)): [S, (next: S | ((prev: S) => S)) => void]
  useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void
  useLayoutEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void
  useCallback<T extends (...args: never[]) => unknown>(callback: T, deps: readonly unknown[]): T
  useRef<T>(initial: T): { current: T }
  useSyncExternalStore(
    subscribe: (listener: () => void) => () => void,
    getSnapshot: () => unknown,
    getServerSnapshot?: () => unknown,
  ): unknown
}

/** The sliver of `react-dom` the popover needs. */
interface ReactDOMLike {
  createPortal(children: unknown, container: Element): unknown
}

/** The drag events the chip handlers read. */
interface DragLike {
  readonly clientX: number
  readonly dataTransfer: {
    setData(type: string, value: string): void
    getData(type: string): string
    effectAllowed: string
    dropEffect: string
    readonly types: readonly string[]
  } | null
  preventDefault(): void
}

/** The pointer events the handlers read. */
interface ClickLike {
  stopPropagation(): void
}

/** The keyboard events the editor input reads. */
interface KeyLike {
  readonly key: string
  readonly shiftKey: boolean
  readonly nativeEvent: { readonly isComposing: boolean }
  preventDefault(): void
}

/** The change events the editor input reads. */
interface ChangeLike {
  readonly target: { readonly value: string }
}

/** The browser module-loader global the Harness exposes. */
declare global {
  interface Window {
    __ModuleLoader__: {
      load(entry: { id: string; factory: (require: Require) => unknown }): void
    }
  }
}

window.__ModuleLoader__.load({
  id: 'dsh-session-tags',
  factory(require) {
    const React = require('react') as ReactLike
    const createPortal = (require('react-dom') as ReactDOMLike).createPortal
    const h = React.createElement
    // The shell's static module table serves the shipped UI primitives, so the
    // tag controls reuse the exact Tooltip the native controls use — same
    // tooltip placement and timing — plus the icon glyphs and input shell.
    const primitives = require('@deepseek-ai/dsh-client-ui-primitives')
    const IconPlusOutlineRegular = primitives.IconPlusOutlineRegular
    const IconCloseOutlineRegular = primitives.IconCloseOutlineRegular
    const IconCheckOutlineRegular = primitives.IconCheckOutlineRegular
    const Tooltip = primitives.Tooltip
    const Input = primitives.Input

    /** One session's tags, subscribed through the shared store. */
    const useTags = (sessionId: SessionId, tagStore: TagStore): readonly Tag[] => {
      const selector = React.useCallback(() => tagStore.tagsOf(sessionId), [tagStore, sessionId])
      return React.useSyncExternalStore(tagStore.subscribe, selector) as readonly Tag[]
    }

    /** Mint one tag id. */
    const newId = (): string =>
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`

    interface RowTagsProps {
      readonly sessionId: SessionId
      readonly tagStore: TagStore
      readonly t: Translate
    }

    /**
     * The read-only chip cluster for one sidebar row, showing the session's
     * pinned tags. Plain spans only: no handlers, no drag, so the row's own
     * click-to-open and drag-to-reorder keep working through the cluster.
     */
    function SessionRowTags(props: RowTagsProps): unknown {
      const tags = useTags(props.sessionId, props.tagStore)
      const pinned = tags.filter((tag) => tag.fixed)
      if (pinned.length === 0) return null
      return h(
        'span',
        {
          className: ROW_TAGS_CLASS,
          'aria-label': props.t('row.tagsAria', { tags: pinned.map((tag) => tag.text).join(', ') }),
        },
        pinned.map((tag) =>
          h(
            'span',
            { key: tag.id, className: CHIP_CLASS, 'data-color': tag.color, 'data-fixed': 'true', title: tag.text },
            tag.text,
          ),
        ),
      )
    }

    interface ChipProps {
      readonly tag: Tag
      readonly t: Translate
      readonly dragging: boolean
      readonly drop: 'before' | 'after' | undefined
      readonly onToggleFixed: () => void
      readonly onRemove: () => void
      readonly onDragStart: (id: string) => void
      readonly onDragEnd: () => void
      readonly onDragOver: (id: string, side: 'before' | 'after') => void
      readonly onDrop: (draggedId: string, targetId: string, side: 'before' | 'after') => void
    }

    /**
     * One header chip: label, hover remove, drag-to-reorder wiring, and the
     * pin toggle. Clicking the chip flips its pin — the shading deepens and
     * the sidebar row starts (or stops) showing it; a drag that moves the chip
     * suppresses the click, so reordering never toggles.
     */
    function TagChip(props: ChipProps): unknown {
      const { tag, t } = props
      const chipRef = React.useRef<HTMLElement | null>(null)
      const sideOf = (event: DragLike): 'before' | 'after' => {
        const rect = chipRef.current?.getBoundingClientRect()
        if (rect === undefined) return 'after'
        return event.clientX < rect.left + rect.width / 2 ? 'before' : 'after'
      }
      return h(
        Tooltip,
        {
          label: t(tag.fixed ? 'chip.unfixTitle' : 'chip.fixTitle', { text: tag.text }),
          side: 'bottom',
          delayMs: 500,
          portal: true,
        },
        h(
          'span',
          {
            ref: chipRef,
            className: CHIP_CLASS,
            'data-color': tag.color,
            'data-fixed': tag.fixed ? 'true' : undefined,
            'data-dragging': props.dragging ? 'true' : undefined,
            'data-drop': props.drop,
            draggable: true,
            'aria-pressed': tag.fixed ? 'true' : 'false',
            'aria-label': t('chip.fixAria', { text: tag.text }),
            onClick: (event: ClickLike) => {
              event.stopPropagation()
              props.onToggleFixed()
            },
            onDragStart: (event: DragLike) => {
              if (event.dataTransfer !== null) {
                event.dataTransfer.setData('application/x-dsh-session-tag', tag.id)
                event.dataTransfer.effectAllowed = 'move'
              }
              props.onDragStart(tag.id)
            },
            onDragEnd: props.onDragEnd,
            onDragOver: (event: DragLike) => {
              if (event.dataTransfer === null) return
              if (!event.dataTransfer.types.includes('application/x-dsh-session-tag')) return
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
              props.onDragOver(tag.id, sideOf(event))
            },
            onDrop: (event: DragLike) => {
              const draggedId = event.dataTransfer?.getData('application/x-dsh-session-tag')
              if (draggedId === null || draggedId === undefined || draggedId === '') return
              event.preventDefault()
              props.onDrop(draggedId, tag.id, sideOf(event))
            },
          },
          tag.text,
          h(
            'button',
            {
              type: 'button',
              className: REMOVE_CLASS,
              'aria-label': t('chip.removeAria', { text: tag.text }),
              onClick: (event: ClickLike) => {
                event.stopPropagation()
                props.onRemove()
              },
            },
            h(IconCloseOutlineRegular, { size: 10 }),
          ),
        ),
      )
    }

    interface EditorProps {
      readonly anchor: Element | null
      readonly atCap: boolean
      readonly t: Translate
      readonly onAdd: (text: string, color: PresetColor) => void
      readonly onClose: () => void
    }

    /**
     * The add-tag popover: a text field, the seven preset swatches, and the
     * confirm action, anchored just under the add button. Escape closes, a
     * pointerdown outside closes, Enter adds (IME-safe), and a successful add
     * clears the field and keeps the popover open for the next tag.
     */
    function TagEditorPopover(props: EditorProps): unknown {
      const [text, setText] = React.useState('')
      const [color, setColor] = React.useState<PresetColor>(PRESET_COLORS[0])
      const panelRef = React.useRef<HTMLDivElement | null>(null)
      const inputRef = React.useRef<HTMLInputElement | null>(null)
      const trimmed = text.trim()

      const rect = props.anchor?.getBoundingClientRect()
      const style =
        rect === undefined
          ? {}
          : {
              top: `${Math.round(rect.bottom + 6)}px`,
              left: `${Math.max(8, Math.min(rect.left, window.innerWidth - 264))}px`,
            }

      React.useLayoutEffect(() => {
        inputRef.current?.focus()
      }, [])

      React.useEffect(() => {
        const onPointerDown = (event: PointerEvent): void => {
          const target = event.target
          if (target instanceof Node && panelRef.current?.contains(target) === true) return
          if (target instanceof Node && props.anchor?.contains(target) === true) return
          props.onClose()
        }
        document.addEventListener('pointerdown', onPointerDown, true)
        return () => {
          document.removeEventListener('pointerdown', onPointerDown, true)
        }
      }, [props.anchor, props.onClose])

      const submit = (): void => {
        if (trimmed === '' || trimmed.length > MAX_TEXT_LENGTH || props.atCap) return
        props.onAdd(trimmed, color)
        setText('')
        inputRef.current?.focus()
      }

      const onKeyDown = (event: KeyLike): void => {
        if (event.key === 'Escape') {
          event.preventDefault()
          props.onClose()
          return
        }
        if (event.key !== 'Enter' || event.shiftKey) return
        if (event.nativeEvent.isComposing || Reflect.get(event.nativeEvent, 'keyCode') === 229) return
        event.preventDefault()
        submit()
      }

      return createPortal(
        h(
          'div',
          { ref: panelRef, className: POP_CLASS, style, role: 'dialog', 'aria-label': props.t('header.addTitle') },
          h(Input, {
            ref: inputRef,
            className: POP_INPUT_CLASS,
            value: text,
            placeholder: props.t('editor.placeholder'),
            maxLength: MAX_TEXT_LENGTH,
            autoFocus: true,
            onChange: (event: ChangeLike) => {
              setText(event.target.value)
            },
            onKeyDown,
          }),
          h(
            'span',
            { className: SWATCHES_CLASS, role: 'group' },
            PRESET_COLORS.map((preset) =>
              h(
                'button',
                {
                  key: preset,
                  type: 'button',
                  className: SWATCH_CLASS,
                  'data-color': preset,
                  'aria-pressed': color === preset ? 'true' : 'false',
                  'aria-label': props.t('editor.colorAria', { color: preset }),
                  onClick: () => {
                    setColor(preset)
                  },
                },
                color === preset ? h(IconCheckOutlineRegular, { size: 12 }) : null,
              ),
            ),
          ),
          h(
            'button',
            {
              type: 'button',
              className: CONFIRM_CLASS,
              disabled: trimmed === '' || props.atCap,
              title: props.atCap ? props.t('editor.limitAria', { count: String(MAX_TAGS) }) : undefined,
              onClick: submit,
            },
            props.t('editor.add'),
          ),
        ),
        document.body,
      )
    }

    interface HeaderTagsProps {
      readonly sessionId: SessionId
      readonly tagStore: TagStore
      readonly saveTags: SetTags
      readonly t: Translate
    }

    /**
     * The editable chip cluster for one conversation header. Every mutation
     * goes through `saveTags`, which publishes the next list into the shared
     * store before the POST — so the sidebar row for the same session
     * re-renders immediately — and reverts on refusal. New tags start
     * unpinned; clicking a chip pins it, deepening its shade and putting it
     * on the session's sidebar row.
     */
    function SessionHeaderTags(props: HeaderTagsProps): unknown {
      const tags = useTags(props.sessionId, props.tagStore)
      const [draggingId, setDraggingId] = React.useState<string | null>(null)
      const [dropTarget, setDropTarget] = React.useState<{ id: string; side: 'before' | 'after' } | null>(null)
      const [editorOpen, setEditorOpen] = React.useState(false)
      const addButtonRef = React.useRef<HTMLButtonElement | null>(null)

      const commit = (next: readonly Tag[]): void => {
        void props.saveTags(props.sessionId, next)
      }

      const addTag = (text: string, color: PresetColor): void => {
        commit([...tags, { id: newId(), color, text, fixed: false }])
      }

      const toggleFixed = (id: string): void => {
        commit(tags.map((tag) => (tag.id === id ? { ...tag, fixed: !tag.fixed } : tag)))
      }

      const reorder = (draggedId: string, targetId: string, side: 'before' | 'after'): void => {
        if (draggedId === targetId) return
        const dragged = tags.find((tag) => tag.id === draggedId)
        if (dragged === undefined) return
        const rest = tags.filter((tag) => tag.id !== draggedId)
        const targetIndex = rest.findIndex((tag) => tag.id === targetId)
        if (targetIndex < 0) return
        const index = side === 'before' ? targetIndex : targetIndex + 1
        commit([...rest.slice(0, index), dragged, ...rest.slice(index)])
      }

      return h(
        'span',
        { className: HEADER_TAGS_CLASS },
        tags.map((tag) =>
          h(TagChip, {
            key: tag.id,
            tag,
            t: props.t,
            dragging: draggingId === tag.id,
            drop: dropTarget?.id === tag.id ? dropTarget.side : undefined,
            onToggleFixed: () => {
              toggleFixed(tag.id)
            },
            onRemove: () => {
              commit(tags.filter((tag2) => tag2.id !== tag.id))
            },
            onDragStart: setDraggingId,
            onDragEnd: () => {
              setDraggingId(null)
              setDropTarget(null)
            },
            onDragOver: (id: string, side: 'before' | 'after') => {
              setDropTarget({ id, side })
            },
            onDrop: (draggedId: string, targetId: string, side: 'before' | 'after') => {
              reorder(draggedId, targetId, side)
              setDraggingId(null)
              setDropTarget(null)
            },
          }),
        ),
        h(
          Tooltip,
          { label: props.t('header.addTitle'), side: 'bottom', delayMs: 500, portal: true },
          h(
            'button',
            {
              type: 'button',
              ref: addButtonRef,
              className: ADD_CLASS,
              'aria-label': props.t('header.addAria'),
              'aria-expanded': editorOpen ? 'true' : 'false',
              onClick: (event: ClickLike) => {
                event.stopPropagation()
                setEditorOpen((open) => !open)
              },
            },
            h(IconPlusOutlineRegular, { size: 12 }),
          ),
        ),
        editorOpen
          ? h(TagEditorPopover, {
              anchor: addButtonRef.current,
              atCap: tags.length >= MAX_TAGS,
              t: props.t,
              onAdd: addTag,
              onClose: () => {
                setEditorOpen(false)
              },
            })
          : null,
      )
    }

    /**
     * Read the whole tag map from the Host once, then publish it into the
     * store. A save that started before the snapshot landed keeps its session:
     * that session's optimistic publication is newer than the snapshot's copy.
     */
    const loadTags = (store: TagStore, saveRevisions: Map<SessionId, number>): void => {
      fetch(LIST_ROUTE, { headers: { accept: 'application/json' } })
        .then((response) => (response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`))))
        .then((payload: any) => {
          if (payload?.ok === true && payload.value?.tags !== null && typeof payload.value?.tags === 'object') {
            const loaded = payload.value.tags as TagMap
            const next: Record<string, readonly Tag[]> = { ...loaded }
            for (const sessionId of saveRevisions.keys()) next[sessionId] = store.tagsOf(sessionId)
            store.replaceAll(next)
          }
        })
        .catch((error: unknown) => {
          console.error('session-tags: loading tags failed:', error)
        })
    }

    interface ClientContext {
      locale: {
        bind(ns: string): Translate
        register(ns: string, dicts: Record<string, Record<string, string>>): () => void
      }
      slots: {
        inject(name: string, factory: () => unknown): () => void
        register(options: Record<string, unknown>, component: unknown): unknown
      }
      effect(callback: () => (() => void) | void, label?: string): () => void
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx: ClientContext) {
        const store = createTagStore()
        const saveRevisions = new Map<SessionId, number>()

        ctx.effect(() => ctx.locale.register(NS, dictionaries), 'session-tags: dictionaries')

        ctx.effect(() => {
          const tag = document.createElement('style')
          tag.dataset.plugin = 'dsh-session-tags'
          tag.dataset.pluginCss = 'dsh-session-tags/session-tags.css'
          tag.textContent = CSS
          document.head.appendChild(tag)
          return () => {
            tag.remove()
          }
        }, 'session-tags: styles')

        ctx.effect(() => () => store.dispose(), 'session-tags: tag store')

        loadTags(store, saveRevisions)

        /**
         * Replace one Session's tag list through the authenticated Host route.
         * The list is validated locally with the same schema the Host enforces,
         * so an over-limit tag never publishes or reaches the wire. The
         * optimistic publication happens next so both surfaces re-render at
         * once; a refusal or failure reverts this session's slice — but only
         * when no newer save has started, so a stale failure cannot clobber a
         * list a later save already published.
         */
        const saveTags: SetTags = async (sessionId, tags) => {
          const parsed = recordSchema.safeParse({ tags })
          if (!parsed.success) {
            console.error(`session-tags: refusing to save invalid tags for "${sessionId}": ${parsed.error.message}`)
            return { ok: false } satisfies SaveOutcome
          }
          const next = parsed.data.tags
          const previous = store.tagsOf(sessionId)
          const revision = (saveRevisions.get(sessionId) ?? 0) + 1
          saveRevisions.set(sessionId, revision)
          store.setSessionTags(sessionId, next)
          let reason = ''
          try {
            const response = await fetch(SET_ROUTE, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ sessionId, tags: next }),
            })
            let payload: any = null
            try {
              payload = await response.json()
            } catch {
              payload = null
            }
            if (response.ok && payload?.ok === true) return { ok: true }
            reason =
              payload !== null && payload.error !== undefined
                ? String(payload.error.message ?? payload.error.code)
                : `HTTP ${response.status}`
          } catch (error) {
            reason = error instanceof Error ? error.message : String(error)
          }
          console.error(`session-tags: saving tags for "${sessionId}" failed: ${reason}`)
          if (saveRevisions.get(sessionId) === revision) store.setSessionTags(sessionId, previous)
          return { ok: false } satisfies SaveOutcome
        }

        ctx.slots.inject('sidebar.session.row.trailing', () =>
          ctx.slots.register(
            {
              name: 'sidebar.session.row.trailing',
              id: 'session-tags',
              order: 100,
              locale: NS,
              inject: () => ({ tagStore: store }),
            },
            SessionRowTags,
          ),
        )

        ctx.slots.inject('conversation.session.header.actions', () =>
          ctx.slots.register(
            {
              name: 'conversation.session.header.actions',
              id: 'session-tags',
              order: 500,
              locale: NS,
              inject: () => ({ tagStore: store, saveTags }),
            },
            SessionHeaderTags,
          ),
        )
      },
    }
  },
})
