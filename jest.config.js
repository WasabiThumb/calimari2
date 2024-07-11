
/** @type {import('jest').Config} */
const config = {
    preset: "ts-jest",
    testEnvironment: "node",
    verbose: true,
    testRegex: "test\\/.*\\.test\\.tsx?$"
};

module.exports = config;
