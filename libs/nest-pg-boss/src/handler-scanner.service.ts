import { Injectable, Logger } from "@nestjs/common";
import { MetadataScanner, ModulesContainer } from "@nestjs/core";
import { Injectable as InjectableInterface } from "@nestjs/common/interfaces";
import { InstanceWrapper } from "@nestjs/core/injector/instance-wrapper";
import { PG_BOSS_JOB_METADATA } from "./pg-boss.constants";
import { HandlerMetadata } from "./interfaces/handler-metadata.interface";

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
  ): HandlerMetadata {
    const targetCallback = instancePrototype[methodKey];
    const metadata = Reflect.getMetadata(PG_BOSS_JOB_METADATA, targetCallback);
    if (metadata == null) {
      return null;
    }

    return metadata;
  }

  getJobHandlers() {
    // See https://github.com/owl1n/nest-queue/blob/master/src/queue.provider.ts
    const modules = [...this.modulesContainer.values()];
    const providersMap = modules
      .filter(({ providers }) => providers.size > 0)
      .map(({ providers }) => providers);

    const providerInstances: InstanceWrapper<InjectableInterface>[] =
      providersMap.flatMap((map) => [...map.values()]);

    return providerInstances.flatMap(({ instance }) => {
      const instancePrototype = Object.getPrototypeOf(instance || {});
      return this.metadataScanner
        .getAllMethodNames(instancePrototype)
        .map((methodName) => {
          const metadata = HandlerScannerService.exploreMethodMetadata(
            instancePrototype,
            methodName,
          );

          if (metadata != null) {
            return {
              metadata,
              callback: (instance as any)[methodName].bind(instance),
            };
          }

          return null;
        })
        .filter(Boolean);
    });
  }
}
