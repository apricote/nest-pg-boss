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
import { handleRetry } from "./utils";
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
  implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(this.constructor.name);
  private instance: PGBoss | undefined;

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly handlerScannerService: HandlerScannerService,
    @Inject(MODULE_OPTIONS_TOKEN)
    private readonly options: PGBossModuleOptions
  ) {
    super();
  }

  static forRoot(options: typeof OPTIONS_TYPE): DynamicModule {
    const instanceProvider = {
      provide: PGBoss,
      useFactory: async () => await this.createInstanceFactory(options),
    };

    const dynamicModule = super.forRoot(options);
    if (!dynamicModule.providers) {
      dynamicModule.providers = [];
    }
    dynamicModule.providers.push(instanceProvider);
    dynamicModule.exports ||= [];
    dynamicModule.exports.push(instanceProvider);

    return dynamicModule;
  }

  static forRootAsync(options: typeof ASYNC_OPTIONS_TYPE): DynamicModule {
    const instanceProvider = {
      provide: PGBoss,
      useFactory: async (pgBossModuleOptions: PGBossModuleOptions) => {
        return await this.createInstanceFactory(pgBossModuleOptions);
      },
      inject: [MODULE_OPTIONS_TOKEN],
    };

    const dynamicModule = super.forRootAsync(options);
    if (!dynamicModule.providers) {
      dynamicModule.providers = [];
    }
    dynamicModule.providers.push(instanceProvider);
    if (!dynamicModule.exports) {
      dynamicModule.exports = [];
    }
    dynamicModule.exports.push(instanceProvider);

    return dynamicModule;
  }

  private static async createInstanceFactory(options: PGBossModuleOptions) {
    const pgBoss = await lastValueFrom(
      defer(async () => {
        const boss = new PGBoss(options);

        boss.on("error", options.onError);

        await boss.start();
        return boss;
      }).pipe(
        handleRetry(
          options.retryAttempts,
          options.retryDelay,
          options.verboseRetryLog,
          options.toRetry
        )
      )
    );

    return pgBoss;
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

  async onApplicationBootstrap(): Promise<void> {
    await this.setupWorkers();
  }

  async onModuleDestroy(): Promise<void> {
    try {
      if (this.instance) {
        await this.instance.stop(this.options.stopOptions);
      }
    } catch (e) {
      this.logger.error((e as Error).message);
    }
  }

  private async setupWorkers() {
    if (this.options.disableWorkers) {
      this.logger.log(
        "disableWorkers is set so will not attempt to register them"
      );
      return;
    }

    if (!this.instance) {
      throw new Error(
        "setupWorkers must be called after onApplicationBootstrap"
      );
    }

    const jobHandlers = this.handlerScannerService.getJobHandlers();

    await Promise.all(
      jobHandlers.map(async (handler) => {
        if (!this.instance) {
          throw new Error(
            "setupWorkers must be called after onApplicationBootstrap"
          );
        }

        const workerID = await this.instance.work(
          handler.metadata.jobName,
          handler.metadata.workOptions,
          handler.callback
        );
        this.logger.log(
          { workerID, jobName: handler.metadata.jobName },
          "Registered Worker"
        );
      })
    );
  }

  public getBossInstance() {
    return this.instance;
  }
}
