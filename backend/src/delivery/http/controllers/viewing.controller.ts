import { Request, Response } from 'express';
import { ViewingUsecase } from '../../../usecase/viewing.usecase';
import { asyncHandler } from '../middleware/error.middleware';

export class ViewingController {
  constructor(private readonly usecase: ViewingUsecase) {}

  request = asyncHandler(async (req: Request, res: Response) => {
    const clientId = req.auth!.userId;
    const body = req.body as {
      propertyId: string;
      scheduledAt: string; // ISO 8601
      durationMins?: number;
      notes?: string;
    };

    if (!body.propertyId || !body.scheduledAt) {
      res.status(400).json({ error: 'validation_error', message: 'propertyId and scheduledAt are required' });
      return;
    }

    const viewing = await this.usecase.requestViewing(clientId, {
      propertyId: body.propertyId,
      scheduledAt: new Date(body.scheduledAt),
      durationMins: body.durationMins ?? 30,
      notes: body.notes ?? null,
    });

    // 201 Created on success. A 409 (slot_conflict) is produced by the
    // centralized error handler if bookSlot() detects an overlap.
    res.status(201).json({ data: viewing.toJSON() });
  });

  confirm = asyncHandler(async (req: Request, res: Response) => {
    const agentId = req.auth!.userId;
    const id = requireParam(req.params.id, 'id');
    const viewing = await this.usecase.confirm(id, agentId);
    res.status(200).json({ data: viewing.toJSON() });
  });

  cancel = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.auth!.userId;
    const id = requireParam(req.params.id, 'id');
    const viewing = await this.usecase.cancel(id, userId);
    res.status(200).json({ data: viewing.toJSON() });
  });

  listForProperty = asyncHandler(async (req: Request, res: Response) => {
    const propertyId = requireParam(req.params.propertyId, 'propertyId');
    const viewings = await this.usecase.listForProperty(propertyId);
    res.status(200).json({ data: viewings.map((v) => v.toJSON()) });
  });

  listMine = asyncHandler(async (req: Request, res: Response) => {
    const clientId = req.auth!.userId;
    const viewings = await this.usecase.listForClient(clientId);
    res.status(200).json({ data: viewings.map((v) => v.toJSON()) });
  });
}

/** Narrows an Express route param from `string | undefined` to `string`. */
function requireParam(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing required route parameter: ${name}`);
  }
  return value;
}
