import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { config } from "dotenv";
import { LinearAuth } from "../auth";
import {
  CreateIssueInput,
  UpdateIssueInput,
} from "../features/issues/types/issue.types";
import { ProjectInput } from "../features/projects/types/project.types";
import { LinearGraphQLClient } from "../graphql/client";

// Load environment variables from .env file
config();

// Store created issue IDs for cleanup
const createdIssueIds: string[] = [];
let linearClient: LinearGraphQLClient;

// Get environment variables directly or from env setup
const LINEAR_ACCESS_TOKEN = process.env.LINEAR_ACCESS_TOKEN;
const teamId = process.env.TEAMID;
const projectId = process.env.PROJECTID;

// Check if we can run tests
const hasAuth = Boolean(LINEAR_ACCESS_TOKEN);
const hasTeamAndProject = Boolean(teamId && projectId);

// Only run tests if we have authentication
(hasAuth ? describe : describe.skip)("Linear API Client Integration", () => {
  beforeAll(() => {
    if (!LINEAR_ACCESS_TOKEN) {
      throw new Error("Error: API token not found in environment variables");
    }

    // Initialize Linear client
    const auth = new LinearAuth();
    auth.initialize({
      type: "pat",
      accessToken: LINEAR_ACCESS_TOKEN,
    });

    linearClient = new LinearGraphQLClient(auth.getClient());
  });

  // Clean up created resources after tests complete
  afterAll(async () => {
    // Delete test issues
    if (createdIssueIds.length > 0) {
      await Promise.all(
        createdIssueIds.map((id) => linearClient.deleteIssue(id)),
      );
    }
  });

  describe("Authentication and User Information", () => {
    it("should get current user information", async () => {
      const result = await linearClient.getCurrentUser();

      expect(result).toBeDefined();
      expect(result.viewer).toBeDefined();
      expect(result.viewer.name).toBeDefined();
      expect(result.viewer.email).toBeDefined();
    });

    it("should get teams information", async () => {
      const result = await linearClient.getTeams();

      expect(result).toBeDefined();
      expect(result.teams).toBeDefined();
      expect(Array.isArray(result.teams.nodes)).toBe(true);
      expect(result.teams.nodes.length).toBeGreaterThan(0);
    });
  });

  // Project Operations tests - only run if we have team and project IDs
  (hasTeamAndProject ? describe : describe.skip)("Project Operations", () => {
    let testProjectId: string;
    let testProjectName: string;

    it("should create a new project", async () => {
      testProjectName = `Test Project ${new Date().toISOString()}`;
      const projectInput: ProjectInput = {
        name: testProjectName,
        teamIds: [teamId!],
        description:
          "This is a test project created for Jest integration tests",
      };

      const result = await linearClient.createProject(projectInput);

      expect(result.projectCreate.success).toBe(true);
      expect(result.projectCreate.project).toBeDefined();
      expect(result.projectCreate.project.id).toBeDefined();
      expect(result.projectCreate.project.name).toBe(testProjectName);

      testProjectId = result.projectCreate.project.id;
    });

    it("should get project information", async () => {
      const result = await linearClient.getProject(testProjectId);

      expect(result).toBeDefined();
      expect(result.project).toBeDefined();
      expect(result.project.name).toBe(testProjectName);
      expect(result.project.description).toBeDefined();
    });

    it("should search for projects by name", async () => {
      const result = await linearClient.searchProjects({
        name: { eq: testProjectName },
      });

      expect(result).toBeDefined();
      expect(result.projects).toBeDefined();
      expect(Array.isArray(result.projects.nodes)).toBe(true);
      expect(result.projects.nodes.length).toBeGreaterThan(0);
      expect(result.projects.nodes[0].name).toBe(testProjectName);
    });
  });

  // Issue Operations tests - only run if we have team and project IDs
  (hasTeamAndProject ? describe : describe.skip)("Issue Operations", () => {
    let singleIssueId: string;
    let bulkIssueIds: string[] = [];

    it("should create a single issue", async () => {
      const issueInput: CreateIssueInput = {
        title: `Test issue created at ${new Date().toISOString()}`,
        description: "This is a test issue created by Jest integration tests",
        teamId: teamId!,
        projectId: projectId!,
        priority: 2,
      };

      const result = await linearClient.createIssue(issueInput);

      expect(result.issueCreate.success).toBe(true);
      expect(result.issueCreate.issue).toBeDefined();

      // @ts-ignore: Object is possibly 'null' or 'undefined'
      expect(result.issueCreate.issue.id).toBeDefined();
      // @ts-ignore: Object is possibly 'null' or 'undefined'
      expect(result.issueCreate.issue.identifier).toBeDefined();
      // @ts-ignore: Object is possibly 'null' or 'undefined'
      expect(result.issueCreate.issue.title).toBe(issueInput.title);

      // Non-null assertion operator tells TypeScript we know this isn't null
      singleIssueId = result.issueCreate.issue!.id;
      createdIssueIds.push(singleIssueId);
    });

    it("should create multiple issues in bulk", async () => {
      const bulkIssues = [
        {
          title: `Bulk test issue 1 (${new Date().toISOString()})`,
          description: "This is bulk test issue 1",
          teamId: teamId!,
          projectId: projectId!,
          priority: 1,
        },
        {
          title: `Bulk test issue 2 (${new Date().toISOString()})`,
          description: "This is bulk test issue 2",
          teamId: teamId!,
          projectId: projectId!,
          priority: 3,
        },
      ];

      const result = await linearClient.createIssues(bulkIssues);

      expect(result.issueBatchCreate.success).toBe(true);
      expect(Array.isArray(result.issueBatchCreate.issues)).toBe(true);
      expect(result.issueBatchCreate.issues.length).toBe(bulkIssues.length);

      // @ts-ignore: Object is possibly 'null' or 'undefined'
      result.issueBatchCreate.issues.forEach((issue, index) => {
        // @ts-ignore: Object is possibly 'null' or 'undefined'
        expect(issue.id).toBeDefined();
        // @ts-ignore: Object is possibly 'null' or 'undefined'
        expect(issue.title).toBe(bulkIssues[index].title);
        // @ts-ignore: Object is possibly 'null' or 'undefined'
        bulkIssueIds.push(issue.id);
        // @ts-ignore: Object is possibly 'null' or 'undefined'
        createdIssueIds.push(issue.id);
      });
    });

    it("should update a single issue", async () => {
      const updateInput: UpdateIssueInput = {
        title: `Updated title at ${new Date().toISOString()}`,
        description: "This description was updated by Jest tests",
        priority: 4,
      };

      const result = await linearClient.updateIssue(singleIssueId, updateInput);

      expect(result.issueUpdate.success).toBe(true);
      expect(result.issueUpdate.issue).toBeDefined();
      // @ts-ignore: Object is possibly 'null' or 'undefined'
      expect(result.issueUpdate.issue.title).toBe(updateInput.title);
    });

    it("should update multiple issues in bulk", async () => {
      const updateInput = {
        priority: 2,
        description: `Bulk updated at ${new Date().toISOString()}`,
      };

      const result = await linearClient.updateIssues(bulkIssueIds, updateInput);

      expect(result.issueBatchUpdate.success).toBe(true);
      expect(Array.isArray(result.issueBatchUpdate.issues)).toBe(true);
      expect(result.issueBatchUpdate.issues.length).toBe(bulkIssueIds.length);
    });

    it("should search for issues in a project", async () => {
      const result = await linearClient.searchIssues(
        { project: { id: { eq: projectId } } },
        10,
        undefined,
        "createdAt",
      );

      expect(result).toBeDefined();
      expect(result.issues).toBeDefined();
      expect(Array.isArray(result.issues.nodes)).toBe(true);
      expect(result.issues.pageInfo).toBeDefined();
    });

    it("should delete an issue", async () => {
      // Take one issue ID from our created issues for deletion test
      const issueIdToDelete = createdIssueIds.pop();

      if (issueIdToDelete) {
        const result = await linearClient.deleteIssue(issueIdToDelete);

        expect(result.issueDelete.success).toBe(true);
      } else {
        fail("No issue IDs available for deletion test");
      }
    });
  });
});
