export const COLOR_SWATCHES = [
  '#5f6368', '#9aa0a6', '#f4f4f4', '#ff4d3d', '#ff7a18', '#ffc400', '#d7e600', '#8ed600', '#43c59e', '#66cbd1', '#58b9e8', '#9aa8ff', '#ce78e8',
  '#3c4043', '#777b80', '#d9d9d9', '#d92d20', '#e04b12', '#f59f00', '#b5c900', '#52b415', '#268c55', '#0c8d96', '#147cae', '#6975db', '#a144bd',
  '#202124', '#4f5358', '#b7b7b7', '#a61b0d', '#bd3408', '#d67a00', '#859900', '#2d7c10', '#1b633d', '#08707c', '#0b5d86', '#4d54a8', '#7d2d91',
  '#000000', '#303134', '#8d8d8d', '#7a1308', '#8e2505', '#a85700', '#586b00', '#245d12', '#174d32', '#07535c', '#074663', '#383d78', '#5b2069',
] as const;

export function colorSwatchesHtml(): string {
  return COLOR_SWATCHES.map((value) => `<button type="button" class="ymz-color-popover__swatch" data-color-value="${value}" style="--ymz-swatch:${value}" title="${value}" aria-label="${value}"></button>`).join('');
}

export function colorPaletteInnerHtml(): string {
  return `<div class="ymz-color-popover__grid">${colorSwatchesHtml()}</div>
    <div class="ymz-color-popover__footer">
      <button type="button" data-color-action="reset">重置默认</button>
      <button type="button" data-color-action="custom">更多颜色</button>
    </div>
    <div class="ymz-color-popover__current" aria-live="polite">
      <label><span>HEX</span><input type="text" spellcheck="false" autocomplete="off" data-color-input="hex" value="" aria-label="十六进制颜色"></label>
      <label><span>RGB</span><input type="text" spellcheck="false" autocomplete="off" data-color-input="rgb" value="" aria-label="RGB 颜色"></label>
      <span class="ymz-sr-only" data-color-readout="hex">默认</span>
      <span class="ymz-sr-only" data-color-readout="rgb">继承颜色</span>
    </div>`;
}
