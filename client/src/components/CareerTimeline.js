import React, { useState, useEffect } from 'react';
import config from '../config';

function CareerTimeline() {
    const [timelineData, setTimelineData] = useState({
        milestones: [],
        goals: [],
        achievements: [],
        projections: {}
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeView, setActiveView] = useState('timeline');

    useEffect(() => {
        fetchTimelineData();
    }, []);

    const fetchTimelineData = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${config.API_URL}/api/career-timeline`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch timeline data');
            }

            const data = await response.json();
            setTimelineData(data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching timeline data:', error);
            setError('Failed to load timeline data. Please try again later.');
            setLoading(false);
        }
    };

    const addMilestone = async (milestone) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${config.API_URL}/api/career-timeline/milestones`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(milestone)
            });

            if (!response.ok) {
                throw new Error('Failed to add milestone');
            }

            // Refresh timeline data
            fetchTimelineData();
        } catch (error) {
            console.error('Error adding milestone:', error);
            setError('Failed to add milestone. Please try again.');
        }
    };

    const updateMilestone = async (id, updates) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${config.API_URL}/api/career-timeline/milestones/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updates)
            });

            if (!response.ok) {
                throw new Error('Failed to update milestone');
            }

            // Refresh timeline data
            fetchTimelineData();
        } catch (error) {
            console.error('Error updating milestone:', error);
            setError('Failed to update milestone. Please try again.');
        }
    };

    if (loading) {
        return (
            <div className="container py-5 text-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-3">Loading your career timeline...</p>
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
                            <h3 className="h5 mb-3">Career Timeline</h3>
                            <div className="d-grid gap-2">
                                <button
                                    className={`btn ${activeView === 'timeline' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setActiveView('timeline')}
                                >
                                    <i className="bi bi-calendar-range me-2"></i>
                                    Timeline View
                                </button>
                                <button
                                    className={`btn ${activeView === 'milestones' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setActiveView('milestones')}
                                >
                                    <i className="bi bi-flag me-2"></i>
                                    Milestones
                                </button>
                                <button
                                    className={`btn ${activeView === 'goals' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setActiveView('goals')}
                                >
                                    <i className="bi bi-bullseye me-2"></i>
                                    Career Goals
                                </button>
                                <button
                                    className={`btn ${activeView === 'achievements' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setActiveView('achievements')}
                                >
                                    <i className="bi bi-trophy me-2"></i>
                                    Achievements
                                </button>
                                <button
                                    className={`btn ${activeView === 'projections' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setActiveView('projections')}
                                >
                                    <i className="bi bi-graph-up me-2"></i>
                                    Career Projections
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="card shadow-sm">
                        <div className="card-body">
                            <h4 className="h6 mb-3">Timeline Stats</h4>
                            <div className="d-flex justify-content-between mb-2">
                                <span>Total Milestones:</span>
                                <span className="badge bg-primary">{timelineData.milestones.length}</span>
                            </div>
                            <div className="d-flex justify-content-between mb-2">
                                <span>Active Goals:</span>
                                <span className="badge bg-success">{timelineData.goals.length}</span>
                            </div>
                            <div className="d-flex justify-content-between">
                                <span>Achievements:</span>
                                <span className="badge bg-info">{timelineData.achievements.length}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-md-9">
                    <div className="card shadow-sm">
                        <div className="card-body">
                            {activeView === 'timeline' && (
                                <div>
                                    <h4 className="mb-4">Career Journey Timeline</h4>
                                    <div className="timeline">
                                        {timelineData.milestones.map((milestone, index) => (
                                            <div key={index} className="timeline-item">
                                                <div className="timeline-date">
                                                    {new Date(milestone.date).toLocaleDateString()}
                                                </div>
                                                <div className="timeline-content">
                                                    <h5 className="h6">{milestone.title}</h5>
                                                    <p>{milestone.description}</p>
                                                    {milestone.achievements && (
                                                        <div className="timeline-achievements">
                                                            {milestone.achievements.map((achievement, i) => (
                                                                <span key={i} className="badge bg-success me-2">
                                                                    {achievement}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Add other view components here */}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CareerTimeline; 