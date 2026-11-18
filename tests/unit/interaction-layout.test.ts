import { describe, expect, it } from 'vitest';
import { ACTION_SEAL_MIN_CLEARANCE, ACTION_SEAL_Y, ENVELOPE_SETTINGS_TOP_Y } from '../../src/app/interaction-layout';

describe('in-world action seal layout', () => {
  it('keeps title and ending action seals clear above the envelope settings row', () => {
    expect(ACTION_SEAL_Y - ENVELOPE_SETTINGS_TOP_Y).toBeGreaterThanOrEqual(ACTION_SEAL_MIN_CLEARANCE);
  });
});
