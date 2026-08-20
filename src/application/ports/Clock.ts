/** Abstrai o tempo para que casos de uso sejam determinísticos em testes. */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
};
