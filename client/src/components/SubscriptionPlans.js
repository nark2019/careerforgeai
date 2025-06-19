import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import config from '../config';

function SubscriptionPlans() {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [userSubscription, setUserSubscription] = useState(null);

    useEffect(() => {
        fetchPlans();
        fetchUserSubscription();
    }, []);

    const fetchPlans = async () => {
        try {
            const response = await fetch(`${config.API_URL}/api/subscription/plans`);
            if (!response.ok) {
                throw new Error('Failed to fetch subscription plans');
            }
            const data = await response.json();
            setPlans(data);
        } catch (error) {
            setError('Failed to load subscription plans');
        } finally {
            setLoading(false);
        }
    };

    const fetchUserSubscription = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${config.API_URL}/api/subscription/user`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch user subscription');
            }
            const data = await response.json();
            setUserSubscription(data);
        } catch (error) {
            console.error('Error fetching user subscription:', error);
        }
    };

    const handleSubscribe = async (planId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${config.API_URL}/api/subscription/subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    planId,
                    paymentMethod: 'credit_card' // This would be replaced with actual payment method
                })
            });

            if (!response.ok) {
                throw new Error('Failed to subscribe');
            }

            const data = await response.json();
            alert('Subscription successful!');
            fetchUserSubscription();
        } catch (error) {
            setError('Failed to process subscription');
        }
    };

    const handleCancelSubscription = async () => {
        if (!window.confirm('Are you sure you want to cancel your subscription?')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${config.API_URL}/api/subscription/cancel`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to cancel subscription');
            }

            alert('Subscription cancelled successfully');
            fetchUserSubscription();
        } catch (error) {
            setError('Failed to cancel subscription');
        }
    };

    if (loading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="container py-5">
            <div className="text-center mb-5">
                <h1 className="display-4 fw-bold">Choose Your Plan</h1>
                <p className="lead text-muted">Select the perfect plan for your career development journey</p>
            </div>

            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}

            {userSubscription && userSubscription.status === 'active' && (
                <div className="alert alert-info mb-4">
                    <h4 className="alert-heading">Current Subscription</h4>
                    <p>You are currently subscribed to the {userSubscription.plan_name} plan.</p>
                    <p>Next billing date: {new Date(userSubscription.next_payment_date).toLocaleDateString()}</p>
                    <button 
                        className="btn btn-outline-danger mt-2"
                        onClick={handleCancelSubscription}
                    >
                        Cancel Subscription
                    </button>
                </div>
            )}

            <div className="row g-4">
                {plans.map((plan) => (
                    <div key={plan.id} className="col-md-4">
                        <div className="card h-100 border-0 shadow-sm">
                            <div className="card-body p-4">
                                <h3 className="card-title h4 mb-3">{plan.name}</h3>
                                <p className="text-muted mb-4">{plan.description}</p>
                                
                                <div className="mb-4">
                                    <span className="display-4 fw-bold">${plan.price}</span>
                                    <span className="text-muted">/{plan.billing_cycle}</span>
                                </div>

                                <ul className="list-unstyled mb-4">
                                    {JSON.parse(plan.features).map((feature, index) => (
                                        <li key={index} className="mb-2">
                                            <i className="bi bi-check-circle-fill text-success me-2"></i>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                {userSubscription && userSubscription.status === 'active' ? (
                                    <button 
                                        className="btn btn-outline-primary w-100"
                                        disabled
                                    >
                                        Current Plan
                                    </button>
                                ) : (
                                    <button 
                                        className="btn btn-primary w-100"
                                        onClick={() => handleSubscribe(plan.id)}
                                    >
                                        Subscribe Now
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="text-center mt-5">
                <p className="text-muted">
                    Need help choosing? <Link to="/contact">Contact our sales team</Link>
                </p>
            </div>
        </div>
    );
}

export default SubscriptionPlans; 