import { JobService } from "@apricote/nest-pg-boss";
import { Injectable } from "@nestjs/common";
import { ExampleJob, ExampleJobData } from "./example.job";

@Injectable()
export class ExampleService {
  constructor(
    @ExampleJob.Inject()
    private readonly exampleJobService: JobService<ExampleJobData>,
  ) {}

  async createJob(): Promise<void> {
    await this.exampleJobService.send({ foo: "oof", bar: "baz" }, {});
  }

  @ExampleJob.Handle()
  async handleJob(jobData: ExampleJobData) {
    console.log(`Handled job ${ExampleJob.InjectionToken}: `, jobData);
  }
}
