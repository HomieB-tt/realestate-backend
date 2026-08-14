/// Domain entity mirroring the backend's `Viewing`
/// (see backend/src/domain/entities/viewing.entity.ts).
enum ViewingStatus { requested, confirmed, cancelled, completed, noShow }

ViewingStatus viewingStatusFromString(String value) {
  const map = {
    'requested': ViewingStatus.requested,
    'confirmed': ViewingStatus.confirmed,
    'cancelled': ViewingStatus.cancelled,
    'completed': ViewingStatus.completed,
    'no_show': ViewingStatus.noShow,
  };
  return map[value] ?? ViewingStatus.requested;
}

class Viewing {
  const Viewing({
    required this.id,
    required this.propertyId,
    required this.clientId,
    required this.agentId,
    required this.scheduledAt,
    required this.durationMins,
    required this.status,
    required this.notes,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String propertyId;
  final String clientId;
  final String agentId;
  final DateTime scheduledAt;
  final int durationMins;
  final ViewingStatus status;
  final String? notes;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class NewViewingInput {
  const NewViewingInput({
    required this.propertyId,
    required this.scheduledAt,
    this.durationMins = 30,
    this.notes,
  });

  final String propertyId;
  final DateTime scheduledAt;
  final int durationMins;
  final String? notes;
}
