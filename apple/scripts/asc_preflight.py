#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["pyjwt[crypto]", "requests"]
# ///
"""Check everything App Review needs, and name what is missing.

Worth running because the API itself will not tell you: a submission with any
piece missing is refused as "appStoreVersions … is not in valid state", the same
sentence for every cause. Each line below is a gate that actually blocked 1.0.

Read-only — it changes nothing and submits nothing.

Usage (from `apple/`):
    uv run scripts/asc_preflight.py
"""
from __future__ import annotations

import sys

from asc import APP_ID, call, editable_version, fail

problems: list[str] = []


def check(label: str, ok: bool, detail: str = "") -> None:
    print(f"{'  ok ' if ok else '  !! '} {label}{f' — {detail}' if detail else ''}")
    if not ok:
        problems.append(label)


def main() -> None:
    version = editable_version()
    vid, va = version["id"], version["attributes"]
    print(f"\nversion {va['versionString']} — {va['appStoreState']} "
          f"(release: {va['releaseType']})\n")

    build = call("get", f"/v1/appStoreVersions/{vid}/build").get("data")
    check("build attached", bool(build),
          f"{build['attributes']['version']} ({build['attributes']['processingState']})"
          if build else "none")

    app = call("get", f"/v1/apps/{APP_ID}")["data"]["attributes"]
    check("content rights declared", bool(app.get("contentRightsDeclaration")),
          app.get("contentRightsDeclaration") or "")

    # Age rating hangs off appInfos — /v1/apps/<id>/ageRatingDeclaration does not
    # exist and a check against it reports a false "missing".
    infos = call("get", f"/v1/apps/{APP_ID}/appInfos")["data"]
    rating = infos[0]["attributes"].get("appStoreAgeRating") if infos else None
    check("age rating", bool(rating), rating or "unanswered")

    # A brand-new app record has NO territories until one is set explicitly.
    avail = call("get", f"/v2/appAvailabilities/{APP_ID}")
    check("app availability", avail.get("_status") == 200,
          "set" if avail.get("_status") == 200 else "never set (404)")

    locs = call("get", f"/v1/appStoreVersions/{vid}/appStoreVersionLocalizations",
                params={"limit": "10"})
    fail(locs, "listing localizations")
    for loc in locs["data"]:
        a = loc["attributes"]
        text_ok = all(a.get(k) for k in ("description", "keywords", "supportUrl"))
        check(f"{a['locale']} copy", text_ok,
              f"description {len(a.get('description') or '')}, "
              f"keywords {len(a.get('keywords') or '')}")
        shot_sets = call("get", f"/v1/appStoreVersionLocalizations/{loc['id']}/appScreenshotSets",
                         params={"limit": "10"})["data"]
        for s in shot_sets:
            shots = call("get", f"/v1/appScreenshotSets/{s['id']}/appScreenshots",
                         params={"limit": "20"})["data"]
            states = {x["attributes"].get("assetDeliveryState", {}).get("state") for x in shots}
            check(f"{a['locale']} {s['attributes']['screenshotDisplayType']}",
                  bool(shots) and states == {"COMPLETE"},
                  f"{len(shots)} shots {states or '{}'}")
        if not shot_sets:
            check(f"{a['locale']} screenshots", False, "no sets at all")

    subs = call("get", "/v1/reviewSubmissions",
                params={"filter[app]": APP_ID, "limit": "10"})["data"]
    print()
    for s in subs:
        items = call("get", f"/v1/reviewSubmissions/{s['id']}/items")["data"]
        sa = s["attributes"]
        print(f"  submission {sa['state']:20} items={len(items)} "
              f"submitted={sa.get('submittedDate') or '—'}")

    # App Privacy has no endpoint on this API version — it is genuinely invisible
    # here, and "Add for Review" blocks until it is Published, not merely filled.
    print("\n  ?   App Privacy — not exposed by the API; confirm it shows "
          "'Published' in the web UI")

    if problems:
        sys.exit(f"\n{len(problems)} blocking: " + ", ".join(problems))
    print("\nNothing blocking.")


if __name__ == "__main__":
    main()
