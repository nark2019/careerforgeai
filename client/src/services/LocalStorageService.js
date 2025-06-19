/**
 * LocalStorageService - A service for handling local data persistence using localStorage
 */
class LocalStorageService {
    constructor() {
        console.log('LocalStorageService initialized');
    }

    async saveData(storeName, data) {
        try {
            const key = `${storeName}_${data.id || 'default'}`;
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error saving data:', error);
            throw error;
        }
    }

    async getData(storeName, id = null) {
        try {
            const key = `${storeName}_${id || 'default'}`;
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error getting data:', error);
            throw error;
        }
    }

    async deleteData(storeName, id) {
        try {
            const key = `${storeName}_${id}`;
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error deleting data:', error);
            throw error;
        }
    }
}

export default LocalStorageService; 