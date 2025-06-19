import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, Link, useLocation } from 'react-router-dom';
import 'antd/dist/reset.css';
import Login from './components/Login';
import Signup from './components/Signup';
import Quiz from './components/Quiz';
import Results from './components/Results';
import LandingPage from './components/LandingPage';
import Profile from './components/Profile';
import MillionDollarIdeas from './components/MillionDollarIdeas';
import InterviewPrep from './components/InterviewPrep';
import CareerCoach from './components/CareerCoach';
import Portfolio from './components/Portfolio';
import LearningDashboard from './components/LearningDashboard';
import CareerTimeline from './components/CareerTimeline';
import SubscriptionPlans from './components/SubscriptionPlans';
import OfflineIndicator from './components/common/OfflineIndicator';
import Subscription from './components/Subscription';
import SubscriptionDashboard from './components/SubscriptionDashboard';
import JobCorner from './components/JobCorner';
import './App.css';
import './print.css';
import config from './config';

// Add NavLink component before the App component
const NavLink = ({ to, children, icon }) => {
    const location = useLocation();
    const isActive = location.pathname === to;
    
    return (
        <Link 
            className={`nav-link ${isActive ? 'active' : ''}`} 
            to={to}
        >
            {icon && <i className={`bi ${icon} me-2`}></i>}
            {children}
        </Link>
    );
};

function App() {
  const [career, setCareer] = useState('');
  const [experience, setExperience] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [serverConnected, setServerConnected] = useState(false);
  const [serverConnectionError, setServerConnectionError] = useState('');
  const [isCheckingServer, setIsCheckingServer] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessages, setLoadingMessages] = useState([
    "Analyzing your answers...",
    "Identifying your strengths...",
    "Finding areas for improvement...",
    "Creating personalized recommendations...",
    "Building your learning path...",
    "Almost there..."
  ]);
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [user, setUser] = useState(localStorage.getItem('username'));
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [tokenRefreshInterval, setTokenRefreshInterval] = useState(null);

  // Global loading and error handling
  const showGlobalLoading = () => setGlobalLoading(true);
  const hideGlobalLoading = () => setGlobalLoading(false);
  const showGlobalError = (message) => {
    setGlobalError(message);
    // Auto-hide error after 5 seconds
    setTimeout(() => setGlobalError(''), 5000);
  };

  // Notification system
  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // Create a global context for loading, errors, and notifications
  const globalContext = {
    showLoading: showGlobalLoading,
    hideLoading: hideGlobalLoading,
    showError: showGlobalError,
    addNotification
  };

  // Check server connection on component mount
  useEffect(() => {
    const checkServer = async () => {
      setIsCheckingServer(true);
      try {
        // Set offline mode by default for now
        setServerConnected(false);
        setServerConnectionError('Server connection not available in this deployment.');
        setIsOfflineMode(true);
      } catch (error) {
        console.error('Failed to connect to server:', error);
        setServerConnected(false);
        setServerConnectionError('Could not connect to server. Please make sure the server is running.');
        setIsOfflineMode(true);
      } finally {
        setIsCheckingServer(false);
      }
    };

    checkServer();

    // Set up an interval to periodically check the server connection
    const intervalId = setInterval(checkServer, 30000); // Check every 30 seconds

    // Also check for online/offline status
    const handleOnline = () => {
      console.log('Browser is online');
      checkServer();
    };

    const handleOffline = () => {
      console.log('Browser is offline');
      setServerConnected(false);
      setIsOfflineMode(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Clean up the interval and event listeners on component unmount
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Loading animation effect
  useEffect(() => {
    let interval;
    if (loading && showCelebration) {
      interval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 1;
        });

        if (loadingProgress % 20 === 0) {
          setCurrentLoadingMessage(prev => (prev + 1) % loadingMessages.length);
        }
      }, 50);
    }
    return () => clearInterval(interval);
  }, [loading, showCelebration, loadingProgress, loadingMessages.length]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!serverConnected) {
      setError('No connection to server. Please refresh the page.');
      return;
    }
    setLoading(true);
    setError('');
    setQuestions([]);
    setAnswers([]);
    setShowResults(false);
    setRecommendations(null);

    try {
      const response = await fetch(`${config.API_URL}/api/generate-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ career, experience })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.questions || !Array.isArray(data.questions)) {
        throw new Error('Invalid response format from server');
      }

      // Validate questions format
      data.questions.forEach((q, index) => {
        if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || 
            typeof q.correctAnswer !== 'number' || !q.difficulty || !q.category) {
          throw new Error(`Invalid question format at index ${index}`);
        }
      });

      setQuestions(data.questions);
      setQuizStarted(true);
    } catch (error) {
      setError(`Failed to generate questions: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (selectedOption) => {
    const newAnswers = [...answers, selectedOption];
    setAnswers(newAnswers);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Show celebration animation before calculating results
      setShowCelebration(true);
      setLoadingProgress(0);
      calculateResults(newAnswers);
    }
  };

  const calculateResults = async (finalAnswers) => {
    setLoading(true);
    try {
      if (finalAnswers.length !== questions.length) {
        throw new Error('Answer count does not match question count');
      }

      const correctAnswers = finalAnswers.filter(
        (answer, index) => answer === questions[index].correctAnswer
      );
      const score = Math.round((correctAnswers.length / questions.length) * 100);

      // Calculate weak categories
      const categoryResults = questions.reduce((acc, q, index) => {
        if (!acc[q.category]) {
          acc[q.category] = { total: 0, correct: 0 };
        }
        acc[q.category].total++;
        if (finalAnswers[index] === q.correctAnswer) {
          acc[q.category].correct++;
        }
        return acc;
      }, {});

      const weakCategories = Object.entries(categoryResults)
        .filter(([_, stats]) => (stats.correct / stats.total) < 0.7)
        .map(([category]) => category);

      const response = await fetch(`${config.API_URL}/api/generate-recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          career,
          experience,
          score,
          weakCategories: weakCategories.length > 0 ? weakCategories : ['general knowledge']
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (!data.content || !data.content[0] || !data.content[0].text) {
        throw new Error('Invalid recommendations format from server');
      }

      const recommendations = JSON.parse(data.content[0].text);
      
      // Validate and fix URLs if needed
      if (recommendations.recommended_resources) {
        const fixUrl = (url) => {
          if (!url) return '#';
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return 'https://' + url;
          }
          return url;
        };
        
        if (recommendations.recommended_resources.courses) {
          recommendations.recommended_resources.courses.forEach(course => {
            course.url = fixUrl(course.url);
          });
        }
        
        if (recommendations.recommended_resources.books) {
          recommendations.recommended_resources.books.forEach(book => {
            book.url = fixUrl(book.url);
          });
        }
        
        if (recommendations.recommended_resources.online_resources) {
          recommendations.recommended_resources.online_resources.forEach(resource => {
            resource.url = fixUrl(resource.url);
          });
        }
        
        if (recommendations.recommended_resources.communities) {
          recommendations.recommended_resources.communities.forEach(community => {
            community.url = fixUrl(community.url);
          });
        }
      }
      
      if (recommendations.certification_recommendations) {
        recommendations.certification_recommendations.forEach(cert => {
          cert.url = cert.url ? (cert.url.startsWith('http') ? cert.url : 'https://' + cert.url) : '#';
        });
      }
      
      setRecommendations(recommendations);
      
      // Delay showing results to allow for celebration animation
      setTimeout(() => {
        setShowResults(true);
        setShowCelebration(false);
        setLoading(false);
      }, 5000);
      
    } catch (error) {
      setError(`Failed to generate recommendations: ${error.message}`);
      setShowCelebration(false);
      setLoading(false);
    }
  };

  const resetQuiz = () => {
    // Clear state
    setQuizStarted(false);
    setCurrentQuestion(0);
    setAnswers([]);
    setShowResults(false);
    setRecommendations(null);
    setQuestions([]);
    setShowCelebration(false);
    
    // Clear localStorage
    localStorage.removeItem('quizResults');
    localStorage.removeItem('quizState');
    localStorage.removeItem('currentQuestion');
    localStorage.removeItem('answers');
    
    // Navigate to quiz with a parameter indicating we're starting fresh
    window.location.href = '/quiz?fromResults=true';
  };

  const handlePrint = () => {
    window.print();
  };

  // Add the missing handleSaveReport function
  const handleSaveReport = async () => {
    try {
      showGlobalLoading();
      
      const token = localStorage.getItem('token');
      if (!token) {
        showGlobalError('Please log in to save your report');
        hideGlobalLoading();
        return;
      }

      const reportData = {
        career,
        experience,
        timestamp: new Date().toISOString(),
        score: recommendations.score_analysis.overall_score,
        recommendations,
        answers
      };

      const response = await fetch(`${config.API_URL}/api/save-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(reportData)
      });

      if (!response.ok) {
        throw new Error('Failed to save report');
      }

      // Show success notification
      addNotification('Report saved successfully!', 'success');
      hideGlobalLoading();
    } catch (error) {
      console.error('Error saving report:', error);
      showGlobalError(`Failed to save report: ${error.message}`);
      hideGlobalLoading();
    }
  };

  // Enhanced login handler with refresh token support
  const handleLogin = (token, refreshToken, username) => {
    localStorage.setItem('token', token);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('username', username);
    setIsAuthenticated(true);
    setUser(username);
    
    // Set up token refresh interval
    setupTokenRefresh();
    
    // Add notification
    addNotification(`Welcome back, ${username}!`, 'success');
  };

  // Set up token refresh interval
  const setupTokenRefresh = () => {
    // Clear any existing interval
    if (tokenRefreshInterval) {
      clearInterval(tokenRefreshInterval);
    }
    
    // Set up new interval to refresh token every 45 minutes (token expires in 1 hour)
    const interval = setInterval(refreshToken, 45 * 60 * 1000);
    setTokenRefreshInterval(interval);
  };

  // Refresh the access token
  const refreshToken = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        // No refresh token, log out
        handleLogout();
        return;
      }
      
      // Try to detect the server first
      await config.detectServer();
      
      const response = await fetch(`${config.API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });
      
      if (!response.ok) {
        // Refresh token is invalid, log out
        handleLogout();
        return;
      }
      
      const data = await response.json();
      
      // Update the access token
      localStorage.setItem('token', data.token);
      
      console.log('Access token refreshed successfully');
    } catch (error) {
      console.error('Error refreshing token:', error);
      // Don't log out on network errors, will try again later
    }
  };

  // Enhanced logout handler
  const handleLogout = async () => {
    try {
      // Clear token refresh interval
      if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
        setTokenRefreshInterval(null);
      }
      
      // Try to notify the server about logout
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken && navigator.onLine) {
        try {
          await fetch(`${config.API_URL}/api/auth/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ refreshToken })
          });
        } catch (error) {
          console.error('Error logging out on server:', error);
          // Continue with local logout even if server logout fails
        }
      }
      
      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('username');
      
      // Update state
      setIsAuthenticated(false);
      setUser(null);
      
      // Add notification
      addNotification('You have been logged out successfully', 'info');
    } catch (error) {
      console.error('Error during logout:', error);
      showGlobalError('Error during logout. Please try again.');
    }
  };

  // Check for token expiration on component mount
  useEffect(() => {
    const checkTokenExpiration = () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      try {
        // Decode the JWT token
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const { exp } = JSON.parse(jsonPayload);
        const currentTime = Math.floor(Date.now() / 1000);
        
        // If token is expired or about to expire in the next 5 minutes
        if (exp - currentTime < 300) {
          console.log('Token is expired or about to expire, refreshing...');
          refreshToken();
        }
        
        // Set up token refresh interval
        setupTokenRefresh();
      } catch (error) {
        console.error('Error checking token expiration:', error);
        // Token is invalid, log out
        handleLogout();
      }
    };
    
    // Check token expiration on mount
    if (isAuthenticated) {
      checkTokenExpiration();
    }
    
    // Clean up interval on unmount
    return () => {
      if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
      }
    };
  }, [isAuthenticated]);

  // Celebration and loading screen
  if (showCelebration) {
    return (
      <div className="container mt-5 text-center">
        <div className="celebration-container">
          <h2 className="mb-4">Assessment Complete! 🎉</h2>
          
          <div className="progress mb-4" style={{ height: "30px" }}>
            <div 
              className="progress-bar progress-bar-striped progress-bar-animated" 
              role="progressbar" 
              style={{ width: `${loadingProgress}%` }}
              aria-valuenow={loadingProgress}
              aria-valuemin="0"
              aria-valuemax="100"
            >
              {loadingProgress}%
            </div>
          </div>
          
          <div className="loading-message mb-4">
            <h4>{loadingMessages[currentLoadingMessage]}</h4>
          </div>
          
          <div className="confetti">
            {[...Array(20)].map((_, i) => (
              <div 
                key={i} 
                className="confetti-piece" 
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 5}s`,
                  backgroundColor: `hsl(${Math.random() * 360}, 100%, 50%)`
                }}
              ></div>
            ))}
          </div>
          
          <div className="spinner-grow text-primary mx-2" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <div className="spinner-grow text-success mx-2" role="status" style={{animationDelay: "0.2s"}}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <div className="spinner-grow text-warning mx-2" role="status" style={{animationDelay: "0.4s"}}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <div className="spinner-grow text-danger mx-2" role="status" style={{animationDelay: "0.6s"}}>
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  // Results page
  if (showResults && recommendations) {
    return (
      <div className="container mt-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1>Assessment Results</h1>
          <div className="no-print">
            <button onClick={handlePrint} className="btn btn-outline-primary me-2">
              <i className="bi bi-printer"></i> Print Results
            </button>
            <button onClick={resetQuiz} className="btn btn-outline-secondary">
              <i className="bi bi-arrow-repeat"></i> Start New Assessment
            </button>
          </div>
        </div>

        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h2 className="card-title h4 mb-4">Score Analysis</h2>
            <div className="row">
              <div className="col-md-4 text-center mb-3">
                <div className="display-4">{recommendations.score_analysis.overall_score}%</div>
                <div className="text-muted">Overall Score</div>
              </div>
              <div className="col-md-4 text-center mb-3">
                <div className="display-4">{recommendations.score_analysis.percentile}</div>
                <div className="text-muted">Percentile</div>
              </div>
              <div className="col-md-4">
                <p className="mb-0">{recommendations.score_analysis.interpretation}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2 className="card-title h4 mb-0">Job Description: {career}</h2>
              <button 
                onClick={() => handleSaveReport()} 
                className="btn btn-success btn-sm"
              >
                <i className="bi bi-save me-2"></i>
                Save Report
              </button>
            </div>
            
            {recommendations.job_description && (
              <>
                <div className="row mb-4">
                  <div className="col-md-8">
                    <h5 className="h6 mb-3">Overview</h5>
                    <p>{recommendations.job_description.overview}</p>
                  </div>
                  <div className="col-md-4">
                    <div className="card bg-light">
                      <div className="card-body">
                        <h6 className="card-title">Quick Facts</h6>
                        <ul className="list-unstyled mb-0">
                          <li className="mb-2">
                            <i className="bi bi-cash me-2 text-success"></i>
                            Salary Range: {recommendations.job_description.salary_range}
                          </li>
                          <li className="mb-2">
                            <i className="bi bi-graph-up-arrow me-2 text-primary"></i>
                            Growth Rate: {recommendations.job_description.growth_rate}
                          </li>
                          <li className="mb-2">
                            <i className="bi bi-briefcase me-2 text-info"></i>
                            Work Environment: {recommendations.job_description.work_environment}
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <h5 className="h6 mb-3">Key Responsibilities</h5>
                    <ul className="list-unstyled">
                      {recommendations.job_description.responsibilities.map((resp, index) => (
                        <li key={index} className="mb-2">
                          <i className="bi bi-check2-circle me-2 text-success"></i>
                          {resp}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="col-md-6">
                    <h5 className="h6 mb-3">Required Skills</h5>
                    <div className="row">
                      <div className="col-md-6">
                        <h6 className="small text-muted mb-2">Technical Skills</h6>
                        <ul className="list-unstyled">
                          {recommendations.job_description.required_skills.technical.map((skill, index) => (
                            <li key={index} className="mb-2">
                              <i className="bi bi-code-slash me-2 text-primary"></i>
                              {skill}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="col-md-6">
                        <h6 className="small text-muted mb-2">Soft Skills</h6>
                        <ul className="list-unstyled">
                          {recommendations.job_description.required_skills.soft.map((skill, index) => (
                            <li key={index} className="mb-2">
                              <i className="bi bi-person-check me-2 text-info"></i>
                              {skill}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <h5 className="h6 mb-3">Industry Trends</h5>
                  <div className="row">
                    {recommendations.job_description.industry_trends.map((trend, index) => (
                      <div key={index} className="col-md-4 mb-3">
                        <div className="card h-100 border-info border-start border-3">
                          <div className="card-body">
                            <h6 className="card-title small">{trend.title}</h6>
                            <p className="card-text small mb-0">{trend.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="row mb-4">
          <div className="col-md-6">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h3 className="h5 mb-3">Your Strengths</h3>
                {recommendations.strengths.map((strength, index) => (
                  <div key={index} className="mb-3 p-3 bg-light rounded">
                    <h4 className="h6 text-success">
                      <i className="bi bi-star-fill me-2"></i>
                      {strength.area}
                    </h4>
                    <p className="mb-2">{strength.details}</p>
                    <small className="text-muted">
                      <strong>How to leverage:</strong> {strength.how_to_leverage}
                    </small>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h3 className="h5 mb-3">Areas for Improvement</h3>
                {recommendations.areas_for_improvement.map((area, index) => (
                  <div key={index} className="mb-3 p-3 bg-light rounded">
                    <h4 className="h6 text-warning">
                      <i className="bi bi-arrow-up-circle-fill me-2"></i>
                      {area.area}
                    </h4>
                    <div className="d-flex justify-content-between mb-2">
                      <small>Current: {area.current_level}</small>
                      <small>Target: {area.target_level}</small>
                    </div>
                    <p className="mb-2"><small>{area.importance}</small></p>
                    <ul className="list-unstyled mb-0">
                      {area.action_items.map((item, i) => (
                        <li key={i}><small><i className="bi bi-check-circle me-1"></i> {item}</small></li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h3 className="h5 mb-4">Recommended Learning Path</h3>
            <div className="row">
              <div className="col-md-3">
                <h4 className="h6">
                  <i className="bi bi-lightning-charge-fill me-2 text-primary"></i>
                  Immediate Steps
                </h4>
                <ul className="list-unstyled">
                  {recommendations.learning_path.immediate_next_steps.map((step, index) => (
                    <li key={index} className="mb-2"><i className="bi bi-arrow-right-short"></i> {step}</li>
                  ))}
                </ul>
              </div>
              <div className="col-md-3">
                <h4 className="h6">
                  <i className="bi bi-calendar-check me-2 text-success"></i>
                  30-Day Goals
                </h4>
                <ul className="list-unstyled">
                  {recommendations.learning_path['30_day_goals'].map((goal, index) => (
                    <li key={index} className="mb-2"><i className="bi bi-arrow-right-short"></i> {goal}</li>
                  ))}
                </ul>
              </div>
              <div className="col-md-3">
                <h4 className="h6">
                  <i className="bi bi-calendar2-week me-2 text-info"></i>
                  90-Day Goals
                </h4>
                <ul className="list-unstyled">
                  {recommendations.learning_path['90_day_goals'].map((goal, index) => (
                    <li key={index} className="mb-2"><i className="bi bi-arrow-right-short"></i> {goal}</li>
                  ))}
                </ul>
              </div>
              <div className="col-md-3">
                <h4 className="h6">
                  <i className="bi bi-calendar3 me-2 text-warning"></i>
                  6-Month Goals
                </h4>
                <ul className="list-unstyled">
                  {recommendations.learning_path['6_month_goals'].map((goal, index) => (
                    <li key={index} className="mb-2"><i className="bi bi-arrow-right-short"></i> {goal}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h3 className="h5 mb-4">Learning Resources</h3>
            
            <h4 className="h6 mb-3">
              <i className="bi bi-mortarboard-fill me-2 text-primary"></i>
              Recommended Courses
            </h4>
            <div className="row mb-4">
              {recommendations.recommended_resources.courses.map((course, index) => (
                <div key={index} className="col-md-6 mb-3">
                  <div className="card h-100 border-primary border-top-0 border-end-0 border-bottom-0 border-3">
                    <div className="card-body">
                      <h5 className="h6 mb-2">
                        <a href={course.url} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                          <i className="bi bi-play-circle me-2"></i>
                          {course.title}
                          <i className="bi bi-box-arrow-up-right ms-2 small"></i>
                        </a>
                      </h5>
                      <p className="mb-2"><small>{course.description}</small></p>
                      <div className="d-flex justify-content-between">
                        <small className="text-muted"><i className="bi bi-clock me-1"></i> {course.duration}</small>
                        <small className="text-muted"><i className="bi bi-currency-dollar me-1"></i> {course.cost}</small>
                      </div>
                      <div className="mt-2">
                        <span className="badge bg-light text-dark">{course.platform}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <h4 className="h6 mb-3">
              <i className="bi bi-book-fill me-2 text-success"></i>
              Recommended Books
            </h4>
            <div className="row mb-4">
              {recommendations.recommended_resources.books.map((book, index) => (
                <div key={index} className="col-md-6 mb-3">
                  <div className="card h-100 border-success border-top-0 border-end-0 border-bottom-0 border-3">
                    <div className="card-body">
                      <h5 className="h6 mb-2">
                        <a href={book.url} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                          <i className="bi bi-book me-2"></i>
                          {book.title}
                          <i className="bi bi-box-arrow-up-right ms-2 small"></i>
                        </a>
                      </h5>
                      <p className="mb-2"><small><i className="bi bi-person me-1"></i> By {book.author}</small></p>
                      <p className="mb-0"><small>{book.description}</small></p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <h4 className="h6 mb-3">
              <i className="bi bi-globe me-2 text-info"></i>
              Online Resources & Communities
            </h4>
            <div className="row">
              <div className="col-md-6">
                <div className="card h-100 border-info border-top-0 border-end-0 border-bottom-0 border-3">
                  <div className="card-body">
                    <h5 className="h6 mb-3">Learning Resources</h5>
                    {recommendations.recommended_resources.online_resources.map((resource, index) => (
                      <div key={index} className="mb-3">
                        <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                          <i className={`bi ${resource.type.toLowerCase().includes('video') ? 'bi-play-btn' : 'bi-file-earmark-text'} me-2`}></i>
                          {resource.title}
                          <i className="bi bi-box-arrow-up-right ms-2 small"></i>
                        </a>
                        <p className="mb-1"><small>{resource.description}</small></p>
                        <small className="text-muted"><i className="bi bi-tag me-1"></i> {resource.type}</small>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card h-100 border-warning border-top-0 border-end-0 border-bottom-0 border-3">
                  <div className="card-body">
                    <h5 className="h6 mb-3">Professional Communities</h5>
                    {recommendations.recommended_resources.communities.map((community, index) => (
                      <div key={index} className="mb-3">
                        <a href={community.url} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                          <i className="bi bi-people-fill me-2"></i>
                          {community.name}
                          <i className="bi bi-box-arrow-up-right ms-2 small"></i>
                        </a>
                        <p className="mb-1"><small>{community.why_join}</small></p>
                        <small className="text-muted"><i className="bi bi-building me-1"></i> {community.platform}</small>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h3 className="h5 mb-4">
              <i className="bi bi-award me-2 text-danger"></i>
              Recommended Certifications
            </h3>
            <div className="row">
              {recommendations.certification_recommendations.map((cert, index) => (
                <div key={index} className="col-md-4 mb-3">
                  <div className="card h-100 border-danger border-top-0 border-end-0 border-bottom-0 border-3">
                    <div className="card-body">
                      <h5 className="h6 mb-2">
                        <a href={cert.url} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                          <i className="bi bi-patch-check me-2"></i>
                          {cert.name}
                          <i className="bi bi-box-arrow-up-right ms-2 small"></i>
                        </a>
                      </h5>
                      <p className="mb-2"><small><i className="bi bi-building me-1"></i> Provider: {cert.provider}</small></p>
                      <div className="d-flex justify-content-between">
                        <small className="text-muted"><i className="bi bi-clock me-1"></i> {cert.duration}</small>
                        <small className="text-muted"><i className="bi bi-currency-dollar me-1"></i> {cert.cost}</small>
                      </div>
                      <span className="badge bg-secondary mt-2">{cert.difficulty}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <h4 className="h6"><i className="bi bi-calendar-range me-2"></i> Estimated Timeline</h4>
                <p className="mb-0">{recommendations.timeline_months} months</p>
              </div>
              <div className="col-md-6">
                <h4 className="h6"><i className="bi bi-hourglass-split me-2"></i> Weekly Commitment</h4>
                <p className="mb-0">{recommendations.estimated_study_hours_per_week} hours per week</p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mb-5 no-print">
          <button onClick={handlePrint} className="btn btn-primary me-2">
            <i className="bi bi-printer"></i> Print Results
          </button>
          <button onClick={resetQuiz} className="btn btn-outline-secondary">
            <i className="bi bi-arrow-repeat"></i> Start New Assessment
          </button>
        </div>
      </div>
    );
  }

  if (quizStarted && questions.length > 0) {
    const question = questions[currentQuestion];
    return (
      <div className="container mt-5">
        <div className="progress mb-3">
          <div 
            className="progress-bar" 
            role="progressbar" 
            style={{ width: `${(currentQuestion / questions.length) * 100}%` }}
            aria-valuenow={(currentQuestion / questions.length) * 100}
            aria-valuemin="0"
            aria-valuemax="100"
          >
            {currentQuestion + 1} / {questions.length}
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h5 className="card-title">Question {currentQuestion + 1}</h5>
            <p className="card-text">{question.question}</p>
            
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

  if (!serverConnected && !isCheckingServer && !isOfflineMode) {
    return (
      <div className="container mt-5 text-center">
        <div className="alert alert-warning alert-dismissible fade show m-0" role="alert">
          <strong>Server Connection Issue:</strong> {serverConnectionError || 'Unable to connect to the server. Some features may not work properly.'}
          <button 
            type="button" 
            className="btn-close" 
            data-bs-dismiss="alert" 
            aria-label="Close"
            onClick={() => setServerConnectionError('')}
          ></button>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        {/* Global loading indicator */}
        {globalLoading && (
          <div className="global-loading">
            <div className="spinner-container">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2">Loading...</p>
            </div>
          </div>
        )}

        {/* Global error message */}
        {globalError && (
          <div className="global-error alert alert-danger alert-dismissible fade show m-0" role="alert">
            <strong>Error:</strong> {globalError}
            <button 
              type="button" 
              className="btn-close" 
              onClick={() => setGlobalError('')}
              aria-label="Close"
            ></button>
          </div>
        )}

        {/* Notifications */}
        <div className="notification-container">
          {notifications.map(notification => (
            <div 
              key={notification.id} 
              className={`alert alert-${notification.type} alert-dismissible fade show`}
              role="alert"
            >
              {notification.message}
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                aria-label="Close"
              ></button>
            </div>
          ))}
        </div>

        {/* Offline mode indicator */}
        {isOfflineMode && <OfflineIndicator />}

        {isAuthenticated && (
          <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
            <div className="container">
              <Link className="navbar-brand" to="/">CareerForge AI</Link>
              <button 
                className="navbar-toggler" 
                type="button" 
                data-bs-toggle="collapse" 
                data-bs-target="#navbarNav"
              >
                <span className="navbar-toggler-icon"></span>
              </button>
              <div className="collapse navbar-collapse" id="navbarNav">
                <ul className="navbar-nav me-auto">
                  <li className="nav-item">
                    <NavLink to="/quiz" icon="bi-clipboard-check">
                      Take Assessment
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <NavLink to="/profile" icon="bi-person-circle">
                      My Profile
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <NavLink to="/subscription" icon="bi-credit-card">
                      Subscription
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <NavLink to="/subscription-dashboard" icon="bi-graph-up-arrow">
                      Subscription Dashboard
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <NavLink to="/million-dollar-ideas" icon="bi-lightbulb">
                      Million $ Ideas
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <NavLink to="/interview-prep" icon="bi-camera-video">
                      Interview Prep
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <NavLink to="/career-coach" icon="bi-person-workspace">
                      AI Career Coach
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <NavLink to="/portfolio" icon="bi-briefcase">
                      Portfolio Builder
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <NavLink to="/learning-dashboard" icon="bi-mortarboard">
                      Learning Dashboard
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <NavLink to="/career-timeline" icon="bi-graph-up">
                      Career Timeline
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <NavLink to="/job-corner" icon="bi-briefcase-fill">
                      Job Corner
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <NavLink to="/connections" icon="bi-people-fill">
                      Connections
                    </NavLink>
                  </li>
                </ul>
                <div className="d-flex align-items-center">
                  <Link to="/profile" className="text-light text-decoration-none me-3">
                    <i className="bi bi-person-circle me-2"></i>
                    {user}
                  </Link>
                  <button className="btn btn-outline-light" onClick={handleLogout}>
                    <i className="bi bi-box-arrow-right me-2"></i>
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </nav>
        )}

        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={
            !isAuthenticated ? (
              <Login onLogin={handleLogin} />
            ) : (
              <Navigate to="/profile" replace />
            )
          } />
          <Route path="/signup" element={
            !isAuthenticated ? (
              <Signup onSignup={handleLogin} />
            ) : (
              <Navigate to="/profile" replace />
            )
          } />
          <Route path="/quiz" element={
            <ProtectedRoute>
              <Quiz />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          <Route path="/results" element={
            <ProtectedRoute>
              <Results />
            </ProtectedRoute>
          } />
          <Route path="/million-dollar-ideas" element={
            <ProtectedRoute requireSubscription>
              <MillionDollarIdeas />
            </ProtectedRoute>
          } />
          <Route path="/interview-prep" element={
            <ProtectedRoute requireSubscription>
              <InterviewPrep />
            </ProtectedRoute>
          } />
          <Route path="/career-coach" element={
            <ProtectedRoute requireSubscription>
              <CareerCoach />
            </ProtectedRoute>
          } />
          <Route path="/portfolio" element={
            <ProtectedRoute requireSubscription>
              <Portfolio />
            </ProtectedRoute>
          } />
          <Route path="/learning-dashboard" element={
            <ProtectedRoute requireSubscription>
              <LearningDashboard />
            </ProtectedRoute>
          } />
          <Route path="/career-timeline" element={
            <ProtectedRoute requireSubscription>
              <CareerTimeline />
            </ProtectedRoute>
          } />
          <Route path="/job-corner" element={
            <ProtectedRoute>
              <JobCorner />
            </ProtectedRoute>
          } />
          <Route path="/connections" element={
            isAuthenticated ? (
              <div className="container mt-5">
                <div className="card shadow">
                  <div className="card-body">
                    <h2 className="card-title mb-4">Connections</h2>
                    <p className="card-text">This feature is coming soon! Here you'll be able to connect with mentors, peers, and industry professionals.</p>
                    <div className="alert alert-info">
                      <i className="bi bi-info-circle me-2"></i>
                      We're building a networking platform to help you expand your professional connections and find opportunities for collaboration and mentorship.
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <Navigate to="/login" replace />
            )
          } />
          <Route path="/subscription" element={
            <ProtectedRoute>
              <Subscription />
            </ProtectedRoute>
          } />
          <Route path="/subscription-dashboard" element={
            <ProtectedRoute>
              <SubscriptionDashboard />
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </Router>
  );
}

// Add global styles for loading, errors, and notifications
const globalStyles = `
.global-loading {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.spinner-container {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.global-error {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 9998;
  margin: 0;
  border-radius: 0;
}

.notification-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9997;
  max-width: 300px;
}

.notification-container .alert {
  margin-bottom: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
`;

// Add the global styles to the document
const styleElement = document.createElement('style');
styleElement.innerHTML = globalStyles;
document.head.appendChild(styleElement);

// Protected route component with subscription check
const ProtectedRoute = ({ children, requireSubscription = false }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                setIsAuthenticated(false);
                setLoading(false);
                return;
            }

            try {
                // Check subscription status if required
                if (requireSubscription) {
                    const response = await fetch(`${config.API_URL}/api/subscription/user`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        setSubscription(data);
                    }
                }
            } catch (error) {
                console.error('Error checking subscription:', error);
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, [requireSubscription]);

    if (loading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (requireSubscription && (!subscription || subscription.status !== 'active')) {
        return <Navigate to="/subscription" replace />;
    }

    return children;
};

export default App;
