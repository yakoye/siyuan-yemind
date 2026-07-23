import { Dialog, showMessage } from 'siyuan';
import type { DiagnosticsService } from '../diagnostics/DiagnosticsService';
import { downloadDiagnosticsArchive } from '../diagnostics/DiagnosticsService';
import { ROOT_ICON_URL } from '../plugin/constants';
import { RELEASE_INFO, resolveVersionConsistency } from '../releaseInfo';
import { openDiagnosticsDialog } from './diagnosticsDialog';

export interface AboutDialogOptions {
  diagnostics?: DiagnosticsService;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function writeClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const input = document.createElement('textarea');
  input.value = text;
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.append(input);
  input.select();
  document.execCommand('copy');
  input.remove();
}

export function createAboutDialogTemplate(): string {
  return `<div class="ymz-about-dialog">
    <div class="ymz-about-hero">
      <img src="${ROOT_ICON_URL}" alt="YeMind">
      <div><h3>${escapeHtml(RELEASE_INFO.productName)}</h3><p>${escapeHtml(RELEASE_INFO.releaseSummary)}</p></div>
    </div>
    <div class="ymz-settings-group ymz-about-version-card">
      <h3>版本信息</h3>
      <dl class="ymz-about-version-grid">
        <div><dt>当前版本</dt><dd>${escapeHtml(RELEASE_INFO.version)}</dd></div>
        <div><dt>插件声明版本</dt><dd data-about-version="manifest">正在读取…</dd></div>
        <div><dt>运行时代码版本</dt><dd data-about-version="runtime">${escapeHtml(RELEASE_INFO.version)}</dd></div>
        <div><dt>构建版本</dt><dd data-about-version="build">${escapeHtml(RELEASE_INFO.buildVersion)}</dd></div>
        <div><dt>构建标识</dt><dd>${escapeHtml(RELEASE_INFO.buildId)}</dd></div>
        <div><dt>构建时间</dt><dd>${escapeHtml(RELEASE_INFO.buildTime)}</dd></div>
        <div><dt>思源版本</dt><dd data-about-version="siyuan">正在读取…</dd></div>
        <div><dt>开发基线</dt><dd>${escapeHtml(RELEASE_INFO.hostBaseline)}</dd></div>
      </dl>
      <div class="ymz-about-consistency" data-about-consistency="pending">正在检查版本一致性…</div>
    </div>
    <div class="ymz-settings-group ymz-about-highlights">
      <h3>本版更新</h3>
      <ul>${RELEASE_INFO.highlights.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
    </div>
    <div class="ymz-about-actions">
      <button class="b3-button b3-button--outline" data-about-action="copy-version">复制版本信息</button>
      <button class="b3-button b3-button--outline" data-about-action="open-diagnostics">诊断与回归</button>
      <button class="b3-button b3-button--text" data-about-action="export-diagnostics">导出诊断包</button>
    </div>
  </div>`;
}

export function openYeMindAboutDialog(options: AboutDialogOptions = {}): void {
  const dialog = new Dialog({
    title: `关于 ${RELEASE_INFO.productName}`,
    content: createAboutDialogTemplate(),
    width: '680px',
    height: '72vh',
  });
  const shell = dialog.element.querySelector<HTMLElement>('.ymz-about-dialog');
  if (!shell) return;

  const updateVersionInfo = async (): Promise<void> => {
    const consistency = options.diagnostics
      ? await options.diagnostics.getVersionConsistency()
      : resolveVersionConsistency(null);
    const environment = options.diagnostics?.getEnvironmentSnapshot() ?? {};
    const setText = (role: string, value: string): void => {
      const target = shell.querySelector<HTMLElement>(`[data-about-version="${role}"]`);
      if (target) target.textContent = value;
    };
    setText('manifest', consistency.manifest);
    setText('runtime', consistency.runtime);
    setText('build', consistency.build);
    setText('siyuan', String(environment.appVersion ?? 'unknown'));
    const status = shell.querySelector<HTMLElement>('[data-about-consistency]');
    if (status) {
      status.dataset.aboutConsistency = consistency.consistent ? 'pass' : 'fail';
      status.textContent = consistency.consistent
        ? '版本一致：插件声明、运行时代码与构建版本相同。'
        : '版本不一致：可能仍在运行旧缓存代码，请重新安装并重启思源。';
    }
  };
  void updateVersionInfo();

  shell.querySelectorAll<HTMLButtonElement>('[data-about-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.aboutAction;
      void (async () => {
        if (action === 'copy-version') {
          const consistency = options.diagnostics
            ? await options.diagnostics.getVersionConsistency()
            : resolveVersionConsistency(null);
          const environment = options.diagnostics?.getEnvironmentSnapshot() ?? {};
          await writeClipboard([
            `${RELEASE_INFO.productName} ${RELEASE_INFO.version}`,
            `插件声明版本: ${consistency.manifest}`,
            `运行时代码版本: ${consistency.runtime}`,
            `构建版本: ${consistency.build}`,
            `构建标识: ${RELEASE_INFO.buildId}`,
            `构建时间: ${RELEASE_INFO.buildTime}`,
            `思源版本: ${String(environment.appVersion ?? 'unknown')}`,
            `开发基线: ${RELEASE_INFO.hostBaseline}`,
          ].join('\n'));
          showMessage('版本信息已复制');
        } else if (action === 'open-diagnostics') {
          if (!options.diagnostics) return showMessage('诊断服务尚未就绪', 3500, 'error');
          openDiagnosticsDialog(options.diagnostics);
        } else if (action === 'export-diagnostics') {
          if (!options.diagnostics) return showMessage('诊断服务尚未就绪', 3500, 'error');
          const archive = await options.diagnostics.buildArchive(false);
          downloadDiagnosticsArchive(archive.blob, archive.filename);
          showMessage('诊断包已导出');
        }
      })().catch((error) => {
        options.diagnostics?.recordError('about', `${action}-failed`, error, undefined, true);
        showMessage('关于页面操作失败', 4000, 'error');
      });
    });
  });
}
