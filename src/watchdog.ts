import { monitorEventLoopDelay } from 'perf_hooks';
import { performance } from 'perf_hooks';
import type { IntervalHistogram } from 'perf_hooks';

// eventLoopUtilization is available as performance.eventLoopUtilization in Node 16+
type EventLoopUtilization = {
  idle: number;
  active: number;
  utilization: number;
};
import { WatchdogConfig, Watchdog, EventLoopStats, WarningInfo } from './types';
import { PrometheusMetrics } from './metrics';
import { OtelIntegration } from './otel';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<Omit<WatchdogConfig, 'prometheus' | 'otel' | 'onWarning'>> = {
  sampleMs: 1000,
  lagP95WarnMs: 75,
  eluWarn: 0.9,
  consecutive: 5,
  cooldownMs: 60000,
};

/**
 * Event Loop Watchdog implementation
 */
export class EventLoopWatchdog implements Watchdog {
  private config: Required<Omit<WatchdogConfig, 'prometheus' | 'otel' | 'onWarning'>>;
  private onWarning?: (info: WarningInfo) => void;
  private histogram?: IntervalHistogram;
  private intervalId?: NodeJS.Timeout;
  private lastElu?: EventLoopUtilization;
  private consecutiveBreaches: number = 0;
  private lastWarningTime: number = 0;
  private lastStats: EventLoopStats | null = null;
  private prometheusMetrics: PrometheusMetrics;
  private otelIntegration: OtelIntegration;

  constructor(config: WatchdogConfig = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
    this.onWarning = config.onWarning;

    // Initialize integrations
    this.prometheusMetrics = new PrometheusMetrics(config.prometheus);
    this.otelIntegration = new OtelIntegration(config.otel);
  }

  /**
   * Start monitoring the event loop
   */
  start(): void {
    if (this.intervalId) {
      throw new Error('Watchdog is already running');
    }

    // Initialize the histogram
    this.histogram = monitorEventLoopDelay({ resolution: 10 });
    this.histogram.enable();

    // Initialize ELU tracking
    this.lastElu = performance.eventLoopUtilization();

    // Start sampling
    this.intervalId = setInterval(() => {
      this.sample();
    }, this.config.sampleMs);

    // Prevent the interval from keeping the process alive
    this.intervalId.unref();
  }

  /**
   * Stop monitoring and clean up resources
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    if (this.histogram) {
      this.histogram.disable();
      this.histogram = undefined;
    }

    this.lastElu = undefined;
    this.consecutiveBreaches = 0;
    this.lastStats = null;
  }

  /**
   * Get the current event loop statistics
   */
  getStats(): EventLoopStats | null {
    return this.lastStats;
  }

  /**
   * Sample the event loop and check thresholds
   */
  private sample(): void {
    if (!this.histogram) return;

    // Get delay percentiles (in nanoseconds, convert to milliseconds)
    const p50 = this.histogram.percentile(50) / 1_000_000;
    const p95 = this.histogram.percentile(95) / 1_000_000;
    const p99 = this.histogram.percentile(99) / 1_000_000;
    const max = this.histogram.max / 1_000_000;

    // Get event loop utilization
    const currentElu = performance.eventLoopUtilization(this.lastElu);
    this.lastElu = performance.eventLoopUtilization();
    const elu = currentElu.utilization;

    // Create stats snapshot
    const stats: EventLoopStats = {
      p50,
      p95,
      p99,
      max,
      elu,
      timestamp: new Date(),
    };
    this.lastStats = stats;

    // Update Prometheus metrics
    this.prometheusMetrics.updateMetrics(p50, p95, p99, max, elu);

    // Check thresholds
    const lagThresholdBreached = p95 > this.config.lagP95WarnMs;
    const eluThresholdBreached = elu > this.config.eluWarn;
    const thresholdBreached = lagThresholdBreached || eluThresholdBreached;

    if (thresholdBreached) {
      this.consecutiveBreaches++;
    } else {
      this.consecutiveBreaches = 0;
    }

    // Check if we should trigger a warning
    if (this.consecutiveBreaches >= this.config.consecutive) {
      this.triggerWarning(stats, lagThresholdBreached, eluThresholdBreached);
      // Reset consecutive count after warning
      this.consecutiveBreaches = 0;
    }

    // Reset histogram for next sample
    this.histogram.reset();
  }

  /**
   * Trigger a warning if cooldown period has passed
   */
  private triggerWarning(
    stats: EventLoopStats,
    lagThresholdBreached: boolean,
    eluThresholdBreached: boolean
  ): void {
    const now = Date.now();
    if (now - this.lastWarningTime < this.config.cooldownMs) {
      return; // Still in cooldown
    }

    this.lastWarningTime = now;

    // Build warning message
    const reasons: string[] = [];
    if (lagThresholdBreached) {
      reasons.push(`p95 lag ${stats.p95.toFixed(2)}ms exceeds ${this.config.lagP95WarnMs}ms`);
    }
    if (eluThresholdBreached) {
      reasons.push(`ELU ${(stats.elu * 100).toFixed(1)}% exceeds ${this.config.eluWarn * 100}%`);
    }

    const warningInfo: WarningInfo = {
      stats,
      consecutiveCount: this.config.consecutive,
      message: `Event loop backpressure detected: ${reasons.join(', ')}`,
      lagThresholdBreached,
      eluThresholdBreached,
    };

    // Annotate OTel span if enabled
    this.otelIntegration.annotateCurrentSpan(stats, true);
    this.otelIntegration.emitDiagnosticSpan(stats, this.config.consecutive);

    // Invoke callback if provided
    if (this.onWarning) {
      try {
        this.onWarning(warningInfo);
      } catch (error) {
        // Don't let callback errors crash the watchdog
        console.error('Error in watchdog warning callback:', error);
      }
    }
  }
}

/**
 * Start the event loop watchdog with the given configuration
 */
export function startEventLoopWatchdog(config: WatchdogConfig = {}): Watchdog {
  const watchdog = new EventLoopWatchdog(config);
  watchdog.start();
  return watchdog;
}
