import React, { useState } from 'react';
import config from '../config';

function CVUpgrade() {
    const [file, setFile] = useState(null);
    const [jobDescription, setJobDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [optimizedCV, setOptimizedCV] = useState(null);
    const [uploadStep, setUploadStep] = useState(1);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && (selectedFile.type === 'application/pdf' || 
            selectedFile.type === 'application/msword' || 
            selectedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
            setFile(selectedFile);
            setError('');
        } else {
            setError('Please upload a PDF or Word document');
            setFile(null);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setError('Please select a file');
            return;
        }

        setLoading(true);
        setError('');

        const formData = new FormData();
        formData.append('cv', file);
        formData.append('jobDescription', jobDescription);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${config.API_URL}/api/cv/optimize`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to optimize CV');
            }

            const data = await response.json();
            setOptimizedCV(data);
            setUploadStep(2);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveCV = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${config.API_URL}/api/cv/save`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    originalFileName: file.name,
                    optimizedCV
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save CV');
            }

            alert('CV saved successfully!');
        } catch (error) {
            setError('Failed to save CV: ' + error.message);
        }
    };

    const handleDownload = () => {
        const element = document.createElement('a');
        const file = new Blob([JSON.stringify(optimizedCV.content)], {type: 'application/json'});
        element.href = URL.createObjectURL(file);
        element.download = `optimized_${file.name}`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Optimized CV</title>
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
                    <style>
                        body { padding: 20px; }
                        @media print {
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        ${optimizedCV.content}
                    </div>
                    <button onclick="window.print()" class="btn btn-primary no-print mt-3">
                        Print CV
                    </button>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <div className="cv-upgrade">
            <div className="card shadow-sm">
                <div className="card-body">
                    <h3 className="card-title h5 mb-4">CV Upgrade Assistant</h3>

                    {uploadStep === 1 ? (
                        <div className="upload-section">
                            <div className="mb-4">
                                <label className="form-label">Upload your CV (PDF or Word)</label>
                                <div className="input-group">
                                    <input
                                        type="file"
                                        className="form-control"
                                        accept=".pdf,.doc,.docx"
                                        onChange={handleFileChange}
                                    />
                                </div>
                                <small className="text-muted">
                                    Supported formats: PDF, DOC, DOCX
                                </small>
                            </div>

                            <div className="mb-4">
                                <label className="form-label">Job Description</label>
                                <textarea
                                    className="form-control"
                                    rows="5"
                                    placeholder="Paste the job description here to optimize your CV accordingly..."
                                    value={jobDescription}
                                    onChange={(e) => setJobDescription(e.target.value)}
                                ></textarea>
                            </div>

                            {error && (
                                <div className="alert alert-danger" role="alert">
                                    {error}
                                </div>
                            )}

                            <button
                                className="btn btn-primary"
                                onClick={handleUpload}
                                disabled={loading || !file}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                        Optimizing...
                                    </>
                                ) : (
                                    'Optimize CV'
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="result-section">
                            <div className="mb-4">
                                <h4 className="h6">Optimization Results</h4>
                                <div className="alert alert-success">
                                    <i className="bi bi-check-circle-fill me-2"></i>
                                    Your CV has been optimized for the job description
                                </div>
                            </div>

                            <div className="card mb-4">
                                <div className="card-body">
                                    <h5 className="h6 mb-3">Improvements Made:</h5>
                                    <ul className="list-unstyled">
                                        {optimizedCV.improvements.map((improvement, index) => (
                                            <li key={index} className="mb-2">
                                                <i className="bi bi-arrow-right-circle me-2 text-success"></i>
                                                {improvement}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            <div className="card mb-4">
                                <div className="card-body">
                                    <h5 className="h6 mb-3">Keyword Matches:</h5>
                                    <div className="d-flex flex-wrap gap-2">
                                        {optimizedCV.keywords.map((keyword, index) => (
                                            <span key={index} className="badge bg-primary bg-opacity-10 text-primary">
                                                {keyword}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="card mb-4">
                                <div className="card-body">
                                    <h5 className="h6 mb-3">Optimized CV Preview:</h5>
                                    <div className="border rounded p-3 bg-light">
                                        <div dangerouslySetInnerHTML={{ __html: optimizedCV.content }}></div>
                                    </div>
                                </div>
                            </div>

                            <div className="d-flex gap-2">
                                <button className="btn btn-primary" onClick={handleSaveCV}>
                                    <i className="bi bi-save me-2"></i>
                                    Save CV
                                </button>
                                <button className="btn btn-outline-primary" onClick={handleDownload}>
                                    <i className="bi bi-download me-2"></i>
                                    Download
                                </button>
                                <button className="btn btn-outline-primary" onClick={handlePrint}>
                                    <i className="bi bi-printer me-2"></i>
                                    Print
                                </button>
                                <button 
                                    className="btn btn-outline-secondary" 
                                    onClick={() => {
                                        setUploadStep(1);
                                        setOptimizedCV(null);
                                        setFile(null);
                                        setJobDescription('');
                                    }}
                                >
                                    <i className="bi bi-arrow-repeat me-2"></i>
                                    Start Over
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default CVUpgrade; 