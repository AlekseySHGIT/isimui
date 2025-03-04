import axios from 'axios';
import { ISIMClient } from './ISIMClient';

class AuthService {
  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    this.isimClient = null;
  }

  async login(username, password) {
    try {
      // More thorough cookie clearing before login
      const cookiesToClear = ['LtpaToken2', 'JSESSIONID', '_client_wat', '_clerk_db_jwt'];
      const paths = ['/', '/itim', '/itim/j_security_check', '/itim/restlogin'];
      
      cookiesToClear.forEach(cookieName => {
        paths.forEach(path => {
          document.cookie = `${cookieName}=; Path=${path}; Domain=; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Secure; HttpOnly; SameSite=Strict;`;
        });
      });
      
      // Create a new ISIMClient instance for this login attempt
      this.isimClient = new ISIMClient({
        baseURI: '/itim',
        username,
        password,
        onLog: (component, message, status) => {
          console.log(`[${component}] ${message} - ${status}`)
        }
      })

      // Connect and get tokens
      const tokens = await this.isimClient.connect()
      console.log('Tokens:', tokens)
      // Store auth data
      const user = {
        username,
        tokens
      }
      localStorage.setItem('user', JSON.stringify(user))
      
      return user;
    } catch (error) {
      console.error('Login failed:', error)
      throw new Error('Login failed. Please check your credentials.');
    }
  }

  async logout() {
    console.log('=== Starting Logout Process ===');
    console.log('Initial cookies:', document.cookie);
    
    try {
      // First try server-side logout with the correct endpoint
      const logoutUrl = '/itim/console/main';
      try {
        // Get the current user's tokens first
        const user = this.getCurrentUser();
        if (user && user.tokens) {
          // Set the JSESSIONID cookie using the stored value from login
          if (user.tokens.jsession) {
            document.cookie = `${user.tokens.jsession}; path=/itim; secure; samesite=strict`;
          }
          // Set LTPA token if available
          if (user.tokens.ltpa2) {
            document.cookie = `${user.tokens.ltpa2}; path=/itim; secure; httponly; samesite=strict`;
          }
        }

        // First request to trigger server-side logout
        const response = await fetch(logoutUrl, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Accept': '*/*'
          }
        });
        
        console.log(`First logout attempt: Status ${response.status}`);
        
        // Set logout flag after successful server-side logout
        document.cookie = 'consoleui_error_msg_key=LOGGED_OUT; path=/itim; secure; samesite=strict';
        
        // Wait briefly for server-side changes
        await new Promise(resolve => setTimeout(resolve, 500));

        // Second request to ensure complete logout and proper cookie handling
        // This handles the case where the server returns cookies with 1994 expiration date
        const loginJspUrl = '/itim/console/jsp/logon/Login.jsp';
        const secondResponse = await fetch(loginJspUrl, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Accept': '*/*'
          }
        });
        
        console.log(`Second logout attempt: Status ${secondResponse.status}`);
        
        // Wait briefly for server-side changes
        await new Promise(resolve => setTimeout(resolve, 500));

        // Clear cookies with all possible combinations
        const cookiesToClear = ['LtpaToken2', 'JSESSIONID', '_client_wat', '_clerk_db_jwt'];
        const paths = ['/', '/itim', '/itim/j_security_check', '/itim/restlogin', '/itim/rest', '/itim/console'];
        const domains = ['', 'localhost', window.location.hostname, `.${window.location.hostname}`];

        cookiesToClear.forEach(cookieName => {
          paths.forEach(path => {
            domains.forEach(domain => {
              // Try different cookie deletion approaches
              const variations = [
                `${cookieName}=; path=${path}; expires=Thu, 01 Jan 1970 00:00:01 GMT; secure; samesite=strict`,
                `${cookieName}=; path=${path}; max-age=0; secure; samesite=strict`,
                `${cookieName}=; path=${path}; expires=Thu, 01 Jan 1970 00:00:01 GMT; secure; httponly`,
                `${cookieName}=; path=${path}; max-age=0; secure; httponly`
              ];

              variations.forEach(cookieStr => {
                try {
                  if (domain) {
                    document.cookie = `${cookieStr}; domain=${domain}`;
                  } else {
                    document.cookie = cookieStr;
                  }
                } catch (e) {
                  console.warn(`Failed to clear cookie ${cookieName} with variation:`, e);
                }
              });
            });
          });
        });
      } catch (e) {
        console.log('Logout request failed:', e);
      }

      // Clear all authentication cookies using ISIMClient's method as backup
      await this.isimClient?.clearLTPAToken();

      // Additional cleanup
      sessionStorage.clear();
      localStorage.removeItem('user');
      this.isimClient = null;
      this.removeAuthHeader();

      console.log('=== Logout Process Completed ===');
      console.log('Final cookies:', document.cookie);
      
      // Redirect to login page
      window.location.href = '/login';
      
      return true;
    } catch (error) {
      console.error('Error during logout:', error);
      return false;
    }
  }

  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  }

  isAuthenticated() {
    
    const user = this.getCurrentUser();
    return !!user;
  }

  getISIMClient() {
    if (!this.isimClient) {
      const user = this.getCurrentUser();
      if (user) {
        this.isimClient = new ISIMClient({
          baseURI: '/itim',
          username: user.username,
          tokens: user.tokens
        });
      }
    }
    return this.isimClient;
  }

  setAuthHeader(token) {
    this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  removeAuthHeader() {
    delete this.api.defaults.headers.common['Authorization'];
  }
}

export default new AuthService();
