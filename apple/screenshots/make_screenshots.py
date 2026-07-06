#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["pyyaml"]
# ///
"""Config-driven App Store / landing-page screenshot generator for Manas 2026.

Drives the iOS and watchOS simulators entirely through `xcrun simctl`: it writes
the app's debug-override defaults (manas.debugNow / debugCoord / locale / columns
/ startView / hideTestUI), launches a Debug build, and captures the
screen. No fastlane, no UITest target — see screenshots.yaml for the shot list.

  python3 make_screenshots.py [--no-build] [--lang hu] [--only SUBSTR] [--keep-status-bar]

Requires the full Xcode (not just Command Line Tools); it is located automatically.
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

try:
    import yaml
except ImportError:
    sys.exit("PyYAML missing — install with:  pip3 install pyyaml   (or run via: uv run make_screenshots.py)")

ROOT = Path(__file__).resolve().parent          # apple/screenshots
APPLE = ROOT.parent                             # apple/
PROJECT = APPLE / "Manas.xcodeproj"
DERIVED = APPLE / "build" / "dd"

FAR_COORD = "46.6900,17.6800"   # mirrors Geo.farTestCoord — outside every stage radius

# manas.* defaults reset before every shot so a value never leaks across shots.
RESET_KEYS = [
    "manas.locale", "manas.debugNow", "manas.debugCoord", "manas.columns",
    "manas.fontSize", "manas.order", "manas.hidden", "manas.startView",
    "manas.hideTestUI", "manas.disclaimerSeen",
    # Manually-tapped favorites persist here; clear them so only a shot's
    # `favorites:` (-manas.startFavorites, per-launch) shows hearts.
    "manas.favoriteStates",
]


# ── Xcode / simctl plumbing ────────────────────────────────────────────────

def find_developer_dir() -> str:
    """Return a full-Xcode DEVELOPER_DIR, even if xcode-select points at CLT."""
    env = os.environ.get("DEVELOPER_DIR")
    if env and (Path(env) / "usr/bin/simctl").exists():
        return env
    try:
        sel = subprocess.check_output(["xcode-select", "-p"], text=True).strip()
        if (Path(sel) / "usr/bin/simctl").exists():
            return sel
    except subprocess.CalledProcessError:
        pass
    for app in ("/Applications/Xcode.app", *sorted(Path("/Applications").glob("Xcode*.app"), reverse=True)):
        cand = Path(app) / "Contents/Developer"
        if (cand / "usr/bin/simctl").exists():
            return str(cand)
    sys.exit("Could not find a full Xcode install (need simctl). Install Xcode or set DEVELOPER_DIR.")


DEVDIR = find_developer_dir()
ENV = {**os.environ, "DEVELOPER_DIR": DEVDIR}
SIMCTL = [str(Path(DEVDIR) / "usr/bin/simctl")]
XCODEBUILD = str(Path(DEVDIR) / "usr/bin/xcodebuild")


def simctl(*args: str, check: bool = True, quiet: bool = False) -> subprocess.CompletedProcess:
    return subprocess.run([*SIMCTL, *args], env=ENV, check=check, text=True,
                          capture_output=True if quiet else False)


def sim_json() -> dict:
    out = subprocess.check_output([*SIMCTL, "list", "devices", "available", "--json"], env=ENV, text=True)
    return json.loads(out)


def resolve_udid(name: str) -> str:
    """First available simulator with this device-type name; boot if needed."""
    for runtime, devices in sim_json()["devices"].items():
        for d in devices:
            if d.get("name") == name and d.get("isAvailable", False):
                udid = d["udid"]
                if d.get("state") != "Booted":
                    print(f"  booting {name} …")
                    simctl("boot", udid, check=False)
                    simctl("bootstatus", udid, "-b", check=False)
                return udid
    sys.exit(f"No available simulator named {name!r}. Create it in Xcode > Devices, "
             f"or run: xcrun simctl create '{name}' '<devicetype>' '<runtime>'")


# ── build / install ────────────────────────────────────────────────────────

def build(scheme: str, platform: str, udid: str) -> Path:
    # Target the exact resolved simulator by id — device-type names can be
    # ambiguous (several "Apple Watch Ultra 3 (49mm)" exist) and a name-based
    # destination then fails to resolve.
    sim = "iOS Simulator" if platform == "ios" else "watchOS Simulator"
    dest = f"platform={sim},id={udid}"
    print(f"  building {scheme} (Debug) …")
    subprocess.run(
        [XCODEBUILD, "-project", str(PROJECT), "-scheme", scheme, "-configuration", "Debug",
         "-destination", dest, "-derivedDataPath", str(DERIVED), "build", "CODE_SIGNING_ALLOWED=NO"],
        env=ENV, check=True, stdout=subprocess.DEVNULL)
    sub = "Debug-iphonesimulator" if platform == "ios" else "Debug-watchsimulator"
    apps = list((DERIVED / "Build/Products" / sub).glob("*.app"))
    # The iOS .app embeds the watch app; pick the top-level one matching the scheme.
    app = next((a for a in apps if a.stem == scheme), apps[0] if apps else None)
    if not app:
        sys.exit(f"Build produced no .app in {sub}")
    return app


def install(udid: str, app: Path):
    simctl("install", udid, str(app))


# ── per-shot defaults + capture ────────────────────────────────────────────

def delete_default(udid: str, bundle: str, key: str):
    simctl("spawn", udid, "defaults", "delete", bundle, key, check=False, quiet=True)


def launch_args(shot: dict, lang: str, coords: dict) -> list[str]:
    """`-key value` launch arguments for one shot+language. These land in the
    app's NSArgumentDomain (highest precedence, never cfprefsd-cached), so each
    launch is deterministic — unlike `defaults write`, which lags behind rapid
    relaunches and bleeds settings across shots."""
    a = [
        "-manas.locale", lang,
        "-manas.hideTestUI", "YES",      # hide the in-app Testing section
        "-manas.disclaimerSeen", "YES",  # skip the first-launch modal
    ]
    if t := shot.get("time"):
        a += ["-manas.debugNow", str(t)]
    loc = shot.get("location")
    if loc and loc not in coords:
        sys.exit(f"shot {shot['name']}: unknown stage {loc!r} (have {', '.join(coords)})")
    # Always pin a coordinate so a previous shot's stage can't linger as the
    # selected/leading stage: the requested stage, or a point far from every
    # stage for "no stage nearby".
    a += ["-manas.debugCoord", coords[loc] if loc else FAR_COORD]
    # Always pin zoom (columns) + text size (font) so neither lingers from a
    # previous shot; both default to the app's own default of 3.
    a += ["-manas.columns", str(shot.get("columns", 3))]
    a += ["-manas.fontSize", str(shot.get("font", 3))]
    if shot.get("empty"):                       # watch: force the "nothing on" card
        a += ["-manas.startNoProgram", "YES"]
    if fav := shot.get("favorites"):            # comma-separated event slugs → hearts
        a += ["-manas.startFavorites", str(fav)]
    view = shot.get("view")
    if view in ("timetable", "now", "share", "settings"):
        a += ["-manas.startView", view]
    elif view == "widget":
        stage = shot.get("stage")
        if not stage:
            sys.exit(f"shot {shot['name']}: view: widget needs a `stage:` slug")
        a += ["-manas.startWidgetPreview", str(stage)]
    return a


def capture(shot: dict, lang: str, dev: dict, udid: str, coords: dict, cfg: dict, out_dir: Path):
    bundle = dev["bundle"]
    name = f"{shot['device']}-{shot['name']}.png"
    dest = out_dir / lang / name
    dest.parent.mkdir(parents=True, exist_ok=True)

    simctl("terminate", udid, bundle, check=False, quiet=True)
    # Clear the persistent domain so only this shot's launch args take effect
    # (a value omitted from one shot can't linger from a previous one).
    for k in RESET_KEYS:
        delete_default(udid, bundle, k)

    simctl("ui", udid, "appearance", cfg.get("appearance", "dark"), check=False, quiet=True)
    if dev["platform"] == "ios" and (sb := cfg.get("status_bar")):
        simctl("status_bar", udid, "override",
               "--time", str(sb.get("time", "9:41")),
               "--batteryState", "charged", "--batteryLevel", str(sb.get("battery", 100)),
               "--cellularMode", "active", "--cellularBars", str(sb.get("cellular", 4)),
               "--wifiMode", "active", "--wifiBars", str(sb.get("wifi", 3)),
               "--dataNetwork", "wifi", check=False, quiet=True)

    simctl("launch", udid, bundle, *launch_args(shot, lang, coords), quiet=True)
    time.sleep(cfg.get("settle", 7))
    simctl("io", udid, "screenshot", "--type=png", str(dest), quiet=True)
    simctl("terminate", udid, bundle, check=False, quiet=True)
    print(f"  ✓ {dest.relative_to(ROOT)}")


# ── stage coordinates ──────────────────────────────────────────────────────

def fetch_coords(api: str) -> dict:
    with urllib.request.urlopen(api, timeout=20) as r:
        data = json.load(r)
    return {s["slug"]: f"{s['lat']},{s['lng']}"
            for s in data["stages"] if s.get("lat") is not None and s.get("lng") is not None}


# ── main ───────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(description="Generate Manas 2026 App Store screenshots.")
    ap.add_argument("--config", default=str(ROOT / "screenshots.yaml"))
    ap.add_argument("--no-build", action="store_true", help="skip xcodebuild + install (reuse what's on the sim)")
    ap.add_argument("--lang", action="append", help="limit to language(s); repeatable")
    ap.add_argument("--only", help="only shots whose name contains this substring")
    ap.add_argument("--keep-status-bar", action="store_true", help="don't clear the status-bar override at the end")
    args = ap.parse_args()

    cfg = yaml.safe_load(Path(args.config).read_text())
    out_dir = (ROOT / cfg.get("out_dir", ".")).resolve()
    languages = args.lang or cfg["languages"]
    devices = cfg["devices"]
    shots = [s for s in cfg["shots"] if not args.only or args.only in s["name"]]
    if not shots:
        sys.exit("No shots matched.")

    print(f"Xcode: {DEVDIR}")
    print("Fetching stage coordinates …")
    coords = fetch_coords(cfg["api"])

    # Resolve + (build/install) only the device platforms actually used.
    used = {s["device"] for s in shots}
    udids: dict[str, str] = {}
    for key in used:
        dev = devices[key]
        print(f"Device {key}: {dev['name']}")
        udid = resolve_udid(dev["name"])
        udids[key] = udid
        if not args.no_build:
            install(udid, build(dev["scheme"], dev["platform"], udid))

    print(f"\nCapturing {len(shots)} shot(s) × {len(languages)} language(s) → {out_dir}")
    try:
        for shot in shots:
            dev = devices[shot["device"]]
            udid = udids[shot["device"]]
            for lang in languages:
                capture(shot, lang, dev, udid, coords, cfg, out_dir)
    finally:
        if not args.keep_status_bar:
            for udid in udids.values():
                simctl("status_bar", udid, "clear", check=False, quiet=True)
    print("\nDone.")


if __name__ == "__main__":
    main()
