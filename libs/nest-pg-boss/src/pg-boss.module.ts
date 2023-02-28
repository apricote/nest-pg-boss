import { DynamicModule, Global, Module } from "@nestjs/common";
import { Job } from "./job.service";
import { PGBossCoreModule } from "./pg-boss-core.module";
import {
  ASYNC_OPTIONS_TYPE,
  ConfigurableModuleClass,
  OPTIONS_TYPE,
} from "./pg-boss.module-definition";

@Global()
@Module({})
export class PGBossModule extends ConfigurableModuleClass {
  static register(options: typeof OPTIONS_TYPE): DynamicModule {
    return {
      imports: [PGBossCoreModule.register(options)],
      global: true,
      ...super.register(options),
    };
  }

  static registerAsync(options: ASYNC_OPTIONS_TYPE): DynamicModule {
    return {
      imports: [PGBossCoreModule.registerAsync(options)],
      global: true,
      ...super.registerAsync(options),
    };
  }

  static forJobs(jobs: Job[]) {
    return {
      module: PGBossModule,
      providers: jobs.map((job) => job.ServiceProvider),
      exports: jobs.map((job) => job.ServiceProvider.provide),
    };
  }
}
