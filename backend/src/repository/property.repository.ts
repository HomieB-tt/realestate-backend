import { supabaseAdmin } from '../config/supabase';
import { Property, GeoPoint, PropertyProps } from '../domain/entities/property.entity';
import {
  IPropertyRepository,
  PropertyFilters,
  RadiusSearchParams,
} from '../domain/repositories/property.repository.interface';

/** Shape of a row returned by Supabase for `properties`, with location as GeoJSON. */
interface PropertyRow {
  id: string;
  agent_id: string;
  title: string;
  description: string;
  listing_type: PropertyProps['listingType'];
  status: PropertyProps['status'];
  price: string; // numeric comes back as string from postgres
  currency: string;
  bedrooms: number;
  bathrooms: number;
  area_sqm: string | null;
  address_line: string;
  city: string;
  country: string;
  location: { type: 'Point'; coordinates: [number, number] } | string;
  created_at: string;
  updated_at: string;
}

function rowToEntity(row: PropertyRow): Property {
  // Supabase/PostGIS returns geography as GeoJSON when selected with
  // `ST_AsGeoJSON` or as a hex-encoded WKB string otherwise. We standardize
  // on GeoJSON by using the `properties_geojson` view/RPC in production;
  // this mapper assumes the GeoJSON shape.
  let lng: number;
  let lat: number;

  if (typeof row.location === 'string') {
    throw new Error(
      'Expected GeoJSON location from Supabase query — ensure the select uses ST_AsGeoJSON(location) as location',
    );
  } else {
    [lng, lat] = row.location.coordinates;
  }

  return Property.create({
    id: row.id,
    agentId: row.agent_id,
    title: row.title,
    description: row.description,
    listingType: row.listing_type,
    status: row.status,
    price: Number(row.price),
    currency: row.currency,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    areaSqm: row.area_sqm ? Number(row.area_sqm) : null,
    addressLine: row.address_line,
    city: row.city,
    country: row.country,
    location: GeoPoint.create(lng, lat),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  });
}

function entityToRow(property: Property): Record<string, unknown> {
  const p = property.toJSON();
  return {
    id: p.id,
    agent_id: p.agentId,
    title: p.title,
    description: p.description,
    listing_type: p.listingType,
    status: p.status,
    price: p.price,
    currency: p.currency,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    area_sqm: p.areaSqm,
    address_line: p.addressLine,
    city: p.city,
    country: p.country,
    // PostGIS accepts WKT text for geography columns on insert/update.
    location: `SRID=4326;POINT(${p.location.lng} ${p.location.lat})`,
    updated_at: p.updatedAt.toISOString(),
  };
}

const SELECT_WITH_GEOJSON = `
  id, agent_id, title, description, listing_type, status, price, currency,
  bedrooms, bathrooms, area_sqm, address_line, city, country,
  location:location::json,
  created_at, updated_at
`;

export class SupabasePropertyRepository implements IPropertyRepository {
  async findById(id: string): Promise<Property | null> {
    const { data, error } = await supabaseAdmin
      .from('properties')
      .select(SELECT_WITH_GEOJSON)
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`findById failed: ${error.message}`);
    if (!data) return null;
    return rowToEntity(data as unknown as PropertyRow);
  }

  async findWithinRadius(
    params: RadiusSearchParams,
    filters?: PropertyFilters,
  ): Promise<Property[]> {
    // Delegates the spatial math to the `properties_within_radius` RPC
    // defined in migration 001, which already applies the GIST index.
    const { data, error } = await supabaseAdmin.rpc('properties_within_radius', {
      center_lng: params.lng,
      center_lat: params.lat,
      radius_m: params.radiusMeters,
      max_results: params.limit ?? 50,
    });

    if (error) throw new Error(`findWithinRadius failed: ${error.message}`);

    let results = ((data ?? []) as PropertyRow[]).map(rowToEntity);

    // Additional in-memory filters for attributes not worth a bespoke RPC
    // parameter yet (kept simple for the MVP; move into SQL if this list grows).
    if (filters?.listingType) {
      results = results.filter((p) => p.toJSON().listingType === filters.listingType);
    }
    if (filters?.minPrice !== undefined) {
      results = results.filter((p) => p.toJSON().price >= filters.minPrice!);
    }
    if (filters?.maxPrice !== undefined) {
      results = results.filter((p) => p.toJSON().price <= filters.maxPrice!);
    }
    if (filters?.minBedrooms !== undefined) {
      results = results.filter((p) => p.toJSON().bedrooms >= filters.minBedrooms!);
    }
    if (filters?.city) {
      results = results.filter(
        (p) => p.toJSON().city.toLowerCase() === filters.city!.toLowerCase(),
      );
    }

    return results;
  }

  async findByAgentId(agentId: string): Promise<Property[]> {
    const { data, error } = await supabaseAdmin
      .from('properties')
      .select(SELECT_WITH_GEOJSON)
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`findByAgentId failed: ${error.message}`);
    return ((data ?? []) as unknown as PropertyRow[]).map(rowToEntity);
  }

  async create(property: Property): Promise<Property> {
    const { data, error } = await supabaseAdmin
      .from('properties')
      .insert(entityToRow(property))
      .select(SELECT_WITH_GEOJSON)
      .single();

    if (error) throw new Error(`create failed: ${error.message}`);
    return rowToEntity(data as unknown as PropertyRow);
  }

  async update(property: Property): Promise<Property> {
    const row = entityToRow(property);
    const { data, error } = await supabaseAdmin
      .from('properties')
      .update(row)
      .eq('id', property.id)
      .select(SELECT_WITH_GEOJSON)
      .single();

    if (error) throw new Error(`update failed: ${error.message}`);
    return rowToEntity(data as unknown as PropertyRow);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabaseAdmin.from('properties').delete().eq('id', id);
    if (error) throw new Error(`delete failed: ${error.message}`);
  }
}
