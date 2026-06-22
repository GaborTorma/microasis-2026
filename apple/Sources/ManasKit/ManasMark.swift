import SwiftUI

/// The Manas flower mark, drawn with plain SwiftUI shapes (mirrors the petal
/// geometry of `web/public/icon.svg`, minus the dark square background).
///
/// Drawn rather than shipped as a raster image because a full-colour PNG does
/// **not** render inside watchOS accessory complications — those expect
/// SF Symbols / vector shapes, which also tint correctly in every widget
/// rendering mode. Transparent background, so it sits on any complication well.
public struct ManasMark: View {
    public init() {}

    public var body: some View {
        GeometryReader { geo in
            let side = min(geo.size.width, geo.size.height)
            petals
                .frame(width: 512, height: 512)        // SVG viewBox space
                .scaleEffect(side / 512)
                .frame(width: geo.size.width, height: geo.size.height)  // centre
        }
    }

    private var petals: some View {
        ZStack {
            ring(start: 15, rx: 17, ry: 52, cy: -108, hex: "#7a2e2e")   // back, dark red
            ring(start: 0,  rx: 21, ry: 64, cy: -120, hex: "#b5532f")   // main, orange
            ring(start: 15, rx: 12, ry: 30, cy: -86,  hex: "#e8a04c")   // inner, yellow
            disc(116, "#7a2e2e")
            disc(80,  "#e8a04c")
            disc(30,  "#160c08")   // centre dot
        }
    }

    /// Twelve radial petals, each an ellipse offset from the centre then orbited.
    private func ring(start: Double, rx: CGFloat, ry: CGFloat, cy: CGFloat, hex: String) -> some View {
        ForEach(0..<12, id: \.self) { i in
            Ellipse()
                .fill(Color(hex: hex))
                .frame(width: rx * 2, height: ry * 2)
                .offset(y: cy)
                .rotationEffect(.degrees(start + Double(i) * 30))
        }
    }

    private func disc(_ d: CGFloat, _ hex: String) -> some View {
        Circle().fill(Color(hex: hex)).frame(width: d, height: d)
    }
}
