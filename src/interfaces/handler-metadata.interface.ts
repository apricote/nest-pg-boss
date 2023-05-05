import type { WorkOptions } from "pg-boss";

export interface HandlerMetadata {
  token: string;
  jobName: string;
  workOptions: WorkOptions;
}
