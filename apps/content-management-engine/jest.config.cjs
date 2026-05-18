module.exports = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.ts", "!**/*.spec.ts", "!**/tests/**/utils.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^pino$": "<rootDir>/tests/mocks/pino.js",
    "^pino-pretty$": "<rootDir>/tests/mocks/pino-pretty.js",
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {
      useESM: true,
      tsconfig: "tsconfig.json",
      isolatedModules: true,
    }],
  },
  extensionsToTreatAsEsm: [".ts"],
};
