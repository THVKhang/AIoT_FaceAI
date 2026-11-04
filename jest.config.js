const nextJest = require("next/jest");

// next/jest compiles ESM sources with SWC, so tests can import the real app modules.
const createJestConfig = nextJest({ dir: "./" });

module.exports = createJestConfig({
  testEnvironment: "node",
  testMatch: ["<rootDir>/__tests__/**/*.test.js"],
  clearMocks: true,
  modulePathIgnorePatterns: ["<rootDir>/.next/"],
});
