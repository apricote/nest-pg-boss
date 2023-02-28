import { Module } from "@nestjs/common";

/**
 * Only used because `PGBossModule.forJobs()` returns a dynamic module that
 * needs a module reference. Using `PGBossModule` does not work, as that one
 * would initialize a second pg-boss instance.
 */
@Module({})
export class PGBossJobModule {}
