import { Module } from "@nestjs/common";
import { PGBossModule } from "@apricote/nest-pg-boss";
import { ExampleController } from "./example.controller";
import { ExampleService } from "./example.service";
import { ExampleJob } from "./example.job";

@Module({
  imports: [
    PGBossModule.forRoot({
      // Connection details
      host: process.env["DB_HOST"],
      user: process.env["DB_USERNAME"],
      password: process.env["DB_PASSWORD"],
      database: process.env["DB_DATABASE"],
      schema: "public",
    }),
    PGBossModule.forJobs([ExampleJob]),
  ],
  controllers: [ExampleController],
  providers: [ExampleService],
})
export class ExampleModule {}
