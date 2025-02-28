/**
 * @fileoverview Enhanced Linear GraphQL client wrapper that extends the standard Linear SDK
 * with caching, batching capabilities, and automatic label management.
 *
 * This fork of the original Linear SDK client adds additional functionality for working
 * with Linear's GraphQL API, making it easier to perform common operations on issues,
 * projects, teams, and labels.
 */

import { LinearClient } from '@linear/sdk';
import { DocumentNode } from 'graphql';
import {
  CreateIssueInput,
  CreateIssueResponse,
  DeleteIssueResponse,
  IssueBatchResponse,
  SearchIssuesInput,
  SearchIssuesResponse,
  UpdateIssueInput,
  UpdateIssueResponse,
  UpdateIssuesResponse,
} from '../features/issues/types/issue.types.js';
import {
  GetProjectResponse,
  ProjectInput,
  ProjectResponse,
  SearchProjectsResponse,
} from '../features/projects/types/project.types.js';
import {
  IssueLabelCreateInput,
  IssueLabelsResponse,
  Label,
  LabelResponse,
  TeamResponse,
  WorkflowStatesResponse,
} from '../features/teams/types/team.types.js';
import { UserResponse } from '../features/users/types/user.types.js';

const labelName = 'agent';

/**
 * Enhanced Linear GraphQL client that provides additional functionality
 * on top of the standard Linear SDK client.
 *
 * Features:
 * - Automatic label management (adds "agent" label to issues)
 * - Caching for frequently accessed data
 * - Batch operations
 * - Project and issue management
 */
export class LinearGraphQLClient {
  private linearClient: LinearClient;
  private agentLabelCache: Map<string, Label> = new Map();

  // Cache for getStates and getLabels
  private cache: {
    states?: { data: WorkflowStatesResponse; timestamp: number };
    labels?: { data: IssueLabelsResponse; timestamp: number };
  } = {};

  // Default cache expiration time (30 minutes in milliseconds)
  private cacheExpirationTime = 30 * 60 * 1000;

  /**
   * Creates a new LinearGraphQLClient instance
   *
   * @param linearClient - An initialized LinearClient from the Linear SDK
   */
  constructor(linearClient: LinearClient) {
    this.linearClient = linearClient;
  }

  /**
   * Executes a raw GraphQL operation using the provided document and variables
   *
   * @template T - The expected response type
   * @template V - The variables type, defaults to Record<string, unknown>
   * @param document - The GraphQL document (query or mutation)
   * @param variables - Optional variables to pass to the GraphQL operation
   * @returns Promise resolving to the operation result
   * @throws Error if the GraphQL operation fails
   */
  async execute<T, V extends Record<string, unknown> = Record<string, unknown>>(
    document: DocumentNode,
    variables?: V
  ): Promise<T> {
    const graphQLClient = this.linearClient.client;
    try {
      const response = await graphQLClient.rawRequest(document.loc?.source.body || '', variables);
      return response.data as T;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`GraphQL operation failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Creates a new issue label
   *
   * @param label - The label creation input
   * @returns Promise resolving to the label creation response
   */
  async createIssueLabel(label: IssueLabelCreateInput): Promise<LabelResponse> {
    const { CREATE_ISSUE_LABELS } = await import('./mutations.js');
    return this.execute<LabelResponse>(CREATE_ISSUE_LABELS, { input: label });
  }

  /**
   * Creates or retrieves the "agent" label for a team
   * Uses caching to improve performance
   *
   * @param teamId - The ID of the team to create/get the label for
   * @param forceRefresh - Whether to bypass the cache and force a refresh
   * @returns Promise resolving to the Label object
   */
  async createOrGetAgentLabel(teamId: string, forceRefresh = false): Promise<Label> {
    if (!forceRefresh) {
      const cachedLabel = this.agentLabelCache.get(teamId);
      if (cachedLabel) {
        return cachedLabel;
      }
    }

    const labels = await this.getLabels(true);
    const label = labels.issueLabels.nodes.find((label) => label.name === labelName);

    if (label) {
      // Store in cache before returning
      this.agentLabelCache.set(teamId, label);
      return label;
    } else {
      const labelInput: IssueLabelCreateInput = {
        name: labelName,
        teamId,
        description: 'Automation',
      };
      const createdLabel = await this.createIssueLabel(labelInput);
      const newLabel = createdLabel.issueLabelCreate.issueLabel;

      // Store newly created label in cache
      this.agentLabelCache.set(teamId, newLabel);
      return newLabel;
    }
  }

  /**
   * Creates a single issue and automatically applies the "agent" label
   *
   * @param input - The issue creation input
   * @returns Promise resolving to the issue creation response
   */
  async createIssue(input: CreateIssueInput): Promise<CreateIssueResponse> {
    const label = await this.createOrGetAgentLabel(input.teamId, false);
    input.labelIds = [...(input.labelIds ?? []), label.id];
    const { CREATE_ISSUE_MUTATION } = await import('./mutations.js');
    return this.execute<CreateIssueResponse>(CREATE_ISSUE_MUTATION, { input: input });
  }

  /**
   * Creates multiple issues in a batch operation
   * Automatically applies the "agent" label to all issues
   *
   * @param issues - Array of issue creation inputs
   * @returns Promise resolving to the batch creation response
   */
  async createIssues(issues: CreateIssueInput[]): Promise<IssueBatchResponse> {
    await Promise.all(
      issues.map(async (issue) => {
        const label = await this.createOrGetAgentLabel(issue.teamId, false);
        issue.labelIds = [...(issue.labelIds ?? []), label.id];
      })
    );
    const { CREATE_BATCH_ISSUES } = await import('./mutations.js');
    return this.execute<IssueBatchResponse>(CREATE_BATCH_ISSUES, {
      input: { issues },
    });
  }

  /**
   * Creates a new project
   *
   * @param input - The project creation input
   * @returns Promise resolving to the project creation response
   */
  async createProject(input: ProjectInput): Promise<ProjectResponse> {
    const { CREATE_PROJECT } = await import('./mutations.js');
    return this.execute<ProjectResponse>(CREATE_PROJECT, { input });
  }

  /**
   * Creates multiple issues in a batch operation
   *
   * @param issues - Array of issue creation inputs
   * @returns Promise resolving to the batch creation response
   */
  async createBatchIssues(issues: CreateIssueInput[]): Promise<IssueBatchResponse> {
    const { CREATE_BATCH_ISSUES } = await import('./mutations.js');
    return this.execute<IssueBatchResponse>(CREATE_BATCH_ISSUES, {
      input: { issues },
    });
  }

  /**
   * Creates a project and its associated issues in one operation
   *
   * @param projectInput - The project creation input
   * @param issues - Array of issue creation inputs to associate with the project
   * @returns Promise resolving to the combined project and issues creation response
   * @throws Error if project or issues creation fails
   */
  async createProjectWithIssues(
    projectInput: ProjectInput,
    issues: CreateIssueInput[]
  ): Promise<ProjectResponse> {
    const projectResult = await this.createProject(projectInput);

    if (!projectResult.projectCreate.success) {
      throw new Error('Failed to create project');
    }

    const issuesWithProject = issues.map((issue) => ({
      ...issue,
      projectId: projectResult.projectCreate.project.id,
    }));

    const issuesResult = await this.createBatchIssues(issuesWithProject);

    if (!issuesResult.issueBatchCreate.success) {
      throw new Error('Failed to create issues');
    }

    return {
      projectCreate: projectResult.projectCreate,
      issueBatchCreate: issuesResult.issueBatchCreate,
    };
  }

  /**
   * Updates a single issue by ID
   *
   * @param id - The ID of the issue to update
   * @param input - The issue update input
   * @returns Promise resolving to the issue update response
   */
  async updateIssue(id: string, input: UpdateIssueInput): Promise<UpdateIssueResponse> {
    const { UPDATE_ISSUES_MUTATION } = await import('./mutations.js');
    return this.execute<UpdateIssueResponse>(UPDATE_ISSUES_MUTATION, {
      id,
      input,
    });
  }

  /**
   * Updates multiple issues in a batch operation
   *
   * @param ids - Array of issue IDs to update
   * @param input - The issue update input to apply to all issues
   * @returns Promise resolving to the batch update response
   */
  async updateIssues(ids: string[], input: UpdateIssueInput): Promise<UpdateIssuesResponse> {
    const { UPDATE_BATCH_ISSUES_MUTATION } = await import('./mutations.js');
    return this.execute<UpdateIssuesResponse>(UPDATE_BATCH_ISSUES_MUTATION, { ids, input });
  }

  /**
   * Searches for issues based on various criteria with pagination support
   *
   * @param args - The search criteria
   * @param first - Number of results to return (default: 50)
   * @param after - Cursor for pagination
   * @param orderBy - Field to order results by (default: 'updatedAt')
   * @returns Promise resolving to the search response
   */
  async searchIssues(
    args: SearchIssuesInput,
    first = 50,
    after?: string,
    orderBy = 'updatedAt'
  ): Promise<SearchIssuesResponse> {
    const filter: Record<string, unknown> = {};

    if (args.query) {
      filter.search = args.query;
    }
    if (args.ids) {
      filter.id = { in: args.ids };
    }
    if (args.projectId) {
      filter.project = { id: { eq: args.projectId } };
    }
    if (args.teamIds) {
      filter.team = { id: { in: args.teamIds } };
    }
    if (args.assigneeIds) {
      filter.assignee = { id: { in: args.assigneeIds } };
    }
    if (args.stateIds) {
      filter.state = { id: { in: args.stateIds } };
    }
    if (args.labelIds) {
      filter.labels = { id: { in: args.labelIds } };
    }
    if (typeof args.priority === 'number') {
      filter.priority = { eq: args.priority };
    }

    const { SEARCH_ISSUES_QUERY } = await import('./queries.js');
    return this.execute<SearchIssuesResponse>(SEARCH_ISSUES_QUERY, {
      filter,
      first,
      after,
      orderBy,
    });
  }

  /**
   * Gets all teams with their associated states and labels
   *
   * @returns Promise resolving to the teams response
   */
  async getTeams(): Promise<TeamResponse> {
    const { GET_TEAMS_QUERY } = await import('./queries.js');
    return this.execute<TeamResponse>(GET_TEAMS_QUERY);
  }

  /**
   * Gets all workflow states with caching
   *
   * @param forceRefresh - Whether to bypass the cache and force a refresh
   * @returns Promise resolving to the workflow states response
   */
  async getStates(forceRefresh = false): Promise<WorkflowStatesResponse> {
    const cachedData = this.cache.states;
    const now = Date.now();

    if (!forceRefresh && cachedData && now - cachedData.timestamp < this.cacheExpirationTime) {
      return cachedData.data;
    }

    const { GET_WORKFLOW_STATES_QUERY } = await import('./queries.js');
    const data = await this.execute<WorkflowStatesResponse>(GET_WORKFLOW_STATES_QUERY);

    this.cache.states = { data, timestamp: now };

    return data;
  }

  /**
   * Gets all issue labels with caching
   *
   * @param forceRefresh - Whether to bypass the cache and force a refresh
   * @returns Promise resolving to the issue labels response
   */
  async getLabels(forceRefresh = false): Promise<IssueLabelsResponse> {
    const cachedData = this.cache.labels;
    const now = Date.now();

    if (!forceRefresh && cachedData && now - cachedData.timestamp < this.cacheExpirationTime) {
      return cachedData.data;
    }

    const { GET_ISSUE_LABELS_QUERY } = await import('./queries.js');
    const data = await this.execute<IssueLabelsResponse>(GET_ISSUE_LABELS_QUERY);

    this.cache.labels = { data, timestamp: now };

    return data;
  }

  /**
   * Gets information about the current authenticated user
   *
   * @returns Promise resolving to the user response
   */
  async getCurrentUser(): Promise<UserResponse> {
    const { GET_USER_QUERY } = await import('./queries.js');
    return this.execute<UserResponse>(GET_USER_QUERY);
  }

  /**
   * Gets information about a project by ID
   *
   * @param id - The ID of the project to retrieve
   * @returns Promise resolving to the project response
   */
  async getProject(id: string): Promise<GetProjectResponse> {
    const { GET_PROJECT_QUERY } = await import('./queries.js');
    return this.execute<GetProjectResponse>(GET_PROJECT_QUERY, { id });
  }

  /**
   * Searches for projects by term
   *
   * @param term - The search term
   * @returns Promise resolving to the search results
   */
  async searchProjects(term: string): Promise<SearchProjectsResponse> {
    const { SEARCH_PROJECTS_QUERY } = await import('./queries.js');
    return this.execute<SearchProjectsResponse>(SEARCH_PROJECTS_QUERY, { term });
  }

  /**
   * Deletes a single issue by ID
   *
   * @param id - The ID of the issue to delete
   * @returns Promise resolving to the deletion response
   */
  async deleteIssue(id: string): Promise<DeleteIssueResponse> {
    const { DELETE_ISSUES_MUTATION } = await import('./mutations.js');
    return this.execute<DeleteIssueResponse>(DELETE_ISSUES_MUTATION, { id });
  }
}
