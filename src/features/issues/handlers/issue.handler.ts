import { LinearAuth } from '../../../auth.js';
import { BaseHandler } from '../../../core/handlers/base.handler.js';
import { BaseToolResponse } from '../../../core/interfaces/tool-handler.interface.js';
import { LinearGraphQLClient } from '../../../graphql/client.js';
import {
  BulkUpdateIssuesInput,
  CreateIssueInput,
  CreateIssueResponse,
  CreateIssuesInput,
  DeleteIssueInput,
  DeleteIssueResponse,
  Issue,
  IssueBatchResponse,
  IssueHandlerMethods,
  SearchIssuesInput,
  SearchIssuesResponse,
  UpdateIssuesResponse,
} from '../types/issue.types.js';

/**
 * Handler for issue-related operations.
 * Manages creating, updating, searching, and deleting issues.
 */
export class IssueHandler extends BaseHandler implements IssueHandlerMethods {
  constructor(auth: LinearAuth, graphqlClient?: LinearGraphQLClient) {
    super(auth, graphqlClient);
  }

  /**
   * Creates a single issue.
   */
  async handleCreateIssue(args: CreateIssueInput): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ['title', 'description', 'teamId']);

      const result = (await client.createIssue(args)) as CreateIssueResponse;

      if (!result.issueCreate.success || !result.issueCreate.issue) {
        throw new Error('Failed to create issue');
      }

      const issue = result.issueCreate.issue;

      return this.createResponse(
        'Successfully created issue\n' +
          `Issue: ${issue.identifier}\n` +
          `Title: ${issue.title}\n` +
          `URL: ${issue.url}\n` +
          `Project: ${issue.project ? issue.project.name : 'None'}`
      );
    } catch (error) {
      this.handleError(error, 'create issue');
    }
  }

  /**
   * Creates multiple issues in bulk.
   */
  async handleCreateIssues(args: CreateIssuesInput): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ['issues']);

      if (!Array.isArray(args.issues)) {
        throw new Error('Issues parameter must be an array');
      }

      const result = (await client.createIssues(args.issues)) as IssueBatchResponse;

      if (!result.issueBatchCreate.success) {
        throw new Error('Failed to create issues');
      }

      const createdIssues = result.issueBatchCreate.issues as Issue[];

      return this.createResponse(
        `Successfully created ${createdIssues.length} issues:\n` +
          createdIssues
            .map((issue) => `- ${issue.identifier}: ${issue.title}\n  URL: ${issue.url}`)
            .join('\n')
      );
    } catch (error) {
      this.handleError(error, 'create issues');
    }
  }

  /**
   * Updates multiple issues in bulk.
   */
  async handleBulkUpdateIssues(args: BulkUpdateIssuesInput): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ['issueIds', 'update']);

      if (!Array.isArray(args.issueIds)) {
        throw new Error('IssueIds parameter must be an array');
      }

      const result = (await client.updateIssues(
        args.issueIds,
        args.update
      )) as UpdateIssuesResponse;

      if (!result.issueBatchUpdate.success) {
        throw new Error('Failed to update issues');
      }

      const updatedCount = result.issueBatchUpdate.issues.length;

      return this.createResponse(`Successfully updated ${updatedCount} issues`);
    } catch (error) {
      this.handleError(error, 'update issues');
    }
  }

  /**
   * Searches for issues with filtering and pagination.
   */
  async handleSearchIssues(args: SearchIssuesInput): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();

      const result = (await client.searchIssues(
        args,
        args.first || 50,
        args.after,
        args.orderBy || 'updatedAt'
      )) as SearchIssuesResponse;

      return this.createJsonResponse(result);
    } catch (error) {
      this.handleError(error, 'search issues');
    }
  }

  /**
   * Deletes a single issue.
   */
  async handleDeleteIssue(args: DeleteIssueInput): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ['id']);

      const result = (await client.deleteIssue(args.id)) as DeleteIssueResponse;

      if (!result.issueDelete.success) {
        throw new Error('Failed to delete issue');
      }

      return this.createResponse(`Successfully deleted issue ${args.id}`);
    } catch (error) {
      this.handleError(error, 'delete issue');
    }
  }
}
