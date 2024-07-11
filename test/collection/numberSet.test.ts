import {NumberSet} from "../../src/collection/numberSet";


const BATCH_SIZE: number = 100;

class NumberSetTest {

    // Test that toArray returns sorted & without repeats when given positive ints
    positiveInts(): void {
        const values: number[] = new Array(BATCH_SIZE);
        for (let i=0; i < BATCH_SIZE; i++) values[i] = Math.trunc(Math.random() * 0x10000);
        this.withValues(values);
    }

    // Test that toArray returns sorted & without repeats when given positive fractions
    positiveFractions(): void {
        const values: number[] = new Array(BATCH_SIZE);
        for (let i=0; i < BATCH_SIZE; i++) values[i] = Math.random();
        this.withValues(values);
    }

    // Test that toArray returns sorted & without repeats when given negative ints
    negativeInts(): void {
        const values: number[] = new Array(BATCH_SIZE);
        for (let i=0; i < BATCH_SIZE; i++) values[i] = -Math.trunc(Math.random() * 0x10000);
        this.withValues(values);
    }

    // Test that toArray returns sorted & without repeats when given negative fractions
    negativeFractions(): void {
        const values: number[] = new Array(BATCH_SIZE);
        for (let i=0; i < BATCH_SIZE; i++) values[i] = -Math.random();
        this.withValues(values);
    }

    // Test that toArray returns sorted & without repeats when given positive and negative ints
    ints(): void {
        const values: number[] = new Array(BATCH_SIZE);
        for (let i=0; i < BATCH_SIZE; i++) values[i] = Math.trunc(Math.random() * 0x10000) - 0x8000;
        this.withValues(values);
    }

    // Test that toArray returns sorted & without repeats when given positive and negative fractions
    fractions(): void {
        const values: number[] = new Array(BATCH_SIZE);
        for (let i=0; i < BATCH_SIZE; i++) values[i] = (Math.random() * 5) - 2.5;
        this.withValues(values);
    }

    private withValues(values: number[]): void {
        const set = new NumberSet();
        for (let value of values)
            set.add(value);

        for (let value of values)
            expect(set.has(value)).toEqual(true);

        const expected: number[] = Array.from(new Set(values)).sort((a, b) => a - b);
        const received: number[] = set.toArray();

        expect(received.length).toEqual(expected.length);
        for (let i=0; i < received.length; i++) {
            expect(received[i]).toEqual(expected[i]);
        }

        set.clear();

        for (let value of values)
            expect(set.has(value)).toEqual(false);
    }

    // Test expected behavior for NaN: throw on add, return false on has/remove
    nan(): void {
        const set = new NumberSet();
        expect(() => set.add(NaN)).toThrow();
        expect(set.has(NaN)).toEqual(false);
        expect(set.remove(NaN)).toEqual(false);
    }

    // Test expected behavior for 0 and -0
    zeroes(): void {
        const set = new NumberSet();

        set.add(1 / Infinity);
        expect(set.has(0)).toEqual(true);
        expect(set.has(-0)).toEqual(true);

        set.clear();
        set.add(1 / -Infinity);
        expect(set.has(0)).toEqual(true);
        expect(set.has(-0)).toEqual(true);

        set.clear();
        expect(set.has(0)).toEqual(false);
        expect(set.has(-0)).toEqual(false);
    }

}

//

describe("NumberSet", () => {

    const instance = new NumberSetTest();
    test("positiveInts", () => instance.positiveInts());
    test("positiveFractions", () => instance.positiveFractions());
    test("negativeInts", () => instance.negativeInts());
    test("negativeFractions", () => instance.negativeFractions());
    test("ints", () => instance.ints());
    test("fractions", () => instance.fractions());
    test("nan", () => instance.nan());
    test("zeroes", () => instance.zeroes());

});
