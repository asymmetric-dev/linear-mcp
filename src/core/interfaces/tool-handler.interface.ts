/**
 * Interface for handling MCP tool requests.
 * Each handler corresponds to a specific Linear API operation.
 */
export interface ToolHandler {
  // Authentication
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleAuth(args: any): Promise<BaseToolResponse>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleAuthCallback(args: any): Promise<BaseToolResponse>;

  // Issue Operations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleCreateIssue(args: any): Promise<BaseToolResponse>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleCreateIssues(args: any): Promise<BaseToolResponse>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleBulkUpdateIssues(args: any): Promise<BaseToolResponse>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleSearchIssues(args: any): Promise<BaseToolResponse>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleDeleteIssue(args: any): Promise<BaseToolResponse>;

  // Project Operations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleCreateProjectWithIssues(args: any): Promise<BaseToolResponse>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleGetProject(args: any): Promise<BaseToolResponse>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleSearchProjects(args: any): Promise<BaseToolResponse>;

  // Team Operations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleGetTeams(args: any): Promise<BaseToolResponse>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleGetStates(args: any): Promise<BaseToolResponse>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleGetLabels(args: any): Promise<BaseToolResponse>;

  // User Operations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleGetUser(args: any): Promise<BaseToolResponse>;
}

/**
 * Base response type for all tool handlers
 */
export interface BaseToolResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
}

/**
 * Error response for tool handlers
 */
export interface ErrorToolResponse extends BaseToolResponse {
  isError: true;
}
