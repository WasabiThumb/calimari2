/*
   Copyright 2024 Wasabi Codes

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
 */

import {CalimariOptions, CalimariParseErrorType, CalimariResult} from "./struct/params";
import {RegExpUtil} from "./util/regex";
import {NumberSet} from "./collection/numberSet";
import {CalimariParser} from "./struct/parser";

type Calimari = <O extends CalimariOptions>(input: string, options?: O) => CalimariResult<O>;

/**
 * Parses number sets & ranges, e.g. ``1, 2, 3, 7-9 || 5``
 * @param input String containing the number set/range to parse
 * @param options Options
 * @return If {@link CalimariOptions.allGroups allGroups} is set to false, then this returns a 1D array containing
 * a union of all groups. Otherwise, this returns a 2D array containing all groups.
 */
const calimari: Calimari = function <O extends CalimariOptions>(
    input: string,
    options?: O
): CalimariResult<O> {
    const hasOptions: boolean = (!!options);
    const strict: boolean = hasOptions && (!!(options!.strict));

    let groupSeparator: RegExp = /\s*\|\|\s*/g;
    if (hasOptions) {
        let sep = options!.groupSeparator;
        if (sep === "") {
            groupSeparator = /^$/;
        } else if ((typeof sep === "string") || (typeof sep === "object" && sep.constructor.name === "RegExp")) {
            groupSeparator = RegExpUtil.embed(`\\s*`, `\\s*`, sep, { global: true });
        }
    }

    const groups = input.split(groupSeparator);
    let results: NumberSet[] = new Array(groups.length);

    const result = new NumberSet();
    const parser = new CalimariParser(hasOptions ? options! : {});
    for (let i=0; i < groups.length; i++) {
        parser.group = i;
        parser.parse(groups[i], result);
        results[i] = result.tee();
    }

    if (strict && parser.errors.length > 0) {
        let err: Error | null = null;
        for (let i=0; i < parser.errors.length; i++) {
            const errData = parser.errors[i];
            // @ts-ignore
            err = new Error(`(${CalimariParseErrorType[errData.type]}) ${errData.message} @ ${errData.group}:${errData.location}`, (i === 0) ? {} : { cause: err! });
        }
        // @ts-ignore
        throw new Error(`Parsing failed with ${parser.errors.length} error${parser.errors.length === 1 ? '' : 's'}`, { cause: err! });
    }

    let ret: number[] | number[][];
    if (hasOptions && options!.allGroups === false) {
        ret = NumberSet.union(results).toArray();
    } else {
        ret = new Array<number[]>(results.length);
        for (let i=0; i < results.length; i++) ret[i] = results[i].toArray();
    }

    return Object.assign(ret, parser.meta) as CalimariResult<O>;
}

export = calimari;
