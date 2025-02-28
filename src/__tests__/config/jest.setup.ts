import { jest } from '@jest/globals';
// Type imports are used for type definitions but not as values
// import type { LinearClient } from '@linear/sdk';
// import type { LinearGraphQLClient } from '../../graphql/client';
import { config } from 'dotenv';
import { Label } from '../../features/teams/types/team.types';
import { Team } from '../../features/projects/types/project.types';

// Load environment variables from .env file
config();

/**
 * Approaches to fix TypeScript errors with Jest mocks:
 *
 * 1. Type Assertion for Mock Function [Failed]
 * - Define specific function signature type
 * - Use type assertion to match Jest's Mock type
 * - Error: Generic type 'Mock' requires between 0 and 1 type arguments
 *
 * 2. Custom Mock Type [Failed]
 * - Create interface extending LinearClient
 * - Use jest.MockInstance for specific method types
 * - Error: Namespace 'jest' has no exported member 'MockInstance'
 *
 * 3. Jest's Mocked Utility Type [Trying this approach]
 * - Use jest.Mocked to type the entire client
 * - Pick only needed properties
 *
 * 4. Simplified Mock Structure [Not tried yet]
 * - Minimal typing in setup
 * - Handle specific types in test files
 */

// Approach 3: Jest's Mocked Utility Type
// Client shape defined inline where used

// Create mock client factory function

const team: Team = { id: 'team-1', name: 'teamA' };
const label: Label = {
  id: 'label-1',
  name: 'Label One',
  team: team,
};
const agentLabelCache = new Map([['teamA', label]]);
const cache = {
  states: {},
  labels: {},
};

const createMockClient = () => ({
  client: {
    rawRequest: jest.fn().mockImplementation(async () => ({ data: {} })),
  },
  viewer: Promise.resolve({ id: 'test-user', name: 'Test User' }),
  _agentLabelCache: agentLabelCache,
  _cache: cache,
});

// Create mock constructor that creates new instances
const MockLinearClient = jest.fn(function (this: any) {
  return Object.assign(this, createMockClient());
});

// Mock the Linear SDK
jest.mock('@linear/sdk', () => ({
  LinearClient: MockLinearClient,
}));

// Export mock for use in tests
export const getMockLinearClient = () => new (MockLinearClient as any)();
