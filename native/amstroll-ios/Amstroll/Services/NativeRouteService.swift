import Foundation
import MapKit

struct NativeRoute: Sendable {
    var durationMinutes: Int
    var walkingMinutes: Int
    var distanceMeters: Double
    var calculatedAt: Date
    let source = "Apple Maps · calculated walking route"
    let note = "Route calculation does not verify opening hours, access, fares or venue prices."
}

enum NativeRouteService {
    /// Walking is the only mode claimed as checked. Cycling and transit stay
    /// explicit planner handoffs; a driving route never stands in for either.
    static func walkingRoute(from: ServiceCoordinate,to: ServiceCoordinate) async throws -> NativeRoute {
        guard abs(from.latitude)<=90,abs(to.latitude)<=90,abs(from.longitude)<=180,abs(to.longitude)<=180 else { throw ServiceError.invalidArea }
        let request = MKDirections.Request()
        request.source = MKMapItem(placemark:MKPlacemark(coordinate:CLLocationCoordinate2D(latitude:from.latitude,longitude:from.longitude)))
        request.destination = MKMapItem(placemark:MKPlacemark(coordinate:CLLocationCoordinate2D(latitude:to.latitude,longitude:to.longitude)))
        request.transportType = .walking
        request.requestsAlternateRoutes = false
        let directions = MKDirections(request:request)
        let response = try await withTaskCancellationHandler {
            try await directions.calculate()
        } onCancel: { directions.cancel() }
        try Task.checkCancellation()
        guard let route = response.routes.first else { throw ServiceError.invalidResponse }
        let minutes = max(1,Int(ceil(route.expectedTravelTime/60)))
        return NativeRoute(durationMinutes:minutes,walkingMinutes:minutes,distanceMeters:route.distance,calculatedAt:Date())
    }
}
