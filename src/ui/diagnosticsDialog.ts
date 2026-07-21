import { Dialog, showMessage } from 'siyuan';
import type { DiagnosticsService } from '../diagnostics/DiagnosticsService';
import { downloadDiagnosticsArchive } from '../diagnostics/DiagnosticsService';
import type { SelfCheckReport } from '../diagnostics/selfCheck';

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function renderReport(report: SelfCheckReport | null): string {
  if (!report) return '<div class="ymz-diagnostics-empty">尚未运行回归检查。</div>';
  const label = report.status === 'pass' ? '全部通过' : report.status === 'warning' ? '完成，但有警告' : '存在失败项';
  return `<div class="ymz-diagnostics-summary" data-status="${report.status}">
    <b>${label}</b><span>${report.items.length} 项</span>
  </div>
  <div class="ymz-diagnostics-list">${report.items.map((item) => `<div class="ymz-diagnostics-check" data-status="${item.status}">
    <span class="ymz-diagnostics-check__mark">${item.status === 'pass' ? '✓' : item.status === 'warning' ? '!' : '×'}</span>
    <div><b>${escapeHtml(item.id)}</b><p>${escapeHtml(item.summary)}</p></div>
  </div>`).join('')}</div>`;
}

function renderSearchState(service: DiagnosticsService): string {
  const state = service.getGlobalSearchState();
  const navigation = state.lastNavigationSuccess === null ? '未完成' : state.lastNavigationSuccess ? '成功' : '失败';
  return `<div class="ymz-diagnostics-search" data-status="${state.lastNavigationSuccess === false ? 'fail' : state.observed ? 'pass' : 'idle'}">
    <header><b>全局搜索链路</b><span>${state.observed ? '已记录' : '尚未记录'}</span></header>
    <dl>
      <div><dt>思源 / YeMind 结果</dt><dd>${state.nativeResultCount} / ${state.yemindResultCount}</dd></div>
      <div><dt>列表 / 预览</dt><dd>${state.listMounted ? '已挂载' : '未挂载'} / ${state.previewVisible ? '可见' : '不可见'}</dd></div>
      <div><dt>最后步骤</dt><dd>${escapeHtml(state.lastNavigationStep)}</dd></div>
      <div><dt>导航结果</dt><dd>${navigation}</dd></div>
    </dl>
    ${state.lastFailure ? `<p>${escapeHtml(state.lastFailure)}</p>` : ''}
  </div>`;
}

export function openDiagnosticsDialog(service: DiagnosticsService): void {
  const dialog = new Dialog({
    title: 'YeMind Zen 诊断与回归',
    width: '760px',
    content: `<div class="b3-dialog__content ymz-diagnostics">
      <p class="ymz-diagnostics-note">全部检查在本机执行。默认诊断包不包含导图标题、节点正文、批注、链接或图片数据。</p>
      <div class="ymz-diagnostics-workflow"><b>复现问题的推荐步骤</b><span>开始记录 → 复现问题 → 立即标记问题发生 → 导出诊断包</span></div>
      <div class="ymz-diagnostics-actions">
        <button class="b3-button b3-button--text" data-diagnostics-action="run">运行回归检查</button>
        <button class="b3-button b3-button--outline" data-diagnostics-action="record">${service.isRecording() ? '停止记录' : '开始记录'}</button>
        <button class="b3-button b3-button--outline" data-diagnostics-action="mark">标记问题发生</button>
        <button class="b3-button b3-button--outline" data-diagnostics-action="export">导出诊断包</button>
        <button class="b3-button b3-button--outline" data-diagnostics-action="clear">清空日志</button>
      </div>
      <label class="ymz-diagnostics-sensitive"><input type="checkbox" data-role="include-node-text"> 包含导图标题与节点文字（可能包含隐私，仅排查内容问题时勾选）</label>
      <div data-role="diagnostics-search-state">${renderSearchState(service)}</div>
      <div data-role="diagnostics-report">${renderReport(service.getLastSelfCheck())}</div>
      <div class="ymz-diagnostics-log-count" data-role="diagnostics-log-count"></div>
    </div>
    <div class="b3-dialog__action"><button class="b3-button" data-diagnostics-action="close">关闭</button></div>`,
  });
  let busy = false;
  const reportEl = dialog.element.querySelector<HTMLElement>('[data-role="diagnostics-report"]');
  const searchStateEl = dialog.element.querySelector<HTMLElement>('[data-role="diagnostics-search-state"]');
  const logCountEl = dialog.element.querySelector<HTMLElement>('[data-role="diagnostics-log-count"]');
  const includeTextEl = dialog.element.querySelector<HTMLInputElement>('[data-role="include-node-text"]');
  const recordButton = dialog.element.querySelector<HTMLButtonElement>('[data-diagnostics-action="record"]');
  const refreshCount = (): void => {
    const session = service.buildReport().session;
    if (logCountEl) logCountEl.textContent = `运行日志：${session.eventCount} 条 · ${session.recording ? '正在记录' : '已停止'}`;
    if (recordButton) recordButton.textContent = session.recording ? '停止记录' : '开始记录';
    if (searchStateEl) searchStateEl.innerHTML = renderSearchState(service);
  };
  refreshCount();

  dialog.element.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-diagnostics-action]');
    if (!button || busy) return;
    const action = button.dataset.diagnosticsAction;
    if (action === 'close') {
      dialog.destroy();
      return;
    }
    void (async () => {
      busy = true;
      dialog.element.querySelectorAll<HTMLButtonElement>('[data-diagnostics-action]').forEach((item) => { item.disabled = true; });
      try {
        if (action === 'run') {
          if (reportEl) reportEl.innerHTML = '<div class="ymz-diagnostics-empty">正在运行临时存储与导图生命周期检查……</div>';
          const report = await service.runSelfCheck();
          if (reportEl) reportEl.innerHTML = renderReport(report);
          showMessage(report.status === 'fail' ? '回归检查发现失败项' : '回归检查完成', 3500, report.status === 'fail' ? 'error' : 'info');
        } else if (action === 'record') {
          if (service.isRecording()) service.stop(); else service.start();
        } else if (action === 'mark') {
          const marker = service.markProblem('用户标记的问题时刻');
          showMessage(`已标记问题时刻：${new Date(marker.timestamp).toLocaleTimeString()}`, 3500, 'info');
        } else if (action === 'export') {
          const archive = await service.buildArchive(Boolean(includeTextEl?.checked));
          downloadDiagnosticsArchive(archive.blob, archive.filename);
          showMessage('诊断包已导出');
        } else if (action === 'clear') {
          service.clear();
          if (reportEl) reportEl.innerHTML = renderReport(null);
          showMessage('诊断日志已清空');
        }
      } catch (error) {
        service.recordError('diagnostics', `dialog-${action}-failed`, error, undefined, true);
        console.error('[YeMind Zen] diagnostics action failed', error);
        showMessage('诊断操作失败，请查看控制台', 5000, 'error');
      } finally {
        busy = false;
        dialog.element.querySelectorAll<HTMLButtonElement>('[data-diagnostics-action]').forEach((item) => { item.disabled = false; });
        refreshCount();
      }
    })();
  });
}
