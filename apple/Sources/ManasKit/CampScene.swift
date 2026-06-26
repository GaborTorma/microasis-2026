import SwiftUI

// MARK: - Opening-day camp-scene window

public extension ScheduleData {
    /// The Mandala opening ceremony — the festival's ceremonial start and the
    /// end of the opening-day camp scene. No schema flag marks it, so match the
    /// first Mandala event whose title reads "opening"/"nyit" (nil ⇒ the camp
    /// scene never shows). Shared by the iOS Now view and the watch card.
    var openingCeremony: EventDTO? {
        events
            .filter { $0.stageSlug == "mandala" }
            .sorted { $0.startsAt < $1.startsAt }
            .first { e in
                let s = (e.title.hu + " " + e.title.en).lowercased()
                return s.contains("nyit") || s.contains("opening")
            }
    }

    /// The opening-day camp-scene window: festival start (12:00) until the
    /// Mandala opening ceremony (18:30). nil when there's no opening event, or
    /// if the data is malformed (opening before the festival start).
    var campSceneWindow: Range<Date>? {
        guard let opening = openingCeremony,
              festival.startsAt < opening.startsAt else { return nil }
        return festival.startsAt ..< opening.startsAt
    }
}

// MARK: - Tent art

/// Minimal A-frame tent that pitches up and resets in a slow loop (static when
/// Reduce Motion is on). Mirrors the web camp scene; self-scales to whatever
/// frame it's given, so iOS (220×150) and the watch reuse the same drawing.
public struct TentArt: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    // Render motionless for Reduce Motion — and for marketing captures: the
    // screenshot harness sets `manas.hideTestUI`, so the tent shows fully
    // pitched instead of a random animation frame.
    private var still: Bool { reduceMotion || AppEnv.hideTestUI }

    public init() {}

    private var tentGroup: some View {
        ZStack {
            Tri(pts: [.init(x: 0.5, y: 0.29), .init(x: 0.34, y: 0.8), .init(x: 0.5, y: 0.8)])
                .fill(Theme.leaf.opacity(0.85))
            Tri(pts: [.init(x: 0.5, y: 0.29), .init(x: 0.66, y: 0.8), .init(x: 0.5, y: 0.8)])
                .fill(Theme.ink3)
            Tri(pts: [.init(x: 0.5, y: 0.4), .init(x: 0.45, y: 0.8), .init(x: 0.55, y: 0.8)])
                .fill(Theme.ink)
            TentLines()
                .stroke(Theme.sun, style: StrokeStyle(lineWidth: 2.4, lineCap: .round, lineJoin: .round))
            TentFlag()
        }
    }

    public var body: some View {
        // Design space is 220×150 (matching the web viewBox); everything is
        // expressed as a fraction of the given frame so the tent keeps its
        // proportions at any size.
        GeometryReader { geo in
            let w = geo.size.width, h = geo.size.height
            ZStack {
                // Static ground: soft glow, the horizon line, and two grass tufts.
                Ellipse().fill(Theme.leaf.opacity(0.12))
                    .frame(width: w * 185 / 220, height: h * 21 / 150)
                    .position(x: w * 0.5, y: h * 122 / 150)
                GroundLine()
                    .stroke(Theme.line, style: StrokeStyle(lineWidth: 2, lineCap: .round))
                GrassTufts()
                    .stroke(Theme.leaf, style: StrokeStyle(lineWidth: 2, lineCap: .round))
                    .opacity(0.7)
                if still {
                    tentGroup
                } else {
                    PhaseAnimator(TentPhase.allCases) { phase in
                        tentGroup
                            // Pitch up from the tent base, which sits on the horizon
                            // line (y≈122/150) — rises from the ground line, not below.
                            .scaleEffect(x: 1, y: phase.scaleY, anchor: UnitPoint(x: 0.5, y: 0.8))
                            .opacity(phase.opacity)
                    } animation: { $0.animation }
                }
            }
            .frame(width: w, height: h)
        }
    }
}

private enum TentPhase: CaseIterable {
    case seed, up, hold, gone
    var scaleY: CGFloat { self == .seed ? 0.06 : 1 }
    var opacity: Double { (self == .seed || self == .gone) ? 0 : 1 }
    var animation: Animation {
        switch self {
        case .seed: return .linear(duration: 0.01)   // invisible reset
        case .up:   return .easeOut(duration: 2.0)    // pitch up
        case .hold: return .linear(duration: 2.3)     // hold
        case .gone: return .easeIn(duration: 0.9)     // fade out
        }
    }
}

/// Triangle through three unit-space points (0…1 of the frame).
private struct Tri: Shape {
    let pts: [UnitPoint]
    func path(in r: CGRect) -> Path {
        var p = Path()
        guard let f = pts.first else { return p }
        p.move(to: CGPoint(x: r.minX + f.x * r.width, y: r.minY + f.y * r.height))
        for u in pts.dropFirst() {
            p.addLine(to: CGPoint(x: r.minX + u.x * r.width, y: r.minY + u.y * r.height))
        }
        p.closeSubpath()
        return p
    }
}

/// A-frame outline: two roof edges, the base, and the centre ridge.
private struct TentLines: Shape {
    func path(in r: CGRect) -> Path {
        func pt(_ x: CGFloat, _ y: CGFloat) -> CGPoint {
            CGPoint(x: r.minX + x * r.width, y: r.minY + y * r.height)
        }
        let apex = pt(0.5, 0.29), bl = pt(0.34, 0.8), br = pt(0.66, 0.8), bc = pt(0.5, 0.8)
        var p = Path()
        p.move(to: apex); p.addLine(to: bl)        // left roof
        p.move(to: apex); p.addLine(to: br)        // right roof
        p.move(to: bl); p.addLine(to: br)          // base
        p.move(to: apex); p.addLine(to: bc)        // centre ridge
        p.move(to: apex); p.addLine(to: pt(0.5, 0.16))  // flag pole
        return p
    }
}

/// The horizon line under the tent (design space is 220×150, matching the web).
private struct GroundLine: Shape {
    func path(in r: CGRect) -> Path {
        func pt(_ x: CGFloat, _ y: CGFloat) -> CGPoint {
            CGPoint(x: r.minX + x / 220 * r.width, y: r.minY + y / 150 * r.height)
        }
        var p = Path()
        p.move(to: pt(24, 121)); p.addLine(to: pt(196, 121))
        return p
    }
}

/// Two little grass tufts flanking the tent (two blades each), as in the web.
private struct GrassTufts: Shape {
    func path(in r: CGRect) -> Path {
        func pt(_ x: CGFloat, _ y: CGFloat) -> CGPoint {
            CGPoint(x: r.minX + x / 220 * r.width, y: r.minY + y / 150 * r.height)
        }
        var p = Path()
        for base in [CGFloat(34), 188] {
            p.move(to: pt(base, 121))
            p.addQuadCurve(to: pt(base - 4, 111), control: pt(base - 1, 114))
            p.move(to: pt(base, 121))
            p.addQuadCurve(to: pt(base + 4, 112), control: pt(base + 1, 115))
        }
        return p
    }
}

/// The pennant on the tent pole — waves by squashing toward the pole and back,
/// mirroring the web `.flag-wave`. Static under Reduce Motion.
private struct TentFlag: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var furled = false
    private var still: Bool { reduceMotion || AppEnv.hideTestUI }

    var body: some View {
        Tri(pts: [.init(x: 0.5, y: 0.16), .init(x: 0.6, y: 0.2), .init(x: 0.5, y: 0.24)])
            .fill(Color(hex: "#e0913f"))
            .scaleEffect(x: (!still && furled) ? 0.5 : 1, y: 1,
                         anchor: UnitPoint(x: 0.5, y: 0.2))
            .animation(still ? nil
                       : .easeInOut(duration: 1.1).repeatForever(autoreverses: true),
                       value: furled)
            .onAppear { if !still { furled = true } }
    }
}
