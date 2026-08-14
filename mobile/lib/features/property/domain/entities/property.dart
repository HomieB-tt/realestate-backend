/// Domain entity mirroring the backend's `Property`
/// (see backend/src/domain/entities/property.entity.ts). Pure data +
/// light invariants — no Dio/JSON types leak past the data layer.
enum ListingType { sale, rent }

enum PropertyStatus { draft, published, underOffer, sold, archived }

ListingType listingTypeFromString(String value) {
  return ListingType.values.firstWhere((t) => t.name == value, orElse: () => ListingType.sale);
}

PropertyStatus propertyStatusFromString(String value) {
  const map = {
    'draft': PropertyStatus.draft,
    'published': PropertyStatus.published,
    'under_offer': PropertyStatus.underOffer,
    'sold': PropertyStatus.sold,
    'archived': PropertyStatus.archived,
  };
  return map[value] ?? PropertyStatus.draft;
}

class GeoPoint {
  const GeoPoint({required this.lng, required this.lat});
  final double lng;
  final double lat;
}

class Property {
  const Property({
    required this.id,
    required this.agentId,
    required this.title,
    required this.description,
    required this.listingType,
    required this.status,
    required this.price,
    required this.currency,
    required this.bedrooms,
    required this.bathrooms,
    required this.areaSqm,
    required this.addressLine,
    required this.city,
    required this.country,
    required this.location,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String agentId;
  final String title;
  final String description;
  final ListingType listingType;
  final PropertyStatus status;
  final num price;
  final String currency;
  final int bedrooms;
  final int bathrooms;
  final num? areaSqm;
  final String addressLine;
  final String city;
  final String country;
  final GeoPoint location;
  final DateTime createdAt;
  final DateTime updatedAt;

  String get formattedPrice => '$currency ${price.toStringAsFixed(0)}';
}

/// Fields required to create a new draft listing — mirrors the backend's
/// `NewPropertyInput`.
class NewPropertyInput {
  const NewPropertyInput({
    required this.title,
    required this.description,
    required this.listingType,
    required this.price,
    required this.currency,
    required this.bedrooms,
    required this.bathrooms,
    this.areaSqm,
    required this.addressLine,
    required this.city,
    required this.country,
    required this.lng,
    required this.lat,
  });

  final String title;
  final String description;
  final ListingType listingType;
  final num price;
  final String currency;
  final int bedrooms;
  final int bathrooms;
  final num? areaSqm;
  final String addressLine;
  final String city;
  final String country;
  final double lng;
  final double lat;
}
