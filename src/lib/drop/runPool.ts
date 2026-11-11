// Przetwarza elementy w puli po `size`. Po `deadlineMs` (epoch) nie startuje nowych,
// już rozpoczęte kończy. Nieprzetworzone miejsca w wyniku to undefined.
export async function runPool<T, R>(
  items: T[],
  size: number,
  deadlineMs: number,
  fn: (item: T) => Promise<R>,
): Promise<(R | undefined)[]> {
  const results: (R | undefined)[] = new Array(items.length).fill(undefined);
  let next = 0;

  async function worker() {
    while (next < items.length && Date.now() < deadlineMs) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
  return results;
}
