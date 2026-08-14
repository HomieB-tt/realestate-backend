import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/supabase_client.dart';
import '../../data/repositories/supabase_auth_repository.dart';
import '../../domain/entities/app_user.dart';
import '../../domain/repositories/auth_repository.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final client = ref.watch(supabaseClientProvider);
  return SupabaseAuthRepository(client);
});

/// Re-resolves the current `AppUser` (including role) whenever the
/// Supabase auth state changes (sign in, sign out, token refresh).
/// Widgets watch this to reactively gate agent-only UI, redirect to
/// sign-in on logout, etc.
final currentUserProvider = FutureProvider<AppUser?>((ref) async {
  // Rebuild whenever the underlying auth session changes.
  ref.watch(authStateChangesProvider);
  final repo = ref.watch(authRepositoryProvider);
  return repo.currentUser();
});
