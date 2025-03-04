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
    try {
      // First try to invalidate the token from server side
      try {
        const logoutUrl = '/itim/restlogin/logout.jsp';
        const response = await fetch(logoutUrl, {
          method: 'GET',
          credentials: 'include',
        });
        console.log('Server logout response:', response.status);
      } catch (e) {
        console.warn('Server logout request failed:', e);
      }

      // Use modern cookie deletion API if available
      if (window.cookieStore) {
        try {
          await window.cookieStore.delete('LtpaToken2');
          await window.cookieStore.delete({
            name: 'LtpaToken2',
            domain: 'localhost',
            path: '/'
          });
        } catch (e) {
          console.warn('CookieStore API failed:', e);
        }
      }

      // Fallback: try to delete via document.cookie
      const cookieAttrs = [
        'path=/;',
        'domain=localhost;',
        'expires=Thu, 01 Jan 1970 00:00:00 GMT;',
        'max-age=-1;'
      ];
      
      // Try all combinations of attributes
      for (let i = 0; i < 16; i++) {
        let attrs = [];
        if (i & 1) attrs.push(cookieAttrs[0]);
        if (i & 2) attrs.push(cookieAttrs[1]);
        if (i & 4) attrs.push(cookieAttrs[2]);
        if (i & 8) attrs.push(cookieAttrs[3]);
        
        document.cookie = `LtpaToken2=;${attrs.join('')}`;
      }

      // Also try removing via header
      if (document.location.protocol === 'https:') {
        try {
          await fetch('/itim/rest/logout', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Set-Cookie': 'LtpaToken2=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure'
            }
          });
        } catch (e) {
          console.warn('Header-based deletion failed:', e);
        }
      }

      // Clear storage and state
      localStorage.removeItem('user');
      sessionStorage.clear();
      this.isimClient = null;
      this.removeAuthHeader();

      // Force a hard reload to ensure cookie is cleared
      document.location.href = '/';
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if something fails, try to force reload
      document.location.href = '/';
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
