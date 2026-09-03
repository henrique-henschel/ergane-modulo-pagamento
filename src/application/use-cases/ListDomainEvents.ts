import { EventRepository, StoredDomainEvent } from '../../domain/repositories/EventRepository';

export interface ListDomainEventsInput {
  customerId?: string;
  limit?: number;
}

export class ListDomainEvents {
  constructor(private readonly events: EventRepository) {}

  async execute(input: ListDomainEventsInput = {}): Promise<StoredDomainEvent[]> {
    const filter: { customerId?: string; limit?: number } = {};
    if (input.customerId !== undefined) {
      filter.customerId = input.customerId;
    }
    if (input.limit !== undefined) {
      filter.limit = input.limit;
    } else {
      filter.limit = 50;
    }
    return this.events.list(filter);
  }
}
