import { Injectable } from "@nestjs/common";
import * as PGBoss from "pg-boss";

@Injectable()
export class PGBossService {
  constructor(public readonly instance: PGBoss) {}
}
