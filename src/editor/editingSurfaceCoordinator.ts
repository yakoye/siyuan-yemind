export type EditingSurfaceOwner = 'none' | 'canvas' | 'outline';

export interface EditingSurfaceTicket<T> {
  generation: number;
  request: T;
}

export interface EditingSurfaceTransition {
  previousOwner: EditingSurfaceOwner;
  owner: EditingSurfaceOwner;
  cancelledPending: boolean;
}

/**
 * Coordinates the two text-editing surfaces used by split mode.
 *
 * Only explicit outline commands may create a focus restoration ticket.
 * Canvas ownership always invalidates that ticket, so a later model patch
 * cannot resurrect a previously edited outline row.
 */
export class EditingSurfaceCoordinator<T> {
  private currentOwner: EditingSurfaceOwner = 'none';
  private generation = 0;
  private currentPending: EditingSurfaceTicket<T> | null = null;

  get owner(): EditingSurfaceOwner {
    return this.currentOwner;
  }

  get pending(): EditingSurfaceTicket<T> | null {
    return this.currentPending;
  }

  claimOutline(): EditingSurfaceTransition {
    const previousOwner = this.currentOwner;
    this.currentOwner = 'outline';
    return {
      previousOwner,
      owner: this.currentOwner,
      cancelledPending: false,
    };
  }

  claimCanvas(): EditingSurfaceTransition {
    const previousOwner = this.currentOwner;
    const cancelledPending = Boolean(this.currentPending);
    this.currentOwner = 'canvas';
    this.generation += 1;
    this.currentPending = null;
    return { previousOwner, owner: this.currentOwner, cancelledPending };
  }

  release(): EditingSurfaceTransition {
    const previousOwner = this.currentOwner;
    const cancelledPending = Boolean(this.currentPending);
    this.currentOwner = 'none';
    this.generation += 1;
    this.currentPending = null;
    return { previousOwner, owner: this.currentOwner, cancelledPending };
  }

  queueOutline(request: T): EditingSurfaceTicket<T> {
    this.currentOwner = 'outline';
    const ticket = {
      generation: ++this.generation,
      request,
    };
    this.currentPending = ticket;
    return ticket;
  }

  clearPending(): boolean {
    if (!this.currentPending) return false;
    this.generation += 1;
    this.currentPending = null;
    return true;
  }

  isCurrent(ticket: EditingSurfaceTicket<T> | null | undefined): boolean {
    return Boolean(
      ticket &&
        this.currentOwner === 'outline' &&
        this.currentPending === ticket &&
        ticket.generation === this.generation,
    );
  }

  take(ticket: EditingSurfaceTicket<T>): T | null {
    if (!this.isCurrent(ticket)) return null;
    this.currentPending = null;
    return ticket.request;
  }

  takeCurrent(): T | null {
    const ticket = this.currentPending;
    return ticket ? this.take(ticket) : null;
  }
}
