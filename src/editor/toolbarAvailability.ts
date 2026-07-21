export interface ToolbarAvailabilityInput {
  readonly: boolean;
  selectedCount: number;
  primaryIsRoot: boolean;
  primaryIsGeneralization: boolean;
  hasRemovableSelection?: boolean;
}

export interface ToolbarAvailability {
  undo: boolean;
  redo: boolean;
  addChild: boolean;
  addSibling: boolean;
  remove: boolean;
  resetLayout: boolean;
  layout: boolean;
}

export function createToolbarAvailability(input: ToolbarAvailabilityInput): ToolbarAvailability {
  const editable = !input.readonly;
  const hasSelection = input.selectedCount > 0;
  const regularPrimary = hasSelection && !input.primaryIsGeneralization;
  const removable = input.hasRemovableSelection ?? (hasSelection && !input.primaryIsRoot);
  return {
    undo: editable,
    redo: editable,
    addChild: editable && regularPrimary,
    addSibling: editable && regularPrimary && !input.primaryIsRoot,
    remove: editable && removable,
    resetLayout: editable,
    layout: editable,
  };
}
