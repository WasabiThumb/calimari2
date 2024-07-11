import {ByteSet} from "./byteSet";

/*
 * This is pretty complicated and otherwise minimally commented so I feel as though I owe a bit of an explanation here.
 * We want an intrinsically sorted set that can contain ANY valid JS number. So we first convert the number into bytes,
 * by sharing an ArrayBuffer between a Uint8Array and Float64Array. Then we use the first 7 bytes, going from MSB to
 * LSB, to traverse through a tree until we find the "ByteSet" that defines the values within the set for the
 * last 8 bits. An optimization is also implemented where if it is known that all bytes after the one represented by
 * the current node being traversed are 0, the presence of that exact number within the set is stored in that node
 * and NO children are made. This takes advantage of the fact that integers in IEEE754 will typically end in long runs
 * of 0.
 */

/*
It is imperative that we probe the platform's endianness so that we know which byte is most significant.
*/
const IS_BIG_ENDIAN: boolean = (() => {
    const ab = new ArrayBuffer(2);
    const u8 = new Uint8Array(ab);
    const u16 = new Uint16Array(ab);
    u8[0] = 0xAA;
    u8[1] = 0xBB;
    return u16[0] === 0xAABB;
})();

/*
If BE: Traverse from 0 (MSB) to 7 (LSB)
If LE: Traverse from 7 (MSB) to 0 (LSB)
*/
const TRAVERSAL_DIRECTION: 1 | -1 = IS_BIG_ENDIAN ? 1 : -1;
const TRAVERSAL_START: 0 | 7 = IS_BIG_ENDIAN ? 0 : 7;
const TRAVERSAL_END: 0 | 7 = IS_BIG_ENDIAN ? 7 : 0;

/**
 * A node in the tree of a NumberSet. This covers the general case of diverting calls to the appropriate
 * NumberSetNode or ByteSet, or using the stored value when appropriate.
 */
class NumberSetNode {

    /**
     * Returns a new NumberSetNode that contains all values which are contained by at least 1 of the given nodes.
     * This is meant to be used exclusively as a utility method for {@link NumberSet.union}.
     */
    static union(nodes: NumberSetNode[], depth: number): NumberSetNode {
        const ret = new NumberSetNode();
        for (let node of nodes) {
            if (node.value) ret.value = true;
            for (let k of Object.keys(node.children)) {
                let child = node.children[k as unknown as number];
                const cur = ret.children[k as unknown as number];
                if (!!cur) {
                    if (depth === 6) {
                        child = ByteSet.union([
                            cur as ByteSet,
                            child as ByteSet
                        ]);
                    } else {
                        child = NumberSetNode.union([
                            cur as NumberSetNode,
                            child as NumberSetNode
                        ], depth + 1);
                    }
                }
                ret.children[k as unknown as number] = child;
            }
        }
        return ret;
    }

    // @ts-ignore The value IS defined in the constructor, but though invocation of clear0
    protected value: boolean;
    // @ts-ignore The value IS defined in the constructor, but though invocation of clear0
    protected children: { [index: number]: NumberSetNode | ByteSet };

    constructor() {
        this.clear0();
    }

    protected clear0(): void {
        this.value = false;
        this.children = {};
    }

    protected has0(bytes: Uint8Array, index: number, atWhichAllZero: number): boolean {
        if (index === atWhichAllZero) return this.value;
        const determinant: number = bytes[index];
        const child = this.children[determinant];
        if (typeof child === "undefined") return false;
        index += TRAVERSAL_DIRECTION;
        if (index === TRAVERSAL_END) {
            return (child as ByteSet).has(bytes[index]);
        } else {
            return (child as NumberSetNode).has0(bytes, index, atWhichAllZero);
        }
    }

    protected add0(bytes: Uint8Array, index: number, atWhichAllZero: number): boolean {
        if (index === atWhichAllZero) {
            const ret: boolean = !this.value;
            this.value = true;
            return ret;
        }
        const determinant: number = bytes[index];
        let child: NumberSetNode | ByteSet = this.children[determinant];

        index += TRAVERSAL_DIRECTION;
        const isTail: boolean = (index === TRAVERSAL_END);
        if (typeof child === "undefined") {
            child = isTail ? new ByteSet() : new NumberSetNode();
            this.children[determinant] = child;
        }

        if (isTail) {
            return (child as ByteSet).add(bytes[index]);
        } else {
            return (child as NumberSetNode).add0(bytes, index, atWhichAllZero);
        }
    }

    protected remove0(bytes: Uint8Array, index: number, atWhichAllZero: number): boolean {
        if (index === atWhichAllZero) {
            const ret: boolean = this.value;
            this.value = false;
            return ret;
        }
        const determinant: number = bytes[index];
        const child: NumberSetNode | ByteSet = this.children[determinant];
        if (typeof child === "undefined") return false;

        index += TRAVERSAL_DIRECTION;
        if (index === TRAVERSAL_END) {
            return (child as ByteSet).remove(bytes[index]);
        } else {
            return (child as NumberSetNode).remove0(bytes, index, atWhichAllZero);
        }
    }

    protected* iterator(buf8: Uint8Array, buf64: Float64Array, offset: number): Generator<number> {
        if (this.value) {
            // Fill remaining bytes with 0 in case a previous iteration would have placed information in this area.
            // If this case is not triggered, a fill is not necessary since a complete overwrite is guaranteed.
            IS_BIG_ENDIAN ? buf8.fill(0, offset, 8) : buf8.fill(0, 0, offset + 1);
            yield buf64[0];
        }

        const next: number = offset + TRAVERSAL_DIRECTION;
        const isTail: boolean = next === TRAVERSAL_END;
        let child: NumberSetNode | ByteSet;
        // This is where the implicit sorting comes into play.
        // See: https://tc39.es/ecma262/#sec-ordinaryownpropertykeys
        for (let k of Object.keys(this.children)) {
            buf8[offset] = parseInt(k);
            child = this.children[k as unknown as number];
            if (isTail) {
                for (let n of (child as ByteSet).iterator()) {
                    buf8[next] = n;
                    yield buf64[0];
                }
            } else {
                for (let n of (child as NumberSetNode).iterator(buf8, buf64, next)) yield n;
            }
        }
    }

    protected transferFrom(other: NumberSetNode): void {
        this.value = other.value;
        this.children = other.children;
    }

}

/**
 * An iterable set that can contain all JS numbers, with the exception of -0 and NaN.
 */
export class NumberSet extends NumberSetNode implements Iterable<number> {

    /**
     * Returns a new NumberSet that contains all values that are contained by at least 1 of the given sets.
     */
    static union(sets: NumberSet[]): NumberSet {
        const nsn = NumberSetNode.union(sets, 0);
        const ret = new NumberSet();
        ret.transferFrom(nsn);
        ret.knownNumNegativeValues = -1;
        return ret;
    }

    private readonly buf8: Uint8Array;
    private readonly buf64: Float64Array;
    private knownNumNegativeValues: number = 0; // Use -1 to dictate that the number is unknown

    constructor() {
        super();
        const buf = new ArrayBuffer(8);
        this.buf8 = new Uint8Array(buf);
        this.buf64 = new Float64Array(buf);
    }

    /**
     * Returns {@link knownNumNegativeValues} if >= 0, otherwise uses the given array to calculate the number of
     * negative values and stores it on this object. The array is assumed to have all negative values stored at the end,
     * as is yielded by this object's iterator.
     */
    private calcNumNegativeValues(array: ArrayLike<number>): number {
        if (this.knownNumNegativeValues >= 0) return this.knownNumNegativeValues;
        let count: number = 0;
        for (let i=(array.length - 1); i >= 0; i--) {
            if (array[i] >= 0) break;
            count++;
        }
        return (this.knownNumNegativeValues = count);
    }

    /**
     * NumberSet inherits has0, add0 and remove0 from NumberSetNode. This method converts a number
     * to the 3 arguments that those functions require: a Uint8Array containing the IEEE754 representation
     * of the number, an offset into the array that is significant for the current node, and an offset into the
     * array at which all further values are 0.
     */
    private parameterize(n: number): [ Uint8Array, number, number ] {
        if (n === 0) n = 0; // JS says -0 === 0

        this.buf64[0] = n;
        let atWhichAllZero: number = TRAVERSAL_END + TRAVERSAL_DIRECTION;
        let i: number = atWhichAllZero;
        while (i !== TRAVERSAL_START) {
            i -= TRAVERSAL_DIRECTION;
            if (this.buf8[i] !== 0) break;
            atWhichAllZero = i;
        }
        return [ this.buf8, TRAVERSAL_START, atWhichAllZero ];
    }

    /**
     * Returns true if the NumberSet contains the given number
     */
    has(n: number): boolean {
        if (isNaN(n)) return false;
        return this.has0(...this.parameterize(n));
    }

    /**
     * Adds the given number to the NumberSet
     */
    add(n: number): boolean {
        if (isNaN(n)) throw new Error("Cannot add NaN to NumberSet");
        if (this.add0(...this.parameterize(n))) {
            if (this.knownNumNegativeValues >= 0 && n < 0) this.knownNumNegativeValues++;
            return true;
        }
        return false;
    }

    /**
     * Removes the given number from the NumberSet
     */
    remove(n: number): boolean {
        if (isNaN(n)) return false;
        if (this.remove0(...this.parameterize(n))) {
            if (this.knownNumNegativeValues >= 0 && n < 0) this.knownNumNegativeValues--;
            return true;
        }
        return false;
    }

    /**
     * Clears the NumberSet
     */
    clear(): void {
        this.knownNumNegativeValues = 0;
        this.clear0();
    }

    [Symbol.iterator](): Iterator<number> {
        return this.iterator(this.buf8, this.buf64, TRAVERSAL_START);
    }

    /**
     * Similar to ``Array.from(this)``, but is guaranteed to be efficiently sorted.
     */
    toArray(): number[] {
        /*
         * JS guarantees that numeric object keys will be sorted lexicographically. This allows us to take a shortcut.
         * https://stackoverflow.com/questions/78731915/viable-to-sort-ieee754-floats-by-msb
         */
        let arr: Float64Array | number[];
        if (this.knownNumNegativeValues !== 0) {
            arr = new Float64Array(this);
            if (arr.length < 2) return Array.from(arr);

            // Negative values will appear after positive values during collection, flip them.
            const negativeValueCount: number = this.calcNumNegativeValues(arr);
            const firstNegativeValue: number = arr.length - negativeValueCount;
            const positiveValues: Float64Array = arr.slice(0, firstNegativeValue);
            if (firstNegativeValue !== 0) arr.copyWithin(0, firstNegativeValue, arr.length);
            if (negativeValueCount > 1) arr.subarray(0, negativeValueCount).reverse();
            arr.set(positiveValues, negativeValueCount);
            return Array.from(arr);
        } else {
            arr = Array.from(this);
            if (arr.length < 2) return arr;
            return arr;
        }
    }

    /**
     * Moves the content of this set into another and clears this set.
     */
    tee(): NumberSet {
        const ret = new NumberSet();
        ret.transferFrom(this);
        ret.knownNumNegativeValues = this.knownNumNegativeValues;
        this.clear();
        return ret;
    }

}
