import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Progress, Timeline, Typography, Space } from 'antd';
import { 
    CheckCircleOutlined, 
    ClockCircleOutlined,
    FileTextOutlined,
    BarChartOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;

const AssessmentHistory = () => {
    const [assessments, setAssessments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchAssessmentHistory();
    }, []);

    const fetchAssessmentHistory = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/assessments/history');
            setAssessments(response.data);
            setError(null);
        } catch (err) {
            setError('Failed to load assessment history');
            console.error('Error fetching assessment history:', err);
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            title: 'Assessment',
            dataIndex: 'assessment_name',
            key: 'assessment_name',
            render: (text) => (
                <Space>
                    <FileTextOutlined />
                    <span>{text}</span>
                </Space>
            ),
        },
        {
            title: 'Date',
            dataIndex: 'completed_at',
            key: 'completed_at',
            render: (date) => new Date(date).toLocaleDateString(),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => (
                <Tag color={status === 'completed' ? 'success' : 'processing'}>
                    {status === 'completed' ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                </Tag>
            ),
        },
        {
            title: 'Score',
            dataIndex: 'score',
            key: 'score',
            render: (score) => (
                <Progress 
                    percent={score} 
                    size="small" 
                    status={score >= 70 ? 'success' : score >= 50 ? 'normal' : 'exception'}
                />
            ),
        },
        {
            title: 'Details',
            key: 'details',
            render: (_, record) => (
                <Space>
                    <Tag icon={<BarChartOutlined />} color="blue">
                        {record.skills_assessed} skills
                    </Tag>
                </Space>
            ),
        },
    ];

    if (loading) {
        return <div>Loading assessment history...</div>;
    }

    if (error) {
        return <div className="error-message">{error}</div>;
    }

    return (
        <div className="assessment-history">
            <Card>
                <Title level={4}>Assessment History</Title>
                <Table 
                    columns={columns} 
                    dataSource={assessments} 
                    rowKey="id"
                    pagination={{ pageSize: 5 }}
                />
            </Card>
        </div>
    );
};

export default AssessmentHistory; 