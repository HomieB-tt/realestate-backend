import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../constants/env.dart';
import 'supabase_client.dart';

/// Thin wrapper around `dio` configured to talk to our custom backend
/// (`backend/`, Node.js/TypeScript) — NOT Supabase's own REST API.
///
/// Every outgoing request has the current Supabase session's access token
/// attached as `Authorization: Bearer <token>`, which the backend's
/// `authenticate` middleware verifies against Supabase's JWKS. If the
/// backend responds 401 (expired token) or the local session is stale, an
/// interceptor forces a session refresh once before failing.
class ApiClient {
  ApiClient(this._dio);

  final Dio _dio;

  Future<Response<T>> get<T>(String path, {Map<String, dynamic>? queryParameters}) {
    return _dio.get<T>(path, queryParameters: queryParameters);
  }

  Future<Response<T>> post<T>(String path, {Object? data}) {
    return _dio.post<T>(path, data: data);
  }

  Future<Response<T>> delete<T>(String path) {
    return _dio.delete<T>(path);
  }

  static Dio buildDio(SupabaseClient supabase) {
    final dio = Dio(
      BaseOptions(
        baseUrl: Env.apiBaseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
        headers: {'Content-Type': 'application/json'},
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          final session = supabase.auth.currentSession;
          if (session != null) {
            options.headers['Authorization'] = 'Bearer ${session.accessToken}';
          }
          handler.next(options);
        },
        onError: (DioException error, handler) async {
          // One-shot retry after a forced session refresh, in case the
          // token expired between requests. Supabase's client library
          // auto-refreshes on a timer, but this covers the edge case of
          // a request firing right as the token lapses.
          final isUnauthorized = error.response?.statusCode == 401;
          final alreadyRetried = error.requestOptions.extra['retried'] == true;

          if (isUnauthorized && !alreadyRetried) {
            try {
              await supabase.auth.refreshSession();
              final retryOptions = error.requestOptions;
              retryOptions.extra['retried'] = true;
              final session = supabase.auth.currentSession;
              if (session != null) {
                retryOptions.headers['Authorization'] = 'Bearer ${session.accessToken}';
              }
              final response = await dio.fetch(retryOptions);
              return handler.resolve(response);
            } catch (_) {
              // Refresh failed too (e.g. refresh token also expired) —
              // fall through and surface the original 401 to the caller,
              // which should route the user back to sign-in.
            }
          }
          handler.next(error);
        },
      ),
    );

    return dio;
  }
}

final apiClientProvider = Provider<ApiClient>((ref) {
  final supabase = ref.watch(supabaseClientProvider);
  final dio = ApiClient.buildDio(supabase);
  return ApiClient(dio);
});
