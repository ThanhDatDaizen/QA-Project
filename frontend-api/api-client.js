/**
 * Intellectual Contribution System - API Client
 * Phiên bản: 1.0.0
 */

class IntellectualContributionAPIClient {
    constructor(baseURL = 'http://localhost:8080/api/v1') {
        this.baseURL = baseURL;
        this.authToken = null;
        this.tokenExpiry = null;
        this.loadToken();
    }

    setToken(token, expiryMinutes = 1440) {
        this.authToken = token;
        this.tokenExpiry = new Date(Date.now() + expiryMinutes * 60000);
        localStorage.setItem('auth_token', token);
        localStorage.setItem('token_expiry', this.tokenExpiry.toISOString());
    }

    loadToken() {
        this.authToken = localStorage.getItem('auth_token');
        const expiry = localStorage.getItem('token_expiry');
        if (expiry) {
            this.tokenExpiry = new Date(expiry);
        }
    }

    isTokenValid() {
        if (!this.authToken || !this.tokenExpiry) return false;
        return new Date() < this.tokenExpiry;
    }

    clearToken() {
        this.authToken = null;
        this.tokenExpiry = null;
        localStorage.removeItem('auth_token');
        localStorage.removeItem('token_expiry');
    }

    getHeaders(includeAuth = true) {
        const headers = { 'Content-Type': 'application/json' };
        if (includeAuth && this.authToken && this.isTokenValid()) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        return headers;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            ...options,
            headers: { ...this.getHeaders(options.method !== 'GET'), ...options.headers },
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new APIError(data.message || 'Request failed', response.status, data);
            }

            return data;
        } catch (error) {
            if (error instanceof APIError) throw error;
            throw new APIError('Network error', 0, { message: error.message });
        }
    }

    async enrollIdentity(payload) {
        return await this.request('/identity/enroll', { method: 'POST', body: JSON.stringify(payload) });
    }

    async authenticatePrincipal(email, password) {
        const response = await this.request('/identity/authenticate', {
            method: 'POST',
            body: JSON.stringify({ institutional_email: email, access_secret: password }),
        });
        if (response.token) this.setToken(response.token);
        return response;
    }

    async getPrincipalProfile() {
        return await this.request('/identity/profile', { method: 'GET' });
    }

    async acceptTerms() {
        return await this.request('/identity/accept-terms', { method: 'POST' });
    }

    logout() {
        this.clearToken();
    }

    async createContribution(payload) {
        return await this.request('/contributions', { method: 'POST', body: JSON.stringify(payload) });
    }

    async listContributions() {
        return await this.request('/contributions', { method: 'GET' });
    }

    async getContribution(id) {
        return await this.request(`/contributions/${id}`, { method: 'GET' });
    }

    async updateContribution(id, payload) {
        return await this.request(`/contributions/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    }

    async addAffirmativeMarker(id) {
        return await this.request(`/contributions/${id}/affirmative`, { method: 'POST' });
    }

    async addNegativeMarker(id) {
        return await this.request(`/contributions/${id}/negative`, { method: 'POST' });
    }

    async createDiscourse(contributionId, content) {
        return await this.request(`/contributions/${contributionId}/discourse`, {
            method: 'POST',
            body: JSON.stringify({ textual_content: content }),
        });
    }

    async listDiscourse(contributionId) {
        return await this.request(`/contributions/${contributionId}/discourse`, { method: 'GET' });
    }

    async getDashboard() {
        return await this.request('/reports/dashboard', { method: 'GET' });
    }

    async exportCSV() {
        return await this.request('/reports/export/csv', { method: 'GET' });
    }

    async healthCheck() {
        return await this.request('/health', { method: 'GET', headers: { 'Content-Type': 'application/json' } });
    }
}

class APIError extends Error {
    constructor(message, status, data) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.data = data;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { IntellectualContributionAPIClient, APIError };
} else {
    window.IntellectualContributionAPIClient = IntellectualContributionAPIClient;
    window.APIError = APIError;
}
