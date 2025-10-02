import { getPeriod } from './period.js';

/**
 * API CONNFIGURATION
 * ================
 */

const apiConfig = {
  useMockServer: false, // True to use a mock server instead the real API server
  mockServerBaseUrl: 'http://localhost:8088'
};

const baseUrl = apiConfig.useMockServer ? apiConfig.mockServerBaseUrl : 'https://datadis.es';

const apiEndpoints = {
    auth: {
        login: baseUrl + '/nikola-auth/tokens/login'
    },
    api: {
        distributors: baseUrl + '/api-private/api/get-distributors-with-supplies-v2',
        supplies: baseUrl + '/api-private/api/get-supplies-v2',
        contractDetail: baseUrl + '/api-private/api/get-contract-detail-v2',
        consumptionData: baseUrl + '/api-private/api/get-consumption-data-v2'
    },
};


/**
 * CORE UTILITIES
 * ==============
 */

/**
 * Sends API calls with error handling
 * @param {string} endpoint - API endpoint URL
 * @param {Object} options - Request options
 * @returns {Promise<Object>} - API response data
 */
async function makeApiCall(endpoint, options = {}) {
    const { 
      errorHandler = defaultErrorHandler,
      context = {}
    } = options;
    
    // Extract request options
    const { method = 'GET', headers = {}, params = {}, body } = options;
    
    // Build URL with query parameters if needed
    const url = new URL(endpoint);
    if (Object.keys(params).length > 0) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value);
        }
      });
    }
    
    try {
      // Make the actual API call
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error details available');
        throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      // We treat the response as JSON regardless of the content-type because 
      // the datadis API is not consistent in its use of content-type
      const data = await response.json();
      
      return data;
    } catch (error) {
      console.error(`API call to ${endpoint} failed:`, error);
      
      // Use the error handler to handle the error
      if (errorHandler) {
        try {
          return await errorHandler.handleError(error, endpoint, context);
        } catch (handlerError) {
          // If the error handler also throws, propagate that error
          throw Error(
            `Error handling API error: ${handlerError.message}`,
            { cause: handlerError }
          );
        }
      }
      
      // If no error handler or the handler didn't handle it, rethrow
      throw error;
    }
}

/**
 * AUTH FUNCTIONS
 * ==============
 */

/**
 * Authenticate user and get authorization token
 * @param {string} username - User's username
 * @param {string} password - User's password
 * @returns {Promise<string>} - Authorization token
 */
async function authorizeApiCall(username, password) {
  const endpoint = apiEndpoints.auth.login;
  
  // Construct URL with parameters
  const url = new URL(endpoint);
  const params = new URLSearchParams({
    username: username,
    password: password
  });
  url.search = params.toString();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Login failed');
  
  const data = await response.text();
  return "Bearer " + data;
}

/**
 * Check if user is authenticated
 * @returns {boolean} - Whether user is authenticated
 */
function checkAuth() {
  return sessionStorage.getItem('isLoggedIn') === 'true';
}

/**
 * Log out the current user
 */
function logout() {
  sessionStorage.removeItem('isLoggedIn');
  sessionStorage.removeItem('username');
  window.location.reload();
}

/**
 * DATA RETRIEVAL FUNCTIONS
 * ========================
 */

/**
 * Get distributors with supplies
 * @param {string} authToken - Authorization token
 * @returns {Promise<Array>} - List of distributor codes
 */
async function getDistributorsWithSupplies(authToken) {
  const result = await makeApiCall(
    apiEndpoints.api.distributors,
    {
      headers: {
        'Authorization': authToken,
        'Accept': 'application/json'
      }
    }
  );

  return result.distExistenceUser.distributorCodes;
}

/**
 * Get supplies data for a distributor
 * @param {string} authToken - Authorization token
 * @param {string} distributorCode - Distributor code
 * @returns {Promise<Object>} - Supplies data
 */
async function getSuppliesData(authToken, distributorCode) {
  const result = await makeApiCall(
    apiEndpoints.api.supplies,
    {
      headers: {
        'Authorization': authToken,
        'Content-Type': 'application/json'
      },
      params: {
        distributorCode: distributorCode
      }
    }
  );
  
  const supplies = result.supplies;
  
  // If there's only one supply, return it directly with addressInfo
  if (supplies.length === 1) {
    const supply = supplies[0];
    const addressInfo = `${supply.address}, ${supply.municipality}, ${supply.postalCode} ${supply.province}`;
    
    return {
      cups: supply.cups,
      pointType: supply.pointType,
      distributorCode: supply.distributorCode,
      addressInfo: addressInfo
    };
  }
  
  // Return all supplies for user selection
  return { supplies, multipleSupplies: true };
}

/**
 * HELPER UTILITIES
 * ================
 */

/**
 * Helper function to format dates as required by the API
 * @param {Date} date - Date to format
 * @returns {string} - Formatted date string
 */
function formatDate(date) {
    if (!(date instanceof Date) || isNaN(date)) {
        throw new Error('Invalid date provided to formatDate');
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}/${month}`;
}

/**
 * Get contract detail 
 * @param {string} authToken - Authorization token
 * @param {string} cups - CUPS identifier
 * @param {string} distributorCode - Distributor code
 * @param {string} addressInfo - Address information
 * @returns {Promise<Object>} - Supplies data
 */
async function getContractDetail(authToken, cups, distributorCode, addressInfo = null) {
    try {
      const result = await makeApiCall(
        apiEndpoints.api.contractDetail,
        {
          headers: {
            'Authorization': authToken,
            'Content-Type': 'application/json'
          },
          params: {
              cups,
              distributorCode
          },
          context: { cups, addressInfo }
        }
      );

      const contract = result.contract;
      const p1 = contract[0]?.contractedPowerkW[0] || '';
      const p2 = contract[0]?.contractedPowerkW[1] || '';
      
      // Include the CUPS and addressInfo in the returned data
      return { 
        p1, 
        p2,
        cups, // Add CUPS to contract data
        addressInfo // Add address info to contract data
      };
    } catch (error) {
      // Just rethrow errors for the UI layer to handle
      throw new Error(
        `Error getting contract detail: ${error.message}`,
        { cause: error }
      );
    }
}

/**
 * Get consumption data
 * @param {string} authToken - Authorization token
 * @param {string} cups - CUPS identifier
 * @param {string} distributorCode - Distributor code
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {string} measurementType - Measurement type
 * @param {string} pointType - Point type
 * @param {string} addressInfo - Address information
 * @returns {Promise<Array>} - Consumption data
 */
async function getConsumptionData(authToken, cups, distributorCode, startDate, endDate, measurementType, pointType, addressInfo = null) {
  const formattedStartDate = formatDate(startDate);
  const formattedEndDate = formatDate(endDate);
  
  try {
    // Make the API call
    const result = await makeApiCall(
      apiEndpoints.api.consumptionData,
      {
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/json'
        },
        params: {
          cups,
          distributorCode,
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          measurementType: measurementType,
          pointType: pointType
        },
        context: { cups, addressInfo } // Pass context for error handling
      }
    );
    
    // Process the timeCurve data from a regular API response
    const timeCurve = result.timeCurve;
      return timeCurve.map(entry => ({
        ...entry,
        period: getPeriod(entry.date, entry.time)
      }));
  } catch (error) {
    // Just rethrow errors for the UI layer to handle
    throw new Error(
      `Error getting consumption data: ${error.message}`,
      { cause: error }
    );
  }
}

/**
 * API Error Handler - Handles all types of API errors consistently
 */
class ApiErrorHandler {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 1;
  }
  
  /**
   * Handle API errors based on their type
   * @param {Error} error - The error object
   * @param {string} endpoint - API endpoint URL
   * @param {Object} context - Additional context (cups, etc.)
   * @returns {Promise<Object>} - Resolution strategy result
   */
  async handleError(error, endpoint, context = {}) {
    // Check for rate limit errors (429)
    if (error.message && error.message.includes('429')) {
      return this.handleRateLimitError(error, endpoint, context);
    }
    
    // Check for authentication errors (401)
    if (error.message && error.message.includes('401')) {
      return this.handleAuthError(error, endpoint, context);
    }
    
    // Check for network errors
    if (error.name === 'NetworkError' || error.message.includes('network')) {
      return this.handleNetworkError(error, endpoint, context);
    }
    
    // For all other errors, just rethrow
    throw error;
  }
  
  /**
   * Handle rate limit errors (429)
   * @param {Error} error - The error object
   * @param {string} endpoint - API endpoint URL
   * @param {Object} context - Additional context (cups, etc.)
   * @returns {Promise<never>} - Always throws the error, but with a more informative message
   */
  async handleRateLimitError(error, endpoint, context) {
    console.error('Rate limit exceeded for API:', {
      endpoint,
      context,
      message: error?.message || String(error),
    });
    
    // Rethrow with a clearer message for the UI layer to handle
    throw new Error('Rate limit exceeded for the API. Please try again later.');
  }
  
  /**
   * Handle authentication errors (401)
   * @param {Error} error - The error object
   * @param {string} endpoint - API endpoint URL
   * @param {Object} context - Additional context
   * @returns {Promise<never>} - Always throws, but may perform UI actions first
   */
  async handleAuthError(error, endpoint, context) {
    console.error('Authentication error when calling API:', {
      endpoint,
      context,
      message: error?.message || String(error),
    });
    
    // Clear session storage
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('authToken');
    
    // Throw with a clearer message
    throw new Error('Your authentication has expired. Please log in again.');
  }
  
  /**
   * Handle network errors
   * @param {Error} error - The error object
   * @param {string} endpoint - API endpoint URL
   * @param {Object} context - Additional context
   * @returns {Promise<never>} - Always throws, but with a more informative message
   */
  async handleNetworkError(error, endpoint, context) {
    console.error('Network error when calling API:', {
      endpoint,
      context,
      message: error?.message || String(error),
    });
  
    // Re-throw with context while preserving the original error
    throw new Error(`Network error calling ${endpoint}`, { cause: error });
  }
}

// Create a default error handler instance
const defaultErrorHandler = new ApiErrorHandler();

// Export the API-related functions
export {
    authorizeApiCall,
    getDistributorsWithSupplies,
    getSuppliesData,
    getContractDetail,
    getConsumptionData,
    checkAuth,
    logout,
    formatDate
}; 