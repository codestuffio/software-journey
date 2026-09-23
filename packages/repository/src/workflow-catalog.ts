export interface WorkflowCatalogStep {
  id: string;
  kind: "command" | "specification" | "implementation" | "test" | "history";
  label: string;
  path?: string;
}

export interface WorkflowCatalogEntry {
  id: string;
  version: string;
  repositoryId: string;
  commitSha: string;
  steps: readonly WorkflowCatalogStep[];
}

export const openSpecNewChangeWorkflow: WorkflowCatalogEntry = {
  id: "openspec-new-change",
  version: "1",
  repositoryId:
    "sha256:eee892b5859866adf340033826fac3acb4ab68c1ed787676a313a00e8ac5d325",
  commitSha: "bae58cf61479986431bb798acbe5a688a591c18c",
  steps: [
    {
      id: "command-entry",
      kind: "command",
      label: "Command entry",
      path: "src/cli/index.ts",
    },
    {
      id: "governing-specification",
      kind: "specification",
      label: "Change creation specification",
      path: "openspec/specs/change-creation/spec.md",
    },
    {
      id: "implementation",
      kind: "implementation",
      label: "New change implementation",
      path: "src/commands/workflow/new-change.ts",
    },
    {
      id: "test",
      kind: "test",
      label: "CLI behavior test",
      path: "test/cli-e2e/basic.test.ts",
    },
    {
      id: "selected-history",
      kind: "history",
      label: "Selected revision",
    },
  ],
};

export const workflowCatalog = [openSpecNewChangeWorkflow] as const;

export function findWorkflowCatalogEntry(
  id: string,
): WorkflowCatalogEntry | undefined {
  return workflowCatalog.find((entry) => entry.id === id);
}
