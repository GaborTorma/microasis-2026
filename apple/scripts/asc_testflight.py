#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["pyjwt[crypto]", "requests"]
# ///
"""Set the TestFlight "What to Test" notes on the newest uploaded build.

Two API quirks this exists to hide:

- A freshly processed build **already has** its `betaBuildLocalizations`, so
  creating them returns `409 "There is an entity with same 'locale'"`. They must
  be PATCHed, never POSTed.
- Adding a build to an *internal* group returns `422 "Cannot add internal group
  to a build"` — internal groups receive every build automatically, so there is
  nothing to do. (Confusingly, `GET /v1/builds/<id>/betaGroups` still comes back
  empty; query the group's `builds` the other way round to see the truth.)

Write the notes in `notes/testflight-<build>.md` as two `## hu` / `## en-US`
sections, or pass a file. Keep them about what a tester should look at.

Usage (from `apple/`):
    uv run scripts/asc_testflight.py notes.md
    uv run scripts/asc_testflight.py notes.md --build 3
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

from asc import call, fail, latest_build


def parse_notes(path: Path) -> dict[str, str]:
    """`## <locale>` headings split the file; everything under one is its text."""
    text = path.read_text()
    parts = re.split(r"^##\s+([\w-]+)\s*$", text, flags=re.MULTILINE)
    if len(parts) < 3:
        sys.exit(f"{path}: expected '## hu' / '## en-US' sections")
    return {parts[i].strip(): parts[i + 1].strip() for i in range(1, len(parts), 2)}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("notes", type=Path, help="markdown file with ## hu / ## en-US sections")
    ap.add_argument("--build", help="build number (default: newest uploaded)")
    args = ap.parse_args()

    notes = parse_notes(args.notes)

    build = latest_build()
    if not build:
        sys.exit("no builds uploaded")
    if args.build and build["attributes"]["version"] != args.build:
        sys.exit(f"newest build is {build['attributes']['version']}, not {args.build}")
    print(f"build {build['attributes']['version']} "
          f"({build['attributes']['processingState']})")

    existing = call("get", f"/v1/builds/{build['id']}/betaBuildLocalizations")
    fail(existing, "listing beta localizations")
    by_locale = {l["attributes"]["locale"]: l["id"] for l in existing["data"]}

    for locale, text in notes.items():
        lid = by_locale.get(locale)
        if not lid:
            print(f"  !! no {locale} localization on this build", file=sys.stderr)
            continue
        r = call("patch", f"/v1/betaBuildLocalizations/{lid}", body={
            "data": {"type": "betaBuildLocalizations", "id": lid,
                     "attributes": {"whatsNew": text}}})
        fail(r, f"setting {locale} notes")
        print(f"  {locale}: {len(text)} chars")


if __name__ == "__main__":
    main()
