import React from 'react';
import { Card, Button, List, Space } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

const PricingTable = () => {
    const plans = [
        {
            name: 'Free',
            price: '0',
            period: 'month',
            features: [
                'Basic career assessment',
                'Limited AI recommendations',
                'Basic profile management',
                'Standard CV templates',
                'Community access'
            ],
            excluded: [
                'AI Career Coach',
                'Interview Preparation',
                'Million Dollar Ideas',
                'Portfolio Builder',
                'Learning Dashboard',
                'Career Timeline',
                'Job Corner',
                'Connections'
            ],
            buttonText: 'Get Started',
            buttonType: 'outline'
        },
        {
            name: 'Pro',
            price: '19.99',
            period: 'month',
            features: [
                'Advanced career assessment',
                'Full AI recommendations',
                'Advanced profile management',
                'Premium CV templates',
                'AI Career Coach',
                'Interview Preparation',
                'Million Dollar Ideas',
                'Portfolio Builder',
                'Learning Dashboard',
                'Career Timeline'
            ],
            excluded: [
                'Job Corner',
                'Connections'
            ],
            buttonText: 'Upgrade to Pro',
            buttonType: 'primary',
            popular: true
        },
        {
            name: 'Enterprise',
            price: '49.99',
            period: 'month',
            features: [
                'All Pro features',
                'Job Corner',
                'Connections',
                'Priority support',
                'Custom integrations',
                'Team management',
                'Advanced analytics',
                'API access'
            ],
            excluded: [],
            buttonText: 'Contact Sales',
            buttonType: 'primary'
        }
    ];

    return (
        <div className="pricing-table">
            <div className="row">
                {plans.map((plan, index) => (
                    <div key={index} className="col-md-4 mb-4">
                        <Card 
                            className={`h-100 ${plan.popular ? 'border-primary' : ''}`}
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
                                <small className="text-muted">per {plan.period}</small>
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

                            {plan.excluded.length > 0 && (
                                <List
                                    size="small"
                                    dataSource={plan.excluded}
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
                                <Button 
                                    type={plan.buttonType}
                                    size="large"
                                    className="w-100"
                                >
                                    {plan.buttonText}
                                </Button>
                            </div>
                        </Card>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PricingTable; 