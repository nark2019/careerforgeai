import React, { useState, useEffect } from 'react';
import config from '../config';

function LearningDashboard() {
    const [dashboardData, setDashboardData] = useState({
        currentCourses: [],
        completedCourses: [],
        learningPath: {},
        skills: [],
        certificates: [],
        goals: [],
        progress: {}
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${config.API_URL}/api/learning-dashboard`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch dashboard data');
            }

            const data = await response.json();
            setDashboardData(data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setError('Failed to load dashboard data. Please try again later.');
            setLoading(false);
        }
    };

    const updateProgress = async (courseId, progress) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${config.API_URL}/api/learning-dashboard/progress`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ courseId, progress })
            });

            if (!response.ok) {
                throw new Error('Failed to update progress');
            }

            // Refresh dashboard data
            fetchDashboardData();
        } catch (error) {
            console.error('Error updating progress:', error);
            setError('Failed to update progress. Please try again.');
        }
    };

    const addGoal = async (goal) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${config.API_URL}/api/learning-dashboard/goals`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(goal)
            });

            if (!response.ok) {
                throw new Error('Failed to add goal');
            }

            // Refresh dashboard data
            fetchDashboardData();
        } catch (error) {
            console.error('Error adding goal:', error);
            setError('Failed to add goal. Please try again.');
        }
    };

    if (loading) {
        return (
            <div className="container py-5 text-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-3">Loading your learning dashboard...</p>
            </div>
        );
    }

    return (
        <div className="container py-5">
            {error && (
                <div className="alert alert-danger alert-dismissible fade show" role="alert">
                    {error}
                    <button type="button" className="btn-close" onClick={() => setError('')}></button>
                </div>
            )}

            <div className="row">
                <div className="col-md-3">
                    <div className="card shadow-sm mb-4">
                        <div className="card-body">
                            <h3 className="h5 mb-3">Learning Dashboard</h3>
                            <div className="d-grid gap-2">
                                <button
                                    className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setActiveTab('overview')}
                                >
                                    <i className="bi bi-grid me-2"></i>
                                    Overview
                                </button>
                                <button
                                    className={`btn ${activeTab === 'courses' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setActiveTab('courses')}
                                >
                                    <i className="bi bi-book me-2"></i>
                                    My Courses
                                </button>
                                <button
                                    className={`btn ${activeTab === 'skills' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setActiveTab('skills')}
                                >
                                    <i className="bi bi-lightning me-2"></i>
                                    Skills Tracker
                                </button>
                                <button
                                    className={`btn ${activeTab === 'certificates' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setActiveTab('certificates')}
                                >
                                    <i className="bi bi-award me-2"></i>
                                    Certificates
                                </button>
                                <button
                                    className={`btn ${activeTab === 'goals' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setActiveTab('goals')}
                                >
                                    <i className="bi bi-flag me-2"></i>
                                    Learning Goals
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="card shadow-sm">
                        <div className="card-body">
                            <h4 className="h6 mb-3">Quick Stats</h4>
                            <div className="d-flex justify-content-between mb-2">
                                <span>Courses in Progress:</span>
                                <span className="badge bg-primary">{dashboardData.currentCourses.length}</span>
                            </div>
                            <div className="d-flex justify-content-between mb-2">
                                <span>Completed Courses:</span>
                                <span className="badge bg-success">{dashboardData.completedCourses.length}</span>
                            </div>
                            <div className="d-flex justify-content-between mb-2">
                                <span>Certificates Earned:</span>
                                <span className="badge bg-info">{dashboardData.certificates.length}</span>
                            </div>
                            <div className="d-flex justify-content-between">
                                <span>Active Goals:</span>
                                <span className="badge bg-warning">{dashboardData.goals.length}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-md-9">
                    <div className="card shadow-sm">
                        <div className="card-body">
                            {activeTab === 'overview' && (
                                <div>
                                    <h4 className="mb-4">Learning Overview</h4>
                                    
                                    <div className="row mb-4">
                                        <div className="col-md-6">
                                            <div className="card">
                                                <div className="card-body">
                                                    <h5 className="card-title h6">Current Focus</h5>
                                                    <p className="card-text">
                                                        {dashboardData.learningPath.currentFocus || 'No current focus set'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="card">
                                                <div className="card-body">
                                                    <h5 className="card-title h6">Next Milestone</h5>
                                                    <p className="card-text">
                                                        {dashboardData.learningPath.nextMilestone || 'No milestone set'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <h5 className="mb-3">Recent Activity</h5>
                                    <div className="list-group">
                                        {dashboardData.currentCourses.slice(0, 3).map((course, index) => (
                                            <div key={index} className="list-group-item">
                                                <div className="d-flex w-100 justify-content-between">
                                                    <h6 className="mb-1">{course.title}</h6>
                                                    <small>{course.lastAccessed}</small>
                                                </div>
                                                <div className="progress" style={{ height: '5px' }}>
                                                    <div
                                                        className="progress-bar"
                                                        role="progressbar"
                                                        style={{ width: `${course.progress}%` }}
                                                        aria-valuenow={course.progress}
                                                        aria-valuemin="0"
                                                        aria-valuemax="100"
                                                    />
                                                </div>
                                                <small className="text-muted">{course.progress}% complete</small>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Add other tab content components here */}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LearningDashboard; 