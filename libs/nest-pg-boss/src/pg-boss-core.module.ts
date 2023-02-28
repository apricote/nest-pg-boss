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
import { HandlerScannerService } from "./handler-scanner.service";
import { PGBossModuleOptions } from "./interfaces/pg-boss-options.interface";
import { PG_BOSS_MODULE_OPTIONS } from "./pg-boss.constants";
import {
  ASYNC_OPTIONS_TYPE,
  ConfigurableModuleClass,
  OPTIONS_TYPE,
} from "./pg-boss.module-definition";
import { PGBossService } from "./pg-boss.service";

@Global()
@Module({
  providers: [MetadataScanner, HandlerScannerService],
})
export class PGBossCoreModule
  extends ConfigurableModuleClass
  implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger("PGBossCoreModule");
  private instance: PGBoss;

  constructor(
    @Inject(PG_BOSS_MODULE_OPTIONS)
    private readonly options: PGBossModuleOptions,
    private readonly moduleRef: ModuleRef,
    private readonly handlerScannerService: HandlerScannerService,
  ) {
    super();
  }

  static register(options: typeof OPTIONS_TYPE): DynamicModule {
    const instanceProvider = {
      provide: PGBoss,
      useFactory: async () => await this.createInstanceFactory(options),
    };
    const serviceProvider = {
      provide: PGBossService,
      useFactory: (pgBoss: PGBoss) => this.createServiceFactory(pgBoss),
      inject: [PGBoss],
    };

    const dynamicModule = super.register(options);
    dynamicModule.providers.push(instanceProvider, serviceProvider);
    dynamicModule.exports.push(serviceProvider);
    dynamicModule.global = true;

    return dynamicModule;
  }

  static registerAsync(options: ASYNC_OPTIONS_TYPE): DynamicModule {
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
      inject: [PG_BOSS_MODULE_OPTIONS],
    };
    const serviceProvider = {
      provide: PGBossService,
      useFactory: (instance: PGBoss) => this.createServiceFactory(instance),
      inject: [PGBoss],
    };

    const dynamicModule = super.registerAsync(options);
    dynamicModule.providers.push(instanceProvider, serviceProvider);
    if (!dynamicModule.exports) {
      dynamicModule.exports = [];
    }
    dynamicModule.exports.push(serviceProvider);
    dynamicModule.global = true;

    return dynamicModule;
  }

  private static async createInstanceFactory(options: PGBossModuleOptions) {
    return await lastValueFrom(
      defer(async () => {
        const instance = new PGBoss(options);
        instance.start();

        instance.on("monitor-states", (states) => console.dir(states.queues));

        return instance;
      }).pipe(
        handleRetry(
          options.retryAttempts,
          options.retryDelay,
          options.verboseRetryLog,
          options.toRetry,
        ),
      ),
    );
  }

  private static createServiceFactory(instance: PGBoss) {
    return new PGBossService(instance);
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
