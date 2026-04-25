import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitTrack } from './submit-track';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { submissionLimiter } from '@/lib/rate-limit';

// Mocks
vi.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    streamSession: {
      findUnique: vi.fn(),
    },
    track: {
      count: vi.fn(),
      aggregate: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(prisma)),
  },
}));

vi.mock('@/lib/rate-limit', () => ({
  submissionLimiter: {
    check: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Map()),
}));

vi.mock('@/lib/twitch-api', () => ({
  isSubscriber: vi.fn().mockResolvedValue(true),
  isVip: vi.fn().mockResolvedValue(false),
  isModerator: vi.fn().mockResolvedValue(false),
}));

describe('submitTrack Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fail if user is not authenticated', async () => {
    (getServerSession as any).mockResolvedValueOnce(null);

    const result = await submitTrack({
      title: 'Test track',
      url: 'https://spotify.com/track/123',
      sessionId: 'session-id',
      trackType: 'LINK',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Unauthorized');
  });

  it('should fail if session is not active', async () => {
    (getServerSession as any).mockResolvedValueOnce({ user: { id: 'user-id' } });
    (prisma.streamSession.findUnique as any).mockResolvedValueOnce({
      status: 'ENDED',
    });

    const result = await submitTrack({
      title: 'Test track',
      url: 'https://spotify.com/track/123',
      sessionId: 'session-id',
      trackType: 'LINK',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('is not active');
  });

  it('should fail if rate limit is exceeded', async () => {
    (getServerSession as any).mockResolvedValueOnce({ user: { id: 'user-id' } });
    (submissionLimiter.check as any).mockResolvedValueOnce(false);

    const result = await submitTrack({
      title: 'Test track',
      url: 'https://spotify.com/track/123',
      sessionId: 'session-id',
      trackType: 'LINK',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Rate limit exceeded');
  });
});
