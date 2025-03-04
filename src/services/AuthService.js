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
      // First try server-side logout
      const logoutUrl = '/itim/restlogin/logout.jsp';
      try {
        const response = await fetch(logoutUrl, {
          method: 'GET',
          credentials: 'include',
        });
        console.log('Logout response:', response.status, response.ok);
      } catch (e) {
        console.log('Logout request failed:', e);
      }

      // Wait for server response
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get all current cookies and find the exact case of LtpaToken2
      const currentCookies = document.cookie.split(';').map(c => c.trim());
      const ltpaTokenCookie = currentCookies.find(c => c.toLowerCase().startsWith('ltpatoken2='));
      
      if (ltpaTokenCookie) {
        // Extract the exact name
        const exactName = ltpaTokenCookie.split('=')[0];
        console.log('Found LtpaToken2 cookie with exact name:', exactName);
        
        // Override with same case
        document.cookie = `${exactName}=INVALIDATED; path=/; max-age=31536000`;
        document.cookie = `${exactName}=INVALIDATED; path=/itim; max-age=31536000`;
      } else {
        // Fallback to both cases
        document.cookie = 'LtpaToken2=INVALIDATED; path=/; max-age=31536000';
        document.cookie = 'ltpaToken2=INVALIDATED; path=/; max-age=31536000';
        document.cookie = 'LtpaToken2=INVALIDATED; path=/itim; max-age=31536000';
        document.cookie = 'ltpaToken2=INVALIDATED; path=/itim; max-age=31536000';
      }
      
      console.log('Cookies after setting fake value:', document.cookie);
      
      // Clear storage
      localStorage.removeItem('isim_auth_data');
      localStorage.removeItem('user');
      this.isimClient = null;
      this.removeAuthHeader();

      console.log('=== Logout Process Completed ===');
      console.log('Final cookies:', document.cookie);
    } catch (error) {
      console.error('Error during logout:', error);
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
