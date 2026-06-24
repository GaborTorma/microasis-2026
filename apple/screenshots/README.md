# App Store / landing-page screenshots

Config-driven screenshot generator for the iOS and watchOS apps. One YAML file
([`screenshots.yaml`](screenshots.yaml)) declares each shot — device, view, time,
location, zoom — and the harness renders it in every language by driving the
simulators through `xcrun simctl`. No fastlane, no UITest target.

## Run

```bash
cd apple/screenshots
uv run make_screenshots.py                 # all shots, all languages (uv pulls PyYAML)
# or, without uv:
pip3 install pyyaml && python3 make_screenshots.py
```

Output lands in `hu/` and `en/` sub-folders, named `iphone-01-timetable-thursday.png`,
`watch-01-now-portal.png`, etc.

Flags: `--no-build` (reuse the app already on the sim — much faster while tuning
the config), `--lang hu`, `--only 05` (substring-match shot names), `--keep-status-bar`.

Requires the **full Xcode** (not just Command Line Tools); the harness locates it
automatically even if `xcode-select` points at the CLT. The `iPhone 14 Plus` and
`Apple Watch Ultra 3 (49mm)` simulators must exist (create them in Xcode › Devices).

## How a shot maps to the app

Each shot is injected as **launch arguments** (the `NSArgumentDomain`), so every
launch is deterministic — `defaults write` was tried first but cfprefsd caches it
across rapid relaunches and shots bled into each other.

| Config field | App default key | Effect |
|---|---|---|
| `languages: [hu, en]` | `manas.locale` | one capture per language |
| `view: timetable\|now` | `manas.startTab` (0/1) | which iPhone tab opens |
| `view: settings` | `manas.startSettings` | opens the Settings sheet |
| `view: widget` + `stage:` | `manas.startWidgetPreview` | watch: render that stage's widget card full-screen |
| `empty: true` | `manas.startNoProgram` | watch: force the "nothing on" card |
| `time: "yyyy-MM-dd HH:mm"` | `manas.debugNow` | the debug clock (Budapest-local) |
| `location: <stage slug>` | `manas.debugCoord` | nearest stage → left column (iPhone) / shown stage (watch); omitted → a far point so nothing is "nearby" |
| `columns: 1…5` | `manas.columns` | iPhone timetable zoom (default 3) |
| `font: 1…5` | `manas.fontSize` | text-size zoom (default 3) |
| *(always)* | `manas.hideTestUI` | hides the in-app **Testing** settings section |
| *(always)* | `manas.disclaimerSeen` | skips the first-launch modal |

`manas.startTab`, `manas.startSettings`, `manas.hideTestUI` are invisible,
undocumented defaults that only exist for screenshots. They are gated to
DEBUG/TestFlight (`AppEnv.debugToolsEnabled`) and are no-ops in App Store builds.
Stage coordinates are fetched live from `/api/schedule` (the DB is the source of
truth), so a stage slug in `location:` resolves to its real lat,lng.

## Known limits

- **Watch status bar stays at the real time** — `simctl status_bar override` has
  no effect on watchOS. App Store watch screenshots don't require 9:41.
- **A "no program now" watch shot** depends on picking a `time:` where the stage
  is genuinely idle with no nearby next act; otherwise the card shows the upcoming
  act. Tune `time:` per stage.
- **Widget shots** render the real `NowWidgetView` (shared via `ManasKit`) inside
  the watch app, honouring `time:`/language — but without the Smart Stack chrome
  around it. Frame that on the landing page if needed. The widget *extension*
  itself still ignores `manas.debugNow`; only this in-app preview path uses it.
- **No device framing** — these are raw, App-Store-uploadable PNGs. For
  landing-page bezels/captions, feed them to a framing tool (e.g. Koubou); note
  it has no exact Series-11/Ultra-3 frame.
