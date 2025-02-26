import { LinearAuth } from "../auth";
import { LinearGraphQLClient } from "../graphql/client";
import {
  CreateIssueInput,
  UpdateIssueInput,
} from "../features/issues/types/issue.types";
import { ProjectInput } from "../features/projects/types/project.types";

// Store created issue IDs for cleanup
const createdIssueIds: string[] = [];
let linearClient: LinearGraphQLClient;
let teamId: string | undefined;
let projectId: string | undefined;
let canRunIssueAndProjectTests = false;

// Set up test environment before running the tests
beforeAll(() => {
  // Get environment variables directly or from env setup
  const LINEAR_ACCESS_TOKEN = process.env.LINEAR_ACCESS_TOKEN;
  teamId = process.env.TEAMID;
  projectId = process.env.PROJECTID;

  if (!LINEAR_ACCESS_TOKEN) {
    console.error("Error: API token not found in environment variables");
    process.exit(1);
  }

  // Check if we can run project and issue tests
  canRunIssueAndProjectTests = Boolean(teamId && projectId);

  if (!canRunIssueAndProjectTests) {
    console.warn(
      "Warning: teamId or projectId not provided. Project and Issue tests will be skipped.",
    );
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
    console.log(`Cleaned up ${createdIssueIds.length} test issues`);
  }
});

describe("Linear API Client", () => {
  describe("Authentication and User Information", () => {
    test("should get current user information", async () => {
      const result = await linearClient.getCurrentUser();

      expect(result).toBeDefined();
      expect(result.viewer).toBeDefined();
      expect(result.viewer.name).toBeDefined();
      expect(result.viewer.email).toBeDefined();
    });

    test("should get teams information", async () => {
      const result = await linearClient.getTeams();

      expect(result).toBeDefined();
      expect(result.teams).toBeDefined();
      expect(result.teams.nodes).toBeInstanceOf(Array);
      expect(result.teams.nodes.length).toBeGreaterThan(0);
    });
  });

  // Conditionally run Project Operations tests
  (canRunIssueAndProjectTests ? describe : describe.skip)(
    "Project Operations",
    () => {
      let testProjectId: string;
      let testProjectName: string;

      test("should create a new project", async () => {
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

      test("should get project information", async () => {
        const result = await linearClient.getProject(testProjectId);

        expect(result).toBeDefined();
        expect(result.project).toBeDefined();
        expect(result.project.name).toBe(testProjectName);
        expect(result.project.description).toBeDefined();
      });

      test("should search for projects by name", async () => {
        const result = await linearClient.searchProjects({
          name: { eq: testProjectName },
        });

        expect(result).toBeDefined();
        expect(result.projects).toBeDefined();
        expect(result.projects.nodes).toBeInstanceOf(Array);
        expect(result.projects.nodes.length).toBeGreaterThan(0);
        expect(result.projects.nodes[0].name).toBe(testProjectName);
      });
    },
  );

  // Conditionally run Issue Operations tests
  (canRunIssueAndProjectTests ? describe : describe.skip)(
    "Issue Operations",
    () => {
      let singleIssueId: string;
      let bulkIssueIds: string[] = [];

      test("should create a single issue", async () => {
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

      test("should create multiple issues in bulk", async () => {
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
        expect(result.issueBatchCreate.issues).toBeInstanceOf(Array);
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

      test("should update a single issue", async () => {
        const updateInput: UpdateIssueInput = {
          title: `Updated title at ${new Date().toISOString()}`,
          description: "This description was updated by Jest tests",
          priority: 4,
        };

        const result = await linearClient.updateIssue(
          singleIssueId,
          updateInput,
        );

        expect(result.issueUpdate.success).toBe(true);
        expect(result.issueUpdate.issue).toBeDefined();
        // @ts-ignore: Object is possibly 'null' or 'undefined'
        expect(result.issueUpdate.issue.title).toBe(updateInput.title);
      });

      test("should update multiple issues in bulk", async () => {
        const updateInput = {
          priority: 2,
          description: `Bulk updated at ${new Date().toISOString()}`,
        };

        const result = await linearClient.updateIssues(
          bulkIssueIds,
          updateInput,
        );

        expect(result.issueBatchUpdate.success).toBe(true);
        expect(result.issueBatchUpdate.issues).toBeInstanceOf(Array);
        expect(result.issueBatchUpdate.issues.length).toBe(bulkIssueIds.length);
      });

      test("should search for issues in a project", async () => {
        const result = await linearClient.searchIssues(
          { project: { id: { eq: projectId } } },
          10,
          undefined,
          "createdAt",
        );

        expect(result).toBeDefined();
        expect(result.issues).toBeDefined();
        expect(result.issues.nodes).toBeInstanceOf(Array);
        expect(result.issues.pageInfo).toBeDefined();
      });

      test("should delete an issue", async () => {
        // Take one issue ID from our created issues for deletion test
        const issueIdToDelete = createdIssueIds.pop();

        if (issueIdToDelete) {
          const result = await linearClient.deleteIssue(issueIdToDelete);

          expect(result.issueDelete.success).toBe(true);
        } else {
          fail("No issue IDs available for deletion test");
        }
      });
    },
  );
});
