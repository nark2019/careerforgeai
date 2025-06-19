import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import config from '../config';

function Signup({ onSignup }) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
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
        } else if (name === 'email') {
            setEmail(value);
        } else if (name === 'password') {
            setPassword(value);
        } else if (name === 'confirmPassword') {
            setConfirmPassword(value);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        // Validate passwords match
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`${config.API_URL}/api/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Signup failed');
            }

            localStorage.setItem('token', data.token);
            localStorage.setItem('username', username);
            
            if (onSignup) {
                onSignup(data.token, username);
            }
            
            // Navigate to the returnTo path
            navigate(returnTo);
        } catch (error) {
            setError(error.message);
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
                            <h2 className="text-center mb-4">Sign Up</h2>
                            
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
                                    <label htmlFor="email" className="form-label">Email</label>
                                    <input
                                        type="email"
                                        className="form-control"
                                        id="email"
                                        name="email"
                                        value={email}
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
                                
                                <div className="mb-3">
                                    <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
                                    <input
                                        type="password"
                                        className="form-control"
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        value={confirmPassword}
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
                                                Creating account...
                                            </>
                                        ) : (
                                            'Sign Up'
                                        )}
                                    </button>
                                </div>
                            </form>
                            
                            <div className="mt-3 text-center">
                                <p>
                                    Already have an account? <Link to={`/login${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`}>Log in</Link>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Signup; 