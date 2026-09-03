import { DomainEvent } from '../../domain/events/DomainEvent';
import { EventPublisher } from '../../domain/events/EventPublisher';
import { EventRepository } from '../../domain/repositories/EventRepository';

type EventListener = (event: DomainEvent) => void | Promise<void>;

export class InMemoryEventPublisher implements EventPublisher {
  private readonly listeners: Map<string, EventListener[]> = new Map();

  constructor(private readonly eventRepository?: EventRepository) {}

  subscribe(eventName: string, listener: EventListener): void {
    const list = this.listeners.get(eventName) ?? [];
    list.push(listener);
    this.listeners.set(eventName, list);
  }

  async publish(event: DomainEvent): Promise<void> {
    if (this.eventRepository) {
      await this.eventRepository.save(event);
    }

    const listeners = this.listeners.get(event.eventName) ?? [];
    for (const listener of listeners) {
      await listener(event);
    }
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}
