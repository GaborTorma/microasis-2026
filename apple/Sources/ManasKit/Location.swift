import Foundation
import CoreLocation
import Combine

/// Stage proximity: which stage the device is standing nearest to. Mirrors the
/// debug-clock pattern (`Fmt.now`) — a QA coordinate override, gated to
/// DEBUG/TestFlight, lets the simulator pretend it's at any spot.
public enum Geo {
    /// Fallback "no stage nearby" radius, used when a stage row carries no
    /// `radiusM`. Beyond it: no location icon and no auto-jump to a stage.
    public static let nearThreshold: CLLocationDistance = 150

    /// A GPS fix is only trusted when it is both accurate and fresh — a
    /// weak-signal or cached coordinate would light up (or auto-jump to) the
    /// wrong stage, and no stage beats the wrong stage. Mirrors the web gate
    /// in pwa/lib/useNearestStage.ts — keep the thresholds in sync.
    public static let maxFixAccuracyM: CLLocationDistance = 100
    public static let maxFixAgeS: TimeInterval = 60

    /// Whether a CoreLocation fix is trustworthy for stage proximity.
    /// Negative `horizontalAccuracy` means the coordinate is invalid.
    public static func isTrustedFix(_ loc: CLLocation) -> Bool {
        loc.horizontalAccuracy >= 0
            && loc.horizontalAccuracy <= maxFixAccuracyM
            && -loc.timestamp.timeIntervalSinceNow <= maxFixAgeS
    }

    /// A point well outside `nearThreshold` of every stage — for testing the
    /// "nothing nearby" case from the debug picker.
    public static let farTestCoord = "46.6900,17.6800"

    /// Coordinate for a stage — from the DB (lat/lng on the API row). The DB is
    /// the single source of truth for stage geofences; nil = no coordinate set.
    public static func coordinate(for stage: StageDTO) -> CLLocationCoordinate2D? {
        guard let lat = stage.lat, let lng = stage.lng else { return nil }
        return .init(latitude: lat, longitude: lng)
    }

    /// "lat,lng" string for a stage — used by the debug coordinate picker.
    public static func coordString(for stage: StageDTO) -> String? {
        coordinate(for: stage).map { "\($0.latitude),\($0.longitude)" }
    }

    /// QA-only test coordinate ("lat,lng" in `manas.debugCoord`), gated like the
    /// debug clock. Compiled-out behaviour for App Store releases.
    public static var debugCoordinate: CLLocationCoordinate2D? {
        guard AppEnv.debugToolsEnabled,
              let s = UserDefaults.standard.string(forKey: "manas.debugCoord") else { return nil }
        return parseCoord(s)
    }

    public static func parseCoord(_ s: String) -> CLLocationCoordinate2D? {
        let p = s.split(separator: ",").map { Double($0.trimmingCharacters(in: .whitespaces)) }
        guard p.count == 2, let lat = p[0], let lng = p[1] else { return nil }
        return .init(latitude: lat, longitude: lng)
    }

    /// Nearest stage to `coord` and its distance in metres.
    public static func nearest(to coord: CLLocationCoordinate2D,
                               in stages: [StageDTO]) -> (stage: StageDTO, distance: CLLocationDistance)? {
        let here = CLLocation(latitude: coord.latitude, longitude: coord.longitude)
        return stages
            .compactMap { s -> (StageDTO, CLLocationDistance)? in
                guard let c = coordinate(for: s) else { return nil }
                return (s, here.distance(from: CLLocation(latitude: c.latitude, longitude: c.longitude)))
            }
            .min { $0.1 < $1.1 }
    }
}

/// Publishes the slug of the stage the device is standing nearest to — but only
/// when within `Geo.nearThreshold`; nil otherwise. A debug coordinate wins over
/// CoreLocation. One-shot fixes (requested on launch / foreground) keep it cheap.
@MainActor
public final class LocationStore: NSObject, ObservableObject {
    @Published public private(set) var nearestSlug: String?

    private let manager = CLLocationManager()
    private var coordinate: CLLocationCoordinate2D?
    private var stages: [StageDTO] = []

    /// Untrusted-fix retry budget per acquisition: `requestLocation()` often
    /// serves a cached (stale) fix first while the GPS warms up — ask again
    /// before concluding "no trustworthy fix".
    private static let maxFixRetries = 2
    private var fixRetriesLeft = 0

    public override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
    }

    /// Recompute against `stages`. Debug coordinate wins; otherwise ask
    /// CoreLocation for a single fix. Call on launch and on foreground.
    public func refresh(stages: [StageDTO]) {
        self.stages = stages
        if let dbg = Geo.debugCoordinate { coordinate = dbg; recompute(); return }
        switch manager.authorizationStatus {
        case .notDetermined: manager.requestWhenInUseAuthorization()
        case .authorizedWhenInUse, .authorizedAlways: requestFix()
        default: nearestSlug = nil
        }
    }

    /// One-shot fix with a fresh retry budget (see `maxFixRetries`).
    fileprivate func requestFix() {
        fixRetriesLeft = Self.maxFixRetries
        manager.requestLocation()
    }

    private func recompute() {
        // Per-stage geofence radius from the DB (`radiusM`), falling back to the
        // shared 150 m threshold when a stage row hasn't set one.
        guard let c = coordinate, !stages.isEmpty,
              let n = Geo.nearest(to: c, in: stages),
              n.distance <= Double(n.stage.radiusM ?? Int(Geo.nearThreshold)) else {
            nearestSlug = nil; return
        }
        nearestSlug = n.stage.slug
    }
}

extension LocationStore: CLLocationManagerDelegate {
    public nonisolated func locationManager(_ m: CLLocationManager, didUpdateLocations locs: [CLLocation]) {
        // `requestLocation` may hand back a cached or weak-signal fix; only a
        // fresh, accurate one may pick a stage — otherwise clear, don't guess.
        guard let loc = locs.last, Geo.isTrustedFix(loc) else {
            Task { @MainActor in
                guard Geo.debugCoordinate == nil else { return }
                if self.fixRetriesLeft > 0 {
                    // Often just the stale cache served while the GPS warms up —
                    // ask again (bounded) before giving up on this acquisition.
                    self.fixRetriesLeft -= 1
                    self.manager.requestLocation()
                } else {
                    self.nearestSlug = nil
                }
            }
            return
        }
        Task { @MainActor in self.coordinate = loc.coordinate; self.recompute() }
    }

    public nonisolated func locationManager(_ m: CLLocationManager, didFailWithError error: Error) {
        Task { @MainActor in if Geo.debugCoordinate == nil { self.nearestSlug = nil } }
    }

    public nonisolated func locationManagerDidChangeAuthorization(_ m: CLLocationManager) {
        Task { @MainActor in
            guard Geo.debugCoordinate == nil else { return }
            switch m.authorizationStatus {
            case .authorizedWhenInUse, .authorizedAlways: self.requestFix()
            default: self.nearestSlug = nil
            }
        }
    }
}
