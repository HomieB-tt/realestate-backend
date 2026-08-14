import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/api_client.dart';
import '../../data/repositories/api_viewing_repository.dart';
import '../../domain/entities/viewing.dart';
import '../../domain/repositories/viewing_repository.dart';
import '../../../property/domain/repositories/property_repository.dart' show Success, Failure;

final viewingRepositoryProvider = Provider<ViewingRepository>((ref) {
  final api = ref.watch(apiClientProvider);
  return ApiViewingRepository(api);
});

/// Viewings booked by the currently signed-in client — powers a
/// "My Bookings" screen.
final myViewingsProvider = FutureProvider.autoDispose<List<Viewing>>((ref) async {
  final repo = ref.watch(viewingRepositoryProvider);
  final result = await repo.listMine();

  return switch (result) {
    Success(:final value) => value,
    Failure(:final failure) => throw failure,
  };
});

/// Viewings for a specific property — powers the agent-facing schedule
/// view on the property detail screen.
final viewingsForPropertyProvider =
    FutureProvider.autoDispose.family<List<Viewing>, String>((ref, propertyId) async {
  final repo = ref.watch(viewingRepositoryProvider);
  final result = await repo.listForProperty(propertyId);

  return switch (result) {
    Success(:final value) => value,
    Failure(:final failure) => throw failure,
  };
});
