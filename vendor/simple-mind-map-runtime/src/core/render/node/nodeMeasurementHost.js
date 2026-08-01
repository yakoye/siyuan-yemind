const cacheKeys = {
  richtext: 'measureRichtextNodeTextSizeEl',
  custom: 'measureCustomNodeContentSizeEl'
}

const copyMeasurementContext = (host, source) => {
  host.className = `${source.className || ''} smm-node-measurement-host`.trim()
  Array.from(source.attributes || []).forEach(attribute => {
    if (attribute.name.startsWith('data-')) {
      host.setAttribute(attribute.name, attribute.value)
    }
  })
  const computed = window.getComputedStyle(source)
  host.style.fontFamily = computed.fontFamily
  host.style.fontSize = computed.fontSize
  host.style.fontWeight = computed.fontWeight
  host.style.lineHeight = computed.lineHeight
  for (let index = 0; index < computed.length; index++) {
    const property = computed[index]
    if (property.startsWith('--')) {
      host.style.setProperty(property, computed.getPropertyValue(property))
    }
  }
}

const ensureNodeMeasurementHost = mindMap => {
  const cached = mindMap.commonCaches.nodeMeasurementHostEl
  if (cached && cached.isConnected) return cached
  const host = document.createElement('div')
  const context = mindMap.el.closest('.ymz-editor') || mindMap.el
  host.dataset.smmNodeMeasurementHost = 'true'
  host.setAttribute('aria-hidden', 'true')
  Object.assign(host.style, {
    position: 'fixed',
    left: '-100000px',
    top: '0',
    display: 'block',
    width: '10000px',
    height: 'auto',
    overflow: 'visible',
    visibility: 'hidden',
    pointerEvents: 'none',
    zIndex: '-1'
  })
  copyMeasurementContext(host, context)
  document.body.appendChild(host)
  mindMap.commonCaches.nodeMeasurementHostEl = host
  return host
}

export const createNodeMeasurementCache = (mindMap, type) => {
  const key = cacheKeys[type]
  if (!key) throw new Error(`Unknown node measurement cache type: ${type}`)
  const cached = mindMap.commonCaches[key]
  if (cached && cached.isConnected) return cached
  const element = document.createElement('div')
  Object.assign(element.style, {
    position: 'relative',
    left: '0',
    top: '0',
    width: 'max-content',
    height: 'auto'
  })
  ensureNodeMeasurementHost(mindMap).appendChild(element)
  mindMap.commonCaches[key] = element
  return element
}

export const removeNodeMeasurementHost = mindMap => {
  const caches = mindMap.commonCaches
  caches.nodeMeasurementHostEl?.remove()
  caches.nodeMeasurementHostEl = null
  caches.measureRichtextNodeTextSizeEl = null
  caches.measureCustomNodeContentSizeEl = null
}
