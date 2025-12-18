module.exports = {
  // Use babel-jest to transform JS/TS/JSX files
  transform: {
    '^.+\\.[tj]sx?$': 'babel-jest',
  },
  transformIgnorePatterns: ['/node_modules/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/frontend/src/$1',
    '^@components/(.*)$': '<rootDir>/frontend/src/components/$1',
    '^@hooks/(.*)$': '<rootDir>/frontend/src/hooks/$1',
    '^@utils/(.*)$': '<rootDir>/frontend/src/utils/$1',
    '^@services/(.*)$': '<rootDir>/frontend/src/services/$1'
  },
  // Keep default testMatch (discover tests across workspace)
  moduleFileExtensions: ['js','jsx','ts','tsx','json','node'],
  setupFilesAfterEnv: ['<rootDir>/frontend/jest.setup.js'],
};