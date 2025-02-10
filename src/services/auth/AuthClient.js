export class AuthClient {
    constructor(config = {}) {
        this.baseURI = config.baseURI?.replace(/\/$/, '') || '';
        this.username = config.username || '';
        this.password = config.password || '';
        this.token = {};
        this.onLog = config.onLog || (() => {});
    }

    async connect() {
        try {
            console.log('Starting authentication flow...');
            
            await this.retrieveLTPA2Cookie();
            console.log('LTPA2 token retrieved successfully');
            
            await this.retrieveJSessionCookie();
            console.log('JSESSION cookie retrieved successfully');
            
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

            const allHeaders = Object.fromEntries(response.headers.entries());
            console.log('All response headers:', allHeaders);

            const cookieCount = parseInt(response.headers.get('x-auth-cookie-count') || '0');
            console.log('Cookie count:', cookieCount);

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
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const cookies = document.cookie.split(';').map(cookie => cookie.trim());
            console.log('All cookies after auth:', cookies);
            
            const clientCookie = cookies.find(cookie => cookie.includes('_client_wat'));
            const clerkCookie = cookies.find(cookie => cookie.includes('_clerk_db_jwt'));
            
            if (clientCookie || clerkCookie) {
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

    async checkSessionValid() {
        console.log('Checking session validity...');
        if (this.token.csrf && this.token.ltpa2 && this.token.jsession) {
            try {
                const response = await fetch(this.baseURI + '/itim/rest/systemusers/me', {
                    headers: {
                        'Cookie': `${this.token.ltpa2}; ${this.token.jsession}`,
                        'Accept': 'application/json'
                    },
                    credentials: 'include'
                });

                if (response.status === 200) {
                    const csrfToken = response.headers.get('CSRFToken');
                    if (csrfToken) {
                        this.token.csrf = csrfToken;
                        return true;
                    }
                    
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
}

export default AuthClient;
