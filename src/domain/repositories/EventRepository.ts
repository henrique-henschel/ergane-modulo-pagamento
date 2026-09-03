import { DomainEvent } from '../events/DomainEvent';

export interface StoredDomainEvent {
  id: string;
  eventName: string;
  occurredAt: Date;
  payload: Record<string, unknown>;
}

export interface EventRepository {
  save(event: DomainEvent): Promise<StoredDomainEvent>;
  list(filter?: { customerId?: string; limit?: number }): Promise<StoredDomainEvent[]>;
}
