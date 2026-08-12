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

/// SF Symbol name per kind. `yoga` has no fitting native glyph, so `KindIcon`
/// draws it; the name here is only a fallback. Mirrors the PWA's icon map.
public func kindSymbol(_ kind: String) -> String {
    switch kind {
    case EventKind.breakGap: return "cup.and.saucer.fill"
    case EventKind.ceremony, EventKind.workshop: return "sparkles"
    case EventKind.yoga: return "figure.stand" // fallback only
    default: return "speaker.wave.2.fill" // music + anything unknown
    }
}

/// Per-kind event icon, mirroring the PWA's lucide set. `yoga` (seated figure) is
/// drawn as a custom vector shape; everything else uses its SF Symbol. Sized by
/// `size`, tinted by `color`.
public struct KindIcon: View {
    public let kind: String
    public let size: CGFloat
    public let color: Color
    public init(_ kind: String, size: CGFloat, color: Color) {
        self.kind = kind
        self.size = size
        self.color = color
    }
    private var stroke: StrokeStyle {
        StrokeStyle(lineWidth: max(1, size / 12), lineCap: .round, lineJoin: .round)
    }
    public var body: some View {
        switch kind {
        case EventKind.yoga:
            MeditationShape().stroke(color, style: stroke).frame(width: size, height: size)
        default:
            Image(systemName: kindSymbol(kind))
                .font(.system(size: size * 0.82))
                .foregroundStyle(color)
                .frame(width: size, height: size)
        }
    }
}


/// Seated meditation / yoga figure, matching the PWA SVG (24-unit design space).
struct MeditationShape: Shape {
    func path(in r: CGRect) -> Path {
        let s = min(r.width, r.height) / 24
        let ox = r.minX + (r.width - 24 * s) / 2
        let oy = r.minY + (r.height - 24 * s) / 2
        func p(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: ox + x * s, y: oy + y * s) }
        var path = Path()
        path.addEllipse(in: CGRect(x: p(12, 4.5).x - 2.5 * s, y: p(12, 4.5).y - 2.5 * s,
                                   width: 5 * s, height: 5 * s))   // head
        // Shoulders
        path.move(to: p(8.2, 9.4))
        path.addCurve(to: p(12, 8.5), control1: p(9.4, 8.8), control2: p(10.7, 8.5))
        path.addCurve(to: p(15.8, 9.4), control1: p(13.3, 8.5), control2: p(14.6, 8.8))
        // Left arm
        path.move(to: p(8.2, 9.4))
        path.addCurve(to: p(6.6, 15.9), control1: p(8.0, 12.0), control2: p(7.6, 14.4))
        path.addCurve(to: p(4.0, 17.4), control1: p(5.9, 16.9), control2: p(5.1, 17.4))
        // Right arm
        path.move(to: p(15.8, 9.4))
        path.addCurve(to: p(17.4, 15.9), control1: p(16.0, 12.0), control2: p(16.4, 14.4))
        path.addCurve(to: p(20.0, 17.4), control1: p(18.1, 16.9), control2: p(18.9, 17.4))
        // Left leg
        path.move(to: p(8, 9.6))
        path.addCurve(to: p(8.4, 16.4), control1: p(8.2, 12.0), control2: p(8.6, 14.6))
        path.addCurve(to: p(5.4, 20.0), control1: p(8.2, 18.2), control2: p(6.9, 19.2))
        path.addLine(to: p(3.6, 21.0))
        // Right leg
        path.move(to: p(16, 9.6))
        path.addCurve(to: p(15.6, 16.4), control1: p(15.8, 12.0), control2: p(15.4, 14.6))
        path.addCurve(to: p(18.6, 20.0), control1: p(15.8, 18.2), control2: p(17.1, 19.2))
        path.addLine(to: p(20.4, 21.0))
        // Mat
        path.move(to: p(3.6, 21)); path.addLine(to: p(12, 17.9)); path.addLine(to: p(20.4, 21))
        path.move(to: p(8.8, 19)); path.addLine(to: p(12, 20.4)); path.addLine(to: p(15.2, 19.0))
        return path
    }
}


/// lucide-style drum, matching the PWA drum glyph.

/// "Made by <name>" credit where only the maker's name is a tappable link to
/// `AppLinks.maker`. Shared by the iOS and watch settings "About" sections.
public func madeByCredit(_ locale: AppLocale) -> AttributedString {
    let prefix = AttributedString(L.t("about.madeprefix", locale) + " ")
    var name = AttributedString(L.t("about.makername", locale))
    name.link = AppLinks.maker
    name.foregroundColor = .secondary
    name.underlineStyle = .single
    return prefix + name
}

/// MicrOasis palette, mirroring the web app's CSS tokens
/// (`pwa/app/globals.css` `@theme`) — keep the two in sync. The ink/line
/// values are the festival's own site colours; the accents come from the
/// printed OASIS and WADI posters.
public enum Theme {
    public static let ink = Color(hex: "#170c0b")
    public static let ink2 = Color(hex: "#1f1412")
    public static let ink3 = Color(hex: "#261613")
    public static let line = Color(hex: "#645145")
    public static let cream = Color(hex: "#f2e7d8")
    public static let creamDim = Color(hex: "#c2ab98")
    public static let creamFaint = Color(hex: "#8d7767")
    public static let sun = Color(hex: "#c89468") // primary sand accent
    public static let ember = Color(hex: "#b5764a") // deeper terracotta
    public static let leaf = Color(hex: "#7e9187")
    public static let teal = Color(hex: "#8fa69b")
    public static let now = Color(hex: "#ff5d6c")

    /// Language chip colours. Unused by the all-music programme, kept wired.
    public static func chip(_ lang: String?) -> (bg: Color, fg: Color, label: String) {
        switch lang {
        case "both": return (Color(hex: "#e0b93a"), Color(hex: "#170c0b"), "EN+HU")
        case "en": return (Color(hex: "#9d6fc4"), .white, "EN")
        case "hu": return (Color(hex: "#8fa69b"), Color(hex: "#170c0b"), "HU")
        default: return (Color(hex: "#6b5a4e"), Color(hex: "#f2e7d8"), "Ø")
        }
    }
}
