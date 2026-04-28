import { PrometheusConfig } from './types';

/**
 * Prometheus metrics manager
 * Handles metric registration and updates
 */
export class PrometheusMetrics {
  private promClient: any;
  private registry: any;
  private prefix: string;
  private gauges: Map<string, any> = new Map();

  constructor(config: PrometheusConfig = {}) {
    this.prefix = config.prefix || 'node';
    
    try {
      // Try to load prom-client if available
      this.promClient = require('prom-client');
      this.registry = config.register || this.promClient.register;
      this.initializeMetrics();
    } catch (error) {
      // prom-client not available, metrics disabled
      this.promClient = null;
    }
  }

  private initializeMetrics(): void {
    if (!this.promClient) return;

    const metricDefinitions = [
      {
        name: `${this.prefix}_event_loop_delay_p50_ms`,
        help: 'Event loop delay p50 in milliseconds',
      },
      {
        name: `${this.prefix}_event_loop_delay_p95_ms`,
        help: 'Event loop delay p95 in milliseconds',
      },
      {
        name: `${this.prefix}_event_loop_delay_p99_ms`,
        help: 'Event loop delay p99 in milliseconds',
      },
      {
        name: `${this.prefix}_event_loop_delay_max_ms`,
        help: 'Event loop delay max in milliseconds',
      },
      {
        name: `${this.prefix}_event_loop_utilization`,
        help: 'Event loop utilization (0-1)',
      },
    ];

    for (const def of metricDefinitions) {
      try {
        const gauge = new this.promClient.Gauge({
          name: def.name,
          help: def.help,
          registers: [this.registry],
        });
        this.gauges.set(def.name, gauge);
      } catch (error) {
        // Metric might already be registered, ignore
      }
    }
  }

  /**
   * Update all metrics with current statistics
   */
  updateMetrics(p50: number, p95: number, p99: number, max: number, elu: number): void {
    if (!this.promClient) return;

    this.gauges.get(`${this.prefix}_event_loop_delay_p50_ms`)?.set(p50);
    this.gauges.get(`${this.prefix}_event_loop_delay_p95_ms`)?.set(p95);
    this.gauges.get(`${this.prefix}_event_loop_delay_p99_ms`)?.set(p99);
    this.gauges.get(`${this.prefix}_event_loop_delay_max_ms`)?.set(max);
    this.gauges.get(`${this.prefix}_event_loop_utilization`)?.set(elu);
  }

  /**
   * Check if Prometheus metrics are enabled
   */
  isEnabled(): boolean {
    return this.promClient !== null;
  }

  /**
   * Get the registry (useful for testing)
   */
  getRegistry(): any {
    return this.registry;
  }
}
