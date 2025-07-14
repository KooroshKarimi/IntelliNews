export async function retry<T>(fn: () => Promise<T>, retries = 2, delayMs = 1000, factor = 2): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) {
      throw err;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return retry(fn, retries - 1, delayMs * factor, factor);
  }
}