// SLOE Energy Agentic OS Core Multi-Screen Engine

let activeScreen = 'command-center';
let currentMode = 'CONTRACTED_OPS';
let primaryChartInstance = null;
let commandChartInstance = null;

// Composio Integration Catalog
const COMPOSIO_APPS = [
  { id: 'modbus', icon: '⚡', name: 'Modbus TCP / SCADA Gateway', category: 'Energy Protocol', desc: 'Direct high-frequency telemetry ingestion from BESS BMS and Inverters.', status: 'Connected', badge: 'connected' },
  { id: 'ercot', icon: '📈', name: 'ERCOT Market Gateway', category: 'Wholesale Market API', desc: 'Real-time Locational Marginal Price (LMP) feeds and 5-min bid settlement.', status: 'Connected', badge: 'connected' },
  { id: 'caiso', icon: '☀️', name: 'CAISO OASIS Gateway', category: 'Wholesale Market API', desc: 'Day-ahead solar irradiance curves and ancillary frequency response bids.', status: 'Connected', badge: 'connected' },
  { id: 'salesforce', icon: '💼', name: 'Salesforce Field Service', category: 'Enterprise ERP', desc: 'Auto-dispatches certified technicians and syncs high-voltage replacement parts.', status: 'Connected', badge: 'connected' },
  { id: 'maximo', icon: '🏗️', name: 'IBM Maximo Asset Mgmt', category: 'Enterprise ERP', desc: 'Syncs SLA availability penalty metrics and long-term asset health records.', status: 'Connected', badge: 'connected' },
  { id: 'slack', icon: '💬', name: 'Slack Ops Notifications', category: 'Communication', desc: 'Sends immediate thermal anomaly alerts and autonomous bid execution digests.', status: 'Connected', badge: 'connected' }
];

// Full Multi-Agent Control Room Roster
const AGENT_ROSTER = [
  { id: 'physics', avatar: '🛡️', name: 'Battery Physics & Thermal Safety Agent', role: 'Continuous SCADA Telemetry Guardrail', desc: 'Monitors cell voltage delta, thermal runaway markers, and state-of-health fade rates.', trigger: 'Cell Temp > 40.0°C', action: 'Curtails charging to 0.5C rate' },
  { id: 'warranty', avatar: '📜', name: 'SLA & OEM Warranty Guardrail', role: 'Legal & Operating Boundary Enforcement', desc: 'Audits operational throughput against CATL/Tesla Megapack warranty contracts.', trigger: 'Annual Cycles > 365 EFC', action: 'Caps max daily discharge depth' },
  { id: 'dispatch', avatar: '🔧', name: 'Autonomous Field Dispatch Agent', role: 'O&M Technician & Parts Logistics', desc: 'Automatically generates diagnostic tickets, checks inventory, and schedules field dispatch.', trigger: 'Inverter Fan Failure', action: 'Dispatches Tech via Salesforce' },
  { id: 'arbitrage', avatar: '⚡', name: 'LMP Arbitrage Bidding Agent', role: 'High-Frequency Wholesale Market Execution', desc: 'Executes 5-minute charge/discharge bids to capture peak electricity price spreads.', trigger: 'LMP Spread > $120/MWh', action: 'Submits 25MW Discharge Order' },
  { id: 'quant', avatar: '🌤️', name: 'Quant & Solar Forecast Agent', role: 'Grid Congestion & Irradiance AI', desc: 'Predicts solar cloud-cover drops and regional transmission line bottlenecks.', trigger: 'Solar Ramp-down Spike', action: 'Forecasts +$90 LMP price jump' }
];

// Regional Grid Sites
const GRID_SITES = [
  { name: 'Lone Star BESS (Texas)', capacity: '250 MW / 1.0 GWh', status: 'Online (ERCOT)', soh: '98.4%', temp: '36.2°C', badge: 'online' },
  { name: 'Mojave Solar+Storage (CA)', capacity: '500 MW / 2.0 GWh', status: 'Online (CAISO)', soh: '97.9%', temp: '38.1°C', badge: 'online' },
  { name: 'PJM Grid Stabilizer (PA)', capacity: '500 MW / 1.8 GWh', status: 'Online (PJM)', soh: '99.1%', temp: '34.8°C', badge: 'online' }
];

// Taxonomy Config for Dual-Mode Operations Workspace
const TAXONOMY_CONFIG = {
  CONTRACTED_OPS: {
    bannerTitle: "📜 Contracted Asset Operations Mode",
    bannerDesc: "Focusing on Availability SLAs, Thermal Envelope Safety, State of Health (SoH) Fade Curves, and OEM Warranty Limits.",
    kpi1Label: "AVAILABILITY SLA", kpi1Val: "99.8%", kpi1Class: "positive",
    kpi2Label: "SYSTEM SOH", kpi2Val: "97.4%", kpi2Class: "",
    kpi3Label: "ACTIVE ALERTS", kpi3Val: "2 Warnings", kpi3Class: "warning",
    chartIcon: "📉", chartTitle: "Fleet Battery Health & Degradation Fade Curve", chartLiveTag: "SCADA Live (50ms)",
    secondaryIcon: "🔥", secondaryTitle: "BESS Container Thermal Heatmap", secondaryBadge: "12 Containers",
    tableIcon: "🛠️", tableTitle: "Autonomous O&M Work Orders & Field Dispatch",
    tableHeaders: ["Ticket ID", "Asset Unit", "Diagnostic Trigger", "Agent Recommendation", "Status", "Action"]
  },
  MERCHANT_MARKET: {
    bannerTitle: "📈 Merchant Market Operations Mode",
    bannerDesc: "Focusing on Real-Time ERCOT/CAISO LMP Bidding, Net Arbitrage Spreads, Marginal Cycling Costs, and Quant Forecasts.",
    kpi1Label: "NET ARBITRAGE SPREAD", kpi1Val: "$184.20 / MWh", kpi1Class: "positive",
    kpi2Label: "LIVE LMP PRICE", kpi2Val: "$248.50", kpi2Class: "warning",
    kpi3Label: "MARGINAL CYCLING COST", kpi3Val: "$38.10 / MWh", kpi3Class: "",
    chartIcon: "⚡", chartTitle: "Real-Time 5-Min LMP Price Spikes & Execution Bids", chartLiveTag: "ERCOT Market Feed",
    secondaryIcon: "📊", secondaryTitle: "Wholesale Bidding Stack & Margin Ladder", secondaryBadge: "ERCOT South Zone",
    tableIcon: "💰", tableTitle: "Autonomous Market Bids & Execution Log",
    tableHeaders: ["Bid ID", "Market", "Volume (MW)", "LMP Target ($)", "Degradation Cost", "Execution Status"]
  },
  UNIFIED: {
    bannerTitle: "🌐 Unified Enterprise Mode",
    bannerDesc: "Portfolio C-Suite Executive Overview: Bridging Merchant Trading Profits with Physical Asset Lifetime Values.",
    kpi1Label: "PORTFOLIO REVENUE", kpi1Val: "$4.28M YTD", kpi1Class: "positive",
    kpi2Label: "PORTFOLIO SOH", kpi2Val: "98.1% Avg", kpi2Class: "positive",
    kpi3Label: "SLA PENALTY RISK", kpi3Val: "$0.00", kpi3Class: "positive",
    chartIcon: "🌐", chartTitle: "Portfolio Net Margin vs Battery Capacity Fade", chartLiveTag: "Enterprise Unified",
    secondaryIcon: "🏢", secondaryTitle: "Asset Portfolio Regional Overview", secondaryBadge: "4 Solar+BESS Sites",
    tableIcon: "⚖️", tableTitle: "Cross-Department Governance & Action Items",
    tableHeaders: ["Event ID", "Site Name", "Trading Strategy", "Hardware Impact", "SLOE Governance Action", "Approval"]
  }
};

const MOCK_TABLE_DATA = {
  CONTRACTED_OPS: [
    { col1: "#WO-9081", col2: "Container #3", col3: "Thermal Spike (42.1°C)", col4: "Curtail Charge to 0.5C", status: "Active", badge: "active" },
    { col1: "#WO-9082", col2: "PV Inverter #8", col3: "Efficiency Drop (-4.2%)", col4: "Clean Dust Filter & Calibrate", status: "Scheduled", badge: "warning" },
    { col1: "#WO-9083", col2: "Rack #11", col3: "Cell Delta V > 80mV", col4: "Run Autonomous Balancing Cycle", status: "Resolved", badge: "success" }
  ],
  MERCHANT_MARKET: [
    { col1: "#BID-4491", col2: "ERCOT Real-Time", col3: "25 MW (Discharge)", col4: "$248.50 / MWh", status: "Executed", badge: "success" },
    { col1: "#BID-4492", col2: "ERCOT Day-Ahead", col3: "40 MW (Charge)", col4: "$18.20 / MWh", status: "Pending", badge: "active" },
    { col1: "#BID-4493", col2: "CAISO Ancillary", col3: "10 MW (Spin Reserve)", col4: "$45.00 / MWh", status: "Cleared", badge: "success" }
  ],
  UNIFIED: [
    { col1: "#GOV-102", col2: "Lone Star BESS (Texas)", col3: "Aggressive Day Trading", col4: "High Heat Risk", status: "Cap Trading at 1.5 Cycles", badge: "warning" },
    { col1: "#GOV-103", col2: "Mojave Solar (CA)", col3: "Solar Clipping Loss", col4: "Charge BESS early", status: "Auto-Optimized", badge: "success" }
  ]
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  renderGridMap();
  renderComposioApps();
  renderAgentRoster();
  renderDrawerCards();
  renderCharts();
  renderSecondaryPanel();
  renderTable();
});

// SPA Router
function navigateTo(screenId) {
  activeScreen = screenId;
  
  // Hide all screens & deactivate nav items
  document.querySelectorAll('.screen-view').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

  // Show target screen & activate nav item
  const targetScreen = document.getElementById(`screen-${screenId}`);
  const targetNav = document.getElementById(`nav-${screenId}`);
  
  if (targetScreen) targetScreen.classList.add('active');
  if (targetNav) targetNav.classList.add('active');

  // Toggle Header Mode Selector visibility
  const modeSelector = document.getElementById('header-mode-selector');
  if (modeSelector) {
    modeSelector.style.display = (screenId === 'operations') ? 'flex' : 'none';
  }
}

// Render Command Center Grid Map
function renderGridMap() {
  const container = document.getElementById('grid-map-container');
  if (!container) return;

  container.innerHTML = GRID_SITES.map(s => `
    <div class="site-card">
      <div class="site-card-header">
        <span>${s.name}</span>
        <span class="site-badge ${s.badge}">${s.status}</span>
      </div>
      <div style="font-size:1.1rem; font-weight:700; font-family:var(--font-mono); color:var(--text-main); margin:0.3rem 0;">
        ${s.capacity}
      </div>
      <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-muted);">
        <span>Health SoH: <strong style="color:var(--accent-contracted);">${s.soh}</strong></span>
        <span>Temp: <strong>${s.temp}</strong></span>
      </div>
    </div>
  `).join('');
}

// Render Composio Integration Apps
function renderComposioApps() {
  const container = document.getElementById('integrations-grid');
  if (!container) return;

  container.innerHTML = COMPOSIO_APPS.map(app => `
    <div class="integration-card">
      <div class="integration-header">
        <span class="integration-icon">${app.icon}</span>
        <div>
          <h4 class="integration-name">${app.name}</h4>
          <span class="integration-category">${app.category}</span>
        </div>
        <span class="integration-status ${app.badge}">${app.status}</span>
      </div>
      <p style="font-size:0.78rem; color:var(--text-muted); line-height:1.3;">${app.desc}</p>
      <button class="btn-sm btn-primary" onclick="addLogMessage('Composio triggered sync for ${app.name}')">Configure Action</button>
    </div>
  `).join('');
}

// Render Multi-Agent Control Room Roster
function renderAgentRoster() {
  const container = document.getElementById('agent-control-grid');
  if (!container) return;

  container.innerHTML = AGENT_ROSTER.map(agent => `
    <div class="agent-control-card">
      <div class="agent-control-header">
        <span class="agent-control-avatar">${agent.avatar}</span>
        <div>
          <h4 style="font-size:1rem; font-weight:600;">${agent.name}</h4>
          <span style="font-size:0.72rem; color:var(--text-muted);">${agent.role}</span>
        </div>
        <span class="badge-status success" style="margin-left:auto;">ONLINE</span>
      </div>
      <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.3;">${agent.desc}</p>
      <div style="background:var(--bg-dark); padding:0.6rem; border-radius:6px; font-size:0.75rem;">
        <div><strong>Activation Rule:</strong> ${agent.trigger}</div>
        <div style="color:var(--accent-merchant); margin-top:0.2rem;"><strong>Autonomous Action:</strong> ${agent.action}</div>
      </div>
    </div>
  `).join('');
}

// Render Drawer Cards
function renderDrawerCards() {
  const container = document.getElementById('drawer-body-cards');
  if (!container) return;

  container.innerHTML = AGENT_ROSTER.slice(0, 3).map(agent => `
    <div class="agent-card">
      <div class="agent-card-header">
        <span class="agent-avatar">${agent.avatar}</span>
        <div class="agent-info">
          <h4>${agent.name}</h4>
          <span class="agent-role">${agent.role}</span>
        </div>
        <span class="agent-status-badge online">ACTIVE</span>
      </div>
      <p class="agent-desc">${agent.desc}</p>
      <div class="agent-last-action">
        <strong>Latest Action:</strong> ${agent.action}
      </div>
    </div>
  `).join('');
}

// Render Charts
function renderCharts() {
  const ctxCmd = document.getElementById('commandChart')?.getContext('2d');
  if (ctxCmd) {
    commandChartInstance = new Chart(ctxCmd, {
      type: 'bar',
      data: {
        labels: ['12:00', '14:00', '16:00', '18:00', '20:00', '22:00'],
        datasets: [{ label: 'LMP Price ($/MWh)', data: [15, 18, 90, 248, 180, 45], backgroundColor: '#3b82f6' }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: { x: { ticks: { color: '#8b99a8' } }, y: { ticks: { color: '#8b99a8' } } }
      }
    });
  }

  const ctxPrimary = document.getElementById('primaryChart')?.getContext('2d');
  if (ctxPrimary) {
    primaryChartInstance = new Chart(ctxPrimary, {
      type: 'line',
      data: getChartDataForMode('CONTRACTED_OPS'),
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: { x: { ticks: { color: '#8b99a8' } }, y: { ticks: { color: '#8b99a8' } } }
      }
    });
  }
}

function getChartDataForMode(mode) {
  const labels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:59'];
  if (mode === 'CONTRACTED_OPS') {
    return {
      labels,
      datasets: [
        { label: 'System SoH (%)', data: [98.5, 98.4, 98.1, 97.9, 97.6, 97.4, 97.4], borderColor: '#10b981', fill: true, backgroundColor: 'rgba(16,185,129,0.1)' },
        { label: 'OEM Warranty Threshold', data: [95, 95, 95, 95, 95, 95, 95], borderColor: '#ef4444', borderDash: [5, 5] }
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

// Mode Switching Engine
function switchMode(newMode) {
  currentMode = newMode;
  document.body.className = `mode-${newMode.toLowerCase()}`;

  document.getElementById('btn-mode-contracted')?.classList.toggle('active', newMode === 'CONTRACTED_OPS');
  document.getElementById('btn-mode-merchant')?.classList.toggle('active', newMode === 'MERCHANT_MARKET');
  document.getElementById('btn-mode-unified')?.classList.toggle('active', newMode === 'UNIFIED');

  const config = TAXONOMY_CONFIG[newMode];
  if (config) {
    document.getElementById('banner-title').innerText = config.bannerTitle;
    document.getElementById('banner-desc').innerText = config.bannerDesc;
    document.getElementById('banner-kpi1-label').innerText = config.kpi1Label;
    document.getElementById('banner-kpi1-val').innerText = config.kpi1Val;
    document.getElementById('banner-kpi2-label').innerText = config.kpi2Label;
    document.getElementById('banner-kpi2-val').innerText = config.kpi2Val;
    document.getElementById('banner-kpi3-label').innerText = config.kpi3Label;
    document.getElementById('banner-kpi3-val').innerText = config.kpi3Val;
  }

  if (primaryChartInstance) {
    primaryChartInstance.data = getChartDataForMode(currentMode);
    primaryChartInstance.update();
  }

  renderSecondaryPanel();
  renderTable();
}

function renderSecondaryPanel() {
  const container = document.getElementById('secondary-panel-content');
  if (!container) return;
  container.innerHTML = '';

  for (let i = 1; i <= 12; i++) {
    const temp = (34 + Math.random() * 8).toFixed(1);
    const soc = Math.floor(40 + Math.random() * 55);
    const cell = document.createElement('div');
    cell.className = 'container-cell';
    cell.innerHTML = `
      <div style="font-size:0.7rem; color:var(--text-muted); display:flex; justify-content:space-between;">
        <span>BESS #${i}</span>
        <span>${soc}%</span>
      </div>
      <div style="font-size:1rem; font-weight:700; color:var(--accent-contracted); margin:0.3rem 0;">${temp}°C</div>
    `;
    container.appendChild(cell);
  }
}

function renderTable() {
  const tbody = document.getElementById('table-body');
  const theadRow = document.getElementById('table-head-row');
  if (!tbody || !theadRow) return;

  const headers = TAXONOMY_CONFIG[currentMode].tableHeaders;
  theadRow.innerHTML = headers.map(h => `<th>${h}</th>`).join('');

  const rows = MOCK_TABLE_DATA[currentMode];
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td style="font-family:var(--font-mono); font-weight:bold;">${r.col1}</td>
      <td>${r.col2}</td>
      <td>${r.col3}</td>
      <td style="color:var(--accent-contracted);">${r.col4}</td>
      <td><span class="badge-status ${r.badge}">${r.status}</span></td>
      <td><button class="btn-sm btn-primary" onclick="addLogMessage('Inspected ${r.col1}')">Inspect</button></td>
    </tr>
  `).join('');
}

function toggleAgentDrawer() {
  document.getElementById('agent-drawer')?.classList.toggle('open');
}

function addLogMessage(msg) {
  const stream = document.getElementById('agent-log-stream');
  if (!stream) return;
  const time = new Date().toLocaleTimeString();
  const item = document.createElement('div');
  item.className = 'log-item';
  item.innerHTML = `<span style="font-family:var(--font-mono); font-size:0.65rem; color:var(--text-dim);">[${time}]</span> <span>${msg}</span>`;
  stream.insertBefore(item, stream.firstChild);
}

function simulateNewEvent() {
  addLogMessage('🚨 SCADA ALERT: Inverter #4 Fan Speed Drop (-15%). Auto-generated Work Order #WO-9084.');
}

function handleAgentPrompt(event) {
  if (event.key === 'Enter') submitAgentPrompt();
}

function submitAgentPrompt() {
  const input = document.getElementById('agent-prompt-input');
  const val = input?.value.trim();
  if (!val) return;
  addLogMessage(`User Command: "${val}"`);
  input.value = '';
  setTimeout(() => {
    addLogMessage(`🤖 SLOE Agent: Executing query "${val}" via Composio SCADA Engine... Verified OK.`);
  }, 500);
}
