import SwiftUI

/// The MicrOasis mark, drawn with plain SwiftUI shapes (mirrors the geometry of
/// `pwa/public/icon.svg`, minus the dark square background): a spring seen from
/// above — a solid core ringed by broken ripples.
///
/// Drawn rather than shipped as a raster image because a full-colour PNG does
/// **not** render inside watchOS accessory complications — those expect
/// SF Symbols / vector shapes, which also tint correctly in every widget
/// rendering mode. Transparent background, so it sits on any complication well.
public struct OasisMark: View {
    public init() {}

    public var body: some View {
        GeometryReader { geo in
            let side = min(geo.size.width, geo.size.height)
            mark
                .frame(width: 512, height: 512)        // SVG viewBox space
                .scaleEffect(side / 512)
                .frame(width: geo.size.width, height: geo.size.height)  // centre
        }
    }

    private var mark: some View {
        ZStack {
            ripple(r: 198, width: 9, hex: "#645145", segments: 5, gapDeg: 13, rotate: 8, opacity: 0.75)
            ripple(r: 154, width: 12, hex: "#8fa69b", segments: 4, gapDeg: 15, rotate: -34, opacity: 0.7)
            ripple(r: 110, width: 15, hex: "#b5764a", segments: 3, gapDeg: 17, rotate: 21, opacity: 0.95)
            Circle().fill(Color(hex: "#c89468")).frame(width: 112, height: 112)
        }
    }

    /// One broken ripple: `segments` equal arcs separated by `gapDeg` gaps.
    /// `trim` works in fractions of the circumference, so the gap converts to
    /// gapDeg/360 — the same arithmetic as the SVG generator's dash array.
    private func ripple(r: CGFloat, width: CGFloat, hex: String, segments: Int, gapDeg: Double, rotate: Double, opacity: Double) -> some View {
        let step = 1.0 / Double(segments)
        let gap = gapDeg / 360
        return ForEach(0..<segments, id: \.self) { i in
            Circle()
                .trim(from: Double(i) * step, to: Double(i) * step + step - gap)
                .stroke(Color(hex: hex), style: StrokeStyle(lineWidth: width, lineCap: .round))
                .frame(width: r * 2, height: r * 2)
                .rotationEffect(.degrees(rotate))
                .opacity(opacity)
        }
    }
}
