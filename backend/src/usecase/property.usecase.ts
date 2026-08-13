import { randomUUID } from 'crypto';
import { Property, NewPropertyInput } from '../domain/entities/property.entity';
import {
  IPropertyRepository,
  RadiusSearchParams,
  PropertyFilters,
} from '../domain/repositories/property.repository.interface';
import { ForbiddenError, NotFoundError } from '../delivery/http/middleware/error.middleware';

/**
 * Business logic layer for properties. Framework-agnostic: no Express
 * types, no Supabase types. Depends only on the repository interface,
 * so it can be unit-tested with an in-memory fake repository.
 */
export class PropertyUsecase {
  constructor(private readonly propertyRepo: IPropertyRepository) {}

  async createDraft(agentId: string, input: Omit<NewPropertyInput, 'agentId'>): Promise<Property> {
    const property = Property.fromNewInput(randomUUID(), { ...input, agentId });
    return this.propertyRepo.create(property);
  }

  async publish(propertyId: string, requestingAgentId: string): Promise<Property> {
    const property = await this.propertyRepo.findById(propertyId);
    if (!property) {
      throw new NotFoundError('Property', propertyId);
    }
    if (!property.isOwnedBy(requestingAgentId)) {
      throw new ForbiddenError('Only the listing agent can publish this property');
    }
    const published = property.publish();
    return this.propertyRepo.update(published);
  }

  async getById(propertyId: string): Promise<Property> {
    const property = await this.propertyRepo.findById(propertyId);
    if (!property) {
      throw new NotFoundError('Property', propertyId);
    }
    return property;
  }

  async searchNearby(params: RadiusSearchParams, filters?: PropertyFilters): Promise<Property[]> {
    if (params.radiusMeters <= 0 || params.radiusMeters > 100_000) {
      // Guard against pathological queries (e.g. a whole-continent scan)
      // hitting the spatial index with an unbounded radius.
      throw new Error('radiusMeters must be between 1 and 100000 (100km)');
    }
    return this.propertyRepo.findWithinRadius(params, filters);
  }

  async listByAgent(agentId: string): Promise<Property[]> {
    return this.propertyRepo.findByAgentId(agentId);
  }

  async remove(propertyId: string, requestingAgentId: string, isAdmin: boolean): Promise<void> {
    const property = await this.propertyRepo.findById(propertyId);
    if (!property) {
      throw new NotFoundError('Property', propertyId);
    }
    if (!isAdmin && !property.isOwnedBy(requestingAgentId)) {
      throw new ForbiddenError('Only the listing agent or an admin can delete this property');
    }
    await this.propertyRepo.delete(propertyId);
  }
}
