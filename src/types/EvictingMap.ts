class EvictingMap<K, V> extends Map<K, V> {
    private maxEntries: number;
    constructor(maxEntries: number) {
        super();
        this.maxEntries = maxEntries;
    }

    set(key: K, value: V): this {
        if (this.size >= this.maxEntries) {
            const firstKey = this.keys().next().value;
            if (firstKey !== undefined) {
                this.delete(firstKey);
            }
        }
        return super.set(key, value);
    }
}

export default EvictingMap;