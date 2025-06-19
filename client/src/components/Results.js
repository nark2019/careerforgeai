import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import config from '../config';
import SaveButton from './common/SaveButton';
import LoginRequired from './common/LoginRequired';
import DataService from '../services/DataService';
import sqliteService from '../services/SQLiteService';

function Results() {
    const location = useLocation();
    const navigate = useNavigate();
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const [recommendations, setRecommendations] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [saveStatus, setSaveStatus] = useState('');
    const [reportId, setReportId] = useState(null);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
    const [assessmentHistory, setAssessmentHistory] = useState([]);
    const [clearingHistory, setClearingHistory] = useState(false);
    const [storedData, setStoredData] = useState({});

    // Get questions, career, and experience from location state or IndexedDB
    const questions = location.state?.questions || storedData.questions || [];
    const career = location.state?.career || storedData.career || '';
    const experience = location.state?.experience || storedData.experience || '';
    const finalAnswers = location.state?.answers || storedData.answers || [];
    const assessmentId = location.state?.assessmentId || storedData.id || `result_${Date.now()}`;
    const isNewQuiz = location.state?.isNewQuiz || false;

    useEffect(() => {
        const loadStoredData = async () => {
            const data = await sqliteService.getCurrentResult() || {};
            setStoredData(data);
        };
        loadStoredData();
    }, []);

    useEffect(() => {
        // If this is a new quiz coming from the Quiz component with state
        if (location.state?.isNewQuiz) {
            console.log('New quiz detected from location state, clearing previous results');
            // Don't load saved data, start fresh
            if (finalAnswers.length > 0) {
                calculateResults(finalAnswers);
            }
            return;
        }

        const loadSavedData = async () => {
            try {
                // Try to load current result
                const currentResult = await sqliteService.getCurrentResult();
                if (currentResult?.recommendations) {
                    setRecommendations(currentResult.recommendations);
                    setShowResults(true);
                    setReportId(currentResult.reportId);
                    return;
                }

                // If we have answers but no recommendations, calculate results
                if (finalAnswers.length > 0 && !recommendations) {
                    calculateResults(finalAnswers);
                    return;
                }

                // Load assessment history
                const results = await sqliteService.getQuizResults();
                setAssessmentHistory(results || []);

                // Try to load saved data if we don't have results yet
                if (!recommendations && !showResults && DataService.isLoggedIn()) {
                    const { data } = await DataService.getData('quiz-results');
                    if (data && data.recommendations) {
                        setRecommendations(data.recommendations);
                        setReportId(data.reportId);
                        setShowResults(true);
                    }
                }
            } catch (error) {
                console.error('Error loading saved data:', error);
            }
        };

        loadSavedData();

        // If we have no questions, redirect to quiz
        if (!questions.length && !recommendations) {
            navigate('/quiz?new=true');
        }
    }, [questions, navigate, finalAnswers, recommendations, isNewQuiz]);

    // Save current state to storage whenever it changes
    useEffect(() => {
        if (recommendations && showResults) {
            try {
                // Generate a unique ID for this result if it doesn't have one
                const resultId = reportId || `result_${Date.now()}`;
                
                // Create the result object
                const resultData = {
                    id: resultId,
                    timestamp: new Date().toISOString(),
                    career,
                    experience,
                    score: recommendations.score,
                    reportId,
                    questions,
                    answers: finalAnswers,
                    recommendations
                };
                
                // Save current result
                sqliteService.saveCurrentResult(resultData);
                
                // Save to quiz results (minimal data)
                const historyData = {
                    id: resultId,
                    timestamp: new Date().toISOString(),
                    career,
                    experience,
                    score: recommendations.score,
                    reportId
                };
                
                // Save to quiz results and update display
                (async () => {
                    await sqliteService.saveQuizResult(historyData);
                    const results = await sqliteService.getQuizResults();
                    if (Array.isArray(results)) {
                        setAssessmentHistory(results);
                    }
                })();
            } catch (error) {
                console.error('Error saving results:', error);
            }
        }
    }, [recommendations, showResults, questions, career, experience, finalAnswers, reportId]);

    // Add a separate useEffect for loading assessment history
    useEffect(() => {
        const loadAssessmentHistory = async () => {
            try {
                const results = await sqliteService.getQuizResults();
                if (Array.isArray(results)) {
                    // Sort by timestamp in descending order (newest first)
                    const sortedResults = results.sort((a, b) => 
                        new Date(b.timestamp) - new Date(a.timestamp)
                    );
                    // Remove any duplicates based on ID
                    const uniqueResults = sortedResults.filter((result, index, self) =>
                        index === self.findIndex((r) => r.id === result.id)
                    );
                    setAssessmentHistory(uniqueResults);
                } else {
                    setAssessmentHistory([]);
                }
            } catch (error) {
                console.error('Error loading assessment history:', error);
                setAssessmentHistory([]);
            }
        };

        loadAssessmentHistory();
    }, []); // Run once when component mounts

    const handleAnswer = async (selectedOption) => {
        const newAnswers = [...answers, selectedOption];
        setAnswers(newAnswers);

        if (currentQuestion < questions.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
        } else {
            await calculateResults(newAnswers);
        }
    };

    const calculateResults = async (finalAnswers) => {
        setLoading(true);
        setError('');

        try {
            // Calculate score and weak categories
            let score = 0;
            const weakCategories = [];
            finalAnswers.forEach((answer, index) => {
                const question = questions[index];
                if (answer === question.correctAnswer) {
                    score++;
                } else {
                    if (!weakCategories.includes(question.category)) {
                        weakCategories.push(question.category);
                    }
                }
            });

            score = Math.round((score / questions.length) * 100);

            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${config.API_URL}/api/generate-recommendations`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        career,
                        experience,
                        score,
                        weakCategories: weakCategories.length > 0 ? weakCategories : ['general knowledge']
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to generate recommendations');
                }

                const data = await response.json();
                setRecommendations(data.recommendations);
                
                // Save results to SQLite
                const resultData = {
                    id: assessmentId,
                    questions,
                    career,
                    experience,
                    answers: finalAnswers,
                    recommendations: data.recommendations,
                    timestamp: new Date().toISOString(),
                    score
                };
                
                await sqliteService.saveCurrentResult(resultData);
                await sqliteService.saveQuizResult(resultData);
                
            } catch (error) {
                console.error('Error generating recommendations:', error);
                // Provide fallback recommendations if server is unavailable
                const fallbackRecs = generateFallbackRecommendations(career, weakCategories);
                setRecommendations(fallbackRecs);
                
                // Save fallback results to SQLite
                const resultData = {
                    id: assessmentId,
                    questions,
                    career,
                    experience,
                    answers: finalAnswers,
                    recommendations: fallbackRecs,
                    timestamp: new Date().toISOString(),
                    score
                };
                
                await sqliteService.saveCurrentResult(resultData);
                await sqliteService.saveQuizResult(resultData);
            }
            setShowResults(true);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleRetake = async () => {
        // Clear quiz data
        await sqliteService.clearAllData();
        
        // Reset state
        setCurrentQuestion(0);
        setAnswers([]);
        setShowResults(false);
        setRecommendations(null);
        setReportId(null);
        
        // Force a complete page reload to the quiz page
        window.location.href = `/quiz?new=true&t=${Date.now()}`;
    };

    const handleSaveSuccess = async (result) => {
        setReportId(result.dataId);
        
        // Update the current result with the report ID
        const currentResult = await sqliteService.getCurrentResult();
        if (currentResult) {
            currentResult.reportId = result.dataId;
            await sqliteService.saveCurrentResult(currentResult);
        }
    };

    const handleSaveError = (error) => {
        if (error.message === 'Authentication required') {
            setShowLoginPrompt(true);
        }
    };

    const handleDeleteAssessment = async (assessmentId) => {
        try {
            await sqliteService.deleteQuizResult(assessmentId);
            const results = await sqliteService.getQuizResults();
            setAssessmentHistory(results || []);
            
            // If current result was deleted, clear it and retake
            const currentResult = await sqliteService.getCurrentResult();
            if (currentResult && currentResult.id === assessmentId) {
                await sqliteService.clearAllData();
                handleRetake();
            }
        } catch (error) {
            console.error('Error deleting assessment:', error);
        }
    };

    // Add the clear history function
    const handleClearHistory = async () => {
        try {
            setClearingHistory(true);
            
            // Clear all data
            await sqliteService.clearAllData();
            
            // Update the state
            setAssessmentHistory([]);
            setRecommendations(null);
            setShowResults(false);
            
            // Show success message using Bootstrap alert
            const alertContainer = document.createElement('div');
            alertContainer.className = 'alert alert-success alert-dismissible fade show mt-3';
            alertContainer.innerHTML = `
                <strong>Success!</strong> Assessment history has been cleared.
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            `;
            
            const cardBody = document.querySelector('.card-body');
            if (cardBody) {
                cardBody.insertBefore(alertContainer, cardBody.firstChild);
                
                // Auto dismiss after 3 seconds
                setTimeout(() => {
                    alertContainer.classList.remove('show');
                    setTimeout(() => alertContainer.remove(), 150);
                }, 3000);
            }
            
            // Redirect to quiz after a short delay
            setTimeout(() => {
                navigate('/quiz?new=true');
            }, 1500);
        } catch (error) {
            console.error('Error clearing assessment history:', error);
            
            // Show error message using Bootstrap alert
            const alertContainer = document.createElement('div');
            alertContainer.className = 'alert alert-danger alert-dismissible fade show mt-3';
            alertContainer.innerHTML = `
                <strong>Error!</strong> Failed to clear assessment history: ${error.message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            `;
            
            const cardBody = document.querySelector('.card-body');
            if (cardBody) {
                cardBody.insertBefore(alertContainer, cardBody.firstChild);
                
                // Auto dismiss after 5 seconds
                setTimeout(() => {
                    alertContainer.classList.remove('show');
                    setTimeout(() => alertContainer.remove(), 150);
                }, 5000);
            }
        } finally {
            setClearingHistory(false);
        }
    };

    // Add cleanup function
    const handleCleanupDuplicates = async () => {
        try {
            // Get all results
            const results = await sqliteService.getQuizResults();
            if (Array.isArray(results)) {
                // Create a map of unique entries by ID
                const uniqueMap = new Map();
                results.forEach(result => {
                    if (!uniqueMap.has(result.id) || 
                        new Date(result.timestamp) > new Date(uniqueMap.get(result.id).timestamp)) {
                        uniqueMap.set(result.id, result);
                    }
                });

                // Delete all results
                await sqliteService.clearAllData();

                // Add back unique entries
                const uniqueEntries = Array.from(uniqueMap.values());
                await Promise.all(uniqueEntries.map(entry => sqliteService.saveQuizResult(entry)));

                // Update state
                setAssessmentHistory(uniqueEntries);
            }
        } catch (error) {
            console.error('Error cleaning up duplicates:', error);
        }
    };

    const renderAssessmentHistory = () => (
        <div className="card mb-4">
            <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h3 className="card-title mb-0">Assessment History</h3>
                    <div>
                        {assessmentHistory?.length > 0 && (
                            <>
                                <button 
                                    className="btn btn-outline-primary btn-sm me-2"
                                    onClick={handleCleanupDuplicates}
                                    title="Remove duplicate entries"
                                    disabled={clearingHistory}
                                >
                                    {clearingHistory ? (
                                        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                    ) : (
                                        <i className="bi bi-arrow-repeat me-1"></i>
                                    )}
                                    Clean Duplicates
                                </button>
                                <button 
                                    className={`btn btn-outline-danger btn-sm ${clearingHistory ? 'disabled' : ''}`}
                                    onClick={() => {
                                        if (!clearingHistory) {
                                            const confirmMessage = 
                                                'Are you sure you want to clear all assessment history?\n\n' +
                                                '• This will delete all past assessment results\n' +
                                                '• Your current assessment will also be cleared\n' +
                                                '• This action cannot be undone\n' +
                                                '• You will be redirected to start a new assessment';
                                                
                                            if (window.confirm(confirmMessage)) {
                                                handleClearHistory();
                                            }
                                        }
                                    }}
                                >
                                    {clearingHistory ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                            Clearing...
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-trash me-1"></i>
                                            Clear History
                                        </>
                                    )}
                                </button>
                            </>
                        )}
                    </div>
                </div>
                
                {/* Assessment list */}
                {!assessmentHistory ? (
                    <div className="text-center py-4">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                ) : assessmentHistory.length === 0 ? (
                    <div className="text-center py-4">
                        <p className="text-muted mb-0">No previous assessments found.</p>
                        <button 
                            className="btn btn-primary mt-3"
                            onClick={() => navigate('/quiz?new=true')}
                        >
                            <i className="bi bi-plus-circle me-1"></i>
                            Start New Assessment
                        </button>
                    </div>
                ) : (
                    <div className="list-group">
                        {assessmentHistory.map((assessment) => (
                            <div key={assessment.id} 
                                 className="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="mb-1">{assessment.career}</h6>
                                    <small className="text-muted">
                                        Taken on {new Date(assessment.timestamp).toLocaleDateString()} at{' '}
                                        {new Date(assessment.timestamp).toLocaleTimeString()}
                                    </small>
                                    <div>
                                        <span className="badge bg-primary me-2">Score: {assessment.score}%</span>
                                        <span className="badge bg-secondary">{assessment.experience} years experience</span>
                                    </div>
                                </div>
                                <div>
                                    <button 
                                        className="btn btn-danger btn-sm"
                                        onClick={() => handleDeleteAssessment(assessment.id)}
                                        title="Delete this assessment"
                                        disabled={clearingHistory}
                                    >
                                        <i className="bi bi-trash"></i>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="container mt-5 text-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-3">Analyzing your results...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mt-5">
                <div className="alert alert-danger" role="alert">
                    {error}
                    <button className="btn btn-primary mt-3" onClick={handleRetake}>
                        Retake Quiz
                    </button>
                </div>
            </div>
        );
    }

    if (showLoginPrompt) {
        return (
            <LoginRequired 
                message="You need to be logged in to save your assessment results."
                onBack={() => setShowLoginPrompt(false)}
                returnPath={location.pathname}
            />
        );
    }

    if (showResults && recommendations) {
        return (
            <div className="container mt-5">
                <div className="d-flex justify-content-end mb-3">
                    {!reportId ? (
                        <SaveButton 
                            componentType="quiz-results"
                            data={{
                                questions,
                                career,
                                experience,
                                answers: finalAnswers,
                                recommendations,
                                reportId
                            }}
                            onSaveSuccess={handleSaveSuccess}
                            onSaveError={handleSaveError}
                            className="me-2"
                        />
                    ) : (
                        <button 
                            className="btn btn-success me-2" 
                            disabled={true}
                        >
                            <i className="bi bi-check-circle me-2"></i>
                            Report Saved
                        </button>
                    )}
                    <button className="btn btn-outline-primary me-2" onClick={handlePrint}>
                        <i className="bi bi-printer"></i> Print Results
                    </button>
                    <button className="btn btn-outline-secondary" onClick={handleRetake}>
                        <i className="bi bi-arrow-repeat"></i> Start New Assessment
                    </button>
                </div>

                <div className="card mb-4">
                    <div className="card-body">
                        <h3 className="card-title">Score Analysis</h3>
                        <div className="row align-items-center">
                            <div className="col-md-3 text-center">
                                <div className="display-1 fw-bold text-primary">
                                    {recommendations.score_analysis?.overall_score || 0}%
                                </div>
                                <div className="text-muted">Overall Score</div>
                            </div>
                            <div className="col-md-5">
                                <div className="h4 mb-3">
                                    Estimated to be in the top {recommendations.score_analysis?.percentile || "20%"} among peers with similar experience.
                                </div>
                                <p>{recommendations.score_analysis?.interpretation}</p>
                            </div>
                            <div className="col-md-4">
                                <div className="card bg-light">
                                    <div className="card-body">
                                        <h5 className="card-title">Career</h5>
                                        <p className="mb-1"><strong>{career}</strong></p>
                                        <p className="text-muted">{experience} years experience</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card mb-4">
                    <div className="card-body">
                        <h3 className="card-title">Job Description</h3>
                        <div className="row">
                            <div className="col-md-12">
                                <h4>{recommendations.job_description?.title || career}</h4>
                                <p className="lead">{recommendations.job_description?.description || `A professional in the ${career} field.`}</p>
                                
                                <div className="row mt-4">
                                    <div className="col-md-6">
                                        <h5>Key Responsibilities</h5>
                                        <ul className="list-group list-group-flush">
                                            {recommendations.job_description?.responsibilities?.map((resp, index) => (
                                                <li key={index} className="list-group-item bg-transparent">
                                                    <i className="bi bi-check-circle-fill text-success me-2"></i>
                                                    {resp}
                                                </li>
                                            )) || <li className="list-group-item bg-transparent">Information not available</li>}
                                        </ul>
                                    </div>
                                    <div className="col-md-6">
                                        <h5>Required Skills</h5>
                                        <ul className="list-group list-group-flush">
                                            {recommendations.job_description?.required_skills?.map((skill, index) => (
                                                <li key={index} className="list-group-item bg-transparent">
                                                    <i className="bi bi-star-fill text-warning me-2"></i>
                                                    {skill}
                                                </li>
                                            )) || <li className="list-group-item bg-transparent">Information not available</li>}
                                        </ul>
                                    </div>
                                </div>
                                
                                <div className="row mt-4">
                                    <div className="col-md-6">
                                        <div className="card bg-light">
                                            <div className="card-body">
                                                <h5 className="card-title">Salary Range</h5>
                                                <p className="card-text">{recommendations.job_description?.salary_range || "Varies by location and experience"}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="card bg-light">
                                            <div className="card-body">
                                                <h5 className="card-title">Career Path</h5>
                                                <p className="card-text">{recommendations.job_description?.career_path || "Career progression varies by organization"}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row mb-4">
                    <div className="col-md-6">
                        <div className="card h-100">
                            <div className="card-body">
                                <h3 className="card-title">Your Strengths</h3>
                                {recommendations.strengths?.map((strength, index) => (
                                    <div key={index} className="mb-4">
                                        <div className="d-flex align-items-start">
                                            <i className="bi bi-check-circle-fill text-success me-2 mt-1"></i>
                                            <div>
                                                <h5 className="text-success mb-2">{strength.area}</h5>
                                                <p className="mb-2">{strength.details}</p>
                                                <div className="text-muted">
                                                    <strong>How to leverage:</strong> {strength.how_to_leverage}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="card h-100">
                            <div className="card-body">
                                <h3 className="card-title">Areas for Improvement</h3>
                                {recommendations.areas_for_improvement?.map((area, index) => (
                                    <div key={index} className="mb-4">
                                        <div className="d-flex align-items-start">
                                            <i className="bi bi-arrow-up-circle-fill text-warning me-2 mt-1"></i>
                                            <div>
                                                <h5 className="text-warning mb-2">{area.area}</h5>
                                                <div className="d-flex justify-content-between mb-2">
                                                    <small className="text-muted">Current: {area.current_level}</small>
                                                    <small className="text-muted">Target: {area.target_level}</small>
                                                </div>
                                                <p className="mb-2">{area.importance}</p>
                                                <ul className="list-unstyled mb-0">
                                                    {area.action_items.map((item, i) => (
                                                        <li key={i} className="mb-1">
                                                            <i className="bi bi-dot"></i> {item}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card mb-4">
                    <div className="card-body">
                        <h3 className="card-title">Recommended Learning Path</h3>
                        <div className="row">
                            <div className="col-md-3">
                                <div className="mb-4">
                                    <h5 className="text-primary">
                                        <i className="bi bi-lightning-charge-fill me-2"></i>
                                        Immediate Steps
                                    </h5>
                                    <ul className="list-unstyled">
                                        {recommendations.learning_path?.immediate_next_steps.map((step, index) => (
                                            <li key={index} className="mb-2">
                                                <i className="bi bi-arrow-right text-muted me-2"></i>
                                                {step}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="mb-4">
                                    <h5 className="text-success">
                                        <i className="bi bi-calendar-check me-2"></i>
                                        30-Day Goals
                                    </h5>
                                    <ul className="list-unstyled">
                                        {recommendations.learning_path?.["30_day_goals"].map((goal, index) => (
                                            <li key={index} className="mb-2">
                                                <i className="bi bi-arrow-right text-muted me-2"></i>
                                                {goal}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="mb-4">
                                    <h5 className="text-info">
                                        <i className="bi bi-calendar2-week me-2"></i>
                                        90-Day Goals
                                    </h5>
                                    <ul className="list-unstyled">
                                        {recommendations.learning_path?.["90_day_goals"].map((goal, index) => (
                                            <li key={index} className="mb-2">
                                                <i className="bi bi-arrow-right text-muted me-2"></i>
                                                {goal}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="mb-4">
                                    <h5 className="text-warning">
                                        <i className="bi bi-calendar3 me-2"></i>
                                        6-Month Goals
                                    </h5>
                                    <ul className="list-unstyled">
                                        {recommendations.learning_path?.["6_month_goals"].map((goal, index) => (
                                            <li key={index} className="mb-2">
                                                <i className="bi bi-arrow-right text-muted me-2"></i>
                                                {goal}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card mb-4">
                    <div className="card-body">
                        <h3 className="card-title mb-4">Learning Resources</h3>
                        
                        <h4 className="h5 mb-3">
                            <i className="bi bi-mortarboard-fill text-primary me-2"></i>
                            Recommended Courses
                        </h4>
                        <div className="row mb-4">
                            {recommendations.recommended_resources?.courses.map((course, index) => (
                                <div key={index} className="col-md-6 mb-3">
                                    <div className="card h-100 border-primary border-start border-3">
                                        <div className="card-body">
                                            <h5 className="h6 mb-2">
                                                <a href={course.url} target="_blank" rel="noopener noreferrer" 
                                                   className="text-decoration-none">
                                                    {course.title}
                                                    <i className="bi bi-box-arrow-up-right ms-2 small"></i>
                                                </a>
                                            </h5>
                                            <p className="mb-2 small">{course.description}</p>
                                            <div className="d-flex justify-content-between">
                                                <small className="text-muted">
                                                    <i className="bi bi-clock me-1"></i> {course.duration}
                                                </small>
                                                <small className="text-muted">
                                                    <i className="bi bi-currency-dollar me-1"></i> {course.cost}
                                                </small>
                                            </div>
                                            <div className="mt-2">
                                                <span className="badge bg-light text-dark">{course.platform}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <h4 className="h5 mb-3">
                            <i className="bi bi-book-fill text-success me-2"></i>
                            Recommended Books
                        </h4>
                        <div className="row mb-4">
                            {recommendations.recommended_resources?.books.map((book, index) => (
                                <div key={index} className="col-md-6 mb-3">
                                    <div className="card h-100 border-success border-start border-3">
                                        <div className="card-body">
                                            <h5 className="h6 mb-2">
                                                <a href={book.url} target="_blank" rel="noopener noreferrer" 
                                                   className="text-decoration-none">
                                                    {book.title}
                                                    <i className="bi bi-box-arrow-up-right ms-2 small"></i>
                                                </a>
                                            </h5>
                                            <p className="mb-2 small">
                                                <i className="bi bi-person me-1"></i> By {book.author}
                                            </p>
                                            <p className="mb-0 small">{book.description}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="row">
                            <div className="col-md-6">
                                <h4 className="h5 mb-3">
                                    <i className="bi bi-globe text-info me-2"></i>
                                    Online Resources
                                </h4>
                                {recommendations.recommended_resources?.online_resources.map((resource, index) => (
                                    <div key={index} className="card mb-3 border-info border-start border-3">
                                        <div className="card-body">
                                            <h5 className="h6 mb-2">
                                                <a href={resource.url} target="_blank" rel="noopener noreferrer" 
                                                   className="text-decoration-none">
                                                    {resource.title}
                                                    <i className="bi bi-box-arrow-up-right ms-2 small"></i>
                                                </a>
                                            </h5>
                                            <p className="mb-2 small">{resource.description}</p>
                                            <span className="badge bg-light text-dark">{resource.type}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="col-md-6">
                                <h4 className="h5 mb-3">
                                    <i className="bi bi-people-fill text-warning me-2"></i>
                                    Professional Communities
                                </h4>
                                {recommendations.recommended_resources?.communities.map((community, index) => (
                                    <div key={index} className="card mb-3 border-warning border-start border-3">
                                        <div className="card-body">
                                            <h5 className="h6 mb-2">
                                                <a href={community.url} target="_blank" rel="noopener noreferrer" 
                                                   className="text-decoration-none">
                                                    {community.name}
                                                    <i className="bi bi-box-arrow-up-right ms-2 small"></i>
                                                </a>
                                            </h5>
                                            <p className="mb-2 small">{community.why_join}</p>
                                            <span className="badge bg-light text-dark">{community.platform}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card mb-4">
                    <div className="card-body">
                        <h3 className="card-title mb-4">
                            <i className="bi bi-award-fill text-danger me-2"></i>
                            Recommended Certifications
                        </h3>
                        <div className="row">
                            {recommendations.certification_recommendations?.map((cert, index) => (
                                <div key={index} className="col-md-4 mb-3">
                                    <div className="card h-100 border-danger border-start border-3">
                                        <div className="card-body">
                                            <h5 className="h6 mb-2">
                                                <a href={cert.url} target="_blank" rel="noopener noreferrer" 
                                                   className="text-decoration-none">
                                                    {cert.name}
                                                    <i className="bi bi-box-arrow-up-right ms-2 small"></i>
                                                </a>
                                            </h5>
                                            <p className="mb-2 small">
                                                <i className="bi bi-building me-1"></i> Provider: {cert.provider}
                                            </p>
                                            <div className="d-flex justify-content-between">
                                                <small className="text-muted">
                                                    <i className="bi bi-clock me-1"></i> {cert.duration}
                                                </small>
                                                <small className="text-muted">
                                                    <i className="bi bi-currency-dollar me-1"></i> {cert.cost}
                                                </small>
                                            </div>
                                            <div className="mt-2">
                                                <span className="badge bg-secondary">{cert.difficulty}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="card mb-4">
                    <div className="card-body">
                        <div className="row">
                            <div className="col-md-6">
                                <h4 className="h5">
                                    <i className="bi bi-calendar-range me-2"></i>
                                    Estimated Timeline
                                </h4>
                                <p className="mb-0">{recommendations.timeline_months} months</p>
                            </div>
                            <div className="col-md-6">
                                <h4 className="h5">
                                    <i className="bi bi-hourglass-split me-2"></i>
                                    Weekly Commitment
                                </h4>
                                <p className="mb-0">{recommendations.estimated_study_hours_per_week} hours per week</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-center mb-5">
                    <button className="btn btn-primary me-2" onClick={handlePrint}>
                        <i className="bi bi-printer me-2"></i>
                        Print Results
                    </button>
                    <button className="btn btn-outline-secondary" onClick={handleRetake}>
                        <i className="bi bi-arrow-repeat me-2"></i>
                        Start New Assessment
                    </button>
                </div>

                {renderAssessmentHistory()}
            </div>
        );
    }

    const question = questions[currentQuestion];
    return (
        <div className="container mt-5">
            <div className="card shadow">
                <div className="card-body">
                    <div className="progress mb-3">
                        <div
                            className="progress-bar"
                            role="progressbar"
                            style={{ width: `${(currentQuestion / questions.length) * 100}%` }}
                        >
                            {currentQuestion + 1} / {questions.length}
                        </div>
                    </div>
                    <h3>Question {currentQuestion + 1}</h3>
                    <p className="lead">{question.question}</p>
                    <div className="d-grid gap-2">
                        {question.options.map((option, index) => (
                            <button
                                key={index}
                                className="btn btn-outline-primary text-start"
                                onClick={() => handleAnswer(index)}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                    <div className="mt-3">
                        <small className="text-muted">
                            Difficulty: {question.difficulty} | Category: {question.category}
                        </small>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Add this function to generate fallback recommendations when the server is unavailable
const generateFallbackRecommendations = (career, weakCategories) => {
    const careerType = career.toLowerCase();
    let domain = "general";
    
    if (careerType.includes('develop') || careerType.includes('program') || careerType.includes('engineer')) {
        domain = "software";
    } else if (careerType.includes('data') || careerType.includes('analyst')) {
        domain = "data";
    } else if (careerType.includes('design')) {
        domain = "design";
    }
    
    const recommendations = {
        software: {
            score_analysis: {
                overall_score: 70,
                interpretation: "Your score indicates a good foundation in software development.",
                percentile: "Above average"
            },
            summary: "You have a solid understanding of software development concepts. Focus on strengthening your knowledge in specific areas.",
            strengths: [
                "Understanding of programming fundamentals",
                "Problem-solving skills",
                "Technical knowledge"
            ],
            areas_for_improvement: weakCategories.map(cat => `Improving ${cat}`),
            job_description: {
                title: "Software Developer",
                description: "Software developers design, build, and maintain computer programs. They identify user needs, write and test new software, and ensure software functions properly.",
                responsibilities: [
                    "Write clean, efficient code based on specifications",
                    "Test and debug programs",
                    "Improve existing software",
                    "Collaborate with cross-functional teams",
                    "Document software specifications"
                ],
                required_skills: [
                    "Proficiency in programming languages (JavaScript, Python, etc.)",
                    "Understanding of data structures and algorithms",
                    "Problem-solving abilities",
                    "Knowledge of software development methodologies",
                    "Version control systems"
                ],
                salary_range: "$70,000 - $120,000 depending on location and experience",
                career_path: "Senior Developer → Team Lead → Software Architect → CTO"
            },
            recommended_resources: {
                courses: [
                    "Advanced JavaScript - Frontend Masters",
                    "Data Structures and Algorithms - Coursera",
                    "System Design - Educative.io"
                ],
                books: [
                    "Clean Code by Robert C. Martin",
                    "Design Patterns by Erich Gamma et al.",
                    "The Pragmatic Programmer by Andrew Hunt and David Thomas"
                ],
                online_resources: [
                    "MDN Web Docs",
                    "Stack Overflow",
                    "GitHub"
                ],
                communities: [
                    "Dev.to",
                    "Reddit r/programming",
                    "Hashnode"
                ]
            },
            learning_path: {
                immediate_next_steps: [
                    "Complete a project using your target technology stack",
                    "Contribute to an open-source project",
                    "Practice coding challenges on LeetCode or HackerRank"
                ],
                "30_day_goals": [
                    "Build a portfolio website",
                    "Learn a new programming language",
                    "Complete an online course"
                ],
                "90_day_goals": [
                    "Develop a full-stack application",
                    "Learn about cloud services",
                    "Improve your system design skills"
                ],
                "6_month_goals": [
                    "Become proficient in a specialized area",
                    "Prepare for technical interviews",
                    "Build a complex project"
                ]
            },
            certification_recommendations: [
                "AWS Certified Developer",
                "Microsoft Certified: Azure Developer Associate",
                "Google Associate Cloud Engineer"
            ],
            timeline_months: 6,
            estimated_study_hours_per_week: 10
        },
        data: {
            // Similar structure for data science
            score_analysis: {
                overall_score: 70,
                interpretation: "Your score indicates a good foundation in data analysis.",
                percentile: "Above average"
            },
            summary: "You have a solid understanding of data concepts. Focus on strengthening your knowledge in specific areas.",
            strengths: [
                "Data manipulation skills",
                "Statistical knowledge",
                "Analytical thinking"
            ],
            areas_for_improvement: weakCategories.map(cat => `Improving ${cat}`),
            job_description: {
                title: "Data Analyst/Scientist",
                description: "Data analysts/scientists collect, process, and analyze data to help organizations make better decisions. They use statistical methods and machine learning to extract insights from complex datasets.",
                responsibilities: [
                    "Collect and clean data from various sources",
                    "Perform statistical analysis",
                    "Create data visualizations and dashboards",
                    "Build predictive models",
                    "Communicate findings to stakeholders"
                ],
                required_skills: [
                    "Proficiency in Python, R, or SQL",
                    "Statistical analysis",
                    "Data visualization",
                    "Machine learning fundamentals",
                    "Domain knowledge"
                ],
                salary_range: "$75,000 - $140,000 depending on location and experience",
                career_path: "Senior Data Scientist → Lead Data Scientist → Chief Data Officer"
            },
            recommended_resources: {
                courses: [
                    "Data Science Specialization - Coursera",
                    "Machine Learning - Stanford Online",
                    "SQL for Data Analysis - Udacity"
                ],
                books: [
                    "Python for Data Analysis by Wes McKinney",
                    "The Art of Statistics by David Spiegelhalter",
                    "Storytelling with Data by Cole Nussbaumer Knaflic"
                ],
                online_resources: [
                    "Kaggle",
                    "Towards Data Science",
                    "DataCamp"
                ],
                communities: [
                    "Reddit r/datascience",
                    "Data Science Central",
                    "Cross Validated (Stack Exchange)"
                ]
            },
            learning_path: {
                immediate_next_steps: [
                    "Complete a data analysis project",
                    "Learn SQL for data manipulation",
                    "Practice with real datasets"
                ],
                "30_day_goals": [
                    "Master data visualization techniques",
                    "Learn a data analysis library",
                    "Complete an online course"
                ],
                "90_day_goals": [
                    "Build a machine learning model",
                    "Learn about big data technologies",
                    "Improve your statistical analysis skills"
                ],
                "6_month_goals": [
                    "Specialize in a specific area of data science",
                    "Prepare for data science interviews",
                    "Build a complex data project"
                ]
            },
            certification_recommendations: [
                "Microsoft Certified: Azure Data Scientist Associate",
                "Google Professional Data Engineer",
                "IBM Data Science Professional Certificate"
            ],
            timeline_months: 6,
            estimated_study_hours_per_week: 10
        },
        design: {
            // Similar structure for design
            score_analysis: {
                overall_score: 70,
                interpretation: "Your score indicates a good foundation in design.",
                percentile: "Above average"
            },
            summary: "You have a solid understanding of design principles. Focus on strengthening your knowledge in specific areas.",
            strengths: [
                "Visual design skills",
                "User-centered thinking",
                "Creative problem-solving"
            ],
            areas_for_improvement: weakCategories.map(cat => `Improving ${cat}`),
            job_description: {
                title: "UX/UI Designer",
                description: "UX/UI designers create user-friendly interfaces and experiences for digital products. They combine visual design with user research to create intuitive and engaging products.",
                responsibilities: [
                    "Create wireframes and prototypes",
                    "Conduct user research and testing",
                    "Design visual elements and interfaces",
                    "Collaborate with developers and stakeholders",
                    "Iterate designs based on feedback"
                ],
                required_skills: [
                    "Proficiency in design tools (Figma, Sketch, Adobe XD)",
                    "Understanding of user-centered design principles",
                    "Visual design skills",
                    "Prototyping",
                    "Basic understanding of HTML/CSS"
                ],
                salary_range: "$65,000 - $120,000 depending on location and experience",
                career_path: "Senior Designer → Design Lead → Creative Director"
            },
            recommended_resources: {
                courses: [
                    "UI/UX Design Specialization - Coursera",
                    "Interaction Design Foundation Courses",
                    "Design Thinking - IDEO U"
                ],
                books: [
                    "Don't Make Me Think by Steve Krug",
                    "The Design of Everyday Things by Don Norman",
                    "Thinking with Type by Ellen Lupton"
                ],
                online_resources: [
                    "Dribbble",
                    "Behance",
                    "UX Collective"
                ],
                communities: [
                    "Designer News",
                    "Reddit r/userexperience",
                    "Figma Community"
                ]
            },
            learning_path: {
                immediate_next_steps: [
                    "Create a design portfolio",
                    "Learn a design tool like Figma or Sketch",
                    "Practice user research techniques"
                ],
                "30_day_goals": [
                    "Redesign a website or app",
                    "Learn about accessibility",
                    "Complete an online design course"
                ],
                "90_day_goals": [
                    "Conduct user testing",
                    "Learn about design systems",
                    "Improve your prototyping skills"
                ],
                "6_month_goals": [
                    "Specialize in a specific area of design",
                    "Prepare for design interviews",
                    "Build a comprehensive design project"
                ]
            },
            certification_recommendations: [
                "Certified User Experience Professional (CUXP)",
                "Interaction Design Foundation Certification",
                "Google UX Design Professional Certificate"
            ],
            timeline_months: 6,
            estimated_study_hours_per_week: 10
        },
        general: {
            // General career recommendations
            score_analysis: {
                overall_score: 70,
                interpretation: "Your score indicates a good foundation in your field.",
                percentile: "Above average"
            },
            summary: "You have a solid understanding of your field. Focus on strengthening your knowledge in specific areas.",
            strengths: [
                "Professional knowledge",
                "Problem-solving skills",
                "Technical competence"
            ],
            areas_for_improvement: weakCategories.map(cat => `Improving ${cat}`),
            job_description: {
                title: career,
                description: `A ${career} professional is responsible for applying specialized knowledge and skills in their field to solve problems and achieve organizational goals.`,
                responsibilities: [
                    "Apply specialized knowledge to work tasks",
                    "Stay current with industry developments",
                    "Collaborate with team members",
                    "Solve complex problems",
                    "Communicate effectively with stakeholders"
                ],
                required_skills: [
                    "Technical knowledge relevant to the field",
                    "Communication skills",
                    "Problem-solving abilities",
                    "Time management",
                    "Adaptability"
                ],
                salary_range: "Varies by location, industry, and experience level",
                career_path: "Senior Professional → Team Lead → Department Manager → Executive"
            },
            recommended_resources: {
                courses: [
                    "Professional Development Courses - LinkedIn Learning",
                    "Industry-specific certifications",
                    "Communication Skills - Coursera"
                ],
                books: [
                    "Deep Work by Cal Newport",
                    "Atomic Habits by James Clear",
                    "The 7 Habits of Highly Effective People by Stephen Covey"
                ],
                online_resources: [
                    "Industry blogs and publications",
                    "Professional association websites",
                    "LinkedIn"
                ],
                communities: [
                    "Professional networking groups",
                    "Industry-specific forums",
                    "Alumni networks"
                ]
            },
            learning_path: {
                immediate_next_steps: [
                    "Update your resume and LinkedIn profile",
                    "Identify skill gaps in your field",
                    "Network with professionals in your industry"
                ],
                "30_day_goals": [
                    "Complete a professional development course",
                    "Attend an industry event or webinar",
                    "Read an industry-specific book"
                ],
                "90_day_goals": [
                    "Obtain a relevant certification",
                    "Take on a challenging project at work",
                    "Develop leadership skills"
                ],
                "6_month_goals": [
                    "Become an expert in a specialized area",
                    "Prepare for career advancement",
                    "Build a professional portfolio"
                ]
            },
            certification_recommendations: [
                "Project Management Professional (PMP)",
                "Industry-specific certifications",
                "Leadership and management certifications"
            ],
            timeline_months: 6,
            estimated_study_hours_per_week: 10
        }
    };
    
    return recommendations[domain];
};

export default Results; 