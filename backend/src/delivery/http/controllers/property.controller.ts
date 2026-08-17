import { Request, Response } from 'express';
import { PropertyUsecase } from '../../../usecase/property.usecase';
import { asyncHandler } from '../middleware/error.middleware';
import { ListingType } from '../../../domain/entities/property.entity';

/**
 * Controllers are intentionally "thin": parse/validate the HTTP request,
 * call the usecase, shape the HTTP response. No business rules live here —
 * those belong in PropertyUsecase / the domain entities.
 */
export class PropertyController {
  constructor(private readonly usecase: PropertyUsecase) {}

  create = asyncHandler(async (req: Request, res: Response) => {
    const agentId = req.auth!.userId;
    const body = req.body as {
      title: string;
      description: string;
      listingType: ListingType;
      price: number;
      currency: string;
      bedrooms: number;
      bathrooms: number;
      areaSqm: number | null;
      addressLine: string;
      city: string;
      country: string;
      lng: number;
      lat: number;
    };

    validateRequiredFields(body, [
      'title', 'description', 'listingType', 'price', 'currency',
      'bedrooms', 'bathrooms', 'addressLine', 'city', 'country', 'lng', 'lat',
    ]);

    const property = await this.usecase.createDraft(agentId, body);
    res.status(201).json({ data: property.toJSON() });
  });

  publish = asyncHandler(async (req: Request, res: Response) => {
    const agentId = req.auth!.userId;
    const id = requireParam(req.params.id, 'id');
    const property = await this.usecase.publish(id, agentId);
    res.status(200).json({ data: property.toJSON() });
  });

  unpublish = asyncHandler(async (req: Request, res: Response) => {
    const agentId = req.auth!.userId;
    const id = requireParam(req.params.id, 'id');
    const property = await this.usecase.unpublish(id, agentId);
    res.status(200).json({ data: property.toJSON() });
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const id = requireParam(req.params.id, 'id');
    const property = await this.usecase.getById(id);
    res.status(200).json({ data: property.toJSON() });
  });

  searchNearby = asyncHandler(async (req: Request, res: Response) => {
    const { lng, lat, radiusMeters, limit, listingType, minPrice, maxPrice, minBedrooms, city } = req.query;

    const filters = {
      listingType: listingType as ListingType | undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      minBedrooms: minBedrooms ? Number(minBedrooms) : undefined,
    };

    // City search is a distinct mode, not just an extra filter on top of
    // radius search — it deliberately ignores the caller's location
    // entirely, so a search for a city outside the caller's current
    // radius still finds matches. Takes priority when lng/lat aren't
    // both provided alongside it.
    if (city && !(lng && lat)) {
      const properties = await this.usecase.searchByCity(city as string, filters);
      res.status(200).json({ data: properties.map((p) => p.toJSON()) });
      return;
    }

    if (!lng || !lat || !radiusMeters) {
      res.status(400).json({
        error: 'validation_error',
        message: 'Either city, or lng+lat+radiusMeters, must be provided',
      });
      return;
    }

    const properties = await this.usecase.searchNearby(
      {
        lng: Number(lng),
        lat: Number(lat),
        radiusMeters: Number(radiusMeters),
        limit: limit ? Number(limit) : undefined,
      },
      filters,
    );

    res.status(200).json({ data: properties.map((p) => p.toJSON()) });
  });

  listMine = asyncHandler(async (req: Request, res: Response) => {
    const agentId = req.auth!.userId;
    const properties = await this.usecase.listByAgent(agentId);
    res.status(200).json({ data: properties.map((p) => p.toJSON()) });
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    const id = requireParam(req.params.id, 'id');
    const isAdmin = req.auth!.role === 'admin';
    await this.usecase.remove(id, req.auth!.userId, isAdmin);
    res.status(204).send();
  });
}

function validateRequiredFields(body: Record<string, unknown>, fields: string[]): void {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null);
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
}

/** Narrows an Express route param from `string | undefined` to `string`. */
function requireParam(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing required route parameter: ${name}`);
  }
  return value;
}
