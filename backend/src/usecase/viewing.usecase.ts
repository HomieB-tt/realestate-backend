import { randomUUID } from 'crypto';
import { Viewing, NewViewingInput } from '../domain/entities/viewing.entity';
import { IViewingRepository } from '../domain/repositories/viewing.repository.interface';
import { IPropertyRepository } from '../domain/repositories/property.repository.interface';
import { ForbiddenError, NotFoundError } from '../delivery/http/middleware/error.middleware';

const MIN_LEAD_TIME_MINUTES = 60; // clients must book at least 1 hour ahead

export class ViewingUsecase {
  constructor(
    private readonly viewingRepo: IViewingRepository,
    private readonly propertyRepo: IPropertyRepository,
  ) {}

  /**
   * Requests a viewing slot. Delegates the actual race-condition-safe
   * insert to `IViewingRepository.bookSlot`, which wraps it in an explicit
   * DB transaction with row locking (see PgViewingRepository).
   */
  async requestViewing(
    clientId: string,
    input: Omit<NewViewingInput, 'clientId' | 'agentId'>,
  ): Promise<Viewing> {
    const property = await this.propertyRepo.findById(input.propertyId);
    if (!property) {
      throw new NotFoundError('Property', input.propertyId);
    }
    if (property.status !== 'published') {
      throw new ForbiddenError('Cannot book a viewing for a property that is not published');
    }

    const leadTimeMs = input.scheduledAt.getTime() - Date.now();
    if (leadTimeMs < MIN_LEAD_TIME_MINUTES * 60_000) {
      throw new ForbiddenError(`Viewings must be booked at least ${MIN_LEAD_TIME_MINUTES} minutes in advance`);
    }

    const viewing = Viewing.fromNewInput(randomUUID(), {
      ...input,
      clientId,
      agentId: property.agentId,
    });

    // This is the ACID-sensitive call: bookSlot() opens BEGIN, locks
    // overlapping rows with FOR UPDATE, checks for conflicts, and either
    // COMMITs the insert or ROLLBACKs and throws ViewingSlotConflictError.
    return this.viewingRepo.bookSlot(viewing);
  }

  async confirm(viewingId: string, requestingAgentId: string): Promise<Viewing> {
    const viewing = await this.viewingRepo.findById(viewingId);
    if (!viewing) {
      throw new NotFoundError('Viewing', viewingId);
    }
    if (viewing.toJSON().agentId !== requestingAgentId) {
      throw new ForbiddenError('Only the assigned agent can confirm this viewing');
    }
    const confirmed = viewing.confirm();
    return this.viewingRepo.updateStatus(confirmed);
  }

  async cancel(viewingId: string, requestingUserId: string): Promise<Viewing> {
    const viewing = await this.viewingRepo.findById(viewingId);
    if (!viewing) {
      throw new NotFoundError('Viewing', viewingId);
    }
    const v = viewing.toJSON();
    if (v.clientId !== requestingUserId && v.agentId !== requestingUserId) {
      throw new ForbiddenError('Only a participant in this viewing can cancel it');
    }
    const cancelled = viewing.cancel();
    return this.viewingRepo.updateStatus(cancelled);
  }

  async listForProperty(propertyId: string): Promise<Viewing[]> {
    return this.viewingRepo.findByPropertyId(propertyId);
  }

  async listForClient(clientId: string): Promise<Viewing[]> {
    return this.viewingRepo.findByClientId(clientId);
  }
}
