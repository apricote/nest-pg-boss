import { createJob } from "@apricote/nest-pg-boss";

export interface ExampleJobData {
  foo: string;
  bar: string;
}

export const ExampleJob = createJob<ExampleJobData>("example-job");
