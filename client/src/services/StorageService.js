class StorageService {
    constructor() {
        this.dbName = 'CareerForgeDB';
        this.dbVersion = 3; // Increment version to trigger upgrade
        this.db = null;
        this.ready = false;
        this.initPromise = this.initDB();
    }

    initDB() {
        return new Promise((resolve, reject) => {
            // Delete the old database first
            const deleteRequest = indexedDB.deleteDatabase(this.dbName);

            deleteRequest.onsuccess = () => {
                console.log('Old database deleted successfully');
                // Open new database
                const request = indexedDB.open(this.dbName, this.dbVersion);

                request.onerror = (event) => {
                    console.error('Error opening database:', event.target.error);
                    reject(event.target.error);
                };

                request.onsuccess = (event) => {
                    this.db = event.target.result;
                    this.ready = true;
                    console.log('Database initialized successfully');
                    resolve(this.db);
                };

                request.onupgradeneeded = (event) => {
                    console.log('Upgrading database...');
                    const db = event.target.result;
                    
                    // Create object stores with indexes
                    if (!db.objectStoreNames.contains('quizResults')) {
                        const quizStore = db.createObjectStore('quizResults', { keyPath: 'id' });
                        quizStore.createIndex('timestamp', 'timestamp', { unique: false });
                        quizStore.createIndex('career', 'career', { unique: false });
                    }
                    
                    if (!db.objectStoreNames.contains('currentResult')) {
                        db.createObjectStore('currentResult', { keyPath: 'id' });
                    }
                };
            };

            deleteRequest.onerror = () => {
                console.error('Error deleting old database');
                reject(new Error('Failed to delete old database'));
            };
        });
    }

    async ensureDB() {
        if (!this.ready) {
            await this.initPromise;
        }
        return this.db;
    }

    async saveData(storeName, data) {
        const db = await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);

            // Add timestamp if not present
            if (!data.timestamp) {
                data.timestamp = new Date().toISOString();
            }

            const request = store.put(data);

            request.onsuccess = () => resolve(true);
            request.onerror = (event) => {
                console.error(`Error saving to ${storeName}:`, event.target.error);
                reject(event.target.error);
            };
        });
    }

    async getData(storeName, id = null) {
        const db = await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);

            let request;
            if (id) {
                request = store.get(id);
            } else {
                request = store.getAll();
            }

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => {
                console.error(`Error getting data from ${storeName}:`, event.target.error);
                reject(event.target.error);
            };
        });
    }

    async deleteData(storeName, id) {
        const db = await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);

            const request = store.delete(id);

            request.onsuccess = () => resolve(true);
            request.onerror = (event) => {
                console.error(`Error deleting from ${storeName}:`, event.target.error);
                reject(event.target.error);
            };
        });
    }

    async clearStore(storeName) {
        const db = await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);

            const request = store.clear();

            request.onsuccess = () => resolve(true);
            request.onerror = (event) => {
                console.error(`Error clearing ${storeName}:`, event.target.error);
                reject(event.target.error);
            };
        });
    }

    async cleanupDuplicates(storeName) {
        if (storeName !== 'quizResults') return true;

        const db = await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => {
                const results = request.result;
                if (!Array.isArray(results)) {
                    resolve(true);
                    return;
                }

                // Create a map of unique entries by ID
                const uniqueMap = new Map();
                results.forEach(result => {
                    if (!uniqueMap.has(result.id) || 
                        new Date(result.timestamp) > new Date(uniqueMap.get(result.id).timestamp)) {
                        uniqueMap.set(result.id, result);
                    }
                });

                // Clear the store
                store.clear().onsuccess = () => {
                    // Add back unique entries
                    const uniqueEntries = Array.from(uniqueMap.values());
                    const addPromises = uniqueEntries.map(entry => 
                        new Promise((resolve, reject) => {
                            const addRequest = store.add(entry);
                            addRequest.onsuccess = () => resolve();
                            addRequest.onerror = () => reject();
                        })
                    );

                    Promise.all(addPromises)
                        .then(() => resolve(true))
                        .catch(() => reject(new Error('Failed to add unique entries')));
                };
            };

            request.onerror = (event) => {
                console.error('Error cleaning up duplicates:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    // Method to completely reset the database
    async resetDatabase() {
        this.ready = false;
        this.db = null;
        
        // Close any existing connections
        if (this.db) {
            this.db.close();
        }

        // Clear localStorage
        localStorage.clear();

        // Reinitialize the database
        return this.initDB();
    }
}

// Export a singleton instance
const storageService = new StorageService();
export default storageService; 