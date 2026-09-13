// SLOE Energy OS Core Application Logic

let activeView = 'today';
let currentDomain = 'contracted'; // 'contracted' or 'merchant'
let degradationChartInstance = null;
let arbitrageChartInstance = null;
let currentCategory = 'all';

// Composio Catalog
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
    domainBadge: 'CONTRACTED MODE ▾',
    domainClass: 'contracted-style',
    toggleLabel: 'Switch to Merchant Market',
    todayBadge: 'CONTRACTED ASSET OPERATIONS',
    todayDesc: 'Live availability tracking & telemetry-backed exception queue for PPA & Tolling contracts.',
    tool1Name: 'Availability SLA Tracker',
    tool1Desc: 'Monitor 99.8% plant uptime & contract SLAs.',
    tool2Name: 'Thermal Fade Engine',
    tool2Desc: 'Audit CATL/Tesla battery degradation curves.',
    opsNav: [
      { id: 'tool-sla', icon: '📊', label: 'Availability SLA Tracker' },
      { id: 'tool-degradation', icon: '📉', label: 'Thermal & SoH Fade' }
    ],
    growthNav: [
      { id: 'tool-warranty', icon: '📜', label: 'OEM Warranty Guardrail' },
      { id: 'tool-dispatch', icon: '🛠️', label: 'O&M Field Dispatch' }
    ],
    queueHead: ['Exception ID', 'Asset Unit', 'Trigger Category', 'Agent Recommendation', 'Severity', 'Action'],
    queueRows: [
      { id: '#EX-9081', unit: 'Container #3', trigger: 'Thermal Spike (42.1°C)', rec: 'Curtail Charge to 0.5C', sev: 'High' },
      { id: '#EX-9082', unit: 'PV Inverter #8', trigger: 'Efficiency Drop (-4.2%)', rec: 'Clean Dust Sensor & Calibrate', sev: 'Medium' },
      { id: '#EX-9083', unit: 'Rack #11', trigger: 'Cell Delta V > 80mV', rec: 'Run Autonomous Balancing Cycle', sev: 'Low' }
    ]
  },
  merchant: {
    domainBadge: 'MERCHANT MODE ▾',
    domainClass: 'merchant-style',
    toggleLabel: 'Switch to Contracted Ops',
    todayBadge: 'MERCHANT MARKET OPERATIONS',
    todayDesc: 'Live 5-minute wholesale ERCOT/CAISO LMP bidding & real-time arbitrage optimization.',
    tool1Name: '5-Min LMP Spot Radar',
    tool1Desc: 'Capture $248.50/MWh ERCOT price spikes.',
    tool2Name: 'Cycling Cost Engine',
    tool2Desc: 'Calculate marginal degradation cost per cycle.',
    opsNav: [
      { id: 'tool-arbitrage', icon: '⚡', label: 'LMP Spot Arbitrage Radar' },
      { id: 'tool-cycling', icon: '💰', label: 'Cycling Cost & Revenue' }
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
  renderTableData();
  renderComposioFeatured();
  renderDegradationChart();
  renderArbitrageChart();
  renderThermalHeatmap();
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

  if (viewId === 'tool-degradation' && degradationChartInstance) {
    setTimeout(() => degradationChartInstance.resize(), 100);
  }
  if (viewId === 'tool-arbitrage' && arbitrageChartInstance) {
    setTimeout(() => arbitrageChartInstance.resize(), 100);
  }
}

// Domain Switcher (Toggle Market Modes)
function toggleDomainModal() {
  currentDomain = currentDomain === 'contracted' ? 'merchant' : 'contracted';
  document.body.className = `mode-${currentDomain}`;
  
  renderDynamicNav();
  renderTableData();

  appendConsoleLine(`[DOMAIN SWITCHER]: Active Market Domain toggled to ${currentDomain.toUpperCase()} MODE. Re-routed navigation items.`, 'action');
}

function renderDynamicNav() {
  const config = NAV_CONFIG[currentDomain];

  const domainBadge = document.getElementById('domain-badge-text');
  if (domainBadge) {
    domainBadge.innerText = config.domainBadge;
    domainBadge.className = `domain-badge ${config.domainClass}`;
  }

  const toggleLabel = document.getElementById('domain-toggle-label');
  if (toggleLabel) toggleLabel.innerText = config.toggleLabel;

  const todayBadge = document.getElementById('today-market-badge');
  if (todayBadge) todayBadge.innerText = config.todayBadge;

  const todayDesc = document.getElementById('today-hero-desc');
  if (todayDesc) todayDesc.innerText = config.todayDesc;

  const tool1Name = document.getElementById('tool1-name');
  if (tool1Name) tool1Name.innerText = config.tool1Name;

  const tool1Desc = document.getElementById('tool1-desc');
  if (tool1Desc) tool1Desc.innerText = config.tool1Desc;

  const tool2Name = document.getElementById('tool2-name');
  if (tool2Name) tool2Name.innerText = config.tool2Name;

  const tool2Desc = document.getElementById('tool2-desc');
  if (tool2Desc) tool2Desc.innerText = config.tool2Desc;

  // Render Operations Sub-nav
  const opsNav = document.getElementById('dynamic-ops-nav');
  if (opsNav) {
    opsNav.innerHTML = config.opsNav.map(item => `
      <button type="button" class="nav-item" id="nav-${item.id}" onclick="navigateTo('${item.id}')">
        <span class="nav-icon">${item.icon}</span>
        <span>${item.label}</span>
      </button>
    `).join('');
  }

  // Render Growth Sub-nav
  const growthNav = document.getElementById('dynamic-growth-nav');
  if (growthNav) {
    growthNav.innerHTML = config.growthNav.map(item => `
      <button type="button" class="nav-item" id="nav-${item.id}" onclick="navigateTo('${item.id}')">
        <span class="nav-icon">${item.icon}</span>
        <span>${item.label}</span>
      </button>
    `).join('');
  }
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

// 📊 TOOL 1: AVAILABILITY SLA TRACKER
function downloadSlaReport() {
  alert('Generating & downloading SEC & Utility PPA Availability Compliance Memo (PDF)... Verified 99.82% Uptime.');
  appendConsoleLine('[SLA TOOL]: Downloaded stamped Availability Compliance Memo (PDF).', 'action');
}

// 📉 TOOL 2: THERMAL FADE ENGINE
function renderDegradationChart() {
  const ctx = document.getElementById('degradationChartCanvas')?.getContext('2d');
  if (!ctx) return;

  degradationChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Yr 1', 'Yr 3', 'Yr 5', 'Yr 7', 'Yr 10', 'Yr 12', 'Yr 15'],
      datasets: [
        { label: 'Projected SoH Capacity (%)', data: [99.2, 97.4, 94.8, 91.2, 86.5, 82.1, 78.4], borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true },
        { label: 'CATL 70% End-of-Life Limit', data: [70, 70, 70, 70, 70, 70, 70], borderColor: '#ef4444', borderDash: [5, 5] }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { x: { ticks: { color: '#94a3b8' } }, y: { ticks: { color: '#94a3b8' } } }
    }
  });
}

function updateHvacTemp(val) { document.getElementById('hvac-temp-val').innerText = `${val}°C`; }
function updateCRate(val) { document.getElementById('c-rate-val').innerText = `${val} C`; }

function runThermalSimulation() {
  const temp = document.getElementById('hvac-temp-val').innerText;
  const crate = document.getElementById('c-rate-val').innerText;
  alert(`Running thermal simulation with HVAC ${temp} & C-Rate ${crate}... Degradation rate optimized!`);
  appendConsoleLine(`[THERMAL SIMULATOR]: Re-calculated cell degradation curve with ${temp} HVAC cooling.`, 'action');
}

function renderThermalHeatmap() {
  const container = document.getElementById('degradation-heatmap-grid');
  if (!container) return;
  container.innerHTML = '';

  for (let i = 1; i <= 12; i++) {
    const temp = (34 + Math.random() * 6).toFixed(1);
    const soc = Math.floor(45 + Math.random() * 50);
    const cell = document.createElement('div');
    cell.style.cssText = 'background:#020617; border:1px solid #1e293b; padding:0.6rem; border-radius:6px; font-size:0.75rem; cursor:pointer;';
    cell.onclick = () => alert(`BESS Rack #${i}: Temp ${temp}°C, SoC ${soc}%. Cell voltage delta 14mV.`);
    cell.innerHTML = `
      <div style="color:#94a3b8; display:flex; justify-content:space-between;"><span>BESS #${i}</span><span>${soc}%</span></div>
      <div style="color:#10b981; font-weight:bold; font-size:0.95rem; margin-top:0.2rem;">${temp}°C</div>
    `;
    container.appendChild(cell);
  }
}

// ⚡ TOOL 3: LMP SPOT ARBITRAGE RADAR
function renderArbitrageChart() {
  const ctx = document.getElementById('arbitrageChartCanvas')?.getContext('2d');
  if (!ctx) return;

  arbitrageChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['12:00', '14:00', '16:00', '18:00', '20:00', '22:00'],
      datasets: [
        { label: 'ERCOT South Real-Time LMP ($/MWh)', data: [18.2, 14.5, 88.0, 248.5, 175.0, 42.0], borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.15)', fill: true }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { x: { ticks: { color: '#94a3b8' } }, y: { ticks: { color: '#94a3b8' } } }
    }
  });
}

function submitMarketBid() {
  const node = document.getElementById('bid-node').value;
  const type = document.getElementById('bid-type').value;
  const volume = document.getElementById('bid-volume').value;
  
  const tbody = document.getElementById('bidding-stack-tbody');
  if (tbody) {
    const tr = document.createElement('tr');
    const id = `#BID-${Math.floor(1000 + Math.random() * 9000)}`;
    tr.innerHTML = `<td style="color:#fff; font-weight:bold;">${id}</td><td>${type}</td><td>${volume} MW</td><td style="color:var(--emerald-400);">${node.split('(')[1]?.replace(')', '') || '$200/MWh'}</td><td><span style="color:var(--amber-500);">Submitted</span></td>`;
    tbody.insertBefore(tr, tbody.firstChild);
  }

  alert(`Submitted 5-Min Wholesale Bid: ${volume} MW (${type}) at ${node}!`);
  appendConsoleLine(`[MARKET BID]: Submitted ${volume} MW bid for ${node}.`, 'action');
}

// 💰 TOOL 4: CYCLING COST & REVENUE
function recalculateMarginalCost() {
  const capex = document.getElementById('capex-cost').value;
  appendConsoleLine(`[MARGINAL COST]: Recalculating degradation wear cost for CapEx ${capex}...`, 'line');
}

// 📜 TOOL 5: OEM WARRANTY AUDITOR
function downloadWarrantyPackage() {
  alert('Generating & downloading Cryptographically Stamped OEM Warranty Compliance Audit Package (PDF)...');
  appendConsoleLine('[WARRANTY AUDITOR]: Exported OEM Warranty Audit Package (PDF).', 'action');
}

// 🛠️ TOOL 6: O&M FIELD DISPATCH
function dispatchWorkOrder() {
  const unit = document.getElementById('wo-unit').value;
  const priority = document.getElementById('wo-priority').value;
  const tech = document.getElementById('wo-tech').value;
  const id = `#WO-${Math.floor(9000 + Math.random() * 999)}`;

  const tbody = document.getElementById('dispatch-tbody');
  if (tbody) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td style="color:#fff; font-weight:bold;">${id}</td><td>${unit}</td><td>${priority}</td><td>${tech}</td><td><span style="color:var(--amber-500);">Dispatched</span></td>`;
    tbody.insertBefore(tr, tbody.firstChild);
  }

  alert(`Dispatched Work Order ${id} to ${tech} via Salesforce Field Service!`);
  appendConsoleLine(`[FIELD DISPATCH]: Work Order ${id} dispatched via Salesforce API.`, 'action');
}

// Inspection Evidence Modal
function inspectException(id, unit, trigger, rec) {
  const modal = document.getElementById('app-modal');
  document.getElementById('modal-title').innerText = `Evidence Inspection: ${id} (${unit})`;
  document.getElementById('modal-body').innerHTML = `
    <div style="background:var(--slate-950); padding:0.85rem; border-radius:8px; border:1px solid var(--slate-800);">
      <div style="color:var(--cyan-400); font-family:var(--font-mono); font-size:0.75rem; font-weight:bold;">SCADA TELEMETRY ROOT-CAUSE ANALYSIS</div>
      <div style="font-size:0.95rem; font-weight:bold; color:#fff; margin-top:0.3rem;">${trigger}</div>
    </div>
    <div>
      <strong style="color:#fff;">Agent Assessment:</strong>
      <p style="margin-top:0.25rem;">${rec}. Evaluated against CATL Megapack warranty guidelines and 99.8% Availability SLA requirements.</p>
    </div>
  `;
  document.getElementById('modal-footer').innerHTML = `
    <button class="btn-smoke" onclick="closeModalDirect()">Cancel</button>
    <button class="btn-primary-action" onclick="executeInspectionAction('${id}')">Execute Approved Action</button>
  `;
  modal.classList.add('open');
}

function executeInspectionAction(id) {
  closeModalDirect();
  appendConsoleLine(`[ACTION]: Executed approved action for ${id}.`, 'action');
  alert(`Action for ${id} executed successfully!`);
}

function openComposioModal(appName) {
  const modal = document.getElementById('app-modal');
  document.getElementById('modal-title').innerText = `Connect Integration: ${appName}`;
  document.getElementById('modal-body').innerHTML = `
    <p>Connecting <strong>${appName}</strong> via Composio Tool Engine.</p>
    <div class="form-row"><label>API Key / OAuth Token</label><input type="password" value="cmp_live_9981293819028319"></div>
  `;
  document.getElementById('modal-footer').innerHTML = `
    <button class="btn-smoke" onclick="closeModalDirect()">Cancel</button>
    <button class="btn-primary-action" onclick="closeModalDirect(); alert('${appName} Connected!');">Approve & Save Integration</button>
  `;
  modal.classList.add('open');
}

function runSmokeTest(appName) { alert(`Smoke test for ${appName} PASSED!`); }
function disconnectApp(appName) { if (confirm(`Disconnect ${appName}?`)) alert(`${appName} disconnected.`); }
function closeModal(e) { if (e.target.classList.contains('modal-overlay')) closeModalDirect(); }
function closeModalDirect() { document.getElementById('app-modal')?.classList.remove('open'); }

function filterComposioCategory(catKey) {
  currentCategory = catKey;
  document.querySelectorAll('.pill-chip').forEach(el => el.classList.remove('active'));
  document.getElementById(`chip-${catKey}`)?.classList.add('active');
  renderComposioFeatured();
}

function filterComposioApps() { renderComposioFeatured(); }

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

function toggleStep(stepNum) {
  const step = document.getElementById(`step-${stepNum}`);
  const check = document.getElementById(`check-${stepNum}`);
  if (!step || !check) return;
  step.classList.toggle('done');
  check.innerText = step.classList.contains('done') ? '✓' : '○';
}

function toggleAgentRule(agentName, isEnabled) {
  appendConsoleLine(`[RULE GOVERNANCE]: ${agentName} rule set to ${isEnabled ? 'ENABLED' : 'DISABLED'}.`, 'action');
}

function testAgentPrompt(agentName) {
  appendConsoleLine(`[PROMPT ➔ ${agentName}]: Running diagnostic check...`, 'user');
  setTimeout(() => appendConsoleLine(`🤖 [${agentName}]: Check complete. All systems operating within parameters.`, 'line'), 400);
}

function handleConsolePrompt(e) { if (e.key === 'Enter') submitConsolePrompt(); }

function submitConsolePrompt() {
  const input = document.getElementById('console-input');
  const val = input?.value.trim();
  if (!val) return;
  appendConsoleLine(`[USER COMMAND]: ${val}`, 'user');
  input.value = '';
  setTimeout(() => appendConsoleLine(`🤖 [AGENT CORE]: Executed "${val}". Reconciled SCADA streams.`, 'line'), 500);
}

function appendConsoleLine(text, type = 'line') {
  const box = document.getElementById('agent-console-log');
  if (!box) return;
  const div = document.createElement('div');
  div.className = `console-line ${type}`;
  div.innerText = text;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function simulateEvent() {
  appendConsoleLine(`🚨 [SCADA ALERT]: Thermal drift in BESS Container #3. Created WO-9084.`, 'action');
  alert('SCADA telemetry alert generated: Thermal imbalance in Container #3.');
}

function saveSettings() {
  alert('Settings saved successfully!');
  appendConsoleLine('[SETTINGS]: Updated hardware operating boundaries.', 'action');
}

function handleGlobalSearch(e) {
  if (e.key === 'Enter') alert(`Searching Sloe Energy OS for "${e.target.value}"...`);
}
