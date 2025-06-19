import React, { useState, useEffect } from 'react';
import { Card, Button, List, Space, Alert, Spin } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import config from '../config';

const Subscription = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPlan, setCurrentPlan] = useState(null);
    const [plans, setPlans] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetchSubscriptionData();
    }, []);

    const fetchSubscriptionData = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            // Fetch current subscription
            const subscriptionResponse = await fetch(`${config.API_URL}/api/subscription/user`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!subscriptionResponse.ok) {
                throw new Error('Failed to fetch subscription data');
            }

            const subscriptionData = await subscriptionResponse.json();
            setCurrentPlan(subscriptionData);

            // Fetch available plans
            const plansResponse = await fetch(`${config.API_URL}/api/subscription/plans`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!plansResponse.ok) {
                throw new Error('Failed to fetch plans');
            }

            const plansData = await plansResponse.json();
            setPlans(plansData);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePlanChange = async (planId) => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`${config.API_URL}/api/subscription/change`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ planId })
            });

            if (!response.ok) {
                throw new Error('Failed to change subscription plan');
            }

            await fetchSubscriptionData();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelSubscription = async () => {
        try {
            setLoading(true);
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

            await fetchSubscriptionData();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="text-center p-5">
                <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
                <p>Loading subscription information...</p>
            </div>
        );
    }

    if (error) {
        return (
            <Alert
                message="Error"
                description={error}
                type="error"
                showIcon
            />
        );
    }

    return (
        <div className="container mt-4">
            <h2 className="mb-4">Subscription Management</h2>
            
            {currentPlan && (
                <Card className="mb-4">
                    <h3>Current Plan</h3>
                    <p><strong>Plan:</strong> {currentPlan.planName}</p>
                    <p><strong>Status:</strong> {currentPlan.status}</p>
                    <p><strong>Next Billing Date:</strong> {new Date(currentPlan.nextBillingDate).toLocaleDateString()}</p>
                    {currentPlan.status === 'active' && (
                        <Button 
                            type="primary" 
                            danger 
                            onClick={handleCancelSubscription}
                        >
                            Cancel Subscription
                        </Button>
                    )}
                </Card>
            )}

            <h3 className="mb-4">Available Plans</h3>
            <div className="row">
                {plans.map((plan) => (
                    <div key={plan.id} className="col-md-4 mb-4">
                        <Card 
                            className={`h-100 ${currentPlan?.planId === plan.id ? 'border-primary' : ''}`}
                            title={
                                <div className="text-center">
                                    <h3 className="mb-0">{plan.name}</h3>
                                    {plan.popular && (
                                        <span className="badge bg-primary mt-2">Most Popular</span>
                                    )}
                                </div>
                            }
                        >
                            <div className="text-center mb-4">
                                <h2 className="mb-0">${plan.price}</h2>
                                <small className="text-muted">per {plan.billingCycle}</small>
                            </div>

                            <List
                                size="small"
                                dataSource={plan.features}
                                renderItem={item => (
                                    <List.Item>
                                        <Space>
                                            <CheckCircleOutlined style={{ color: '#52c41a' }} />
                                            <span>{item}</span>
                                        </Space>
                                    </List.Item>
                                )}
                            />

                            {plan.excludedFeatures && plan.excludedFeatures.length > 0 && (
                                <List
                                    size="small"
                                    dataSource={plan.excludedFeatures}
                                    renderItem={item => (
                                        <List.Item>
                                            <Space>
                                                <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                                                <span className="text-muted">{item}</span>
                                            </Space>
                                        </List.Item>
                                    )}
                                />
                            )}

                            <div className="text-center mt-4">
                                {currentPlan?.planId === plan.id ? (
                                    <Button type="primary" disabled>
                                        Current Plan
                                    </Button>
                                ) : (
                                    <Button 
                                        type="primary"
                                        onClick={() => handlePlanChange(plan.id)}
                                    >
                                        {currentPlan ? 'Switch to this Plan' : 'Subscribe'}
                                    </Button>
                                )}
                            </div>
                        </Card>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Subscription; 