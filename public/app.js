// SLOE Energy OS Core Application Logic

let activeView = 'command-center';
let currentMode = 'CONTRACTED_OPS';
let primaryOpsChart = null;

// Initial Setup
document.addEventListener('DOMContentLoaded', () => {
  renderOpsChart();
  renderHeatmap();
  renderTableData();
});

// Navigation Router
function navigateTo(viewId) {
  activeView = viewId;

  // Update Page Title
  const titleMap = {
    'command-center': 'Command Center',
    'operations': 'Operations Workspace',
    'ai-agents': 'AI Agents Workspace',
    'integrations': 'Integrations (Composio)',
    'settings': 'Settings'
  };

  const pageTitle = document.getElementById('topbar-page-title');
  if (pageTitle) pageTitle.innerText = titleMap[viewId] || 'Workspace';

  // Toggle Screen Views
  document.querySelectorAll('.view-screen').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

  const targetView = document.getElementById(`view-${viewId}`);
  const targetNav = document.getElementById(`nav-${viewId}`) || document.getElementById(`nav-bess-fleet`);

  if (targetView) targetView.classList.add('active');
  if (targetNav) targetNav.classList.add('active');
}

// Mode Selector (Contracted vs Merchant)
function switchMode(mode) {
  currentMode = mode;
  document.body.className = `mode-${mode.toLowerCase()}`;

  const btnContracted = document.getElementById('pill-contracted');
  const btnMerchant = document.getElementById('pill-merchant');

  if (btnContracted) btnContracted.classList.toggle('active', mode === 'CONTRACTED_OPS');
  if (btnMerchant) btnMerchant.classList.toggle('active', mode === 'MERCHANT_MARKET');

  const title = document.getElementById('ops-banner-title');
  const desc = document.getElementById('ops-banner-desc');
  const kpi1Label = document.getElementById('kpi1-label');
  const kpi1Val = document.getElementById('kpi1-val');
  const kpi2Label = document.getElementById('kpi2-label');
  const kpi2Val = document.getElementById('kpi2-val');

  if (mode === 'CONTRACTED_OPS') {
    if (title) title.innerText = '📜 Contracted Asset Operations Mode';
    if (desc) desc.innerText = 'Focusing on Availability SLAs, Thermal Envelope Safety, State of Health (SoH) Fade Curves, and OEM Warranty Limits.';
    if (kpi1Label) kpi1Label.innerText = 'AVAILABILITY SLA';
    if (kpi1Val) kpi1Val.innerText = '99.8%';
    if (kpi2Label) kpi2Label.innerText = 'SYSTEM SOH';
    if (kpi2Val) kpi2Val.innerText = '97.4%';
  } else {
    if (title) title.innerText = '📈 Merchant Market Operations Mode';
    if (desc) desc.innerText = 'Focusing on Real-Time ERCOT/CAISO LMP Bidding, Net Arbitrage Spreads, Marginal Cycling Costs, and Quant Forecasts.';
    if (kpi1Label) kpi1Label.innerText = 'NET ARBITRAGE SPREAD';
    if (kpi1Val) kpi1Val.innerText = '$184.20 / MWh';
    if (kpi2Label) kpi2Label.innerText = 'LIVE LMP PRICE';
    if (kpi2Val) kpi2Val.innerText = '$248.50';
  }

  updateOpsChart();
  renderTableData();
}

// Render Operations Chart
function renderOpsChart() {
  const ctx = document.getElementById('primaryOpsChart')?.getContext('2d');
  if (!ctx) return;

  primaryOpsChart = new Chart(ctx, {
    type: 'line',
    data: getOpsChartData(currentMode),
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
      },
      plugins: {
        legend: { labels: { color: '#f8fafc' } }
      }
    }
  });
}

function updateOpsChart() {
  if (primaryOpsChart) {
    primaryOpsChart.data = getOpsChartData(currentMode);
    primaryOpsChart.update();
  }
}

function getOpsChartData(mode) {
  const labels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:59'];
  if (mode === 'CONTRACTED_OPS') {
    return {
      labels,
      datasets: [
        { label: 'System SoH (%)', data: [98.5, 98.4, 98.1, 97.9, 97.6, 97.4, 97.4], borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true },
        { label: 'OEM Warranty Ceiling', data: [95, 95, 95, 95, 95, 95, 95], borderColor: '#ef4444', borderDash: [5, 5] }
      ]
    };
  } else {
    return {
      labels,
      datasets: [
        { label: 'Real-Time LMP ($/MWh)', data: [22, 18, 45, 12, 180, 248, 65], borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.15)', fill: true }
      ]
    };
  }
}

function renderHeatmap() {
  const container = document.getElementById('heatmap-grid');
  if (!container) return;
  container.innerHTML = '';

  for (let i = 1; i <= 12; i++) {
    const temp = (34 + Math.random() * 8).toFixed(1);
    const soc = Math.floor(40 + Math.random() * 55);
    const cell = document.createElement('div');
    cell.style.cssText = 'background:#080a0f; border:1px solid #161b26; padding:0.5rem; border-radius:6px; font-size:0.75rem;';
    cell.innerHTML = `
      <div style="color:#94a3b8; display:flex; justify-content:space-between;">
        <span>BESS #${i}</span>
        <span>${soc}%</span>
      </div>
      <div style="color:#10b981; font-weight:bold; font-size:0.95rem; margin-top:0.2rem;">${temp}°C</div>
    `;
    container.appendChild(cell);
  }
}

function renderTableData() {
  const headers = document.getElementById('table-headers');
  const rows = document.getElementById('table-rows');
  if (!headers || !rows) return;

  if (currentMode === 'CONTRACTED_OPS') {
    headers.innerHTML = `<th>Ticket ID</th><th>Asset Unit</th><th>Diagnostic Trigger</th><th>Agent Action</th><th>Status</th>`;
    rows.innerHTML = `
      <tr>
        <td style="font-weight:bold; color:#fff;">#WO-9081</td>
        <td>Container #3</td>
        <td>Thermal Spike (42.1°C)</td>
        <td style="color:#10b981;">Curtail Charge to 0.5C</td>
        <td><span style="color:#3b82f6;">Active</span></td>
      </tr>
      <tr>
        <td style="font-weight:bold; color:#fff;">#WO-9082</td>
        <td>PV Inverter #8</td>
        <td>Efficiency Drop (-4.2%)</td>
        <td style="color:#10b981;">Calibrate Dust Sensor</td>
        <td><span style="color:#f59e0b;">Scheduled</span></td>
      </tr>
    `;
  } else {
    headers.innerHTML = `<th>Bid ID</th><th>Market Node</th><th>Volume (MW)</th><th>Target LMP ($)</th><th>Status</th>`;
    rows.innerHTML = `
      <tr>
        <td style="font-weight:bold; color:#fff;">#BID-4491</td>
        <td>ERCOT South Zone</td>
        <td>25 MW (Discharge)</td>
        <td style="color:#10b981;">$248.50 / MWh</td>
        <td><span style="color:#10b981;">Executed</span></td>
      </tr>
      <tr>
        <td style="font-weight:bold; color:#fff;">#BID-4492</td>
        <td>ERCOT North Zone</td>
        <td>40 MW (Charge)</td>
        <td style="color:#10b981;">$18.20 / MWh</td>
        <td><span style="color:#3b82f6;">Pending</span></td>
      </tr>
    `;
  }
}

function handleGlobalSearch(e) {
  if (e.key === 'Enter') {
    alert(`Searching Sloe Energy OS for: "${e.target.value}"`);
  }
}
