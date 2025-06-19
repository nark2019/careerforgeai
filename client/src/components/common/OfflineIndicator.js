import React from 'react';

/**
 * OfflineIndicator - A component that shows when the app is in offline mode
 * @returns {JSX.Element} - The rendered component
 */
function OfflineIndicator() {
    return (
        <div className="offline-indicator">
            <div className="alert alert-warning m-0 text-center" role="alert">
                <i className="bi bi-wifi-off me-2"></i>
                You are currently in offline mode. Some features may be limited.
            </div>
        </div>
    );
}

export default OfflineIndicator; 