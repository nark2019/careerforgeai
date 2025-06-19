import React, { useState, useEffect } from 'react';
import config from '../config';

function MillionDollarIdeas() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [ideas, setIdeas] = useState([]);
    const [selectedIdea, setSelectedIdea] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [showCustomForm, setShowCustomForm] = useState(false);
    const [customInput, setCustomInput] = useState({
        interests: '',
        skills: '',
        experience: '',
        goals: '',
        budget: '',
        timeAvailable: '',
        targetMarket: '',
        problemToSolve: '',
        uniqueValue: '',
        industryPreference: '',
        techLevel: 'medium',
        scalability: 'medium',
        passionLevel: 'high'
    });
    const [filters, setFilters] = useState({
        investmentRange: 'all',
        timeCommitment: 'all',
        riskLevel: 'all'
    });

    useEffect(() => {
        fetchUserProfile();
    }, []);

    const fetchUserProfile = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${config.API_URL}/auth/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch user profile');
            }

            const data = await response.json();
            setUserProfile(data.user);
            // Don't automatically generate ideas on load
        } catch (error) {
            setError('Failed to load user profile');
        }
    };

    const generateIdeas = async (profile, useCustomInput = false) => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            
            // Prepare the request body based on whether we're using custom input
            const requestBody = useCustomInput 
                ? {
                    profile: {
                        ...profile,
                        customInput
                    },
                    filters,
                    useCustomInput: true
                }
                : {
                    profile,
                    filters
                };
                
            console.log('Sending request with:', JSON.stringify(requestBody, null, 2));
                
            const response = await fetch(`${config.API_URL}/api/generate-business-ideas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to generate ideas');
            }

            const data = await response.json();
            setIdeas(data.ideas);
            setShowCustomForm(false); // Hide the form after generating ideas
        } catch (error) {
            setError('Failed to generate ideas: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key, value) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
    };

    const handleIdeaSelect = (idea) => {
        setSelectedIdea(idea);
    };

    const handleSaveIdea = async (idea) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${config.API_URL}/api/save-business-idea`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ idea })
            });

            if (!response.ok) {
                throw new Error('Failed to save idea');
            }

            alert('Idea saved successfully!');
        } catch (error) {
            setError('Failed to save idea: ' + error.message);
        }
    };
    
    const handleCustomInputChange = (e) => {
        const { name, value } = e.target;
        setCustomInput(prev => ({
            ...prev,
            [name]: value
        }));
    };
    
    const handleSubmitCustomForm = (e) => {
        e.preventDefault();
        generateIdeas(userProfile, true);
    };

    const openCustomForm = () => {
        setShowCustomForm(true);
    };

    if (loading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Generating million dollar ideas...</span>
                </div>
                <p className="mt-3">Analyzing market trends and opportunities...</p>
            </div>
        );
    }

    return (
        <div className="container py-5">
            <div className="row mb-5">
                <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h2 className="h3 mb-0">Million Dollar Ideas</h2>
                        <div>
                            <button 
                                className="btn btn-outline-primary me-2"
                                onClick={openCustomForm}
                            >
                                <i className="bi bi-pencil-square me-2"></i>
                                Customize Ideas
                            </button>
                            <button 
                                className="btn btn-primary"
                                onClick={() => generateIdeas(userProfile)}
                                disabled={!userProfile}
                            >
                                <i className="bi bi-lightbulb me-2"></i>
                                Generate Ideas
                            </button>
                        </div>
                    </div>

                    {/* Custom Input Form Modal */}
                    {showCustomForm && (
                        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
                            <div className="modal-dialog modal-lg">
                                <div className="modal-content">
                                    <div className="modal-header bg-primary text-white">
                                        <h5 className="modal-title">Create Your Million Dollar Idea</h5>
                                        <button 
                                            type="button" 
                                            className="btn-close btn-close-white"
                                            onClick={() => setShowCustomForm(false)}
                                        ></button>
                                    </div>
                                    <div className="modal-body">
                                        <form onSubmit={handleSubmitCustomForm}>
                                            <div className="row mb-4">
                                                <div className="col-12">
                                                    <h5 className="border-bottom pb-2 mb-3">Your Background</h5>
                                                </div>
                                                <div className="col-md-6 mb-3">
                                                    <label htmlFor="skills" className="form-label">Your Skills & Expertise</label>
                                                    <textarea
                                                        id="skills"
                                                        name="skills"
                                                        className="form-control"
                                                        placeholder="What are your strongest skills and abilities? (e.g., programming, design, marketing)"
                                                        value={customInput.skills}
                                                        onChange={handleCustomInputChange}
                                                        rows="3"
                                                        required
                                                    ></textarea>
                                                </div>
                                                <div className="col-md-6 mb-3">
                                                    <label htmlFor="experience" className="form-label">Your Experience</label>
                                                    <textarea
                                                        id="experience"
                                                        name="experience"
                                                        className="form-control"
                                                        placeholder="What relevant work or educational experience do you have? (e.g., 5 years in software development, MBA)"
                                                        value={customInput.experience}
                                                        onChange={handleCustomInputChange}
                                                        rows="3"
                                                    ></textarea>
                                                </div>
                                            </div>

                                            <div className="row mb-4">
                                                <div className="col-12">
                                                    <h5 className="border-bottom pb-2 mb-3">Your Interests & Preferences</h5>
                                                </div>
                                                <div className="col-md-6 mb-3">
                                                    <label htmlFor="interests" className="form-label">Your Interests & Passions</label>
                                                    <textarea
                                                        id="interests"
                                                        name="interests"
                                                        className="form-control"
                                                        placeholder="What topics, industries, or activities are you passionate about? (e.g., sustainability, fitness, education)"
                                                        value={customInput.interests}
                                                        onChange={handleCustomInputChange}
                                                        rows="3"
                                                        required
                                                    ></textarea>
                                                </div>
                                                <div className="col-md-6 mb-3">
                                                    <label htmlFor="industryPreference" className="form-label">Preferred Industry</label>
                                                    <select
                                                        id="industryPreference"
                                                        name="industryPreference"
                                                        className="form-select"
                                                        value={customInput.industryPreference}
                                                        onChange={handleCustomInputChange}
                                                    >
                                                        <option value="">Select an industry (optional)</option>
                                                        <option value="technology">Technology</option>
                                                        <option value="health">Health & Wellness</option>
                                                        <option value="education">Education</option>
                                                        <option value="finance">Finance</option>
                                                        <option value="retail">Retail & E-commerce</option>
                                                        <option value="food">Food & Beverage</option>
                                                        <option value="entertainment">Entertainment & Media</option>
                                                        <option value="travel">Travel & Hospitality</option>
                                                        <option value="real-estate">Real Estate</option>
                                                        <option value="manufacturing">Manufacturing</option>
                                                        <option value="sustainability">Sustainability & Green Tech</option>
                                                        <option value="other">Other</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="row mb-4">
                                                <div className="col-12">
                                                    <h5 className="border-bottom pb-2 mb-3">Business Vision</h5>
                                                </div>
                                                <div className="col-md-6 mb-3">
                                                    <label htmlFor="problemToSolve" className="form-label">Problem to Solve</label>
                                                    <textarea
                                                        id="problemToSolve"
                                                        name="problemToSolve"
                                                        className="form-control"
                                                        placeholder="What problem would you like your business to solve? (e.g., lack of affordable childcare, inefficient supply chains)"
                                                        value={customInput.problemToSolve}
                                                        onChange={handleCustomInputChange}
                                                        rows="3"
                                                    ></textarea>
                                                </div>
                                                <div className="col-md-6 mb-3">
                                                    <label htmlFor="targetMarket" className="form-label">Target Market</label>
                                                    <textarea
                                                        id="targetMarket"
                                                        name="targetMarket"
                                                        className="form-control"
                                                        placeholder="Who would be your ideal customers? (e.g., working parents, small businesses, Gen Z)"
                                                        value={customInput.targetMarket}
                                                        onChange={handleCustomInputChange}
                                                        rows="3"
                                                    ></textarea>
                                                </div>
                                                <div className="col-12 mb-3">
                                                    <label htmlFor="uniqueValue" className="form-label">Unique Value Proposition</label>
                                                    <textarea
                                                        id="uniqueValue"
                                                        name="uniqueValue"
                                                        className="form-control"
                                                        placeholder="What would make your business unique or different? (e.g., proprietary technology, exceptional service, innovative approach)"
                                                        value={customInput.uniqueValue}
                                                        onChange={handleCustomInputChange}
                                                        rows="2"
                                                    ></textarea>
                                                </div>
                                            </div>

                                            <div className="row mb-4">
                                                <div className="col-12">
                                                    <h5 className="border-bottom pb-2 mb-3">Practical Considerations</h5>
                                                </div>
                                                <div className="col-md-6 mb-3">
                                                    <label htmlFor="budget" className="form-label">Available Budget</label>
                                                    <select
                                                        id="budget"
                                                        name="budget"
                                                        className="form-select"
                                                        value={customInput.budget}
                                                        onChange={handleCustomInputChange}
                                                        required
                                                    >
                                                        <option value="">Select your budget</option>
                                                        <option value="under $1,000">Under $1,000</option>
                                                        <option value="$1,000 - $5,000">$1,000 - $5,000</option>
                                                        <option value="$5,000 - $10,000">$5,000 - $10,000</option>
                                                        <option value="$10,000 - $25,000">$10,000 - $25,000</option>
                                                        <option value="$25,000 - $50,000">$25,000 - $50,000</option>
                                                        <option value="$50,000 - $100,000">$50,000 - $100,000</option>
                                                        <option value="$100,000+">$100,000+</option>
                                                    </select>
                                                </div>
                                                <div className="col-md-6 mb-3">
                                                    <label htmlFor="timeAvailable" className="form-label">Time Available</label>
                                                    <select
                                                        id="timeAvailable"
                                                        name="timeAvailable"
                                                        className="form-select"
                                                        value={customInput.timeAvailable}
                                                        onChange={handleCustomInputChange}
                                                        required
                                                    >
                                                        <option value="">Select time commitment</option>
                                                        <option value="5-10 hours/week">5-10 hours/week (Side Hustle)</option>
                                                        <option value="10-20 hours/week">10-20 hours/week (Part-Time)</option>
                                                        <option value="20-30 hours/week">20-30 hours/week (Substantial Part-Time)</option>
                                                        <option value="40+ hours/week">40+ hours/week (Full-Time)</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="row mb-4">
                                                <div className="col-12">
                                                    <h5 className="border-bottom pb-2 mb-3">Business Characteristics</h5>
                                                </div>
                                                <div className="col-md-4 mb-3">
                                                    <label htmlFor="techLevel" className="form-label">Technology Level</label>
                                                    <select
                                                        id="techLevel"
                                                        name="techLevel"
                                                        className="form-select"
                                                        value={customInput.techLevel}
                                                        onChange={handleCustomInputChange}
                                                    >
                                                        <option value="low">Low-Tech (Minimal technology required)</option>
                                                        <option value="medium">Medium-Tech (Standard technology)</option>
                                                        <option value="high">High-Tech (Advanced technology)</option>
                                                    </select>
                                                </div>
                                                <div className="col-md-4 mb-3">
                                                    <label htmlFor="scalability" className="form-label">Scalability Preference</label>
                                                    <select
                                                        id="scalability"
                                                        name="scalability"
                                                        className="form-select"
                                                        value={customInput.scalability}
                                                        onChange={handleCustomInputChange}
                                                    >
                                                        <option value="low">Local Business (Serving local community)</option>
                                                        <option value="medium">Regional Growth (Potential for regional expansion)</option>
                                                        <option value="high">High Growth (Potential for national/global scale)</option>
                                                    </select>
                                                </div>
                                                <div className="col-md-4 mb-3">
                                                    <label htmlFor="goals" className="form-label">Primary Business Goal</label>
                                                    <select
                                                        id="goals"
                                                        name="goals"
                                                        className="form-select"
                                                        value={customInput.goals}
                                                        onChange={handleCustomInputChange}
                                                    >
                                                        <option value="passive income">Passive Income</option>
                                                        <option value="self-employment">Self-Employment</option>
                                                        <option value="small business">Small Business (Few Employees)</option>
                                                        <option value="growth company">Growth Company (Seeking Investment)</option>
                                                        <option value="social impact">Social Impact/Mission-Driven</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="d-flex justify-content-end">
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-secondary me-2"
                                                    onClick={() => setShowCustomForm(false)}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    className="btn btn-primary"
                                                >
                                                    <i className="bi bi-lightbulb me-2"></i>
                                                    Generate Custom Ideas
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="card shadow-sm mb-4">
                        <div className="card-body">
                            <h3 className="h5 mb-3">Filters</h3>
                            <div className="row g-3">
                                <div className="col-md-4">
                                    <label className="form-label">Investment Range</label>
                                    <select 
                                        className="form-select"
                                        value={filters.investmentRange}
                                        onChange={(e) => handleFilterChange('investmentRange', e.target.value)}
                                    >
                                        <option value="all">All Ranges</option>
                                        <option value="low">Low ($0 - $5,000)</option>
                                        <option value="medium">Medium ($5,000 - $25,000)</option>
                                        <option value="high">High ($25,000+)</option>
                                    </select>
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label">Time Commitment</label>
                                    <select 
                                        className="form-select"
                                        value={filters.timeCommitment}
                                        onChange={(e) => handleFilterChange('timeCommitment', e.target.value)}
                                    >
                                        <option value="all">All Types</option>
                                        <option value="side-hustle">Side Hustle</option>
                                        <option value="part-time">Part Time</option>
                                        <option value="full-time">Full Time</option>
                                    </select>
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label">Risk Level</label>
                                    <select 
                                        className="form-select"
                                        value={filters.riskLevel}
                                        onChange={(e) => handleFilterChange('riskLevel', e.target.value)}
                                    >
                                        <option value="all">All Levels</option>
                                        <option value="low">Low Risk</option>
                                        <option value="medium">Medium Risk</option>
                                        <option value="high">High Risk</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="alert alert-danger" role="alert">
                            {error}
                        </div>
                    )}

                    {ideas.length === 0 ? (
                        <div className="text-center py-5">
                            <div className="mb-4">
                                <i className="bi bi-lightbulb" style={{ fontSize: '3rem', color: '#ffc107' }}></i>
                            </div>
                            <h3 className="h4 mb-3">Ready to discover your million dollar idea?</h3>
                            <p className="text-muted mb-4">Click "Customize Ideas" to tailor business ideas to your specific interests and skills, or "Generate Ideas" to get started with general recommendations.</p>
                            <button 
                                className="btn btn-primary btn-lg"
                                onClick={openCustomForm}
                            >
                                <i className="bi bi-pencil-square me-2"></i>
                                Customize My Million Dollar Idea
                            </button>
                        </div>
                    ) : (
                        <div className="row g-4">
                            {ideas.map((idea, index) => (
                                <div key={index} className="col-md-6 col-lg-4">
                                    <div className="card h-100 border-0 shadow-sm">
                                        <div className="card-body">
                                            <div className="d-flex justify-content-between align-items-start mb-3">
                                                <h4 className="h5 mb-0">{idea.title}</h4>
                                                <span className={`badge bg-${idea.riskLevel === 'low' ? 'success' : idea.riskLevel === 'medium' ? 'warning' : 'danger'}`}>
                                                    {idea.riskLevel} Risk
                                                </span>
                                            </div>
                                            <p className="text-muted small mb-3">{idea.shortDescription}</p>
                                            <div className="mb-3">
                                                <div className="d-flex gap-2 mb-2">
                                                    <span className="badge bg-primary">
                                                        <i className="bi bi-cash me-1"></i>
                                                        {idea.investmentRange}
                                                    </span>
                                                    <span className="badge bg-info">
                                                        <i className="bi bi-clock me-1"></i>
                                                        {idea.timeCommitment}
                                                    </span>
                                                </div>
                                                <div className="d-flex flex-wrap gap-1">
                                                    {idea.skills.map((skill, i) => (
                                                        <span key={i} className="badge bg-light text-dark">
                                                            {skill}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="d-grid gap-2">
                                                <button 
                                                    className="btn btn-outline-primary btn-sm"
                                                    onClick={() => handleIdeaSelect(idea)}
                                                >
                                                    View Details
                                                </button>
                                                <button 
                                                    className="btn btn-outline-success btn-sm"
                                                    onClick={() => handleSaveIdea(idea)}
                                                >
                                                    Save Idea
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Idea Details Modal */}
            {selectedIdea && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">{selectedIdea.title}</h5>
                                <button 
                                    type="button" 
                                    className="btn-close"
                                    onClick={() => setSelectedIdea(null)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <div className="row mb-4">
                                    <div className="col-md-8">
                                        <h6>Business Overview</h6>
                                        <p>{selectedIdea.fullDescription}</p>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="card bg-light">
                                            <div className="card-body">
                                                <h6 className="card-title">Quick Facts</h6>
                                                <ul className="list-unstyled mb-0">
                                                    <li className="mb-2">
                                                        <i className="bi bi-cash me-2 text-success"></i>
                                                        Investment: {selectedIdea.investmentRange}
                                                    </li>
                                                    <li className="mb-2">
                                                        <i className="bi bi-clock me-2 text-primary"></i>
                                                        Time: {selectedIdea.timeCommitment}
                                                    </li>
                                                    <li className="mb-2">
                                                        <i className="bi bi-graph-up me-2 text-info"></i>
                                                        Potential ROI: {selectedIdea.potentialROI}
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="row mb-4">
                                    <div className="col-md-6">
                                        <h6>Key Requirements</h6>
                                        <ul className="list-unstyled">
                                            {selectedIdea.requirements.map((req, index) => (
                                                <li key={index} className="mb-2">
                                                    <i className="bi bi-check-circle me-2 text-success"></i>
                                                    {req}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="col-md-6">
                                        <h6>Market Analysis</h6>
                                        <ul className="list-unstyled">
                                            {selectedIdea.marketAnalysis.map((point, index) => (
                                                <li key={index} className="mb-2">
                                                    <i className="bi bi-graph-up-arrow me-2 text-primary"></i>
                                                    {point}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                <div className="row">
                                    <div className="col-12">
                                        <h6>Implementation Steps</h6>
                                        <div className="timeline">
                                            {selectedIdea.implementationSteps.map((step, index) => (
                                                <div key={index} className="timeline-item">
                                                    <div className="timeline-number">{index + 1}</div>
                                                    <div className="timeline-content">
                                                        <h6>{step.title}</h6>
                                                        <p className="mb-0 small">{step.description}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button 
                                    type="button" 
                                    className="btn btn-success"
                                    onClick={() => handleSaveIdea(selectedIdea)}
                                >
                                    Save This Idea
                                </button>
                                <button 
                                    type="button" 
                                    className="btn btn-secondary"
                                    onClick={() => setSelectedIdea(null)}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MillionDollarIdeas; 