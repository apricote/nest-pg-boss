import { ConfigurableModuleBuilder } from "@nestjs/common";
import { PGBossModuleOptions } from "./interfaces";

const {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
  OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<PGBossModuleOptions>()
  .setClassMethodName("forRoot")
  .build();

export {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
  OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE,
};
