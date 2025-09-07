// Mock localStorage for Node environment
global.localStorage = {
    storage: {},
    getItem(key) { return this.storage[key] || null; },
    setItem(key, value) { this.storage[key] = value; },
    removeItem(key) { delete this.storage[key]; },
    clear() { this.storage = {}; }
};
