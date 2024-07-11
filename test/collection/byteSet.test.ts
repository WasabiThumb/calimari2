import { ByteSet } from "../../src/collection/byteSet";


class ByteSetTest {

    basic(): void {
        const bs = new ByteSet();

        for (let i=0; i < 256; i++) {
            if ((i & 3) === 3) {
                expect(bs.add(i)).toEqual(true);
            }
        }

        for (let i=0; i < 256; i++) {
            expect(bs.has(i)).toEqual((i & 3) === 3);
            expect(bs.remove(i)).toEqual((i & 3) === 3);
        }

        for (let i=0; i < 256; i++) {
            expect(bs.has(i)).toEqual(false);
        }
    }

    random(): void {
        const bs = new ByteSet();

        const SKIP: symbol = Symbol();
        function addRandom(): number | symbol {
            const rand: number = Math.floor(Math.random() * 256);
            const has: boolean = bs.has(rand);
            expect(bs.add(rand)).toEqual(!has);
            return has ? SKIP : rand;
        }

        const added: (number | symbol)[] = new Array(20);
        for (let i=0; i < 20; i++) added[i] = addRandom();
        added.sort((a, b) => {
            if (a === SKIP) {
                return (b === SKIP ? 0 : -1);
            } else if (b === SKIP) {
                return 1;
            }
            return (a as number) - (b as number);
        });

        const collected: number[] = Array.from(bs);
        let head: number = 0;
        let value: number | symbol;
        for (let i=0; i < 20; i++) {
            value = added[i];
            if (value === SKIP) continue;
            expect(collected[head++]).toEqual(value as number);
        }

        expect(collected.length).toEqual(head);
    }

    iterator(): void {
        const bs = new ByteSet();
        const testValues = [ 0x00, 0x20, 0x60, 0x70, 0xA0, 0xA2 ];

        for (let i=testValues.length - 1; i >= 0; i--) {
            bs.add(testValues[i]);
        }

        let count: number = 0;
        for (let value of bs.iterator()) {
            expect(value).toEqual(testValues[count++]);
        }
        expect(count).toEqual(testValues.length);
    }

    union(): void {
        const a = new ByteSet();
        a.add(0x11);
        a.add(0x22);
        a.add(0x33);

        const b = new ByteSet();
        b.add(0xAA);
        b.add(0xBB);
        b.add(0xCC);

        const union = ByteSet.union([ a, b ]);

        const collected: number[] = Array.from(union);
        const expected: number[] = [ 0x11, 0x22, 0x33, 0xAA, 0xBB, 0xCC ];
        expect(collected.length).toEqual(expected.length);

        for (let i=0; i < collected.length; i++)
            expect(collected[i]).toEqual(expected[i]);
    }

    fill(): void {
        const bs = new ByteSet();

        bs.fill();
        for (let i=0; i < 256; i++) expect(bs.has(i)).toEqual(true);

        bs.clear();
        for (let i=0; i < 256; i++) expect(bs.has(i)).toEqual(false);
    }

}

//

describe("ByteSet", () => {

    const instance = new ByteSetTest();
    test("basic", () => instance.basic());
    test("random", () => instance.random());
    test("iterator", () => instance.iterator());
    test("union", () => instance.union());
    test("fill", () => instance.fill());

});
