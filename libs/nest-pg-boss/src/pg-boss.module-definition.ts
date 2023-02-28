import { ConfigurableModuleBuilder } from "@nestjs/common";
import { PGBossModuleOptions } from "./interfaces";

const {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
  OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<PGBossModuleOptions>().build();

// eslint-disable-next-line @typescript-eslint/naming-convention
type ASYNC_OPTIONS_TYPE_WITH_NAME = typeof ASYNC_OPTIONS_TYPE & {
  application_name: string;
};

export {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
  OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE_WITH_NAME as ASYNC_OPTIONS_TYPE,
};
