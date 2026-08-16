#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["pyjwt[crypto]", "requests"]
# ///
"""Push `apple/screenshots/{hu,en}/` to every App Store screenshot slot.

Replaces the whole set each time (delete + upload in filename order), because
order in the set is order on the product page and a partial sync would leave the
page in a mixed state.

Slot mapping — the captures are 6.9", the 6.5" slot is filled by downscaling the
same images, and 6.5" alone does NOT satisfy Apple's iPhone requirement:

    iphone-*.png (1320×2868) -> APP_IPHONE_67   as captured
    iphone-*.png             -> APP_IPHONE_65   downscaled to 1284×2778 (sips)
    watch-*.png  (422×514)   -> APP_WATCH_ULTRA as captured

Uploading is Apple's 3-step reservation dance (reserve → PUT the parts → confirm
with an md5), and validation is **asynchronous**: a shot reports UPLOAD_COMPLETE
and can still flip to FAILED minutes later, which is why this script waits for
every asset to reach COMPLETE before it returns.

Regenerate the images first:  cd screenshots && uv run make_screenshots.py

Usage (from `apple/`):
    uv run scripts/asc_screenshots.py               # every language, every slot
    uv run scripts/asc_screenshots.py --lang hu
    uv run scripts/asc_screenshots.py --dry-run
"""
from __future__ import annotations

import argparse
import hashlib
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import requests

from asc import call, editable_version, fail

SHOTS_DIR = Path(__file__).resolve().parent.parent / "screenshots"

# local folder name -> App Store Connect locale
LOCALES = {"hu": "hu", "en": "en-US"}

IPHONE_65 = (1284, 2778)


def sets_for(localization_id: str) -> dict[str, str]:
    r = call("get", f"/v1/appStoreVersionLocalizations/{localization_id}/appScreenshotSets",
             params={"limit": "20"})
    fail(r, "listing screenshot sets")
    return {s["attributes"]["screenshotDisplayType"]: s["id"] for s in r["data"]}


def ensure_set(localization_id: str, display_type: str, known: dict[str, str]) -> str:
    if display_type in known:
        return known[display_type]
    r = call("post", "/v1/appScreenshotSets", body={
        "data": {
            "type": "appScreenshotSets",
            "attributes": {"screenshotDisplayType": display_type},
            "relationships": {"appStoreVersionLocalization": {
                "data": {"type": "appStoreVersionLocalizations", "id": localization_id}}},
        }})
    fail(r, f"creating {display_type} set")
    return r["data"]["id"]


def replace(set_id: str, files: list[Path]) -> None:
    existing = call("get", f"/v1/appScreenshotSets/{set_id}/appScreenshots",
                    params={"limit": "20"})
    fail(existing, "listing screenshots")
    for s in existing["data"]:
        r = call("delete", f"/v1/appScreenshots/{s['id']}")
        if r.get("_status") == 409:
            sys.exit(
                "Screenshots are frozen: this version is READY_FOR_REVIEW.\n"
                "Delete its review-submission item first (the version drops back to "
                "PREPARE_FOR_SUBMISSION), re-run this, then re-add the item.\n"
                "See STORE_LISTING.md → 'Replacing assets on a version that is already "
                "READY_FOR_REVIEW'.\n"
                "Nothing was changed."
            )
        fail(r, f"deleting {s['attributes']['fileName']}")

    for path in files:
        data = path.read_bytes()
        res = call("post", "/v1/appScreenshots", body={
            "data": {
                "type": "appScreenshots",
                "attributes": {"fileSize": len(data), "fileName": path.name},
                "relationships": {"appScreenshotSet": {
                    "data": {"type": "appScreenshotSets", "id": set_id}}},
            }})
        fail(res, f"reserving {path.name}")
        sid = res["data"]["id"]
        for op in res["data"]["attributes"]["uploadOperations"]:
            chunk = data[op["offset"]: op["offset"] + op["length"]]
            headers = {h["name"]: h["value"] for h in op["requestHeaders"]}
            requests.request(op["method"], op["url"], headers=headers, data=chunk,
                             timeout=300).raise_for_status()
        done = call("patch", f"/v1/appScreenshots/{sid}", body={
            "data": {"type": "appScreenshots", "id": sid,
                     "attributes": {"uploaded": True,
                                    "sourceFileChecksum": hashlib.md5(data).hexdigest()}}})
        fail(done, f"confirming {path.name}")
        print(f"    {path.name}")
        time.sleep(0.3)


def downscale(files: list[Path], out_dir: Path) -> list[Path]:
    """6.9" captures -> the 6.5" slot. Aspect differs by 0.4%, so this stretches
    very slightly rather than cropping; Apple accepts it and the eye cannot see it."""
    out = []
    for f in files:
        dest = out_dir / f.name
        subprocess.run(["sips", "-z", str(IPHONE_65[1]), str(IPHONE_65[0]),
                        "-s", "format", "png", str(f), "--out", str(dest)],
                       check=True, capture_output=True)
        out.append(dest)
    return out


def await_complete(set_ids: list[str], timeout_s: int = 600) -> bool:
    """Apple validates asynchronously; UPLOAD_COMPLETE is not yet success."""
    deadline = time.time() + timeout_s
    while True:
        pending, failed = 0, []
        for sid in set_ids:
            r = call("get", f"/v1/appScreenshotSets/{sid}/appScreenshots",
                     params={"limit": "20"})
            for s in r.get("data", []):
                st = s["attributes"].get("assetDeliveryState", {})
                if st.get("state") == "FAILED":
                    failed.append((s["attributes"]["fileName"], st.get("errors")))
                elif st.get("state") != "COMPLETE":
                    pending += 1
        if failed:
            for name, errs in failed:
                print(f"  FAILED {name}: {errs}", file=sys.stderr)
            return False
        if not pending:
            return True
        if time.time() > deadline:
            print(f"  still {pending} pending after {timeout_s}s", file=sys.stderr)
            return False
        time.sleep(15)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", choices=sorted(LOCALES), help="only this language")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    version = editable_version()
    state = version["attributes"]["appStoreState"]
    print(f"version {version['attributes']['versionString']} ({state})")

    locs = call("get", f"/v1/appStoreVersions/{version['id']}/appStoreVersionLocalizations",
                params={"limit": "10"})
    fail(locs, "listing localizations")
    by_locale = {l["attributes"]["locale"]: l["id"] for l in locs["data"]}

    touched: list[str] = []
    with tempfile.TemporaryDirectory() as tmp:
        for folder, locale in LOCALES.items():
            if args.lang and args.lang != folder:
                continue
            if locale not in by_locale:
                sys.exit(f"no {locale} localization on this version")
            src = SHOTS_DIR / folder
            iphone = sorted(src.glob("iphone-*.png"))
            watch = sorted(src.glob("watch-*.png"))
            if not iphone:
                sys.exit(f"no screenshots in {src} — run make_screenshots.py first")

            known = sets_for(by_locale[locale])
            plan = [("APP_IPHONE_67", iphone), ("APP_WATCH_ULTRA", watch)]
            print(f"\n{folder}: {len(iphone)} iPhone + {len(watch)} watch")
            if args.dry_run:
                for slot, files in plan + [("APP_IPHONE_65", iphone)]:
                    print(f"  {slot}: {len(files)} shots")
                continue

            small = downscale(iphone, Path(tmp) / folder) if iphone else []
            for slot, files in plan + [("APP_IPHONE_65", small)]:
                if not files:
                    continue
                sid = ensure_set(by_locale[locale], slot, known)
                print(f"  {slot}")
                replace(sid, files)
                touched.append(sid)

    if args.dry_run or not touched:
        return
    print("\nwaiting for Apple's async validation…")
    sys.exit(0 if await_complete(touched) else "some screenshots failed validation")


if __name__ == "__main__":
    main()
