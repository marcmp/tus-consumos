import {authorizeApiCall, getDistributorsWithSupplies, getSuppliesData, getContractDetail, getConsumptionData, checkAuth, logout, formatDate } from './apiCalls.js';


/**
 * CONFIGURATION
 * ============
 */

// Date range configuration (in months)
const CONFIG = {
  // Number of months to look back from current date
  // Default: 12 (1 year)
  monthsToFetch: 12
};

/**
 * CORE BUSINESS LOGIC
 * ==================
 */

// Spanish national holidays (format MM/DD) - Only includes holidays that are fixed in the calendar
const nationalFestivities = [
    "01/01", // Año Nuevo
    "01/06", // Epifanía del Señor
    "03/29", // Viernes Santo
    "05/01", // Fiesta del trabajo
    "08/15", // Asunción de la Virgen
    "10/12", // Fiesta Nacional de España
    "11/01", // Todos los Santos
    "12/06", // Día de la Constitución Española
    "12/25"  // Natividad del Señor
];

// Mapping of hours to period types
const hourToPeriodMap = {
  0: 'P3', 1: 'P3', 2: 'P3', 3: 'P3', 4: 'P3', 5: 'P3', 6: 'P3', 7: 'P3', 8: 'P3',
  9: 'P2', 10: 'P2',
  11: 'P1', 12: 'P1', 13: 'P1', 14: 'P1',
  15: 'P2', 16: 'P2', 17: 'P2', 18: 'P2',
  19: 'P1', 20: 'P1', 21: 'P1', 22: 'P1',
  23: 'P2', 24: 'P2'
};

/**
 * Determines the energy price period based on date and time
 * @param {string} date - Date in format YYYY/MM/DD
 * @param {string} time - Time in format HH:MM
 * @returns {string} Period code: P1, P2, or P3
 */
export function getPeriod(date, time) {
  // Check for national holidays
  const [year, month, day] = date.split("/");
  const monthDay = `${month}/${day}`;
  if (nationalFestivities.includes(monthDay)) {
    return 'P3';
  }

  // Check for weekends
  const dayOfWeek = new Date(date).getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return 'P3';
  }

  // Check time period
  const hour = parseInt(time.split(':')[0], 10);
  return hourToPeriodMap[hour] || 'P3';
}

/**
 * DATA PROCESSING FUNCTIONS
 * ========================
 */

/**
 * Enrich consumption data with period information
 * @param {Array} data - Raw consumption data
 * @returns {Array} Data enriched with period information
 */
function enrichData(data) {
  if (!Array.isArray(data) || data.length === 0) {
    console.warn('enrichData received invalid data:', data);
    return [];
  }

  console.log(`Enriching ${data.length} consumption data entries with periods`);

  return data.map(entry => {
    // Skip invalid entries
    if (!entry || !entry.date || !entry.time) {
      console.warn('Invalid entry in consumption data:', entry);
      return entry;
    }

    return {
      ...entry,
      period: entry.period || getPeriod(entry.date, entry.time),
      consumptionKWh: typeof entry.consumptionKWh === 'number' ? entry.consumptionKWh : 0,
      surplusEnergyKWh: typeof entry.surplusEnergyKWh === 'number' ? entry.surplusEnergyKWh : 0
    };
  });
}

/**
 * Build a monthly summary of consumption data
 * @param {Array} data - Consumption data with period information
 * @returns {Object} Summary by month
 */
function buildMonthlySummary(data) {
  const summary = {};

  // Check if data is valid and has entries
  if (!Array.isArray(data) || data.length === 0) {
    console.warn('buildMonthlySummary received empty or invalid data');
    return summary;
  }

  // Log a sample entry to ensure it has the proper structure
  if (data.length > 0) {
    console.log('Sample data entry for debugging:', data[0]);
  }

  data.forEach(entry => {
    const monthKey = entry.date.slice(0, 7); // Format: "YYYY/MM"
    if (!summary[monthKey]) {
      summary[monthKey] = { P1: 0, P2: 0, P3: 0, surplusEnergyKWh: 0 };
    }

    // Make sure we have a valid period, default to P3 if missing
    const period = entry.period || getPeriod(entry.date, entry.time);

    // Add consumption to the appropriate period
    summary[monthKey][period] += entry.consumptionKWh;

    // Add surplus energy if available

    if (entry.surplusEnergyKWh) {
      summary[monthKey].surplusEnergyKWh += entry.surplusEnergyKWh;
    }
  });

  // Debug log the summary for the first month
  const firstMonthKey = Object.keys(summary)[0];
  if (firstMonthKey) {
    console.log(`Monthly summary for ${firstMonthKey}:`, summary[firstMonthKey]);
  }

  return summary;
}

/**
 * Calculate total consumption from data
 * @param {Array} data - Consumption data
 * @returns {number} Total consumption in kWh
 */
function calculateTotalConsumption(data) {
  return data.reduce((total, item) => total + item.consumptionKWh, 0);
}

/**
 * Calculate total consumption for a specific period
 * @param {Array} data - Consumption data
 * @param {string} period - Period type (P1, P2, P3)
 * @returns {number} Total consumption for the period in kWh
 */
function calculatePeriodTotal(data, period) {
  return data
    .filter(item => getPeriod(item.date, item.time) === period)
    .reduce((total, item) => total + item.consumptionKWh, 0);
}

/**
 * Process consumption data and prepare summary
 * @param {Array} data - Raw consumption data
 * @returns {Object} Processed data with summaries
 */
function processConsumptionData(data) {
  // Validate input data
  if (!data || !Array.isArray(data) || data.length === 0) {
    console.warn('processConsumptionData received invalid data:', data);
    // Return default structure to prevent errors downstream
    return {
      enrichedData: [],
      summaryData: {},
      summaries: {
        total: 0,
        byPeriod: { P1: 0, P2: 0, P3: 0 },
        byMonth: {
          months: [],
          data: {}
        }
      }
    };
  }

  // First enrich the data with period information
  const enrichedData = enrichData(data);

  // Log enriched data to help with debugging
  console.log('Enriched data (first 24 entries):', enrichedData.slice(0, 24));

  // Then build the monthly summary
  const summaryData = buildMonthlySummary(enrichedData);

  // Create consumption summaries
  const totalConsumption = calculateTotalConsumption(enrichedData);
  const summaries = {
    total: totalConsumption,
    byPeriod: {
      P1: calculatePeriodTotal(enrichedData, 'P1'),
      P2: calculatePeriodTotal(enrichedData, 'P2'),
      P3: calculatePeriodTotal(enrichedData, 'P3')
    },
    byMonth: prepareMonthlyData(summaryData)
  };

  // Log summary data for debugging
  console.log('Total consumption:', totalConsumption);
  console.log('Period totals:', summaries.byPeriod);

  return {
    enrichedData,
    summaryData,
    summaries
  };
}

/**
 * Prepare 12 months of data starting from earliest available month
 * @param {Object} summaryData - Summary data by month
 * @returns {Object} 12 consecutive months of data
 */
function prepareMonthlyData(summaryData) {
  // Determine the starting month based on the earliest available data
  let startKey;
  const keys = Object.keys(summaryData);
  if (keys.length > 0) {
    keys.sort(); // Lexicographical sort works for "YYYY/MM"
    startKey = keys[0];
  } else {
    const now = new Date();
    startKey = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  const [startYear, startMonth] = startKey.split('/').map(Number);
  const startingDate = new Date(startYear, startMonth - 1, 1);

  // Build an array of 12 consecutive month keys
  const months = [];
  const monthData = {};

  for (let i = 0; i < 12; i++) {
    const currentDate = new Date(startingDate);
    currentDate.setMonth(startingDate.getMonth() + i);
    const key = `${currentDate.getFullYear()}/${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    months.push(key);

    // If there's no data for this month, add default values
    if (!summaryData[key]) {
      monthData[key] = { P1: 0, P2: 0, P3: 0, surplusEnergyKWh: 0 };
    } else {
      monthData[key] = { ...summaryData[key] };
    }

    // Calculate the actual number of days for the month
    monthData[key].days = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

    // Add formatted display version of the month
    monthData[key].display = formatMonthDisplay(key);
  }

  return {
    months,
    data: monthData
  };
}

/**
 * Format month for display (e.g., "2023/01" to "Jan 2023")
 * @param {string} monthKey - Month key in format YYYY/MM
 * @returns {string} Formatted month
 */
function formatMonthDisplay(monthKey) {
  const [year, month] = monthKey.split('/');
  const date = new Date(year, parseInt(month) - 1);
  return date.toLocaleString('default', { month: 'short', year: 'numeric' });
}


/**
 * UI FUNCTIONS
 * =================================
 *
 * Only run in browser
 */

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

if (isBrowser) {
  // Initialize the application when the DOM is loaded
  document.addEventListener('submit', handleFormSubmissions);

  // Set the initial page load
  window.onload = function() {
    // Check if user is already logged in
    if (checkAuth()) {
      showDashboard(false); // Pass false to allow data loading on initial page load
    } else {
      showLoginForm();
    }
  };
}

/**
 * Initialize the application
 */
function initializeApp() {
  // Set up event listeners
  document.addEventListener('submit', handleFormSubmissions);

  // Show the login form if not authenticated
  if (!checkAuth()) {
    showLoginForm(); // Explicitly call showLoginForm to ensure the form is rendered
    document.getElementById('login-container').style.display = 'flex'; // Change to 'flex' to center the form
  } else {
    showDashboard(); // Show the dashboard if already authenticated
  }
}

/**
 * Handle form submissions
 * @param {Event} event - Form submission event
 */
async function handleFormSubmissions(event) {
  if (event.target.id === 'loginForm') {
    event.preventDefault();
    await handleLoginFormSubmission(event.target);
  }
}

/**
 * Handle login form submission
 * @param {HTMLFormElement} form - Login form
 */
async function handleLoginFormSubmission(form) {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  console.log('Login form submitted:', { username });
  showLoadingSpinner('Autenticando usuario...');

  try {
    // Only handle authentication in this function
    const authorizationToken = await authorizeApiCall(username, password);
    console.log('Login successful');

    // Store the token and username in sessionStorage
    sessionStorage.setItem('authToken', authorizationToken);
    sessionStorage.setItem('isLoggedIn', 'true');
    sessionStorage.setItem('username', username);

    // Now delegate to fetchFreshData for all the data retrieval logic
    // Pass false to indicate we should reuse existing spinner rather than create a new one
    await fetchFreshData(authorizationToken, false);

  } catch (error) {
    console.error('Error during login:', error);
    hideLoadingSpinner();

    // Handle only login-specific errors here
    if (error.message && (error.message.includes('Login failed') ||
                         error.message.includes('401') ||
                         error.message.includes('authentication'))) {
      alert('Credenciales incorrectas. Por favor, verifica tu usuario y contraseña.');
    } else {
      alert('Ha habido un error durante el inicio de sesión: ' + error.message);
    }
  }
}

/**
 * Process consumption data and display on dashboard
 * @param {Array} data - Raw consumption data
 * @param {Object} contractDetails - Contract details with p1 and p2 values
 * @param {Object} suppliesResult - Supplies result from API
 */
function processAndDisplayData(data, contractDetails, suppliesResult) {
  // Only process the data once
  const processedData = processConsumptionData(data);

  // Get CUPS from the data if available, or from contractDetails
  const cups = data.length > 0 ? data[0].cups : (contractDetails.cups || 'No disponible');

  // Extract address info if it exists in contractDetails
  const addressInfo = contractDetails.addressInfo || 'No disponible';

  // Pass the processed data to the dashboard renderer with CUPS and address
  renderDashboard(processedData, addressInfo, cups, contractDetails, suppliesResult);
}

/**
 * Render the dashboard with consumption data
 * @param {Array} data - Raw consumption data
 * @param {string} addressInfo - Address information for the supply
 * @param {string} cups - CUPS for the supply
 * @param {Object} contractDetails - Contract details with p1 and p2 values
 * @param {Object} suppliesResult - Supplies result from API
 */
function renderDashboard(data, addressInfo, cups, contractDetails, suppliesResult) {
  // Clear the login form and show the dashboard
  document.getElementById('login-container').style.display = 'none';
  const dashboardContainer = document.getElementById('dashboard-container');
  dashboardContainer.style.display = 'block';

  // Render the consumption table with supply information
  renderConsumptionTable(data, addressInfo, cups, contractDetails, suppliesResult);

  // Check if header already exists before creating a new one
  if (!document.querySelector('.dashboard-header')) {
    // Create header with user and logout information
    const headerHTML = `
      <header class="dashboard-header">
        <div class="header-content">
          <h1>Tus Consumos Eléctricos</h1>
          <div class="user-actions">
            <span class="username">${sessionStorage.getItem('username') || ''}</span>
            <button id="logoutBtn" class="logout-btn">Cerrar sesión</button>
          </div>
        </div>
      </header>
    `;

    // Insert header at the beginning of the body
    document.body.insertAdjacentHTML('afterbegin', headerHTML);

    // Add event listener for logout
    document.getElementById('logoutBtn').addEventListener('click', logout);
  }
}

/**
 * Format a number using Spanish format (comma as decimal separator)
 * @param {number} num - The number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number
 */
function formatNumberES(num, decimals = 2) {
  if (num === undefined || num === null) return '';
  return num.toFixed(decimals).replace('.', ',');
}

/**
 * Render the consumption table
 * @param {Object|Array} data - Processed data object or raw consumption data array
 * @param {string} addressInfo - Address information for the supply
 * @param {string} cups - CUPS for the supply
 * @param {Object} contractDetails - Contract details with p1 and p2 values
 * @param {Object} suppliesResult - Supplies result from API
 */
function renderConsumptionTable(data, addressInfo = null, cups = null, contractDetails = null, suppliesResult = null) {
  const container = document.getElementById('table-container');

  // Debug logging
  console.log('Rendering consumption table with:');
  console.log('addressInfo:', addressInfo);
  console.log('cups:', cups);
  console.log('contractDetails:', contractDetails);

  // Create supply information section
  const supplyInfoHTML = `
    <div class="supply-info-card">
      <div class="supply-info-header">
        <h2>Información del Suministro</h2>
      </div>
      <div class="supply-info-content">
      ${suppliesResult.multipleSupplies
      ? `
<form action="" method="get">
      <select name="cups" onchange="this.form.submit()">
        ${suppliesResult.supplies.map(supply => `<option value="${supply.cups}" ${supply.cups === cups ? 'selected' : ''}>${supply.cups} (${supply.address})</option>`).join('')}
      </select>
</form>
      `
      : `
        <div class="supply-info-item">
          <span class="info-label">CUPS:</span>
          <span class="info-value">${cups || 'No disponible'}</span>
        </div>
        <div class="supply-info-item">
          <span class="info-label">Dirección:</span>
          <span class="info-value">${addressInfo || 'No disponible'}</span>
        </div>`
  }
      </div>
    </div>
  `;

  // Add supply info before the table
  container.innerHTML = supplyInfoHTML;


  // Extract monthly data from the processed data
  const { months, data: monthlyData } = data.summaries.byMonth;

  // Format months as "Feb-23" style
  const formattedMonths = months.map(m => {
    const [year, month] = m.split('/');
    const shortYear = year.substring(2);
    const date = new Date(year, parseInt(month) - 1);
    const monthName = date.toLocaleString('default', { month: 'short' });
    return `${monthName}-${shortYear}`;
  });

  // Create table HTML structure using template literals for better readability
  const tableHTML = `
    <table class="consumption-table">
      <tr class="section-header facturas-row">
        <td></td>
        <td class="row-label">Facturas</td>
        ${Array.from({length: 12}, (_, i) => `<td>${i+1}</td>`).join('')}
      </tr>
      <tr class="section-header description-row">
        <td></td>
        <td class="row-label">Descripción</td>
        ${formattedMonths.map(month => `<td class="data-cell">${month}</td>`).join('')}
      </tr>
      <tr class="days-row">
        <td></td>
        <td class="row-label">Días</td>
        ${months.map(m => `<td class="data-cell">${monthlyData[m].days}</td>`).join('')}
      </tr>
      <tr class="power-section power-row">
        <td class="row-group-header" rowspan="2">Potencia (kW)</td>
        <td class="row-label">Punta</td>
        ${Array.from({length: 12}, () => `<td class="data-cell">${contractDetails?.p1 ? formatNumberES(contractDetails.p1, 1) : ''}</td>`).join('')}
      </tr>
      <tr class="power-section power-row">
        <td class="row-label">Valle</td>
        ${Array.from({length: 12}, () => `<td class="data-cell">${contractDetails?.p2 ? formatNumberES(contractDetails.p2, 1) : ''}</td>`).join('')}
      </tr>
      <tr class="energy-section consumption-row">
        <td class="row-group-header" rowspan="5">Energía (kWh)</td>
        <td class="row-label">Punta</td>
        ${months.map(m => `<td class="data-cell">${formatNumberES(monthlyData[m].P1)}</td>`).join('')}
      </tr>
      <tr class="energy-section consumption-row">
        <td class="row-label">Llana</td>
        ${months.map(m => `<td class="data-cell">${formatNumberES(monthlyData[m].P2)}</td>`).join('')}
      </tr>
      <tr class="energy-section consumption-row">
        <td class="row-label">Valle</td>
        ${months.map(m => `<td class="data-cell">${formatNumberES(monthlyData[m].P3)}</td>`).join('')}
      </tr>
      <tr class="energy-section total-row">
        <td class="row-label">Suma (total)</td>
        ${months.map(m => {
          const total = monthlyData[m].P1 + monthlyData[m].P2 + monthlyData[m].P3;
          return `<td>${formatNumberES(total)}</td>`;
        }).join('')}
      </tr>
      <tr class="energy-section excedentes-row">
        <td class="row-label">Excedentes (kWh)</td>
        ${months.map(m => `<td class="data-cell">${formatNumberES(monthlyData[m].surplusEnergyKWh)}</td>`).join('')}
      </tr>
    </table>
  `;

  // Set the HTML to the container
  container.innerHTML += tableHTML;

  // Add buttons to copy table data to clipboard
  addTableCopyButton(container);
}

/**
 * Add buttons to copy table data to clipboard
 * @param {HTMLElement} container - The container element for the table
 */
function addTableCopyButton(container) {
  // Create a container for the buttons
  const buttonContainer = document.createElement('div');

  // Create button for copying all data
  const copyAllButton = document.createElement('button');
  copyAllButton.textContent = 'Copiar Potencias y Energía';
  copyAllButton.className = 'copy-btn copy-all-btn';
  copyAllButton.addEventListener('click', () => {
    const table = container.querySelector('table');
    copyTableToClipboard(table, 'all');
  });

  // Create button for copying excedentes only
  const copyExcedentesButton = document.createElement('button');
  copyExcedentesButton.textContent = 'Copiar Excedentes';
  copyExcedentesButton.className = 'copy-btn copy-excedentes-btn';
  copyExcedentesButton.addEventListener('click', () => {
    const table = container.querySelector('table');
    copyTableToClipboard(table, 'excedentes');
  });

  const copyInfo = document.createElement('p');
  copyInfo.textContent = 'Copia facilmente los datos que necesitas usando los botones.';
  copyInfo.className = 'copy-info';

  // Append buttons and info to the button container
  buttonContainer.appendChild(copyInfo);
  buttonContainer.appendChild(copyAllButton);
  buttonContainer.appendChild(copyExcedentesButton);

  // Add buttons below the table
  container.appendChild(buttonContainer);
}

/**
 * Copy table data to clipboard
 * @param {HTMLTableElement} table - The table to copy
 * @param {string} mode - Copy mode: 'all' or 'excedentes'
 */
function copyTableToClipboard(table, mode = 'all') {
  // Initialize variables
  const rows = table.rows;
  let csvContent = '';

  // Find the rows to copy based on mode
  let rowsToProcess = [];

  if (mode === 'excedentes') {
    // Find the excedentes row (usually the last row)
    const excedentesRow = Array.from(rows).find(row =>
      row.querySelector('.row-label')?.textContent.includes('Excedentes'));

    if (excedentesRow) {
      rowsToProcess = [excedentesRow];
    }
  } else {
    // For 'all' mode, copy relevant rows (Descripción through Valle)
    const startRow = 1; // "Descripción" row
    const lastRow = 7;  // "Valle" row

    rowsToProcess = Array.from(rows).slice(startRow, lastRow + 1);
  }

  // Process each row to extract data
  rowsToProcess.forEach((row, index) => {
    const cells = row.cells;
    const rowData = [];

    // Skip the first two columns (empty cell and row label)
    // Account for rowspan by checking the actual cell count
    const startIdx = cells.length > 13 ? 2 : 1;

    for (let j = startIdx; j < cells.length; j++) {
      // Get the text content with Spanish number format
      rowData.push(cells[j].textContent.trim());
    }

    csvContent += rowData.join('\t');
    if (index < rowsToProcess.length - 1) {
      csvContent += '\n'; // Add newline except for the last row
    }
  });

  // Copy to clipboard
  navigator.clipboard.writeText(csvContent)
    .then(() => {
      const message = mode === 'excedentes' ?
        'Datos de excedentes copiados al portapapeles.\nPégalos en la celda D-16 del Excel de ElGrinchEnergetico!' :
        'Datos copiados al portapapeles.\nPégalos en la celda D-8 del Excel de ElGrinchEnergetico!';
      alert(message);
    })
    .catch(err => {
      console.error('Error al copiar: ', err);

      // Fallback to the old method
      const textarea = document.createElement('textarea');
      textarea.value = csvContent;
      document.body.appendChild(textarea);
      textarea.select();

      try {
        document.execCommand('copy');
        const message = mode === 'excedentes' ?
          'Datos de excedentes copiados al portapapeles!' :
          'Datos copiados al portapapeles!';
        alert(message);
      } catch (fallbackErr) {
        console.error('Error al copiar: ', fallbackErr);
        alert('No se pudo copiar. Intente copiar manualmente.');
      }

      document.body.removeChild(textarea);
    });
}

/**
 * Display the login form
 */
function showLoginForm() {
  // Get the login container
  let loginContainer = document.getElementById('login-container');

  // Always populate the login form content
  const loginFormHTML = `
    <div class="login-card">
      <h2>Tus consumos eléctricos</h2>
      <p>Accede a tus datos de consumo usando tu cuenta de Datadis</p>
      <form id="loginForm">
        <div class="form-group">
          <label for="username">Usuario (DNI o CIF)</label>
          <input type="text" id="username" required placeholder="Introduce tu DNI/NIE" autocomplete="username">
        </div>
        <div class="form-group">
          <label for="password">Contraseña</label>
          <input type="password" id="password" required placeholder="Introduce tu contraseña" autocomplete="current-password">
        </div>
        <div id="login-error" class="error-message"></div>
        <button type="submit" class="login-btn">Acceder</button>
      </form>
      <div class="privacy-notice">
        <p><em>Esta página accede de forma cifrada a la API de Datadis desde tu navegador. No se almacenan ni tus credenciales, ni tus datos de consumo en ningun sitio que no sea tu propio navegador.</em></p>
      </div>
    </div>
  `;

  // Clear and populate the login container
  loginContainer.innerHTML = loginFormHTML;

  // Make sure the dashboard container exists
  let dashboardContainer = document.getElementById('dashboard-container');
  if (!dashboardContainer) {
    // Create dashboard container if it doesn't exist
    document.body.insertAdjacentHTML('beforeend', '<div id="dashboard-container" style="display: none;"><div id="table-container"></div></div>');
    dashboardContainer = document.getElementById('dashboard-container');
  }

  // Show login, hide dashboard
  loginContainer.style.display = 'flex';
  dashboardContainer.style.display = 'none';
}

/**
 * Show the dashboard if already logged in
 * @param {boolean} skipDataLoading - Whether to skip loading fresh data
 */
function showDashboard(skipDataLoading = false) {
  // Check if the login form is currently displayed
  const loginContainer = document.getElementById('login-container');
  if (loginContainer) {
    loginContainer.style.display = 'none'; // Hide the login form
  } else {
    console.error('Login container not found.');
  }

  // Ensure the dashboard container exists and is displayed
  const dashboardContainer = document.getElementById('dashboard-container');
  if (dashboardContainer) {
    dashboardContainer.style.display = 'block'; // Show the dashboard

    // Only fetch data if explicitly requested and we're not already loading data
    if (!skipDataLoading) {
      // Check if we have an auth token to fetch fresh data
      const authToken = sessionStorage.getItem('authToken');
      if (authToken) {
        console.log('Auth token exists. Fetching fresh data...');
        fetchFreshData(authToken);
      } else {
        // No auth token, prompt to log in again
        const tableContainer = document.getElementById('table-container');
        if (tableContainer) {
          tableContainer.innerHTML = `
            <div class="supply-info-card">
              <div class="supply-info-header">
                <h2>Se requiere iniciar sesión</h2>
              </div>
              <div class="supply-info-content">
                <p>Por favor, inicia sesión para cargar tus datos de consumo.</p>
                <button id="logoutBtn" class="logout-btn">Cerrar sesión</button>
              </div>
            </div>
          `;
          document.getElementById('logoutBtn').addEventListener('click', logout);
        }
      }
    }
  } else {
    console.error('Dashboard container not found.');
  }
}

/**
 * Display or update a loading spinner
 * @param {string} message - Message to display
 */
function showLoadingSpinner(message = 'Cargando tus datos...') {
  // Check if a spinner already exists
  let spinner = document.getElementById('loadingSpinner');

  if (spinner) {
    // Update existing spinner message
    const messageElement = document.getElementById('loadingMessage');
    if (messageElement) {
      messageElement.textContent = message;
    }
  } else {
    // Create new spinner
    const spinnerHTML = `
      <div id="loadingSpinner" class="loading-container">
        <div class="spinner"></div>
        <p id="loadingMessage">${message}</p>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', spinnerHTML);
  }
}

/**
 * Update the loading spinner message
 * @param {string} message - The new message to display
 */
function updateLoadingMessage(message) {
  showLoadingSpinner(message);
}

/**
 * Hide the loading spinner
 */
function hideLoadingSpinner() {
  const spinner = document.getElementById('loadingSpinner');
  if (spinner && spinner.parentNode) {
    spinner.parentNode.removeChild(spinner);
  }
}

/**
 * Display a notification about using cached data
 * @param {Date} cacheDate - The date when the data was cached
 * @param {string} addressInfo - The address information for the supply
 */
function showCacheNotification(cacheDate, addressInfo = '') {
  const formattedDate = cacheDate.toLocaleString();
  const addressDisplay = addressInfo ? `<p><strong>Suministro:</strong> ${addressInfo}</p>` : '';

  const notificationHTML = `
    <div id="cacheNotification" class="notification">
      <div class="notification-content">
        <p><strong>Aviso:</strong> Datadis limita el número de peticiones por día.</p>
        <p>Por ello, se mostrarán datos guardados del ${formattedDate}.</p>
        <button id="closeNotification" class="close-btn">×</button>
        ${addressDisplay}
      </div>
    </div>
  `;

  // Remove any existing notification
  const existingNotification = document.getElementById('cacheNotification');
  if (existingNotification) {
    document.body.removeChild(existingNotification);
  }

  // Add the notification to the body
  document.body.insertAdjacentHTML('beforeend', notificationHTML);

  // Add event listener to close button
  document.getElementById('closeNotification').addEventListener('click', () => {
    const notification = document.getElementById('cacheNotification');
    if (notification) {
      notification.classList.add('fade-out');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 500);
    }
  });

  // Auto-hide after 10 seconds
  setTimeout(() => {
    const notification = document.getElementById('cacheNotification');
    if (notification) {
      notification.classList.add('fade-out');
      setTimeout(() => {
        if (notification.parentNode) {
          document.body.removeChild(notification);
        }
      }, 500);
    }
  }, 10000);
}

/**
 * Display a modal for the user to select a supply
 * @param {Array} supplies - List of supplies
 * @param {string} authToken - Authorization token
 * @returns {Promise<Object>} - Selected supply data
 */
function showSupplySelectionModal(supplies, authToken) {
  return new Promise((resolve) => {
    // First, remove any existing modal overlays
    const existingOverlay = document.querySelector('.modal-overlay');
    if (existingOverlay) {
      document.body.removeChild(existingOverlay);
    }

    // Create modal HTML structure
    const modalHTML = `
      <div class="modal-overlay">
        <div class="modal-content">
          <h2>Selecciona un suministro</h2>
          <p>Se han encontrado varios suministros. Por favor, selecciona uno:</p>
          <div class="supply-list">
            ${supplies.map(supply => `
              <button class="supply-item" data-cups="${supply.cups}"
                data-pointtype="${supply.pointType}"
                data-distributorcode="${supply.distributorCode}"
                data-address="${encodeURIComponent(supply.address)}"
                data-municipality="${encodeURIComponent(supply.municipality)}"
                data-postalcode="${encodeURIComponent(supply.postalCode)}"
                data-province="${encodeURIComponent(supply.province)}">
                <strong>${supply.cups}</strong> (${supply.address})
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // Insert modal into DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Add event listeners to all supply buttons
    document.querySelectorAll('.supply-item').forEach(button => {
      button.addEventListener('click', (event) => {
        // Get supply data from button attributes
        const cups = button.getAttribute('data-cups');
        const pointType = button.getAttribute('data-pointtype');
        const distributorCode = button.getAttribute('data-distributorcode');
        const address = decodeURIComponent(button.getAttribute('data-address'));
        const municipality = decodeURIComponent(button.getAttribute('data-municipality'));
        const postalCode = decodeURIComponent(button.getAttribute('data-postalcode'));
        const province = decodeURIComponent(button.getAttribute('data-province'));

        // Remove modal
        const modalOverlay = document.querySelector('.modal-overlay');
        if (modalOverlay) {
          document.body.removeChild(modalOverlay);
        }

        // Create formatted address string
        const addressInfo = `${address}, ${municipality}, ${postalCode}, ${province}`;

        // Resolve with selected supply
        resolve({
          cups,
          pointType,
          distributorCode,
          addressInfo
        });
      });
    });
  });
}

/**
 * Fetch data from the API using the provided auth token
 * @param {string} authToken - The authorization token
 * @param {boolean} showSpinner - Whether to show a new loading spinner
 */
async function fetchFreshData(authToken, showSpinner = true) {
  console.log('Fetching data using auth token');

  // Only show a new spinner if requested (not when called from login)
  if (showSpinner) {
    showLoadingSpinner();
  }

  try {
    // Set date range based on configuration
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - CONFIG.monthsToFetch);

    const measurementType = 0;

    // API flow to get all the required data
    updateLoadingMessage('Obteniendo distribuidoras...');
    const distributorCode = await getDistributorsWithSupplies(authToken);
    console.log('Distributor code:', distributorCode);

    // Get supplies and handle multiple supplies case
    updateLoadingMessage('Obteniendo puntos de suministro...');
    const suppliesResult = await getSuppliesData(authToken, distributorCode);

    // If multiple supplies returned, show selection modal
    let supplyData;
    if (suppliesResult.multipleSupplies) {
      const urlParams = new URLSearchParams(document.location.search);
      supplyData = urlParams.has('cups') ? suppliesResult.supplies.find(s => s.cups === urlParams.get('cups')) : null;

      if (!supplyData) {
        hideLoadingSpinner(); // Hide spinner during selection
        supplyData = await showSupplySelectionModal(suppliesResult.supplies, authToken);
        // Create a new spinner after the modal is closed
        showLoadingSpinner('Procesando suministro seleccionado...');
      }
    } else {
      supplyData = suppliesResult;
    }

    console.log('Selected supply cups:', supplyData.cups);
    console.log('Selected supply addressInfo:', supplyData.addressInfo);

    // Get contract details
    updateLoadingMessage('Obteniendo detalles del contrato...');
    const contractCacheKey = createContractCacheKey(supplyData.cups, supplyData.distributorCode);
    let contractDetails;

    try {
      contractDetails = await getContractDetail(
        authToken,
        supplyData.cups,
        supplyData.distributorCode,
        supplyData.addressInfo
      );

      // Cache contract details on successful API response
      setCache(contractCacheKey, contractDetails, 48); // 48 hours expiration
    } catch (error) {
      // Check if this is a 429 rate limit error
      if (error.message && error.message.includes('429')) {
        // Try to use cached contract data
        const cachedContract = getCache(contractCacheKey);
        if (cachedContract) {
          console.log('Using cached contract details due to rate limit');
          contractDetails = cachedContract;
        } else {
          // Rethrow if no cached data is available
          throw error;
        }
      } else {
        // Rethrow other errors
        throw error;
      }
    }

    console.log('Contratada P1:', contractDetails.p1);
    console.log('Contratada P2:', contractDetails.p2);

    // Get consumption data
    updateLoadingMessage('Descargando datos de consumo (esto puede tardar unos segundos)...');
    const consumptionCacheKey = createConsumptionCacheKey(
      supplyData.cups,
      startDate,
      endDate,
      measurementType,
      supplyData.pointType
    );

    let consumptionData;
    let dataFromCache = false;

    try {
      // Try to get data from API first
      const apiResponse = await getConsumptionData(
        authToken,
        supplyData.cups,
        supplyData.distributorCode,
        startDate,
        endDate,
        measurementType,
        supplyData.pointType,
        supplyData.addressInfo
      );

      // Cache successful API responses
      if (Array.isArray(apiResponse)) {
        setCache(consumptionCacheKey, apiResponse);
        consumptionData = apiResponse;
      } else if (apiResponse && Array.isArray(apiResponse.timeCurve)) {
        setCache(consumptionCacheKey, apiResponse.timeCurve);
        consumptionData = apiResponse.timeCurve;
      } else {
        console.warn('Unexpected consumption data format:', apiResponse);
        throw new Error('Los datos recibidos tienen un formato inesperado');
      }
    } catch (error) {
      // Check if this is a 429 rate limit error
      if (error.message && (error.message.includes('429') || error.message.includes('Rate limit'))) {
        // Try to use cached data
        const cachedData = getCache(consumptionCacheKey);
        if (cachedData) {
          console.log('Using cached consumption data due to rate limit');
          consumptionData = cachedData;
          dataFromCache = true;
        } else {
          // Rethrow if no cached data is available
          throw error;
        }
      } else {
        // Rethrow other errors
        throw error;
      }
    }

    // If using cached data, show notification
    if (dataFromCache) {
      showCacheNotification(new Date(), supplyData.addressInfo);
    }

    // Process the data and display on dashboard
    console.log('Processing consumption data, length:', consumptionData.length);
    processAndDisplayData(consumptionData, contractDetails, suppliesResult);

    // Show the dashboard when data is loaded but skip further data loading
    showDashboard(true); // Pass true to prevent recursive data loading

  } catch (error) {
    console.error('Error fetching data:', error);

    // Handle different error types
    if (error.message && (error.message.includes('authentication') || error.message.includes('401'))) {
      alert('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
      logout(); // Force logout on authentication errors
    } else if (error.message && (error.message.includes('Rate limit') || error.message.includes('429'))) {
      alert('La API de Datadis sólo permite un número limitado de consultas por día.\n\nPor favor, inténtalo de nuevo mañana.');
      logout(); // Force logout when rate limit is reached and there is no cached data
    } else {
      alert('Ha ocurrido un error al intentar cargar tus datos:\n\n' + error.message);
      logout();
    }
  } finally {
    // Always ensure the spinner is hidden
    hideLoadingSpinner();
  }
}

/**
 * CACHE MANAGEMENT
 * ===============
 */

/**
 * Cache helper to store and retrieve data with expiration
 * @param {string} key - Cache key
 * @param {Object} data - Data to store
 * @param {number} expirationHours - Hours until expiration (default: 24)
 */
function setCache(key, data, expirationHours = 24) {
  try {
    const cacheItem = {
      data,
      timestamp: Date.now(),
      expires: Date.now() + (expirationHours * 60 * 60 * 1000)
    };
    localStorage.setItem(key, JSON.stringify(cacheItem));
  } catch (error) {
    // Check specifically for quota exceeded errors
    if (error.name === 'QuotaExceededError' ||
        error.code === 22 || // Chrome/Firefox
        error.code === 1014 || // Firefox
        error.message?.includes('exceeded')) {

      console.warn('Storage quota exceeded. Attempting to clear older cached items...');

      // Try to clear some space by removing older cached items
      try {
        clearOldestCacheItems();
        // Try setting the item again
        localStorage.setItem(key, JSON.stringify(cacheItem));
      } catch (retryError) {
        console.error('Failed to make space in localStorage:', retryError);
      }
    } else {
      console.warn(`Failed to cache data for key ${key}:`, error);
    }
  }
}

/**
 * Helper function to clear oldest cache items when storage quota is exceeded
 */
function clearOldestCacheItems() {
  const cacheKeys = [];

  // Collect all cache keys and their timestamps
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    try {
      const item = JSON.parse(localStorage.getItem(key));
      if (item && item.timestamp) {
        cacheKeys.push({ key, timestamp: item.timestamp });
      }
    } catch (e) {
      // Skip non-JSON items
    }
  }

  // Sort by timestamp (oldest first)
  cacheKeys.sort((a, b) => a.timestamp - b.timestamp);

  // Remove the oldest 20% of items or at least 3 items
  const itemsToRemove = Math.max(3, Math.floor(cacheKeys.length * 0.2));

  for (let i = 0; i < itemsToRemove && i < cacheKeys.length; i++) {
    localStorage.removeItem(cacheKeys[i].key);
    console.log(`Removed old cache item: ${cacheKeys[i].key}`);
  }
}

/**
 * Get cached data if not expired
 * @param {string} key - Cache key
 * @returns {Object|null} - Cached data or null if expired/not found
 */
function getCache(key) {
  try {
    const cachedItem = localStorage.getItem(key);
    if (!cachedItem) return null;

    const parsedItem = JSON.parse(cachedItem);

    // Check if cache has expired
    if (parsedItem.expires && parsedItem.expires < Date.now()) {
      localStorage.removeItem(key); // Clean up expired cache
      return null;
    }

    return parsedItem.data;
  } catch (error) {
    console.warn(`Failed to retrieve cache for key ${key}:`, error);
    return null;
  }
}

/**
 * Create a cache key for consumption data
 * @param {string} cups - CUPS identifier
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {number} measurementType - Measurement type
 * @param {number} pointType - Point type
 * @returns {string} - Cache key
 */
function createConsumptionCacheKey(cups, startDate, endDate, measurementType, pointType) {
  const formattedStartDate = formatDate(startDate);
  const formattedEndDate = formatDate(endDate);
  return `consumption_data_${cups}_${formattedStartDate}_${formattedEndDate}_${measurementType}_${pointType}`;
}

/**
 * Create a cache key for contract details
 * @param {string} cups - CUPS identifier
 * @param {string} distributorCode - Distributor code
 * @returns {string} - Cache key
 */
function createContractCacheKey(cups, distributorCode) {
  return `contract_detail_${cups}_${distributorCode}`;
}


// Export functions needed for testing or external use
export {
  enrichData,
  buildMonthlySummary,
  calculateTotalConsumption,
  calculatePeriodTotal,
  processConsumptionData,
  showCacheNotification,
  getCache,
  setCache,
  createConsumptionCacheKey,
  createContractCacheKey
};
