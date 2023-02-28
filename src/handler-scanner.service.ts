import { Injectable, Logger } from "@nestjs/common";
import { MetadataScanner, ModulesContainer } from "@nestjs/core";
import { Injectable as InjectableInterface } from "@nestjs/common/interfaces";
import { InstanceWrapper } from "@nestjs/core/injector/instance-wrapper";
import { PG_BOSS_JOB_METADATA } from "./pg-boss.constants";
import { HandlerMetadata } from "./interfaces/handler-metadata.interface";
import type { WorkHandler } from "pg-boss";

@Injectable()
export class HandlerScannerService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly metadataScanner: MetadataScanner,
    public readonly modulesContainer: ModulesContainer,
  ) {}

  public static exploreMethodMetadata(
    instancePrototype: InjectableInterface,
    methodKey: string,
  ): HandlerMetadata | null {
    const targetCallback = (instancePrototype as any)[methodKey];
    const metadata = Reflect.getMetadata(PG_BOSS_JOB_METADATA, targetCallback);
    if (metadata == null) {
      return null;
    }

    return metadata;
  }

  getJobHandlers(): {
    metadata: HandlerMetadata;
    callback: WorkHandler<unknown, unknown>;
  }[] {
    // See https://github.com/owl1n/nest-queue/blob/master/src/queue.provider.ts
    const modules = [...this.modulesContainer.values()];
    const providersMap = modules
      .filter(({ providers }) => providers.size > 0)
      .map(({ providers }) => providers);

    const providerInstances: InstanceWrapper<InjectableInterface>[] =
      providersMap.flatMap((map) => [...map.values()]);

    return providerInstances
      .flatMap(({ instance }) => {
        const instancePrototype = Object.getPrototypeOf(instance || {});
        return this.metadataScanner
          .getAllMethodNames(instancePrototype)
          .map((methodName) => {
            const metadata = HandlerScannerService.exploreMethodMetadata(
              instancePrototype,
              methodName,
            );

            if (metadata == null) {
              return null;
            }

            const callback = (
              instance as Record<
                typeof methodName,
                WorkHandler<unknown, unknown>
              >
            )[methodName].bind(instance);

            return {
              metadata,
              callback,
            };
          });
      })
      .filter(notEmpty);
  }
}

function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  if (value === null || value === undefined) {
    return false;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const testDummy: TValue = value;
  return true;
}
