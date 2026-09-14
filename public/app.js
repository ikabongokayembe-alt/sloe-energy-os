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
    tool1Name: 'Physical SCADA Twin',
    tool1Desc: 'Inspect 2D site layout & live container telemetry.',
    tool2Name: 'Thermal Fade Engine',
    tool2Desc: 'Audit CATL/Tesla battery degradation curves.',
    opsNav: [
      { id: 'scada-twin', icon: '🗺️', label: 'Physical SCADA Twin' },
      { id: 'tool-degradation', icon: '📉', label: 'Thermal & SoH Fade' },
      { id: 'tool-sla', icon: '📊', label: 'Availability SLA Tracker' }
    ],
    growthNav: [
      { id: 'tool-dispatch', icon: '🛠️', label: 'O&M Field Dispatch' },
      { id: 'settlements', icon: '🧾', label: 'PPA Invoices & Settlements' }
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
      { id: 'quant-forecast', icon: '🌤️', label: 'ERCOT / CAISO Quant' },
      { id: 'tool-arbitrage', icon: '⚡', label: 'LMP Spot Arbitrage Radar' },
      { id: 'tool-cycling', icon: '💰', label: 'Cycling Cost & Revenue' }
    ],
    growthNav: [
      { id: 'ppa-hedges', icon: '📜', label: 'Bilateral PPA & Hedges' },
      { id: 'settlements', icon: '🧾', label: 'ISO Market Settlements' }
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
  if (viewId === 'ai-agents') {
    renderConversationsList();
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

  const isoTimer = document.getElementById('iso-market-timer');
  if (isoTimer) {
    isoTimer.style.display = currentDomain === 'merchant' ? 'flex' : 'none';
  }

  const domainBadge = document.getElementById('domain-badge-text');
  if (domainBadge) {
    domainBadge.innerText = config.domainBadge;
    domainBadge.className = `domain-badge ${config.domainClass}`;
  }

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

function runQuantSimulation() {
  alert('⚡ Bidding Curve Updated: Pushed 24-hour day-ahead LMP price forecast to SCADA Market Gateway.');
  appendConsoleLine('[QUANT ENGINE]: Calculated 24-hr LMP bidding curve & pushed to Modbus Gateway.', 'action');
}

function openHedgeModal() {
  const counterparty = prompt('Enter Hedge Counterparty (e.g. Morgan Stanley, Vitol, Shell Energy):', 'Vitol Energy Trading');
  if (!counterparty) return;
  const volume = prompt('Enter Volume (MW):', '15');
  const strike = prompt('Enter Strike Price ($/MWh):', '42.50');
  
  const tbody = document.getElementById('hedges-tbody');
  if (tbody) {
    const tr = document.createElement('tr');
    const newId = `#HDG-${Math.floor(8800 + Math.random() * 100)}`;
    tr.innerHTML = `
      <td style="color:#fff; font-weight:bold;">${newId}</td>
      <td>Fixed-for-Floating Swap</td>
      <td>${counterparty}</td>
      <td>${volume} MW</td>
      <td>$${strike} / MWh</td>
      <td>Dec 31, 2026</td>
      <td><span style="color:var(--emerald-400); font-weight:bold;">+$12,500</span></td>
      <td><span class="status-pill green">Active</span></td>
    `;
    tbody.prepend(tr);
    alert(`Synthetic Hedge ${newId} for ${volume} MW at $${strike}/MWh with ${counterparty} executed!`);
    appendConsoleLine(`[PPA HEDGE ENGINE]: Executed synthetic hedge ${newId} with ${counterparty}.`, 'action');
  }
}

function handleGlobalSearch(e) {
  if (e.key === 'Enter') alert(`Searching Sloe Energy OS for "${e.target.value}"...`);
}

// CHAT WORKSPACE CONVERSATION DATA & CONTROLLERS
let currentAgentIdentity = 'Operator'; // 'Operator' or 'Analyst'
let activeConvId = 'sun-brief';
let currentConvFilter = 'unread';

const CONVERSATION_THREADS = [
  {
    id: 'sun-brief',
    title: 'Sun Brief — Sep 13',
    time: '19h',
    unreadCount: 1,
    tag: 'BRIEF',
    read: false,
    snippet: 'Here is your briefing. Before the d...',
    agent: 'Operator',
    paragraphs: [
      "Before the day gets loud, here's where Sloe Energy OS stands. You built it with a clear mission — Run BESS & PV Utility Assets better — and that's the lens I'm using to read today.",
      "Since we last caught up, one thread has stayed active: 'Sun Brief — Sep 13'. It's a focused start — exactly the kind of work Sloe Energy OS exists to do.",
      "I've also got 18 suggestions waiting on your call (Thermal runaway check on Container #3, ERCOT 5-min LMP peak $248.50/MWh). They'll hold until you have a moment, but they're worth a look before they pile up — small calls get heavier the longer they sit.",
      "So if you want a single focus: the thread at the top of your list right now is 'Sun Brief — Sep 13'. Start the day there, before the rest of it fills up — the desk always runs lighter when the freshest open loop gets attention first.",
      "I'll be here, watching the threads and tracking what moves. Come find me when you need me."
    ],
    signature: "— Your Operator",
    chatLog: []
  },
  {
    id: 'sat-brief',
    title: 'Sat Brief — Sep 12',
    time: '1d',
    unreadCount: 1,
    tag: 'BRIEF',
    read: false,
    snippet: 'Here is your briefing. Before the d...',
    agent: 'Operator',
    paragraphs: [
      "Weekend operational snapshot for Sloe Energy OS. SCADA telemetry passed 99.94% stability across all 12 Megapack containers.",
      "Grid frequency response in CAISO Zone 4 triggered 3 micro-discharges, yielding +$14,200 in ancillary services revenue.",
      "All thermal cell deltas remained below 12mV. Enjoy your weekend — the automated safety guardrails are fully active."
    ],
    signature: "— Your Operator",
    chatLog: []
  },
  {
    id: 'fri-brief',
    title: 'Fri Brief — Sep 11',
    time: '2d',
    unreadCount: 1,
    tag: 'BRIEF',
    read: false,
    snippet: 'End-of-week briefing — here\'s wh...',
    agent: 'Operator',
    paragraphs: [
      "End-of-week briefing — here's what moved across your BESS and PV assets.",
      "We executed 42 arbitrage cycles during ERCOT peak hours, avoiding $38/MWh in high degradation thermal zones.",
      "Composio integration with Salesforce Field Service automatically closed 2 routine inverter maintenance work orders."
    ],
    signature: "— Your Operator",
    chatLog: []
  },
  {
    id: 'thu-brief',
    title: 'Thu Brief — Sep 10',
    time: '3d',
    unreadCount: 1,
    tag: 'BRIEF',
    read: false,
    snippet: 'Here is your briefing. Before the d...',
    agent: 'Operator',
    paragraphs: [
      "Midweek performance report: Total revenue generated reached $184,500 across merchant and tolling assets.",
      "State of Health (SoH) fade modeling confirms 98.4% capacity retention, outperforming OEM warranty targets by 1.2%."
    ],
    signature: "— Your Operator",
    chatLog: []
  },
  {
    id: 'wed-brief',
    title: 'Wed Brief — Sep 9',
    time: '4d',
    unreadCount: 1,
    tag: 'BRIEF',
    read: true,
    snippet: 'Midweek briefing — here\'s what h...',
    agent: 'Operator',
    paragraphs: [
      "System initialization complete for Sloe Energy OS workspace.",
      "Telemetry streams established with Modbus SCADA Gateway and ERCOT Real-Time Market API."
    ],
    signature: "— Your Operator",
    chatLog: []
  }
];

function renderConversationsList() {
  const container = document.getElementById('conversations-list-container');
  if (!container) return;

  const filtered = CONVERSATION_THREADS.filter(item => {
    if (currentConvFilter === 'unread') return !item.read;
    return item.read;
  });

  container.innerHTML = '';

  if (filtered.length === 0) {
    container.innerHTML = '<div style="color:var(--slate-400); font-size:0.8rem; text-align:center; padding:2rem 0;">No conversations in this filter.</div>';
    return;
  }

  filtered.forEach(item => {
    const isActive = item.id === activeConvId;
    const div = document.createElement('div');
    div.className = `conv-item ${isActive ? 'active' : ''}`;
    div.onclick = () => selectConversation(item.id);

    div.innerHTML = `
      <div class="conv-avatar-box">
        <div class="conv-avatar">${item.agent === 'Operator' ? 'O' : 'A'}</div>
        <div class="conv-badge-dot"></div>
      </div>
      <div class="conv-content">
        <div class="conv-top-line">
          <span class="conv-title">${item.title}</span>
          <span class="conv-time">${item.time}</span>
        </div>
        <span class="conv-snippet">${item.snippet}</span>
        <div class="conv-tag-row">
          <span class="tag-brief">${item.tag}</span>
          ${item.unreadCount > 0 ? `<span class="conv-unread-badge">${item.unreadCount}</span>` : ''}
        </div>
      </div>
    `;
    container.appendChild(div);
  });

  // Update unread count badge
  const unreadCountEl = document.getElementById('unread-counter-num');
  if (unreadCountEl) {
    const totalUnread = CONVERSATION_THREADS.filter(t => !t.read).length;
    unreadCountEl.innerText = totalUnread > 0 ? totalUnread * 20 + 9 : '0'; // stylized count like 109 in screenshot
  }

  renderActiveConversationCard();
}

function selectConversation(id) {
  activeConvId = id;
  const target = CONVERSATION_THREADS.find(t => t.id === id);
  if (target) {
    target.read = true;
  }
  renderConversationsList();
}

function renderActiveConversationCard() {
  const bodyEl = document.getElementById('chat-briefing-body');
  if (!bodyEl) return;

  const activeThread = CONVERSATION_THREADS.find(t => t.id === activeConvId) || CONVERSATION_THREADS[0];

  let html = '';
  activeThread.paragraphs.forEach(p => {
    html += `<p>${p}</p>`;
  });

  if (activeThread.signature) {
    html += `<p class="sig-line">${activeThread.signature}</p>`;
  }

  if (activeThread.chatLog && activeThread.chatLog.length > 0) {
    html += '<hr style="border:none; border-top:1px solid #CBD5E1; margin:1.5rem 0;">';
    activeThread.chatLog.forEach(msg => {
      if (msg.role === 'user') {
        html += `<div class="chat-message-user"><strong>You:</strong> ${msg.text}</div>`;
      } else {
        html += `<div style="background:#FFFFFF; color:#0F172A; border-radius:12px; padding:1rem; margin-top:0.75rem; border:1px solid #E2E8F0;"><strong>🤖 ${activeThread.signature.replace('— Your ', '')}:</strong> ${msg.text}</div>`;
      }
    });
  }

  bodyEl.innerHTML = html;
}

function setConvFilter(filter) {
  currentConvFilter = filter;
  document.getElementById('pill-unread')?.classList.toggle('active', filter === 'unread');
  document.getElementById('pill-read')?.classList.toggle('active', filter === 'read');
  renderConversationsList();
}

function switchAgentSubTab(tab) {
  document.querySelectorAll('.agent-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.chat-sub-view').forEach(v => v.classList.remove('active'));

  const tabBtn = document.getElementById(`agent-tab-${tab}`);
  const viewEl = document.getElementById(`subview-${tab}`);

  if (tabBtn) tabBtn.classList.add('active');
  if (viewEl) viewEl.classList.add('active');
}

function switchAgentIdentityModal() {
  currentAgentIdentity = currentAgentIdentity === 'Operator' ? 'Analyst' : 'Operator';

  const avatarCircle = document.getElementById('agent-avatar-circle');
  const nameEl = document.getElementById('agent-display-name');
  const roleEl = document.getElementById('agent-role-label');
  const topPillName = document.getElementById('top-pill-agent-name');
  const breadcrumb = document.getElementById('chat-agent-breadcrumb');
  const chatInput = document.getElementById('chat-input-field');

  if (currentAgentIdentity === 'Operator') {
    if (avatarCircle) { avatarCircle.innerText = 'T'; avatarCircle.style.background = 'linear-gradient(135deg, #F43F5E, #E11D48)'; }
    if (nameEl) nameEl.innerText = 'The Operator';
    if (roleEl) roleEl.innerText = 'Operations Specialist';
    if (topPillName) topPillName.innerText = 'Operator';
    if (breadcrumb) breadcrumb.innerText = 'The Operator';
    if (chatInput) chatInput.placeholder = 'Talk to the Operator...';
  } else {
    if (avatarCircle) { avatarCircle.innerText = 'A'; avatarCircle.style.background = 'linear-gradient(135deg, #0EA5E9, #2563EB)'; }
    if (nameEl) nameEl.innerText = 'The Analyst';
    if (roleEl) roleEl.innerText = 'Quant & Arbitrage Specialist';
    if (topPillName) topPillName.innerText = 'Analyst';
    if (breadcrumb) breadcrumb.innerText = 'The Analyst';
    if (chatInput) chatInput.placeholder = 'Talk to the Analyst...';
  }

  appendConsoleLine(`[AGENT WORKSPACE]: Switched active chat view to ${currentAgentIdentity}.`, 'action');
}

function handleChatInputKey(e) {
  if (e.key === 'Enter') sendChatMessage();
}

function sendChatMessage() {
  const input = document.getElementById('chat-input-field');
  const text = input?.value.trim();
  if (!text) return;

  const activeThread = CONVERSATION_THREADS.find(t => t.id === activeConvId) || CONVERSATION_THREADS[0];
  activeThread.chatLog.push({ role: 'user', text: text });
  input.value = '';

  renderActiveConversationCard();

  setTimeout(() => {
    const aiReply = currentAgentIdentity === 'Operator'
      ? `Understood. I have logged your request: "${text}". Adjusting Container thermal limits & monitoring cell voltages.`
      : `Quant model analyzed: "${text}". Running 5-min LMP arbitrage simulation for ERCOT nodes.`;

    activeThread.chatLog.push({ role: 'agent', text: aiReply });
    renderActiveConversationCard();
    appendConsoleLine(`🤖 [${currentAgentIdentity}]: Replied to thread "${activeThread.title}".`, 'line');
  }, 600);
}

function triggerAiSummary() {
  alert('🪄 AI Briefing Summary generated from latest SCADA feeds and wholesale market signals.');
}

function startNewConversation() {
  const title = prompt('Enter Conversation Title:', 'Grid Strategy Briefing');
  if (!title) return;

  const newObj = {
    id: `conv-${Date.now()}`,
    title: title,
    time: 'Just now',
    unreadCount: 0,
    tag: 'NEW',
    read: true,
    snippet: 'New conversation started...',
    agent: currentAgentIdentity,
    paragraphs: [
      `New thread initialized with ${currentAgentIdentity}. State of BESS assets and market gateways ready for your commands.`
    ],
    signature: `— Your ${currentAgentIdentity}`,
    chatLog: []
  };

  CONVERSATION_THREADS.unshift(newObj);
  activeConvId = newObj.id;
  renderConversationsList();
}

// -------------------------------------------------------------
// IN-APP TOAST NOTIFICATION ENGINE (ZERO BROWSER POPUPS)
// -------------------------------------------------------------
function showToast(title, msg, type = 'action') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = {
    success: '✔',
    action: '⚡',
    warning: '⚠️',
    error: '🚨'
  };

  const toast = document.createElement('div');
  toast.className = `toast-item ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || '⚡'}</span>
    <div class="toast-body">
      <span class="toast-title">${title}</span>
      <span class="toast-msg">${msg}</span>
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideInToast 0.25s reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// -------------------------------------------------------------
// SLIDE-OVER DETAIL DRAWER ENGINE
// -------------------------------------------------------------
function openDrawer(title, contentHtml) {
  const drawer = document.getElementById('slideover-drawer');
  const drawerTitle = document.getElementById('drawer-title');
  const drawerBody = document.getElementById('drawer-body');

  if (drawerTitle) drawerTitle.innerText = title;
  if (drawerBody) drawerBody.innerHTML = contentHtml;
  if (drawer) drawer.classList.add('open');
}

function closeDrawer(e) {
  if (e.target.id === 'slideover-drawer') closeDrawerDirect();
}

function closeDrawerDirect() {
  const drawer = document.getElementById('slideover-drawer');
  if (drawer) drawer.classList.remove('open');
}

// -------------------------------------------------------------
// PHYSICAL SCADA SITE TWIN 2D MAP RENDERER
// -------------------------------------------------------------
const SCADA_CONTAINER_NODES = [
  { id: 'BESS-01', temp: '22.4°C', soc: '84.2%', status: 'healthy', voltage: '1,420 V' },
  { id: 'BESS-02', temp: '23.1°C', soc: '83.9%', status: 'healthy', voltage: '1,418 V' },
  { id: 'BESS-03', temp: '42.1°C', soc: '78.0%', status: 'warning', voltage: '1,392 V' },
  { id: 'BESS-04', temp: '22.8°C', soc: '84.0%', status: 'healthy', voltage: '1,421 V' },
  { id: 'BESS-05', temp: '21.9°C', soc: '85.1%', status: 'healthy', voltage: '1,425 V' },
  { id: 'BESS-06', temp: '23.4°C', soc: '83.5%', status: 'healthy', voltage: '1,419 V' },
  { id: 'BESS-07', temp: '22.0°C', soc: '84.8%', status: 'healthy', voltage: '1,422 V' },
  { id: 'BESS-08', temp: '22.6°C', soc: '84.1%', status: 'healthy', voltage: '1,420 V' },
  { id: 'BESS-09', temp: '23.0°C', soc: '83.8%', status: 'healthy', voltage: '1,418 V' },
  { id: 'BESS-10', temp: '22.2°C', soc: '84.5%', status: 'healthy', voltage: '1,423 V' },
  { id: 'BESS-11', temp: '22.7°C', soc: '84.0%', status: 'healthy', voltage: '1,421 V' },
  { id: 'BESS-12', temp: '21.8°C', soc: '85.0%', status: 'healthy', voltage: '1,426 V' }
];

let currentScadaFilter = 'all';

function filterScadaNodes(type) {
  currentScadaFilter = type;
  document.querySelectorAll('.scada-filter-chips .chip-item').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`scada-chip-${type}`);
  if (activeBtn) activeBtn.classList.add('active');
  renderScadaNodes();
}

function renderScadaNodes() {
  const container = document.getElementById('scada-nodes-container');
  if (!container) return;

  const nodesToRender = SCADA_CONTAINER_NODES.filter(n => {
    if (currentScadaFilter === 'warning') return n.status === 'warning';
    if (currentScadaFilter === 'healthy') return n.status === 'healthy';
    return true;
  });

  container.innerHTML = '';
  nodesToRender.forEach(node => {
    const card = document.createElement('div');
    const isWarn = node.status === 'warning';
    card.className = `scada-node-card ${isWarn ? 'warning-node' : ''}`;
    card.onclick = () => inspectContainerNode(node.id);

    const socNum = parseInt(node.soc);
    const flowText = isWarn ? '⚡ Thermal Throttled (5 MW)' : '⚡ Discharging (10 MW)';

    card.innerHTML = `
      <div class="node-top-row">
        <div class="node-title-group">
          <span class="node-icon">🔋</span>
          <span class="node-title">${node.id}</span>
        </div>
        <span class="node-status-badge ${isWarn ? 'amber' : 'green'}">${isWarn ? '⚠️ TEMP DRIFT' : '🟢 HEALTHY'}</span>
      </div>

      <div class="node-soc-bar-container">
        <div class="soc-label-row">
          <span>State of Charge (SoC)</span>
          <strong style="color:#fff;">${node.soc}</strong>
        </div>
        <div class="soc-track">
          <div class="soc-fill ${isWarn ? 'amber-fill' : 'cyan-fill'}" style="width: ${socNum}%;"></div>
        </div>
      </div>

      <div class="node-metrics-grid">
        <div class="metric-cell">
          <span class="m-label">Cell Temp</span>
          <strong class="m-val ${isWarn ? 'amber-text' : 'green-text'}">${node.temp}</strong>
        </div>
        <div class="metric-cell">
          <span class="m-label">DC Bus</span>
          <strong class="m-val">${node.voltage}</strong>
        </div>
      </div>

      <div class="node-footer-row">
        <span class="node-flow-text">${flowText}</span>
        <span class="node-inspect-cta">Inspect Drawer →</span>
      </div>
    `;
    container.appendChild(card);
  });
}

function inspectSubstation() {
  const html = `
    <div class="drawer-content-wrapper">
      <div class="drawer-ai-banner healthy">
        <div class="ai-banner-title">
          <span>🤖 AGENT OPERATOR SUBSTATION MONITOR</span>
          <span class="ai-confidence">100% Modbus / DNP3 Sync</span>
        </div>
        <p class="ai-banner-text">🟢 <strong>345kV Interconnection Substation Nominal:</strong> Transformer T1 gas-in-oil (DGA) levels normal. SEL-411L line protection relay active. Zero breaker trip warnings.</p>
      </div>

      <div class="drawer-kpi-grid">
        <div class="d-kpi-card"><span class="d-kpi-title">BUS VOLTAGE</span><span class="d-kpi-val cyan-text">345.2 kV</span><span class="d-kpi-sub">Target: 345.0 kV</span></div>
        <div class="d-kpi-card"><span class="d-kpi-title">GRID FREQUENCY</span><span class="d-kpi-val green-text">59.98 Hz</span><span class="d-kpi-sub">ERCOT Nominal 60Hz</span></div>
        <div class="d-kpi-card"><span class="d-kpi-title">TRANSFORMER TEMP</span><span class="d-kpi-val">48.2°C</span><span class="d-kpi-sub">Limit: 85.0°C Max</span></div>
        <div class="d-kpi-card"><span class="d-kpi-title">BREAKER STATUS</span><span class="d-kpi-val green-text">CLOSED</span><span class="d-kpi-sub">Main Feeder 52A</span></div>
      </div>

      <div class="drawer-section-card">
        <h4 class="drawer-section-title">📊 Dissolved Gas Analysis (DGA Transformer Health)</h4>
        <div class="rack-matrix">
          <div class="rack-row"><span class="rack-id">Hydrogen</span><div class="rack-bar-track"><div class="rack-bar-fill green" style="width: 12%;"></div></div><span class="rack-meta">14 ppm (Normal)</span></div>
          <div class="rack-row"><span class="rack-id">Methane</span><div class="rack-bar-track"><div class="rack-bar-fill green" style="width: 8%;"></div></div><span class="rack-meta">6 ppm (Normal)</span></div>
          <div class="rack-row"><span class="rack-id">Ethylene</span><div class="rack-bar-track"><div class="rack-bar-fill green" style="width: 5%;"></div></div><span class="rack-meta">3 ppm (Normal)</span></div>
        </div>
      </div>

      <div class="drawer-btn-group">
        <button class="btn-hitl-primary" onclick="showToast('Substation Telemetry', 'Polled DNP3 protection relay status.', 'success'); closeDrawerDirect();">↻ Poll Substation Relays</button>
      </div>
    </div>
  `;
  openDrawer('Main 345kV Substation Telemetry Twin', html);
}

function inspectContainerNode(nodeId) {
  const node = SCADA_CONTAINER_NODES.find(n => n.id === nodeId) || SCADA_CONTAINER_NODES[0];
  const isWarn = node.status === 'warning';

  const aiNote = isWarn
    ? `⚠️ <strong>Thermal Anomaly Alert:</strong> Cell Rack C is exhibiting thermal drift (+18.7°C above ambient). HVAC Chiller running at 100% capacity. <em>Recommended Action:</em> Lower HVAC target to 18°C or dispatch O&M field technician before the next 5-minute ERCOT discharge window.`
    : `🟢 <strong>Nominal Telemetry:</strong> All 4 cell racks operating within optimal thermal envelope (21.5°C – 23.4°C). Cell voltage delta is 12 mV. HVAC Chiller operating at 45% load.`;

  const html = `
    <div class="drawer-content-wrapper">
      <!-- AI OPERATOR DIAGNOSTIC BANNER -->
      <div class="drawer-ai-banner ${isWarn ? 'warning' : 'healthy'}">
        <div class="ai-banner-title">
          <span>🤖 AGENT OPERATOR DIAGNOSTIC INSIGHT</span>
          <span class="ai-confidence">99.4% Telemetry Confidence</span>
        </div>
        <p class="ai-banner-text">${aiNote}</p>
      </div>

      <!-- KEY TELEMETRY KPIS -->
      <div class="drawer-kpi-grid">
        <div class="d-kpi-card">
          <span class="d-kpi-title">STATE OF CHARGE</span>
          <span class="d-kpi-val cyan-text">${node.soc}</span>
          <span class="d-kpi-sub">Available: 19.8 MWh</span>
        </div>
        <div class="d-kpi-card">
          <span class="d-kpi-title">CELL TEMP</span>
          <span class="d-kpi-val ${isWarn ? 'amber-text' : 'green-text'}">${node.temp}</span>
          <span class="d-kpi-sub">Threshold: 45.0°C Max</span>
        </div>
        <div class="d-kpi-card">
          <span class="d-kpi-title">DC BUS VOLTAGE</span>
          <span class="d-kpi-val">${node.voltage}</span>
          <span class="d-kpi-sub">Inverter Bus Sync</span>
        </div>
        <div class="d-kpi-card">
          <span class="d-kpi-title">HVAC CHILLER</span>
          <span class="d-kpi-val ${isWarn ? 'amber-text' : 'cyan-text'}">${isWarn ? '100% LOAD' : '45% LOAD'}</span>
          <span class="d-kpi-sub">22°C Target Setpoint</span>
        </div>
      </div>

      <!-- CELL RACK TOPOLOGY BREAKDOWN -->
      <div class="drawer-section-card">
        <h4 class="drawer-section-title">🔋 Internal Cell-Rack Topology & Voltage Balance</h4>
        <div class="rack-matrix">
          <div class="rack-row">
            <span class="rack-id">Rack A</span>
            <div class="rack-bar-track"><div class="rack-bar-fill green" style="width: 95%;"></div></div>
            <span class="rack-meta">3.24 V | 22.1°C</span>
          </div>
          <div class="rack-row">
            <span class="rack-id">Rack B</span>
            <div class="rack-bar-track"><div class="rack-bar-fill green" style="width: 94%;"></div></div>
            <span class="rack-meta">3.25 V | 22.4°C</span>
          </div>
          <div class="rack-row">
            <span class="rack-id">Rack C</span>
            <div class="rack-bar-track"><div class="rack-bar-fill ${isWarn ? 'amber' : 'green'}" style="width: ${isWarn ? '78%' : '96%'};"></div></div>
            <span class="rack-meta" style="${isWarn ? 'color:var(--amber-400); font-weight:bold;' : ''}">${isWarn ? '3.19 V | 42.1°C ⚠️' : '3.24 V | 22.3°C'}</span>
          </div>
          <div class="rack-row">
            <span class="rack-id">Rack D</span>
            <div class="rack-bar-track"><div class="rack-bar-fill green" style="width: 95%;"></div></div>
            <span class="rack-meta">3.24 V | 22.2°C</span>
          </div>
        </div>
      </div>

      <!-- INTERACTIVE CONTROLS SECTION -->
      <div class="drawer-section-card">
        <h4 class="drawer-section-title">⚙️ Interactive Container Thermal & BMS Controls</h4>
        
        <div class="control-field">
          <div class="control-label-row">
            <label>HVAC Chiller Cooling Target Setpoint</label>
            <strong id="drawer-hvac-val" class="cyan-text">22°C</strong>
          </div>
          <input type="range" min="15" max="30" value="22" oninput="document.getElementById('drawer-hvac-val').innerText = this.value + '°C'; showToast('HVAC Setpoint', 'Updated ${node.id} chiller target to ' + this.value + '°C', 'action')">
        </div>

        <div class="drawer-btn-group">
          <button class="btn-hitl-primary" onclick="showToast('Cell Balance', 'Triggered Modbus passive cell balancing for ${node.id}', 'success'); closeDrawerDirect();">⚡ Run Container Balancing Cycle</button>
          <button class="btn-hitl-secondary" onclick="executeHitlAction('dispatch-om')">🛠️ Dispatch Field Technician Ticket</button>
        </div>
      </div>

      <!-- HISTORICAL TELEMETRY LOGS -->
      <div class="drawer-section-card">
        <h4 class="drawer-section-title">⏱️ Container Telemetry Audit Timeline</h4>
        <div class="audit-timeline">
          <div class="timeline-item"><span class="t-dot green"></span><div><strong>08:24:12 AM</strong>: Modbus telemetry heartbeat received. Cell sync OK.</div></div>
          <div class="timeline-item"><span class="t-dot ${isWarn ? 'amber' : 'blue'}"></span><div><strong>08:15:00 AM</strong>: ${isWarn ? 'Thermal drift detected in Rack C (+18.7°C rise).' : 'Discharge cycle started (10 MW to 345kV Grid Bus).'}</div></div>
          <div class="timeline-item"><span class="t-dot blue"></span><div><strong>07:30:00 AM</strong>: Automated daily BMS impedance diagnostic passed.</div></div>
        </div>
      </div>
    </div>
  `;
  openDrawer(`${node.id} SCADA Telemetry Twin`, html);
}

function fileIsoDispute() {
  const stmt = prompt('Enter Billing Statement ID for ISO Market Dispute:', '#SET-9911');
  if (!stmt) return;
  showToast('ISO Dispute Filed', `Submitted market dispute for ${stmt} to ISO Market Operator. Meter logs attached.`, 'warning');
  appendConsoleLine(`[SETTLEMENTS]: Filed ISO market dispute ticket for ${stmt}.`, 'action');
}

function exportSecPpaPdf() {
  showToast('PDF Export', 'Generated SEC & Utility Compliant Invoicing Memo (PDF). Ingestion verification matched.', 'success');
  appendConsoleLine('[SETTLEMENTS]: Exported SEC & Utility PPA Compliance Memo (PDF).', 'action');
}

function triggerAttachment() {
  showToast('Attachment', 'Loaded SCADA telemetry log export file.', 'action');
}

// -------------------------------------------------------------
// WORKFLOW & HITL CALL-TO-ACTION (CTA) HANDLERS
// -------------------------------------------------------------
function executeHitlAction(actionType) {
  const modal = document.getElementById('app-modal');
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');
  const footer = document.getElementById('modal-footer');

  if (!modal || !body) return;

  if (actionType === 'curtail') {
    title.innerText = '🛡️ HITL Action Preview: BESS Container #3 Curtailment';
    body.innerHTML = `
      <div class="hitl-preview-card">
        <div class="hitl-proposal-row">
          <span class="hitl-proposal-icon">🤖</span>
          <div class="hitl-proposal-text">
            <h4>PROPOSED ACTION: Curtail Container #3 Charge Rate to 0.5C</h4>
            <p>The Operator detected thermal drift (42.1°C). Proposed action will reduce charge current to lower heat generation before the 09:00 AM peak.</p>
          </div>
        </div>
        <div class="hitl-proof-grid">
          <div class="hitl-proof-box"><span class="proof-label">CURRENT TEMP</span><span class="proof-val" style="color:var(--amber-400);">42.1°C</span></div>
          <div class="hitl-proof-box"><span class="proof-label">TARGET TEMP</span><span class="proof-val" style="color:var(--emerald-400);">22.4°C</span></div>
          <div class="hitl-proof-box"><span class="proof-label">PENALTY RISK</span><span class="proof-val" style="color:var(--emerald-400);">$0.00</span></div>
        </div>
      </div>
    `;
    footer.innerHTML = `
      <button class="btn-hitl-reject" onclick="closeModalDirect()">✕ Reject Proposal</button>
      <button class="btn-hitl-confirm" onclick="confirmHitlExecution('curtail')">✔ CONFIRM & DISPATCH (HUMAN SIGN-OFF)</button>
    `;
  } else if (actionType === 'arbitrage-dispatch') {
    title.innerText = '⚡ HITL Action Preview: 5-Min Spot Discharge';
    body.innerHTML = `
      <div class="hitl-preview-card">
        <div class="hitl-proposal-row">
          <span class="hitl-proposal-icon">📈</span>
          <div class="hitl-proposal-text">
            <h4>PROPOSED ACTION: Dispatch 25 MW Discharge @ ERCOT South</h4>
            <p>The Analyst detected a $248.50/MWh price surge. Gate closes in 03:42. Marginal cell wear is $38.10/MWh.</p>
          </div>
        </div>
        <div class="hitl-proof-grid">
          <div class="hitl-proof-box"><span class="proof-label">SPOT LMP</span><span class="proof-val" style="color:var(--emerald-400);">$248.50/MWh</span></div>
          <div class="hitl-proof-box"><span class="proof-label">CELL WEAR</span><span class="proof-val" style="color:var(--amber-400);">$38.10/MWh</span></div>
          <div class="hitl-proof-box"><span class="proof-label">NET PROFIT</span><span class="proof-val" style="color:var(--cyan-400);">+$210.40/MWh</span></div>
        </div>
      </div>
    `;
    footer.innerHTML = `
      <button class="btn-hitl-reject" onclick="closeModalDirect()">✕ Reject Proposal</button>
      <button class="btn-hitl-confirm" onclick="confirmHitlExecution('arbitrage-dispatch')">✔ CONFIRM & SUBMIT BID (HUMAN SIGN-OFF)</button>
    `;
  } else if (actionType === 'reconcile-sla') {
    title.innerText = '📊 HITL Action Preview: Outage SLA Buffer Reconciliation';
    body.innerHTML = `
      <div class="hitl-preview-card">
        <div class="hitl-proposal-row">
          <span class="hitl-proposal-icon">📜</span>
          <div class="hitl-proposal-text">
            <h4>PROPOSED ACTION: Lock Q3 Downtime Buffer Log (16.1 Hrs Safe)</h4>
            <p>Audits 1.4 hours of downtime against 17.5 hours quarterly allowance. Zero penalty accrued.</p>
          </div>
        </div>
      </div>
    `;
    footer.innerHTML = `
      <button class="btn-hitl-reject" onclick="closeModalDirect()">✕ Reject</button>
      <button class="btn-hitl-confirm" onclick="confirmHitlExecution('reconcile-sla')">✔ CONFIRM & LOCK BUFFER</button>
    `;
  } else {
    confirmHitlExecution(actionType);
    return;
  }

  modal.classList.add('open');
}

function confirmHitlExecution(actionType) {
  closeModalDirect();
  if (actionType === 'curtail') {
    showToast('HUMAN SIGN-OFF APPROVED', 'Container #3 charge rate curtailed to 0.5C. SCADA Modbus register updated.', 'success');
    appendConsoleLine('[HITL SIGN-OFF]: Human Operator approved 0.5C curtailment for Container #3.', 'action');
    const barText = document.getElementById('morning-focus-text');
    if (barText) barText.innerText = '✓ Human Approved: Container #3 Curtailment Active (0.5C).';
  } else if (actionType === 'arbitrage-dispatch') {
    showToast('HUMAN SIGN-OFF APPROVED', '25 MW Discharge submitted to ERCOT South @ $248.50/MWh (Net Profit +$210.40/MWh).', 'action');
    appendConsoleLine('[HITL SIGN-OFF]: Human Trader confirmed 25 MW spot discharge @ $248.50/MWh.', 'action');
  } else if (actionType === 'reconcile-sla') {
    showToast('HUMAN SIGN-OFF APPROVED', 'Downtime buffer reconciled. 16.1 Hours safe buffer locked.', 'success');
    appendConsoleLine('[HITL SIGN-OFF]: Human Compliance Officer locked Q3 downtime buffer log.', 'action');
  }
}

function approveMorningPlan() {
  executeHitlAction('curtail');
}

function executeEndShiftHandover() {
  showToast('HUMAN SHIFT SIGN-OFF', 'Locked 24/7 Autonomous AI Safety & Trading Guardrails. Generated Shift Summary PDF.', 'success');
  appendConsoleLine('[WORKFLOW 05:00 PM]: Human Operator signed off shift & engaged Night AI Guardrails.', 'action');
}

// LIVE 5-MINUTE ISO BID GATE COUNTDOWN TIMER
let timerSeconds = 222; // 03:42
function startIsoGateTimer() {
  setInterval(() => {
    timerSeconds--;
    if (timerSeconds <= 0) timerSeconds = 300; // Reset 5-min interval

    const min = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
    const sec = String(timerSeconds % 60).padStart(2, '0');
    const clockEl = document.getElementById('timer-clock-text');
    if (clockEl) clockEl.innerText = `${min}:${sec}`;
  }, 1000);
}

// Re-render on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  renderConversationsList();
  renderScadaNodes();
  startIsoGateTimer();
});
