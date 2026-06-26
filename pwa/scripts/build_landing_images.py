#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["pyyaml", "pillow"]
# ///
"""Build every image the /app landing needs, from the raw app screenshots.

ONE script, re-runnable. Source of truth is `apple/screenshots/{hu,en}/` (regenerate
those with `apple/screenshots/make_screenshots.py` on a machine with full Xcode +
the iOS/watchOS simulators). For each language this produces (as .webp — small, and
served by a plain <img> so there is no next/image optimizer cache to fight):

  public/landing/framed/<lang>/iphone-*.webp   framed iPhone screenshots (feature rows)
  public/landing/framed/<lang>/watch-*.webp    framed Apple Watch screenshots (band-less)
  public/landing/framed/<lang>/hero.webp       phone + rotated band-less watch, one image

one shared link-preview card:

  public/landing/og.png                         1200×630 OpenGraph / Twitter (phone + strapped watch)

and a cache-busting version constant so regenerated images are never served stale:

  lib/landing-version.ts                        export const LANDING_IMG_V = "<unix-ts>"

iPhones are framed by Koubou (real frame, no cropping). Watches are framed by Pillow
into a clean band-less Apple-Watch body (Koubou only ships strapped watches and its
watch screen-rect letterboxed the square UI). The OG, by contrast, shows the phone
beside a strapped Ultra watch (Koubou). Run:

    kou setup-frames                            # one-time: download Koubou frames
    uv run pwa/scripts/build_landing_images.py  # rebuild everything
"""
from __future__ import annotations

import functools
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import yaml
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).resolve().parent
PWA = HERE.parent
ROOT = PWA.parent
RAW = ROOT / "apple" / "screenshots"
FRAMED = PWA / "public" / "landing" / "framed"
FONTS = HERE / "assets" / "fonts"
ICON = PWA / "public" / "icons" / "icon-512.png"
BADGE_SVG = PWA / "public" / "appstore-badge.svg"
OG_OUT = PWA / "public" / "landing" / "og.png"
VERSION_TS = PWA / "lib" / "landing-version.ts"

LANGS = ["hu", "en"]
KOU = shutil.which("kou") or str(Path.home() / ".local/bin/kou")
SHARP = PWA / "node_modules" / "sharp"

IPHONE_FRAME, IPHONE_SIZE = "iPhone 15 Pro - Black Titanium - Portrait", [1419, 2796]
IPHONE_SHOTS = [
    "iphone-01-timetable-thursday", "iphone-02-timetable-friday",
    "iphone-03-now-friday", "iphone-04-timetable-terrace", "iphone-05-settings",
]
WATCH_SHOTS = [
    "watch-01-now-portal", "watch-02-now-terrace", "watch-03-now-mandala",
    "watch-04-widget-portal", "watch-05-widget-field",
]
IPHONE_OUT_W = 720
HERO_PHONE = "iphone-01-timetable-thursday"
HERO_WATCH = "watch-01-now-portal"

CREAM = (237, 244, 236)
CREAM_DIM = (174, 200, 182)
TEAL = (70, 179, 163)
SUN = (94, 201, 138)
INK = (12, 22, 17)


def save_webp(im: Image.Image, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    im.save(dst, "WEBP", quality=84, method=6)


# ── iPhone framing (Koubou) ─────────────────────────────────────────────────

def koubou_iphone(lang: str, shots: list[str], staging: Path) -> Path:
    cfg = {
        "project": {"name": f"m-{lang}", "output_dir": str(staging),
                    "device": IPHONE_FRAME, "output_size": IPHONE_SIZE},
        "defaults": {"background": {"type": "transparent"}},
        "screenshots": {
            shot: {"content": [{"type": "image", "asset": str(RAW / lang / f"{shot}.png"),
                                "position": ["50%", "50%"], "scale": 1.0, "frame": True}]}
            for shot in shots if (RAW / lang / f"{shot}.png").exists()
        },
    }
    p = staging / f"iphone-{lang}.yaml"
    p.write_text(yaml.safe_dump(cfg))
    subprocess.run([KOU, "generate", str(p)], check=True, stdout=subprocess.DEVNULL)
    folder = staging / IPHONE_FRAME.replace(" ", "_")
    return folder if folder.exists() else next(q for q in staging.iterdir() if q.is_dir())


def fit_w(im, w):
    return im if im.width <= w else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)


def frame_iphones(lang: str, staging: Path) -> None:
    folder = koubou_iphone(lang, IPHONE_SHOTS, staging)
    for shot in IPHONE_SHOTS:
        src = folder / f"{shot}.png"
        if src.exists():
            save_webp(fit_w(Image.open(src).convert("RGBA"), IPHONE_OUT_W), FRAMED / lang / f"{shot}.webp")
            print(f"  ✓ {lang}/{shot}.webp")


# ── Apple Watch framing (Pillow, band-less) ─────────────────────────────────

# Adjustable: watch bezel thickness (÷ screen width) and body corner radius (÷ body
# width). The screen's corners are then rounded CONCENTRICALLY with the body
# (screen radius = body radius − bezel), like a real watch.
WATCH_BEZEL = 0.072
WATCH_BODY_RADIUS = 0.25


def watch_frame(screen: Image.Image) -> Image.Image:
    SS = 4
    screen = screen.convert("RGBA")
    sw, sh = screen.size
    bz = round(sw * WATCH_BEZEL)
    body_w, body_h = sw + 2 * bz, sh + 2 * bz
    rad = round(body_w * WATCH_BODY_RADIUS)
    crown = round(body_w * 0.05)
    W, H = (body_w + crown) * SS, body_h * SS
    c = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(c)
    bx = body_w * SS
    cy = round(H * 0.36)
    d.rounded_rectangle([bx - 6 * SS, cy, bx + crown * SS, cy + round(body_h * SS * 0.13)], 4 * SS, fill=(150, 152, 150, 255))
    by = round(H * 0.56)
    d.rounded_rectangle([bx - 4 * SS, by, bx + round(crown * SS * 0.6), by + round(body_h * SS * 0.16)], 3 * SS, fill=(60, 62, 60, 255))
    d.rounded_rectangle([0, 0, body_w * SS, H - 1], rad * SS, fill=(92, 95, 96, 255))
    ins = round(2.5 * SS)
    d.rounded_rectangle([ins, ins, body_w * SS - ins, H - 1 - ins], rad * SS - ins, fill=(17, 19, 18, 255))
    ssz = (sw * SS, sh * SS)
    s = screen.resize(ssz, Image.LANCZOS)
    m = Image.new("L", ssz, 0)
    # concentric with the body: screen radius = body radius − bezel
    ImageDraw.Draw(m).rounded_rectangle([0, 0, ssz[0], ssz[1]], (rad - bz) * SS, fill=255)
    c.paste(s, (bz * SS, bz * SS), m)
    return c.resize((body_w + crown, body_h), Image.LANCZOS)


def frame_watches(lang: str) -> None:
    for shot in WATCH_SHOTS:
        raw = RAW / lang / f"{shot}.png"
        if raw.exists():
            save_webp(watch_frame(Image.open(raw)), FRAMED / lang / f"{shot}.webp")
            print(f"  ✓ {lang}/{shot}.webp")


# ── hero composite (band-less) ──────────────────────────────────────────────

def device_cluster(lang: str) -> Image.Image:
    phone = Image.open(FRAMED / lang / f"{HERO_PHONE}.webp").convert("RGBA")
    watch = Image.open(FRAMED / lang / f"{HERO_WATCH}.webp").convert("RGBA")
    ph_w, ph_h = phone.size
    wt_w = round(ph_w * 0.52)
    watch = watch.resize((wt_w, round(watch.height * wt_w / watch.width)), Image.LANCZOS)
    watch = watch.rotate(10, expand=True, resample=Image.BICUBIC)
    pad_l = round(wt_w * 0.5)
    canvas = Image.new("RGBA", (pad_l + ph_w, ph_h + round(watch.height * 0.14)), (0, 0, 0, 0))
    canvas.alpha_composite(phone, (pad_l, 0))
    canvas.alpha_composite(watch, (pad_l - round(wt_w * 0.52), ph_h - round(watch.height * 0.82) - 50))
    return canvas


def build_hero() -> None:
    for lang in LANGS:
        save_webp(device_cluster(lang), FRAMED / lang / "hero.webp")
        print(f"  ✓ {lang}/hero.webp")


# ── OpenGraph card ──────────────────────────────────────────────────────────

@functools.lru_cache(maxsize=None)
def font(p, s):
    return ImageFont.truetype(str(FONTS / p), s)


def smooth_glow(size, color, alpha, blur):
    layer = Image.new("RGBA", (1200, 630), (0, 0, 0, 0))
    w, h = size
    ImageDraw.Draw(layer).ellipse([-w // 2, -h // 2, w // 2, h // 2], fill=(*color, alpha))
    return layer.filter(ImageFilter.GaussianBlur(blur))


def gradient_bg() -> Image.Image:
    # smooth top→bottom forest ramp + ONE big soft top-left glow (a second glow
    # near the right read as a vertical seam) + fine noise dither to kill banding.
    top, bot = (21, 40, 29), (9, 16, 13)
    ramp = Image.new("RGB", (1, 630))
    for y in range(630):
        t = y / 629
        ramp.putpixel((0, y), tuple(round(top[i] * (1 - t) + bot[i] * t) for i in range(3)))
    base = ramp.resize((1200, 630)).convert("RGBA")
    base.alpha_composite(smooth_glow((1700, 1300), (46, 107, 74), 52, 340), (-260, -360))
    noise = Image.effect_noise((1200, 630), 7).convert("L")
    return Image.alpha_composite(base, Image.merge("RGBA", (noise, noise, noise, noise.point(lambda v: 7))))


def rounded(img, radius):
    m = Image.new("L", img.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, *img.size], radius, fill=255)
    out = img.convert("RGBA")
    out.putalpha(m)
    return out


def tracked(draw, xy, text, fnt, fill, tracking):
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=fnt, fill=fill)
        x += draw.textlength(ch, font=fnt) + tracking


def wrap(draw, text, fnt, max_w):
    lines, cur = [], ""
    for word in text.split():
        t = (cur + " " + word).strip()
        if draw.textlength(t, font=fnt) <= max_w:
            cur = t
        else:
            lines.append(cur); cur = word
    if cur:
        lines.append(cur)
    return lines


def shadow_paste(base, img, pos, blur=30, alpha=140, dy=22):
    sh = Image.new("RGBA", base.size, (0, 0, 0, 0))
    tmp = Image.new("RGBA", img.size, (0, 0, 0, 0))
    tmp.putalpha(img.split()[3].point(lambda v: min(v, alpha)))
    sh.paste(tmp, (pos[0], pos[1] + dy), tmp)
    base.alpha_composite(sh.filter(ImageFilter.GaussianBlur(blur)))
    base.alpha_composite(img, pos)


def rasterize_badge(height: int) -> Image.Image:
    out = Path(tempfile.gettempdir()) / "og-badge.png"
    js = (f"const s=require({str(SHARP)!r});"
          f"s({str(BADGE_SVG)!r},{{density:600}}).resize({{height:{height}}}).png().toFile({str(out)!r}).then(()=>{{}});")
    subprocess.run(["node", "-e", js], check=True, cwd=str(PWA))
    return Image.open(out).convert("RGBA")


# lucide icon paths (24×24, stroke), matching the landing's TrustPills.
LUCIDE = {
    "gift": '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/>'
            '<path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/>'
            '<path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>',
    "user-x": '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>'
              '<line x1="17" x2="22" y1="8" y2="13"/><line x1="22" x2="17" y1="8" y2="13"/>',
    "ban": '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
}


def rasterize_icon(key: str, color: str, size: int) -> Image.Image:
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" '
           f'stroke="{color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'
           f'{LUCIDE[key]}</svg>')
    sp = Path(tempfile.gettempdir()) / f"ic-{key}.svg"
    sp.write_text(svg)
    op = Path(tempfile.gettempdir()) / f"ic-{key}.png"
    js = (f"const s=require({str(SHARP)!r});"
          f"s({str(sp)!r},{{density:600}}).resize({size},{size}).png().toFile({str(op)!r}).then(()=>{{}});")
    subprocess.run(["node", "-e", js], check=True, cwd=str(PWA))
    return Image.open(op).convert("RGBA")


def chips(base: Image.Image, x: int, bottom_y: int, items, fnt) -> None:
    """Single row of frosted icon+label chips, drawn on a separate RGBA layer so the
    translucency survives the RGB flatten. `bottom_y` aligns the chips' bottom edge."""
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    ph, icon_sz, pad, igap, gap = 32, 17, 13, 7, 10
    cy = bottom_y - ph
    cx = x
    for label, icon_key, color in items:
        w = pad + icon_sz + igap + round(d.textlength(label, font=fnt)) + pad
        d.rounded_rectangle([cx, cy, cx + w, cy + ph], radius=ph // 2,
                            fill=(255, 255, 255, 24), outline=(255, 255, 255, 74), width=1)
        layer.alpha_composite(rasterize_icon(icon_key, color, icon_sz), (cx + pad, cy + (ph - icon_sz) // 2))
        d.text((cx + pad + icon_sz + igap, cy + ph / 2), label, font=fnt, fill=CREAM_DIM, anchor="lm")
        cx += w + gap
    base.alpha_composite(layer)


def build_og() -> None:
    # ── OG layout — tweak freely (all px on the 1200×630 card) ───────────────
    PHONE_H = 560        # iPhone height
    PHONE_RIGHT = 70     # phone's gap from the right edge
    WATCH_SCALE = 0.36   # watch height ÷ phone height
    WATCH_GAP = 50       # horizontal gap between watch and phone (they don't touch)
    WATCH_TOP = 300      # watch's top, measured down from the card top
    TEXT_X = 80          # left column x
    ICON_Y = 54          # app icon top
    GUIDE_Y = 150        # "GUIDE FOR"
    MANAS_Y = 165        # "MANAS 2026"
    LINE1_Y = 252        # 1st small line under MANAS (unofficial)
    LINE2_Y = 285        # 2nd small line (platforms)
    SUB_Y = 320          # value-prop sentence (first line)
    BADGE_Y = 440        # App Store badge top
    CHIPS_BOTTOM = 570   # chips' bottom edge
    # ─────────────────────────────────────────────────────────────────────────

    base = gradient_bg()
    phone = Image.open(FRAMED / "hu" / f"{HERO_PHONE}.webp").convert("RGBA")
    watch = Image.open(FRAMED / "hu" / f"{HERO_WATCH}.webp").convert("RGBA")  # band-less
    phone = phone.resize((round(phone.width * PHONE_H / phone.height), PHONE_H), Image.LANCZOS)
    wt_h = round(PHONE_H * WATCH_SCALE)
    watch = watch.resize((round(watch.width * wt_h / watch.height), wt_h), Image.LANCZOS)
    px = 1200 - phone.width - PHONE_RIGHT
    py = (630 - PHONE_H) // 2
    shadow_paste(base, watch, (px - WATCH_GAP - watch.width, WATCH_TOP), blur=24, alpha=130)
    shadow_paste(base, phone, (px, py))

    d = ImageDraw.Draw(base)
    x = TEXT_X
    base.alpha_composite(rounded(Image.open(ICON).convert("RGBA").resize((78, 78), Image.LANCZOS), 18), (x, ICON_Y))
    tracked(d, (x + 2, GUIDE_Y), "GUIDE FOR", font("Inter-SemiBold.ttf", 16), CREAM_DIM, 4)
    mfont = font("Baloo2-ExtraBold.ttf", 66)
    mx = x
    for part, col in (("MANAS ", CREAM), ("2026", SUN)):
        d.text((mx, MANAS_Y), part, font=mfont, fill=col)
        mx += d.textlength(part, font=mfont)
    tracked(d, (x + 2, LINE1_Y), "UNOFFICIAL · NEM HIVATALOS", font("Inter-SemiBold.ttf", 12), (140, 142, 140), 2)
    tracked(d, (x + 2, LINE2_Y), "iPhone · Apple Watch · WebApp (Android)", font("Inter-SemiBold.ttf", 16), CREAM, 1)

    sub = "Teljes időrend minden színpadról, élő MOST nézet és Apple Watch widgetek, hogy mindig tudd melyik program mikor kezdődik."
    sfont = font("Inter-Regular.ttf", 20)
    yy = SUB_Y
    for line in wrap(d, sub, sfont, 470):
        d.text((x, yy), line, font=sfont, fill=CREAM_DIM)
        yy += 29

    base.alpha_composite(rasterize_badge(50), (x, BADGE_Y))
    chips(base, x, CHIPS_BOTTOM,
          [("Ingyenes", "gift", "#5ec98a"),
           ("Regisztráció nélkül", "user-x", "#46b3a3"),
           ("Reklámmentes", "ban", "#e0913f")],
          font("Inter-Regular.ttf", 15))

    OG_OUT.parent.mkdir(parents=True, exist_ok=True)
    base.convert("RGB").save(OG_OUT, "PNG")
    print(f"  ✓ {OG_OUT.relative_to(PWA)}  (1200×630)")


def write_version() -> None:
    v = str(int(time.time()))
    VERSION_TS.write_text(
        "// AUTO-GENERATED by pwa/scripts/build_landing_images.py — cache-busts the\n"
        "// framed landing images (their filenames are stable) on every regeneration.\n"
        f'export const LANDING_IMG_V = "{v}";\n'
    )
    print(f"  ✓ lib/landing-version.ts  (v={v})")


def main() -> None:
    if not Path(KOU).exists():
        sys.exit("`kou` not found. Install: `uv tool install koubou` then `kou setup-frames`.")
    print(f"Koubou: {KOU}\nFraming screenshots…")
    with tempfile.TemporaryDirectory() as tmp:
        for lang in LANGS:
            frame_iphones(lang, Path(tmp))
            frame_watches(lang)
    print("Composing hero images…")
    build_hero()
    print("Composing OpenGraph card…")
    build_og()
    print("Writing version…")
    write_version()
    print("\nDone.")


if __name__ == "__main__":
    main()