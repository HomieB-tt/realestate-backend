import 'package:dio/dio.dart';
import 'app_failure.dart';

/// Translates a `DioException` into an `AppFailure`, reading the
/// backend's standard error body shape: `{"error": "...", "message": "..."}`
/// (see backend/src/delivery/http/middleware/error.middleware.ts).
AppFailure mapDioErrorToFailure(DioException e) {
  final statusCode = e.response?.statusCode;
  final body = e.response?.data;
  final serverMessage = (body is Map<String, dynamic>) ? body['message'] as String? : null;

  switch (statusCode) {
    case 400:
      return ValidationFailure(serverMessage ?? 'Invalid request.');
    case 401:
      return const UnauthorizedFailure();
    case 403:
      return ForbiddenFailure(serverMessage ?? 'You do not have permission to do that.');
    case 404:
      return NotFoundFailure(serverMessage ?? 'Not found.');
    case 409:
      return ConflictFailure(serverMessage ?? 'This conflicts with an existing booking.');
    default:
      if (e.type == DioExceptionType.connectionError ||
          e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout) {
        return const NetworkFailure();
      }
      return UnknownFailure(serverMessage ?? 'Something went wrong. Please try again.');
  }
}
