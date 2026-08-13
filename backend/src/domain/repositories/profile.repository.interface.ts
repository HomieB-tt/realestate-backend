import { Profile } from '../entities/profile.entity';

export interface IProfileRepository {
  findById(id: string): Promise<Profile | null>;
  update(profile: Profile): Promise<Profile>;
}
