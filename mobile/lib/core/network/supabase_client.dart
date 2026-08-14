import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../constants/env.dart';

/// Initializes the Supabase SDK. Call once from `main()` before
/// `runApp()`. The mobile app uses Supabase directly ONLY for
/// authentication (sign-up/sign-in/session/token refresh) — all property
/// and viewing data flows through the custom backend API instead, which
/// re-verifies the resulting JWT server-side. This mirrors the
/// architecture spec: "Client apps authenticate via Supabase Auth."
Future<void> initSupabase() async {
  Env.assertConfigured();
  await Supabase.initialize(
    url: Env.supabaseUrl,
    publishableKey: Env.supabaseAnonKey,
  );
}

/// Exposes the singleton Supabase client to the widget tree via Riverpod.
final supabaseClientProvider = Provider<SupabaseClient>((ref) {
  return Supabase.instance.client;
});

/// Emits the current auth session, including sign-in/sign-out/token-refresh
/// events. Feature providers (property, viewing) watch this to know when
/// to attach/remove the bearer token on outgoing API requests.
final authStateChangesProvider = StreamProvider<AuthState>((ref) {
  final client = ref.watch(supabaseClientProvider);
  return client.auth.onAuthStateChange;
});
