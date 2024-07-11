
/**
 * A simple set that can contain values from 0 to 255 (inclusive).
 */
export class ByteSet implements Iterable<number> {

    /**
     * Returns a new ByteSet that contains all bytes that are within at least 1 of the given sets.
     */
    static union(sets: ByteSet[]): ByteSet {
        const ret = new ByteSet();
        const dat: Uint8Array = ret.data;
        let value: number;
        for (let i=0; i < 32; i++) {
            value = 0;
            for (let set of sets) {
                value |= set.data[i];
            }
            dat[i] = value;
        }
        return ret;
    }

    private readonly data: Uint8Array;
    constructor() {
        // 256 bits can fit in 32 bytes
        this.data = new Uint8Array(32);
    }

    /**
     * @param index Value (0-255) to test
     * @return True if the value is within the set. This also returns false for out-of-range values
     */
    has(index: number): boolean {
        const mask = 1 << (index & 7);
        // False is returned for out-of-range values because (undefined & number) === 0
        // Easy to verify: ((new Uint8Array())[-1] & 1) === 0
        return (this.data[index >> 3] & mask) !== 0;
    }

    /**
     * Adds the given value to the set. Out-of-range values are safely ignored. If you want to pass a signed byte,
     * you must AND it with 0xFF (255).
     * @param index Value (0-255) to add
     * @returns True if the value was newly added
     */
    add(index: number): boolean {
        return this.set(index, true);
    }

    /**
     * Removes a value from the set. Out-of-range values are safely ignored. If you want to pass a signed byte,
     * you must AND it with 0xFF (255).
     * @param index Value (0-255) to remove
     * @returns True if the value was present before removal
     */
    remove(index: number): boolean {
        return this.set(index, false);
    }

    /**
     * Adds or removes all byte values (0 - 255) to/from the set.
     * @param value If true or unset, the set will contain all byte values. If false, the set will become empty.
     */
    fill(value: boolean = true): void {
        this.data.fill(value ? 0xFF : 0x00);
    }

    /**
     * Clears the set. Alias for ``fill(false)``.
     * @see fill
     */
    clear(): void {
        this.fill(false);
    }

    private set(index: number, value: boolean): boolean {
        const mask = 1 << (index & 7);
        index >>= 3;
        let current: number = this.data[index];
        return (
            this.data[index] = (value ?
                    (current | mask) :
                    (current & (~mask))
            )
        ) !== current;
    }

    /**
     * Iterates over this set and yields each byte that it contains (would satisfy {@link has}).
     */
    *iterator(): Generator<number> {
        const u32 = new Uint32Array(this.data.buffer);
        let head: number = -1;
        let base: number;
        let flag: number;
        while ((++head) < 32) {
            if ((head & 3) === 0 && u32[head >> 2] === 0) { // Skip 4 bytes at a time using u32
                head |= 3;
                continue;
            }
            flag = this.data[head];
            if (flag === 0) continue; // Skip 1 byte at a time using u8
            base = head << 3;
            for (let i=0; i < 8; i++) { // Test each bit in non-skipped byte
                if (flag & (1 << i)) {
                    yield (base | i);
                }
            }
        }
    }

    [Symbol.iterator](): Generator<number> {
        return this.iterator();
    }

}
