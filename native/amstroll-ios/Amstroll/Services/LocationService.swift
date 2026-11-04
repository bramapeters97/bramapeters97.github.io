import Foundation
import CoreLocation
import Combine

struct ServiceCoordinate: Codable, Hashable, Sendable {
    var latitude: Double
    var longitude: Double
}

enum LocationFailure: LocalizedError {
    case denied, outsideAmsterdam, busy, unavailable
    var errorDescription: String? {
        switch self {
        case .denied: return "Location access is off. Choose an Amsterdam starting area or enable access in Settings."
        case .outsideAmsterdam: return "Amstroll currently starts in Amsterdam. Choose an Amsterdam area manually."
        case .busy: return "A location request is already in progress."
        case .unavailable: return "Your location could not be found. Choose an Amsterdam starting area manually."
        }
    }
}

/// No location request occurs during init or ordinary app launch.
@MainActor
final class LocationService: NSObject, ObservableObject, CLLocationManagerDelegate {
    @Published private(set) var isRequesting = false
    private let manager = CLLocationManager()
    private var continuation: CheckedContinuation<ServiceCoordinate,Error>?
    private var deadline: Task<Void,Never>?

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
    }

    func requestLocation() async throws -> ServiceCoordinate {
        guard continuation == nil else { throw LocationFailure.busy }
        try Task.checkCancellation()
        return try await withTaskCancellationHandler {
            try await withCheckedThrowingContinuation { callback in
                continuation = callback
                isRequesting = true
                deadline = Task { [weak self] in
                    do { try await Task.sleep(nanoseconds:20_000_000_000) } catch { return }
                    self?.finish(.failure(LocationFailure.unavailable))
                }
                switch manager.authorizationStatus {
                case .notDetermined: manager.requestWhenInUseAuthorization()
                case .authorizedWhenInUse,.authorizedAlways: manager.requestLocation()
                default: finish(.failure(LocationFailure.denied))
                }
            }
        } onCancel: {
            Task { @MainActor [weak self] in self?.finish(.failure(CancellationError())) }
        }
    }

    private func finish(_ result: Result<ServiceCoordinate,Error>) {
        let callback = continuation;continuation = nil
        deadline?.cancel();deadline = nil;manager.stopUpdatingLocation();isRequesting = false
        callback?.resume(with:result)
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        guard continuation != nil else { return }
        switch manager.authorizationStatus {
        case .authorizedAlways,.authorizedWhenInUse: manager.requestLocation()
        case .denied,.restricted: finish(.failure(LocationFailure.denied))
        default: break
        }
    }
    func locationManager(_ manager: CLLocationManager,didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last,location.horizontalAccuracy >= 0,abs(location.timestamp.timeIntervalSinceNow) < 90 else { return }
        let c = location.coordinate
        guard ProviderParsing.inAmsterdam(lat:c.latitude,lng:c.longitude) else { finish(.failure(LocationFailure.outsideAmsterdam));return }
        finish(.success(ServiceCoordinate(latitude:c.latitude,longitude:c.longitude)))
    }
    func locationManager(_ manager: CLLocationManager,didFailWithError error: Error) {
        finish(.failure((error as? CLError)?.code == .denied ? LocationFailure.denied : LocationFailure.unavailable))
    }
}
