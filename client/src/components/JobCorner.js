import React, { useState, useEffect } from 'react';
import config from '../config';

function JobCorner({ career = '', experience = '' }) {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({
        location: 'All',
        jobType: 'All',
        experienceLevel: experience || 'All'
    });
    const [savedJobs, setSavedJobs] = useState([]);

    useEffect(() => {
        fetchJobs();
        // Load saved jobs from localStorage
        const saved = JSON.parse(localStorage.getItem('savedJobs') || '[]');
        setSavedJobs(saved);
    }, [career, filters]);

    const fetchJobs = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${config.API_URL}/api/jobs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ career, experience, ...filters })
            });

            if (!response.ok) {
                throw new Error('Failed to fetch jobs');
            }

            const data = await response.json();
            setJobs(data.jobs || []);
        } catch (error) {
            console.error('Error fetching jobs:', error);
            setError('Failed to load job listings. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const toggleSaveJob = (jobId) => {
        setSavedJobs(prev => {
            const newSavedJobs = prev.includes(jobId)
                ? prev.filter(id => id !== jobId)
                : [...prev, jobId];
            
            // Save to localStorage
            localStorage.setItem('savedJobs', JSON.stringify(newSavedJobs));
            return newSavedJobs;
        });
    };

    if (loading) {
        return (
            <div className="job-corner-container p-4">
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading jobs...</span>
                    </div>
                    <p className="mt-3 text-muted">Finding the best opportunities for you...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="job-corner-container p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="h4 mb-1">Job Opportunities</h2>
                    <p className="text-muted mb-0">
                        {jobs.length} positions available
                    </p>
                </div>
                <div className="d-flex gap-3">
                    <select 
                        className="form-select form-select-sm"
                        value={filters.location}
                        onChange={(e) => handleFilterChange('location', e.target.value)}
                    >
                        <option value="All">All Locations</option>
                        <option value="Remote">Remote</option>
                        <option value="Hybrid">Hybrid</option>
                        <option value="On-site">On-site</option>
                    </select>
                    <select 
                        className="form-select form-select-sm"
                        value={filters.jobType}
                        onChange={(e) => handleFilterChange('jobType', e.target.value)}
                    >
                        <option value="All">All Types</option>
                        <option value="Full-time">Full-time</option>
                        <option value="Part-time">Part-time</option>
                        <option value="Contract">Contract</option>
                    </select>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger" role="alert">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    {error}
                </div>
            )}

            <div className="row g-4">
                {jobs.map((job) => (
                    <div key={job.id} className="col-md-6 col-lg-4">
                        <div className="card h-100 border-0 shadow-sm hover-shadow transition-all">
                            <div className="card-body">
                                <div className="d-flex justify-content-between align-items-start mb-3">
                                    <div>
                                        <h3 className="h5 mb-1">{job.title}</h3>
                                        <p className="text-primary mb-0">{job.company}</p>
                                    </div>
                                    <button 
                                        className={`btn btn-sm ${savedJobs.includes(job.id) ? 'btn-danger' : 'btn-outline-primary'}`}
                                        onClick={() => toggleSaveJob(job.id)}
                                    >
                                        <i className={`bi bi-heart${savedJobs.includes(job.id) ? '-fill' : ''}`}></i>
                                    </button>
                                </div>

                                <div className="mb-3">
                                    <div className="d-flex flex-wrap gap-2 mb-2">
                                        <span className="badge bg-light text-dark">
                                            <i className="bi bi-geo-alt me-1"></i>
                                            {job.location}
                                        </span>
                                        <span className="badge bg-light text-dark">
                                            <i className="bi bi-briefcase me-1"></i>
                                            {job.type}
                                        </span>
                                        <span className="badge bg-light text-dark">
                                            <i className="bi bi-clock-history me-1"></i>
                                            {job.experience}
                                        </span>
                                    </div>
                                    <div className="d-flex flex-wrap gap-2">
                                        {job.skills.slice(0, 3).map((skill, index) => (
                                            <span key={index} className="badge bg-primary bg-opacity-10 text-primary">
                                                {skill}
                                            </span>
                                        ))}
                                        {job.skills.length > 3 && (
                                            <span className="badge bg-secondary bg-opacity-10 text-secondary">
                                                +{job.skills.length - 3} more
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <p className="small text-muted mb-3">
                                    {job.description.substring(0, 120)}...
                                </p>

                                <div className="d-flex justify-content-between align-items-center mt-auto">
                                    <span className="text-primary fw-bold">
                                        {job.salary}
                                    </span>
                                    <div className="d-flex gap-2">
                                        {job.isNew && (
                                            <span className="badge bg-success">New</span>
                                        )}
                                        <a 
                                            href={job.applyUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="btn btn-sm btn-primary"
                                        >
                                            Apply Now
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {jobs.length === 0 && !error && (
                <div className="text-center py-5">
                    <div className="display-6 text-muted mb-3">
                        <i className="bi bi-briefcase"></i>
                    </div>
                    <h4>No Jobs Found</h4>
                    <p className="text-muted">Try adjusting your filters or check back later.</p>
                </div>
            )}
        </div>
    );
}

export default JobCorner; 