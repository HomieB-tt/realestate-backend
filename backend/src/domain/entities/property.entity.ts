import { DomainValidationError } from './profile.entity';

export type ListingType = 'sale' | 'rent';
export type PropertyStatus = 'draft' | 'published' | 'under_offer' | 'sold' | 'archived';

/**
 * Value Object: GeoPoint
 * Enforces valid WGS84 lng/lat at construction time so invalid
 * coordinates can never reach the repository layer.
 */
export class GeoPoint {
  private constructor(
    public readonly lng: number,
    public readonly lat: number,
  ) {}

  static create(lng: number, lat: number): GeoPoint {
    if (Number.isNaN(lng) || Number.isNaN(lat)) {
      throw new DomainValidationError('GeoPoint lng/lat must be numeric');
    }
    if (lng < -180 || lng > 180) {
      throw new DomainValidationError(`Longitude out of range: ${lng}`);
    }
    if (lat < -90 || lat > 90) {
      throw new DomainValidationError(`Latitude out of range: ${lat}`);
    }
    return new GeoPoint(lng, lat);
  }
}

export interface PropertyProps {
  id: string;
  agentId: string;
  title: string;
  description: string;
  listingType: ListingType;
  status: PropertyStatus;
  price: number;
  currency: string; // ISO 4217, e.g. 'USD'
  bedrooms: number;
  bathrooms: number;
  areaSqm: number | null;
  addressLine: string;
  city: string;
  country: string;
  location: GeoPoint;
  createdAt: Date;
  updatedAt: Date;
}

/** Fields accepted when creating a brand-new listing (server generates the rest). */
export type NewPropertyInput = Omit<
  PropertyProps,
  'id' | 'status' | 'createdAt' | 'updatedAt' | 'location'
> & { lng: number; lat: number };

export class Property {
  private constructor(private readonly props: PropertyProps) {}

  static create(props: PropertyProps): Property {
    if (!props.title || props.title.trim().length === 0) {
      throw new DomainValidationError('Property title is required');
    }
    if (props.price < 0) {
      throw new DomainValidationError('Property price cannot be negative');
    }
    if (props.bedrooms < 0 || props.bathrooms < 0) {
      throw new DomainValidationError('Bedroom/bathroom counts cannot be negative');
    }
    return new Property(props);
  }

  static fromNewInput(id: string, input: NewPropertyInput): Property {
    const location = GeoPoint.create(input.lng, input.lat);
    const now = new Date();
    return Property.create({
      id,
      agentId: input.agentId,
      title: input.title,
      description: input.description,
      listingType: input.listingType,
      status: 'draft',
      price: input.price,
      currency: input.currency,
      bedrooms: input.bedrooms,
      bathrooms: input.bathrooms,
      areaSqm: input.areaSqm,
      addressLine: input.addressLine,
      city: input.city,
      country: input.country,
      location,
      createdAt: now,
      updatedAt: now,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get agentId(): string {
    return this.props.agentId;
  }

  get status(): PropertyStatus {
    return this.props.status;
  }

  /** Business rule: only a draft with all required fields can be published. */
  publish(): Property {
    if (this.props.status !== 'draft') {
      throw new DomainValidationError(
        `Cannot publish property in status "${this.props.status}"; must be "draft"`,
      );
    }
    if (!this.props.addressLine || !this.props.city || !this.props.country) {
      throw new DomainValidationError('Address is incomplete; cannot publish');
    }
    return new Property({ ...this.props, status: 'published', updatedAt: new Date() });
  }

  /**
   * Reverses a publish decision — the listing stops appearing in public
   * search (properties_within_radius / findByCity both filter on
   * status = 'published'), but the agent keeps full ownership and can
   * edit or re-publish later. This is deliberately a return to 'draft'
   * rather than 'archived': 'archived' implies a more permanent,
   * likely-final state (e.g. sold elsewhere, listing withdrawn for
   * good), whereas unpublish is meant for temporary situations
   * (under negotiation, needs edits, temporarily unavailable).
   */
  unpublish(): Property {
    if (this.props.status !== 'published') {
      throw new DomainValidationError(
        `Cannot unpublish property in status "${this.props.status}"; must be "published"`,
      );
    }
    return new Property({ ...this.props, status: 'draft', updatedAt: new Date() });
  }

  isOwnedBy(agentId: string): boolean {
    return this.props.agentId === agentId;
  }

  toJSON(): PropertyProps {
    return { ...this.props };
  }
}
