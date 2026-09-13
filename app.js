// SLOE Energy Agentic OS Core Engine

let currentMode = 'CONTRACTED_OPS';
let primaryChartInstance = null;
let simulationTimer = null;

// Initial State Dictionaries for Each Mode
const TAXONOMY_CONFIG = {
  CONTRACTED_OPS: {
    bannerTitle: "📜 Contracted Asset Operations Mode",
    bannerDesc: "Focusing on Availability SLAs, Thermal Envelope Safety, State of Health (SoH) Fade Curves, and OEM Warranty Limits.",
    kpi1Label: "AVAILABILITY SLA",
    kpi1Val: "99.8%",
    kpi1Class: "positive",
    kpi2Label: "SYSTEM SOH",
    kpi2Val: "97.4%",
    kpi2Class: "",
    kpi3Label: "ACTIVE ALERTS",
    kpi3Val: "2 Warnings",
    kpi3Class: "warning",
    chartIcon: "📉",
    chartTitle: "Fleet Battery Health & Degradation Fade Curve",
    chartLiveTag: "SCADA Live (50ms)",
    secondaryIcon: "🔥",
    secondaryTitle: "BESS Container Thermal Heatmap",
    secondaryBadge: "12 Containers",
    tableIcon: "🛠️",
    tableTitle: "Autonomous O&M Work Orders & Field Dispatch",
    tableHeaders: ["Ticket ID", "Asset Unit", "Diagnostic Trigger", "Agent Recommendation", "Status", "Action"],
    drawerSub: "Active Lens: Contracted Asset Ops",
    agents: [
      { avatar: "🛡️", name: "Battery Physics & Health Agent", role: "Continuous SCADA Telemetry Guardrail", desc: "Monitors cell voltage delta, thermal runaway markers, and state-of-health fade rates.", action: "Auto-curtailed Rack #7 charging due to 3.8°C thermal anomaly." },
      { avatar: "📜", name: "SLA & OEM Warranty Guardrail", role: "Legal & Operating Boundary Enforcement", desc: "Audits operational throughput against CATL/Tesla Megapack warranty contracts.", action: "Verified 99.8% Availability SLA status for Q3 utility compliance reporting." },
      { avatar: "🔧", name: "Autonomous Field Dispatch Agent", role: "O&M Technician & Parts Logistics", desc: "Automatically generates diagnostic tickets, checks inventory, and schedules field dispatch.", action: "Issued Work Order #WO-8902 for Inverter #3 fan replacement." }
    ]
  },
  MERCHANT_MARKET: {
    bannerTitle: "📈 Merchant Market Operations Mode",
    bannerDesc: "Focusing on Real-Time ERCOT/CAISO LMP Bidding, Net Arbitrage Spreads, Marginal Cycling Costs, and Quant Forecasts.",
    kpi1Label: "NET ARBITRAGE SPREAD",
    kpi1Val: "$184.20 / MWh",
    kpi1Class: "positive",
    kpi2Label: "LIVE LMP PRICE",
    kpi2Val: "$248.50",
    kpi2Class: "warning",
    kpi3Label: "MARGINAL CYCLING COST",
    kpi3Val: "$38.10 / MWh",
    kpi3Class: "",
    chartIcon: "⚡",
    chartTitle: "Real-Time 5-Min LMP Price Spikes & Execution Bids",
    chartLiveTag: "ERCOT Market Feed",
    secondaryIcon: "📊",
    secondaryTitle: "Wholesale Bidding Stack & Margin Ladder",
    secondaryBadge: "ERCOT South Zone",
    tableIcon: "💰",
    tableTitle: "Autonomous Market Bids & Execution Log",
    tableHeaders: ["Bid ID", "Market", "Volume (MW)", "LMP Target ($)", "Degradation Cost", "Execution Status"],
    drawerSub: "Active Lens: Merchant Market Bidding",
    agents: [
      { avatar: "⚡", name: "LMP Arbitrage Bidding Agent", role: "High-Frequency Wholesale Market Execution", desc: "Executes 5-minute charge/discharge bids to capture peak electricity price spreads.", action: "Submitted 25MW discharge bid at $248.50/MWh target price." },
      { avatar: "⚖️", name: "Degradation Cost Governor", role: "CapEx Wear-and-Tear Safeguard", desc: "Calculates marginal cell degradation costs ($/MWh) to block unprofitable trades.", action: "Blocked 12MW charge order: Margins fell below $15/MWh threshold." },
      { avatar: "🌤️", name: "Quant & Solar Forecast Agent", role: "Grid Congestion & Irradiance AI", desc: "Predicts solar cloud-cover drops and regional transmission line bottlenecks.", action: "Forecasted +$90 LMP price spike at 18:45 due to solar ramp-down." }
    ]
  },
  UNIFIED: {
    bannerTitle: "🌐 Unified Enterprise Mode",
    bannerDesc: "Portfolio C-Suite Executive Overview: Bridging Merchant Trading Profits with Physical Asset Lifetime Values.",
    kpi1Label: "PORTFOLIO REVENUE",
    kpi1Val: "$4.28M YTD",
    kpi1Class: "positive",
    kpi2Label: "PORTFOLIO SOH",
    kpi2Val: "98.1% Avg",
    kpi2Class: "positive",
    kpi3Label: "SLA PENALTY RISK",
    kpi3Val: "$0.00",
    kpi3Class: "positive",
    chartIcon: "🌐",
    chartTitle: "Portfolio Net Margin vs Battery Capacity Fade",
    chartLiveTag: "Enterprise Unified",
    secondaryIcon: "🏢",
    secondaryTitle: "Asset Portfolio Regional Overview",
    secondaryBadge: "4 Solar+BESS Sites",
    tableIcon: "⚖️",
    tableTitle: "Cross-Department Governance & Action Items",
    tableHeaders: ["Event ID", "Site Name", "Trading Strategy", "Hardware Impact", "SLOE Governance Action", "Approval"],
    drawerSub: "Active Lens: Unified Portfolio C-Suite",
    agents: [
      { avatar: "🌐", name: "Portfolio Strategy Governor", role: "Cross-Vertical Optimization", desc: "Balances multi-site Merchant trading revenues against long-term PPA availability SLAs.", action: "Reallocated 50MWh capacity to high-margin ERCOT market." },
      { avatar: "🛡️", name: "Enterprise Risk Agent", role: "Regulatory & Financial Auditor", desc: "Audits overall asset degradation, insurance compliance, and market exposure.", action: "Confirmed zero warranty breach risks across all 4 utility sites." },
      { avatar: "⚡", name: "System Optimization Engine", role: "Autonomous Co-location Manager", desc: "Co-optimizes solar generation, battery charging, and grid export limits.", action: "Auto-diverted 18MW excess solar directly to BESS storage." }
    ]
  }
};

// Simulated Work Orders / Bids Data
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

// Initialize Application on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  renderChart();
  renderSecondaryPanel();
  renderTable();
  startSimulation();
});

// Mode Switching Engine
function switchMode(newMode) {
  currentMode = newMode;
  document.body.className = `mode-${newMode.toLowerCase()}`;

  // Update Button Active States
  document.getElementById('btn-mode-contracted').classList.toggle('active', newMode === 'CONTRACTED_OPS');
  document.getElementById('btn-mode-merchant').classList.toggle('active', newMode === 'MERCHANT_MARKET');
  document.getElementById('btn-mode-unified').classList.toggle('active', newMode === 'UNIFIED');

  const config = TAXONOMY_CONFIG[newMode];

  // Update Banner & KPIs
  document.getElementById('banner-title').innerText = config.bannerTitle;
  document.getElementById('banner-desc').innerText = config.bannerDesc;
  
  document.getElementById('banner-kpi1-label').innerText = config.kpi1Label;
  document.getElementById('banner-kpi1-val').innerText = config.kpi1Val;
  document.getElementById('banner-kpi1-val').className = `stat-val ${config.kpi1Class}`;

  document.getElementById('banner-kpi2-label').innerText = config.kpi2Label;
  document.getElementById('banner-kpi2-val').innerText = config.kpi2Val;
  document.getElementById('banner-kpi2-val').className = `stat-val ${config.kpi2Class}`;

  document.getElementById('banner-kpi3-label').innerText = config.kpi3Label;
  document.getElementById('banner-kpi3-val').innerText = config.kpi3Val;
  document.getElementById('banner-kpi3-val').className = `stat-val ${config.kpi3Class}`;

  // Update Section Titles & Icons
  document.getElementById('chart-card-icon').innerText = config.chartIcon;
  document.getElementById('chart-card-title').innerText = config.chartTitle;
  document.getElementById('chart-live-tag').innerText = config.chartLiveTag;

  document.getElementById('secondary-card-icon').innerText = config.secondaryIcon;
  document.getElementById('secondary-card-title').innerText = config.secondaryTitle;
  document.getElementById('secondary-badge').innerText = config.secondaryBadge;

  document.getElementById('table-card-icon').innerText = config.tableIcon;
  document.getElementById('table-card-title').innerText = config.tableTitle;

  // Update Drawer Subtitle & Agent Cards
  document.getElementById('drawer-sub').innerText = config.drawerSub;
  config.agents.forEach((agent, idx) => {
    const i = idx + 1;
    document.getElementById(`agent-avatar-${i}`).innerText = agent.avatar;
    document.getElementById(`agent-name-${i}`).innerText = agent.name;
    document.getElementById(`agent-role-${i}`).innerText = agent.role;
    document.getElementById(`agent-desc-${i}`).innerText = agent.desc;
    document.getElementById(`agent-action-${i}`).innerHTML = `<strong>Latest Decision:</strong> ${agent.action}`;
  });

  // Re-render Components for the selected Mode
  updateChartData();
  renderSecondaryPanel();
  renderTable();
  addLogMessage(`Switched operational mode to ${config.bannerTitle}`);
}

// Chart.js Rendering Engine
function renderChart() {
  const ctx = document.getElementById('primaryChart').getContext('2d');
  
  primaryChartInstance = new Chart(ctx, {
    type: 'line',
    data: getChartDataForMode('CONTRACTED_OPS'),
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b99a8', font: { family: 'JetBrains Mono', size: 10 } } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b99a8', font: { family: 'JetBrains Mono', size: 10 } } }
      },
      plugins: {
        legend: { labels: { color: '#f0f4f8', font: { family: 'Outfit', size: 12 } } }
      }
    }
  });
}

function getChartDataForMode(mode) {
  const labels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:59'];
  
  if (mode === 'CONTRACTED_OPS') {
    return {
      labels,
      datasets: [
        { label: 'System SoH (%)', data: [98.5, 98.4, 98.1, 97.9, 97.6, 97.4, 97.4], borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.3 },
        { label: 'OEM Warranty Threshold (%)', data: [95, 95, 95, 95, 95, 95, 95], borderColor: '#ef4444', borderDash: [5, 5], fill: false }
      ]
    };
  } else if (mode === 'MERCHANT_MARKET') {
    return {
      labels,
      datasets: [
        { label: 'Real-Time LMP ($/MWh)', data: [22, 18, 45, 12, 180, 248, 65], borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.15)', fill: true, tension: 0.2 },
        { label: 'Marginal Cycling Cost ($/MWh)', data: [38, 38, 38, 38, 38, 38, 38], borderColor: '#f59e0b', borderDash: [4, 4], fill: false }
      ]
    };
  } else {
    return {
      labels,
      datasets: [
        { label: 'Daily Arbitrage Revenue ($k)', data: [12, 8, 25, 40, 85, 110, 45], borderColor: '#a855f7', backgroundColor: 'rgba(168, 85, 247, 0.15)', fill: true, tension: 0.3 },
        { label: 'Battery Capacity Fade Risk Index', data: [1.1, 1.2, 1.4, 1.8, 2.1, 2.4, 1.9], borderColor: '#10b981', fill: false }
      ]
    };
  }
}

function updateChartData() {
  if (primaryChartInstance) {
    primaryChartInstance.data = getChartDataForMode(currentMode);
    primaryChartInstance.update();
  }
}

// Render Secondary Heatmap or Bidding Stack
function renderSecondaryPanel() {
  const container = document.getElementById('secondary-panel-content');
  container.innerHTML = '';

  if (currentMode === 'CONTRACTED_OPS') {
    for (let i = 1; i <= 12; i++) {
      const temp = (34 + Math.random() * 8).toFixed(1);
      const isWarm = temp > 39;
      const tempClass = isWarm ? 'hot' : temp > 37 ? 'warm' : 'normal';
      const soc = Math.floor(40 + Math.random() * 55);

      const cell = document.createElement('div');
      cell.className = 'container-cell';
      cell.innerHTML = `
        <div class="cell-header">
          <span>BESS #${i}</span>
          <span>${soc}% SoC</span>
        </div>
        <div class="cell-temp ${tempClass}">${temp}°C</div>
        <div class="cell-soc-bar">
          <div class="cell-soc-fill" style="width: ${soc}%"></div>
        </div>
      `;
      container.appendChild(cell);
    }
  } else {
    // Merchant Bidding Ladder
    const bids = [
      { time: '18:30', vol: '25 MW', price: '$248.50', type: 'Discharge (SELL)' },
      { time: '18:45', vol: '30 MW', price: '$210.00', type: 'Discharge (SELL)' },
      { time: '13:15', vol: '40 MW', price: '$12.50', type: 'Charge (BUY)' },
      { time: '14:00', vol: '35 MW', price: '$15.00', type: 'Charge (BUY)' }
    ];

    bids.forEach(bid => {
      const cell = document.createElement('div');
      cell.style.gridColumn = 'span 2';
      cell.className = 'container-cell';
      cell.innerHTML = `
        <div class="cell-header">
          <span>${bid.time} - ${bid.type}</span>
          <span style="color:var(--accent-merchant); font-weight:bold;">${bid.vol}</span>
        </div>
        <div class="cell-temp normal" style="font-size:1.1rem;">${bid.price}</div>
        <span style="font-size:0.68rem; color:var(--text-dim);">Market Target Rate</span>
      `;
      container.appendChild(cell);
    });
  }
}

// Render Data Tables
function renderTable() {
  const tbody = document.getElementById('table-body');
  const theadRow = document.getElementById('table-head-row');
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
      <td><button class="btn-sm btn-primary" onclick="addLogMessage('Executed action on ${r.col1}')">Inspect</button></td>
    </tr>
  `).join('');
}

// Interactive Agent Drawer Toggle
function toggleAgentDrawer() {
  const drawer = document.getElementById('agent-drawer');
  drawer.classList.toggle('open');
}

// Agent Log Stream
function addLogMessage(msg) {
  const stream = document.getElementById('agent-log-stream');
  const time = new Date().toLocaleTimeString();
  
  const item = document.createElement('div');
  item.className = 'log-item';
  item.innerHTML = `
    <span class="log-time">[${time}]</span>
    <span class="log-text">${msg}</span>
  `;
  
  stream.insertBefore(item, stream.firstChild);
}

// Agent Command Input Handler
function handleAgentPrompt(event) {
  if (event.key === 'Enter') {
    submitAgentPrompt();
  }
}

function submitAgentPrompt() {
  const input = document.getElementById('agent-prompt-input');
  const val = input.value.trim();
  if (!val) return;

  addLogMessage(`User Prompt: "${val}"`);
  input.value = '';

  setTimeout(() => {
    if (currentMode === 'CONTRACTED_OPS') {
      addLogMessage(`🤖 Battery Health Agent: Analyzing telemetry for "${val}"... Verified zero thermal degradation risk.`);
    } else {
      addLogMessage(`🤖 Arbitrage Agent: Running 5-min quant model for "${val}"... Optimizing ERCOT bidding ladder.`);
    }
  }, 600);
}

// Simulation Event Trigger
function simulateNewEvent() {
  if (currentMode === 'CONTRACTED_OPS') {
    addLogMessage('🚨 SCADA ALERT: Inverter #4 Fan Speed Drop (-15%). Auto-generated Work Order #WO-9084.');
  } else {
    addLogMessage('⚡ MARKET SPIKE: ERCOT LMP surged to $310.00/MWh! Submitted emergency discharge bid.');
  }
}

function startSimulation() {
  simulationTimer = setInterval(() => {
    if (Math.random() > 0.6) {
      simulateNewEvent();
    }
  }, 10000);
}
