#!/usr/bin/env python3
"""Generate the README screenshots from real DSH icons and tokens.

Produces four PNGs (en/zh x sidebar row / conversation header) rendered from
HTML via headless chromium. Run from the plugin root; writes into assets/.

The shells mirror the shipped UI: the sidebar row and its resting span, the
conversation header with its title row, underline view tabs, and preset seat;
the popover mirrors the plugin's own panel metrics (8px surface padding, 8px
body gaps, right-aligned confirm) painted with the shipped menu tokens.
"""
import html
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
WORK = Path("/tmp/dsst-shotgen")
WORK.mkdir(exist_ok=True)

# Real DSH icon inner markup (viewBox 0 0 16 16), stroke-width 1.3 at 14-16px.
ICONS = {
    "search": '<path d="M6.58727 11.8586C9.55061 11.8586 11.9529 9.45637 11.9529 6.49304C11.9529 3.5297 9.55061 1.12744 6.58727 1.12744C3.62394 1.12744 1.22168 3.5297 1.22168 6.49304C1.22168 9.45637 3.62394 11.8586 6.58727 11.8586Z" stroke="currentColor"/><path d="M10.2991 10.3933L14.7783 14.8725" stroke="currentColor"/>',
    "sliders": '<path d="M2.3 5h5.85M12.05 5h1.65" stroke="currentColor"/><circle cx="9.95" cy="5" r="1.45" stroke="currentColor"/><path d="M2.3 11h1.65M7.85 11h5.85" stroke="currentColor"/><circle cx="5.75" cy="11" r="1.45" stroke="currentColor"/>',
    "projectadd": '<path d="M5.54492 2.06738C5.91034 2.06754 6.26318 2.20149 6.53711 2.44336L7.94043 3.68164V4.7998C7.71462 4.74105 7.50367 4.63139 7.32617 4.47461L5.87598 3.19238C5.78477 3.11185 5.66658 3.06754 5.54492 3.06738H2.94922C2.67322 3.06738 2.44946 3.29145 2.44922 3.56738V12.4326C2.44927 12.7087 2.67311 12.9326 2.94922 12.9326H12.9326C13.2086 12.9325 13.4326 12.7086 13.4326 12.4326V8.53613H14.4326V12.4326C14.4326 13.2609 13.7609 13.9325 12.9326 13.9326H2.94922C1.92083 13.9326 1.44927 13.261 1.44922 12.4326V3.56738C1.44946 2.73916 2.12094 2.06738 2.94922 2.06738H5.54492Z" fill="currentColor"/><path d="M9.75977 4.50208H14.5509" stroke="currentColor"/><path d="M12.1492 6.89758L12.1492 2.10642" stroke="currentColor"/>',
    "folder": '<path d="M1.50439 3.11059C1.50439 2.55831 1.95211 2.1106 2.50439 2.1106H5.43389C5.67773 2.1106 5.91318 2.19969 6.09593 2.36113L7.71649 3.79265C7.89924 3.95409 8.1347 4.04319 8.3785 4.04319H13.4958C14.0481 4.04319 14.4958 4.4909 14.4958 5.04319V12.8894C14.4958 13.4417 14.0481 13.8894 13.4958 13.8894H2.50439C1.95211 13.8894 1.50439 13.4417 1.50439 12.8894V4.04319V3.11059Z" stroke="currentColor"/><path d="M3.63501 7.66614H12.3647" stroke="currentColor"/>',
    "ellipsis": '<path d="M3 9C3.55228 9 4 8.55228 4 8C4 7.44772 3.55228 7 3 7C2.44772 7 2 7.44772 2 8C2 8.55228 2.44772 9 3 9Z" fill="currentColor"/><path d="M8 9C8.55228 9 9 8.55228 9 8C9 7.44772 8.55228 7 8 7C7.44772 7 7 7.44772 7 8C7 8.55228 7.44772 9 8 9Z" fill="currentColor"/><path d="M13 9C13.5523 9 14 8.55228 14 8C14 7.44772 13.5523 7 13 7C12.4477 7 12 7.44772 12 8C12 8.55228 12.4477 9 13 9Z" fill="currentColor"/>',
    "archive": '<path d="M13.5 2.5H2.5C1.94772 2.5 1.5 2.94772 1.5 3.5V4.5C1.5 5.05228 1.94772 5.5 2.5 5.5H13.5C14.0523 5.5 14.5 5.05228 14.5 4.5V3.5C14.5 2.94772 14.0523 2.5 13.5 2.5Z" stroke="currentColor"/><path d="M2.5 5.5V13.5C2.5 13.7652 2.60536 14.0196 2.79289 14.2071C2.98043 14.3946 3.23478 14.5 3.5 14.5H12.5C12.7652 14.5 13.0196 14.3946 13.2071 14.2071C13.3946 14.0196 13.5 13.7652 13.5 13.5V5.5" stroke="currentColor"/><path d="M6.5 9.5H9.5" stroke="currentColor"/>',
    "plus": '<path d="M8 2V14" stroke="currentColor"/><path d="M2 8H14" stroke="currentColor"/>',
    "close": '<path d="M2.5 2.5L13.5 13.5" stroke="currentColor"/><path d="M13.5 2.5L2.5 13.5" stroke="currentColor"/>',
    "check": '<path d="M2.25 8.5L5.49732 11.7473C5.90519 12.1552 6.57263 12.1344 6.95426 11.7018L13.75 4" stroke="currentColor"/>',
    "pin": '<path d="M9.96976 1.70572L13.1554 3.93629L10.9019 8.12317L11.5158 11.605L10.7192 12.7427L2.52767 7.00693L3.3243 5.86922L6.80612 5.25528L9.96976 1.70572Z" stroke="currentColor" stroke-linejoin="round"/><path d="M6.05285 9.47511C6.27284 9.16094 6.70586 9.08458 7.02003 9.30457C7.3342 9.52455 7.41055 9.95757 7.19057 10.2717L3.98587 14.4708L3.21223 13.9291L6.05285 9.47511Z" fill="currentColor"/>',
    # The shipped IconChevronDownOutlineRegular path, at its native 14px.
    "chevdown": '<path d="M4 6L7.29289 9.29289C7.68342 9.68342 8.31658 9.68342 8.70711 9.29289L12 6" stroke="currentColor"/>',
    # The shipped IconAgentPresetOutlineRegular markup, at its native 16px.
    "preset": '<path d="M6.51867 12.3282C7.29816 12.6011 8.16475 12.6514 9.02269 12.4216C9.57879 12.2726 10.0784 12.0185 10.5087 11.6888C10.7819 12.0555 11.1606 12.3304 11.5913 12.4805C10.9688 13.029 10.2149 13.4478 9.35911 13.6771C8.13946 14.0038 6.90632 13.8971 5.82126 13.4533C6.15821 13.1562 6.4021 12.7652 6.51867 12.3282ZM9.17629 2.89409C11.1101 3.34433 12.739 4.81872 13.2889 6.87043C13.4219 7.3665 13.4811 7.8649 13.4774 8.35466C13.0924 8.13213 12.6422 8.01837 12.1741 8.05276L12.1711 8.05257C12.1539 7.77199 12.109 7.48889 12.0334 7.20684C11.6363 5.72533 10.5048 4.6372 9.13549 4.22844C9.25559 3.87667 9.29214 3.49087 9.22309 3.09892C9.2108 3.02922 9.19451 2.96108 9.17629 2.89409ZM4.7311 3.89107L4.78302 4.11879C4.87648 4.4488 5.04146 4.74263 5.25579 4.98896C3.98078 6.01355 3.35848 7.72904 3.8089 9.41059C3.81828 9.44559 3.82866 9.48025 3.83885 9.51479C3.38217 9.61268 2.98548 9.84137 2.68107 10.1556C2.63414 10.022 2.5897 9.88632 2.55244 9.74726C1.93301 7.43489 2.86717 5.07173 4.71504 3.76697L4.7311 3.89107Z" fill="currentColor"/><path d="M7.99136 5.28105C8.87501 5.28105 9.59136 4.56471 9.59136 3.68105C9.59136 2.7974 8.87501 2.08105 7.99136 2.08105C7.1077 2.08105 6.39136 2.7974 6.39136 3.68105C6.39136 4.56471 7.1077 5.28105 7.99136 5.28105Z" stroke="currentColor"/><path d="M3.94009 12.9417C4.82374 12.9417 5.54009 12.2254 5.54009 11.3417C5.54009 10.458 4.82374 9.7417 3.94009 9.7417C3.05643 9.7417 2.34009 10.458 2.34009 11.3417C2.34009 12.2254 3.05643 12.9417 3.94009 12.9417Z" stroke="currentColor"/><path d="M12.0851 12.9417C12.9688 12.9417 13.6851 12.2254 13.6851 11.3417C13.6851 10.458 12.9688 9.7417 12.0851 9.7417C11.2015 9.7417 10.4851 10.458 10.4851 11.3417C10.4851 12.2254 11.2015 12.9417 12.0851 12.9417Z" stroke="currentColor"/>',
}

# Dark-theme preset chip colors: the --dsw-static-*-400 tokens this plugin pairs.
COLORS = {
    "deepseek": "#7AAAFF",
    "blue": "#60A5FA",
    "violet": "#A78BFA",
    "red": "#F25A5A",
    "amber": "#F7AD31",
    "green": "#4ED17E",
    "neutral": "#A2A4A6",
}

# The three demo sessions share one story across both shots: the sidebar row
# shows each session's pinned tags, the header shot opens the first session.
STRINGS = {
    "en": {
        "workspaces": "Workspaces",
        "default": "Default workspace",
        "sessions": [
            {
                "title": "DeepSeek 💙🧡 Claude",
                "time": "5min",
                "tags": [("Writing", "amber")],
            },
            {
                "title": "The Season of Blooming Lilies",
                "time": "20h",
                "tags": [("Literature", "blue")],
            },
            {
                "title": "Why Do Birds Fly",
                "time": "3d",
                "tags": [("Literature", "blue")],
            },
        ],
        "header_tags": [("Yuri", "red"), ("Writing", "amber")],
        "tabs": ["Chat", "Trajectory"],
        "mode": "Creator mode",
        "input": "Inspiration",
        "add": "Add",
    },
    "zh": {
        "workspaces": "工作区",
        "default": "默认工作区",
        "sessions": [
            {
                "title": "DeepSeek 💙🧡 Claude",
                "time": "5分钟",
                "tags": [("创作", "amber")],
            },
            {
                "title": "百合花盛开的季节",
                "time": "20小时",
                "tags": [("文学", "blue")],
            },
            {
                "title": "鸟为什么会飞",
                "time": "3天",
                "tags": [("文学", "blue")],
            },
        ],
        "header_tags": [("百合", "red"), ("创作", "amber")],
        "tabs": ["对话", "轨迹"],
        "mode": "创造模式",
        "input": "灵感",
        "add": "添加",
    },
}


def svg(inner, size=14, sw="1.3", color="currentColor"):
    return (
        f'<svg viewBox="0 0 16 16" width="{size}" height="{size}" fill="none" stroke-width="{sw}" '
        f'stroke-linecap="round" stroke-linejoin="round" style="color:{color}">{inner}</svg>'
    )


def chips(tags, hovered_index=-1, fixed_indices=()):
    parts = []
    for index, (text, color) in enumerate(tags):
        remove = (
            f'<span class="remove">{svg(ICONS["close"], size=10)}</span>' if index == hovered_index else ""
        )
        pin = f'<span class="pin">{svg(ICONS["pin"], size=12)}</span>' if index in fixed_indices else ""
        label = f'<span class="text">{html.escape(text)}</span>'
        parts.append(f'<span class="chip" data-color="{color}">{pin}{label}{remove}</span>')
    return "".join(parts)


def base_css(extra=""):
    colors = "".join(
        f'.chip[data-color="{key}"],.swatch[data-color="{key}"]{{--adst-c:{value}}}'
        for key, value in COLORS.items()
    )
    return f"""<style>
:root {{
  --bg:#212121; --row-hover:#313131; --label-primary:#f9fafb;
  --label-secondary:#cfd3d6; --label-tertiary:#adb2b8; --label-caption:#8b8c8e;
  --border-l2:#ffffff1f; --border-l3:#ffffff29; --border-l4:#fff3;
  --bg-layer-1:#232324; --bg-layer-3:#353638; --menu-fill:#43454a73;
  --business-primary:#7AAAFF; --deepseek:#4D6BFE;
}}
*{{margin:0;padding:0;box-sizing:border-box}}
html,body{{background:transparent}}
.shot{{position:relative;background:var(--bg);border-radius:10px;overflow:hidden;
  font-family:-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",Roboto,Helvetica,Arial,sans-serif;
  -webkit-font-smoothing:antialiased}}
{colors}
.chip{{display:inline-flex;align-items:center;gap:0.1rem;height:20px;padding:0 0.25rem;
  border-radius:4px;font-size:11px;line-height:17px;font-weight:500;white-space:nowrap;flex:none;
  background:color-mix(in srgb,var(--adst-c) 12%,transparent);color:var(--adst-c)}}
.chip .text{{padding:0 0.1rem}}
.chip .pin{{display:inline-flex;flex:none;color:inherit}}
.chip .remove{{display:inline-flex;padding:0;border:none;background:transparent;cursor:pointer;
  align-items:center;justify-content:center;color:inherit}}
{extra}
</style>"""


def row_page(lang):
    s = STRINGS[lang]
    first, second, third = s["sessions"]
    layout = """
.hdr{position:absolute;top:15px;left:16px;color:var(--label-tertiary);font-size:13px;font-weight:500}
.hdr-icons{position:absolute;top:18px;right:16px;display:flex;gap:14px;color:var(--label-tertiary)}
.folder{position:absolute;top:52px;left:16px;display:flex;align-items:center;gap:9px}
.folder span{color:var(--label-primary);font-size:14px;font-weight:500}
.row{position:absolute;left:8px;width:344px;height:32px;border-radius:8px;display:flex;align-items:center;padding:0 16px}
.row.active{top:86px;background:var(--row-hover)}
.row.normal{top:122px}
.row.archived{top:158px}
.row .title{font-size:14px;line-height:20px;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.row.active .title{color:var(--label-primary)}
.row.normal .title{color:var(--label-secondary)}
.row.archived .title{color:var(--label-caption)}
.row .time{color:var(--label-tertiary);font-size:10px;line-height:16px;margin-left:8px}
.row .tags{display:inline-flex;align-items:center;gap:4px;margin-left:6px}
"""
    return f"""<!doctype html><html><head><meta charset="utf-8">{base_css(layout)}
</head><body>
<div class="shot" style="width:360px;height:280px">
  <div class="hdr">{html.escape(s["workspaces"])}</div>
  <div class="hdr-icons">{svg(ICONS["search"], size=16)}{svg(ICONS["sliders"], size=16)}{svg(ICONS["projectadd"], size=16)}</div>
  <div class="folder">{svg(ICONS["folder"], size=16, color="var(--deepseek)")}<span>{html.escape(s["default"])}</span></div>
  <div class="row active"><div class="title">{html.escape(first["title"])}</div><div class="time">{html.escape(first["time"])}</div><span class="tags">{chips(first["tags"])}</span></div>
  <div class="row normal"><div class="title">{html.escape(second["title"])}</div><div class="time">{html.escape(second["time"])}</div><span class="tags">{chips(second["tags"])}</span></div>
  <div class="row archived"><div class="title">{html.escape(third["title"])}</div><div class="time">{html.escape(third["time"])}</div><span class="tags">{chips(third["tags"])}</span></div>
</div></body></html>"""


def header_page(lang):
    s = STRINGS[lang]
    swatches = "".join(
        f'<button class="swatch{" sel" if key == "green" else ""}" data-color="{key}" type="button">'
        + (svg(ICONS["check"], size=12, sw="1.8", color="#fff") if key == "green" else "")
        + "</button>"
        for key in COLORS
    )
    tabs = "".join(
        f'<span class="tab{" active" if index == 0 else ""}">{html.escape(tab)}</span>'
        for index, tab in enumerate(s["tabs"])
    )
    layout = """
.hdr{box-sizing:border-box;border-bottom:.5px solid var(--border-l3);width:640px;
  padding:10px 28px 0 20px;display:flex;flex-direction:column}
.titleRow{display:flex;align-items:center;gap:20px;min-height:30px}
.titleRow .title{color:var(--label-primary);font-size:16px;font-weight:500;white-space:nowrap;
  overflow:hidden;text-overflow:ellipsis}
.titleRow .tags{display:inline-flex;align-items:center;gap:4px;min-width:0}
.mode{display:inline-flex;align-items:center;gap:4px;min-height:28px;padding:0 8px;
  border:none;border-radius:8px;background:transparent;color:var(--label-secondary);
  font-size:12px;font-weight:500;line-height:18px;white-space:nowrap}
.tabsRow{display:flex;align-items:center;margin-top:10px;margin-bottom:-1px;height:35px}
.tab{position:relative;display:flex;align-items:center;padding:10px 0 9px;margin-right:20px;
  color:var(--label-tertiary);font-size:13px;font-weight:500;line-height:16px}
.tab.active{color:var(--business-primary)}
.tab.active:after{content:"";position:absolute;left:0;right:0;bottom:0;height:2px;
  border-radius:2px;background:var(--business-primary)}
.more{width:22px;display:flex;align-items:center;justify-content:center;padding:10px 0 9px;
  color:var(--label-tertiary)}
.add{display:inline-flex;align-items:center;justify-content:center;height:20px;padding:0 7px;
  border-radius:4px;flex:none;cursor:pointer;border:.5px solid var(--border-l3);background:transparent;
  color:var(--label-tertiary);font-size:11px;line-height:17px;font-weight:500;white-space:nowrap}
@media (hover:hover){.add:hover{background:#ffffff14}}
.pop{position:absolute;top:48px;left:280px;width:248px;padding:8px;display:flex;flex-direction:column;
  border-radius:16px;background:var(--menu-fill);backdrop-filter:blur(40px) saturate(150%);
  box-shadow:0 0 0 .5px var(--border-l3),0 3px 8px 0 #0000000a,0 0 20px 0 #0000000d;z-index:10}
.popBody{display:flex;flex-direction:column;gap:8px}
.inputwrap{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 8px;width:100%;
  border:.5px solid var(--border-l4);border-radius:12px;background:var(--bg-layer-1)}
.inputwrap input{flex:1;min-width:0;border:none;outline:none;background:transparent;font-size:14px;
  line-height:22px;color:var(--label-primary)}
.swatches{display:flex;align-items:center;gap:6px}
.swatch{width:22px;height:22px;padding:0;border:none;border-radius:999px;cursor:pointer;
  display:inline-flex;align-items:center;justify-content:center;background:var(--adst-c);color:#fff}
.swatch.sel{outline:2px solid var(--adst-c);outline-offset:2px}
.confirm{height:26px;padding:0 14px;border:none;flex:none;cursor:pointer;border-radius:8px;
  background:var(--business-primary);color:#fff;font-size:12px;font-weight:500;align-self:flex-end}
"""
    return f"""<!doctype html><html><head><meta charset="utf-8">{base_css(layout)}
</head><body>
<div class="shot" style="width:640px;height:220px">
  <div class="hdr">
    <div class="titleRow">
      <span class="title">{html.escape(s["sessions"][0]["title"])}</span>
      <span class="tags">{chips(s["header_tags"], hovered_index=0, fixed_indices=(1,))}
        <button class="add" type="button">{svg(ICONS["plus"], size=10)}</button></span>
      <button class="mode" type="button">{svg(ICONS["preset"], size=16, color="var(--label-secondary)")}{html.escape(s["mode"])}</button>
    </div>
    <div class="tabsRow">{tabs}<span class="more">{svg(ICONS["ellipsis"], size=14)}</span></div>
  </div>
  <div class="pop">
    <span class="popBody">
      <span class="inputwrap"><input value="{html.escape(s["input"])}"></span>
      <span class="swatches">{swatches}</span>
      <button class="confirm" type="button">{html.escape(s["add"])}</button>
    </span>
  </div>
</div></body></html>"""


def render(name, htmltext, width, height):
    src = WORK / f"{name}.html"
    out = ASSETS / f"{name}.png"
    src.write_text(htmltext, encoding="utf-8")
    subprocess.run(
        [
            "chromium", "--headless", "--disable-gpu", "--hide-scrollbars",
            f"--user-data-dir={WORK}/chromium", "--force-device-scale-factor=2",
            f"--window-size={width},{height}", "--default-background-color=00000000",
            f"--screenshot={out}", f"file://{src}",
        ],
        check=True, stderr=subprocess.DEVNULL,
    )
    print("wrote", out)


def main():
    ASSETS.mkdir(exist_ok=True)
    render("row-tags.en", row_page("en"), 360, 280)
    render("row-tags.zh", row_page("zh"), 360, 280)
    render("header-tags.en", header_page("en"), 640, 220)
    render("header-tags.zh", header_page("zh"), 640, 220)


if __name__ == "__main__":
    sys.exit(main())
