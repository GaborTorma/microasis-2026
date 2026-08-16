# scripts

Release plumbing. Everything here runs with `uv run` from `apple/` — dependencies
are declared inline (PEP 723), so there is no venv to create or requirements file
to keep in step.

## App Store Connect (`asc*.py`)

Apple publishes an API but no CLI for it, and every request needs a short-lived
ES256 JWT signed with the account key. `asc.py` does that once; the rest build on
it. Written because the release steps they cover are the ones with an invisible
failure mode — a screenshot that reports success and fails minutes later, a
submission refused with the same sentence for a dozen different causes.

| script | what it does |
| ------ | ------------ |
| `asc.py` | signs + sends requests; also a bare `curl`-for-ASC on the command line |
| `asc_screenshots.py` | replaces every screenshot slot from `../screenshots/{hu,en}/`, downscaling the 6.9" captures for the 6.5" slot, then waits out Apple's async validation |
| `asc_preflight.py` | read-only; lists what still blocks review and names it |
| `asc_testflight.py` | writes "What to Test" from a markdown file (see `../notes/`) |

```bash
cd apple
uv run scripts/asc_preflight.py                       # what's missing?
uv run scripts/asc_screenshots.py --dry-run           # what would upload where
uv run scripts/asc_screenshots.py
uv run scripts/asc_testflight.py notes/testflight-3.md
uv run scripts/asc.py get /v1/builds "filter[app]=6800753437" limit=5
```

**The API key is a secret and is deliberately not in this repo.** It sits at
`~/.appstoreconnect/private_keys/AuthKey_<KEY_ID>.p8`, where Xcode's own tooling
keeps it, and Apple lets you download a given key exactly once. The key id,
issuer id and app id in `asc.py` are account identifiers rather than secrets —
useless without the `.p8` — and each can be overridden with an env var
(`ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_APP_ID`, `ASC_KEY_PATH`).

None of these submit anything. Submitting is a one-line PATCH
(`reviewSubmissions` → `submitted: true`) left out on purpose: it is the one
irreversible, outward-facing step, and it should be a deliberate act.

See `../STORE_LISTING.md` for the listing copy and the gotchas these scripts
work around — especially why a `READY_FOR_REVIEW` version refuses screenshot
edits, and how to unfreeze it.

## Other

`build_share_qr.py` bakes the watch share QR into the asset catalog (watchOS has
no CoreImage, so it cannot render one at runtime). Re-run it only if
`AppLinks.qr` changes.
