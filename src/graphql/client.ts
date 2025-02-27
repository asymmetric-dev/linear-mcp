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
  IssueLabelResponse,
  IssueLabelsResponse,
  Label,
  LabelInput,
  LabelResponse,
  TeamResponse,
  WorkflowStatesResponse,
} from '../features/teams/types/team.types.js';
import { UserResponse } from '../features/users/types/user.types.js';

const labelName = 'agent';

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

  constructor(linearClient: LinearClient) {
    this.linearClient = linearClient;
  }

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

  // Create label
  async createIssueLabel(label: LabelInput): Promise<LabelResponse> {
    const { CREATE_ISSUE_LABELS } = await import('./mutations.js');
    return this.execute<LabelResponse>(CREATE_ISSUE_LABELS, { label });
  }

  // create or get agent label with caching
  async createOrGetAgentLabel(teamId: string): Promise<Label> {
    const cachedLabel = this.agentLabelCache.get(teamId);
    if (cachedLabel) {
      return cachedLabel;
    }

    // If not in cache, do the original logic
    const labels = await this.getLabels(true);
    const label = labels.issueLabels.nodes.find((label) => label.name === labelName);

    if (label) {
      // Store in cache before returning
      this.agentLabelCache.set(teamId, label);
      return label;
    } else {
      const labelInput: LabelInput = {
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

  // Create single issue
  async createIssue(input: CreateIssueInput): Promise<CreateIssueResponse> {
    const label = await this.createOrGetAgentLabel(input.teamId);
    input.labelIds = [...(input.labelIds ?? []), label.id];
    const { CREATE_ISSUE_MUTATION } = await import('./mutations.js');
    return this.execute<CreateIssueResponse>(CREATE_ISSUE_MUTATION, { input: input });
  }

  // Create multiple issues
  async createIssues(issues: CreateIssueInput[]): Promise<IssueBatchResponse> {
    await Promise.all(
      issues.map(async (issue) => {
        const label = await this.createOrGetAgentLabel(issue.teamId);
        issue.labelIds = [...(issue.labelIds ?? []), label.id];
      })
    );
    const { CREATE_BATCH_ISSUES } = await import('./mutations.js');
    return this.execute<IssueBatchResponse>(CREATE_BATCH_ISSUES, {
      input: { issues },
    });
  }

  // Create a project
  async createProject(input: ProjectInput): Promise<ProjectResponse> {
    const { CREATE_PROJECT } = await import('./mutations.js');
    return this.execute<ProjectResponse>(CREATE_PROJECT, { input });
  }

  // Create batch of issues
  async createBatchIssues(issues: CreateIssueInput[]): Promise<IssueBatchResponse> {
    const { CREATE_BATCH_ISSUES } = await import('./mutations.js');
    return this.execute<IssueBatchResponse>(CREATE_BATCH_ISSUES, {
      input: { issues },
    });
  }

  // Helper method to create a project with associated issues
  async createProjectWithIssues(
    projectInput: ProjectInput,
    issues: CreateIssueInput[]
  ): Promise<ProjectResponse> {
    // Create project first
    const projectResult = await this.createProject(projectInput);

    if (!projectResult.projectCreate.success) {
      throw new Error('Failed to create project');
    }

    // Then create issues with project ID
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

  // Update a single issue
  async updateIssue(id: string, input: UpdateIssueInput): Promise<UpdateIssueResponse> {
    const { UPDATE_ISSUES_MUTATION } = await import('./mutations.js');
    return this.execute<UpdateIssueResponse>(UPDATE_ISSUES_MUTATION, {
      id,
      input,
    });
  }

  // Bulk update issues
  async updateIssues(ids: string[], input: UpdateIssueInput): Promise<UpdateIssuesResponse> {
    const { UPDATE_BATCH_ISSUES_MUTATION } = await import('./mutations.js');
    return this.execute<UpdateIssuesResponse>(UPDATE_BATCH_ISSUES_MUTATION, { ids, input });
  }

  // Search issues with pagination
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

  // Get teams with their states and labels
  async getTeams(): Promise<TeamResponse> {
    const { GET_TEAMS_QUERY } = await import('./queries.js');
    return this.execute<TeamResponse>(GET_TEAMS_QUERY);
  }

  // Get states with caching
  async getStates(forceRefresh = false): Promise<WorkflowStatesResponse> {
    const cachedData = this.cache.states;
    const now = Date.now();

    // Use cache if available, not expired, and not forcing refresh
    if (!forceRefresh && cachedData && now - cachedData.timestamp < this.cacheExpirationTime) {
      return cachedData.data;
    }

    // Fetch fresh data
    const { GET_WORKFLOW_STATES_QUERY } = await import('./queries.js');
    const data = await this.execute<WorkflowStatesResponse>(GET_WORKFLOW_STATES_QUERY);

    // Update cache
    this.cache.states = { data, timestamp: now };

    return data;
  }

  // Get labels with caching
  async getLabels(forceRefresh = false): Promise<IssueLabelsResponse> {
    const cachedData = this.cache.labels;
    const now = Date.now();

    // Use cache if available, not expired, and not forcing refresh
    if (!forceRefresh && cachedData && now - cachedData.timestamp < this.cacheExpirationTime) {
      return cachedData.data;
    }

    // Fetch fresh data
    const { GET_ISSUE_LABELS_QUERY } = await import('./queries.js');
    const data = await this.execute<IssueLabelsResponse>(GET_ISSUE_LABELS_QUERY);

    // Update cache
    this.cache.labels = { data, timestamp: now };

    return data;
  }

  // Get current user info
  async getCurrentUser(): Promise<UserResponse> {
    const { GET_USER_QUERY } = await import('./queries.js');
    return this.execute<UserResponse>(GET_USER_QUERY);
  }

  // Get project info
  async getProject(id: string): Promise<GetProjectResponse> {
    const { GET_PROJECT_QUERY } = await import('./queries.js');
    return this.execute<GetProjectResponse>(GET_PROJECT_QUERY, { id });
  }

  // Search projects
  async searchProjects(filter: { name?: { eq: string } }): Promise<SearchProjectsResponse> {
    const { SEARCH_PROJECTS_QUERY } = await import('./queries.js');
    return this.execute<SearchProjectsResponse>(SEARCH_PROJECTS_QUERY, { filter });
  }

  // Delete a single issue
  async deleteIssue(id: string): Promise<DeleteIssueResponse> {
    const { DELETE_ISSUES_MUTATION } = await import('./mutations.js');
    return this.execute<DeleteIssueResponse>(DELETE_ISSUES_MUTATION, { id });
  }
}
