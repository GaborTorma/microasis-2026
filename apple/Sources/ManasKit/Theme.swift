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
/// bowl), `drum`, `handpan` and `yoga` (seated figure) are drawn as custom vector
/// shapes; everything else uses its SF Symbol. Sized by `size`, tinted by `color`.
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
        case EventKind.handpan:
            HandpanShape().stroke(color, style: stroke).frame(width: size, height: size)
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

/// Singing bowl ("hangtál") with mallet + sound lines, matching the PWA SVG
/// (354×297 design space fit into the frame).
struct SingingBowlShape: Shape {
    func path(in r: CGRect) -> Path {
        let s = min(r.width / 354, r.height / 297)
        let ox = r.minX + (r.width - 354 * s) / 2
        let oy = r.minY + (r.height - 297 * s) / 2
        func p(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: ox + x * s, y: oy + y * s) }
        var path = Path()
        // Bowl outer contour
        path.move(to: p(58, 143))
        path.addCurve(to: p(176, 119), control1: p(71, 120), control2: p(106, 118))
        path.addCurve(to: p(296, 143), control1: p(247, 118), control2: p(281, 120))
        path.addCurve(to: p(289, 227), control1: p(313, 169), control2: p(312, 202))
        path.addCurve(to: p(177, 270), control1: p(264, 253), control2: p(224, 268))
        path.addCurve(to: p(65, 227), control1: p(130, 269), control2: p(89, 252))
        path.addCurve(to: p(58, 143), control1: p(42, 202), control2: p(42, 169))
        path.closeSubpath()
        // Top rim
        path.move(to: p(58, 143))
        path.addCurve(to: p(176, 178), control1: p(72, 165), control2: p(116, 178))
        path.addCurve(to: p(296, 143), control1: p(236, 178), control2: p(281, 164))
        // Inner rim ellipse
        path.move(to: p(76, 133))
        path.addCurve(to: p(176, 119), control1: p(99, 120), control2: p(131, 119))
        path.addCurve(to: p(279, 133), control1: p(222, 119), control2: p(263, 120))
        path.addCurve(to: p(177, 151), control1: p(261, 146), control2: p(223, 151))
        path.addCurve(to: p(76, 133), control1: p(132, 151), control2: p(95, 146))
        path.closeSubpath()
        // Bottom decorative arc
        path.move(to: p(78, 230))
        path.addCurve(to: p(177, 243), control1: p(103, 239), control2: p(137, 243))
        path.addCurve(to: p(276, 230), control1: p(217, 243), control2: p(251, 239))
        // Mallet (chopstick)
        path.move(to: p(202, 146)); path.addLine(to: p(257, 40))
        path.addLine(to: p(281, 54)); path.addLine(to: p(226, 148)); path.closeSubpath()
        // Sound / steam lines
        path.move(to: p(108, 110)); path.addLine(to: p(91, 73))
        path.move(to: p(151, 103)); path.addLine(to: p(151, 62))
        path.move(to: p(193, 105)); path.addLine(to: p(204, 67))
        return path
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

/// Handpan seen from above — rim + seven tone fields (512-unit design space).
struct HandpanShape: Shape {
    func path(in r: CGRect) -> Path {
        let s = min(r.width, r.height) / 512
        let ox = r.minX + (r.width - 512 * s) / 2
        let oy = r.minY + (r.height - 512 * s) / 2
        func circle(_ cx: CGFloat, _ cy: CGFloat, _ rad: CGFloat) -> CGRect {
            CGRect(x: ox + (cx - rad) * s, y: oy + (cy - rad) * s, width: 2 * rad * s, height: 2 * rad * s)
        }
        var path = Path()
        path.addEllipse(in: circle(256, 256, 238))   // rim
        let fields: [(CGFloat, CGFloat)] = [
            (256, 115), (133, 185), (379, 185), (256, 257), (133, 328), (379, 328), (256, 398),
        ]
        for f in fields { path.addEllipse(in: circle(f.0, f.1, 56)) }
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
