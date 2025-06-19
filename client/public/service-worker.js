// Service Worker for CareerForge AI
const CACHE_NAME = 'careerforge-ai-v1';
const OFFLINE_URL = '/offline.html';

// Assets to cache on install
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/offline.html',
  '/static/js/main.chunk.js',
  '/static/js/0.chunk.js',
  '/static/js/bundle.js',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.3/font/bootstrap-icons.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js'
];

// Install event - cache assets
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Install');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Caching app shell and content');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        console.log('[ServiceWorker] Skip waiting on install');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activate');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName !== CACHE_NAME;
        }).map(cacheName => {
          console.log('[ServiceWorker] Removing old cache', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('[ServiceWorker] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (event.request.url.startsWith(self.location.origin) || 
      event.request.url.includes('cdn.jsdelivr.net')) {
    
    // For API requests, use network-first strategy
    if (event.request.url.includes('/api/')) {
      event.respondWith(networkFirstStrategy(event.request));
    } else {
      // For static assets, use cache-first strategy
      event.respondWith(cacheFirstStrategy(event.request));
    }
  }
});

// Cache-first strategy for static assets
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // If the request is for a page, return the offline page
    if (request.mode === 'navigate') {
      const cache = await caches.open(CACHE_NAME);
      return cache.match(OFFLINE_URL);
    }
    
    // Otherwise, just throw the error
    throw error;
  }
}

// Network-first strategy for API requests
async function networkFirstStrategy(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful GET responses
    if (request.method === 'GET' && networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // If network fails, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If it's a navigation request, return offline page
    if (request.mode === 'navigate') {
      const cache = await caches.open(CACHE_NAME);
      return cache.match(OFFLINE_URL);
    }
    
    // Otherwise, just throw the error
    throw error;
  }
}

// Background sync for offline operations
self.addEventListener('sync', event => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  } else if (event.tag === 'sync-user-data') {
    event.waitUntil(syncUserData());
  }
});

// Sync messages when back online
async function syncMessages() {
  try {
    // Get all pending messages from IndexedDB
    const db = await openDatabase();
    const pendingMessages = await getAllPendingMessages(db);
    
    // Send each message to the server
    for (const message of pendingMessages) {
      try {
        const response = await fetch('/api/coach/message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${message.token}`
          },
          body: JSON.stringify(message.data)
        });
        
        if (response.ok) {
          // Remove from pending messages
          await deletePendingMessage(db, message.id);
        }
      } catch (error) {
        console.error('Error syncing message:', error);
        // Keep in pending messages for next sync
      }
    }
  } catch (error) {
    console.error('Error in syncMessages:', error);
  }
}

// Sync user data when back online
async function syncUserData() {
  try {
    // Get all pending user data from IndexedDB
    const db = await openDatabase();
    const pendingData = await getAllPendingUserData(db);
    
    // Send each data item to the server
    for (const item of pendingData) {
      try {
        const response = await fetch(`/api/user-data/${item.componentType}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${item.token}`
          },
          body: JSON.stringify(item.data)
        });
        
        if (response.ok) {
          // Remove from pending data
          await deletePendingUserData(db, item.id);
        }
      } catch (error) {
        console.error('Error syncing user data:', error);
        // Keep in pending data for next sync
      }
    }
  } catch (error) {
    console.error('Error in syncUserData:', error);
  }
}

// Helper functions for IndexedDB operations
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CareerForgeDB', 1);
    
    request.onerror = event => {
      reject(event.target.error);
    };
    
    request.onsuccess = event => {
      resolve(event.target.result);
    };
    
    request.onupgradeneeded = event => {
      const db = event.target.result;
      
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains('pendingMessages')) {
        db.createObjectStore('pendingMessages', { keyPath: 'id', autoIncrement: true });
      }
      
      if (!db.objectStoreNames.contains('pendingUserData')) {
        db.createObjectStore('pendingUserData', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

function getAllPendingMessages(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingMessages'], 'readonly');
    const store = transaction.objectStore('pendingMessages');
    const request = store.getAll();
    
    request.onerror = event => {
      reject(event.target.error);
    };
    
    request.onsuccess = event => {
      resolve(event.target.result);
    };
  });
}

function deletePendingMessage(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingMessages'], 'readwrite');
    const store = transaction.objectStore('pendingMessages');
    const request = store.delete(id);
    
    request.onerror = event => {
      reject(event.target.error);
    };
    
    request.onsuccess = event => {
      resolve();
    };
  });
}

function getAllPendingUserData(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingUserData'], 'readonly');
    const store = transaction.objectStore('pendingUserData');
    const request = store.getAll();
    
    request.onerror = event => {
      reject(event.target.error);
    };
    
    request.onsuccess = event => {
      resolve(event.target.result);
    };
  });
}

function deletePendingUserData(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingUserData'], 'readwrite');
    const store = transaction.objectStore('pendingUserData');
    const request = store.delete(id);
    
    request.onerror = event => {
      reject(event.target.error);
    };
    
    request.onsuccess = event => {
      resolve();
    };
  });
} 