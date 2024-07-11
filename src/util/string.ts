
// https://en.wikipedia.org/wiki/Whitespace_character
export function isWhitespaceChar(codepoint: number): boolean {
    if (codepoint === 0x0020) return true;
    if (codepoint < 0x2000) {
        if (0x0009 <= codepoint && codepoint <= 0x000D) return true;
        switch (codepoint) {
            case 0x0085:
            case 0x00A0:
            case 0x1680:
            case 0x180E:
                return true;
            default:
                return false;
        }
    }
    if (codepoint <= 0x200D) return true;
    switch (codepoint) {
        case 0x2028:
        case 0x2029:
        case 0x202F:
        case 0x205F:
        case 0x2060:
        case 0x3000:
            return true;
        default:
            return false;
    }
}

export function isFloatChar(c: number, noMinus: boolean = false): boolean {
    if (c < 45 || c > 57) return false;
    if (noMinus && c === 45) return false;
    return c !== 47;
}

/**
 * A class that simplifies reading characters one-by-one from a source
 */
export class CharStream {

    static empty(): CharStream {
        return new CharStream(0, () => 0);
    }

    static of(str: string): CharStream {
        return new CharStream(str.length, (i) => str.charCodeAt(i));
    }

    //

    private readonly length: number;
    private readonly accessor: (index: number) => number;
    private head: number = 0;
    private backable: number = 0;
    constructor(length: number, accessor: (index: number) => number) {
        this.length = length;
        this.accessor = accessor;
        this.head = 0;
    }

    /**
     * Gets the position of the stream into the input data
     */
    get position(): number {
        return this.head;
    }

    /**
     * Fully rewinds the stream to the start of the input
     */
    rewind(): void {
        this.head = 0;
    }

    /**
     * Reverses the previous call to {@link nextChar}. Invoking {@link reverse} multiple times in succession will not do anything.
     */
    reverse(): void {
        this.head -= this.backable;
        this.backable = 0;
    }

    /**
     * Returns true if chars remain between the stream's current position and the end of the data.
     */
    hasNext(): boolean {
        return this.head < this.length;
    }

    /**
     * Gets the character at the current position as a UTF-16 codepoint and advances the position by 1.
     * If called when {@link hasNext} would be false, this returns ``-1``.
     */
    nextChar(): number {
        if (this.head >= this.length) return -1;
        let char: number = this.accessor(this.head++);
        // Deal with surrogate pairs
        if (char >= 0xD800 && char <= 0xDFFF && this.head < this.length) {
            let lo: number = this.accessor(this.head++);
            char = ((char - 0xD800) << 10) + lo + 0x2400;
            this.backable = 2;
        } else {
            this.backable = 1;
        }
        return char;
    }

    /**
     * @return True if consuming whitespace has led us to the end of the stream
     */
    consumeWhitespace(): boolean {
        let c: number;
        while (this.hasNext()) {
            c = this.nextChar();
            if (!isWhitespaceChar(c)) {
                this.reverse();
                return false;
            }
        }
        return true;
    }

    /**
     * Consume characters that may appear in a number. The stream will be positioned after the
     * last number character consumed.
     */
    consumeNumberChars(): string {
        let codePoints: number[] = new Array(16);
        let size: number = 0;

        let c: number;
        while (this.hasNext()) {
            c = this.nextChar();
            if (isFloatChar(c, size !== 0)) {
                codePoints[size++] = c;
            } else {
                this.reverse();
                break;
            }
        }

        codePoints.length = size;
        return String.fromCodePoint.apply(null, codePoints) as unknown as string;
    }

}
