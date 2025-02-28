import { BaseHandler } from '../../../core/handlers/base.handler.js';
import { BaseToolResponse } from '../../../core/interfaces/tool-handler.interface.js';
import { LinearAuth } from '../../../auth.js';
import { LinearGraphQLClient } from '../../../graphql/client.js';

/**
 * Handler for team-related operations.
 * Manages retrieving team information, states, and labels.
 */
export class TeamHandler extends BaseHandler {
  constructor(auth: LinearAuth, graphqlClient?: LinearGraphQLClient) {
    super(auth, graphqlClient);
  }

  /**
   * Gets information about all teams, including their states and labels.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async handleGetTeams(_args: any): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      const result = await client.getTeams();
      return this.createJsonResponse(result);
    } catch (error) {
      this.handleError(error, 'get teams');
    }
  }

  /**
   * Gets information about all states, including the team information.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async handleGetStates(_args: any): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      const forceRefresh = typeof _args.forceRefresh === 'boolean' ? _args.forceRefresh : false;
      const result = await client.getStates(forceRefresh);
      return this.createJsonResponse(result);
    } catch (error) {
      this.handleError(error, 'get states');
    }
  }

  /**
   * Gets information about all labels, including the team information.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async handleGetLabels(_args: any): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      const forceRefresh = typeof _args.forceRefresh === 'boolean' ? _args.forceRefresh : false;
      const result = await client.getLabels(forceRefresh);
      return this.createJsonResponse(result);
    } catch (error) {
      this.handleError(error, 'get states');
    }
  }
}
