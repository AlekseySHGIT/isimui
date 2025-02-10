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

  logout() {
    localStorage.removeItem('user');
    this.isimClient = null;
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
