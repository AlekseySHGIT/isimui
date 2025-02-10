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
        
        try {
            const formData = new URLSearchParams();
            formData.append('j_username', this.username);
            formData.append('j_password', this.password);
            
            console.log('Sending login request:', formData.toString());

            const response = await fetch(authUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': this.token.jsession,
                    'Accept': '*/*',
                    'Cache-Control': 'no-cache'
                },
                body: formData.toString(),
                credentials: 'include',
                mode: 'no-cors'
            });
            
            console.log('RESPONSE!!!!!!!', response);
            
            // Wait a bit for cookies to be set
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Get all cookies
            const cookies = document.cookie.split(';').map(cookie => cookie.trim());
            console.log('All cookies after auth:', cookies);
            
            // Look for client and clerk cookies from the response
            const clientCookie = cookies.find(cookie => cookie.includes('_client_wat'));
            const clerkCookie = cookies.find(cookie => cookie.includes('_clerk_db_jwt'));
            
            if (clientCookie || clerkCookie) {
                // Store these as our LTPA token equivalent
                this.token.ltpa2 = [clientCookie, clerkCookie].filter(Boolean).join('; ');
                console.log('Found auth cookies:', this.token.ltpa2);
                this.onLog('Authentication', authUrl, 'success', JSON.stringify({ 
                    cookies: {
                        client: clientCookie,
                        clerk: clerkCookie
                    }
                }));
                return true;
            }

            this.onLog('Authentication', authUrl, 'warning', JSON.stringify({ 
                message: 'No auth cookies found',
                availableCookies: cookies 
            }));
            return false;

        } catch (error) {
            this.onLog('Authentication', authUrl, 'error', JSON.stringify({ 
                error: error.message 
            }));
            throw new Error("Failed to retrieve auth cookies: " + error.message);
        }
    }

    async retrieveCSRFToken() {
        console.log('Retrieving CSRF token...');
        const csrfUrl = '/itim/rest/systemusers/me';
        this.onLog('CSRF Token Request', csrfUrl, 'pending');
        
        try {
            // Construct cookie header from all available tokens
            const cookieHeader = [this.token.jsession, this.token.ltpa2]
                .filter(Boolean)
                .join('; ');
            
            console.log('Using cookie header:', cookieHeader);

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
            this.onLog('CSRF Token Request', csrfUrl, 'error', JSON.stringify({
                error: error.message,
                cookies: {
                    jsession: this.token.jsession,
                    ltpa2: this.token.ltpa2
                }
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
        if (this.token.csrf && this.token.ltpa2 && this.token.jsession) {
            try {
                const response = await fetch(this.baseURI + this.csrfPath, {
                    headers: {
                        'Cookie': `${this.token.ltpa2}; ${this.token.jsession}`,
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
                'Cookie': [this.token.jsession, this.token.ltpa2].filter(Boolean).join('; '),
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
                    ltpa2: !!this.token.ltpa2,
                    csrf: !!this.token.csrf
                }
            }));
            throw error;
        }
    }

    async getPersonAccounts(personId) {
        const response = await this.makeRequest(`/rest/people/${personId}/accounts`, {
            headers: {
                'Accept': '*/*'
            }
        });
        return response;
    }

    async makeRequest(path, options = {}) {
        const url = options.fullUrl ? path : (options.rawPath ? `${this.baseURI}${path}` : `${this.baseURI}${path}`);
        this.onLog('API Request', url, 'pending');

        try {
            const headers = {
                'Accept': '*/*',
                'Cookie': [this.token.jsession, this.token.ltpa2].filter(Boolean).join('; '),
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
            if (!this.token.jsession || !this.token.ltpa2) {
                throw new Error('Missing required authentication tokens');
            }

            const cookieHeader = [this.token.jsession, this.token.ltpa2].filter(Boolean).join('; ');
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
                    ltpa2: this.token.ltpa2
                }
            }));
            throw new Error(`Failed to get system users: ${error.message}`);
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
    baseURI: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
    onLog: (component, message, status) => {
        console.log(`[${component}] ${message} - ${status}`);
    }
});

export default defaultClient;
