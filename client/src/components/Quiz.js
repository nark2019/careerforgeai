import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import config from '../config';
import sqliteService from '../services/SQLiteService';

function Quiz() {
    const [career, setCareer] = useState('');
    const [experience, setExperience] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showAuthPrompt, setShowAuthPrompt] = useState(false);
    const [generatedQuestions, setGeneratedQuestions] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();

    // Force a complete reset when the component mounts
    useEffect(() => {
        console.log('Quiz component mounted - forcing complete reset');
        
        // Clear quiz data
        const clearData = async () => {
            await sqliteService.clearAllData();
        };
        clearData();
        
        // Reset form fields
        setCareer('');
        setExperience('');
        setGeneratedQuestions(null);
        setError('');
        
        // Check URL parameters
        const urlParams = new URLSearchParams(location.search);
        const fromResults = urlParams.get('fromResults');
        const forceNew = urlParams.get('new');
        const timestamp = urlParams.get('t');
        
        // If we have a timestamp parameter, it means we're coming from the "Start New Assessment" button
        // We don't need to reload the page again as we're already on a fresh page load
        if (timestamp) {
            console.log('New assessment requested with timestamp:', timestamp);
            // Just ensure all state is reset (already done above)
            return;
        }
        
        // For other cases where we need to force a reload
        if ((fromResults === 'true' || forceNew === 'true') && !location.key) {
            // This is a direct navigation with parameters but no history key
            // Force a complete page reload to clear any React state
            window.location.reload();
        }
    }, [location]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!career.trim()) {
            setError('Please enter a career field');
            return;
        }
        
        if (!experience.trim() || isNaN(parseInt(experience))) {
            setError('Please enter valid years of experience');
            return;
        }
        
        setLoading(true);
        setError('');

        try {
            // Clear any existing results
            await sqliteService.clearAllData();
            
            const response = await fetch(`${config.API_URL}/api/generate-questions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    career: career.trim(), 
                    experience: experience.trim() 
                })
            });

            if (!response.ok) {
                throw new Error('Unable to generate questions. Please try again later.');
            }

            const data = await response.json();
            setGeneratedQuestions(data.questions);
            
            // Check if user is authenticated
            const token = localStorage.getItem('token');
            if (!token) {
                setShowAuthPrompt(true);
            } else {
                // Create a unique ID for this assessment
                const assessmentId = `assessment_${Date.now()}`;
                
                // Navigate to results with fresh data and force parameter
                navigate('/results', { 
                    state: { 
                        assessmentId,
                        questions: data.questions, 
                        career: career.trim(), 
                        experience: experience.trim(),
                        startTime: new Date().toISOString(),
                        isNewQuiz: true
                    },
                    replace: true // Replace history to prevent going back to old state
                });
            }
        } catch (error) {
            console.error('Error generating questions:', error);
            setError('Unable to connect to the server. Please check your connection and try again.');
            
            // Provide sample questions for offline demo if server is unavailable
            if (error.message.includes('Failed to fetch') || error.message.includes('Network Error')) {
                const sampleQuestions = generateSampleQuestions(career);
                setGeneratedQuestions(sampleQuestions);
            }
        } finally {
            setLoading(false);
        }
    };

    // Function to generate sample questions when server is unavailable
    const generateSampleQuestions = (career) => {
        const careerType = career.toLowerCase();
        let domain = "general";
        
        if (careerType.includes('develop') || careerType.includes('program') || careerType.includes('engineer')) {
            domain = "software";
        } else if (careerType.includes('data') || careerType.includes('analyst')) {
            domain = "data";
        } else if (careerType.includes('design')) {
            domain = "design";
        }
        
        const questions = {
            software: [
                "What programming languages are you most proficient in?",
                "Describe your experience with version control systems.",
                "How do you approach debugging complex issues?",
                "Explain your understanding of object-oriented programming.",
                "How do you stay updated with the latest technology trends?"
            ],
            data: [
                "What data analysis tools have you worked with?",
                "Describe your experience with SQL and database design.",
                "How do you approach cleaning and preprocessing data?",
                "Explain a complex data analysis project you've worked on.",
                "How do you communicate technical findings to non-technical stakeholders?"
            ],
            design: [
                "What design tools are you most comfortable using?",
                "How do you approach user research?",
                "Describe your process for creating user personas.",
                "How do you handle feedback on your designs?",
                "Explain how you balance aesthetics with functionality."
            ],
            general: [
                "What skills do you consider most important for your role?",
                "How do you approach continuous learning in your field?",
                "Describe a challenging project you've worked on.",
                "How do you handle tight deadlines and pressure?",
                "What tools or technologies are you interested in learning next?"
            ]
        };
        
        return domain in questions ? 
            questions[domain].map((q, i) => ({ 
                id: i + 1, 
                question: q, 
                options: ["Beginner", "Intermediate", "Advanced", "Expert"],
                category: domain,
                difficulty: "Medium",
                correctAnswer: Math.floor(Math.random() * 4) // Random correct answer for demo
            })) : 
            questions.general.map((q, i) => ({ 
                id: i + 1, 
                question: q, 
                options: ["Beginner", "Intermediate", "Advanced", "Expert"],
                category: "general",
                difficulty: "Medium",
                correctAnswer: Math.floor(Math.random() * 4) // Random correct answer for demo
            }));
    };

    const handleContinueAsGuest = () => {
        // Create a unique ID for this assessment
        const assessmentId = `guest_${Date.now()}`;
        
        navigate('/results', { 
            state: { 
                assessmentId,
                questions: generatedQuestions, 
                career, 
                experience,
                startTime: new Date().toISOString(),
                isNewQuiz: true
            },
            replace: true // Replace history to prevent going back to old state
        });
    };

    return (
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-8">
                    <div className="card shadow">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h2 className="card-title">CareerForge AI Assessment</h2>
                                <button 
                                    className="btn btn-outline-primary" 
                                    onClick={() => {
                                        // Force a complete reset
                                        localStorage.removeItem('currentQuizResult');
                                        localStorage.removeItem('quizResults'); // Legacy key
                                        localStorage.removeItem('quizState');
                                        localStorage.removeItem('currentQuestion');
                                        localStorage.removeItem('answers');
                                        
                                        // Force a complete page reload
                                        window.location.href = '/quiz?new=true&t=' + Date.now();
                                    }}
                                >
                                    <i className="bi bi-arrow-repeat me-2"></i>
                                    Start Fresh
                                </button>
                            </div>
                            
                            {error && (
                                <div className="alert alert-danger" role="alert">
                                    {error}
                                </div>
                            )}
                            
                            {showAuthPrompt ? (
                                <div className="text-center py-4">
                                    <div className="mb-4">
                                        <i className="bi bi-lock-fill display-1 text-primary"></i>
                                        <h3 className="mt-3">Login Required</h3>
                                        <p className="text-muted">
                                            To save your assessment results and get personalized recommendations,
                                            please log in or create an account.
                                        </p>
                                    </div>
                                    <div className="d-grid gap-3">
                                        <Link to="/login" className="btn btn-primary">
                                            <i className="bi bi-box-arrow-in-right me-2"></i>
                                            Login
                                        </Link>
                                        <Link to="/signup" className="btn btn-outline-primary">
                                            <i className="bi bi-person-plus me-2"></i>
                                            Create Account
                                        </Link>
                                        <button 
                                            className="btn btn-outline-secondary"
                                            onClick={handleContinueAsGuest}
                                        >
                                            <i className="bi bi-incognito me-2"></i>
                                            Continue as Guest
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit}>
                                    <div className="mb-4">
                                        <label htmlFor="career" className="form-label">Career Field</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="career"
                                            placeholder="e.g., Software Developer, Data Analyst, UX Designer"
                                            value={career}
                                            onChange={(e) => setCareer(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label htmlFor="experience" className="form-label">Years of Experience</label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            id="experience"
                                            placeholder="e.g., 2"
                                            min="0"
                                            max="50"
                                            value={experience}
                                            onChange={(e) => setExperience(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="btn btn-primary w-100"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                Generating Questions...
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-lightning-charge-fill me-2"></i>
                                                Start Assessment
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Quiz; 