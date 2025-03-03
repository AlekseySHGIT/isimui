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
            
            // Clear LTPA token before starting authentication and wait for confirmation
            console.log('Clearing LTPA token before authentication...');
            const ltpaCleared = await this.clearLTPAToken();
            if (!ltpaCleared) {
                console.warn('Warning: Could not confirm LTPA token was cleared');
            }
            
            // 1. First get LTPA2 token - this establishes the main authentication
            const ltpa2Result = await this.retrieveLTPA2Cookie();
            console.log('LTPA2 token result:', {
                success: !!ltpa2Result,
                client: this.token.client ? 'Found' : 'Not found',
                clerk: this.token.clerk ? 'Found' : 'Not found',
                ltpa2: this.token.ltpa2 ? 'Found' : 'Not found'
            });
            
            // 2. Then get JSESSION - this creates the session with the authenticated token
            await this.retrieveJSessionCookie();
            console.log('JSESSION result:', {
                success: !!this.token.jsession,
                jsession: this.token.jsession ? 'Found' : 'Not found',
                value: this.token.jsession || 'Not set'
            });
            
            // 3. Finally get CSRF token - this requires both previous tokens
            // But don't fail if it can't be retrieved
            try {
                await this.retrieveCSRFToken();
                console.log('CSRF token result:', {
                    success: !!this.token.csrf,
                    value: this.token.csrf || 'Not set'
                });
            } catch (csrfError) {
                // Log the error but continue the authentication process
                console.warn('Failed to retrieve CSRF token, but continuing:', csrfError);
                this.token.csrf = 'not-available';
            }
            
            console.log('Authentication flow completed. Final token state:', {
                jsession: this.token.jsession ? 'Present' : 'Missing',
                client: this.token.client ? 'Present' : 'Missing',
                clerk: this.token.clerk ? 'Present' : 'Missing',
                ltpa2: this.token.ltpa2 ? 'Present' : 'Missing',
                csrf: this.token.csrf || 'not-available'
            });
            
            return this.token;
        } catch (error) {
            console.error('Authentication flow failed:', error);
            throw error;
        }
    }

    async clearLTPAToken() {
        console.log('=== Starting LTPA Token Clearing Process ===');
        
        try {
            // First try to invalidate the token from server side
            console.log('Attempting to invalidate LTPA token from server...');
            const logoutUrl = '/itim/restlogin/logout.jsp';
            
            try {
                const response = await fetch(logoutUrl, {
                    method: 'GET',
                    credentials: 'include',
                });
                console.log('Logout response:', {
                    status: response.status,
                    ok: response.ok,
                    headers: Array.from(response.headers.entries())
                });
            } catch (e) {
                console.log('Logout request failed, continuing with cookie clearing:', e);
            }

            // Wait a bit after server request
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Now try to clear cookies on client side
            const paths = ['/', '/itim', '/itim/j_security_check', '/itim/restlogin'];
            const domains = ['localhost', '192.168.1.204', ''];
            
            console.log('Current cookies before clearing:', document.cookie);
            
            // Try different cookie clearing approaches
            domains.forEach(domain => {
                paths.forEach(path => {
                    // Try with all combinations of attributes
                    [
                        `LtpaToken2=; Path=${path}; ${domain ? `Domain=${domain};` : ''} Expires=Thu, 01 Jan 1970 00:00:01 GMT; Secure; HttpOnly; SameSite=Strict;`,
                        `LtpaToken2=; Path=${path}; ${domain ? `Domain=${domain};` : ''} Max-Age=0; Secure; HttpOnly;`,
                        `LtpaToken2=; Path=${path}; ${domain ? `Domain=${domain};` : ''} Expires=Thu, 01 Jan 1970 00:00:01 GMT;`
                    ].forEach(clearString => {
                        document.cookie = clearString;
                        console.log(`Attempted clear with: ${clearString}`);
                    });
                });
            });

            // Also try clearing with minimal attributes
            document.cookie = 'LtpaToken2=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/;';
            document.cookie = 'LtpaToken2=; max-age=0; path=/;';
            
            // Wait for cookies to update
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Check final state
            console.log('Cookies after clearing attempts:', document.cookie);
            const currentCookies = document.cookie.split(';').map(c => c.trim());
            const ltpaExists = currentCookies.some(cookie => cookie.startsWith('LtpaToken2='));
            
            if (ltpaExists) {
                console.warn('Warning: LTPA token still exists after all clearing attempts');
                return false;
            }
            
            console.log('Successfully cleared LTPA token');
            return true;
            
        } catch (error) {
            console.error('Error during LTPA token clearing:', error);
            return false;
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
        console.log('=== Starting LTPA2 Cookie Retrieval ===');
        console.log('Target URL:', authUrl);
        
        try {
            // More thorough cookie clearing before authentication
            const cookiesToClear = ['LtpaToken2', 'JSESSIONID', '_client_wat', '_clerk_db_jwt'];
            const paths = ['/', '/itim', '/itim/j_security_check', '/itim/restlogin'];
            
            console.log('=== Cookie Cleanup Phase ===');
            console.log('Cookies to clear:', cookiesToClear);
            console.log('Paths to clear from:', paths);
            console.log('Cookies before clearing:', document.cookie);
            
            cookiesToClear.forEach(cookieName => {
                paths.forEach(path => {
                    const clearString = `${cookieName}=; Path=${path}; Domain=; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Secure; HttpOnly; SameSite=Strict;`;
                    document.cookie = clearString;
                    console.log(`Clearing cookie: ${cookieName} from path: ${path}`);
                });
            });

            console.log('Cookies after clearing:', document.cookie);

            console.log('=== Authentication Request Phase ===');
            const formData = new URLSearchParams();
            formData.append('j_username', this.username);
            formData.append('j_password', this.password);
            
            console.log('Preparing authentication request:', {
                url: authUrl,
                username: this.username,
                passwordLength: this.password ? this.password.length : 0,
                method: 'POST',
                mode: 'no-cors'
            });

            const requestHeaders = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': '*/*',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            };
            
            console.log('Request headers:', requestHeaders);

            const response = await fetch(authUrl, {
                method: 'POST',
                headers: requestHeaders,
                body: formData.toString(),
                credentials: 'include',
                mode: 'no-cors'
            });
            
            console.log('=== Authentication Response Phase ===');
            console.log('Response received:', {
                status: response.status,
                type: response.type,
                ok: response.ok,
                headers: Array.from(response.headers.entries())
            });
            
            // Wait for cookies to be set
            const waitTime = 1000;
            console.log(`Waiting ${waitTime}ms for cookies to be set...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            
            // Get current cookies
            console.log('=== Cookie Verification Phase ===');
            const currentCookies = document.cookie.split(';').map(c => c.trim());
            console.log('All current cookies after authentication:', currentCookies);
            
            // Look for all possible auth cookies
            const clientCookie = currentCookies.find(c => c.startsWith('_client_wat='));
            const clerkCookie = currentCookies.find(c => c.startsWith('_clerk_db_jwt='));
            const ltpa2Cookie = currentCookies.find(c => c.startsWith('LtpaToken2='));
            const jsessionCookie = currentCookies.find(c => c.startsWith('JSESSIONID='));
            
            console.log('Authentication cookie status:', {
                client: clientCookie ? 'found' : 'not found',
                clerk: clerkCookie ? 'found' : 'not found',
                ltpa2: ltpa2Cookie ? 'found' : 'not found',
                jsession: jsessionCookie ? 'found' : 'not found'
            });

            if (clientCookie) console.log('Client cookie length:', clientCookie.length);
            if (clerkCookie) console.log('Clerk cookie length:', clerkCookie.length);
            if (ltpa2Cookie) console.log('LTPA2 cookie length:', ltpa2Cookie.length);
            if (jsessionCookie) console.log('JSESSION cookie length:', jsessionCookie.length);
            
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

            // First try with GET
            let response = await fetch(csrfUrl, {
                method: 'GET',
                headers: {
                    'Cookie': cookieHeader,
                    'Accept': 'application/json, text/plain, */*',
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            let data;
            if (response.ok) {
                data = await response.json();
                console.log('CSRF GET Response:', data);
            } else {
                console.log(`GET request failed with status ${response.status}, trying POST...`);
                
                // If GET fails, try POST as fallback
                response = await fetch(csrfUrl, {
                    method: 'POST',
                    headers: {
                        'Cookie': cookieHeader,
                        'Accept': 'application/json, text/plain, */*',
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include'
                });
                
                if (response.ok) {
                    data = await response.json();
                    console.log('CSRF POST Response:', data);
                } else {
                    console.log(`POST fallback failed with status ${response.status}`);
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            }
            
            // Check for CSRF token in various formats
            if (data) {
                // Try all possible CSRF token formats
                const csrfToken = data.csrf || data.CSRFToken || data.csrfToken || data['X-CSRF-Token'] || data['x-csrf-token'];
                
                if (csrfToken) {
                    this.token.csrf = csrfToken;
                    this.onLog('CSRF Token Request', csrfUrl, 'success', JSON.stringify({ csrf: csrfToken }));
                    return true;
                }
                
                // Check in response headers as well (some servers put it there)
                const csrfHeader = response.headers.get('X-CSRF-Token') || 
                                  response.headers.get('x-csrf-token') || 
                                  response.headers.get('CSRFToken');
                
                if (csrfHeader) {
                    this.token.csrf = csrfHeader;
                    this.onLog('CSRF Token Request', csrfUrl, 'success', JSON.stringify({ 
                        csrf: csrfHeader,
                        source: 'response headers'
                    }));
                    return true;
                }
            }

            // If we reached here, we couldn't find a CSRF token but authentication might still work
            console.log('No CSRF token found in response, but continuing anyway');
            this.onLog('CSRF Token Request', csrfUrl, 'warning', JSON.stringify({
                message: 'No CSRF token in response - this is allowed but may cause issues with some requests',
                responseData: data
            }));
            
            // Set a placeholder token to avoid undefined errors
            this.token.csrf = 'not-available';
            return true;

        } catch (error) {
            console.error('CSRF Token Request failed:', error);
            this.onLog('CSRF Token Request', csrfUrl, 'error', JSON.stringify({
                error: error.message,
                currentCookies: document.cookie,
                storedTokens: this.token
            }));
            
            // Instead of failing completely, set a placeholder and continue
            this.token.csrf = 'not-available';
            console.log('Setting placeholder CSRF token and continuing');
            return true;
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
        // More lenient CSRF verification - only check if it exists
        if (!token || token === 'undefined') {
            console.warn("Warning: Missing or undefined CSRF Token");
            return false;
        }
        return true;
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
                'Cookie': [this.token.jsession, this.token.client, this.token.clerk].filter(Boolean).join('; ')
            };
            
            // Only add the CSRF token if it exists and is not the placeholder
            if (this.token.csrf && this.token.csrf !== 'not-available') {
                headers['X-CSRF-Token'] = this.token.csrf;
            }

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
