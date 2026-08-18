// Simple abstraction over localStorage to handle JSON cleanly

export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    try {
      const item = window.localStorage.getItem(`mealfy_${key}`);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  set: <T>(key: string, value: T): void => {
    try {
      window.localStorage.setItem(`mealfy_${key}`, JSON.stringify(value));
    } catch {
      console.warn(`Error setting localStorage for key: ${key}`);
    }
  },

  remove: (key: string): void => {
    window.localStorage.removeItem(`mealfy_${key}`);
  },

  clear: (): void => {
    // only clear mealfy specific keys
    const keys = Object.keys(window.localStorage);
    for (const key of keys) {
      if (key.startsWith('mealfy_')) {
        window.localStorage.removeItem(key);
      }
    }
  }
};
