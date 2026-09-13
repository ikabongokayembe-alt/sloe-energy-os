// SLOE Energy OS Interactive Multi-Screen Application Core

let activeView = 'today';
let currentDomain = 'contracted'; // 'contracted' or 'merchant'
let opsChartInstance = null;
let currentCategory = 'all';

// Composio Apps Catalog
const COMPOSIO_CATALOG = [
  { name: 'Modbus TCP / SCADA', cat: 'energy', catLabel: 'ENERGY PROTOCOL', icon: '⚡', desc: 'Ingests real-time cell temperatures, inverter signals, and SoC metrics.', ready: true },
  { name: 'CAISO OASIS API', cat: 'market', catLabel: 'WHOLESALE MARKET', icon: '📈', desc: 'Real-time LMP prices and solar irradiance forecasting for California ISO.', ready: false },
  { name: 'Salesforce Field Service', cat: 'erp', catLabel: 'ENTERPRISE ERP', icon: '💼', desc: 'Auto-dispatches certified technicians and schedules replacement parts.', ready: false },
  { name: 'Slack Ops Alerting', cat: 'comm', catLabel: 'COMMUNICATION', icon: '💬', desc: 'Sends immediate thermal runaway alerts and daily dispatch summaries.', ready: false },
  { name: 'ERCOT Market Gateway', cat: 'market', catLabel: 'WHOLESALE MARKET', icon: '📊', desc: 'Real-time Locational Marginal Price (LMP) feeds and 5-min spot bids.', ready: true },
  { name: 'IBM Maximo Asset Mgmt', cat: 'erp', catLabel: 'ENTERPRISE ERP', icon: '🏗️', desc: 'Syncs SLA availability penalty metrics and long-term asset health records.', ready: false }
];

// Market Domain Configurations
const NAV_CONFIG = {
  contracted: {
    domainBadge: 'CONTRACTED MODE',
    toggleLabel: 'Switch to Merchant Market',
    todayBadge: 'CONTRACTED ASSET OPERATIONS',
    todayDesc: 'Live availability tracking & telemetry-backed exception queue for PPA & Tolling contracts.',
    tool1Name: 'Availability SLA Tracker',
    tool1Desc: 'Monitor 99.8% plant uptime & contract SLAs.',
    tool2Name: 'Thermal Fade Engine',
    tool2Desc: 'Audit CATL/Tesla battery degradation curves.',
    opsNav: [
      { id: 'sla-tracker', icon: '📊', label: 'Availability SLA Tracker' },
      { id: 'thermal-engine', icon: '📉', label: 'Thermal & SoH Fade' }
    ],
    growthNav: [
      { id: 'warranty-guardrail', icon: '📜', label: 'OEM Warranty Guardrail' },
      { id: 'field-dispatch', icon: '🛠️', label: 'O&M Field Dispatch' }
    ],
    queueHead: ['Exception ID', 'Asset Unit', 'Trigger Category', 'Agent Recommendation', 'Severity', 'Action'],
    queueRows: [
      { id: '#EX-9081', unit: 'Container #3', trigger: 'Thermal Spike (42.1°C)', rec: 'Curtail Charge to 0.5C', sev: 'High' },
      { id: '#EX-9082', unit: 'PV Inverter #8', trigger: 'Efficiency Drop (-4.2%)', rec: 'Clean Dust Sensor & Calibrate', sev: 'Medium' },
      { id: '#EX-9083', unit: 'Rack #11', trigger: 'Cell Delta V > 80mV', rec: 'Run Autonomous Balancing Cycle', sev: 'Low' }
    ]
  },
  merchant: {
    domainBadge: 'MERCHANT MODE',
    toggleLabel: 'Switch to Contracted Ops',
    todayBadge: 'MERCHANT MARKET OPERATIONS',
    todayDesc: 'Live 5-minute wholesale ERCOT/CAISO LMP bidding & real-time arbitrage optimization.',
    tool1Name: '5-Min LMP Spot Radar',
    tool1Desc: 'Capture $248.50/MWh ERCOT price spikes.',
    tool2Name: 'Cycling Cost Engine',
    tool2Desc: 'Calculate marginal degradation cost per cycle.',
    opsNav: [
      { id: 'lmp-radar', icon: '⚡', label: 'LMP Spot Arbitrage Radar' },
      { id: 'cycling-margin', icon: '💰', label: 'Cycling Cost & Revenue' }
    ],
    growthNav: [
      { id: 'quant-forecast', icon: '🌤️', label: 'ERCOT/CAISO Quant' },
      { id: 'ppa-hedges', icon: '📜', label: 'Bilateral PPA & Hedges' }
    ],
    queueHead: ['Bid ID', 'Market Node', 'Volume (MW)', 'Target LMP ($)', 'Degradation Cost', 'Action'],
    queueRows: [
      { id: '#BID-4491', unit: 'ERCOT South Zone', trigger: '25 MW (Discharge)', rec: '$248.50 / MWh Target', sev: '$38.10 / MWh' },
      { id: '#BID-4492', unit: 'ERCOT North Zone', trigger: '40 MW (Charge)', rec: '$18.20 / MWh Target', sev: '$38.10 / MWh' },
      { id: '#BID-4493', unit: 'CAISO Ancillary', trigger: '10 MW (Spin Reserve)', rec: '$45.00 / MWh Target', sev: '$12.00 / MWh' }
    ]
  }
};

// Initial Setup
document.addEventListener('DOMContentLoaded', () => {
  renderDynamicNav();
  renderOpsChart();
  renderHeatmap();
  renderTableData();
  renderComposioFeatured();
});

// Router
function navigateTo(viewId) {
  activeView = viewId;
  document.querySelectorAll('.view-screen').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

  const targetView = document.getElementById(`view-${viewId}`);
  const targetNav = document.getElementById(`nav-${viewId}`) || document.getElementById(`nav-today`);

  if (targetView) targetView.classList.add('active');
  if (targetNav) targetNav.classList.add('active');
}

// Domain Switcher
function toggleDomainModal() {
  currentDomain = currentDomain === 'contracted' ? 'merchant' : 'contracted';
  document.body.className = `mode-${currentDomain}`;
  
  renderDynamicNav();
  updateOpsChart();
  renderTableData();
}

function renderDynamicNav() {
  const config = NAV_CONFIG[currentDomain];

  document.getElementById('domain-badge-text').innerText = config.domainBadge;
  document.getElementById('domain-toggle-label').innerText = config.toggleLabel;
  document.getElementById('today-market-badge').innerText = config.todayBadge;
  document.getElementById('today-hero-desc').innerText = config.todayDesc;
  document.getElementById('tool1-name').innerText = config.tool1Name;
  document.getElementById('tool1-desc').innerText = config.tool1Desc;
  document.getElementById('tool2-name').innerText = config.tool2Name;
  document.getElementById('tool2-desc').innerText = config.tool2Desc;

  document.getElementById('dynamic-ops-nav').innerHTML = config.opsNav.map(item => `
    <button type="button" class="nav-item" onclick="navigateTo('operations')">
      <span class="nav-icon">${item.icon}</span>
      <span>${item.label}</span>
    </button>
  `).join('');

  document.getElementById('dynamic-growth-nav').innerHTML = config.growthNav.map(item => `
    <button type="button" class="nav-item" onclick="navigateTo('operations')">
      <span class="nav-icon">${item.icon}</span>
      <span>${item.label}</span>
    </button>
  `).join('');
}

function renderTableData() {
  const headRow = document.getElementById('queue-table-head');
  const bodyRows = document.getElementById('queue-table-body');
  if (!headRow || !bodyRows) return;

  const config = NAV_CONFIG[currentDomain];
  headRow.innerHTML = config.queueHead.map(h => `<th>${h}</th>`).join('');

  bodyRows.innerHTML = config.queueRows.map(r => `
    <tr>
      <td style="font-family:var(--font-mono); font-weight:bold; color:#fff;">${r.id}</td>
      <td>${r.unit}</td>
      <td>${r.trigger}</td>
      <td style="color:var(--emerald-400); font-weight:600;">${r.rec}</td>
      <td><span style="font-size:0.75rem; color:var(--cyan-400); font-weight:bold;">${r.sev}</span></td>
      <td><button class="btn-smoke" onclick="inspectException('${r.id}', '${r.unit}', '${r.trigger}', '${r.rec}')">Inspect →</button></td>
    </tr>
  `).join('');
}

// Inspection Evidence Modal
function inspectException(id, unit, trigger, rec) {
  const modal = document.getElementById('app-modal');
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');
  const footer = document.getElementById('modal-footer');

  title.innerText = `Evidence Inspection: ${id} (${unit})`;
  body.innerHTML = `
    <div style="background:var(--slate-950); padding:0.85rem; border-radius:8px; border:1px solid var(--slate-800);">
      <div style="color:var(--cyan-400); font-family:var(--font-mono); font-size:0.75rem; font-weight:bold;">SCADA TELEMETRY ROOT-CAUSE ANALYSIS</div>
      <div style="font-size:0.95rem; font-weight:bold; color:#fff; margin-top:0.3rem;">${trigger}</div>
    </div>
    <div>
      <strong style="color:#fff;">Agent Assessment:</strong>
      <p style="margin-top:0.25rem;">${rec}. Evaluated against CATL Megapack warranty guidelines and 99.8% Availability SLA requirements.</p>
    </div>
    <div style="display:flex; justify-content:space-between; background:var(--slate-950); padding:0.65rem; border-radius:6px; font-size:0.78rem;">
      <span>Rack Temperature: <strong style="color:var(--amber-500);">42.1 °C</strong></span>
      <span>Cell Delta V: <strong>84 mV</strong></span>
      <span>SoH Health: <strong style="color:var(--emerald-400);">97.4%</strong></span>
    </div>
  `;
  footer.innerHTML = `
    <button class="btn-smoke" onclick="closeModalDirect()">Cancel</button>
    <button class="btn-primary-action" onclick="executeInspectionAction('${id}')">Execute Approved Action</button>
  `;

  modal.classList.add('open');
}

function executeInspectionAction(id) {
  closeModalDirect();
  appendConsoleLine(`[ACTION]: Executed approved action for ${id}. SCADA telemetry reconciled.`, 'action');
  alert(`Action for ${id} executed successfully! SCADA status updated.`);
}

// Composio Integration Modals & Smoke Test
function openComposioModal(appName) {
  const modal = document.getElementById('app-modal');
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');
  const footer = document.getElementById('modal-footer');

  title.innerText = `Connect Integration: ${appName}`;
  body.innerHTML = `
    <p>Connecting <strong>${appName}</strong> via Composio Tool Execution Engine.</p>
    <div class="form-row">
      <label>API Key / OAuth Token</label>
      <input type="password" value="cmp_live_9981293819028319" placeholder="Enter API Key">
    </div>
    <div class="form-row">
      <label>Target Telemetry Webhook URL</label>
      <input type="text" value="https://api.sloelabs.com/v1/composio/webhook" readonly>
    </div>
  `;
  footer.innerHTML = `
    <button class="btn-smoke" onclick="closeModalDirect()">Cancel</button>
    <button class="btn-primary-action" onclick="confirmComposioConnect('${appName}')">Approve & Save Integration</button>
  `;

  modal.classList.add('open');
}

function confirmComposioConnect(appName) {
  closeModalDirect();
  appendConsoleLine(`[COMPOSIO]: Successfully connected ${appName} to SLOE Agent workspace.`, 'action');
  alert(`${appName} successfully authenticated via Composio!`);
  
  const connectedKpi = document.getElementById('int-kpi-connected');
  if (connectedKpi) connectedKpi.innerText = parseInt(connectedKpi.innerText) + 1;
}

function runSmokeTest(appName) {
  appendConsoleLine(`[SMOKE TEST]: Running automated smoke test on ${appName}... Passed 200 OK.`, 'action');
  alert(`Smoke test for ${appName} PASSED! Tools exposed and verified.`);
}

function disconnectApp(appName) {
  if (confirm(`Are you sure you want to disconnect ${appName}?`)) {
    appendConsoleLine(`[COMPOSIO]: Disconnected ${appName}.`, 'action');
    alert(`${appName} disconnected.`);
  }
}

function closeModal(e) {
  if (e.target.classList.contains('modal-overlay')) closeModalDirect();
}

function closeModalDirect() {
  document.getElementById('app-modal')?.classList.remove('open');
}

// Composio Filtering
function filterComposioCategory(catKey) {
  currentCategory = catKey;
  document.querySelectorAll('.pill-chip').forEach(el => el.classList.remove('active'));
  document.getElementById(`chip-${catKey}`)?.classList.add('active');
  renderComposioFeatured();
}

function filterComposioApps() {
  renderComposioFeatured();
}

function renderComposioFeatured() {
  const container = document.getElementById('composio-featured-grid');
  const searchVal = document.getElementById('composio-search-input')?.value.toLowerCase() || '';
  if (!container) return;

  const filtered = COMPOSIO_CATALOG.filter(app => {
    const matchesCat = currentCategory === 'all' || app.cat === currentCategory;
    const matchesSearch = app.name.toLowerCase().includes(searchVal) || app.desc.toLowerCase().includes(searchVal);
    return matchesCat && matchesSearch;
  });

  container.innerHTML = filtered.map(app => `
    <div class="white-featured-card">
      <div class="feat-icon">${app.icon}</div>
      <div class="feat-details">
        <h4>${app.name}</h4>
        <span class="feat-category">${app.catLabel}</span>
        <p>${app.desc}</p>
        ${app.ready ? '<span class="green-ready-text">✓ Ready</span>' : `<button class="btn-connect" onclick="openComposioModal('${app.name}')">+ Connect</button>`}
      </div>
    </div>
  `).join('');
}

// Ops Chart Timeframe Controls
function setOpsTimeframe(tf) {
  document.querySelectorAll('.time-btn').forEach(el => el.classList.remove('active'));
  event.target.classList.add('active');

  appendConsoleLine(`[OPS CHART]: Timeframe adjusted to ${tf}. Re-rendering telemetry graph.`, 'line');
  updateOpsChart();
}

function renderOpsChart() {
  const ctx = document.getElementById('opsChartCanvas')?.getContext('2d');
  if (!ctx) return;

  opsChartInstance = new Chart(ctx, {
    type: 'line',
    data: getOpsChartData(currentDomain),
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
  if (opsChartInstance) {
    opsChartInstance.data = getOpsChartData(currentDomain);
    opsChartInstance.update();
  }
}

function getOpsChartData(domain) {
  const labels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:59'];
  if (domain === 'contracted') {
    return {
      labels,
      datasets: [
        { label: 'System SoH (%)', data: [98.5, 98.4, 98.1, 97.9, 97.6, 97.4, 97.4], borderColor: '#10b981', fill: true, backgroundColor: 'rgba(16,185,129,0.1)' },
        { label: 'OEM Warranty Ceiling', data: [95, 95, 95, 95, 95, 95, 95], borderColor: '#ef4444', borderDash: [5, 5] }
      ]
    };
  } else {
    return {
      labels,
      datasets: [
        { label: 'Real-Time LMP ($/MWh)', data: [22, 18, 45, 12, 180, 248, 65], borderColor: '#3b82f6', fill: true, backgroundColor: 'rgba(59,130,246,0.15)' }
      ]
    };
  }
}

function renderHeatmap() {
  const container = document.getElementById('container-heatmap');
  if (!container) return;
  container.innerHTML = '';

  for (let i = 1; i <= 12; i++) {
    const temp = (34 + Math.random() * 8).toFixed(1);
    const soc = Math.floor(40 + Math.random() * 55);
    const cell = document.createElement('div');
    cell.style.cssText = 'background:#020617; border:1px solid #1e293b; padding:0.5rem; border-radius:6px; font-size:0.75rem; cursor:pointer;';
    cell.onclick = () => alert(`BESS Rack #${i}: Temperature ${temp}°C, SoC ${soc}%. HVAC cooling active.`);
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

// Setup Steps Interactive Toggle
function toggleStep(stepNum) {
  const step = document.getElementById(`step-${stepNum}`);
  const check = document.getElementById(`check-${stepNum}`);
  if (!step || !check) return;

  if (step.classList.contains('done')) {
    step.classList.remove('done');
    check.className = 'step-circle';
    check.innerText = '○';
  } else {
    step.classList.add('done');
    check.className = 'step-check';
    check.innerText = '✓';
  }
}

// Agent Console REPL & Rule Toggles
function toggleAgentRule(agentName, isEnabled) {
  const status = isEnabled ? 'ENABLED' : 'DISABLED';
  appendConsoleLine(`[RULE GOVERNANCE]: Autonomous rule for ${agentName} set to ${status}.`, 'action');
}

function testAgentPrompt(agentName) {
  appendConsoleLine(`[USER PROMPT ➔ ${agentName}]: Executing diagnostic check on BESS container telemetry...`, 'user');
  setTimeout(() => {
    if (agentName === 'Operator') {
      appendConsoleLine(`🤖 [Operator]: Container #3 cell delta V reconciled. Temp stable at 38.2°C.`, 'line');
    } else if (agentName === 'Analyst') {
      appendConsoleLine(`🤖 [Analyst]: ERCOT 18:30 price spike model confirmed at $248.50/MWh. 25MW discharge bid queued.`, 'line');
    } else {
      appendConsoleLine(`🤖 [Guardrail]: CATL/Tesla Megapack warranty throughput verified. 312 EFC used out of 365 allowed.`, 'line');
    }
  }, 500);
}

function handleConsolePrompt(e) {
  if (e.key === 'Enter') submitConsolePrompt();
}

function submitConsolePrompt() {
  const input = document.getElementById('console-input');
  const val = input?.value.trim();
  if (!val) return;

  appendConsoleLine(`[USER COMMAND]: ${val}`, 'user');
  input.value = '';

  setTimeout(() => {
    appendConsoleLine(`🤖 [SLOE AGENT CORE]: Parsed command "${val}". Telemetry data synced across Modbus & ERCOT gateways.`, 'line');
  }, 600);
}

function appendConsoleLine(text, type = 'line') {
  const consoleBox = document.getElementById('agent-console-log');
  if (!consoleBox) return;

  const div = document.createElement('div');
  div.className = `console-line ${type}`;
  div.innerText = text;
  consoleBox.appendChild(div);
  consoleBox.scrollTop = consoleBox.scrollHeight;
}

function simulateEvent() {
  appendConsoleLine(`🚨 [SCADA TELEMETRY ALERT]: Thermal drift detected in Inverter #4. Generated exception WO-9084.`, 'action');
  alert('Simulated SCADA telemetry event: Thermal imbalance detected in BESS Rack #4.');
}

function saveSettings() {
  const crate = document.getElementById('cfg-crate')?.value;
  const temp = document.getElementById('cfg-temp')?.value;
  appendConsoleLine(`[SETTINGS SAVED]: Max C-Rate set to ${crate}, Thermal Ceiling set to ${temp}.`, 'action');
  alert('Settings saved successfully!');
}

function handleGlobalSearch(e) {
  if (e.key === 'Enter') {
    alert(`Searching Sloe Energy OS records for: "${e.target.value}"`);
  }
}

function toggleUserMenu() {
  alert('Demo Test (sloelabs.com) - Enterprise Asset Principal');
}
