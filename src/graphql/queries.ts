import { gql } from 'graphql-tag';

export const SEARCH_ISSUES_QUERY = gql`
  query SearchIssues(
    $filter: IssueFilter
    $first: Int
    $after: String
    $orderBy: PaginationOrderBy
  ) {
    issues(filter: $filter, first: $first, after: $after, orderBy: $orderBy) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        identifier
        title
        description
        url
        state {
          id
          name
          type
          color
        }
        assignee {
          id
          name
          email
        }
        team {
          id
          name
          key
        }
        project {
          id
          name
        }
        priority
        labels {
          nodes {
            id
            name
            color
          }
        }
        createdAt
        updatedAt
      }
    }
  }
`;

export const GET_TEAMS_QUERY = gql`
  query GetTeams {
    teams {
      nodes {
        id
        name
        key
        description
        states {
          nodes {
            id
            name
            type
            color
          }
        }
        labels {
          nodes {
            id
            name
            color
          }
        }
      }
    }
  }
`;

export const GET_WORKFLOW_STATES_QUERY = gql`
  query WorkflowStates {
    workflowStates {
      nodes {
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

export const GET_ISSUE_LABELS_QUERY = gql`
  query IssueLabels {
    issueLabels {
      nodes {
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

export const GET_ISSUE_LABEL_QUERY = gql`
  query IssueLabel($id: String!) {
    issueLabel(id: $id) {
      id
      name
      team {
        id
        name
      }
    }
  }
`;

export const GET_USER_QUERY = gql`
  query GetUser {
    viewer {
      id
      name
      email
      teams {
        nodes {
          id
          name
          key
        }
      }
    }
  }
`;

export const SEARCH_PROJECTS_QUERY = gql`
  query SearchProjects($term: String!) {
    searchProjects(term: $term) {
      nodes {
        id
        name
        description
        url
        teams {
          nodes {
            id
            name
          }
        }
      }
    }
  }
`;

export const GET_PROJECT_QUERY = gql`
  query GetProject($id: String!) {
    project(id: $id) {
      id
      name
      description
      url
      teams {
        nodes {
          id
          name
        }
      }
      issues {
        nodes {
          id
          title
          updatedAt
          createdAt
          state {
            name
          }
          assignee {
            id
            name
          }
          labels {
            nodes {
              name
            }
          }
        }
      }
    }
  }
`;
