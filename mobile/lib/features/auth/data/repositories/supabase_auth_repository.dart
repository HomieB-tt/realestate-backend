import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/error/app_failure.dart';
import '../../domain/entities/app_user.dart';
import '../../domain/repositories/auth_repository.dart';

class SupabaseAuthRepository implements AuthRepository {
  SupabaseAuthRepository(this._client);

  final SupabaseClient _client;

  @override
  Future<AuthResult<void>> sendOtp(String email) async {
    try {
      await _client.auth.signInWithOtp(email: email);
      return const AuthSuccess(null);
    } on AuthException catch (e) {
      return AuthError(ValidationFailure(e.message));
    } catch (_) {
      return const AuthError(NetworkFailure());
    }
  }

  @override
  Future<AuthResult<AppUser>> verifyOtp({required String email, required String token}) async {
    try {
      final response = await _client.auth.verifyOTP(
        email: email,
        token: token,
        type: OtpType.email,
      );
      final user = response.user;
      if (user == null) {
        return const AuthError(UnauthorizedFailure('Verification failed. Please try again.'));
      }
      final appUser = await _resolveAppUser(user.id, user.email);
      return AuthSuccess(appUser);
    } on AuthException catch (e) {
      return AuthError(ValidationFailure(e.message));
    } catch (_) {
      return const AuthError(NetworkFailure());
    }
  }

  @override
  Future<AuthResult<AppUser>> signInWithPassword({required String email, required String password}) async {
    try {
      final response = await _client.auth.signInWithPassword(email: email, password: password);
      final user = response.user;
      if (user == null) {
        return const AuthError(UnauthorizedFailure('Invalid email or password.'));
      }
      final appUser = await _resolveAppUser(user.id, user.email);
      return AuthSuccess(appUser);
    } on AuthException catch (e) {
      return AuthError(UnauthorizedFailure(e.message));
    } catch (_) {
      return const AuthError(NetworkFailure());
    }
  }

  @override
  Future<void> signOut() => _client.auth.signOut();

  @override
  Future<AppUser?> currentUser() async {
    final user = _client.auth.currentUser;
    if (user == null) return null;
    return _resolveAppUser(user.id, user.email);
  }

  /// Looks up the linked `profiles.role` so the app knows whether this
  /// user is a client/agent/admin — mirrors the backend's own approach
  /// of treating `profiles` as the source of truth for role, rather than
  /// trusting anything embedded in the JWT.
  Future<AppUser> _resolveAppUser(String id, String? email) async {
    final row = await _client.from('profiles').select('role').eq('id', id).maybeSingle();
    final roleString = row?['role'] as String? ?? 'client';
    return AppUser(id: id, email: email, role: userRoleFromString(roleString));
  }
}
