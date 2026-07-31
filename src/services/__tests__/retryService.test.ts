import { RetryService } from '../retryService';
import { logger } from '../../config/logger';

jest.mock('../../config/logger');

describe('RetryService', () => {
  let retryService: RetryService;

  beforeEach(() => {
    retryService = new RetryService();
    jest.clearAllMocks();
  });

  describe('getRetryDelayMs', () => {
    it('should return 24 hours for attempt 1', () => {
      const delayMs = retryService.getRetryDelayMs(1);
      expect(delayMs).toBe(24 * 60 * 60 * 1000);
    });

    it('should return 48 hours for attempt 2', () => {
      const delayMs = retryService.getRetryDelayMs(2);
      expect(delayMs).toBe(48 * 60 * 60 * 1000);
    });

    it('should return 72 hours for attempt 3', () => {
      const delayMs = retryService.getRetryDelayMs(3);
      expect(delayMs).toBe(72 * 60 * 60 * 1000);
    });

    it('should return 0 for unknown attempt number', () => {
      const delayMs = retryService.getRetryDelayMs(99);
      expect(delayMs).toBe(0);
    });
  });

  describe('retry delays', () => {
    it('should calculate correct delay progression', () => {
      const delay1 = retryService.getRetryDelayMs(1);
      const delay2 = retryService.getRetryDelayMs(2);
      const delay3 = retryService.getRetryDelayMs(3);

      expect(delay2).toBe(delay1 * 2);
      expect(delay3).toBe(delay1 * 3);
    });

    it('should convert delays to hours correctly', () => {
      const delay1Ms = retryService.getRetryDelayMs(1);
      const delay1Hours = delay1Ms / (60 * 60 * 1000);

      expect(delay1Hours).toBe(24);
    });
  });
});