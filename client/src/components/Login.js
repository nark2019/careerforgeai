import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import config from '../config';

function Login({ onLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const location = useLocation();
    const navigate = useNavigate();
    
    // Get the returnTo parameter from the URL query string
    const searchParams = new URLSearchParams(location.search);
    const returnTo = searchParams.get('returnTo') || '/profile';

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'username') {
            setUsername(value);
        } else if (name === 'password') {
            setPassword(value);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        try {
            console.log('Attempting login with API URL:', config.API_URL);
            
            // Force server detection before login
            try {
                const detectedUrl = await config.detectServer();
                console.log('Server detected at:', detectedUrl);
            } catch (err) {
                console.warn('Server detection failed:', err);
            }
            
            // Use the correct endpoint with /api prefix
            const loginUrl = `${config.API_URL}/api/auth/login`;
            console.log('Using login URL:', loginUrl);
            
            const response = await fetch(loginUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            // Check content type before parsing
            const contentType = response.headers.get('content-type');
            
            // Debug log
            console.log('Response content type:', contentType);
            console.log('Response status:', response.status);
            
            let data;
            
            // Safe parsing of response
            try {
                if (contentType && contentType.includes('application/json')) {
                    data = await response.json();
                } else {
                    // If we got HTML instead of JSON, log it and throw a clear error
                    const text = await response.text();
                    console.error('Received HTML instead of JSON:', text.substring(0, 150) + '...');
                    throw new Error('Server returned HTML instead of JSON. The API endpoint might be incorrect or the server might be down.');
                }
            } catch (parseError) {
                console.error('Error parsing response:', parseError);
                
                if (parseError.message.includes('Unexpected token')) {
                    throw new Error('Received invalid JSON response. The server might be returning HTML instead of JSON. Please check the server configuration.');
                }
                
                throw parseError;
            }

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            // Success - store token and username
            localStorage.setItem('token', data.token);
            localStorage.setItem('username', username);
            
            console.log('Login successful');
            
            if (onLogin) {
                onLogin(data.token, username);
            }
            
            // Navigate to the returnTo path
            navigate(returnTo);
        } catch (error) {
            console.error('Login error:', error);
            
            // Provide more helpful error messages
            if (error.message.includes('<!DOCTYPE') || error.message.includes('Unexpected token')) {
                setError('Received HTML instead of JSON. The server might be down or the API endpoint is incorrect. Please check the server configuration.');
            } else if (error.message.includes('Failed to fetch')) {
                setError('Network error. Please check your connection and try again.');
            } else {
                setError(error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-6">
                    <div className="card shadow">
                        <div className="card-body p-5">
                            <h2 className="text-center mb-4">Log In</h2>
                            
                            {error && (
                                <div className="alert alert-danger" role="alert">
                                    {error}
                                </div>
                            )}
                            
                            <form onSubmit={handleSubmit}>
                                <div className="mb-3">
                                    <label htmlFor="username" className="form-label">Username</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="username"
                                        name="username"
                                        value={username}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                
                                <div className="mb-3">
                                    <label htmlFor="password" className="form-label">Password</label>
                                    <input
                                        type="password"
                                        className="form-control"
                                        id="password"
                                        name="password"
                                        value={password}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                
                                <div className="d-grid">
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                Logging in...
                                            </>
                                        ) : (
                                            'Log In'
                                        )}
                                    </button>
                                </div>
                            </form>
                            
                            <div className="mt-3 text-center">
                                <p>
                                    Don't have an account? <Link to={`/signup${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`}>Sign up</Link>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Login; 