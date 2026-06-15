import SwiftUI

public extension Color {
    /// Create a Color from a "#rrggbb" / "rrggbb" hex string (alpha optional).
    init(hex: String) {
        var s = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        if s.count == 3 { s = s.map { "\($0)\($0)" }.joined() }
        var v: UInt64 = 0
        Scanner(string: s).scanHexInt64(&v)
        let r, g, b, a: Double
        if s.count == 8 {
            r = Double((v >> 24) & 0xff) / 255
            g = Double((v >> 16) & 0xff) / 255
            b = Double((v >> 8) & 0xff) / 255
            a = Double(v & 0xff) / 255
        } else {
            r = Double((v >> 16) & 0xff) / 255
            g = Double((v >> 8) & 0xff) / 255
            b = Double(v & 0xff) / 255
            a = 1
        }
        self.init(.sRGB, red: r, green: g, blue: b, opacity: a)
    }
}

/// SF Symbol shown on an event's time row: sparkles for workshops, a loud
/// speaker for everything else (music / ceremony). Mirrors the PWA.
public func kindSymbol(_ kind: String) -> String {
    kind == EventKind.workshop ? "sparkles" : "speaker.wave.2.fill"
}

/// Manas green palette, mirroring the web app's CSS tokens.
public enum Theme {
    public static let ink = Color(hex: "#0c1611")
    public static let ink2 = Color(hex: "#122017")
    public static let ink3 = Color(hex: "#1a2e22")
    public static let line = Color(hex: "#2b4736")
    public static let cream = Color(hex: "#edf4ec")
    public static let creamDim = Color(hex: "#aec8b6")
    public static let creamFaint = Color(hex: "#6d8c79")
    public static let sun = Color(hex: "#5ec98a") // primary green
    public static let leaf = Color(hex: "#3f9d6a")
    public static let teal = Color(hex: "#46b3a3")
    public static let now = Color(hex: "#ff5d6c")

    /// Language chip colours, matching the printed poster legend.
    public static func chip(_ lang: String?) -> (bg: Color, fg: Color, label: String) {
        switch lang {
        case "both": return (Color(hex: "#e0b93a"), Color(hex: "#160c08"), "EN+HU")
        case "en": return (Color(hex: "#9d6fc4"), .white, "EN")
        case "hu": return (Color(hex: "#46b3a3"), Color(hex: "#0c1611"), "HU")
        default: return (Color(hex: "#5e6b63"), Color(hex: "#e9efe9"), "Ø")
        }
    }
}
