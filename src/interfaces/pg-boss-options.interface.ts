import type { ConstructorOptions } from "pg-boss";

// TODO: Figure at "name", "application_name", "instanceName"

export type PGBossModuleOptions = {
  /**
   * Number of times to retry connecting
   * Default: 10
   */
  retryAttempts?: number;
  /**
   * Delay between connection retry attempts (ms)
   * Default: 3000
   */
  retryDelay?: number;
  /**
   * Function that determines whether the module should
   * attempt to connect upon failure.
   *
   * @param err error that was thrown
   * @returns whether to retry connection or not
   */
  toRetry?: (err: any) => boolean;
  /**
   * If `true`, will show verbose error messages on each connection retry.
   */
  verboseRetryLog?: boolean;
  /**
   * This exposes the `on('error', ...` from PGBoss.
   * @see https://github.com/timgit/pg-boss/blob/master/docs/readme.md#error
   */
  onError: (err: Error) => void;
} & ConstructorOptions;
