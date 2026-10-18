export const PRICE_FETCH_CONCURRENCY = 2;

/** Drain started requests on stop; never retry a potentially billable lookup. */
export async function fetchPriceQueue<T>(options: {
  asins: string[];
  lookup: (asin: string) => Promise<T>;
  stopped: () => boolean;
  saved: (asin: string, result: T) => void;
  failed: (asin: string, error: unknown) => void;
  progress: (completed: number, active: number) => void;
}) {
  let cursor = 0;
  let completed = 0;
  let active = 0;
  const saved = new Set<string>();
  const worker = async () => {
    while (!options.stopped() && cursor < options.asins.length) {
      const asin = options.asins[cursor++];
      active++;
      options.progress(completed, active);
      try {
        const result = await options.lookup(asin);
        saved.add(asin);
        options.saved(asin, result);
      } catch (error) {
        options.failed(asin, error);
      } finally {
        completed++;
        active--;
        options.progress(completed, active);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(PRICE_FETCH_CONCURRENCY, options.asins.length) }, worker));
  return { saved: saved.size, remaining: options.asins.filter(asin => !saved.has(asin)) };
}