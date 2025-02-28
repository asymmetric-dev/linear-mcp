/**
 * Team operation types
 */

export interface TeamState {
  id: string;
  name: string;
  type: string;
}

export interface Team {
  id: string;
  name: string;
  key?: string;
  states?: { nodes: TeamState[] };
}

export interface TeamResponse {
  teams: {
    nodes: Team[];
  };
}

export interface State {
  id: string;
  name: string;
  team: Team;
}

export interface WorkflowStatesResponse {
  workflowStates: {
    nodes: State[];
  };
}

export interface Label {
  id: string;
  name: string;
  team: Team;
}

export interface IssueLabelResponse {
  issueLabel: Label[];
}

export interface IssueLabelsResponse {
  issueLabels: {
    nodes: Label[];
  };
}

export interface IssueLabelCreateInput {
  name: string;
  color?: string;
  teamId: string;
  description?: string;
}

export interface LabelResponse {
  issueLabelCreate: {
    success: boolean;
    issueLabel: Label;
  };
}
