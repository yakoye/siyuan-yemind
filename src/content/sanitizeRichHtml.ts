const BLOCKED_ELEMENTS = 'script,style,iframe,object,embed,meta,link,base,form,input,button,textarea,select,option';

function isUnsafeUrl(value: string, attributeName: string): boolean {
  const normalized = value.trim().replace(/[\u0000-\u001f\u007f\s]+/g, '').toLowerCase();
  if (!normalized) return false;
  if (normalized.startsWith('javascript:') || normalized.startsWith('vbscript:')) return true;
  if (!normalized.startsWith('data:')) return false;
  return attributeName === 'src' ? !normalized.startsWith('data:image/') : true;
}

/**
 * Keep the small rich-text subset used by notes while removing executable HTML.
 * The sanitizer intentionally preserves data:image URLs because pasted note images
 * are stored locally in the mind-map data.
 */
export function sanitizeRichHtml(value: string): string {
  const source = String(value ?? '');
  if (typeof document === 'undefined') {
    return source
      .replace(/<(script|style|iframe|object|embed|meta|link|base|form|input|button|textarea|select|option)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
      .replace(/<(script|style|iframe|object|embed|meta|link|base|form|input|button|textarea|select|option)\b[^>]*\/?\s*>/gi, '')
      .replace(/\s+on[a-z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/\s+(href|src)\s*=\s*(["'])\s*(?:javascript|vbscript):[\s\S]*?\2/gi, '');
  }

  const template = document.createElement('template');
  template.innerHTML = source;
  template.content.querySelectorAll(BLOCKED_ELEMENTS).forEach((node) => node.remove());
  template.content.querySelectorAll<HTMLElement>('*').forEach((node) => {
    Array.from(node.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      if (name.startsWith('on') || name === 'srcdoc') {
        node.removeAttribute(attribute.name);
        return;
      }
      if ((name === 'href' || name === 'src' || name === 'xlink:href') && isUnsafeUrl(attribute.value, name === 'xlink:href' ? 'href' : name)) {
        node.removeAttribute(attribute.name);
        return;
      }
      if (name === 'style' && /(url\s*\(|expression\s*\(|javascript:|vbscript:|@import)/i.test(attribute.value)) {
        node.removeAttribute(attribute.name);
      }
    });
    if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });
  return template.innerHTML;
}
