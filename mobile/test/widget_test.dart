import 'package:flutter_test/flutter_test.dart';
import 'package:realestate_mvp/core/theme/app_theme.dart';

// NOTE: A true widget test of RealEstateApp/_RootGate isn't included here
// because it depends on Supabase.instance.client, which requires
// Supabase.initialize() to have run — not something a plain `flutter
// test` does. Testing the real app tree properly needs a fake/mock
// SupabaseClient injected via ProviderScope overrides; add that when
// test coverage becomes a priority (e.g. with mocktail).
void main() {
  test('AppTheme.light() builds a valid ThemeData', () {
    final theme = AppTheme.light();
    expect(theme.useMaterial3, isTrue);
  });
}
