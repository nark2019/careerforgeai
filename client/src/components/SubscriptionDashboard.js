import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Statistic, Progress, Alert } from 'antd';
import { 
    DollarOutlined, 
    UserOutlined, 
    CheckCircleOutlined, 
    CloseCircleOutlined,
    BarChartOutlined,
    HistoryOutlined,
    SettingOutlined
} from '@ant-design/icons';
import axios from 'axios';

const SubscriptionDashboard = () => {
    const [overview, setOverview] = useState(null);
    const [plans, setPlans] = useState([]);
    const [history, setHistory] = useState([]);
    const [features, setFeatures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [overviewRes, plansRes, historyRes, featuresRes] = await Promise.all([
                axios.get('/api/subscription/analytics/overview'),
                axios.get('/api/subscription/analytics/plans'),
                axios.get('/api/subscription/analytics/history'),
                axios.get('/api/subscription/analytics/features')
            ]);

            setOverview(overviewRes.data);
            setPlans(plansRes.data);
            setHistory(historyRes.data);
            setFeatures(featuresRes.data);
            setError(null);
        } catch (err) {
            setError('Failed to load subscription data');
            console.error('Error fetching subscription data:', err);
        } finally {
            setLoading(false);
        }
    };

    const historyColumns = [
        {
            title: 'Plan',
            dataIndex: 'plan_name',
            key: 'plan_name',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => (
                <span style={{ color: status === 'active' ? '#52c41a' : '#ff4d4f' }}>
                    {status === 'active' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
            ),
        },
        {
            title: 'Price',
            dataIndex: 'price',
            key: 'price',
            render: (price) => `$${price.toFixed(2)}`,
        },
        {
            title: 'Billing Cycle',
            dataIndex: 'billing_cycle',
            key: 'billing_cycle',
        },
        {
            title: 'Start Date',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (date) => new Date(date).toLocaleDateString(),
        },
    ];

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <Alert message={error} type="error" showIcon />;
    }

    return (
        <div className="subscription-dashboard">
            <h1>Subscription Management Dashboard</h1>
            
            <Row gutter={[16, 16]}>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Total Subscribers"
                            value={overview.total_subscribers}
                            prefix={<UserOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Active Subscribers"
                            value={overview.active_subscribers}
                            prefix={<CheckCircleOutlined />}
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Cancelled Subscribers"
                            value={overview.cancelled_subscribers}
                            prefix={<CloseCircleOutlined />}
                            valueStyle={{ color: '#ff4d4f' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Average Revenue"
                            value={overview.average_revenue}
                            prefix={<DollarOutlined />}
                            precision={2}
                        />
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
                <Col span={12}>
                    <Card title="Plan Distribution" extra={<BarChartOutlined />}>
                        {plans.map(plan => (
                            <div key={plan.plan_name} style={{ marginBottom: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span>{plan.plan_name}</span>
                                    <span>{plan.subscriber_count} subscribers</span>
                                </div>
                                <Progress 
                                    percent={(plan.subscriber_count / overview.total_subscribers) * 100} 
                                    status="active"
                                />
                            </div>
                        ))}
                    </Card>
                </Col>
                <Col span={12}>
                    <Card title="Feature Usage" extra={<SettingOutlined />}>
                        {features.map(feature => (
                            <div key={feature.feature_name} style={{ marginBottom: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span>{feature.feature_name}</span>
                                    <span>{feature.usage_count} uses</span>
                                </div>
                                <Progress 
                                    percent={(feature.usage_count / overview.active_subscribers) * 100} 
                                    status="active"
                                />
                            </div>
                        ))}
                    </Card>
                </Col>
            </Row>

            <Card 
                title="Subscription History" 
                extra={<HistoryOutlined />}
                style={{ marginTop: '24px' }}
            >
                <Table 
                    columns={historyColumns} 
                    dataSource={history} 
                    rowKey="id"
                    pagination={{ pageSize: 5 }}
                />
            </Card>
        </div>
    );
};

export default SubscriptionDashboard; 