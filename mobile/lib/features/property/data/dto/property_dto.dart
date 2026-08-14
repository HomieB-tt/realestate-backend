import '../../domain/entities/property.dart';

/// Maps the backend's JSON response shape (see
/// backend/src/delivery/http/controllers/property.controller.ts, which
/// serializes `Property.toJSON()`) to/from the domain entity. Keeping
/// this mapping isolated here means the domain entity never needs to
/// know about JSON at all.
class PropertyDto {
  static Property fromJson(Map<String, dynamic> json) {
    final location = json['location'] as Map<String, dynamic>;
    return Property(
      id: json['id'] as String,
      agentId: json['agentId'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      listingType: listingTypeFromString(json['listingType'] as String),
      status: propertyStatusFromString(json['status'] as String),
      price: json['price'] as num,
      currency: json['currency'] as String,
      bedrooms: json['bedrooms'] as int,
      bathrooms: json['bathrooms'] as int,
      areaSqm: json['areaSqm'] as num?,
      addressLine: json['addressLine'] as String,
      city: json['city'] as String,
      country: json['country'] as String,
      location: GeoPoint(
        lng: (location['lng'] as num).toDouble(),
        lat: (location['lat'] as num).toDouble(),
      ),
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  static List<Property> listFromJson(List<dynamic> json) {
    return json.map((e) => fromJson(e as Map<String, dynamic>)).toList();
  }

  static Map<String, dynamic> newInputToJson(NewPropertyInput input) {
    return {
      'title': input.title,
      'description': input.description,
      'listingType': input.listingType.name,
      'price': input.price,
      'currency': input.currency,
      'bedrooms': input.bedrooms,
      'bathrooms': input.bathrooms,
      'areaSqm': input.areaSqm,
      'addressLine': input.addressLine,
      'city': input.city,
      'country': input.country,
      'lng': input.lng,
      'lat': input.lat,
    };
  }
}
