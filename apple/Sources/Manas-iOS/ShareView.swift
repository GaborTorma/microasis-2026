import SwiftUI
import CoreImage.CIFilterBuiltins

/// "Add tovább" tab — the iOS parity of the web `/share` page: a full screen with
/// a big QR a friend points their phone at (encodes `AppLinks.share` → App Store
/// on iPhone, the web app elsewhere) plus the native iOS share sheet.
struct ShareView: View {
    @EnvironmentObject var settings: Settings

    private var prettyURL: String {
        AppLinks.share.absoluteString.replacingOccurrences(of: "https://", with: "")
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                Text(L.t("share.title", settings.locale))
                    .font(.system(size: 28, weight: .heavy, design: .rounded))
                    .foregroundStyle(Theme.cream)
                Text(L.t("share.body", settings.locale))
                    .font(.callout)
                    .foregroundStyle(Theme.cream.opacity(0.85))
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)

                if let qr = QRCode.image(AppLinks.share.absoluteString) {
                    Image(uiImage: qr)
                        .interpolation(.none)           // keep the modules crisp when scaled
                        .resizable()
                        .scaledToFit()
                        .frame(width: 248, height: 248)
                        .padding(18)
                        .background(Theme.cream, in: RoundedRectangle(cornerRadius: 28))
                }

                Text(prettyURL)
                    .font(.system(.footnote, design: .monospaced))
                    .foregroundStyle(Theme.creamDim)

                ShareLink(item: AppLinks.share,
                          message: Text(L.t("share.invite", settings.locale))) {
                    Label(L.t("share.button", settings.locale), systemImage: "square.and.arrow.up")
                        .font(.headline)
                        .foregroundStyle(Theme.ink)
                        .padding(.horizontal, 30)
                        .padding(.vertical, 15)
                        .background(
                            LinearGradient(colors: [Theme.sun, Theme.teal],
                                           startPoint: .topLeading, endPoint: .bottomTrailing),
                            in: Capsule())
                        .overlay(RunningBorder())
                        .shadow(color: Theme.sun.opacity(0.5), radius: 16, y: 6)
                }
                .buttonStyle(.plain)
                .padding(.top, 6)
            }
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 24)
            .padding(.top, 24)
            .padding(.bottom, 40)
        }
        .background(Theme.ink)
    }
}

/// A thin line of light that runs once around the button's edge every few seconds,
/// fading in as it sets off and out as it finishes — otherwise idle. Driven by
/// `TimelineView` so the arc's position and its fade are recomputed each frame:
/// smooth, and free of the trim-in-lockstep collapse you get from animating
/// `trim(from:to:)` directly.
private struct RunningBorder: View {
    @State private var start = Date()
    private let cycle: Double = 6           // seconds between runs
    private let runFraction: CGFloat = 0.42 // fraction of the cycle spent running; idle the rest
    private let arc: CGFloat = 0.16          // lit fraction of the perimeter
    private let overshoot: CGFloat = 0.13    // how far past the start point the head carries on

    var body: some View {
        TimelineView(.animation) { ctx in
            let phase = CGFloat(ctx.date.timeIntervalSince(start)
                .truncatingRemainder(dividingBy: cycle) / cycle)
            line(phase: phase)
        }
    }

    @ViewBuilder
    private func line(phase: CGFloat) -> some View {
        let run = min(phase / runFraction, 1)                                   // 0…1 across the run
        let head = run * (1 + overshoot)                                        // 0 → a little past the start point
        let env = smoothstep(0, 0.30, run) * (1 - smoothstep(0.70, 1, run))     // generous fade in / out
        EdgeArc(tail: head - arc, head: head)
            .stroke(.white.opacity(0.9), style: StrokeStyle(lineWidth: 2.5, lineCap: .round))
            .rotationEffect(.degrees(180))   // start the run from the opposite (left) side
            .blendMode(.plusLighter)
            .opacity(phase <= runFraction ? Double(env) : 0)   // idle between runs
    }
}

/// The lit arc as a path that may wrap past the capsule's seam, so the light can
/// carry on a little beyond where it started before fading out.
private struct EdgeArc: Shape {
    var tail: CGFloat
    var head: CGFloat   // 0…(1+overshoot); the portion beyond 1 wraps back to the start

    func path(in rect: CGRect) -> Path {
        let cap = Capsule().path(in: rect.insetBy(dx: 1, dy: 1))
        if head <= 1 {
            return cap.trimmedPath(from: min(max(tail, 0), 1), to: min(max(head, 0), 1))
        }
        var p = cap.trimmedPath(from: min(max(tail, 0), 1), to: 1)
        p.addPath(cap.trimmedPath(from: 0, to: min(head - 1, 1)))
        return p
    }
}

/// Hermite smoothstep — eases the light's fade in and out so it emerges and
/// dissolves rather than popping.
private func smoothstep(_ edge0: CGFloat, _ edge1: CGFloat, _ x: CGFloat) -> CGFloat {
    let t = min(max((x - edge0) / (edge1 - edge0), 0), 1)
    return t * t * (3 - 2 * t)
}

/// On-device QR generation via CoreImage (no dependency), recoloured to the brand
/// ink-on-cream so it matches the web share card.
enum QRCode {
    private static let context = CIContext()

    static func image(_ string: String) -> UIImage? {
        let generator = CIFilter.qrCodeGenerator()
        generator.message = Data(string.utf8)
        generator.correctionLevel = "M"
        guard let base = generator.outputImage else { return nil }
        // CIFalseColor maps black modules → color0, the white field → color1.
        let recoloured = base.applyingFilter("CIFalseColor", parameters: [
            "inputColor0": CIColor(red: 0.047, green: 0.086, blue: 0.067),  // #0c1611 ink
            "inputColor1": CIColor(red: 0.929, green: 0.957, blue: 0.925),  // #edf4ec cream
        ])
        let scaled = recoloured.transformed(by: CGAffineTransform(scaleX: 12, y: 12))
        guard let cg = context.createCGImage(scaled, from: scaled.extent) else { return nil }
        return UIImage(cgImage: cg)
    }
}
