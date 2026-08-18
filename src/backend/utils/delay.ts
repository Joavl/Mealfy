export const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const randomDelay = (min = 100, max = 400): Promise<void> => {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return delay(ms);
};
