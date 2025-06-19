import React, { useState, useEffect } from 'react';
import config from '../config';
import SaveButton from './common/SaveButton';
import LoginRequired from './common/LoginRequired';
import DataService from '../services/DataService';

function Portfolio() {
    const [portfolioData, setPortfolioData] = useState({
        basics: {
            name: '',
            title: '',
            summary: '',
            email: '',
            phone: '',
            location: '',
            website: '',
            linkedin: '',
            github: ''
        },
        experience: [],
        education: [],
        skills: [],
        projects: [],
        certifications: [],
        awards: []
    });
    const [activeSection, setActiveSection] = useState('basics');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [previewMode, setPreviewMode] = useState(false);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
    const [saveStatus, setSaveStatus] = useState('');

    useEffect(() => {
        fetchPortfolioData();
    }, []);

    const fetchPortfolioData = async () => {
        try {
            setLoading(true);
            
            // Try to get data from the DataService
            const result = await DataService.getData('portfolio');
            if (result && result.data) {
                setPortfolioData(result.data);
            }
            
            setLoading(false);
        } catch (error) {
            console.error('Error fetching portfolio data:', error);
            
            // If authentication is required, show login prompt
            if (error.message === 'Authentication required') {
                setShowLoginPrompt(true);
            } else {
                setError('Failed to load portfolio data. Please try again later.');
            }
            
            setLoading(false);
        }
    };

    const handleBasicsChange = (field, value) => {
        setPortfolioData({
            ...portfolioData,
            basics: {
                ...portfolioData.basics,
                [field]: value
            }
        });
    };

    const handleArrayItemAdd = (section, item) => {
        setPortfolioData({
            ...portfolioData,
            [section]: [...portfolioData[section], item]
        });
    };

    const handleArrayItemDelete = (section, index) => {
        setPortfolioData({
            ...portfolioData,
            [section]: portfolioData[section].filter((_, i) => i !== index)
        });
    };

    const handleArrayItemEdit = (section, index, updatedItem) => {
        setPortfolioData({
            ...portfolioData,
            [section]: portfolioData[section].map((item, i) => i === index ? updatedItem : item)
        });
    };

    const handleSaveSuccess = (result) => {
        setSaveStatus('Portfolio saved successfully!');
        setTimeout(() => setSaveStatus(''), 3000);
    };

    const handleSaveError = (error) => {
        if (error.message === 'Authentication required') {
            setShowLoginPrompt(true);
        } else {
            setSaveStatus('Failed to save portfolio. Please try again.');
            setTimeout(() => setSaveStatus(''), 3000);
        }
    };

    const exportPortfolio = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${config.API_URL}/api/portfolio/export`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to export portfolio');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'portfolio.html';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting portfolio:', error);
            setError('Failed to export portfolio');
        }
    };

    if (showLoginPrompt) {
        return (
            <LoginRequired 
                message="You need to be logged in to access your portfolio."
                returnPath="/portfolio"
            />
        );
    }

    if (loading) {
        return (
            <div className="container mt-5 text-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-3">Loading your portfolio...</p>
            </div>
        );
    }

    return (
        <div className="container mt-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1>Portfolio Builder</h1>
                <div className="d-flex">
                    <SaveButton 
                        componentType="portfolio"
                        data={portfolioData}
                        onSaveSuccess={handleSaveSuccess}
                        onSaveError={handleSaveError}
                        className="me-2"
                    />
                    <button 
                        className="btn btn-outline-primary me-2"
                        onClick={() => setPreviewMode(!previewMode)}
                    >
                        {previewMode ? 'Edit Mode' : 'Preview Mode'}
                    </button>
                    <button 
                        className="btn btn-outline-secondary"
                        onClick={exportPortfolio}
                    >
                        Export
                    </button>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}

            {saveStatus && (
                <div className={`alert ${saveStatus.includes('success') ? 'alert-success' : 'alert-danger'}`} role="alert">
                    {saveStatus}
                </div>
            )}

            <div className="row">
                <div className="col-md-3">
                    <div className="card shadow-sm mb-4">
                        <div className="card-body">
                            <h3 className="h5 mb-3">Portfolio Builder</h3>
                            <div className="d-grid gap-2">
                                <button
                                    className={`btn ${activeSection === 'basics' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setActiveSection('basics')}
                                >
                                    <i className="bi bi-person-circle me-2"></i>
                                    Basic Info
                                </button>
                                <button
                                    className={`btn ${activeSection === 'experience' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setActiveSection('experience')}
                                >
                                    <i className="bi bi-briefcase me-2"></i>
                                    Experience
                                </button>
                                <button
                                    className={`btn ${activeSection === 'education' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setActiveSection('education')}
                                >
                                    <i className="bi bi-mortarboard me-2"></i>
                                    Education
                                </button>
                                <button
                                    className={`btn ${activeSection === 'skills' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setActiveSection('skills')}
                                >
                                    <i className="bi bi-tools me-2"></i>
                                    Skills
                                </button>
                                <button
                                    className={`btn ${activeSection === 'projects' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setActiveSection('projects')}
                                >
                                    <i className="bi bi-folder me-2"></i>
                                    Projects
                                </button>
                                <button
                                    className={`btn ${activeSection === 'certifications' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setActiveSection('certifications')}
                                >
                                    <i className="bi bi-patch-check me-2"></i>
                                    Certifications
                                </button>
                                <button
                                    className={`btn ${activeSection === 'awards' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setActiveSection('awards')}
                                >
                                    <i className="bi bi-trophy me-2"></i>
                                    Awards
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="col-md-9">
                    <div className="card shadow-sm">
                        <div className="card-body">
                            {activeSection === 'basics' && (
                                <div>
                                    <h4 className="mb-4">Basic Information</h4>
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <label className="form-label">Full Name</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={portfolioData.basics.name}
                                                onChange={(e) => handleBasicsChange('name', e.target.value)}
                                                disabled={previewMode}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Professional Title</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={portfolioData.basics.title}
                                                onChange={(e) => handleBasicsChange('title', e.target.value)}
                                                disabled={previewMode}
                                            />
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label">Professional Summary</label>
                                            <textarea
                                                className="form-control"
                                                rows="4"
                                                value={portfolioData.basics.summary}
                                                onChange={(e) => handleBasicsChange('summary', e.target.value)}
                                                disabled={previewMode}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Email</label>
                                            <input
                                                type="email"
                                                className="form-control"
                                                value={portfolioData.basics.email}
                                                onChange={(e) => handleBasicsChange('email', e.target.value)}
                                                disabled={previewMode}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Phone</label>
                                            <input
                                                type="tel"
                                                className="form-control"
                                                value={portfolioData.basics.phone}
                                                onChange={(e) => handleBasicsChange('phone', e.target.value)}
                                                disabled={previewMode}
                                            />
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label">Location</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={portfolioData.basics.location}
                                                onChange={(e) => handleBasicsChange('location', e.target.value)}
                                                disabled={previewMode}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Website</label>
                                            <input
                                                type="url"
                                                className="form-control"
                                                value={portfolioData.basics.website}
                                                onChange={(e) => handleBasicsChange('website', e.target.value)}
                                                disabled={previewMode}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">LinkedIn</label>
                                            <input
                                                type="url"
                                                className="form-control"
                                                value={portfolioData.basics.linkedin}
                                                onChange={(e) => handleBasicsChange('linkedin', e.target.value)}
                                                disabled={previewMode}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">GitHub</label>
                                            <input
                                                type="url"
                                                className="form-control"
                                                value={portfolioData.basics.github}
                                                onChange={(e) => handleBasicsChange('github', e.target.value)}
                                                disabled={previewMode}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeSection === 'experience' && (
                                <div>
                                    <div className="d-flex justify-content-between align-items-center mb-4">
                                        <h4>Professional Experience</h4>
                                        {!previewMode && (
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={() => handleArrayItemAdd('experience', {
                                                    company: '',
                                                    position: '',
                                                    startDate: '',
                                                    endDate: '',
                                                    current: false,
                                                    description: '',
                                                    achievements: []
                                                })}
                                            >
                                                <i className="bi bi-plus-lg me-2"></i>
                                                Add Experience
                                            </button>
                                        )}
                                    </div>
                                    
                                    {portfolioData.experience.map((exp, index) => (
                                        <div key={index} className="card mb-3">
                                            <div className="card-body">
                                                <div className="row g-3">
                                                    <div className="col-md-6">
                                                        <label className="form-label">Company</label>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            value={exp.company}
                                                            onChange={(e) => handleArrayItemEdit('experience', index, {
                                                                ...exp,
                                                                company: e.target.value
                                                            })}
                                                            disabled={previewMode}
                                                        />
                                                    </div>
                                                    <div className="col-md-6">
                                                        <label className="form-label">Position</label>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            value={exp.position}
                                                            onChange={(e) => handleArrayItemEdit('experience', index, {
                                                                ...exp,
                                                                position: e.target.value
                                                            })}
                                                            disabled={previewMode}
                                                        />
                                                    </div>
                                                    <div className="col-md-5">
                                                        <label className="form-label">Start Date</label>
                                                        <input
                                                            type="date"
                                                            className="form-control"
                                                            value={exp.startDate}
                                                            onChange={(e) => handleArrayItemEdit('experience', index, {
                                                                ...exp,
                                                                startDate: e.target.value
                                                            })}
                                                            disabled={previewMode}
                                                        />
                                                    </div>
                                                    <div className="col-md-5">
                                                        <label className="form-label">End Date</label>
                                                        <input
                                                            type="date"
                                                            className="form-control"
                                                            value={exp.endDate}
                                                            onChange={(e) => handleArrayItemEdit('experience', index, {
                                                                ...exp,
                                                                endDate: e.target.value
                                                            })}
                                                            disabled={previewMode || exp.current}
                                                        />
                                                    </div>
                                                    <div className="col-md-2">
                                                        <div className="form-check mt-4">
                                                            <input
                                                                type="checkbox"
                                                                className="form-check-input"
                                                                checked={exp.current}
                                                                onChange={(e) => handleArrayItemEdit('experience', index, {
                                                                    ...exp,
                                                                    current: e.target.checked
                                                                })}
                                                                disabled={previewMode}
                                                            />
                                                            <label className="form-check-label">Current</label>
                                                        </div>
                                                    </div>
                                                    <div className="col-12">
                                                        <label className="form-label">Description</label>
                                                        <textarea
                                                            className="form-control"
                                                            rows="3"
                                                            value={exp.description}
                                                            onChange={(e) => handleArrayItemEdit('experience', index, {
                                                                ...exp,
                                                                description: e.target.value
                                                            })}
                                                            disabled={previewMode}
                                                        />
                                                    </div>
                                                    <div className="col-12">
                                                        <label className="form-label">Achievements</label>
                                                        {exp.achievements.map((achievement, achievementIndex) => (
                                                            <div key={achievementIndex} className="input-group mb-2">
                                                                <input
                                                                    type="text"
                                                                    className="form-control"
                                                                    value={achievement}
                                                                    onChange={(e) => {
                                                                        const newAchievements = [...exp.achievements];
                                                                        newAchievements[achievementIndex] = e.target.value;
                                                                        handleArrayItemEdit('experience', index, {
                                                                            ...exp,
                                                                            achievements: newAchievements
                                                                        });
                                                                    }}
                                                                    disabled={previewMode}
                                                                />
                                                                {!previewMode && (
                                                                    <button
                                                                        className="btn btn-outline-danger"
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const newAchievements = exp.achievements.filter((_, i) => i !== achievementIndex);
                                                                            handleArrayItemEdit('experience', index, {
                                                                                ...exp,
                                                                                achievements: newAchievements
                                                                            });
                                                                        }}
                                                                    >
                                                                        <i className="bi bi-trash"></i>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                        {!previewMode && (
                                                            <button
                                                                className="btn btn-outline-secondary btn-sm"
                                                                onClick={() => {
                                                                    handleArrayItemEdit('experience', index, {
                                                                        ...exp,
                                                                        achievements: [...exp.achievements, '']
                                                                    });
                                                                }}
                                                            >
                                                                <i className="bi bi-plus-lg me-2"></i>
                                                                Add Achievement
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                {!previewMode && (
                                                    <div className="mt-3">
                                                        <button
                                                            className="btn btn-outline-danger btn-sm"
                                                            onClick={() => handleArrayItemDelete('experience', index)}
                                                        >
                                                            <i className="bi bi-trash me-2"></i>
                                                            Delete Experience
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Similar sections for education, skills, projects, certifications, and awards */}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Portfolio; 