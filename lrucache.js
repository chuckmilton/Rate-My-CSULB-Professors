export default class LRUCache {
    constructor(limit = 50) {
      this.limit = limit;
      this.cache = new Map();
    }
  
    get(key) {
      if (!this.cache.has(key)) return null;
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
  
    set(key, value) {
      if (this.cache.size === this.limit) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      this.cache.set(key, value);
    }
  }
  