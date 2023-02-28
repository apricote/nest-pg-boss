import {
  CustomDecorator,
  FactoryProvider,
  Inject,
  Injectable,
  SetMetadata,
} from "@nestjs/common";
import * as PGBoss from "pg-boss";
import { getJobToken } from "./utils";
import { HandlerMetadata } from "./interfaces/handler-metadata.interface";
import { PG_BOSS_JOB_METADATA } from "./pg-boss.constants";

@Injectable()
export class JobService<JobData extends object> {
  constructor(private readonly name: string, private readonly pgBoss: PGBoss) {}

  async send(
    data: JobData,
    options: PGBoss.SendOptions,
  ): Promise<string | null> {
    return this.pgBoss.send(this.name, data, options);
  }

  async sendAfter(
    data: JobData,
    options: PGBoss.SendOptions,
    date: Date | string | number,
  ): Promise<string | null> {
    // sendAfter has three overloads for all date variants we accept
    return this.pgBoss.sendAfter(this.name, data, options, date as any);
  }

  async sendOnce(
    data: JobData,
    options: PGBoss.SendOptions,
    key: string,
  ): Promise<string | null> {
    return this.pgBoss.sendOnce(this.name, data, options, key);
  }

  async sendSingleton(
    data: JobData,
    options: PGBoss.SendOptions,
  ): Promise<string | null> {
    return this.pgBoss.sendSingleton(this.name, data, options);
  }

  async sendThrottled(
    data: JobData,
    options: PGBoss.SendOptions,
    seconds: number,
    key?: string,
  ): Promise<string | null> {
    if (key != undefined) {
      return this.pgBoss.sendThrottled(this.name, data, options, seconds, key);
    }
    return this.pgBoss.sendThrottled(this.name, data, options, seconds);
  }

  async sendDebounced(
    data: JobData,
    options: PGBoss.SendOptions,
    seconds: number,
    key?: string,
  ): Promise<string | null> {
    if (key != undefined) {
      return this.pgBoss.sendDebounced(this.name, data, options, seconds, key);
    }
    return this.pgBoss.sendDebounced(this.name, data, options, seconds);
  }

  async schedule(cron: string, data: JobData, options: PGBoss.ScheduleOptions) {
    return this.pgBoss.schedule(this.name, cron, data, options);
  }

  async unschedule() {
    this.pgBoss.unschedule(this.name);
  }
}

export interface Job<JobData extends object = any> {
  ServiceProvider: FactoryProvider<JobService<JobData>>;
  Inject: () => (target: object, key: string | symbol, index?: number) => void;
  Handle: () => CustomDecorator<string>;
}

export const createJob = <JobData extends object>(
  name: string,
): Job<JobData> => {
  const token = getJobToken(name);

  return {
    ServiceProvider: {
      provide: token,
      useFactory: (pgBoss: PGBoss) => new JobService<JobData>(name, pgBoss),
      inject: [PGBoss],
    },
    Inject: () => Inject(token),
    Handle: () =>
      SetMetadata<string, HandlerMetadata>(PG_BOSS_JOB_METADATA, {
        token,
        jobName: name,
      }),
  };
};
