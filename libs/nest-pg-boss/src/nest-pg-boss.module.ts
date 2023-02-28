import { Module } from "@nestjs/common";
import { NestPgBossService } from "./nest-pg-boss.service";

@Module({
  providers: [NestPgBossService],
  exports: [NestPgBossService],
})
export class NestPgBossModule {}
