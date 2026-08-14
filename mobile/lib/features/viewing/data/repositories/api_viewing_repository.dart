import 'package:dio/dio.dart';
import '../../../../core/error/dio_error_mapper.dart';
import '../../../../core/network/api_client.dart';
import '../../../property/domain/repositories/property_repository.dart' show Result, Success, Failure;
import '../../domain/entities/viewing.dart';
import '../../domain/repositories/viewing_repository.dart';

class ApiViewingRepository implements ViewingRepository {
  ApiViewingRepository(this._api);

  final ApiClient _api;

  static Viewing _fromJson(Map<String, dynamic> json) {
    return Viewing(
      id: json['id'] as String,
      propertyId: json['propertyId'] as String,
      clientId: json['clientId'] as String,
      agentId: json['agentId'] as String,
      scheduledAt: DateTime.parse(json['scheduledAt'] as String),
      durationMins: json['durationMins'] as int,
      status: viewingStatusFromString(json['status'] as String),
      notes: json['notes'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  @override
  Future<Result<Viewing>> requestViewing(NewViewingInput input) async {
    try {
      final response = await _api.post<Map<String, dynamic>>(
        '/viewings',
        data: {
          'propertyId': input.propertyId,
          'scheduledAt': input.scheduledAt.toUtc().toIso8601String(),
          'durationMins': input.durationMins,
          if (input.notes != null) 'notes': input.notes,
        },
      );
      return Success(_fromJson(response.data!['data'] as Map<String, dynamic>));
    } on DioException catch (e) {
      // A 409 here means the slot was taken between the user picking a
      // time and the request landing — surfaced via ConflictFailure so
      // the UI can prompt them to choose another time.
      return Failure(mapDioErrorToFailure(e));
    }
  }

  @override
  Future<Result<Viewing>> confirm(String id) async {
    try {
      final response = await _api.post<Map<String, dynamic>>('/viewings/$id/confirm');
      return Success(_fromJson(response.data!['data'] as Map<String, dynamic>));
    } on DioException catch (e) {
      return Failure(mapDioErrorToFailure(e));
    }
  }

  @override
  Future<Result<Viewing>> cancel(String id) async {
    try {
      final response = await _api.post<Map<String, dynamic>>('/viewings/$id/cancel');
      return Success(_fromJson(response.data!['data'] as Map<String, dynamic>));
    } on DioException catch (e) {
      return Failure(mapDioErrorToFailure(e));
    }
  }

  @override
  Future<Result<List<Viewing>>> listForProperty(String propertyId) async {
    try {
      final response = await _api.get<Map<String, dynamic>>('/viewings/property/$propertyId');
      final list = response.data!['data'] as List<dynamic>;
      return Success(list.map((e) => _fromJson(e as Map<String, dynamic>)).toList());
    } on DioException catch (e) {
      return Failure(mapDioErrorToFailure(e));
    }
  }

  @override
  Future<Result<List<Viewing>>> listMine() async {
    try {
      final response = await _api.get<Map<String, dynamic>>('/viewings/mine/list');
      final list = response.data!['data'] as List<dynamic>;
      return Success(list.map((e) => _fromJson(e as Map<String, dynamic>)).toList());
    } on DioException catch (e) {
      return Failure(mapDioErrorToFailure(e));
    }
  }
}
