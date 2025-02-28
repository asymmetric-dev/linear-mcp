import { gql } from 'graphql-tag';

export const CREATE_ISSUE_MUTATION = gql`
  mutation CreateIssues($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      success
      issue {
        id
        identifier
        title
        url
        team {
          id
          name
        }
        project {
          id
          name
        }
      }
    }
  }
`;

export const CREATE_PROJECT = gql`
  mutation CreateProject($input: ProjectCreateInput!) {
    projectCreate(input: $input) {
      success
      project {
        id
        name
        url
      }
      lastSyncId
    }
  }
`;

export const CREATE_BATCH_ISSUES = gql`
  mutation CreateBatchIssues($input: IssueBatchCreateInput!) {
    issueBatchCreate(input: $input) {
      success
      issues {
        id
        identifier
        title
        url
      }
      lastSyncId
    }
  }
`;

export const UPDATE_ISSUES_MUTATION = gql`
  mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
    issueUpdate(id: $id, input: $input) {
      success
      issue {
        id
        identifier
        title
        url
        project {
          name
        }
        state {
          name
        }
      }
    }
  }
`;

export const UPDATE_BATCH_ISSUES_MUTATION = gql`
  mutation UpdateIssues($ids: [UUID!]!, $input: IssueUpdateInput!) {
    issueBatchUpdate(ids: $ids, input: $input) {
      success
      issues {
        id
        identifier
        title
        url
        project {
          name
        }
        state {
          name
        }
      }
    }
  }
`;

export const DELETE_ISSUES_MUTATION = gql`
  mutation DeleteIssue($id: String!) {
    issueDelete(id: $id) {
      success
    }
  }
`;

export const CREATE_ISSUE_LABELS = gql`
  mutation IssueLabelCreate($input: IssueLabelCreateInput!) {
    issueLabelCreate(input: $input) {
      success
      issueLabel {
        id
        name
        team {
          id
          name
        }
      }
    }
  }
`;
