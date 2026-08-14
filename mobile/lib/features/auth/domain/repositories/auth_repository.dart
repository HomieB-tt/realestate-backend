import '../../../../core/error/app_failure.dart';
import '../entities/app_user.dart';

/// Result type avoiding exceptions across the repository boundary —
/// consistent with how the backend surfaces typed errors rather than
/// letting arbitrary exceptions leak into the presentation layer.
sealed class AuthResult<T> {
  const AuthResult();
}

class AuthSuccess<T> extends AuthResult<T> {
  const AuthSuccess(this.value);
  final T value;
}

class AuthError<T> extends AuthResult<T> {
  const AuthError(this.failure);
  final AppFailure failure;
}

/// Contract for authentication. The presentation layer (providers,
/// screens) depends only on this interface — concrete implementation
/// (Supabase-backed) lives in data/repositories/.
abstract interface class AuthRepository {
  /// Requests a one-time passcode be sent to [email] (Supabase Email OTP
  /// flow, per the architecture spec).
  Future<AuthResult<void>> sendOtp(String email);

  /// Verifies the OTP code and establishes a session.
  Future<AuthResult<AppUser>> verifyOtp({required String email, required String token});

  /// Email/password sign-in — kept alongside OTP since some flows (e.g.
  /// agent/admin backoffice accounts) may prefer password auth.
  Future<AuthResult<AppUser>> signInWithPassword({required String email, required String password});

  Future<void> signOut();

  /// Currently authenticated user, or null if signed out. Resolves the
  /// role by fetching the linked `profiles` row.
  Future<AppUser?> currentUser();
}
