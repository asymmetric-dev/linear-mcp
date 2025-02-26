/**
 * Project operation types
 * These types define the structure for project-related operations in Linear
 */

/**
 * Input for creating a new project
 * @example
 * ```typescript
 * const projectInput: ProjectInput = {
 *   name: "Q1 Planning",
 *   description: "Q1 2025 Planning Project",
 *   teamIds: ["team-id-1", "team-id-2"], // Required: Array of team IDs this project belongs to
 *   state: "started" // Optional: Project state
 * };
 * ```
 */
export interface ProjectInput {
  /** The name of the project */
  name: string;

  /** Optional description of the project */
  description?: string;

  /**
   * Array of team IDs this project belongs to
   * @required
   * Note: Linear API requires teamIds (array) not teamId (single value)
   */
  teamIds: string[];

  /** Optional project state */
  state?: string;
}

export interface Team {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  url: string;
  teams: { nodes: Team[] };
}

export interface GetProjectResponse {
  project: {
    id: string;
    name: string;
    description: string;
    url: string;
    teams: { nodes: Team[] };
  };
}

export interface ProjectResponse {
  projectCreate: {
    success: boolean;
    project: Project;
    lastSyncId: number;
  };
  issueBatchCreate?: {
    success: boolean;
    issues: Array<{
      id: string;
      identifier: string;
      title: string;
      url: string;
    }>;
    lastSyncId: number;
  };
}

export interface SearchProjectsResponse {
  projects: {
    nodes: Array<Project>;
  };
}
