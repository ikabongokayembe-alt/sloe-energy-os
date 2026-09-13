// SLOE Energy OS Application Core (Matching SLOE-Finance-OS Architecture)

let activeView = 'today';
let currentDomain = 'contracted'; // 'contracted' or 'merchant'
let opsChartInstance = null;

// Dynamic Market Navigation Configurations
const NAV_CONFIG = {
  contracted: {
    domainBadge: 'CONTRACTED MODE',
    toggleLabel: 'Switch to Merchant Market',
    todayBadge: 'CONTRACTED ASSET OPERATIONS',
    todayDesc: 'Live availability tracking & telemetry-backed exception queue for PPA & Tolling contracts.',
    opsTitle: 'Availability SLA & Thermal Telemetry',
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
      { id: '#EX-9081', unit: 'Container #3', trigger: 'Thermal Spike (42.1°C)', rec: 'Curtail Charge to 0.5C', sev: 'High', badge: 'High' },
      { id: '#EX-9082', unit: 'PV Inverter #8', trigger: 'Efficiency Drop (-4.2%)', rec: 'Clean Dust Sensor & Calibrate', sev: 'Medium', badge: 'Medium' },
      { id: '#EX-9083', unit: 'Rack #11', trigger: 'Cell Delta V > 80mV', rec: 'Run Autonomous Balancing Cycle', sev: 'Low', badge: 'Low' }
    ]
  },
  merchant: {
    domainBadge: 'MERCHANT MODE',
    toggleLabel: 'Switch to Contracted Ops',
    todayBadge: 'MERCHANT MARKET OPERATIONS',
    todayDesc: 'Live 5-minute wholesale ERCOT/CAISO LMP bidding & real-time arbitrage optimization.',
    opsTitle: 'LMP Spot Arbitrage & Cycling Margins',
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
    queueHead: ['Bid ID', 'Market Node', 'Volume (MW)', 'Target LMP ($)', 'Degradation Cost', 'Execution Status'],
    queueRows: [
      { id: '#BID-4491', unit: 'ERCOT South Zone', trigger: '25 MW (Discharge)', rec: '$248.50 / MWh Target', sev: '$38.10 / MWh', badge: 'Executed' },
      { id: '#BID-4492', unit: 'ERCOT North Zone', trigger: '40 MW (Charge)', rec: '$18.20 / MWh Target', sev: '$38.10 / MWh', badge: 'Pending' },
      { id: '#BID-4493', unit: 'CAISO Ancillary', trigger: '10 MW (Spin Reserve)', rec: '$45.00 / MWh Target', sev: '$12.00 / MWh', badge: 'Cleared' }
    ]
  }
};

// Initial Setup
document.addEventListener('DOMContentLoaded', () => {
  renderDynamicNav();
  renderOpsChart();
  renderHeatmap();
  renderTableData();
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

// Toggle Domain / Market Mode (Contracted vs Merchant)
function toggleDomainModal() {
  currentDomain = currentDomain === 'contracted' ? 'merchant' : 'contracted';
  document.body.className = `mode-${currentDomain}`;
  
  renderDynamicNav();
  updateOpsChart();
  renderTableData();
}

function switchMode(modeKey) {
  currentDomain = modeKey === 'CONTRACTED_OPS' ? 'contracted' : 'merchant';
  toggleDomainModal();
}

// Render Dynamic Sidebar Navigation per Domain Mode
function renderDynamicNav() {
  const config = NAV_CONFIG[currentDomain];

  // Badges & Labels
  const domainBadge = document.getElementById('domain-badge-text');
  const toggleLabel = document.getElementById('domain-toggle-label');
  const todayBadge = document.getElementById('today-market-badge');
  const todayDesc = document.getElementById('today-hero-desc');
  const tool1Name = document.getElementById('tool1-name');
  const tool1Desc = document.getElementById('tool1-desc');
  const tool2Name = document.getElementById('tool2-name');
  const tool2Desc = document.getElementById('tool2-desc');

  if (domainBadge) domainBadge.innerText = config.domainBadge;
  if (toggleLabel) toggleLabel.innerText = config.toggleLabel;
  if (todayBadge) todayBadge.innerText = config.todayBadge;
  if (todayDesc) todayDesc.innerText = config.todayDesc;
  if (tool1Name) tool1Name.innerText = config.tool1Name;
  if (tool1Desc) tool1Desc.innerText = config.tool1Desc;
  if (tool2Name) tool2Name.innerText = config.tool2Name;
  if (tool2Desc) tool2Desc.innerText = config.tool2Desc;

  // Render Operations Sub-nav
  const opsContainer = document.getElementById('dynamic-ops-nav');
  if (opsContainer) {
    opsContainer.innerHTML = config.opsNav.map(item => `
      <button type="button" class="nav-item" onclick="navigateTo('operations')">
        <span class="nav-icon">${item.icon}</span>
        <span>${item.label}</span>
      </button>
    `).join('');
  }

  // Render Growth Sub-nav
  const growthContainer = document.getElementById('dynamic-growth-nav');
  if (growthContainer) {
    growthContainer.innerHTML = config.growthNav.map(item => `
      <button type="button" class="nav-item" onclick="navigateTo('operations')">
        <span class="nav-icon">${item.icon}</span>
        <span>${item.label}</span>
      </button>
    `).join('');
  }
}

// Render Queue Table
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
      <td><span style="font-size:0.72rem; color:var(--cyan-400); font-weight:bold;">${r.sev}</span></td>
      <td><button class="btn-smoke" onclick="alert('Inspecting exception ${r.id}')">Inspect</button></td>
    </tr>
  `).join('');
}

// Render Ops Chart
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
    cell.style.cssText = 'background:#020617; border:1px solid #1e293b; padding:0.5rem; border-radius:6px; font-size:0.75rem;';
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

function simulateEvent() {
  alert('Simulating SCADA telemetry event: Thermal imbalance detected in BESS Rack #4. Work order generated.');
}

function handleGlobalSearch(e) {
  if (e.key === 'Enter') {
    alert(`Searching Sloe Energy OS records for: "${e.target.value}"`);
  }
}

function toggleUserMenu() {
  alert('Demo Test (sloelabs.com) - Enterprise Asset Principal');
}
