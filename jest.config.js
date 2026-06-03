module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^../db/database$': '<rootDir>/src/stores/__mocks__/database.ts',
    '^../../db/database$': '<rootDir>/src/stores/__mocks__/database.ts',
    '^../data/tournamentSeeds$': '<rootDir>/src/stores/__mocks__/tournamentSeeds.ts',
    '^../../data/tournamentSeeds$': '<rootDir>/src/stores/__mocks__/tournamentSeeds.ts',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { strict: false } }],
  },
}
