import { Test, TestingModule } from "@nestjs/testing";
import { NestPgBossService } from "./nest-pg-boss.service";

describe("NestPgBossService", () => {
  let service: NestPgBossService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NestPgBossService],
    }).compile();

    service = module.get<NestPgBossService>(NestPgBossService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
