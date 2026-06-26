#!/usr/bin/env python3
"""Bake the watch share QR as a static asset.

watchOS has no CoreImage, so unlike iOS (`ShareView.QRCode`, runtime CIFilter) the
watch can't generate the QR on device. The encoded URL is fixed, so we pre-render it
once into the watch asset catalog and the watch just displays the image.

KEEP IN SYNC: `URL` below must equal `AppLinks.qr` in
`Sources/ManasKit/AppState.swift` (https://manas.torma.ai/get). If that link ever
changes, re-run this script. Colours + error-correction match the iOS `QRCode` enum
(ink #0c1611 modules on cream #edf4ec, correction level M) so both clients look alike.

Usage (from `apple/`):
    python3 -m venv .venv && .venv/bin/pip install 'qrcode[pil]'
    .venv/bin/python scripts/build_share_qr.py
"""
from pathlib import Path

import qrcode
from qrcode.constants import ERROR_CORRECT_M

URL = "https://manas.torma.ai/get"  # == AppLinks.qr
INK = "#0c1611"   # dark modules
CREAM = "#edf4ec"  # light field
OUT = Path(__file__).resolve().parent.parent / (
    "Sources/Manas-watch/Assets.xcassets/ShareQR.imageset/share-qr.png"
)


def main() -> None:
    # border = the light quiet zone in modules (kept tight: the watch card is small
    # and the high-contrast ink background around the cream gives extra effective margin).
    qr = qrcode.QRCode(error_correction=ERROR_CORRECT_M, box_size=20, border=2)
    qr.add_data(URL)
    qr.make(fit=True)
    img = qr.make_image(fill_color=INK, back_color=CREAM)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT)
    print(f"wrote {OUT} ({img.size[0]}×{img.size[1]} px, {qr.version=})")


if __name__ == "__main__":
    main()
