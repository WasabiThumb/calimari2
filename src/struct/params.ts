
/**
 * Options for the Calimari parser
 */
export type CalimariParserOptions = {
    /**
     * If set, all numbers must be greater than or equal to this value.
     */
    minValue?: number,
    /**
     * If set, all numbers must be less than or equal to this value.
     */
    maxValue?: number,
    /**
     * If set to true, only whole numbers are allowed. Decimal points will generate errors and associated values will
     * become truncated.
     */
    onlyWhole?: boolean
};

/**
 * Basic options for Calimari
 */
type CalimariBasicOptions = CalimariParserOptions & {
    /**
     * If set to true, Calimari will throw instead of returning partial results when a parsing error is encountered.
     * Otherwise, parsing errors are accessible from the {@link CalimariResultMeta result meta}.
     */
    strict?: boolean,
    /**
     * The character sequence that separates groups. Default is "||" (double pipe). This is evaluated before all other
     * special characters, so in the case of collision the symbol will be interpreted as the group separator. If set to
     * an empty string, this effectively disables groups.
     */
    groupSeparator?: RegExp | string
};

type CalimariAllGroupsOptions = CalimariBasicOptions & {
    allGroups?: true
};

type CalimariOneGroupOptions = CalimariBasicOptions & {
    allGroups: false
};

/**
 * Options for Calimari. If ``allGroups`` is unset or true, the function returns a 2D array containing all groups. If
 *  ``allGroups`` is false, the function returns a 1D array containing the union of all groups. See
 *  {@link CalimariBasicOptions here} for more options.
 */
export type CalimariOptions = CalimariAllGroupsOptions | CalimariOneGroupOptions;

/**
 * A parsing error type.
 * @see CalimariParseError
 */
export enum CalimariParseErrorType {
    /**
     * No error.
     */
    OK,
    /**
     * The arguments to the parser are malformed.
     */
    BAD_CONFIG,
    /**
     * The input to the parser is inconsistent in some way; e.g. a closure was opened with "(" but not closed with
     * ")", a range was started with "-" but no upper bound was given, etc.
     */
    BAD_FORMAT,
    /**
     * The parser expected a number, but the number was malformed or does not conform to configured restrictions.
     */
    BAD_VALUE,
    /**
     * The parser expected a symbol, but the symbol was not recognized. For instance "5 6" would throw BAD_SYMBOL since
     * a comma is expected. After generating the error, it will be treated as if a comma were present.
     */
    BAD_SYMBOL,
}

/**
 * A parse error.
 */
export type CalimariParseError = {
    /**
     * Type (numerical code) of the error
     */
    type: CalimariParseErrorType,
    /**
     * Group where the error was generated
     */
    group: number,
    /**
     * Location (offset into the input string) where the error was generated
     */
    location: number,
    /**
     * Detail message of the error
     */
    message: string
};

/**
 * Extra data (such as parsing logs) that is applied to the result.
 */
export type CalimariResultMeta = {
    /**
     * Errors that were generated while parsing the input. If there are no errors,
     * this property will not be set. Hence, the truthiness of this field can be
     * used to quickly identify whether one or more errors exist.
     */
    errors?: CalimariParseError[]
};

/**
 * A 2D array containing all groups.
 */
type CalimariAllGroupsResult = number[][] & CalimariResultMeta;

/**
 * A 1D array containing the union of all groups.
 */
type CalimariOneGroupResult = number[] & CalimariResultMeta;

/**
 * The result of the call to Calimari, depending on whether the passed options has ``allGroups`` set to false.
 */
export type CalimariResult<O extends CalimariOptions> = O extends CalimariOneGroupOptions ? CalimariOneGroupResult : CalimariAllGroupsResult;
