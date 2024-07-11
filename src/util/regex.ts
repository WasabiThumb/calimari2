
type RegExpFlagKey = "hasIndices" | "global" | "ignoreCase" | "multiline"
    | "dotAll" | "unicode" | "unicodeSets" | "sticky";
type RegExpFlagChar = 100 | 103 | 105 | 109 | 115 | 117 | 118 | 121;
type RegExpFlagKeyCharPair = [ RegExpFlagChar, RegExpFlagKey ];
const RegExpFlagKeyCharPairs: RegExpFlagKeyCharPair[] = [
    [ 100, "hasIndices"  ], // d
    [ 103, "global"      ], // g
    [ 105, "ignoreCase"  ], // i
    [ 109, "multiline"   ], // m
    [ 115, "dotAll"      ], // s
    [ 117, "unicode"     ], // u
    [ 118, "unicodeSets" ], // v
    [ 121, "sticky"      ], // y
];
type RegExpFlagMap = { [key in RegExpFlagKey]?: boolean };

export namespace RegExpUtil {

    export function getFlags(map1: RegExpFlagMap, map2: RegExpFlagMap = {}): string {
        let ret: number[] = new Array(8);
        let char: RegExpFlagChar;
        let key: RegExpFlagKey;
        let count: number = 0;

        for (let i=0; i < 8; i++) {
            [ char, key ] = RegExpFlagKeyCharPairs[i];
            if (map1[key] || map2[key]) ret[count++] = char;
        }

        ret.length = count;
        return String.fromCharCode.apply(null, ret) as unknown as string;
    }

    export function escape(str: string): string {
        // https://stackoverflow.com/questions/3115150/how-to-escape-regular-expression-special-characters-using-javascript
        return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    }

    /**
     * Inserts a string or RegExp into the RegExp contained between ``pre`` and ``post``.
     */
    export function embed(pre: string, post: string, target: string | RegExp, flagOverrides: RegExpFlagMap = {}): RegExp {
        const targetIsRegex: boolean = (typeof target === "object");
        const flags: string = RegExpUtil.getFlags(targetIsRegex ? (target as RegExp) : {}, flagOverrides);
        const code: string = targetIsRegex ? (target as RegExp).source : escape(target as string);
        return new RegExp(pre + code + post, flags);
    }

}
