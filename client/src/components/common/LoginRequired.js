import React from 'react';
import { Link } from 'react-router-dom';

/**
 * LoginRequired - A reusable component that shows a login prompt
 * @param {Object} props - Component props
 * @param {string} props.message - Custom message to display
 * @param {Function} props.onBack - Function to call when the user clicks "Go Back"
 * @param {string} props.returnPath - Path to return to after login
 * @returns {JSX.Element} - The rendered component
 */
function LoginRequired({ message, onBack, returnPath }) {
    const defaultMessage = "You need to be logged in to access this feature.";
    
    return (
        <div className="container mt-5">
            <div className="card shadow">
                <div className="card-body text-center p-5">
                    <h2 className="mb-4">Login Required</h2>
                    <p className="lead mb-4">
                        {message || defaultMessage}
                    </p>
                    <div className="d-grid gap-3 col-md-6 mx-auto">
                        <Link 
                            to={`/login${returnPath ? `?returnTo=${encodeURIComponent(returnPath)}` : ''}`} 
                            className="btn btn-primary"
                        >
                            Log In
                        </Link>
                        <Link 
                            to={`/signup${returnPath ? `?returnTo=${encodeURIComponent(returnPath)}` : ''}`} 
                            className="btn btn-outline-primary"
                        >
                            Sign Up
                        </Link>
                        {onBack && (
                            <button 
                                className="btn btn-link text-muted"
                                onClick={onBack}
                            >
                                Go Back
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LoginRequired; 