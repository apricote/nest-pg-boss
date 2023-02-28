import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, Injectable } from "@nestjs/common";
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from "testcontainers";
import { createJob, JobService, PGBossModule } from "../src";
import { Job } from "pg-boss";

interface FoobarJobData {
  foo: string;
  bar: boolean;
}

const FoobarJob = createJob<FoobarJobData>("foobar");

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

@Injectable()
class FoobarService {
  constructor(
    @FoobarJob.Inject()
    private readonly foobarJobService: JobService<FoobarJobData>,
  ) {}

  public readonly datastore: FoobarJobData[] = [];

  async sendJob() {
    await this.foobarJobService.send({ foo: "oof", bar: true }, {});
  }

  @FoobarJob.Handle()
  async handleJob(job: Job<FoobarJobData>) {
    this.datastore.push(job.data);
  }
}

describe("PGBossModule (e2e)", () => {
  let postgres: StartedPostgreSqlContainer;
  let app: INestApplication;

  let foobarService: FoobarService;

  beforeAll(async () => {
    jest.setTimeout(60_000);
    postgres = await new PostgreSqlContainer().start();
  });

  afterAll(async () => {
    if (postgres) {
      // Even after calling `app.close()` pg-boss does not properly close the
      // job workers, throwing unexpected exceptions once the database is stopped.
      // After 10 seconds the remaining workers have all stopped.
      await sleep(10_000);
      await postgres.stop();
    }
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PGBossModule.forRoot({
          host: postgres.getHost(),
          port: postgres.getPort(),
          database: postgres.getDatabase(),
          user: postgres.getUsername(),
          password: postgres.getPassword(),
        }),
        PGBossModule.forJobs([FoobarJob]),
      ],
      providers: [FoobarService],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    foobarService = app.get<FoobarService>(FoobarService);
  });

  afterEach(async () => {
    await app.close();
  });

  it("handles a Job", async () => {
    jest.setTimeout(60_000);

    await foobarService.sendJob();

    // Wait for processing
    let lastError: Error | null = null;

    for (let retry = 0; retry < 25; retry++) {
      try {
        expect(foobarService.datastore).toHaveLength(1);

        lastError = null;
        break;
      } catch (err) {
        lastError = err;
        await sleep(2_000);
      }
    }

    expect(foobarService.datastore[0]).toEqual({ foo: "oof", bar: true });
    expect(lastError).toBeNull();
  });
});
