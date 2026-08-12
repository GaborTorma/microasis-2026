# MicrOasis 2026 → TestFlight

The iOS app (`MicrOasis`) **embeds** the watchOS app (`MicrOasisWatch`), so **one upload
delivers both**. Bundle IDs:

- iOS: `ai.torma.microasis.2026`
- watch (embedded): `ai.torma.microasis.2026.watchkitapp`

You run the signing + upload steps yourself (they need your Apple Developer
credentials, which the assistant can't handle). Everything else is ready: app
icons, embedded watch, version `1.0.0 (1)`, HTTPS export-compliance flag.

## 0. Prerequisites (once)

- Active **Apple Developer Program** membership.
- Xcode signed in: **Xcode → Settings → Accounts →** add your Apple ID.
- Generate the project: `cd apple && xcodegen generate`.

## 1. Register the App ID + create the App Store Connect record

1. App Store Connect → **Apps → ➕ → New App**
   - Platform: **iOS**
   - Name: **`Guide for MicrOasis 2026`** (the App Store + on-device display name)
   - Primary language: **Hungarian**
   - Bundle ID: **`ai.torma.microasis.2026`** (if it isn't listed, register it at
     developer.apple.com → Certificates, IDs & Profiles → Identifiers, or let
     Xcode auto-register it during the first archive)
   - SKU: anything, e.g. `microasis2026`
2. The embedded watch app needs **no separate record**.

## 2. Select your Team (signing)

Open `apple/MicrOasis.xcodeproj`, then for **both** targets (`MicrOasis` and
`MicrOasisWatch`): **Signing & Capabilities →** tick *Automatically manage signing*
→ pick your **Team**. (Or set `DEVELOPMENT_TEAM` in `project.yml` and re-run
`xcodegen generate`.)

## 3a. Upload — Xcode GUI (recommended, no secrets)

1. Destination: **Any iOS Device (arm64)**.
2. **Product → Archive**.
3. In the Organizer: **Distribute App → App Store Connect → Upload** → next
   through the defaults → **Upload**.

## 3b. Upload — CLI (alternative)

```bash
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
cd apple
# edit ExportOptions.plist → set teamID first
xcodebuild -project MicrOasis.xcodeproj -scheme MicrOasis -configuration Release \
  -archivePath build/MicrOasis.xcarchive archive DEVELOPMENT_TEAM=YOUR_TEAM_ID
xcodebuild -exportArchive -archivePath build/MicrOasis.xcarchive \
  -exportOptionsPlist ExportOptions.plist -exportPath build/export
```

Then upload `build/export/*.ipa` with the **Transporter** app, or with an
**App Store Connect API key** (`.p8` + key id + issuer id):

```bash
xcrun altool --upload-app -f build/export/MicrOasis.ipa -t ios \
  --apiKey KEYID --apiIssuer ISSUERID
```

## 4. TestFlight

App Store Connect → **TestFlight** tab → wait for processing (~5–15 min) →
add **internal testers** → they install via the TestFlight app on iPhone; the
watch app appears on the paired Apple Watch.

## Notes / next bumps

- Increment the **build number** (`CURRENT_PROJECT_VERSION` in `project.yml`)
  for every new upload; keep `MARKETING_VERSION` for user-facing versions.
- App icon is the shared mandala (1024², opaque). Swap the artwork in
  `Sources/MicrOasis-*/Assets.xcassets/AppIcon.appiconset/icon-1024.png` if desired.
- Export compliance: `ITSAppUsesNonExemptEncryption=false` is already set
  (the app only uses standard HTTPS), so no per-build encryption prompt.
