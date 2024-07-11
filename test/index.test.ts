import toml from "toml";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import calimari = require("../src");
import {CalimariOptions, CalimariParseErrorType} from "../src/struct/params";

type SingleGroupTestCase = { in: string, out: number[][] };
type MultiGroupTestCase = { in: string, out: number[] };
type ErrorTestCase = { in: string, errors: string[] };
type TestCase = SingleGroupTestCase | MultiGroupTestCase | ErrorTestCase;
type TestCaseFile = {
    "multi-group": MultiGroupTestCase[],
    "single-group": SingleGroupTestCase[],
    "error": ErrorTestCase[]
};

function assert1DOutputsEqual(a: number[], b: number[]): void {
    for (let i=0; i < a.length; i++)
        expect(a[i]).toEqual(b[i]);
}

function assert2DOutputsEqual(a: number[][], b: number[][]): void {
    let aa: number[];
    let bb: number[];
    for (let i=0; i < a.length; i++) {
        aa = a[i];
        bb = b[i];
        expect(aa.length).toEqual(bb.length);
        assert1DOutputsEqual(aa, bb);
    }
}

function assertOutputsEqual(a: number[] | number[][], b: number[] | number[][]): void {
    expect(a.length).toEqual(b.length);

    let aFlat: boolean = (typeof a[0] === "number");
    let bFlat: boolean = (typeof b[0] === "number");
    expect(aFlat).toEqual(bFlat);
    for (let i=1; i < a.length; i++) {
        expect(typeof a[i]).toEqual(aFlat ? "number" : "object");
        expect(typeof b[i]).toEqual(aFlat ? "number" : "object");
    }

    if (aFlat) {
        assert1DOutputsEqual(a as number[], b as number[]);
    } else {
        assert2DOutputsEqual(a as number[][], b as number[][]);
    }
}

function executeTestCase(testCase: TestCase, options: CalimariOptions): void {
    const output = calimari(testCase.in, options);

    if ("out" in testCase) {
        assertOutputsEqual(output, testCase.out);
    } else {
        expect(output.errors).not.toBeUndefined();
        let errors: number = 0;
        for (let err of output.errors!) errors |= (1 << err.type);
        for (let err of testCase.errors) errors &= (~(1 << CalimariParseErrorType[err as "BAD_SYMBOL"]));
        expect(errors).toEqual(0);
    }
}

function executeTestCases(testCases: TestCase[], options: CalimariOptions = {}): void {
    for (let testCase of testCases) executeTestCase(testCase, options);
}

describe("calimari", () => {

    const TEST_CASE_FILE = fs.readFile(path.join(__dirname, "testCases.toml"), { encoding: "utf8" })
        .then<TestCaseFile>((data) => toml.parse(data) as unknown as TestCaseFile);

    test("multi-group", async () => {
        executeTestCases((await TEST_CASE_FILE)["multi-group"]);
    });

    test("single-group", async () => {
        executeTestCases((await TEST_CASE_FILE)["single-group"], { allGroups: false });
    });

    test("error", async () => {
        executeTestCases((await TEST_CASE_FILE)["error"]);
    });

});
