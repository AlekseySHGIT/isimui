import axios from 'axios';

class UserService {
    constructor() {
        this.api = axios.create({
            baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    async getUsers() {
        try {
            const response = await this.api.get('/users');
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Failed to fetch users');
        }
    }

    async getUserById(id) {
        try {
            const response = await this.api.get(`/users/${id}`);
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Failed to fetch user');
        }
    }

    async createUser(userData) {
        try {
            const response = await this.api.post('/users', userData);
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Failed to create user');
        }
    }

    async updateUser(id, userData) {
        try {
            const response = await this.api.put(`/users/${id}`, userData);
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Failed to update user');
        }
    }

    async deleteUser(id) {
        try {
            await this.api.delete(`/users/${id}`);
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Failed to delete user');
        }
    }
}

export default new UserService();
