import { OtelIntegration } from './otel';
import { EventLoopStats } from './types';

describe('OtelIntegration', () => {
  const mockStats: EventLoopStats = {
    p50: 10,
    p95: 50,
    p99: 100,
    max: 150,
    elu: 0.85,
    timestamp: new Date(),
  };

  describe('without OpenTelemetry', () => {
    beforeEach(() => {
      jest.resetModules();
      jest.doMock('@opentelemetry/api', () => {
        throw new Error('Module not found');
      });
    });

    it('should handle missing OTel gracefully', () => {
      const otel = new OtelIntegration();
      expect(otel.isEnabled()).toBe(false);
    });

    it('should not throw when annotating without OTel', () => {
      const otel = new OtelIntegration();
      expect(() => {
        otel.annotateCurrentSpan(mockStats, true);
      }).not.toThrow();
    });

    it('should not throw when emitting span without OTel', () => {
      const otel = new OtelIntegration();
      expect(() => {
        otel.emitDiagnosticSpan(mockStats, 5);
      }).not.toThrow();
    });
  });

  describe('with OpenTelemetry', () => {
    let mockSpan: any;
    let mockTracer: any;
    let mockApi: any;

    beforeEach(() => {
      jest.resetModules();
      
      mockSpan = {
        setAttributes: jest.fn(),
        end: jest.fn(),
      };

      mockTracer = {
        startSpan: jest.fn(() => mockSpan),
      };

      mockApi = {
        trace: {
          getActiveSpan: jest.fn(() => mockSpan),
          getTracer: jest.fn(() => mockTracer),
        },
      };

      jest.doMock('@opentelemetry/api', () => mockApi);
    });

    it('should be enabled when OTel is available', () => {
      const OtelIntegration = require('./otel').OtelIntegration;
      const otel = new OtelIntegration();
      expect(otel.isEnabled()).toBe(true);
    });

    it('should annotate current span when enabled', () => {
      const OtelIntegration = require('./otel').OtelIntegration;
      const otel = new OtelIntegration({ annotateSpan: true });
      
      otel.annotateCurrentSpan(mockStats, true);
      
      expect(mockSpan.setAttributes).toHaveBeenCalledWith({
        'eventloop.delay.p50': 10,
        'eventloop.delay.p95': 50,
        'eventloop.delay.p99': 100,
        'eventloop.delay.max': 150,
        'eventloop.utilization': 0.85,
        'eventloop.backpressure': true,
      });
    });

    it('should not annotate when disabled', () => {
      const OtelIntegration = require('./otel').OtelIntegration;
      const otel = new OtelIntegration({ annotateSpan: false });
      
      otel.annotateCurrentSpan(mockStats, false);
      
      expect(mockSpan.setAttributes).not.toHaveBeenCalled();
    });

    it('should handle no active span gracefully', () => {
      mockApi.trace.getActiveSpan.mockReturnValue(null);
      
      const OtelIntegration = require('./otel').OtelIntegration;
      const otel = new OtelIntegration({ annotateSpan: true });
      
      expect(() => {
        otel.annotateCurrentSpan(mockStats, true);
      }).not.toThrow();
    });

    it('should emit diagnostic span when enabled', () => {
      const OtelIntegration = require('./otel').OtelIntegration;
      const otel = new OtelIntegration({ emitSpan: true });
      
      otel.emitDiagnosticSpan(mockStats, 5);
      
      expect(mockTracer.startSpan).toHaveBeenCalledWith('event_loop_backpressure', {
        attributes: {
          'eventloop.delay.p50': 10,
          'eventloop.delay.p95': 50,
          'eventloop.delay.p99': 100,
          'eventloop.delay.max': 150,
          'eventloop.utilization': 0.85,
          'eventloop.consecutive_breaches': 5,
        },
      });
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should not emit span when disabled', () => {
      const OtelIntegration = require('./otel').OtelIntegration;
      const otel = new OtelIntegration({ emitSpan: false });
      
      otel.emitDiagnosticSpan(mockStats, 5);
      
      expect(mockTracer.startSpan).not.toHaveBeenCalled();
    });

    it('should default to annotateSpan true and emitSpan false', () => {
      const OtelIntegration = require('./otel').OtelIntegration;
      const otel = new OtelIntegration();
      
      otel.annotateCurrentSpan(mockStats, true);
      expect(mockSpan.setAttributes).toHaveBeenCalled();
      
      mockTracer.startSpan.mockClear();
      otel.emitDiagnosticSpan(mockStats, 5);
      expect(mockTracer.startSpan).not.toHaveBeenCalled();
    });
  });
});
