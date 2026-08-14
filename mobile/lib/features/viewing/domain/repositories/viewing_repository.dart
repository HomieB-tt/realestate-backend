import '../../../property/domain/repositories/property_repository.dart' show Result;
import '../entities/viewing.dart';

/// Contract for viewing/booking data access. The 409 slot-conflict case
/// surfaces through `Result`/`ConflictFailure` (see
/// core/error/dio_error_mapper.dart) rather than a bespoke exception, so
/// the presentation layer handles it the same way as any other
/// recoverable failure — show the message, let the user pick another time.
abstract interface class ViewingRepository {
  Future<Result<Viewing>> requestViewing(NewViewingInput input);
  Future<Result<Viewing>> confirm(String id);
  Future<Result<Viewing>> cancel(String id);
  Future<Result<List<Viewing>>> listForProperty(String propertyId);
  Future<Result<List<Viewing>>> listMine();
}
