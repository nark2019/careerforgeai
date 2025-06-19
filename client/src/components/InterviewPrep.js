import React, { useState, useEffect, useRef } from 'react';
import config from '../config';

function InterviewPrep() {
    const [mode, setMode] = useState('select'); // select, prepare, interview, feedback
    const [jobRole, setJobRole] = useState('');
    const [experienceLevel, setExperienceLevel] = useState('');
    const [interviewType, setInterviewType] = useState('technical');
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState([]);
    const [feedback, setFeedback] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordedBlob, setRecordedBlob] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const mediaRecorderRef = useRef(null);
    const streamRef = useRef(null);
    const videoRef = useRef(null);

    useEffect(() => {
        return () => {
            // Cleanup video stream when component unmounts
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const startInterview = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${config.API_URL}/api/interview/questions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    jobRole,
                    experienceLevel,
                    interviewType
                })
            });

            if (!response.ok) {
                throw new Error('Failed to fetch interview questions');
            }

            const data = await response.json();
            setQuestions(data.questions);
            setCurrentQuestion(data.questions[0]);
            setMode('prepare');
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            streamRef.current = stream;
            videoRef.current.srcObject = stream;

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            const chunks = [];

            mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                setRecordedBlob(blob);
            };

            mediaRecorder.start();
            setIsRecording(true);
            setMode('interview');
        } catch (error) {
            setError('Failed to access camera and microphone');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            streamRef.current.getTracks().forEach(track => track.stop());
            setIsRecording(false);
        }
    };

    const submitAnswer = async () => {
        if (!recordedBlob) return;

        setLoading(true);
        const formData = new FormData();
        formData.append('video', recordedBlob);
        formData.append('question', JSON.stringify(currentQuestion));

        try {
            const response = await fetch(`${config.API_URL}/api/interview/analyze`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to analyze response');
            }

            const data = await response.json();
            const newAnswers = [...answers, {
                question: currentQuestion,
                feedback: data.feedback
            }];
            setAnswers(newAnswers);

            if (questions[questions.indexOf(currentQuestion) + 1]) {
                setCurrentQuestion(questions[questions.indexOf(currentQuestion) + 1]);
                setRecordedBlob(null);
                setMode('prepare');
            } else {
                // Interview complete
                generateFinalFeedback(newAnswers);
            }
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const generateFinalFeedback = async (allAnswers) => {
        setLoading(true);
        try {
            const response = await fetch(`${config.API_URL}/api/interview/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    answers: allAnswers,
                    jobRole,
                    experienceLevel,
                    interviewType
                })
            });

            if (!response.ok) {
                throw new Error('Failed to generate feedback');
            }

            const data = await response.json();
            setFeedback(data.feedback);
            setMode('feedback');
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="container mt-5 text-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-3">Processing your interview...</p>
            </div>
        );
    }

    return (
        <div className="container py-5">
            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}

            {mode === 'select' && (
                <div className="card shadow-sm">
                    <div className="card-body">
                        <h2 className="card-title h4 mb-4">AI Interview Preparation</h2>
                        <div className="row g-3">
                            <div className="col-md-6">
                                <label className="form-label">Job Role</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={jobRole}
                                    onChange={(e) => setJobRole(e.target.value)}
                                    placeholder="e.g., Software Engineer"
                                />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label">Experience Level</label>
                                <select
                                    className="form-select"
                                    value={experienceLevel}
                                    onChange={(e) => setExperienceLevel(e.target.value)}
                                >
                                    <option value="">Select level</option>
                                    <option value="entry">Entry Level</option>
                                    <option value="mid">Mid Level</option>
                                    <option value="senior">Senior Level</option>
                                </select>
                            </div>
                            <div className="col-12">
                                <label className="form-label">Interview Type</label>
                                <div className="d-flex gap-3">
                                    <div className="form-check">
                                        <input
                                            type="radio"
                                            className="form-check-input"
                                            name="interviewType"
                                            id="technical"
                                            value="technical"
                                            checked={interviewType === 'technical'}
                                            onChange={(e) => setInterviewType(e.target.value)}
                                        />
                                        <label className="form-check-label" htmlFor="technical">
                                            Technical
                                        </label>
                                    </div>
                                    <div className="form-check">
                                        <input
                                            type="radio"
                                            className="form-check-input"
                                            name="interviewType"
                                            id="behavioral"
                                            value="behavioral"
                                            checked={interviewType === 'behavioral'}
                                            onChange={(e) => setInterviewType(e.target.value)}
                                        />
                                        <label className="form-check-label" htmlFor="behavioral">
                                            Behavioral
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className="col-12">
                                <button
                                    className="btn btn-primary"
                                    onClick={startInterview}
                                    disabled={!jobRole || !experienceLevel}
                                >
                                    Start Interview Prep
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {mode === 'prepare' && currentQuestion && (
                <div className="card shadow-sm">
                    <div className="card-body">
                        <h3 className="h5 mb-4">Question {questions.indexOf(currentQuestion) + 1} of {questions.length}</h3>
                        <div className="mb-4">
                            <h4 className="h6">Question:</h4>
                            <p className="lead">{currentQuestion.question}</p>
                        </div>
                        <div className="mb-4">
                            <h4 className="h6">Tips:</h4>
                            <ul className="list-unstyled">
                                {currentQuestion.tips.map((tip, index) => (
                                    <li key={index} className="mb-2">
                                        <i className="bi bi-check-circle-fill text-success me-2"></i>
                                        {tip}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <button className="btn btn-primary" onClick={startRecording}>
                            <i className="bi bi-camera-video me-2"></i>
                            Start Recording Answer
                        </button>
                    </div>
                </div>
            )}

            {mode === 'interview' && (
                <div className="card shadow-sm">
                    <div className="card-body">
                        <div className="row">
                            <div className="col-md-8">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    muted
                                    className="w-100 rounded mb-3"
                                ></video>
                            </div>
                            <div className="col-md-4">
                                <div className="card bg-light">
                                    <div className="card-body">
                                        <h4 className="h6">Current Question:</h4>
                                        <p>{currentQuestion.question}</p>
                                        <div className="d-grid gap-2">
                                            <button
                                                className="btn btn-danger"
                                                onClick={stopRecording}
                                            >
                                                <i className="bi bi-stop-circle me-2"></i>
                                                Stop Recording
                                            </button>
                                            <button
                                                className="btn btn-primary"
                                                onClick={submitAnswer}
                                                disabled={!recordedBlob}
                                            >
                                                <i className="bi bi-check-circle me-2"></i>
                                                Submit Answer
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {mode === 'feedback' && feedback && (
                <div className="card shadow-sm">
                    <div className="card-body">
                        <h2 className="h4 mb-4">Interview Feedback</h2>
                        
                        <div className="row mb-4">
                            <div className="col-md-4">
                                <div className="card bg-light">
                                    <div className="card-body text-center">
                                        <h3 className="h5">Overall Score</h3>
                                        <div className="display-4 text-primary mb-2">
                                            {feedback.overallScore}%
                                        </div>
                                        <p className="text-muted mb-0">{feedback.scoreInterpretation}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-8">
                                <h3 className="h5 mb-3">Summary</h3>
                                <p>{feedback.summary}</p>
                            </div>
                        </div>

                        <div className="row mb-4">
                            <div className="col-md-6">
                                <h3 className="h5 mb-3">Strengths</h3>
                                <ul className="list-unstyled">
                                    {feedback.strengths.map((strength, index) => (
                                        <li key={index} className="mb-2">
                                            <i className="bi bi-check-circle-fill text-success me-2"></i>
                                            {strength}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="col-md-6">
                                <h3 className="h5 mb-3">Areas for Improvement</h3>
                                <ul className="list-unstyled">
                                    {feedback.improvements.map((improvement, index) => (
                                        <li key={index} className="mb-2">
                                            <i className="bi bi-arrow-up-circle-fill text-warning me-2"></i>
                                            {improvement}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="mb-4">
                            <h3 className="h5 mb-3">Detailed Feedback by Question</h3>
                            <div className="accordion">
                                {answers.map((answer, index) => (
                                    <div key={index} className="accordion-item">
                                        <h4 className="accordion-header">
                                            <button
                                                className="accordion-button collapsed"
                                                type="button"
                                                data-bs-toggle="collapse"
                                                data-bs-target={`#question${index}`}
                                            >
                                                Question {index + 1}: {answer.question.question}
                                            </button>
                                        </h4>
                                        <div
                                            id={`question${index}`}
                                            className="accordion-collapse collapse"
                                        >
                                            <div className="accordion-body">
                                                <div className="mb-3">
                                                    <h5 className="h6">Response Analysis:</h5>
                                                    <p>{answer.feedback.analysis}</p>
                                                </div>
                                                <div className="mb-3">
                                                    <h5 className="h6">What Went Well:</h5>
                                                    <ul className="list-unstyled">
                                                        {answer.feedback.positives.map((positive, i) => (
                                                            <li key={i} className="mb-2">
                                                                <i className="bi bi-check-circle-fill text-success me-2"></i>
                                                                {positive}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                                <div>
                                                    <h5 className="h6">Suggestions:</h5>
                                                    <ul className="list-unstyled">
                                                        {answer.feedback.suggestions.map((suggestion, i) => (
                                                            <li key={i} className="mb-2">
                                                                <i className="bi bi-lightbulb-fill text-warning me-2"></i>
                                                                {suggestion}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="d-flex gap-2">
                            <button
                                className="btn btn-primary"
                                onClick={() => {
                                    setMode('select');
                                    setQuestions([]);
                                    setAnswers([]);
                                    setFeedback(null);
                                }}
                            >
                                Start New Interview
                            </button>
                            <button className="btn btn-outline-primary" onClick={() => window.print()}>
                                <i className="bi bi-printer me-2"></i>
                                Print Feedback
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default InterviewPrep; 