import config from '../config';
import LocalStorageService from './LocalStorageService';

/**
 * DataService - A centralized service for handling data persistence across the application
 * This service provides methods for saving and retrieving data for different components
 */
class DataService {
    constructor() {
        this.storageService = new LocalStorageService();
    }

    /**
     * Perform a fetch request with retry functionality
     * @param {string} url - The URL to fetch
     * @param {object} options - Fetch options
     * @param {number} retries - Number of retries
     * @param {number} delay - Delay between retries in ms
     * @returns {Promise} - A promise that resolves with the fetch response
     */
    async fetchWithRetry(url, options, retries = 2, delay = 1000) {
        try {
            // Add a timeout to the fetch request
            const controller = new AbortController();
            // Increase timeout for each retry (starting with 10 seconds)
            const timeout = 10000 + (2 - retries) * 5000;
            
            // If options already has a signal, we need to handle both signals
            const originalSignal = options.signal;
            
            // Create a timeout that increases with each retry
            const timeoutId = setTimeout(() => {
                controller.abort('timeout');
            }, timeout);
            
            console.log(`Fetch attempt with ${timeout}ms timeout`);
            
            // Handle both the original signal and our timeout signal
            if (originalSignal) {
                // If the original signal aborts, we should abort our controller too
                const abortHandler = () => {
                    clearTimeout(timeoutId);
                    controller.abort('original_signal_aborted');
                };
                originalSignal.addEventListener('abort', abortHandler);
            }
            
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            return response;
        } catch (error) {
            console.error('Fetch error:', error.name, error.message);
            
            if (retries === 0) {
                throw error;
            }
            
            console.log(`Fetch failed, retrying... (${retries} retries left)`);
            
            // Wait for the specified delay
            await new Promise(resolve => setTimeout(resolve, delay));
            
            // Try to detect the server if we get a network error
            if (error.name === 'TypeError' || error.name === 'AbortError') {
                try {
                    await config.detectServer();
                } catch (serverError) {
                    console.error('Server detection failed:', serverError);
                }
            }
            
            // Retry the fetch with increased delay
            return this.fetchWithRetry(url, options, retries - 1, delay * 1.5);
        }
    }

    /**
     * Save data to storage
     * @param {string} storeName - The name of the store
     * @param {object} data - The data to save
     * @returns {Promise} - A promise that resolves when the data is saved
     */
    async saveToStore(storeName, data) {
        try {
            await this.storageService.saveData(storeName, data);
        } catch (error) {
            console.error(`Error saving to ${storeName}:`, error);
            throw error;
        }
    }

    /**
     * Get data from storage
     * @param {string} storeName - The name of the store
     * @param {string|number} key - The key to retrieve
     * @returns {Promise} - A promise that resolves with the retrieved data
     */
    async getFromStore(storeName, key) {
        try {
            return await this.storageService.getData(storeName, key);
        } catch (error) {
            console.error(`Error getting from ${storeName}:`, error);
            throw error;
        }
    }

    /**
     * Get all data from a store
     * @param {string} storeName - The name of the store
     * @returns {Promise} - A promise that resolves with all data in the store
     */
    async getAllFromStore(storeName) {
        try {
            return await this.storageService.getData(storeName);
        } catch (error) {
            console.error(`Error getting all from ${storeName}:`, error);
            throw error;
        }
    }

    /**
     * Delete data from storage
     * @param {string} storeName - The name of the store
     * @param {string|number} key - The key to delete
     * @returns {Promise} - A promise that resolves when the data is deleted
     */
    async deleteFromStore(storeName, key) {
        try {
            await this.storageService.deleteData(storeName, key);
        } catch (error) {
            console.error(`Error deleting from ${storeName}:`, error);
            throw error;
        }
    }

    /**
     * Add a pending request to be processed when online
     * @param {string} url - The request URL
     * @param {object} options - The request options
     * @returns {Promise} - A promise that resolves when the request is added
     */
    async addPendingRequest(url, options) {
        const request = { url, options, timestamp: Date.now() };
        await this.saveToStore('pendingRequests', request);
    }

    /**
     * Process any pending requests
     * @returns {Promise} - A promise that resolves when all pending requests are processed
     */
    async processPendingRequests() {
        if (!this.isOnline()) {
            return;
        }

        const requests = await this.getAllFromStore('pendingRequests');
        if (!requests || !requests.length) {
            return;
        }

        for (const request of requests) {
            try {
                await this.fetchWithRetry(request.url, request.options);
                await this.deleteFromStore('pendingRequests', request.id);
            } catch (error) {
                console.error('Error processing pending request:', error);
            }
        }
    }

    /**
     * Check if the application is online
     * @returns {boolean} - True if online, false otherwise
     */
    isOnline() {
        return navigator.onLine;
    }

    /**
     * Save data for a specific component
     * @param {string} componentType - The type of component
     * @param {object} data - The data to save
     * @returns {Promise} - A promise that resolves when the data is saved
     */
    async saveData(componentType, data) {
        try {
            const userId = this.getUserId();
            if (!userId) {
                throw new Error('User not authenticated');
            }

            const storageKey = `${componentType}_${userId}`;
            await this.saveToStore(componentType, { id: storageKey, ...data });

            // If online, sync with server
            if (this.isOnline()) {
                const apiEndpoint = `${config.apiUrl}/api/${componentType}/save`;
                await this.fetchWithRetry(apiEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify(data)
                });
            }
        } catch (error) {
            console.error(`Error saving ${componentType} data:`, error);
            throw error;
        }
    }

    /**
     * Get data for a specific component
     * @param {string} componentType - The type of component
     * @returns {Promise} - A promise that resolves with the component data
     */
    async getData(componentType) {
        try {
            const userId = this.getUserId();
            if (!userId) {
                throw new Error('User not authenticated');
            }

            const storageKey = `${componentType}_${userId}`;
            let data = await this.getFromStore(componentType, storageKey);

            // If online, try to get from server
            if (this.isOnline()) {
                try {
                    const apiEndpoint = `${config.apiUrl}/api/${componentType}/get`;
                    const response = await this.fetchWithRetry(apiEndpoint, {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    });

                    if (response.ok) {
                        data = await response.json();
                        // Update local storage with server data
                        await this.saveToStore(componentType, { id: storageKey, ...data });
                    }
                } catch (error) {
                    console.warn('Failed to fetch from server, using local data:', error);
                }
            }

            return data;
        } catch (error) {
            console.error(`Error getting ${componentType} data:`, error);
            throw error;
        }
    }

    /**
     * Get the current user ID
     * @returns {string|null} - The user ID or null if not authenticated
     */
    getUserId() {
        const token = localStorage.getItem('token');
        if (!token) return null;

        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            return JSON.parse(jsonPayload).userId;
        } catch (error) {
            console.error('Error decoding token:', error);
            return null;
        }
    }

    /**
     * Initialize the service
     */
    async init() {
        console.log('Initializing DataService');
        // Add online/offline event listeners
        window.addEventListener('online', this.handleOnline.bind(this));
        window.addEventListener('offline', this.handleOffline.bind(this));
    }

    /**
     * Handle when the application comes online
     */
    handleOnline() {
        console.log('Application is online');
    }

    /**
     * Handle when the application goes offline
     */
    handleOffline() {
        console.log('Application is offline');
    }

    /**
     * Clear data for a specific component
     * @param {string} componentType - The type of component
     * @returns {Promise} - A promise that resolves when the data is cleared
     */
    async clearData(componentType) {
        try {
            const userId = this.getUserId();
            if (!userId) {
                throw new Error('User not authenticated');
            }

            const storageKey = `${componentType}_${userId}`;
            await this.deleteFromStore(componentType, storageKey);

            // If online, sync deletion with server
            if (this.isOnline()) {
                const apiEndpoint = `${config.apiUrl}/api/${componentType}/clear`;
                await this.fetchWithRetry(apiEndpoint, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
            }
        } catch (error) {
            console.error(`Error clearing ${componentType} data:`, error);
            throw error;
        }
    }

    /**
     * Check if the user is logged in
     * @returns {boolean} - True if logged in, false otherwise
     */
    isLoggedIn() {
        return !!localStorage.getItem('token');
    }

    /**
     * Validate the current authentication token
     * @returns {Promise<boolean>} - A promise that resolves with true if valid, false otherwise
     */
    async validateToken() {
        const token = localStorage.getItem('token');
        if (!token) return false;

        try {
            const response = await this.fetchWithRetry(`${config.apiUrl}/api/auth/validate`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            return response.ok;
        } catch (error) {
            console.error('Token validation error:', error);
            return false;
        }
    }

    /**
     * Get the current user's profile
     * @returns {Promise} - A promise that resolves with the user profile
     */
    async getCurrentUser() {
        if (!this.isLoggedIn()) {
            throw new Error('User not authenticated');
        }

        try {
            const response = await this.fetchWithRetry(`${config.apiUrl}/api/users/me`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch user profile');
            }

            const userData = await response.json();
            await this.saveToStore('userProfile', { userId: this.getUserId(), ...userData });
            return userData;
        } catch (error) {
            console.error('Error fetching user profile:', error);
            // Try to get from local storage if offline
            const userData = await this.getFromStore('userProfile', this.getUserId());
            if (userData) {
                return userData;
            }
            throw error;
        }
    }
}

// Create a singleton instance
const dataService = new DataService();
export default dataService; 