import MindMap from 'simple-mind-map';
import RichText from 'simple-mind-map/src/plugins/RichText';

MindMap.usePlugin(RichText);

const container = document.querySelector<HTMLElement>('[data-upstream-rich-text-baseline]');

if (!container) throw new Error('Missing upstream rich-text baseline container');

const mindMap = new MindMap({
  el: container,
  fit: true,
  layout: 'logicalStructure',
  openRealtimeRenderOnNodeTextEdit: true,
  enableAutoEnterTextEditWhenKeydown: true,
  customInnerElsAppendTo: null,
  data: {
    data: {
      text: '<p>PCIe RAS 与 LTSSM 状态分析</p><p>错误注入、恢复与链路训练</p>',
      richText: true,
      expand: true,
    },
    children: [{
      data: {
        text: '<p>Event Counter 事件计数器</p>',
        richText: true,
        expand: true,
      },
      children: [],
    }],
  },
});

(window as any).__UPSTREAM_MIND_MAP__ = mindMap;
