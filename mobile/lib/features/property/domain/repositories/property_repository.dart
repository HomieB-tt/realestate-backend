import '../../../../core/error/app_failure.dart';
import '../entities/property.dart';

sealed class Result<T> {
  const Result();
}

class Success<T> extends Result<T> {
  const Success(this.value);
  final T value;
}

class Failure<T> extends Result<T> {
  const Failure(this.failure);
  final AppFailure failure;
}

class RadiusSearchParams {
  const RadiusSearchParams({
    required this.lng,
    required this.lat,
    required this.radiusMeters,
    this.limit,
    this.listingType,
    this.minPrice,
    this.maxPrice,
    this.minBedrooms,
    this.city,
  });

  final double lng;
  final double lat;
  final double radiusMeters;
  final int? limit;
  final ListingType? listingType;
  final num? minPrice;
  final num? maxPrice;
  final int? minBedrooms;
  final String? city;
}

/// Contract for property data access. Presentation-layer providers depend
/// only on this interface, matching the Clean Architecture separation
/// used on the backend.
abstract interface class PropertyRepository {
  Future<Result<List<Property>>> searchNearby(RadiusSearchParams params);
  Future<Result<Property>> getById(String id);
  Future<Result<Property>> createDraft(NewPropertyInput input);
  Future<Result<Property>> publish(String id);
  Future<Result<List<Property>>> listMine();
  Future<Result<void>> remove(String id);
}
