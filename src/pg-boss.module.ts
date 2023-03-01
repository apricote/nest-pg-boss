import {
  DynamicModule,
  Global,
  Inject,
  Logger,
  Module,
  OnApplicationBootstrap,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { MetadataScanner, ModuleRef } from "@nestjs/core";
import * as PGBoss from "pg-boss";
import { defer, lastValueFrom } from "rxjs";
import { handleRetry } from "./common/pg-boss.utils";
import { PGBossJobModule } from "./pg-boss-job.module";
import { HandlerScannerService } from "./handler-scanner.service";
import { PGBossModuleOptions } from "./interfaces/pg-boss-options.interface";
import { Job } from "./job.service";
import {
  ASYNC_OPTIONS_TYPE,
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
  OPTIONS_TYPE,
} from "./pg-boss.module-definition";

@Global()
@Module({
  providers: [MetadataScanner, HandlerScannerService],
})
export class PGBossModule
  extends ConfigurableModuleClass
  implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(this.constructor.name);
  private instance: PGBoss;

  constructor(
    @Inject(MODULE_OPTIONS_TOKEN)
    private readonly options: PGBossModuleOptions,
    private readonly moduleRef: ModuleRef,
    private readonly handlerScannerService: HandlerScannerService,
  ) {
    super();
  }

  static forRoot(options: typeof OPTIONS_TYPE): DynamicModule {
    const instanceProvider = {
      provide: PGBoss,
      useFactory: async () => await this.createInstanceFactory(options),
    };

    const dynamicModule = super.forRoot(options);
    console.dir(dynamicModule);
    dynamicModule.providers.push(instanceProvider);
    dynamicModule.exports ||= [];
    dynamicModule.exports.push(instanceProvider);

    return dynamicModule;
  }

  static forRootAsync(options: ASYNC_OPTIONS_TYPE): DynamicModule {
    const instanceProvider = {
      provide: PGBoss,
      useFactory: async (pgBossModuleOptions: PGBossModuleOptions) => {
        if (options.application_name) {
          return await this.createInstanceFactory({
            ...pgBossModuleOptions,
            application_name: options.application_name,
          });
        }
        return await this.createInstanceFactory(pgBossModuleOptions);
      },
      inject: [MODULE_OPTIONS_TOKEN],
    };

    const dynamicModule = super.forRootAsync(options);
    dynamicModule.providers.push(instanceProvider);
    if (!dynamicModule.exports) {
      dynamicModule.exports = [];
    }
    dynamicModule.exports.push(instanceProvider);

    return dynamicModule;
  }

  private static async createInstanceFactory(options: PGBossModuleOptions) {
    return await lastValueFrom(
      defer(async () => new PGBoss(options).start()).pipe(
        handleRetry(
          options.retryAttempts,
          options.retryDelay,
          options.verboseRetryLog,
          options.toRetry,
        ),
      ),
    );
  }

  static forJobs(jobs: Job[]) {
    return {
      module: PGBossJobModule,
      providers: jobs.map((job) => job.ServiceProvider),
      exports: jobs.map((job) => job.ServiceProvider.provide),
    };
  }

  onModuleInit() {
    this.instance = this.moduleRef.get<PGBoss>(PGBoss);
  }

  onApplicationBootstrap() {
    this.setupWorkers();
  }

  async onModuleDestroy(): Promise<void> {
    try {
      if (this.instance) {
        await this.instance.stop();
      }
    } catch (e) {
      this.logger.error(e?.message);
    }
  }

  private setupWorkers() {
    if (!this.instance) {
      throw new Error(
        "setupWorkers must be called after onApplicationBootstrap",
      );
    }

    const jobHandlers = this.handlerScannerService.getJobHandlers();

    jobHandlers.forEach((handler) => {
      this.instance.work(handler.metadata.jobName, handler.callback);
    });

    this.logger.warn(jobHandlers, "jobHandlers");
  }
}
