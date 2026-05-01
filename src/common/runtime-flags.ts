const isProduction = process.env.NODE_ENV === 'production';

export const isFeatureEnabled = (
  value: string | undefined,
  defaultValue: boolean,
): boolean => {
  if (value === undefined) {
    return defaultValue;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

export const runtimeFlags = {
  schedulesEnabled: isFeatureEnabled(
    process.env.SCHEDULES_ENABLED,
    !isProduction,
  ),
  seedModuleEnabled: isFeatureEnabled(
    process.env.SEED_MODULE_ENABLED,
    !isProduction,
  ),
  swaggerEnabled: isFeatureEnabled(process.env.SWAGGER_ENABLED, !isProduction),
  memoryMonitorEnabled: isFeatureEnabled(
    process.env.MEMORY_MONITOR_ENABLED,
    false,
  ),
};
