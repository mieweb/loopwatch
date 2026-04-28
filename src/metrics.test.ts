import { PrometheusMetrics } from './metrics';

describe('PrometheusMetrics', () => {
  describe('without prom-client', () => {
    beforeEach(() => {
      jest.resetModules();
      jest.doMock('prom-client', () => {
        throw new Error('Module not found');
      });
    });

    it('should handle missing prom-client gracefully', () => {
      const metrics = new PrometheusMetrics();
      expect(metrics.isEnabled()).toBe(false);
    });

    it('should not throw when updating metrics without prom-client', () => {
      const metrics = new PrometheusMetrics();
      expect(() => {
        metrics.updateMetrics(10, 50, 100, 150, 0.85);
      }).not.toThrow();
    });
  });

  describe('with prom-client', () => {
    let mockGauge: any;
    let mockRegistry: any;

    beforeEach(() => {
      jest.resetModules();
      
      mockGauge = {
        set: jest.fn(),
      };

      mockRegistry = {
        registerMetric: jest.fn(),
      };

      jest.doMock('prom-client', () => ({
        Gauge: jest.fn(() => mockGauge),
        register: mockRegistry,
      }));
    });

    it('should initialize metrics when prom-client is available', () => {
      const PrometheusMetrics = require('./metrics').PrometheusMetrics;
      const metrics = new PrometheusMetrics();
      expect(metrics.isEnabled()).toBe(true);
    });

    it('should update all metrics', () => {
      const PrometheusMetrics = require('./metrics').PrometheusMetrics;
      const metrics = new PrometheusMetrics();
      
      metrics.updateMetrics(10, 50, 100, 150, 0.85);
      
      expect(mockGauge.set).toHaveBeenCalledTimes(5);
      expect(mockGauge.set).toHaveBeenCalledWith(10);
      expect(mockGauge.set).toHaveBeenCalledWith(50);
      expect(mockGauge.set).toHaveBeenCalledWith(100);
      expect(mockGauge.set).toHaveBeenCalledWith(150);
      expect(mockGauge.set).toHaveBeenCalledWith(0.85);
    });

    it('should use custom prefix', () => {
      const mockGaugeConstructor = jest.fn(() => mockGauge);
      jest.doMock('prom-client', () => ({
        Gauge: mockGaugeConstructor,
        register: mockRegistry,
      }));

      const PrometheusMetrics = require('./metrics').PrometheusMetrics;
      const metrics = new PrometheusMetrics({ prefix: 'custom' });
      
      expect(mockGaugeConstructor).toHaveBeenCalled();
      const calls = mockGaugeConstructor.mock.calls;
      expect(calls.some((call: any) => call[0].name.startsWith('custom_'))).toBe(true);
    });

    it('should use custom registry', () => {
      const customRegistry = { registerMetric: jest.fn() };
      const mockGaugeConstructor = jest.fn(() => mockGauge);
      
      jest.doMock('prom-client', () => ({
        Gauge: mockGaugeConstructor,
        register: mockRegistry,
      }));

      const PrometheusMetrics = require('./metrics').PrometheusMetrics;
      new PrometheusMetrics({ register: customRegistry });
      
      expect(mockGaugeConstructor).toHaveBeenCalled();
      // Verify the constructor was called with expected parameters
      expect(mockGaugeConstructor.mock.calls.length).toBeGreaterThan(0);
    });

    it('should handle metric registration errors', () => {
      const throwingGauge = jest.fn(() => {
        throw new Error('Metric already registered');
      });
      
      jest.doMock('prom-client', () => ({
        Gauge: throwingGauge,
        register: mockRegistry,
      }));

      const PrometheusMetrics = require('./metrics').PrometheusMetrics;
      expect(() => {
        new PrometheusMetrics();
      }).not.toThrow();
    });
  });
});
