import { Property } from '../entities/property.entity';

export interface RadiusSearchParams {
  lng: number;
  lat: number;
  radiusMeters: number;
  limit?: number;
}

export interface PropertyFilters {
  listingType?: 'sale' | 'rent';
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  city?: string;
}

/**
 * Contract for property persistence. The usecase layer depends ONLY on
 * this interface — concrete implementations (Supabase/Postgres, an
 * in-memory fake for tests, etc.) live in the repository/ layer and are
 * injected at composition-root time.
 */
export interface IPropertyRepository {
  findById(id: string): Promise<Property | null>;

  /** Radius search backed by the `properties_within_radius` PostGIS RPC. */
  findWithinRadius(params: RadiusSearchParams, filters?: PropertyFilters): Promise<Property[]>;

  /**
   * Search by city name, with no proximity constraint. Distinct from
   * `findWithinRadius` because a city search should find matches
   * regardless of the searcher's current location — filtering by city
   * AFTER a radius cut would incorrectly return nothing for a city
   * outside the caller's current search radius.
   */
  findByCity(city: string, filters?: PropertyFilters): Promise<Property[]>;

  findByAgentId(agentId: string): Promise<Property[]>;

  create(property: Property): Promise<Property>;

  update(property: Property): Promise<Property>;

  delete(id: string): Promise<void>;
}
