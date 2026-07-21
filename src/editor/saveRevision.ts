/** Tracks autosave revisions so stale async completions cannot report current data as saved. */
export class SaveRevisionTracker {
  private latestRevision = 0;
  private savedRevision = 0;

  markChanged(): number {
    this.latestRevision += 1;
    return this.latestRevision;
  }

  current(): number {
    return this.latestRevision;
  }

  markSaved(revision: number): boolean {
    if (revision !== this.latestRevision) return false;
    this.savedRevision = Math.max(this.savedRevision, revision);
    return true;
  }

  isDirty(): boolean {
    return this.savedRevision < this.latestRevision;
  }
}
