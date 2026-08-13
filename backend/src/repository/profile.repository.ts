import { supabaseAdmin } from '../config/supabase';
import { Profile, ProfileProps } from '../domain/entities/profile.entity';
import { IProfileRepository } from '../domain/repositories/profile.repository.interface';

interface ProfileRow {
  id: string;
  full_name: string;
  phone: string | null;
  role: ProfileProps['role'];
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

function rowToEntity(row: ProfileRow): Profile {
  return Profile.create({
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    role: row.role,
    avatarUrl: row.avatar_url,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  });
}

export class SupabaseProfileRepository implements IProfileRepository {
  async findById(id: string): Promise<Profile | null> {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`findById failed: ${error.message}`);
    if (!data) return null;
    return rowToEntity(data as ProfileRow);
  }

  async update(profile: Profile): Promise<Profile> {
    const p = profile.toJSON();
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: p.fullName,
        phone: p.phone,
        avatar_url: p.avatarUrl,
        updated_at: p.updatedAt.toISOString(),
      })
      .eq('id', p.id)
      .select('*')
      .single();

    if (error) throw new Error(`update failed: ${error.message}`);
    return rowToEntity(data as ProfileRow);
  }
}
