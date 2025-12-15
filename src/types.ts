/**
 * Configuration options for the event loop watchdog
 */
export interface WatchdogConfig {
  /**
   * Sampling interval in milliseconds
   * @default 1000
   */
  sampleMs?: number;

  /**
   * Warning threshold for p95 lag in milliseconds
   * @default 75
   */
  lagP95WarnMs?: number;

  /**
   * Warning threshold for event loop utilization (0-1)
   * @default 0.9
   */
  eluWarn?: number;

  /**
   * Number of consecutive threshold breaches required to trigger warning
   * @default 5
   */
  consecutive?: number;

  /**
   * Cooldown period in milliseconds before another warning can be triggered
   * @default 60000 (1 minute)
   */
  cooldownMs?: number;

  /**
   * Prometheus integration configuration
   */
  prometheus?: PrometheusConfig;

  /**
   * OpenTelemetry integration configuration
   */
  otel?: OtelConfig;

  /**
   * Callback invoked when backpressure is detected
   */
  onWarning?: (info: WarningInfo) => void;
}

/**
 * Prometheus configuration
 */
export interface PrometheusConfig {
  /**
   * Optional prom-client registry
   * If not provided, the default registry will be used
   */
  register?: unknown;

  /**
   * Optional prefix for metric names
   * @default 'node'
   */
  prefix?: string;
}

/**
 * OpenTelemetry configuration
 */
export interface OtelConfig {
  /**
   * Whether to annotate the current active span with loop pressure attributes
   * @default true
   */
  annotateSpan?: boolean;

  /**
   * Whether to emit a diagnostic span on sustained backpressure
   * @default false
   */
  emitSpan?: boolean;
}

/**
 * Event loop statistics snapshot
 */
export interface EventLoopStats {
  /**
   * p50 delay in milliseconds
   */
  p50: number;

  /**
   * p95 delay in milliseconds
   */
  p95: number;

  /**
   * p99 delay in milliseconds
   */
  p99: number;

  /**
   * Maximum delay in milliseconds
   */
  max: number;

  /**
   * Event loop utilization (0-1)
   */
  elu: number;

  /**
   * Timestamp of the sample
   */
  timestamp: Date;
}

/**
 * Warning information provided to the callback
 */
export interface WarningInfo {
  /**
   * Current event loop statistics
   */
  stats: EventLoopStats;

  /**
   * Number of consecutive threshold breaches
   */
  consecutiveCount: number;

  /**
   * Warning message
   */
  message: string;

  /**
   * Whether p95 threshold was breached
   */
  lagThresholdBreached: boolean;

  /**
   * Whether ELU threshold was breached
   */
  eluThresholdBreached: boolean;
}

/**
 * Watchdog instance interface
 */
export interface Watchdog {
  /**
   * Stop the watchdog and clean up resources
   */
  stop(): void;

  /**
   * Get the current event loop statistics
   */
  getStats(): EventLoopStats | null;
}
