/**
 * Processes items in batches, with items processed in parallel within each batch
 *
 * @param items the items to process
 * @param batchSize the size of each batch
 * @param processor the function to process each item
 */
export async function processInBatches<T>(
  items: T[],
  batchSize: number,
  processor: (item: T) => Promise<void>
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(processor));
  }
}

