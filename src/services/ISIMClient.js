import { DEFAULT_SERVER_URL } from '../config'

export class ISIMClient {
    constructor(config = {}) {
        this.baseURI = config.baseURI?.replace(/\/$/, '') || ''; // Remove trailing slash if present
        this.username = config.username || '';
        this.password = config.password || '';
        this.token = {};
        this.onLog = config.onLog || (() => {}); // Add logging callback
        
        // Paths
        this.jsiPath = '/restlogin/';
        this.authPath = '/j_security_check';
        this.csrfPath = '/rest/systemusers/me';
        
        // this.validateConfig();
    }

    validateConfig() {
        // Only validate when making actual requests
        if (!this.baseURI || !this.baseURI.startsWith('http')) {
            throw new Error("Invalid base address in configuration");
        }
        if (!this.username || !this.password) {
            throw new Error("Credentials not set in configuration");
        }
    }

    async connect() {
        try {
            console.log('Starting authentication flow...');
            
            // 1. First get LTPA2 token - this establishes the main authentication
            await this.retrieveLTPA2Cookie();
            console.log('LTPA2 token retrieved successfully');
            
            // 2. Then get JSESSION - this creates the session with the authenticated token
            await this.retrieveJSessionCookie();
            console.log('JSESSION cookie retrieved successfully');
            
            // 3. Finally get CSRF token - this requires both previous tokens
            await this.retrieveCSRFToken();
            console.log('CSRF token retrieved successfully');
            
            console.log('Authentication flow completed successfully');
            return this.token;
        } catch (error) {
            console.error('Authentication flow failed:', error);
            throw error;
        }
    }

    async retrieveJSessionCookie() {
        const loginUrl = '/itim/restlogin/login.jsp';
        this.onLog('Initial Login Request', loginUrl, 'pending');
        
        try {
            const response = await fetch(loginUrl, {
                method: 'GET',
                credentials: 'include'
            });

            // Get all headers for debugging
            const allHeaders = Object.fromEntries(response.headers.entries());
            console.log('All response headers:', allHeaders);

            // Read the cookie count
            const cookieCount = parseInt(response.headers.get('x-auth-cookie-count') || '0');
            console.log('Cookie count:', cookieCount);

            // Read all cookies
            const cookies = [];
            for (let i = 0; i < cookieCount; i++) {
                const cookie = response.headers.get(`x-auth-cookie-${i}`);
                if (cookie) {
                    cookies.push(cookie);
                    console.log(`Cookie ${i}:`, cookie);
                }
            }

            // Find JSESSIONID cookie and store it
            const jsessionCookie = cookies.find(cookie => cookie.startsWith('JSESSIONID='));
            if (jsessionCookie) {
                const match = jsessionCookie.match(/JSESSIONID=([^;]+)/);
                if (match) {
                    this.token.jsession = `JSESSIONID=${match[1]}`;
                    console.log('Found JSESSIONID cookie:', this.token.jsession);
                }
            }

            const responseDetails = {
                status: response.status,
                statusText: response.statusText,
                headers: {
                    'cookies': cookies,
                    'all-headers': allHeaders
                }
            };
            
            this.onLog('Initial Login Request', loginUrl, 'success', 
                JSON.stringify(responseDetails, null, 2));

        } catch (error) {
            this.onLog('Initial Login Request', loginUrl, 'error', error.message);
            throw new Error("Failed to obtain JSession cookie: " + error.message);
        }
    }

    async retrieveLTPA2Cookie() {
        const authUrl = '/itim/j_security_check';
        this.onLog('Authentication', authUrl, 'pending');
        console.log('=== Starting Authentication Cookie Retrieval ===');
        
        try {
            // More thorough cookie clearing before authentication
            const cookiesToClear = ['LtpaToken2', 'JSESSIONID', '_client_wat', '_clerk_db_jwt'];
            const paths = ['/', '/itim', '/itim/j_security_check', '/itim/restlogin'];
            
            console.log('Clearing existing cookies...');
            cookiesToClear.forEach(cookieName => {
                paths.forEach(path => {
                    document.cookie = `${cookieName}=; Path=${path}; Domain=; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Secure; HttpOnly; SameSite=Strict;`;
                });
            });

            console.log('Current cookies after clearing:', document.cookie);

            const formData = new URLSearchParams();
            formData.append('j_username', this.username);
            formData.append('j_password', this.password);
            
            console.log('Sending login request with credentials:', {
                username: this.username,
                passwordLength: this.password ? this.password.length : 0
            });

            const response = await fetch(authUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': '*/*',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                },
                body: formData.toString(),
                credentials: 'include',
                mode: 'no-cors'
            });
            
            console.log('Login response received:', {
                status: response.status,
                type: response.type
            });
            
            // Wait for cookies to be set
            console.log('Waiting for cookies to be set...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Get current cookies
            const currentCookies = document.cookie.split(';').map(c => c.trim());
            console.log('All current cookies:', currentCookies);
            
            // Look for all possible auth cookies
            const clientCookie = currentCookies.find(c => c.startsWith('_client_wat='));
            const clerkCookie = currentCookies.find(c => c.startsWith('_clerk_db_jwt='));
            const ltpa2Cookie = currentCookies.find(c => c.startsWith('LtpaToken2='));
            
            console.log('Found authentication cookies:', {
                client: clientCookie || 'not found',
                clerk: clerkCookie || 'not found',
                ltpa2: ltpa2Cookie || 'not found'
            });
            
            if (!clientCookie && !clerkCookie && !ltpa2Cookie) {
                console.log('=== No authentication cookies found ===');
                return false;
            }
            
            // Store all tokens
            if (clientCookie) this.token.client = clientCookie;
            if (clerkCookie) this.token.clerk = clerkCookie;
            if (ltpa2Cookie) this.token.ltpa2 = ltpa2Cookie;
            
            console.log('Stored tokens:', this.token);
            
            this.onLog('Authentication', authUrl, 'success', JSON.stringify({ 
                cookies: {
                    client: clientCookie,
                    clerk: clerkCookie,
                    ltpa2: ltpa2Cookie
                }
            }));
            return true;

        } catch (error) {
            console.error('Authentication error:', error);
            this.onLog('Authentication', authUrl, 'error', JSON.stringify({ 
                error: error.message,
                currentCookies: document.cookie
            }));
            throw new Error("Failed to retrieve auth cookies: " + error.message);
        }
    }

    async retrieveCSRFToken() {
        console.log('=== Starting CSRF Token Retrieval ===');
        const csrfUrl = '/itim/rest/systemusers/me';
        this.onLog('CSRF Token Request', csrfUrl, 'pending');
        
        try {
            // Get current cookies directly from browser
            const currentCookies = document.cookie.split(';').map(c => c.trim());
            console.log('Current browser cookies:', currentCookies);
            
            // Look for specific cookies
            const jsessionCookie = currentCookies.find(c => c.startsWith('JSESSIONID='));
            const clientCookie = currentCookies.find(c => c.startsWith('_client_wat='));
            const clerkCookie = currentCookies.find(c => c.startsWith('_clerk_db_jwt='));
            const ltpa2Cookie = currentCookies.find(c => c.startsWith('LtpaToken2='));
            
            console.log('Found cookies in browser:', {
                jsession: jsessionCookie || 'not found',
                client: clientCookie || 'not found',
                clerk: clerkCookie || 'not found',
                ltpa2: ltpa2Cookie || 'not found'
            });
            
            console.log('Stored tokens:', {
                jsession: this.token.jsession || 'not set',
                client: this.token.client || 'not set',
                clerk: this.token.clerk || 'not set',
                ltpa2: this.token.ltpa2 || 'not set'
            });
            
            // Use current browser cookies instead of stored tokens
            const cookieHeader = [
                jsessionCookie,
                clientCookie,
                clerkCookie,
                ltpa2Cookie
            ].filter(Boolean).join('; ');
            
            console.log('Using current cookie header:', cookieHeader);

            const response = await fetch(csrfUrl, {
                method: 'GET',
                headers: {
                    'Cookie': cookieHeader,
                    'Accept': 'application/json, text/plain, */*',
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('CSRF Response:', data);
            
            if (data && data.csrf) {
                this.token.csrf = data.csrf;
                this.onLog('CSRF Token Request', csrfUrl, 'success', JSON.stringify({ csrf: data.csrf }));
                return true;
            }

            this.onLog('CSRF Token Request', csrfUrl, 'warning', JSON.stringify({
                message: 'No CSRF token in response',
                responseData: data
            }));
            return false;

        } catch (error) {
            console.error('CSRF Token Request failed:', error);
            this.onLog('CSRF Token Request', csrfUrl, 'error', JSON.stringify({
                error: error.message,
                currentCookies: document.cookie,
                storedTokens: this.token
            }));
            throw new Error("Failed to get CSRF token: " + error.message);
        }
    }

    verifyJSession(token) {
        if (!token.includes('JSESSIONID=')) {
            throw new Error("Invalid JSession Token Received");
        }
        // Valid JSESSIONID received, no need to throw error
    }

    verifyLTPA2(token) {
        if (!token.includes('LtpaToken2')) {
            throw new Error("Invalid LTPA2 Token Received - Check credentials");
        }
    }

    verifyCSRF(token) {
        if (token.length !== 32) {
            throw new Error("Invalid CSRF Token Received");
        }
    }

    async checkSessionValid() {
       console.log('Checking session validity...');
        if (this.token.csrf && this.token.client && this.token.clerk && this.token.jsession) {
            try {
                const response = await fetch(this.baseURI + this.csrfPath, {
                    headers: {
                        'Cookie': `${this.token.client}; ${this.token.clerk}; ${this.token.jsession}`,
                        'Accept': 'application/json'
                    },
                    credentials: 'include'
                });

                if (response.status === 200) {
                    // Try to get CSRF token from both header and body
                    const csrfToken = response.headers.get('CSRFToken');
                    if (csrfToken) {
                        this.token.csrf = csrfToken;
                        return true;
                    }
                    
                    // If not in header, try to get it from body
                    try {
                        const data = await response.json();
                        if (data && data.csrf) {
                            this.token.csrf = data.csrf;
                            return true;
                        }
                    } catch (e) {
                        console.warn('Could not parse response body for CSRF token:', e);
                    }
                }
            } catch (error) {
                console.error("Session check failed:", error);
            }
        }
        return false;
    }

    getToken() {
        return this.token;
    }

    async getPeople() {
        return this.searchPeople({ attributes: ['*'] });  // Use * to get all attributes
    }

    async searchPeople({ 
        attributes = [], 
        limit = 1000,
        range = '',
        noCache = false
    } = {}) {
        const searchUrl = '/itim/rest/people';
        this.onLog('People Search', searchUrl, 'pending');

        try {
            // Build query parameters
            const params = new URLSearchParams();
            
            // Always include attributes parameter with * to get all attributes
            params.append('attributes', attributes.length > 0 ? attributes.join(',') : '*');
            
            if (limit) {
                params.append('limit', limit.toString());
            }

            // Build headers with CSRF token
            const headers = {
                'Accept': '*/*',
                'Cookie': [this.token.jsession, this.token.client, this.token.clerk].filter(Boolean).join('; '),
                'X-CSRF-Token': this.token.csrf
            };

            if (noCache) {
                headers['Cache-Control'] = 'no-cache';
            }
            if (range) {
                headers['Range'] = `items=${range}`;
            }

            const url = `${searchUrl}${params.toString() ? '?' + params.toString() : ''}`;
            console.log('Searching people with URL:', url);
            console.log('Using headers:', headers);

            const response = await fetch(url, {
                method: 'GET',
                headers,
                credentials: 'include'
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('People search failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorText
                });
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const data = await response.json();
            console.log('People search response:', data);

            this.onLog('People Search', searchUrl, 'success', JSON.stringify({
                url,
                resultCount: Array.isArray(data) ? data.length : 0
            }));

            return data;

        } catch (error) {
            console.error('People search error:', error);
            this.onLog('People Search', searchUrl, 'error', JSON.stringify({
                error: error.message,
                tokens: {
                    jsession: !!this.token.jsession,
                    client: !!this.token.client,
                    clerk: !!this.token.clerk,
                    csrf: !!this.token.csrf
                }
            }));
            throw error;
        }
    }

    async getPersonAccounts(personId) {
        const response = await this.makeRequest(`/rest/people/${personId}/accounts?attributes=*`, {
            headers: {
                'Accept': '*/*'
            }
        });

        // Transform the response to include erservice href from _links and handle groups
        if (Array.isArray(response)) {
            return response.map(account => {
                const erserviceHref = account._links?.erservice?.href;
                // Extract service ID from href if present
                let erserviceId = null;
                if (erserviceHref) {
                    const match = erserviceHref.match(/\/services\/([^/]+)/);
                    if (match) {
                        erserviceId = match[1];
                    }
                }

                // Get groups from _attributes
                const groups = account._attributes?.ergroup;
                
                return {
                    ...account,
                    ergroup: groups, // Add groups at top level for easy access
                    _links: {
                        ...account._links,
                        erservice: {
                            href: erserviceHref,
                            id: erserviceId
                        }
                    }
                };
            });
        }
        return response;
    }

    async getAccountGroups(accountHref) {
        if (!accountHref) return [];
        try {
            const response = await this.makeRequest(`${accountHref}/groups`, {
                headers: {
                    'Accept': '*/*'
                }
            });
            
            if (response._embedded?.groups) {
                return response._embedded.groups;
            }
            return Array.isArray(response) ? response : [];
        } catch (error) {
            console.error('Failed to get account groups:', error);
            return [];
        }
    }

    async makeRequest(path, options = {}) {
        const url = options.fullUrl ? path : (options.rawPath ? `${this.baseURI}${path}` : `${this.baseURI}${path}`);
        this.onLog('API Request', url, 'pending');

        try {
            const headers = {
                'Accept': '*/*',
                'Cookie': [this.token.jsession, this.token.client, this.token.clerk].filter(Boolean).join('; '),
                'X-CSRF-Token': this.token.csrf
            };

            const response = await fetch(url, {
                method: options.method || 'GET',
                headers,
                body: options.body,
                credentials: 'include'
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API request failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorText
                });
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const data = await response.json();
            this.onLog('API Request', url, 'success');
            return data;
        } catch (error) {
            console.error('API request error:', error);
            this.onLog('API Request', url, 'error', error.message);
            throw error;
        }
    }

    async getSystemUsers() {
        const url = '/itim/rest/systemusers?attributes=eruid';
        this.onLog('System Users', url, 'pending');
        
        try {
            // Ensure we have both cookies
            if (!this.token.jsession || !this.token.client || !this.token.clerk) {
                throw new Error('Missing required authentication tokens');
            }

            const cookieHeader = [this.token.jsession, this.token.client, this.token.clerk].filter(Boolean).join('; ');
            console.log('Using cookie header:', cookieHeader);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'Content-Type': 'application/json',
                    'Cookie': cookieHeader,
                    'Cache-Control': 'no-cache'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('System users response:', data);
            
            this.onLog('System Users', url, 'success', JSON.stringify({
                resultCount: Array.isArray(data) ? data.length : 0
            }));

            return data;

        } catch (error) {
            this.onLog('System Users', url, 'error', JSON.stringify({
                error: error.message,
                cookies: {
                    jsession: this.token.jsession,
                    client: this.token.client,
                    clerk: this.token.clerk
                }
            }));
            throw new Error(`Failed to get system users: ${error.message}`);
        }
    }

    async getServiceDetails(serviceId) {
        // Get specific attributes we're interested in
        const url = `/rest/services/${serviceId}?attributes=*`;
        this.onLog('Service Details', url, 'pending');
        
        try {
            const response = await this.makeRequest(url, {
                rawPath: true,
                method: 'GET'
            });
            
            this.onLog('Service Details', url, 'success');
            // Extract attributes from the response
            const attributes = response?._attributes || response?.attributes || {};
            return {
                ...response,
                attributes: {
                    ...attributes,
                    erservicename: attributes.erservicename || '',
                    owner: attributes.owner || '',
                    parent: attributes.parent || '',
                    description: attributes.description || '',
                    erserviceid: attributes.erserviceid || ''
                }
            };
        } catch (error) {
            this.onLog('Service Details', url, 'error', error);
            return null;
        }
    }

    async getAllServicesWithNames() {
        console.log('Retrieving service details...');
        try {
            // First, get list of all services
            const services = await this.getServices();
            const serviceMap = {};

            // Extract service IDs from hrefs and fetch details
            const servicePromises = services.map(async service => {
                const href = service._links?.self?.href;
                if (!href) return;
                
                // Extract ID after /services/
                const match = href.match(/\/services\/([^/]+)/);
                if (!match) return;
                
                const serviceId = match[1];
                const details = await this.getServiceDetails(serviceId);
                if (details?.attributes) {
                    serviceMap[serviceId] = {
                        ...details.attributes,
                        id: serviceId
                    };
                }
            });

            await Promise.all(servicePromises);
            console.log('Service map:', serviceMap);
            return serviceMap;
        } catch (error) {
            console.error('Error fetching service details:', error);
            return {};
        }
    }

    async getServices() {
        console.log('Retrieving services...');
        const url = '/rest/services?attributes=*';
        this.onLog('Services', url, 'pending');
        
        try {
            const response = await this.makeRequest(url, {
                rawPath: true,
                method: 'GET'
            });
            
            this.onLog('Services', url, 'success');
            // Check if response is an array directly
            if (Array.isArray(response)) {
                return response;
            }
            // Try different possible response structures
            return response._embedded?.services || 
                   response.services || 
                   response._embedded || 
                   [];
        } catch (error) {
            this.onLog('Services', url, 'error', error);
            return [];
        }
    }

    async getRole(roleId) {
        try {
            const response = await fetch(`${this.baseURI}/itim/rest/roles/${roleId}?attributes=*`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': this.token.csrf
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch role: ${response.statusText}`);
            }

            const data = await response.json();
            return {
                id: roleId,
                title: data._attributes?.errolename || data._attributes?.title || roleId
            };
        } catch (error) {
            console.error('Error fetching role:', error);
            throw error;
        }
    }


    async getAllRoles() {
        console.log('Retrieving roles...');
        const url = '/rest/roles';
        this.onLog('Roles', url, 'pending');
        
        try {
            const response = await this.makeRequest(url, {
                rawPath: true,
                method: 'GET'
            });
            
            this.onLog('Roles', url, 'success');
            // Check if response is an array directly
            if (Array.isArray(response)) {
                return response;
            }
            // Try different possible response structures
            return response._embedded?.roles || 
                   response.roles || 
                   response._embedded || 
                   [];
        } catch (error) {
            this.onLog('Roles', url, 'error', error);
            return [];
        }
    }

   

}

// Get stored credentials if they exist
const getUserCredentials = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            return {
                username: user.username || '',
                password: user.password || ''
            };
        } catch (e) {
            console.error('Failed to parse stored credentials');
        }
    }
    return { username: '', password: '' };
};

const { username, password } = getUserCredentials();

// Create and export a default instance
const defaultClient = new ISIMClient({
    baseURI: DEFAULT_SERVER_URL,
    onLog: (component, message, status) => {
        console.log(`[${component}] ${message}`, status);
    }
});

export default defaultClient;
