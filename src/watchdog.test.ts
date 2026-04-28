import { EventLoopWatchdog, startEventLoopWatchdog } from './watchdog';
import { WarningInfo } from './types';

// Mock perf_hooks
const mockElu = {
  idle: 100,
  active: 900,
  utilization: 0.9,
};

const mockHistogram = {
  enable: jest.fn(),
  disable: jest.fn(),
  reset: jest.fn(),
  percentile: jest.fn(),
  max: 0,
};

jest.mock('perf_hooks', () => ({
  monitorEventLoopDelay: jest.fn(() => mockHistogram),
  performance: {
    eventLoopUtilization: jest.fn(() => mockElu),
  },
}));

describe('EventLoopWatchdog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHistogram.percentile.mockImplementation((p) => {
      if (p === 50) return 10_000_000; // 10ms
      if (p === 95) return 50_000_000; // 50ms
      if (p === 99) return 100_000_000; // 100ms
      return 0;
    });
    mockHistogram.max = 150_000_000; // 150ms
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('constructor and lifecycle', () => {
    it('should create a watchdog with default config', () => {
      const watchdog = new EventLoopWatchdog();
      expect(watchdog).toBeDefined();
    });

    it('should start and stop without errors', () => {
      const watchdog = new EventLoopWatchdog();
      watchdog.start();
      expect(mockHistogram.enable).toHaveBeenCalled();
      
      watchdog.stop();
      expect(mockHistogram.disable).toHaveBeenCalled();
    });

    it('should throw error if started twice', () => {
      const watchdog = new EventLoopWatchdog();
      watchdog.start();
      expect(() => watchdog.start()).toThrow('already running');
      watchdog.stop();
    });

    it('should use startEventLoopWatchdog helper', () => {
      const watchdog = startEventLoopWatchdog();
      expect(watchdog).toBeDefined();
      expect(mockHistogram.enable).toHaveBeenCalled();
      watchdog.stop();
    });
  });

  describe('threshold detection', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should not trigger warning below thresholds', () => {
      const onWarning = jest.fn();
      const watchdog = new EventLoopWatchdog({
        sampleMs: 100,
        lagP95WarnMs: 100, // Higher than mock value
        consecutive: 2,
        onWarning,
      });

      watchdog.start();

      // Advance timers to trigger samples
      jest.advanceTimersByTime(300);

      expect(onWarning).not.toHaveBeenCalled();
      watchdog.stop();
    });

    it('should trigger warning after consecutive breaches', () => {
      const onWarning = jest.fn();
      const watchdog = new EventLoopWatchdog({
        sampleMs: 100,
        lagP95WarnMs: 40, // Lower than mock p95 (50ms)
        consecutive: 3,
        cooldownMs: 0,
        onWarning,
      });

      watchdog.start();

      // Advance enough to trigger 3 consecutive breaches
      jest.advanceTimersByTime(350);

      expect(onWarning).toHaveBeenCalled();
      const warningInfo: WarningInfo = onWarning.mock.calls[0][0];
      expect(warningInfo.lagThresholdBreached).toBe(true);
      expect(warningInfo.consecutiveCount).toBe(3);
      watchdog.stop();
    });

    it('should respect cooldown period', () => {
      const onWarning = jest.fn();
      const watchdog = new EventLoopWatchdog({
        sampleMs: 100,
        lagP95WarnMs: 40,
        consecutive: 2,
        cooldownMs: 500,
        onWarning,
      });

      watchdog.start();

      // First warning
      jest.advanceTimersByTime(250);
      
      const firstCallCount = onWarning.mock.calls.length;
      expect(firstCallCount).toBeGreaterThan(0);

      // Try to trigger another within cooldown
      jest.advanceTimersByTime(300);
      
      // Should still be the same count (cooldown active)
      expect(onWarning.mock.calls.length).toBe(firstCallCount);
      watchdog.stop();
    });

    it('should reset consecutive count when threshold not breached', () => {
      const onWarning = jest.fn();
      let callCount = 0;
      
      // Alternate between breach and no breach
      mockHistogram.percentile.mockImplementation((p) => {
        callCount++;
        if (p === 95) {
          return callCount % 2 === 0 ? 30_000_000 : 60_000_000; // 30ms or 60ms
        }
        return 10_000_000;
      });

      const watchdog = new EventLoopWatchdog({
        sampleMs: 100,
        lagP95WarnMs: 40,
        consecutive: 3,
        onWarning,
      });

      watchdog.start();

      // Advance enough time
      jest.advanceTimersByTime(500);

      // Should not trigger because consecutive count keeps resetting
      expect(onWarning).not.toHaveBeenCalled();
      watchdog.stop();
    });
  });

  describe('statistics', () => {
    it('should return null stats before sampling', () => {
      const watchdog = new EventLoopWatchdog();
      expect(watchdog.getStats()).toBeNull();
    });

    it('should return current stats after sampling', () => {
      jest.useFakeTimers();
      
      const watchdog = new EventLoopWatchdog({ sampleMs: 100 });
      watchdog.start();

      jest.advanceTimersByTime(150);

      const stats = watchdog.getStats();
      expect(stats).not.toBeNull();
      expect(stats?.p50).toBe(10);
      expect(stats?.p95).toBe(50);
      expect(stats?.p99).toBe(100);
      expect(stats?.max).toBe(150);
      watchdog.stop();
      
      jest.useRealTimers();
    });
  });

  describe('error handling', () => {
    it('should handle callback errors gracefully', () => {
      jest.useFakeTimers();
      
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      const onWarning = jest.fn(() => {
        throw new Error('Callback error');
      });

      const watchdog = new EventLoopWatchdog({
        sampleMs: 100,
        lagP95WarnMs: 40,
        consecutive: 2,
        onWarning,
      });

      watchdog.start();
      jest.advanceTimersByTime(250);

      expect(consoleError).toHaveBeenCalled();
      watchdog.stop();
      consoleError.mockRestore();
      
      jest.useRealTimers();
    });
  });

  describe('configuration', () => {
    it('should apply custom configuration', () => {
      const watchdog = new EventLoopWatchdog({
        sampleMs: 2000,
        lagP95WarnMs: 100,
        eluWarn: 0.95,
        consecutive: 10,
      });

      expect(watchdog).toBeDefined();
    });

    it('should handle ELU threshold', () => {
      jest.useFakeTimers();
      
      const onWarning = jest.fn();
      const watchdog = new EventLoopWatchdog({
        sampleMs: 100,
        lagP95WarnMs: 200, // High enough to not trigger
        eluWarn: 0.8, // Lower than mock value (0.9)
        consecutive: 2,
        cooldownMs: 0,
        onWarning,
      });

      watchdog.start();
      jest.advanceTimersByTime(250);

      expect(onWarning).toHaveBeenCalled();
      const warningInfo: WarningInfo = onWarning.mock.calls[0][0];
      expect(warningInfo.eluThresholdBreached).toBe(true);
      watchdog.stop();
      
      jest.useRealTimers();
    });
  });
});
