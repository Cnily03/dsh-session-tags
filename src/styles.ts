/**
 * The plugin's only stylesheet. Both chip surfaces replicate the shipped tag
 * metrics from theme tokens — instead of depending on a hashed CSS-module class
 * that changes between Harness versions — and paint every preset color through
 * one `--adst-c` custom property that the theme's static palette feeds, so the
 * same markup reads correctly in light and dark themes. The add-tag editor
 * rides the shipped Menu surface, so this file only sizes and lays out the form
 * inside it; the remove affordance and the drag markers follow the same
 * token-only rule. Every color comes from a theme token or a color-mix over one.
 *
 * @module dsh-session-tags/styles
 */

/** Plugin-owned, version-stable class for the sidebar tag cluster. */
export const ROW_TAGS_CLASS = 'adst_rowTags'

/** Plugin-owned, version-stable class for the header tag cluster. */
export const HEADER_TAGS_CLASS = 'adst_headerTags'

/** Plugin-owned, version-stable class for one colored tag chip. */
export const CHIP_CLASS = 'adst_chip'

/** Plugin-owned, version-stable class for the chip's hover remove button. */
export const REMOVE_CLASS = 'adst_remove'

/** Plugin-owned, version-stable class for the bordered add-tag button. */
export const ADD_CLASS = 'adst_add'

/** Plugin-owned, version-stable class for the add-tag panel. */
export const POP_CLASS = 'adst_pop'

/** Milliseconds of the panel's enter/exit fade; the close guard matches it. */
export const POP_ANIMATION_MS = 120

/** Plugin-owned, version-stable class laying out the add-tag form body. */
export const POP_BODY_CLASS = 'adst_popBody'

/** Plugin-owned, version-stable class for the chip's leading pin glyph. */
export const PIN_CLASS = 'adst_pin'

/** Plugin-owned, version-stable class for the chip's label wrapper. */
export const TEXT_CLASS = 'adst_text'

/** Plugin-owned, version-stable class for the popover's text input. */
export const POP_INPUT_CLASS = 'adst_popInput'

/** Plugin-owned, version-stable class for the popover's swatch row. */
export const SWATCHES_CLASS = 'adst_swatches'

/** Plugin-owned, version-stable class for one popover color swatch. */
export const SWATCH_CLASS = 'adst_swatch'

/** Plugin-owned, version-stable class for the popover's confirm button. */
export const CONFIRM_CLASS = 'adst_confirm'

/** The injected stylesheet text. */
export const CSS = [
  // Both tinted surfaces share one color variable fed by the theme's static
  // palette; each preset picks a light shade and a dark shade, exactly as the
  // shipped state aliases do.
  '.adst_chip,.adst_swatch{--adst-c:var(--dsw-static-neutral-550)}',
  '.adst_chip[data-color="deepseek"],.adst_swatch[data-color="deepseek"]{--adst-c:var(--dsw-static-deepseek-500)}',
  '.adst_chip[data-color="blue"],.adst_swatch[data-color="blue"]{--adst-c:var(--dsw-static-blue-600)}',
  '.adst_chip[data-color="violet"],.adst_swatch[data-color="violet"]{--adst-c:var(--dsw-static-violet-600)}',
  '.adst_chip[data-color="red"],.adst_swatch[data-color="red"]{--adst-c:var(--dsw-static-red-600)}',
  '.adst_chip[data-color="amber"],.adst_swatch[data-color="amber"]{--adst-c:var(--dsw-static-amber-600)}',
  '.adst_chip[data-color="green"],.adst_swatch[data-color="green"]{--adst-c:var(--dsw-static-green-500)}',
  '.adst_chip[data-color="neutral"],.adst_swatch[data-color="neutral"]{--adst-c:var(--dsw-static-neutral-550)}',
  'body[data-ds-dark-theme] .adst_chip,body[data-ds-dark-theme] .adst_swatch{--adst-c:var(--dsw-static-neutral-400)}',
  'body[data-ds-dark-theme] .adst_chip[data-color="deepseek"],body[data-ds-dark-theme] .adst_swatch[data-color="deepseek"]{--adst-c:var(--dsw-static-deepseek-400)}',
  'body[data-ds-dark-theme] .adst_chip[data-color="blue"],body[data-ds-dark-theme] .adst_swatch[data-color="blue"]{--adst-c:var(--dsw-static-blue-400)}',
  'body[data-ds-dark-theme] .adst_chip[data-color="violet"],body[data-ds-dark-theme] .adst_swatch[data-color="violet"]{--adst-c:var(--dsw-static-violet-400)}',
  'body[data-ds-dark-theme] .adst_chip[data-color="red"],body[data-ds-dark-theme] .adst_swatch[data-color="red"]{--adst-c:var(--dsw-static-red-400)}',
  'body[data-ds-dark-theme] .adst_chip[data-color="amber"],body[data-ds-dark-theme] .adst_swatch[data-color="amber"]{--adst-c:var(--dsw-static-amber-400)}',
  'body[data-ds-dark-theme] .adst_chip[data-color="green"],body[data-ds-dark-theme] .adst_swatch[data-color="green"]{--adst-c:var(--dsw-static-green-400)}',
  // Sidebar cluster: tags sit right of the row's time inside the row's resting
  // span, at their natural width — the row's own title (flex:1, ellipsized)
  // yields the room, exactly as it does for the time and pin cells. A
  // percentage cap here would resolve against the resting span's
  // shrink-to-fit width and degenerate to about one chip, so none is set.
  '.adst_rowTags{box-sizing:border-box;display:inline-flex;align-items:center;gap:4px;flex:none}',
  // Header cluster: chips follow the title cluster's inline rhythm.
  '.adst_headerTags{box-sizing:border-box;display:inline-flex;align-items:center;gap:4px;flex:none;min-width:0}',
  // One chip, one style, both surfaces: the header metrics (11px/17px label in
  // a 20px pill body) with the small radius this plugin calls for, painted as
  // a light 12% tint under the preset's own color. A pinned chip keeps that
  // same quiet paint and leads with the shipped pin glyph — presence, not
  // loudness, carries the state. The chip's 0.25rem padding and 0.1rem gap
  // frame the row, the label adds its own 0.1rem, and the glyphs add nothing;
  // only the interactive header chip takes a pointer, through a self-contained
  // attribute selector rather than a combinator.
  '.adst_chip{box-sizing:border-box;display:inline-flex;align-items:center;gap:0.1rem;height:20px;',
  'padding:0 0.25rem;border-radius:var(--dsw-radius-xs);font-size:11px;line-height:17px;font-weight:500;',
  'white-space:nowrap;flex:none;background:color-mix(in srgb,var(--adst-c) 12%,transparent);color:var(--adst-c)}',
  '.adst_chip[data-interactive="true"]{cursor:pointer}',
  // The pin carries no padding or margin of its own: the chip's own padding is
  // the only edge spacing, and the flex gap is the only between-item spacing.
  '.adst_pin{flex:none;color:inherit}',
  // The label alone carries inline padding, so the text sits a touch deeper
  // inside the chip than the pin and remove glyphs do.
  '.adst_text{padding:0 0.1rem}',
  // The remove affordance lives inside the chip and only exists while the chip
  // is hovered or focused, exactly at the chip's inline end. It wraps its
  // glyph with no box, padding, or margin of its own, and its hover is a
  // label-color change only — no filled hover box padding the chip out.
  '.adst_remove{box-sizing:border-box;padding:0;border:none;',
  'background:transparent;cursor:pointer;display:none;flex:none;align-items:center;justify-content:center;',
  'color:inherit}',
  '.adst_chip:hover .adst_remove,.adst_remove:focus-visible{display:inline-flex}',
  '.adst_remove:focus-visible{outline-offset:0}',
  '.adst_remove:hover{color:var(--dsw-alias-label-primary)}',
  // The add affordance is a tag-shaped outline button: no fill, a level-3
  // border, a tertiary label, and the native interactive hover fill.
  '.adst_add{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;',
  'height:20px;padding:0 7px;border-radius:var(--dsw-radius-xs);flex:none;cursor:pointer;',
  'border:.5px solid var(--dsw-alias-border-l3);background:transparent;',
  'color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:17px;font-weight:500;white-space:nowrap}',
  '.adst_add:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l4);',
  'color:var(--dsw-alias-label-primary)}',
  '.adst_add:focus-visible{outline-offset:0}',
  // Drag feedback: the dragged chip fades, and the drop target carries a 2px
  // inset marker on the side the drag would land on, mirroring the row's own
  // before/after markers.
  '.adst_chip[data-dragging="true"]{opacity:.45}',
  '.adst_chip[data-drop="before"]{box-shadow:inset 2px 0 0 var(--adst-c)}',
  '.adst_chip[data-drop="after"]{box-shadow:inset -2px 0 0 var(--adst-c)}',
  // The add-tag panel: a fixed placement measured once when it opens — it does
  // not follow the anchor afterwards — painted with the shipped menu surface
  // tokens (translucent fill, backdrop blur, elevation) so it matches the
  // native menus. A definite width plus a horizontal clip keep the form from
  // ever growing a horizontal scrollbar.
  '.adst_pop{box-sizing:border-box;position:fixed;width:248px;padding:8px;display:flex;',
  'flex-direction:column;z-index:1100;border-radius:var(--dsw-radius-lg,var(--dsw-radius-md));',
  'background:var(--dsw-menu-surface-fill,var(--dsw-alias-bg-overlay));',
  'backdrop-filter:var(--dsw-menu-backdrop-filter);',
  'box-shadow:var(--dsw-elevation-prominent,0 3px 8px 0 #0000000a,0 0 20px 0 #0000000d);',
  'overflow-x:clip;animation:adst-pop-in .12s ease-out}',
  '.adst_pop[data-closing="true"]{animation:adst-pop-out .12s ease-in forwards}',
  '.adst_popBody{box-sizing:border-box;display:flex;flex-direction:column;gap:8px}',
  '.adst_popInput{width:100%;box-sizing:border-box}',
  '.adst_swatches{display:flex;align-items:center;gap:6px;flex:none}',
  '.adst_swatch{box-sizing:border-box;width:22px;height:22px;padding:0;border:none;flex:none;',
  'border-radius:999px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;',
  'background:var(--adst-c);color:#fff}',
  '.adst_swatch:focus-visible{outline-offset:2px}',
  '.adst_swatch[aria-pressed="true"]{outline:2px solid var(--adst-c);outline-offset:2px}',
  '.adst_confirm{box-sizing:border-box;height:26px;padding:0 14px;border:none;flex:none;cursor:pointer;align-self:flex-end;',
  'border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-state-business-primary);color:#fff;',
  'font:inherit;font-size:12px;font-weight:500}',
  '.adst_confirm:disabled{cursor:default;opacity:.5}',
  '.adst_confirm:focus-visible{outline-offset:1px}',
  '@keyframes adst-pop-in{from{opacity:0}to{opacity:1}}',
  '@keyframes adst-pop-out{from{opacity:1}to{opacity:0}}',
  '@media (prefers-reduced-motion:reduce){.adst_pop{animation:none}}',
].join('')
