import AssociativeLine from 'simple-mind-map/src/plugins/AssociativeLine';

const BaseAssociativeLine = AssociativeLine as any;

/**
 * Keeps the upstream editable Bézier relation-line implementation while
 * hardening its delayed target-probe lifecycle. The upstream probe is
 * throttled, so one final invocation can arrive after a line has already been
 * completed or cancelled; guarding that stale invocation prevents it from
 * dereferencing a cleared creatingStartNode.
 */
export default class YeMindAssociativeLine extends BaseAssociativeLine {
  checkOverlapNode(x: number, y: number): void {
    if (!this.isCreatingLine || !this.creatingStartNode || !this.mindMap?.renderer?.root) return;
    super.checkOverlapNode(x, y);
  }

  completeCreateLine(node: any): void {
    if (!this.isCreatingLine || !this.creatingStartNode || !node) return;
    super.completeCreateLine(node);
  }

  cancelCreateLine(): void {
    if (!this.isCreatingLine && !this.creatingLine) return;
    super.cancelCreateLine();
  }
}
