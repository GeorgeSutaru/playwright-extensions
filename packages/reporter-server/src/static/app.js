const API = window.API_BASE || '/api/v1';

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString();
}

function formatDuration(end, start) {
  if (!end || !start) return '-';
  const ms = new Date(end) - new Date(start);
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

function statusBadge(status) {
  const cls = {
    passed: 'badge-pass',
    failed: 'badge-fail',
    flaky: 'badge-flaky',
    skipped: 'badge-skipped',
    timedout: 'badge-fail',
  };
  return `<span class="badge ${cls[status] || ''}">${status}</span>`;
}

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': window.apiKey || '',
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

// Dashboard
async function loadDashboard() {
  try {
    const data = await api('/runs?limit=10');
    const runs = data.runs || [];

    const totalTests = runs.reduce((s, r) => s + (r.totalTests || 0), 0);
    const totalPassed = runs.reduce((s, r) => s + (r.passed || 0), 0);
    const totalFailed = runs.reduce((s, r) => s + (r.failed || 0), 0);
    const passRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;

    renderDashboardCharts(runs, passRate, totalTests, totalFailed);
  } catch (err) {
    console.error('Failed to load dashboard:', err);
  }
}

function renderDashboardCharts(runs, passRate, totalTests, totalFailed) {
  const passCtx = document.getElementById('passRateChart');
  if (passCtx && runs.length > 0) {
    const sorted = [...runs].reverse();
    new Chart(passCtx, {
      type: 'line',
      data: {
        labels: sorted.map((r) => formatDate(r.startedAt).split(',')[0]),
        datasets: [
          {
            label: 'Pass Rate %',
            data: sorted.map((r) =>
              r.totalTests > 0 ? Math.round((r.passed / r.totalTests) * 100) : 0
            ),
            borderColor: '#2563eb',
            tension: 0.3,
            fill: false,
          },
        ],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    });
  }

  const recentCtx = document.getElementById('recentRunsChart');
  if (recentCtx && runs.length > 0) {
    const sorted = [...runs].reverse().slice(-10);
    new Chart(recentCtx, {
      type: 'bar',
      data: {
        labels: sorted.map((r) => formatDate(r.startedAt).split(',')[0]),
        datasets: [
          {
            label: 'Passed',
            data: sorted.map((r) => r.passed || 0),
            backgroundColor: '#16a34a',
          },
          {
            label: 'Failed',
            data: sorted.map((r) => r.failed || 0),
            backgroundColor: '#dc2626',
          },
        ],
      },
      options: { responsive: true, scales: { x: { stacked: true }, y: { stacked: true } } },
    });
  }
}

// Runs
let runsOffset = 0;
async function loadRuns() {
  const search = document.getElementById('searchRuns')?.value || '';
  const status = document.getElementById('filterStatus')?.value || '';
  const from = document.getElementById('filterFrom')?.value || '';
  const to = document.getElementById('filterTo')?.value || '';

  const params = new URLSearchParams({ limit: '50', offset: runsOffset.toString() });
  if (status) params.set('status', status);
  if (from) params.set('from', from);
  if (to) params.set('to', to);

  const data = await api(`/runs?${params}`);
  renderRuns(data.runs || [], data.pagination);
}

function renderRuns(runs, pagination) {
  const tbody = document.getElementById('runsBody');
  if (!tbody) return;

  if (runs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No runs found</td></tr>';
    return;
  }

  tbody.innerHTML = runs
    .map((r) => `
      <tr>
        <td><a href="/runs/${r.id}">${r.title || 'Untitled'}</a></td>
        <td>${r.project || '-'}</td>
        <td>${r.totalTests || 0}</td>
        <td><span class="badge badge-pass">${r.passed || 0}</span></td>
        <td><span class="badge badge-fail">${r.failed || 0}</span></td>
        <td><span class="badge badge-flaky">${r.flaky || 0}</span></td>
        <td>${r.skipped || 0}</td>
        <td>${formatDate(r.startedAt)}</td>
        <td>${r.source || 'live'}</td>
      </tr>
    `)
    .join('');
}

// Run Detail
async function loadRunDetail(runId) {
  const data = await api(`/runs/${runId}`);
  const run = data;

  const meta = document.getElementById('runMeta');
  if (meta) {
    meta.innerHTML = `
      <div><span>Title:</span> <strong>${run.title || 'Untitled'}</strong></div>
      <div><span>Project:</span> <strong>${run.project || '-'}</strong></div>
      <div><span>Started:</span> <strong>${formatDate(run.startedAt)}</strong></div>
      <div><span>Tests:</span> <strong>${run.totalTests || 0}</strong></div>
      <div><span>Pass Rate:</strong> ${run.totalTests > 0 ? Math.round((run.passed / run.totalTests) * 100) : 0}%</div>
    `;
  }

  renderTests(data.tests || []);
}

function renderTests(tests) {
  const tbody = document.getElementById('testsBody');
  if (!tbody) return;

  const filter = document.getElementById('filterTestStatus')?.value || '';
  const search = document.getElementById('searchTests')?.value?.toLowerCase() || '';

  const filtered = tests.filter((t) => {
    if (filter && t.status !== filter) return false;
    if (search && !t.title.toLowerCase().includes(search) && !t.file.toLowerCase().includes(search))
      return false;
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No tests match your filters</td></tr>';
    return;
  }

  tbody.innerHTML = filtered
    .map(
      (t) => `
      <tr>
        <td>${t.title}</td>
        <td><code>${t.file}</code>${t.line ? `:${t.line}` : ''}</td>
        <td>${statusBadge(t.status)}</td>
        <td>${t.durationMs ? t.durationMs + 'ms' : '-'}</td>
        <td>${t.retryNum || 0}</td>
        <td>
          <a href="/test/${t.id}" class="btn btn-small btn-primary">History</a>
          ${t.hasTrace ? `<a href="/trace/${t.id}" class="btn btn-small btn-secondary trace-link" target="_blank">Trace</a>` : ''}
        </td>
          ${t.hasTrace ? `<a href="/trace/${t.id}" target="_blank" class="btn btn-small btn-primary">Trace</a>` : ''}
        </td>
      </tr>
    `
    )
    .join('');
}

// Test History
async function loadTestHistory(testId) {
  const data = await api(`/tests/${testId}/history`);

  const info = document.getElementById('testInfo');
  if (info && data.test) {
    info.innerHTML = `
      <div class="run-meta">
        <div><span>Test:</span> <strong>${data.test.title}</strong></div>
        <div><span>File:</span> <strong>${data.test.file}:${data.test.line || '?'}</strong></div>
      </div>
    `;
  }

  const tbody = document.getElementById('historyBody');
  if (!tbody || !data.history) return;

  tbody.innerHTML = data.history
    .map(
      (t) => `
      <tr>
        <td><a href="/runs/${t.runId}">${t.runId}</a></td>
        <td>${statusBadge(t.status)}</td>
        <td>${t.durationMs ? t.durationMs + 'ms' : '-'}</td>
        <td>${t.retryNum || 0}</td>
        <td>${t.errorText ? `<span class="error-text" title="${escapeHtml(t.errorText)}">${escapeHtml(t.errorText.slice(0, 80))}</span>` : '-'}</td>
        <td>
          ${t.hasTrace ? `<a href="/trace/${t.id}" target="_blank" class="btn btn-small btn-primary">Trace</a>` : '-'}
        </td>
      </tr>
    `
    )
    .join('');
}

// Trace Viewer
async function loadTraceViewer(testId) {
  const data = await api(`/tests/${testId}/trace-entries`);
  const entries = data.entries || [];

  const container = document.getElementById('traceTimeline');
  if (!container) return;

  if (entries.length === 0) {
    container.innerHTML = '<p class="empty-state">No trace entries found for this test</p>';
    return;
  }

  container.innerHTML = entries
    .map(
      (e) => `
      <div class="trace-entry ${e.errorText ? 'has-error' : ''}" onclick="viewSnapshot('${e.artifactId}', '${e.fingerprint}')">
        <div class="trace-entry-header">
          <span class="trace-entry-action">${escapeHtml(e.actionType || 'unknown')}</span>
          <span class="trace-entry-duration">${e.durationMs ? e.durationMs + 'ms' : '-'}</span>
        </div>
        <div class="trace-entry-details">
          ${e.selector ? `Selector: <code>${escapeHtml(e.selector)}</code> ` : ''}
          ${e.url ? `URL: ${escapeHtml(e.url.slice(0, 80))} ` : ''}
          ${e.sourceLocation ? `at ${escapeHtml(e.sourceLocation)}` : ''}
        </div>
        ${e.errorText ? `<div class="error-text" style="margin-top:4px;">${escapeHtml(e.errorText.slice(0, 120))}</div>` : ''}
      </div>
    `
    )
    .join('');
}

async function viewSnapshot(artifactId, fingerprint) {
  const section = document.getElementById('snapshotSection');
  if (section) section.style.display = 'block';

  const html = await extractSnapshot(artifactId, fingerprint, 'after');
  const viewer = document.getElementById('snapshotViewer');
  if (viewer) {
    viewer.innerHTML = html || '<p class="empty-state">Snapshot not available</p>';
  }
}

async function extractSnapshot(artifactId, fingerprint, type) {
  try {
    const data = await api(`/snapshots/${artifactId}/${fingerprint}/${type}`);
    return data.html || null;
  } catch {
    return null;
  }
}

function showSnapshot(type) {
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
  event.target.classList.add('active');
}

// Trends
let trendChartInstance = null;
let distChartInstance = null;

async function loadTrends() {
  const from = document.getElementById('trendFrom')?.value || '';
  const to = document.getElementById('trendTo')?.value || '';
  const groupBy = document.getElementById('trendGroupBy')?.value || 'day';

  const params = new URLSearchParams({ groupBy });
  if (from) params.set('from', from);
  if (to) params.set('to', to);

  const data = await api(`/trends?${params}`);
  renderTrendChart(data.timeline || []);
  renderDistributionChart(data.timeline || []);
  loadRecurringFailures(from);
}

function renderTrendChart(timeline) {
  const ctx = document.getElementById('trendChart');
  if (!ctx) return;

  if (trendChartInstance) trendChartInstance.destroy();

  trendChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: timeline.map((t) => t.date),
      datasets: [
        {
          label: 'Pass Rate %',
          data: timeline.map((t) => t.passRate),
          borderColor: '#2563eb',
          tension: 0.3,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true, max: 100 } },
    },
  });
}

function renderDistributionChart(timeline) {
  const ctx = document.getElementById('distributionChart');
  if (!ctx) return;

  if (distChartInstance) distChartInstance.destroy();

  const totals = { passed: 0, failed: 0, flaky: 0, skipped: 0 };
  timeline.forEach((t) => {
    totals.passed += t.passed || 0;
    totals.failed += t.failed || 0;
    totals.flaky += t.flaky || 0;
    totals.skipped += t.skipped || 0;
  });

  distChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Passed', 'Failed', 'Flaky', 'Skipped'],
      datasets: [
        {
          data: [totals.passed, totals.failed, totals.flaky, totals.skipped],
          backgroundColor: ['#16a34a', '#dc2626', '#d97706', '#6b7280'],
        },
      ],
    },
    options: { responsive: true },
  });
}

async function loadRecurringFailures(from) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);

  const data = await api(`/trends/recurring-failures?${params}`);
  const tbody = document.querySelector('#recurringFailures tbody');
  if (!tbody) return;

  const failures = data.failures || [];
  if (failures.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No recurring failures</td></tr>';
    return;
  }

  tbody.innerHTML = failures
    .map(
      (f) => `
      <tr>
        <td>${escapeHtml(f.title)}</td>
        <td><code>${escapeHtml(f.file)}</code></td>
        <td>${f.failure_count}</td>
        <td><span class="error-text" title="${escapeHtml(f.errorText || '')}">${escapeHtml((f.errorText || '').slice(0, 60))}</span></td>
      </tr>
    `
    )
    .join('');
}

// Search
async function searchTraces() {
  const q = document.getElementById('searchQuery')?.value || '';
  const actionType = document.getElementById('searchActionType')?.value || '';

  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (actionType) params.set('actionType', actionType);

  const data = await api(`/traces/search?${params}`);
  const tbody = document.getElementById('searchResults');
  if (!tbody) return;

  const entries = data.entries || [];
  if (entries.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No trace entries found</td></tr>';
    return;
  }

  tbody.innerHTML = entries
    .map(
      (e) => `
      <tr>
        <td>${escapeHtml(e.actionType || '-')}</td>
        <td><code>${escapeHtml(e.selector || '-')}</code></td>
        <td>${e.url ? escapeHtml(e.url.slice(0, 60)) : '-'}</td>
        <td>${e.durationMs ? e.durationMs + 'ms' : '-'}</td>
        <td>${e.errorText ? `<span class="error-text">${escapeHtml(e.errorText.slice(0, 60))}</span>` : '-'}</td>
        <td><code>${e.fingerprint}</code></td>
      </tr>
    `
    )
    .join('');
}

// Diff
async function loadDiff() {
  const fingerprint = document.getElementById('diffFingerprint')?.value || '';
  const runA = document.getElementById('diffRunA')?.value || '';
  const runB = document.getElementById('diffRunB')?.value || '';
  const snapshotType = document.getElementById('diffSnapshotType')?.value || 'after';

  if (!fingerprint || !runA || !runB) {
    alert('Fill in fingerprint, run A, and run B');
    return;
  }

  const params = new URLSearchParams({ fingerprint, runA, runB, snapshotType });
  const data = await api(`/traces/diff?${params}`);

  const result = document.getElementById('diffResult');
  const meta = document.getElementById('diffMeta');
  const snapA = document.getElementById('snapshotA');
  const snapB = document.getElementById('snapshotB');
  const diffText = document.getElementById('diffText');

  if (result) result.style.display = 'block';

  if (meta) {
    meta.innerHTML = data.identical
      ? '<strong>Snapshots are identical</strong> — no differences found.'
      : `<strong>Snapshots differ</strong> — Hash A: ${data.hashA}, Hash B: ${data.hashB}`;
  }

  if (snapA && data.htmlA) snapA.innerHTML = data.htmlA;
  if (snapB && data.htmlB) snapB.innerHTML = data.htmlB;

  if (diffText && data.diff) {
    diffText.innerHTML = data.diff
      .map((part) => {
        const cls = part.added ? 'added' : part.removed ? 'removed' : '';
        return `<span class="${cls}">${escapeHtml(part.value)}</span>`;
      })
      .join('');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;

  if (path === '/') {
    loadDashboard();
  } else if (path === '/runs') {
    loadRuns();
  } else if (path.startsWith('/runs/')) {
    const runId = path.split('/')[2];
    loadRunDetail(runId);
  } else if (path.startsWith('/test/')) {
    const testId = path.split('/')[2];
    loadTestHistory(testId);
  } else if (path === '/trends') {
    loadTrends();
  }

  const searchTests = document.getElementById('searchTests');
  if (searchTests) {
    searchTests.addEventListener('input', () => renderTests(searchTests.dataset.tests ? JSON.parse(searchTests.dataset.tests) : []));
  }

  const filterTestStatus = document.getElementById('filterTestStatus');
  if (filterTestStatus) {
    filterTestStatus.addEventListener('change', () => {
      const runId = window.location.pathname.split('/')[2];
      if (runId) loadRunDetail(runId);
    });
  }
});
