export class ISIMClient {
    constructor(config) {
        this.baseURI = config.baseURI.replace(/\/$/, ''); // Remove trailing slash if present
        this.username = config.username;
        this.password = config.password;
        this.token = {};
        this.onLog = config.onLog || (() => {}); // Add logging callback
        
        // Paths
        this.jsiPath = '/restlogin/';
        this.authPath = '/j_security_check';
        this.csrfPath = '/rest/systemusers/me';
        
        this.validateConfig();
    }

    validateConfig() {
        if (!this.baseURI || !this.baseURI.startsWith('http')) {
            throw new Error("Invalid base address in configuration");
        }
        if (!this.username || !this.password) {
            throw new Error("Credentials not set in configuration");
        }
    }

    async connect() {
        // if (!await this.checkSessionValid()) {
            await this.retrieveJSessionCookie();
            await this.retrieveLTPA2Cookie();
            await this.retrieveCSRFToken();
        // }
        return this.token;
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
                credentials: 'include'
            });
            console.log('RESPONSE!!!!', response);
            // Get all headers for debugging
            const allHeaders = Object.fromEntries(response.headers.entries());
            console.log('All response headers:', allHeaders);

            // Specifically log Set-Cookie header
            const setCookieHeader = response.headers.get('set-cookie');
            console.log('Set-Cookie header:', setCookieHeader);

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

            const jsessionCookie = cookies.find(cookie => cookie.startsWith('JSESSIONID='));
            if (jsessionCookie) {
                console.log('Found JSESSIONID in response:', jsessionCookie);
            }

            // Find LtpaToken2 cookie and extract value up to semicolon
            const ltpaCookie = cookies.find(cookie => cookie.startsWith('LtpaToken2='));
            if (ltpaCookie) {
                const match = ltpaCookie.match(/LtpaToken2=([^;]+)/);
                if (match) {
                    this.token.ltpa2 = `LtpaToken2=${match[1]}`;
                    console.log('Found LtpaToken2 cookie:', this.token.ltpa2);
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
            
            this.onLog('Authentication', authUrl, 'success',
                JSON.stringify(responseDetails, null, 2));

        } catch (error) {
            this.onLog('Authentication', authUrl, 'error', error.message);
            throw new Error("Failed to retrieve LTPA2 cookie: " + error.message);
        }
    }

    async retrieveCSRFToken() {
        const csrfUrl = '/itim/rest/systemusers/me';
        this.onLog('CSRF Token Request', csrfUrl, 'pending');
        
        try {
            // Combine both cookies in the header
            const cookieHeader = `${this.token.ltpa2};${this.token.jsession}`;
            console.log('Using cookie header:', cookieHeader);

            const response = await fetch(csrfUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Cookie': cookieHeader,
                    'Cache-Control': 'no-cache'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`Failed to get CSRF token: ${response.status} ${response.statusText}`);
            }

            // Log full response details
            console.log('CSRF Response Details:', {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries())
            });

            const data = await response.json();
            console.log('CSRF Response Data:', data);

            // Extract CSRF token from response headers
            const csrfToken = response.headers.get('X-CSRF-Token') || 
                            response.headers.get('x-csrf-token');

            if (csrfToken) {
                this.token.csrf = csrfToken;
                console.log('Found CSRF token:', csrfToken);
            } else {
                console.warn('No CSRF token found in response headers');
            }

            const responseDetails = {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries()),
                data: data,
                csrfToken: csrfToken,
                cookieHeader: cookieHeader
            };

            this.onLog('CSRF Token Request', csrfUrl, 'success',
                JSON.stringify(responseDetails, null, 2));

            // Store user details from response
            if (data) {
                this.token.user = data;
            }

        } catch (error) {
            this.onLog('CSRF Token Request', csrfUrl, 'error', error.message);
            throw new Error("Failed to retrieve CSRF token: " + error.message);
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
        if (this.token.csrf && this.token.ltpa2 && this.token.jsession) {
            try {
                const response = await fetch(this.baseURI + this.csrfPath, {
                    headers: {
                        'Cookie': `${this.token.ltpa2}; JSESSIONID=${this.token.jsession}`
                    },
                    credentials: 'include'
                });

                if (response.status === 200) {
                    const csrfToken = response.headers.get('CSRFToken');
                    if (csrfToken) {
                        this.token.csrf = csrfToken;
                        return true;
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
}
