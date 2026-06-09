
import { AppConfig as EnvAppConfig, getConfig as getEnvConfig } from './env';

export type AppConfig = EnvAppConfig;

export function getConfig(): AppConfig {
  return getEnvConfig();
}

