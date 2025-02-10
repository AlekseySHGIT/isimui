import axios from 'axios';
import isimClient from './ISIMClient';

class AuthService {
    constructor() {
        this.api = axios.create({
            baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    async login(username, password) {
        try {
            // Set credentials in ISIMClient
            isimClient.username = username;
            isimClient.password = password;
            
            // Attempt to authenticate with ISIMClient
            await isimClient.authenticate();
            
            // If authentication successful, store user info
            const userData = {
                username,
                password, // Note: In production, consider more secure storage
                authenticated: true
            };
            
            localStorage.setItem('user', JSON.stringify(userData));
            return userData;
        } catch (error) {
            throw new Error(error.message || 'Login failed');
        }
    }

    logout() {
        localStorage.removeItem('user');
        isimClient.username = '';
        isimClient.password = '';
    }

    getCurrentUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    }

    setAuthHeader(token) {
        this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    removeAuthHeader() {
        delete this.api.defaults.headers.common['Authorization'];
    }

    isAuthenticated() {
        const user = this.getCurrentUser();
        return !!user?.authenticated;
    }
}

export default new AuthService();
