/// Domain entity mirroring the backend's `Profile` (see
/// backend/src/domain/entities/profile.entity.ts). Pure data — no
/// Supabase SDK types leak past the data layer.
enum UserRole { client, agent, admin }

UserRole userRoleFromString(String value) {
  return UserRole.values.firstWhere(
    (r) => r.name == value,
    orElse: () => UserRole.client,
  );
}

class AppUser {
  const AppUser({
    required this.id,
    required this.email,
    required this.role,
  });

  final String id;
  final String? email;
  final UserRole role;

  bool get isAgent => role == UserRole.agent || role == UserRole.admin;
}
