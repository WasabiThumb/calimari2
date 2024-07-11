import {CalimariParseError, CalimariParseErrorType, CalimariParserOptions, CalimariResultMeta} from "./params";
import {NumberSet} from "../collection/numberSet";
import {CharStream, isFloatChar} from "../util/string";

enum CalimariParserState {
    AWAITING_SYMBOL,
    AWAITING_NUMBER,
    AWAITING_RANGE_END
}

export class CalimariParser {

    private static BF_BY_MIN: number = 1; // If set on boundFlags; bound by min
    private static BF_BY_MAX: number = 2; // If set on boundFlags; bound by max
    private static BF_BY_DEC: number = 4; // If set on boundFlags; integers only
    private static SYM_RANGE_INDICATOR: number = 45; // Symbol that indicates a range is being constructed (-)
    private static SYM_UNION_INDICATOR: number = 44; // Symbol that indicates a union is being constructed (,)
    private static SYM_DIFF_INDICATOR: number = 94; // Symbol that indicates a difference is being constructed (^)
    private static SYM_CLOSURE_START_INDICATOR: number = 40; // Symbol that indicates a closure is starting (()
    private static SYM_CLOSURE_END_INDICATOR: number = 41; // Symbol that indicates a closure is ending ())

    //

    readonly errors: CalimariParseError[] = [];
    group: number = -1;

    private source: CharStream;
    private readonly boundFlags: number;
    private readonly bounds: [ number, number ];

    constructor(options: CalimariParserOptions) {
        this.source = CharStream.empty();
        let min: number = Number.MIN_SAFE_INTEGER;
        let max: number = Number.MAX_SAFE_INTEGER;
        let flags: number = 0;
        if (typeof options.minValue === "number") {
            min = options.minValue;
            flags |= CalimariParser.BF_BY_MIN;
        }
        if (typeof options.maxValue === "number") {
            max = options.maxValue;
            flags |= CalimariParser.BF_BY_MAX;
        }
        if (!!options.onlyWhole) {
            flags |= CalimariParser.BF_BY_DEC;
        }
        if (min > max) {
            this.throwError(`Invalid configured bounds (${min} -> ${max})`, CalimariParseErrorType.BAD_CONFIG);
        }

        this.boundFlags = flags;
        this.bounds = [ min, max ];
    }

    get meta(): CalimariResultMeta {
        let ret: CalimariResultMeta = { };
        if (this.errors.length > 0) ret.errors = this.errors;
        return ret;
    }

    parse(input: string, output: NumberSet): void {
        this.source = CharStream.of(input);
        this.parseClosure(output, 0);
    }

    private parseClosure(output: NumberSet, depth: number): void {
        const { source } = this;

        let state: CalimariParserState = CalimariParserState.AWAITING_NUMBER;
        let isDifference: boolean = false;
        let register: number = 0;
        let registerHoldsNumber: boolean = false;
        let isRangeEnd: boolean = false;

        while (source.hasNext()) {
            if (source.consumeWhitespace()) break;
            isRangeEnd = false;

            const earlyCheck: number = source.nextChar();
            source.reverse();
            if (earlyCheck === CalimariParser.SYM_CLOSURE_START_INDICATOR) {
                if (state === CalimariParserState.AWAITING_RANGE_END) {
                    registerHoldsNumber = false;
                    this.throwError("Cannot use closure as range end", CalimariParseErrorType.BAD_FORMAT);
                }
                state = CalimariParserState.AWAITING_SYMBOL;
            }

            // noinspection FallThroughInSwitchStatementJS
            switch (state) {
                case CalimariParserState.AWAITING_SYMBOL:
                    const symbol: number = source.nextChar();
                    switch (symbol) {
                        case CalimariParser.SYM_RANGE_INDICATOR:
                            if (!registerHoldsNumber) {
                                this.throwError("Range symbol without lower bound", CalimariParseErrorType.BAD_FORMAT);
                            }
                            state = CalimariParserState.AWAITING_RANGE_END;
                            break;
                        case CalimariParser.SYM_UNION_INDICATOR:
                            state = CalimariParserState.AWAITING_NUMBER;
                            break;
                        case CalimariParser.SYM_DIFF_INDICATOR:
                            if (registerHoldsNumber) {
                                output[isDifference ? "remove" : "add"](register);
                                registerHoldsNumber = false;
                            }
                            isDifference = !isDifference;
                            state = CalimariParserState.AWAITING_NUMBER;
                            break;
                        case CalimariParser.SYM_CLOSURE_START_INDICATOR:
                            const closure = new NumberSet();
                            this.parseClosure(closure, depth + 1);
                            for (let v of closure) {
                                output[isDifference ? "remove" : "add"](v);
                            }
                            break;
                        case CalimariParser.SYM_CLOSURE_END_INDICATOR:
                            if (depth === 0) {
                                this.throwError("Closure end without matching closure start", CalimariParseErrorType.BAD_FORMAT);
                                break;
                            }
                            if (registerHoldsNumber) output[isDifference ? "remove" : "add"](register);
                            return;
                        default:
                            if (isFloatChar(symbol)) {
                                source.reverse();
                                state = CalimariParserState.AWAITING_NUMBER;
                                this.throwError(
                                    `No comma separating numbers, continuing as if one were present`,
                                    CalimariParseErrorType.BAD_SYMBOL
                                );
                            } else {
                                this.throwError(
                                    `Unrecognized symbol: ${String.fromCodePoint(symbol)}`,
                                    CalimariParseErrorType.BAD_SYMBOL
                                )
                            }
                            break;
                    }
                    break;
                case CalimariParserState.AWAITING_RANGE_END:
                    isRangeEnd = true;
                case CalimariParserState.AWAITING_NUMBER:
                    const numChars: string = source.consumeNumberChars();
                    const num: number = this.assertInBoundsNumber(numChars);
                    state = CalimariParserState.AWAITING_SYMBOL;
                    if (isNaN(num)) break;
                    if (isRangeEnd) {
                        if (register > num) {
                            this.throwError(`Invalid range (${register} - ${num})`, CalimariParseErrorType.BAD_VALUE);
                            break;
                        }
                        for (let i=register; i <= num; i++) output[isDifference ? "remove" : "add"](i);
                        registerHoldsNumber = false;
                    } else {
                        if (registerHoldsNumber) output[isDifference ? "remove" : "add"](register);
                        register = num;
                        registerHoldsNumber = true;
                    }
                    break;
            }
        }

        if (registerHoldsNumber) output[isDifference ? "remove" : "add"](register);
        if (state !== CalimariParserState.AWAITING_SYMBOL) {
            this.throwError("Expected a number", CalimariParseErrorType.BAD_FORMAT);
        }
        if (depth !== 0) this.throwError("Expected ending closure symbol", CalimariParseErrorType.BAD_FORMAT);
    }

    //

    private assertInBoundsNumber(value: string): number {
        let num: number = value.length === 0 ? NaN : parseFloat(value);
        if (isNaN(num)) {
            this.throwError(`Expected a number, got non-number value`, CalimariParseErrorType.BAD_VALUE);
            return num;
        }
        if (this.boundFlags & CalimariParser.BF_BY_DEC) {
            const truncated = Math.trunc(num);
            if (num !== truncated) {
                this.throwError(`Value ${num} is not a whole number (truncated to ${truncated})`, CalimariParseErrorType.BAD_VALUE);
                num = truncated;
            }
        }
        if (!this.assertInBounds(num)) return NaN;
        return num;
    }

    private assertInBounds(value: number): boolean {
        if (this.boundFlags & CalimariParser.BF_BY_MIN) {
            if (value < this.bounds[0]) {
                this.throwError(`Value ${value} is less than min bound ${this.bounds[0]}`, CalimariParseErrorType.BAD_VALUE);
                return false;
            }
        }
        if (this.boundFlags & CalimariParser.BF_BY_MAX) {
            if (value > this.bounds[1]) {
                this.throwError(`Value ${value} is greater than max bound ${this.bounds[1]}`, CalimariParseErrorType.BAD_VALUE);
                return false;
            }
        }
        return true;
    }

    private throwError(message: string, type: CalimariParseErrorType): void {
        this.errors.push({
            type,
            group: this.group,
            location: Math.max(this.source.position, 0),
            message
        });
    }

}
