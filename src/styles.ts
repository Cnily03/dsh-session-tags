/**
 * The plugin's only stylesheet. Both chip surfaces replicate the shipped tag
 * metrics from theme tokens — instead of depending on a hashed CSS-module class
 * that changes between Harness versions — and paint every preset color through
 * one `--adst-c` custom property that the theme's static palette feeds, so the
 * same markup reads correctly in light and dark themes. The popover, the remove
 * affordance, and the drag markers follow the same token-only rule. Every color
 * comes from a theme token or a color-mix over one.
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

/** Plugin-owned, version-stable class for the add-tag popover panel. */
export const POP_CLASS = 'adst_pop'

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
  // One chip: the shipped tag metrics (11px/17px label in a 20px pill body for
  // the header, 10px/16px in 18px for the sidebar row) with the small radius
  // this plugin calls for, painted as a 12% tint under the preset's own color.
  '.adst_chip{box-sizing:border-box;display:inline-flex;align-items:center;gap:4px;height:18px;',
  'padding:0 6px;border-radius:var(--dsw-radius-xs);font-size:10px;line-height:16px;font-weight:500;',
  'white-space:nowrap;flex:none;background:color-mix(in srgb,var(--adst-c) 12%,transparent);color:var(--adst-c)}',
  '.adst_headerTags .adst_chip{height:20px;padding:0 7px;font-size:11px;line-height:17px}',
  // The remove affordance lives inside the chip and only exists while the chip
  // is hovered or focused, exactly at the chip's inline end.
  '.adst_remove{box-sizing:border-box;width:14px;height:14px;margin:0 -2px 0 1px;padding:0;border:none;',
  'border-radius:var(--dsw-radius-xs);background:transparent;cursor:pointer;display:none;flex:none;',
  'align-items:center;justify-content:center;color:inherit}',
  '.adst_chip:hover .adst_remove,.adst_remove:focus-visible{display:inline-flex}',
  '.adst_remove:focus-visible{outline-offset:-2px}',
  '.adst_remove:hover{background:color-mix(in srgb,var(--adst-c) 20%,transparent)}',
  // The add affordance is a tag-shaped outline button: no fill, a level-3
  // border that deepens on hover, tertiary label brightening to primary.
  '.adst_add{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;',
  'height:20px;padding:0 7px;border-radius:var(--dsw-radius-xs);flex:none;cursor:pointer;',
  'border:.5px solid var(--dsw-alias-border-l3);background:transparent;',
  'color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:17px;font-weight:500;white-space:nowrap}',
  '.adst_add:hover{border-color:var(--dsw-alias-border-l4);color:var(--dsw-alias-label-primary)}',
  '.adst_add:focus-visible{outline-offset:0}',
  // Drag feedback: the dragged chip fades, and the drop target carries a 2px
  // inset marker on the side the drag would land on, mirroring the row's own
  // before/after markers.
  '.adst_chip[data-dragging="true"]{opacity:.45}',
  '.adst_chip[data-drop="before"]{box-shadow:inset 2px 0 0 var(--adst-c)}',
  '.adst_chip[data-drop="after"]{box-shadow:inset -2px 0 0 var(--adst-c)}',
  // The add-tag popover: fixed placement near the button, the overlay surface
  // and radius the shipped toasts use, and a safe shadow fallback.
  '.adst_pop{box-sizing:border-box;position:fixed;width:248px;padding:10px;display:flex;',
  'flex-direction:column;gap:8px;z-index:1200;border-radius:var(--dsw-radius-lg,var(--dsw-radius-md));',
  'border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-overlay);',
  'box-shadow:var(--dsw-alias-shadow-overlay,0 8px 24px rgb(0 0 0 / 18%))}',
  '.adst_popInput{width:100%}',
  '.adst_swatches{display:flex;align-items:center;gap:6px;flex:none}',
  '.adst_swatch{box-sizing:border-box;width:22px;height:22px;padding:0;border:none;flex:none;',
  'border-radius:999px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;',
  'background:var(--adst-c);color:#fff}',
  '.adst_swatch:focus-visible{outline-offset:2px}',
  '.adst_swatch[aria-pressed="true"]{outline:2px solid var(--adst-c);outline-offset:2px}',
  '.adst_confirm{box-sizing:border-box;height:26px;padding:0 14px;border:none;flex:none;cursor:pointer;',
  'border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-state-business-primary);color:#fff;',
  'font:inherit;font-size:12px;font-weight:500}',
  '.adst_confirm:disabled{cursor:default;opacity:.5}',
  '.adst_confirm:focus-visible{outline-offset:1px}',
].join('')
