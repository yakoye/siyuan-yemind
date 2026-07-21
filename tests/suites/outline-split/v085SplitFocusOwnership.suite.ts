import { describe, expect, it } from 'vitest';
import { EditingSurfaceCoordinator } from '../../../src/editor/editingSurfaceCoordinator';

type Request = { uid: string; placement: 'start' | 'end' };

describe('v0.8.5 split-view editing surface ownership', () => {
  it('cancels a stale outline restoration when the canvas becomes the interaction owner', () => {
    const coordinator = new EditingSurfaceCoordinator<Request>();
    coordinator.claimOutline();
    const stale = coordinator.queueOutline({ uid: 'node-a', placement: 'end' });

    const transition = coordinator.claimCanvas();

    expect(transition.previousOwner).toBe('outline');
    expect(transition.cancelledPending).toBe(true);
    expect(coordinator.owner).toBe('canvas');
    expect(coordinator.pending).toBeNull();
    expect(coordinator.isCurrent(stale)).toBe(false);
  });

  it('never invents a restoration ticket for an external canvas structure change', () => {
    const coordinator = new EditingSurfaceCoordinator<Request>();
    coordinator.claimOutline();
    coordinator.claimCanvas();

    expect(coordinator.pending).toBeNull();
    expect(coordinator.takeCurrent()).toBeNull();
  });

  it('preserves an explicit outline-originated insertion ticket until it is consumed', () => {
    const coordinator = new EditingSurfaceCoordinator<Request>();
    coordinator.claimOutline();
    const ticket = coordinator.queueOutline({ uid: 'node-d', placement: 'start' });

    expect(coordinator.isCurrent(ticket)).toBe(true);
    expect(coordinator.take(ticket)).toEqual({ uid: 'node-d', placement: 'start' });
    expect(coordinator.owner).toBe('outline');
    expect(coordinator.pending).toBeNull();
  });

  it('invalidates a scheduled restoration when a newer outline request replaces it', () => {
    const coordinator = new EditingSurfaceCoordinator<Request>();
    coordinator.claimOutline();
    const oldTicket = coordinator.queueOutline({ uid: 'node-a', placement: 'end' });
    const newTicket = coordinator.queueOutline({ uid: 'node-d', placement: 'start' });

    expect(coordinator.isCurrent(oldTicket)).toBe(false);
    expect(coordinator.isCurrent(newTicket)).toBe(true);
    expect(coordinator.take(oldTicket)).toBeNull();
    expect(coordinator.take(newTicket)).toEqual({ uid: 'node-d', placement: 'start' });
  });
});
