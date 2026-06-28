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

/// SF Symbol name per kind. `sound-bath` & `drum` have no native SF glyph —
/// they're drawn by `KindIcon`'s custom shapes; the names here are only a
/// fallback. Mirrors the PWA's lucide kind→icon map.
public func kindSymbol(_ kind: String) -> String {
    switch kind {
    case EventKind.voice: return "mic.fill"
    case EventKind.yoga: return "figure.stand"
    case EventKind.wind: return "wind"
    case EventKind.dance: return "shoeprints.fill"
    case EventKind.drama: return "theatermasks.fill"
    case EventKind.mind: return "brain.head.profile"
    case EventKind.build: return "hammer.fill"
    case EventKind.handpan: return "opticaldisc"
    case EventKind.breakGap: return "cup.and.saucer.fill"
    case EventKind.ceremony, EventKind.workshop: return "sparkles"
    case EventKind.soundBath: return "waveform" // fallback only
    case EventKind.drum: return "metronome.fill" // fallback only
    default: return "speaker.wave.2.fill" // music + anything unknown
    }
}

/// Per-category event icon, mirroring the PWA's lucide set. `sound-bath` (singing
/// bowl) and `drum` are drawn as custom vector shapes (no SF Symbol exists);
/// everything else uses its SF Symbol. Sized by `size`, tinted by `color`.
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
        case EventKind.soundBath:
            SingingBowlShape().stroke(color, style: stroke).frame(width: size, height: size)
        case EventKind.drum:
            DrumShape().stroke(color, style: stroke).frame(width: size, height: size)
        default:
            Image(systemName: kindSymbol(kind))
                .font(.system(size: size * 0.82))
                .foregroundStyle(color)
                .frame(width: size, height: size)
        }
    }
}

/// lucide-style singing bowl ("hangtál"), matching the PWA custom SVG (24-unit
/// design space scaled to the frame).
struct SingingBowlShape: Shape {
    func path(in r: CGRect) -> Path {
        let s = min(r.width, r.height) / 24
        func p(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: r.minX + x * s, y: r.minY + y * s) }
        var path = Path()
        path.move(to: p(4, 11)); path.addLine(to: p(20, 11))                       // rim
        path.move(to: p(6, 11)); path.addQuadCurve(to: p(18, 11), control: p(12, 21)) // bowl body
        path.move(to: p(16, 3)); path.addLine(to: p(13, 10))                        // mallet stick
        path.addEllipse(in: CGRect(x: p(16.6, 2.6).x - 1.2 * s, y: p(16.6, 2.6).y - 1.2 * s,
                                   width: 2.4 * s, height: 2.4 * s))                // mallet head
        return path
    }
}

/// lucide-style drum, matching the PWA drum glyph.
struct DrumShape: Shape {
    func path(in r: CGRect) -> Path {
        let s = min(r.width, r.height) / 24
        func p(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: r.minX + x * s, y: r.minY + y * s) }
        var path = Path()
        path.move(to: p(2, 2)); path.addLine(to: p(10, 10))                         // left stick
        path.move(to: p(22, 2)); path.addLine(to: p(14, 10))                        // right stick
        path.addEllipse(in: CGRect(x: p(2, 4).x, y: p(2, 4).y, width: 20 * s, height: 10 * s)) // top rim
        path.move(to: p(7, 13.4)); path.addLine(to: p(7, 21.3))                     // tension lines
        path.move(to: p(12, 14)); path.addLine(to: p(12, 22))
        path.move(to: p(17, 13.4)); path.addLine(to: p(17, 21.3))
        path.move(to: p(2, 9)); path.addLine(to: p(2, 17))                          // body left wall
        path.addQuadCurve(to: p(22, 17), control: p(12, 27))                        // body bottom
        path.addLine(to: p(22, 9))                                                  // body right wall
        return path
    }
}

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
