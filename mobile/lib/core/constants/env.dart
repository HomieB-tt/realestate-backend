/// Compile-time environment configuration.
///
/// Values are injected via `--dart-define` at build/run time so secrets
/// never live in source control. Example:
///
/// ```
/// flutter run \
///   --dart-define=SUPABASE_URL=https://<ref>.supabase.co \
///   --dart-define=SUPABASE_ANON_KEY=<anon-key> \
///   --dart-define=API_BASE_URL=http://10.0.2.2:8080/api/v1
/// ```
///
/// `API_BASE_URL` points at the custom backend (Node/TS), NOT Supabase
/// directly — the mobile app talks to our backend for property/viewing
/// operations, and to Supabase directly only for Auth (see
/// core/network/supabase_client.dart).
class Env {
  Env._();

  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: '',
  );

  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: '',
  );

  /// Defaults to the Android emulator's loopback alias (10.0.2.2 maps to
  /// the host machine's localhost). Override for iOS simulator/physical
  /// devices/staging via --dart-define.
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:8080/api/v1',
  );

  static void assertConfigured() {
    if (supabaseUrl.isEmpty || supabaseAnonKey.isEmpty) {
      throw StateError(
        'Missing Supabase configuration. Run with --dart-define=SUPABASE_URL=... '
        'and --dart-define=SUPABASE_ANON_KEY=...',
      );
    }
  }
}
