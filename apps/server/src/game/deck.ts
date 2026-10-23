/** Draws items without repeats until the pool is exhausted, then reshuffles. */
export class Deck<T> {
  private pile: T[] = [];

  constructor(
    private readonly items: readonly T[],
    private readonly random: () => number = Math.random,
  ) {}

  draw(count: number): T[] {
    const out: T[] = [];
    while (out.length < count && this.items.length > 0) {
      if (this.pile.length === 0) this.pile = shuffle([...this.items], this.random);
      out.push(this.pile.pop()!);
    }
    return out;
  }
}

function shuffle<T>(arr: T[], random: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}
