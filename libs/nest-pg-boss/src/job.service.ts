import {
  CustomDecorator,
  FactoryProvider,
  Inject,
  Injectable,
  Scope,
  SetMetadata,
} from "@nestjs/common";
import { LazyModuleLoader } from "@nestjs/core";
import * as PGBoss from "pg-boss";
import { getJobToken } from "./common/pg-boss.utils";
import { HandlerMetadata } from "./interfaces/handler-metadata.interface";
import { PGBossCoreModule } from "./pg-boss-core.module";
import { PG_BOSS_JOB_METADATA } from "./pg-boss.constants";
import { PGBossService } from "./pg-boss.service";

@Injectable({ scope: Scope.REQUEST })
export class JobService<JobData extends object> {
  private pgBossService: PGBossService;
  constructor(
    private readonly name: string,
    private lazyModuleLoader: LazyModuleLoader,
  ) {}

  async send(
    data: JobData,
    options: PGBoss.SendOptions,
  ): Promise<string | null> {
    if (!this.pgBossService) {
      const moduleRef = await this.lazyModuleLoader.load(
        () => PGBossCoreModule,
      );
      this.pgBossService = moduleRef.get(PGBossService);
    }

    return this.pgBossService.instance.send(this.name, data, options);
  }

  async sendAfter(
    data: JobData,
    options: PGBoss.SendOptions,
    date: Date | string | number,
  ): Promise<string | null> {
    // sendAfter has three overloads for all date variants we accept
    return this.pgBossService.instance.sendAfter(
      this.name,
      data,
      options,
      date as any,
    );
  }

  async sendOnce(
    data: JobData,
    options: PGBoss.SendOptions,
    key: string,
  ): Promise<string | null> {
    return this.pgBossService.instance.sendOnce(this.name, data, options, key);
  }

  async sendSingleton(
    data: JobData,
    options: PGBoss.SendOptions,
  ): Promise<string | null> {
    return this.pgBossService.instance.sendSingleton(this.name, data, options);
  }

  async sendThrottled(
    data: JobData,
    options: PGBoss.SendOptions,
    seconds: number,
    key?: string,
  ): Promise<string | null> {
    if (!this.pgBossService) {
      const moduleRef = await this.lazyModuleLoader.load(
        () => PGBossCoreModule,
      );
      this.pgBossService = moduleRef.get(PGBossService);
    }

    return this.pgBossService.instance.sendThrottled(
      this.name,
      data,
      options,
      seconds,
      key,
    );
  }

  async sendDebounced(
    data: JobData,
    options: PGBoss.SendOptions,
    seconds: number,
    key?: string,
  ): Promise<string | null> {
    if (!this.pgBossService) {
      const moduleRef = await this.lazyModuleLoader.load(
        () => PGBossCoreModule,
      );
      this.pgBossService = moduleRef.get(PGBossService);
    }

    return this.pgBossService.instance.sendDebounced(
      this.name,
      data,
      options,
      seconds,
      key,
    );
  }
}

export interface Job<JobData extends object = any> {
  ServiceProvider: FactoryProvider<any>;
  Service: typeof JobService<JobData>;
  Inject: () => (target: object, key: string | symbol, index?: number) => void;
  InjectionToken: string;
  Handle: () => CustomDecorator<string>;
}

export const createJob = <JobData extends object>(
  name: string,
): Job<JobData> => {
  const token = getJobToken(name);

  return {
    ServiceProvider: {
      provide: token,
      useFactory: (loader: LazyModuleLoader) =>
        new JobService<JobData>(name, loader),
      inject: [LazyModuleLoader],
    },
    Service: JobService<JobData>,
    Inject: () => Inject(token),
    InjectionToken: token,
    Handle: () =>
      SetMetadata<string, HandlerMetadata>(PG_BOSS_JOB_METADATA, {
        token,
        jobName: name,
      }),
  };
};
