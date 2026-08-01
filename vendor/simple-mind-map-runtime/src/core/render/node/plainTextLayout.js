const finiteMetric = (name, value) => {
  const metric = Number(value)
  if (!Number.isFinite(metric) || metric < 0) {
    throw new TypeError(`${name} must be a finite non-negative number`)
  }
  return metric
}

const textLines = value => {
  if (!Array.isArray(value)) {
    throw new TypeError('text layout lines must be arrays')
  }
  return value.map(line => String(line ?? ''))
}

/**
 * Explicit geometry contract for a plain-text node.
 *
 * Historically `data-width` represented the painted ink, the wrapping
 * boundary, the content box and the live editor width at different call
 * sites. Keeping those meanings separate is required before static SVG and
 * live HTML text can share one layout engine.
 */
export const createPlainTextLayoutResult = ({
  node,
  inkWidth,
  wrapWidth,
  contentWidth,
  height,
  hardLines,
  visualLines,
  autoWrapped
}) => {
  const normalizedInkWidth = finiteMetric('inkWidth', inkWidth)
  const normalizedWrapWidth = finiteMetric('wrapWidth', wrapWidth)
  const normalizedContentWidth = finiteMetric('contentWidth', contentWidth)
  const normalizedHeight = finiteMetric('height', height)
  if (normalizedContentWidth > normalizedWrapWidth + 0.001) {
    throw new RangeError('contentWidth must not exceed wrapWidth')
  }
  return {
    node,
    inkWidth: normalizedInkWidth,
    wrapWidth: normalizedWrapWidth,
    contentWidth: normalizedContentWidth,
    // Compatibility for all existing simple-mind-map callers. New code must
    // use the named metric that matches its purpose.
    width: normalizedContentWidth,
    height: normalizedHeight,
    hardLines: textLines(hardLines),
    visualLines: textLines(visualLines),
    autoWrapped: Boolean(autoWrapped)
  }
}

export const applyPlainTextLayoutAttributes = (group, layout) => {
  group.attr({
    'data-width': layout.contentWidth,
    'data-height': layout.height,
    'data-ink-width': layout.inkWidth,
    'data-wrap-width': layout.wrapWidth,
    'data-content-width': layout.contentWidth,
    'data-auto-wrapped': layout.autoWrapped
  })
  return group
}
