import { DomainEvent } from '../../domain/events/DomainEvent';
import { EventRepository, StoredDomainEvent } from '../../domain/repositories/EventRepository';
import { newId } from '../../domain/shared/Identifier';

export class InMemoryEventRepository implements EventRepository {
  private readonly events: StoredDomainEvent[] = [];

  async save(event: DomainEvent): Promise<StoredDomainEvent> {
    const stored: StoredDomainEvent = {
      id: newId(),
      eventName: event.eventName,
      occurredAt: event.occurredAt,
      payload: event.payload,
    };
    this.events.unshift(stored); // most recent first
    return stored;
  }

  async list(filter?: { customerId?: string; limit?: number }): Promise<StoredDomainEvent[]> {
    let result = [...this.events];
    if (filter?.customerId) {
      result = result.filter(
        (e) => e.payload && String(e.payload.customerId) === filter.customerId,
      );
    }
    if (filter?.limit && filter.limit > 0) {
      result = result.slice(0, filter.limit);
    }
    return result;
  }

  clear(): void {
    this.events.length = 0;
  }
}
