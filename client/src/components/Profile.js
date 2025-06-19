import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CVUpgrade from './CVUpgrade';
import AssessmentHistory from './AssessmentHistory';
import config from '../config';
import sqliteService from '../services/SQLiteService';

function Profile() {
    const [reports, setReports] = useState([]);
    const [localReports, setLocalReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('profile');
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }
        fetchUserData();
        fetchReports();
        loadLocalReports();
    }, [navigate]);

    const fetchUserData = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${config.API_URL}/auth/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch user data');
            }

            const data = await response.json();
            setUser(data.user);
        } catch (error) {
            console.error('Error fetching user data:', error);
            // Don't show error for user data, just use null
        }
    };

    const fetchReports = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${config.API_URL}/api/reports`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                // For any error, just set empty reports
                console.warn(`Server returned error: ${response.status}`);
                setReports([]);
            } else {
                const data = await response.json();
                setReports(data.reports || []);
            }
        } catch (error) {
            // For network errors, just set empty reports
            console.error('Error fetching reports:', error);
            setReports([]);
            // Don't set error message for network issues, just show empty state
        } finally {
            setLoading(false);
        }
    };

    // Load reports from SQLite
    const loadLocalReports = async () => {
        try {
            const results = await sqliteService.getQuizResults();
            // Sort by timestamp, newest first
            results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            setLocalReports(results);
        } catch (error) {
            console.error('Error loading local reports:', error);
            setLocalReports([]);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Combine server reports and local reports for display
    const allReports = [...reports, ...localReports.filter(lr => 
        // Only include local reports that don't have a matching server report
        !reports.some(r => r.id === lr.reportId)
    )];

    if (loading) {
        return (
            <div className="container mt-5 text-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="container mt-5">
            <div className="row">
                {/* Sidebar */}
                <div className="col-md-3 mb-4">
                    <div className="card shadow-sm">
                        <div className="card-body text-center">
                            <div className="mb-3">
                                <div className="display-1 text-primary mb-3">
                                    <i className="bi bi-person-circle"></i>
                                </div>
                                <h2 className="h4 mb-2">{user?.username || 'User'}</h2>
                                <p className="text-muted mb-3">Member since {user?.created_at ? formatDate(user.created_at) : 'N/A'}</p>
                            </div>
                            <div className="d-grid gap-2">
                                <button 
                                    className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setActiveTab('profile')}
                                >
                                    <i className="bi bi-person me-2"></i>
                                    Profile
                                </button>
                                <button 
                                    className={`btn ${activeTab === 'assessments' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setActiveTab('assessments')}
                                >
                                    <i className="bi bi-clipboard-data me-2"></i>
                                    Assessments
                                </button>
                                <button 
                                    className={`btn ${activeTab === 'cv' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setActiveTab('cv')}
                                >
                                    <i className="bi bi-file-earmark-text me-2"></i>
                                    CV Manager
                                </button>
                                <Link to="/quiz" className="btn btn-success">
                                    <i className="bi bi-plus-circle me-2"></i>
                                    Take New Assessment
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="col-md-9">
                    {/* Profile Tab */}
                    {activeTab === 'profile' && (
                        <div className="card shadow-sm">
                            <div className="card-body">
                                <h3 className="h5 mb-4">User Profile</h3>
                                <div className="row mb-4">
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label text-muted">Username</label>
                                            <div className="form-control">{user?.username || 'N/A'}</div>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label text-muted">Email</label>
                                            <div className="form-control">{user?.email || 'N/A'}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="row mb-4">
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label text-muted">Member Since</label>
                                            <div className="form-control">{user?.created_at ? formatDate(user.created_at) : 'N/A'}</div>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label text-muted">Assessments Completed</label>
                                            <div className="form-control">{reports.length}</div>
                                        </div>
                                    </div>
                                </div>

                                <button className="btn btn-primary">
                                    <i className="bi bi-pencil-square me-2"></i>
                                    Edit Profile
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Assessments Tab */}
                    {activeTab === 'assessments' && (
                        <div className="card shadow-sm">
                            <div className="card-body">
                                <h3 className="h5 mb-4">Assessment History</h3>
                                {error && (
                                    <div className="alert alert-danger" role="alert">
                                        {error}
                                    </div>
                                )}
                                
                                {/* Add the AssessmentHistory component */}
                                <AssessmentHistory />
                                
                                {allReports.length === 0 ? (
                                    <div className="text-center py-5">
                                        <div className="display-6 text-muted mb-3">
                                            <i className="bi bi-clipboard-data"></i>
                                        </div>
                                        <h4>No Assessments Yet</h4>
                                        <p className="text-muted">Take your first career assessment to get started!</p>
                                        <Link to="/quiz" className="btn btn-primary">
                                            Start Assessment
                                        </Link>
                                    </div>
                                ) : (
                                    <>
                                        <div className="list-group mb-4">
                                            {allReports.map((report) => {
                                                // Determine if this is a server report or local report
                                                const isServerReport = reports.some(r => r.id === report.id);
                                                const reportScore = isServerReport ? report.score : 
                                                    (report.recommendations?.score_analysis?.overall_score || 0);
                                                const reportCareer = isServerReport ? report.career : 
                                                    (report.career || 'Unknown Career');
                                                const reportExperience = isServerReport ? report.experience : 
                                                    (report.experience || '0');
                                                const reportTimestamp = isServerReport ? report.timestamp : 
                                                    (report.timestamp || new Date().toISOString());
                                                
                                                return (
                                                    <div key={report.id} className="list-group-item list-group-item-action">
                                                        <div className="d-flex w-100 justify-content-between align-items-center">
                                                            <h5 className="mb-1">{reportCareer}</h5>
                                                            <small className="text-muted">{formatDate(reportTimestamp)}</small>
                                                        </div>
                                                        <div className="d-flex justify-content-between align-items-center">
                                                            <div className="d-flex align-items-center">
                                                                <span className="badge bg-primary me-2">{reportExperience} years</span>
                                                                <div className="progress flex-grow-1 me-2" style={{ width: '100px', height: '8px' }}>
                                                                    <div
                                                                        className="progress-bar"
                                                                        role="progressbar"
                                                                        style={{ width: `${reportScore}%` }}
                                                                        aria-valuenow={reportScore}
                                                                        aria-valuemin="0"
                                                                        aria-valuemax="100"
                                                                    ></div>
                                                                </div>
                                                                <span className="text-muted small">{reportScore}%</span>
                                                            </div>
                                                            <div>
                                                                <Link 
                                                                    to={`/results`}
                                                                    className="btn btn-sm btn-outline-primary me-2"
                                                                    onClick={async () => {
                                                                        // Store the report data in SQLite as current result
                                                                        await sqliteService.saveCurrentResult(report);
                                                                    }}
                                                                >
                                                                    <i className="bi bi-eye me-1"></i>
                                                                    View Results
                                                                </Link>
                                                                <button 
                                                                    className="btn btn-sm btn-outline-secondary"
                                                                    onClick={() => window.print()}
                                                                >
                                                                    <i className="bi bi-printer"></i>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Statistics Section */}
                                        <div className="card mb-4">
                                            <div className="card-body">
                                                <h4 className="h6 mb-3">Assessment Statistics</h4>
                                                <div className="row g-4">
                                                    <div className="col-md-3">
                                                        <div className="border rounded p-3 text-center">
                                                            <div className="display-6 text-primary mb-2">
                                                                {allReports.length}
                                                            </div>
                                                            <div className="text-muted">Total Assessments</div>
                                                        </div>
                                                    </div>
                                                    <div className="col-md-3">
                                                        <div className="border rounded p-3 text-center">
                                                            <div className="display-6 text-success mb-2">
                                                                {Math.max(...allReports.map(r => 
                                                                    reports.some(sr => sr.id === r.id) ? 
                                                                        r.score : 
                                                                        (r.recommendations?.score_analysis?.overall_score || 0)
                                                                ))}%
                                                            </div>
                                                            <div className="text-muted">Highest Score</div>
                                                        </div>
                                                    </div>
                                                    <div className="col-md-3">
                                                        <div className="border rounded p-3 text-center">
                                                            <div className="display-6 text-info mb-2">
                                                                {Math.round(allReports.reduce((acc, r) => 
                                                                    acc + (reports.some(sr => sr.id === r.id) ? 
                                                                        r.score : 
                                                                        (r.recommendations?.score_analysis?.overall_score || 0)), 0
                                                                ) / allReports.length)}%
                                                            </div>
                                                            <div className="text-muted">Average Score</div>
                                                        </div>
                                                    </div>
                                                    <div className="col-md-3">
                                                        <div className="border rounded p-3 text-center">
                                                            <div className="display-6 text-warning mb-2">
                                                                {new Set(allReports.map(r => 
                                                                    reports.some(sr => sr.id === r.id) ? 
                                                                        r.career : 
                                                                        (r.career || 'Unknown')
                                                                )).size}
                                                            </div>
                                                            <div className="text-muted">Unique Careers</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* CV Manager Tab */}
                    {activeTab === 'cv' && (
                        <div className="card shadow-sm">
                            <div className="card-body">
                                <h3 className="h5 mb-4">CV Manager</h3>
                                <CVUpgrade />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Profile;