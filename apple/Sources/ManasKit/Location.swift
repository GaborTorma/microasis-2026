import Foundation
import CoreLocation
import Combine

/// Stage proximity: which stage the device is standing nearest to. Mirrors the
/// debug-clock pattern (`Fmt.now`) — a QA coordinate override, gated to
/// DEBUG/TestFlight, lets the simulator pretend it's at any spot.
public enum Geo {
    /// Beyond this distance we treat it as "no stage nearby": no location icon
    /// and no auto-jump to a stage.
    public static let nearThreshold: CLLocationDistance = 150

    /// Known fixed stage coordinates, keyed by slug. Fallback source of truth
    /// when the API row carries no lat/lng.
    public static let stageCoords: [String: CLLocationCoordinate2D] = [
        "mandala": .init(latitude: 46.67379233364376, longitude: 17.65907946930414),
        "portal":  .init(latitude: 46.673682383648455, longitude: 17.66211333408678),
        "terrace": .init(latitude: 46.674407488023085, longitude: 17.661415611588946),
        "bowl":    .init(latitude: 46.676109554244164, longitude: 17.661461486061544),
        "field":   .init(latitude: 46.676117401484305, longitude: 17.658342620761708),
    ]

    /// A point well outside `nearThreshold` of every stage — for testing the
    /// "nothing nearby" case from the debug picker.
    public static let farTestCoord = "46.6900,17.6800"

    /// Coordinate for a stage: the API value if present, else the known fixed one.
    public static func coordinate(for stage: StageDTO) -> CLLocationCoordinate2D? {
        if let lat = stage.lat, let lng = stage.lng { return .init(latitude: lat, longitude: lng) }
        return stageCoords[stage.slug]
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
        case .authorizedWhenInUse, .authorizedAlways: manager.requestLocation()
        default: nearestSlug = nil
        }
    }

    private func recompute() {
        guard let c = coordinate, !stages.isEmpty,
              let n = Geo.nearest(to: c, in: stages), n.distance <= Geo.nearThreshold else {
            nearestSlug = nil; return
        }
        nearestSlug = n.stage.slug
    }
}

extension LocationStore: CLLocationManagerDelegate {
    public nonisolated func locationManager(_ m: CLLocationManager, didUpdateLocations locs: [CLLocation]) {
        guard let c = locs.last?.coordinate else { return }
        Task { @MainActor in self.coordinate = c; self.recompute() }
    }

    public nonisolated func locationManager(_ m: CLLocationManager, didFailWithError error: Error) {
        Task { @MainActor in if Geo.debugCoordinate == nil { self.nearestSlug = nil } }
    }

    public nonisolated func locationManagerDidChangeAuthorization(_ m: CLLocationManager) {
        Task { @MainActor in
            guard Geo.debugCoordinate == nil else { return }
            switch m.authorizationStatus {
            case .authorizedWhenInUse, .authorizedAlways: m.requestLocation()
            default: self.nearestSlug = nil
            }
        }
    }
}
