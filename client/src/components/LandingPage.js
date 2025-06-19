import React from 'react';
import { Link } from 'react-router-dom';
import PricingTable from './PricingTable';
import './LandingPage.css';

function LandingPage() {
    return (
        <div className="landing-page">
            {/* Hero Section */}
            <section className="hero-section text-light py-5">
                <div className="container">
                    <div className="row align-items-center">
                        <div className="col-lg-6">
                            <h1 className="display-4 fw-bold mb-4">
                                Forge Your Future,<br />
                                <span className="text-primary">Powered by AI</span>
                            </h1>
                            <p className="lead mb-4">
                                Transform your career journey with CareerForge AI. 
                                Leverage cutting-edge artificial intelligence to assess, plan, 
                                and accelerate your professional growth.
                            </p>
                            <div className="d-flex gap-3">
                                <Link to="/signup" className="btn btn-primary btn-lg">
                                    Get Started Free
                                </Link>
                                <Link to="/login" className="btn btn-outline-light btn-lg">
                                    Sign In
                                </Link>
                            </div>
                            <div className="mt-4 stats-container">
                                <div className="row g-3">
                                    <div className="col-4">
                                        <div className="stat-item">
                                            <h3>50K+</h3>
                                            <p>Career Paths</p>
                                        </div>
                                    </div>
                                    <div className="col-4">
                                        <div className="stat-item">
                                            <h3>98%</h3>
                                            <p>Success Rate</p>
                                        </div>
                                    </div>
                                    <div className="col-4">
                                        <div className="stat-item">
                                            <h3>24/7</h3>
                                            <p>AI Support</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-lg-6">
                            <div className="hero-illustration">
                                <svg width="100%" height="400" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
                                    {/* Career Growth Path */}
                                    <path d="M100,500 Q400,100 700,500" stroke="#4CAF50" strokeWidth="4" fill="none"/>
                                    
                                    {/* Career Milestones */}
                                    <circle cx="100" cy="500" r="20" fill="#1976D2"/>
                                    <circle cx="300" cy="300" r="20" fill="#1976D2"/>
                                    <circle cx="500" cy="300" r="20" fill="#1976D2"/>
                                    <circle cx="700" cy="500" r="20" fill="#1976D2"/>
                                    
                                    {/* AI Elements */}
                                    <g transform="translate(350,250)">
                                        <rect x="-40" y="-40" width="80" height="80" fill="#3F51B5" rx="10"/>
                                        <circle cx="0" cy="0" r="25" fill="#FFF"/>
                                        <path d="M-15,0 L15,0 M0,-15 L0,15" stroke="#3F51B5" strokeWidth="4"/>
                                    </g>
                                    
                                    {/* Career Icons */}
                                    <g transform="translate(150,450)">
                                        <circle cx="0" cy="0" r="30" fill="#E91E63"/>
                                        <path d="M-15,-15 L15,15 M-15,15 L15,-15" stroke="#FFF" strokeWidth="4"/>
                                    </g>
                                    
                                    <g transform="translate(600,450)">
                                        <circle cx="0" cy="0" r="30" fill="#FF9800"/>
                                        <path d="M0,-15 L0,15 M-15,0 L15,0" stroke="#FFF" strokeWidth="4"/>
                                    </g>
                                    
                                    {/* Decorative Elements */}
                                    <circle cx="200" cy="200" r="10" fill="#4CAF50"/>
                                    <circle cx="600" cy="200" r="10" fill="#4CAF50"/>
                                    <circle cx="400" cy="400" r="10" fill="#4CAF50"/>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features-section py-5">
                <div className="container">
                    <div className="text-center mb-5">
                        <h2 className="display-5 fw-bold">Comprehensive Career Development Suite</h2>
                        <p className="lead text-muted">All the tools you need to build a successful career</p>
                    </div>

                    <div className="row g-4">
                        {/* AI Career Assessment */}
                        <div className="col-md-4 mb-4">
                            <div className="feature-card">
                                <div className="icon-container mb-4">
                                    <i className="bi bi-clipboard-data"></i>
                                </div>
                                <h3>CareerForge AI Assessment</h3>
                                <p>
                                    Our AI-powered assessment analyzes your skills, experience, and preferences
                                    to provide personalized career recommendations and insights.
                                </p>
                            </div>
                        </div>

                        {/* AI Interview Prep */}
                        <div className="col-md-6 col-lg-4">
                            <div className="feature-card h-100">
                                <div className="icon-wrapper bg-success text-white">
                                    <i className="bi bi-camera-video"></i>
                                </div>
                                <h3>AI Interview Preparation</h3>
                                <p>Practice with our AI-powered interview simulator. Get real-time feedback 
                                   on your responses, body language, and presentation.</p>
                                <Link to="/interview-prep" className="btn btn-outline-success mt-auto">
                                    Start Practice
                                </Link>
                            </div>
                        </div>

                        {/* Career Coach */}
                        <div className="col-md-6 col-lg-4">
                            <div className="feature-card h-100">
                                <div className="icon-wrapper bg-info text-white">
                                    <i className="bi bi-person-workspace"></i>
                                </div>
                                <h3>AI Career Coach</h3>
                                <p>Get 24/7 guidance from your personal AI career coach. Set goals, 
                                   track progress, and receive continuous support.</p>
                                <Link to="/career-coach" className="btn btn-outline-info mt-auto">
                                    Meet Your Coach
                                </Link>
                            </div>
                        </div>

                        {/* Portfolio Builder */}
                        <div className="col-md-6 col-lg-4">
                            <div className="feature-card h-100">
                                <div className="icon-wrapper bg-warning text-white">
                                    <i className="bi bi-briefcase"></i>
                                </div>
                                <h3>Smart Portfolio Builder</h3>
                                <p>Create stunning professional portfolios with AI-powered content suggestions 
                                   and modern templates.</p>
                                <Link to="/portfolio" className="btn btn-outline-warning mt-auto">
                                    Build Portfolio
                                </Link>
                            </div>
                        </div>

                        {/* Learning Dashboard */}
                        <div className="col-md-6 col-lg-4">
                            <div className="feature-card h-100">
                                <div className="icon-wrapper bg-danger text-white">
                                    <i className="bi bi-mortarboard"></i>
                                </div>
                                <h3>Learning Dashboard</h3>
                                <p>Track your skill development, certifications, and learning progress 
                                   with personalized recommendations.</p>
                                <Link to="/learning-dashboard" className="btn btn-outline-danger mt-auto">
                                    Start Learning
                                </Link>
                            </div>
                        </div>

                        {/* Business Ideas */}
                        <div className="col-md-6 col-lg-4">
                            <div className="feature-card h-100">
                                <div className="icon-wrapper bg-purple text-white">
                                    <i className="bi bi-lightbulb"></i>
                                </div>
                                <h3>Million Dollar Ideas</h3>
                                <p>Generate innovative business ideas tailored to your skills and interests. 
                                   Get market analysis and implementation plans.</p>
                                <Link to="/million-dollar-ideas" className="btn btn-outline-purple mt-auto">
                                    Generate Ideas
                                </Link>
                            </div>
                        </div>
                        
                        {/* Career Timeline - NEW */}
                        <div className="col-md-6 col-lg-4">
                            <div className="feature-card h-100">
                                <div className="icon-wrapper bg-primary text-white">
                                    <i className="bi bi-graph-up"></i>
                                </div>
                                <h3>Career Timeline</h3>
                                <p>Visualize your career journey, set milestones, and plan your professional 
                                   growth with our interactive timeline tool.</p>
                                <Link to="/career-timeline" className="btn btn-outline-primary mt-auto">
                                    View Timeline
                                </Link>
                            </div>
                        </div>
                        
                        {/* Job Corner - NEW */}
                        <div className="col-md-6 col-lg-4">
                            <div className="feature-card h-100">
                                <div className="icon-wrapper bg-secondary text-white">
                                    <i className="bi bi-briefcase-fill"></i>
                                </div>
                                <h3>Job Corner</h3>
                                <p>Discover personalized job opportunities, track applications, and get 
                                   AI-powered insights to improve your chances of landing your dream job.</p>
                                <Link to="/job-corner" className="btn btn-outline-secondary mt-auto">
                                    Explore Jobs
                                </Link>
                            </div>
                        </div>
                        
                        {/* Connections - NEW */}
                        <div className="col-md-6 col-lg-4">
                            <div className="feature-card h-100">
                                <div className="icon-wrapper bg-success text-white">
                                    <i className="bi bi-people-fill"></i>
                                </div>
                                <h3>Connections</h3>
                                <p>Build your professional network, connect with mentors and peers, and 
                                   collaborate on career development opportunities.</p>
                                <Link to="/connections" className="btn btn-outline-success mt-auto">
                                    Network Now
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="how-it-works py-5 bg-light">
                <div className="container">
                    <div className="text-center mb-5">
                        <h2 className="display-5 fw-bold">How CareerForge AI Works</h2>
                        <p className="lead text-muted">Your journey to career success in six simple steps</p>
                    </div>

                    <div className="row g-4">
                        <div className="col-md-4 mb-4">
                            <div className="card h-100 border-0 shadow-sm">
                                <div className="card-body text-center p-4">
                                    <div className="feature-icon mb-3">
                                        <i className="bi bi-clipboard-data"></i>
                                    </div>
                                    <h5 className="card-title">Assessment</h5>
                                    <p>Take our comprehensive CareerForge AI assessment to understand your potential</p>
                                    <Link to="/quiz" className="btn btn-outline-primary mt-3">Start Assessment</Link>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="step-card text-center">
                                <div className="step-number">2</div>
                                <h4>Planning</h4>
                                <p>Get a personalized career roadmap and development plan</p>
                                <Link to="/career-timeline" className="btn btn-outline-primary mt-3">Create Timeline</Link>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="step-card text-center">
                                <div className="step-number">3</div>
                                <h4>Development</h4>
                                <p>Build skills and prepare for opportunities with AI guidance</p>
                                <Link to="/learning-dashboard" className="btn btn-outline-primary mt-3">Start Learning</Link>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="step-card text-center">
                                <div className="step-number">4</div>
                                <h4>Preparation</h4>
                                <p>Practice interviews and build your professional portfolio</p>
                                <Link to="/interview-prep" className="btn btn-outline-primary mt-3">Practice Now</Link>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="step-card text-center">
                                <div className="step-number">5</div>
                                <h4>Networking</h4>
                                <p>Connect with professionals and explore job opportunities</p>
                                <Link to="/connections" className="btn btn-outline-primary mt-3">Start Networking</Link>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="step-card text-center">
                                <div className="step-number">6</div>
                                <h4>Achievement</h4>
                                <p>Land your dream job and continue growing your career</p>
                                <Link to="/job-corner" className="btn btn-outline-primary mt-3">Find Jobs</Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section className="testimonials py-5">
                <div className="container">
                    <div className="text-center mb-5">
                        <h2 className="display-5 fw-bold">Success Stories</h2>
                        <p className="lead text-muted">Join thousands of professionals who transformed their careers</p>
                    </div>

                    <div className="row g-4">
                        <div className="col-md-4">
                            <div className="testimonial-card">
                                <div className="testimonial-content">
                                    <p>"CareerForge AI helped me transition from marketing to UX design. 
                                       The AI coach and learning recommendations were invaluable."</p>
                                </div>
                                <div className="testimonial-author">
                                    <img 
                                        src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50'%3E%3Crect width='50' height='50' fill='%23E91E63'/%3E%3Ctext x='25' y='30' font-family='Arial' font-size='20' fill='white' text-anchor='middle'%3ES%3C/text%3E%3C/svg%3E"
                                        alt="Sarah M." 
                                        className="testimonial-avatar" 
                                    />
                                    <div>
                                        <h5>Sarah M.</h5>
                                        <p>UX Designer at Google</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="testimonial-card">
                                <div className="testimonial-content">
                                    <p>"The interview preparation feature is amazing! I landed my dream job 
                                       after practicing with the AI interviewer."</p>
                                </div>
                                <div className="testimonial-author">
                                    <img 
                                        src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50'%3E%3Crect width='50' height='50' fill='%233F51B5'/%3E%3Ctext x='25' y='30' font-family='Arial' font-size='20' fill='white' text-anchor='middle'%3EJ%3C/text%3E%3C/svg%3E"
                                        alt="James R." 
                                        className="testimonial-avatar" 
                                    />
                                    <div>
                                        <h5>James R.</h5>
                                        <p>Software Engineer at Microsoft</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="testimonial-card">
                                <div className="testimonial-content">
                                    <p>"The Million Dollar Ideas feature helped me identify and launch my 
                                       successful startup. Now I'm my own boss!"</p>
                                </div>
                                <div className="testimonial-author">
                                    <img 
                                        src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50'%3E%3Crect width='50' height='50' fill='%234CAF50'/%3E%3Ctext x='25' y='30' font-family='Arial' font-size='20' fill='white' text-anchor='middle'%3EE%3C/text%3E%3C/svg%3E"
                                        alt="Emily C." 
                                        className="testimonial-avatar" 
                                    />
                                    <div>
                                        <h5>Emily C.</h5>
                                        <p>Founder & CEO, TechStart</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* New testimonials for the new features */}
                        <div className="col-md-4">
                            <div className="testimonial-card">
                                <div className="testimonial-content">
                                    <p>"The Career Timeline feature helped me visualize my long-term goals and break them down 
                                       into achievable milestones. I'm now on track for a leadership role!"</p>
                                </div>
                                <div className="testimonial-author">
                                    <img 
                                        src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50'%3E%3Crect width='50' height='50' fill='%23FF9800'/%3E%3Ctext x='25' y='30' font-family='Arial' font-size='20' fill='white' text-anchor='middle'%3EM%3C/text%3E%3C/svg%3E"
                                        alt="Michael T." 
                                        className="testimonial-avatar" 
                                    />
                                    <div>
                                        <h5>Michael T.</h5>
                                        <p>Product Manager at Amazon</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="col-md-4">
                            <div className="testimonial-card">
                                <div className="testimonial-content">
                                    <p>"The Job Corner feature matched me with opportunities I wouldn't have found otherwise. 
                                       The AI-powered application tips helped me stand out from other candidates."</p>
                                </div>
                                <div className="testimonial-author">
                                    <img 
                                        src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50'%3E%3Crect width='50' height='50' fill='%239C27B0'/%3E%3Ctext x='25' y='30' font-family='Arial' font-size='20' fill='white' text-anchor='middle'%3EA%3C/text%3E%3C/svg%3E"
                                        alt="Aisha K." 
                                        className="testimonial-avatar" 
                                    />
                                    <div>
                                        <h5>Aisha K.</h5>
                                        <p>Data Scientist at Netflix</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="col-md-4">
                            <div className="testimonial-card">
                                <div className="testimonial-content">
                                    <p>"The Connections feature introduced me to mentors in my field who provided 
                                       invaluable guidance. The networking opportunities have been game-changing for my career."</p>
                                </div>
                                <div className="testimonial-author">
                                    <img 
                                        src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50'%3E%3Crect width='50' height='50' fill='%2300BCD4'/%3E%3Ctext x='25' y='30' font-family='Arial' font-size='20' fill='white' text-anchor='middle'%3ED%3C/text%3E%3C/svg%3E"
                                        alt="David L." 
                                        className="testimonial-avatar" 
                                    />
                                    <div>
                                        <h5>David L.</h5>
                                        <p>Marketing Director at Spotify</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section className="pricing-section py-5 bg-light">
                <div className="container">
                    <div className="text-center mb-5">
                        <h2 className="display-5 fw-bold">Simple, Transparent Pricing</h2>
                        <p className="lead text-muted">Choose the plan that's right for you</p>
                    </div>
                    <PricingTable />
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-section text-light py-5">
                <div className="container text-center">
                    <h2 className="display-5 fw-bold mb-4">Ready to Forge Your Future?</h2>
                    <p className="lead mb-4">Join CareerForge AI today and take the first step towards your dream career</p>
                    <div className="d-flex justify-content-center gap-3">
                        <Link to="/signup" className="btn btn-primary btn-lg">
                            Get Started Free
                        </Link>
                        <Link to="/contact" className="btn btn-outline-light btn-lg">
                            Contact Sales
                        </Link>
                    </div>
                    <p className="mt-3">
                        <small>No credit card required • Free 14-day trial • Cancel anytime</small>
                    </p>
                </div>
            </section>
        </div>
    );
}

export default LandingPage; 