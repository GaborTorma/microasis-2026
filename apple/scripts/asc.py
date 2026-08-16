#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["pyjwt[crypto]", "requests"]
# ///
"""App Store Connect API client — the shared base for the other `asc_*` scripts.

Apple ships no CLI for the App Store Connect API, and every request must carry a
short-lived ES256 JWT signed with the account's `.p8` key. That is all this file
does: mint the token, send the request, hand back parsed JSON. It is also usable
on its own as a thin curl-for-ASC.

**The `.p8` key is a secret and is NOT in this repo.** It lives at
`~/.appstoreconnect/private_keys/AuthKey_<KEY_ID>.p8` (where Xcode's own tooling
looks). Losing it means generating a new one in App Store Connect → Users and
Access → Integrations; Apple only lets you download a key once.

The key/issuer ids below are account identifiers, not secrets — useless without
the `.p8`. Override any of them with an env var to run against another account.

Usage (from `apple/`):
    uv run scripts/asc.py get  /v1/apps
    uv run scripts/asc.py get  /v1/builds "filter[app]=6800753437" limit=5
    uv run scripts/asc.py patch /v1/appStoreVersions/<id> '{"data": {...}}'

Query params are `key=value` args; a body is a single JSON argument.
"""
from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

import jwt
import requests

KEY_ID = os.environ.get("ASC_KEY_ID", "HKX7X448XX")
ISSUER_ID = os.environ.get("ASC_ISSUER_ID", "ba3b616c-6e1a-49b7-9e6a-1309c6a05d08")
APP_ID = os.environ.get("ASC_APP_ID", "6800753437")  # Guide for MicrOasis 2026
KEY_PATH = Path(
    os.environ.get(
        "ASC_KEY_PATH", Path.home() / ".appstoreconnect/private_keys" / f"AuthKey_{KEY_ID}.p8"
    )
)
BASE = "https://api.appstoreconnect.apple.com"


def token() -> str:
    """A 20-minute ES256 token. Apple rejects anything longer-lived."""
    if not KEY_PATH.exists():
        sys.exit(f"App Store Connect key not found at {KEY_PATH}\n"
                 "Download it from App Store Connect → Users and Access → Integrations, "
                 "or point ASC_KEY_PATH at it.")
    now = int(time.time())
    return jwt.encode(
        {"iss": ISSUER_ID, "iat": now, "exp": now + 19 * 60, "aud": "appstoreconnect-v1"},
        KEY_PATH.read_text(),
        algorithm="ES256",
        headers={"kid": KEY_ID, "typ": "JWT"},
    )


def call(method: str, path: str, body=None, params=None) -> dict:
    """One API call. Always returns a dict with `_status`; errors are data, not
    exceptions, because Apple returns meaningful bodies with its 4xx codes."""
    url = path if path.startswith("http") else BASE + path
    r = requests.request(
        method,
        url,
        headers={"Authorization": f"Bearer {token()}", "Content-Type": "application/json"},
        json=body,
        params=params,
        timeout=120,
    )
    if r.status_code == 204 or not r.content:
        return {"_status": r.status_code}
    try:
        out = r.json()
    except ValueError:
        return {"_status": r.status_code, "_text": r.text[:2000]}
    out["_status"] = r.status_code
    return out


def fail(res: dict, what: str) -> None:
    """Abort with Apple's own explanation — its `detail` strings are specific."""
    if res.get("_status", 0) < 400:
        return
    for e in res.get("errors", []):
        print(f"  {e.get('status')} {e.get('code')}: {e.get('detail')}", file=sys.stderr)
    sys.exit(f"{what} failed ({res.get('_status')})")


# ── lookups (so callers never hardcode a resource id) ──────────────────────

def editable_version() -> dict:
    """The version currently being prepared, or the live one if none is open.

    Sorting by `-versionString` puts the newest first: a released 1.0 and an
    in-progress 1.1 coexist, and the in-progress one is what a release script
    means by "the version".
    """
    r = call("get", f"/v1/apps/{APP_ID}/appStoreVersions",
             params={"filter[platform]": "IOS", "limit": "10"})
    fail(r, "listing versions")
    versions = r["data"]
    editable = [v for v in versions
                if v["attributes"]["appStoreState"] not in ("READY_FOR_SALE", "REPLACED_WITH_NEW_VERSION")]
    return (editable or versions)[0]


def latest_build() -> dict | None:
    """Newest uploaded build, whatever its processing state."""
    r = call("get", "/v1/builds", params={"filter[app]": APP_ID, "limit": "5",
                                          "sort": "-uploadedDate"})
    fail(r, "listing builds")
    return r["data"][0] if r["data"] else None


def main() -> None:
    method, path = sys.argv[1].lower(), sys.argv[2]
    body, params = None, {}
    for arg in sys.argv[3:]:
        if arg.lstrip().startswith("{"):
            body = json.loads(arg)
        elif "=" in arg:
            k, v = arg.split("=", 1)
            params[k] = v
    print(json.dumps(call(method, path, body, params or None), indent=1))


if __name__ == "__main__":
    main()
