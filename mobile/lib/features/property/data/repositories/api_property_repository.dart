import 'package:dio/dio.dart';
import '../../../../core/error/dio_error_mapper.dart';
import '../../../../core/network/api_client.dart';
import '../../domain/entities/property.dart';
import '../../domain/repositories/property_repository.dart';
import '../dto/property_dto.dart';

class ApiPropertyRepository implements PropertyRepository {
  ApiPropertyRepository(this._api);

  final ApiClient _api;

  @override
  Future<Result<List<Property>>> searchNearby(RadiusSearchParams params) async {
    try {
      final response = await _api.get<Map<String, dynamic>>(
        '/properties/search',
        queryParameters: {
          'lng': params.lng,
          'lat': params.lat,
          'radiusMeters': params.radiusMeters,
          if (params.limit != null) 'limit': params.limit,
          if (params.listingType != null) 'listingType': params.listingType!.name,
          if (params.minPrice != null) 'minPrice': params.minPrice,
          if (params.maxPrice != null) 'maxPrice': params.maxPrice,
          if (params.minBedrooms != null) 'minBedrooms': params.minBedrooms,
          if (params.city != null) 'city': params.city,
        },
      );
      final list = response.data!['data'] as List<dynamic>;
      return Success(PropertyDto.listFromJson(list));
    } on DioException catch (e) {
      return Failure(mapDioErrorToFailure(e));
    }
  }

  @override
  Future<Result<Property>> getById(String id) async {
    try {
      final response = await _api.get<Map<String, dynamic>>('/properties/$id');
      return Success(PropertyDto.fromJson(response.data!['data'] as Map<String, dynamic>));
    } on DioException catch (e) {
      return Failure(mapDioErrorToFailure(e));
    }
  }

  @override
  Future<Result<Property>> createDraft(NewPropertyInput input) async {
    try {
      final response = await _api.post<Map<String, dynamic>>(
        '/properties',
        data: PropertyDto.newInputToJson(input),
      );
      return Success(PropertyDto.fromJson(response.data!['data'] as Map<String, dynamic>));
    } on DioException catch (e) {
      return Failure(mapDioErrorToFailure(e));
    }
  }

  @override
  Future<Result<Property>> publish(String id) async {
    try {
      final response = await _api.post<Map<String, dynamic>>('/properties/$id/publish');
      return Success(PropertyDto.fromJson(response.data!['data'] as Map<String, dynamic>));
    } on DioException catch (e) {
      return Failure(mapDioErrorToFailure(e));
    }
  }

  @override
  Future<Result<List<Property>>> listMine() async {
    try {
      final response = await _api.get<Map<String, dynamic>>('/properties/mine/list');
      final list = response.data!['data'] as List<dynamic>;
      return Success(PropertyDto.listFromJson(list));
    } on DioException catch (e) {
      return Failure(mapDioErrorToFailure(e));
    }
  }

  @override
  Future<Result<void>> remove(String id) async {
    try {
      await _api.delete('/properties/$id');
      return const Success(null);
    } on DioException catch (e) {
      return Failure(mapDioErrorToFailure(e));
    }
  }
}
