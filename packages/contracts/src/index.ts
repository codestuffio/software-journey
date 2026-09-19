/** Reference to committed evidence. Runtime validation belongs at ingestion. */
export interface SourceReference {
  repositoryId: string;
  commitSha: string;
  path: string;
  lines?: { start: number; end: number };
}

/** Shared vocabulary; analysis and persisted schemas are not implemented yet. */
export type KnowledgeAudience = "human" | "agent";
