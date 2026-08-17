import { supabaseAdmin } from '../config/supabase';
import { UserRole } from '../domain/entities/profile.entity';
import { Property } from '../domain/entities/property.entity';
import { AdminUserSummary, IAdminRepository } from '../domain/repositories/admin.repository.interface';
import { PropertyRow, rowToEntity, SELECT_WITH_GEOJSON } from './property.repository';

interface ProfileRow {
  id: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export class SupabaseAdminRepository implements IAdminRepository {
  /**
   * User email lives on `auth.users`, which PostgREST does not expose
   * (by design — Supabase keeps the `auth` schema out of the public
   * REST API for security). The service-role Admin Auth API is the
   * correct way to read it server-side. Role lives on `public.profiles`.
   * This merges both sources by id rather than duplicating email into
   * `profiles` just to make one query simpler.
   */
  async listUsers(): Promise<AdminUserSummary[]> {
    const [authResult, profilesResult] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers(),
      supabaseAdmin.from('profiles').select('id, full_name, role, created_at'),
    ]);

    if (authResult.error) {
      throw new Error(`listUsers (auth) failed: ${authResult.error.message}`);
    }
    if (profilesResult.error) {
      throw new Error(`listUsers (profiles) failed: ${profilesResult.error.message}`);
    }

    const emailById = new Map(authResult.data.users.map((u) => [u.id, u.email ?? null]));

    return (profilesResult.data as ProfileRow[]).map((row) => ({
      id: row.id,
      email: emailById.get(row.id) ?? null,
      fullName: row.full_name,
      role: row.role,
      createdAt: new Date(row.created_at),
    }));
  }

  async updateUserRole(userId: string, role: UserRole): Promise<AdminUserSummary> {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select('id, full_name, role, created_at')
      .single();

    if (error) throw new Error(`updateUserRole failed: ${error.message}`);

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);

    const row = data as ProfileRow;
    return {
      id: row.id,
      email: authUser.user?.email ?? null,
      fullName: row.full_name,
      role: row.role,
      createdAt: new Date(row.created_at),
    };
  }

  /**
   * Unrestricted property listing — every status, every owner. Reuses
   * the same row-mapping logic as SupabasePropertyRepository so the
   * PostGIS/GeoJSON handling stays in exactly one place.
   */
  async listAllProperties(): Promise<Property[]> {
    const { data, error } = await supabaseAdmin
      .from('properties')
      .select(SELECT_WITH_GEOJSON)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`listAllProperties failed: ${error.message}`);
    return ((data ?? []) as unknown as PropertyRow[]).map(rowToEntity);
  }
}
