const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const dotenv = require('dotenv');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const { Readable } = require('stream');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const net = require('net');
const rateLimit = require('express-rate-limit');

// Load environment variables
dotenv.config();

const app = express();

// Function to find an available port
const findAvailablePort = (startPort, callback) => {
    let port = startPort;
    
    function checkPort(currentPort) {
        const server = net.createServer();
        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                // Port is in use, try the next one
                checkPort(currentPort + 1);
            } else {
                callback(err);
            }
        });
        
        server.once('listening', () => {
            // Port is available, close the server and return the port
            server.close(() => {
                callback(null, currentPort);
            });
        });
        
        server.listen(currentPort);
    }
    
    checkPort(port);
};

// Use a dynamic port
let PORT;

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'Origin', 'x-api-key']
}));

app.use(express.json());

// API Key validation
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Add better logging for the Anthropic API key
console.log('Checking Anthropic API key...');
if (!ANTHROPIC_API_KEY) {
    console.error('WARNING: ANTHROPIC_API_KEY is not set in environment variables');
} else {
    // Mask the API key for security in logs
    const maskedKey = ANTHROPIC_API_KEY.substring(0, 10) + '...' + ANTHROPIC_API_KEY.substring(ANTHROPIC_API_KEY.length - 5);
    console.log(`Anthropic API key is configured: ${maskedKey}`);
}

// Configure multer for video upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = './uploads';
        if (!fs.existsSync(uploadDir)){
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Not a video file'));
        }
    }
});

// Configure rate limiters
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 requests per windowMs for auth endpoints
    message: 'Too many authentication attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

const apiLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 100, // limit each IP to 100 requests per windowMs for API endpoints
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply rate limiting to auth endpoints
app.use('/api/auth', authLimiter);

// Apply rate limiting to all other API endpoints
app.use('/api', apiLimiter);

// Add security headers middleware
app.use((req, res, next) => {
    // Set security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; font-src 'self' https://cdn.jsdelivr.net; img-src 'self' data:;");
    next();
});

// Database setup
const db = new sqlite3.Database('./career_app.db', (err) => {
    if (err) {
        console.error('Error connecting to database:', err);
    } else {
        console.log('Connected to SQLite database');
        
        // Create tables if they don't exist
        db.serialize(() => {
        // Create users table if it doesn't exist
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            email TEXT UNIQUE,
            password TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Create reports table
        db.run(`CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            career TEXT,
            experience TEXT,
            timestamp DATETIME,
            score INTEGER,
                report_data TEXT, -- SQLite doesn't have a specific LONGTEXT type, but TEXT can store large amounts of data
            FOREIGN KEY (user_id) REFERENCES users (id)
        )`);

        // Create business_ideas table
        db.run(`CREATE TABLE IF NOT EXISTS business_ideas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            idea_data TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )`);

        // Create interviews table
        db.run(`CREATE TABLE IF NOT EXISTS interviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            job_role TEXT,
            interview_type TEXT,
            feedback TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )`);

        // Create learning_dashboard table
        db.run(`CREATE TABLE IF NOT EXISTS learning_dashboard (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            career_path TEXT,
            skills_data TEXT,
            goals_data TEXT,
            progress_data TEXT,
            resources_data TEXT,
            certificates_data TEXT,
            last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )`);

        // Create learning_activities table
        db.run(`CREATE TABLE IF NOT EXISTS learning_activities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            activity_type TEXT,
            activity_data TEXT,
            status TEXT,
            completion_date DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )`);

        // Create career_timeline table
        db.run(`CREATE TABLE IF NOT EXISTS career_timeline (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            current_role TEXT,
            target_role TEXT,
            timeline_data TEXT,
            salary_data TEXT,
            skills_roadmap TEXT,
            milestones TEXT,
            last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )`);

        // Create career_goals table
        db.run(`CREATE TABLE IF NOT EXISTS career_goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            timeline_id INTEGER,
            goal_type TEXT,
            goal_data TEXT,
            target_date DATE,
            status TEXT,
            progress INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (timeline_id) REFERENCES career_timeline (id)
        )`);

        // Create career_coach table
        db.run(`CREATE TABLE IF NOT EXISTS career_coach (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            conversation_history TEXT,
            user_profile TEXT,
            coaching_focus TEXT,
            last_check_in DATETIME,
            insights TEXT,
            action_items TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )`);

        // Create coach_messages table
        db.run(`CREATE TABLE IF NOT EXISTS coach_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            coach_id INTEGER,
            message_type TEXT,
            message_content TEXT,
            is_user_message BOOLEAN,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (coach_id) REFERENCES career_coach (id)
        )`);

        // Create portfolios table
        db.run(`CREATE TABLE IF NOT EXISTS portfolios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            title TEXT,
            description TEXT,
            template TEXT,
            theme TEXT,
            is_public BOOLEAN DEFAULT false,
            view_count INTEGER DEFAULT 0,
            custom_domain TEXT,
            meta_data TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )`);

        // Create portfolio_sections table
        db.run(`CREATE TABLE IF NOT EXISTS portfolio_sections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            portfolio_id INTEGER,
            section_type TEXT,
            title TEXT,
            content TEXT,
            display_order INTEGER,
            is_visible BOOLEAN DEFAULT true,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (portfolio_id) REFERENCES portfolios (id)
        )`);

        // Create portfolio_projects table
        db.run(`CREATE TABLE IF NOT EXISTS portfolio_projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            portfolio_id INTEGER,
            title TEXT,
            description TEXT,
            technologies TEXT,
            image_url TEXT,
            project_url TEXT,
            github_url TEXT,
            start_date TEXT,
            end_date TEXT,
            display_order INTEGER,
            is_featured BOOLEAN DEFAULT false,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (portfolio_id) REFERENCES portfolios (id)
        )`);

        // Create portfolio_skills table
        db.run(`CREATE TABLE IF NOT EXISTS portfolio_skills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            portfolio_id INTEGER,
            skill_name TEXT,
            skill_category TEXT,
            proficiency_level INTEGER,
            years_experience REAL,
            is_featured BOOLEAN DEFAULT false,
            display_order INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (portfolio_id) REFERENCES portfolios (id)
        )`);

        // Create portfolio_testimonials table
        db.run(`CREATE TABLE IF NOT EXISTS portfolio_testimonials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            portfolio_id INTEGER,
            author_name TEXT,
            author_title TEXT,
            author_company TEXT,
            content TEXT,
            rating INTEGER,
            is_verified BOOLEAN DEFAULT false,
            display_order INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (portfolio_id) REFERENCES portfolios (id)
        )`);

            // Create user_data table for storing component-specific data
            db.run(`CREATE TABLE IF NOT EXISTS user_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                component_type TEXT,
                data TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`);
            
            // Create subscription plans table
            db.run(`CREATE TABLE IF NOT EXISTS subscription_plans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                price DECIMAL(10,2) NOT NULL,
                billing_cycle TEXT NOT NULL,
                features TEXT NOT NULL,
                is_active BOOLEAN DEFAULT true,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Create user subscriptions table
            db.run(`CREATE TABLE IF NOT EXISTS user_subscriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                plan_id INTEGER NOT NULL,
                status TEXT NOT NULL,
                start_date DATETIME NOT NULL,
                end_date DATETIME,
                payment_method TEXT,
                last_payment_date DATETIME,
                next_payment_date DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (plan_id) REFERENCES subscription_plans (id)
            )`);

            // Create subscription features table
            db.run(`CREATE TABLE IF NOT EXISTS subscription_features (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                plan_id INTEGER NOT NULL,
                feature_name TEXT NOT NULL,
                feature_value TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (plan_id) REFERENCES subscription_plans (id)
            )`);

            // Insert default subscription plans
            db.run(`
                INSERT OR IGNORE INTO subscription_plans (name, description, price, billing_cycle, features)
                VALUES 
                ('Free', 'Basic career development tools', 0, 'monthly', ?),
                ('Pro', 'Advanced career development features', 19.99, 'monthly', ?),
                ('Enterprise', 'Complete career development suite', 49.99, 'monthly', ?)
            `, [
                JSON.stringify([
                    'Basic career assessment',
                    'Profile management',
                    'Limited AI recommendations',
                    'Basic CV optimization',
                    'Community access'
                ]),
                JSON.stringify([
                    'All Free features',
                    'Advanced AI career assessment',
                    'Unlimited AI recommendations',
                    'Advanced CV optimization',
                    'AI interview preparation',
                    'Career timeline',
                    'Learning dashboard',
                    'Priority support'
                ]),
                JSON.stringify([
                    'All Pro features',
                    'Unlimited AI career coaching',
                    'Advanced portfolio builder',
                    'Team collaboration tools',
                    'Custom integrations',
                    'Dedicated support',
                    'API access',
                    'Custom branding'
                ])
            ]);

            // Create learning dashboard tables
            db.run(`CREATE TABLE IF NOT EXISTS user_courses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                course_title TEXT NOT NULL,
                course_description TEXT,
                provider TEXT,
                url TEXT,
                status TEXT DEFAULT 'in_progress',
                start_date TEXT,
                completed_at TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`);
            
            db.run(`CREATE TABLE IF NOT EXISTS user_skills (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                skill_name TEXT NOT NULL,
                proficiency_level INTEGER,
                category TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`);
            
            db.run(`CREATE TABLE IF NOT EXISTS user_certificates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                certificate_name TEXT NOT NULL,
                issuer TEXT,
                issue_date TEXT,
                expiry_date TEXT,
                credential_id TEXT,
                credential_url TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`);
            
            db.run(`CREATE TABLE IF NOT EXISTS learning_goals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                target_date TEXT,
                status TEXT DEFAULT 'active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`);
            
            db.run(`CREATE TABLE IF NOT EXISTS learning_paths (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                current_focus TEXT,
                next_milestone TEXT,
                recommended_courses TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`);
            
            db.run(`CREATE TABLE IF NOT EXISTS course_progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                course_id INTEGER NOT NULL,
                progress_percentage INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (course_id) REFERENCES user_courses (id)
            )`);
        });
    }
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret', (err, user) => {
        if (err) {
            // Check if token is expired
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    error: 'Token expired',
                    code: 'TOKEN_EXPIRED'
                });
            }
            
            return res.status(403).json({ error: 'Invalid token' });
        }
        
        // Get fresh user data from database
        db.get(
            'SELECT * FROM users WHERE id = ?',
            [user.id],
            (err, userData) => {
                if (err || !userData) {
                    return res.status(403).json({ error: 'User not found' });
                }
                
                // Set user in request
                req.user = {
                    id: userData.id,
                    username: userData.username
                };
                
        next();
            }
        );
    });
};

// Function to create sample learning dashboard data for a new user
const createSampleLearningData = (userId) => {
    console.log(`Creating sample learning dashboard data for user ${userId}`);
    
    // Sample courses
    const sampleCourses = [
        {
            title: 'Introduction to Web Development',
            description: 'Learn the basics of HTML, CSS, and JavaScript',
            provider: 'Udemy',
            url: 'https://www.udemy.com/course/web-development-basics',
            status: 'in_progress',
            start_date: new Date().toISOString().split('T')[0]
        },
        {
            title: 'Advanced JavaScript Concepts',
            description: 'Deep dive into JavaScript including closures, prototypes, and async programming',
            provider: 'Coursera',
            url: 'https://www.coursera.org/learn/advanced-javascript',
            status: 'in_progress',
            start_date: new Date().toISOString().split('T')[0]
        },
        {
            title: 'UI/UX Design Fundamentals',
            description: 'Learn the principles of user interface and user experience design',
            provider: 'LinkedIn Learning',
            url: 'https://www.linkedin.com/learning/ui-ux-design-fundamentals',
            status: 'completed',
            start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            completed_at: new Date().toISOString().split('T')[0]
        }
    ];
    
    // Insert sample courses
    sampleCourses.forEach(course => {
        db.run(
            `INSERT INTO user_courses (
                user_id, course_title, course_description, provider, url, status, start_date, completed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId, 
                course.title, 
                course.description, 
                course.provider, 
                course.url, 
                course.status, 
                course.start_date, 
                course.completed_at || null
            ],
            function(err) {
                if (err) {
                    console.error('Error inserting sample course:', err);
                    return;
                }
                
                const courseId = this.lastID;
                
                // Add progress for this course
                const progress = course.status === 'completed' ? 100 : Math.floor(Math.random() * 70) + 10;
                
                db.run(
                    `INSERT INTO course_progress (
                        user_id, course_id, progress_percentage
                    ) VALUES (?, ?, ?)`,
                    [userId, courseId, progress],
                    function(err) {
                        if (err) {
                            console.error('Error inserting course progress:', err);
                        }
                    }
                );
            }
        );
    });
    
    // Sample skills
    const sampleSkills = [
        { name: 'JavaScript', proficiency: 4, category: 'Programming' },
        { name: 'HTML/CSS', proficiency: 4, category: 'Web Development' },
        { name: 'React', proficiency: 3, category: 'Frontend' },
        { name: 'Node.js', proficiency: 3, category: 'Backend' },
        { name: 'SQL', proficiency: 2, category: 'Database' }
    ];
    
    // Insert sample skills
    sampleSkills.forEach(skill => {
        db.run(
            `INSERT INTO user_skills (
                user_id, skill_name, proficiency_level, category
            ) VALUES (?, ?, ?, ?)`,
            [userId, skill.name, skill.proficiency, skill.category],
            function(err) {
                if (err) {
                    console.error('Error inserting sample skill:', err);
                }
            }
        );
    });
    
    // Sample certificates
    const sampleCertificates = [
        {
            name: 'JavaScript Algorithms and Data Structures',
            issuer: 'freeCodeCamp',
            issue_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            credential_id: 'FCC12345',
            credential_url: 'https://www.freecodecamp.org/certification/user/javascript-algorithms-and-data-structures'
        },
        {
            name: 'Responsive Web Design',
            issuer: 'freeCodeCamp',
            issue_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            credential_id: 'FCC67890',
            credential_url: 'https://www.freecodecamp.org/certification/user/responsive-web-design'
        }
    ];
    
    // Insert sample certificates
    sampleCertificates.forEach(cert => {
        db.run(
            `INSERT INTO user_certificates (
                user_id, certificate_name, issuer, issue_date, credential_id, credential_url
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, cert.name, cert.issuer, cert.issue_date, cert.credential_id, cert.credential_url],
            function(err) {
                if (err) {
                    console.error('Error inserting sample certificate:', err);
                }
            }
        );
    });
    
    // Sample learning goals
    const sampleGoals = [
        {
            title: 'Complete React Course',
            description: 'Finish the Advanced React course and build a project',
            target_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'active'
        },
        {
            title: 'Learn TypeScript',
            description: 'Complete TypeScript tutorial and convert a project to TypeScript',
            target_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'active'
        },
        {
            title: 'Build Portfolio Website',
            description: 'Create a personal portfolio website to showcase projects',
            target_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'active'
        }
    ];
    
    // Insert sample goals
    sampleGoals.forEach(goal => {
        db.run(
            `INSERT INTO learning_goals (
                user_id, title, description, target_date, status
            ) VALUES (?, ?, ?, ?, ?)`,
            [userId, goal.title, goal.description, goal.target_date, goal.status],
            function(err) {
                if (err) {
                    console.error('Error inserting sample goal:', err);
                }
            }
        );
    });
    
    // Sample learning path
    const learningPath = {
        current_focus: 'Frontend Development',
        next_milestone: 'Build a React application with TypeScript',
        recommended_courses: JSON.stringify([
            'Advanced React Patterns',
            'TypeScript for JavaScript Developers',
            'State Management with Redux'
        ])
    };
    
    // Insert sample learning path
    db.run(
        `INSERT INTO learning_paths (
            user_id, current_focus, next_milestone, recommended_courses
        ) VALUES (?, ?, ?, ?)`,
        [userId, learningPath.current_focus, learningPath.next_milestone, learningPath.recommended_courses],
        function(err) {
            if (err) {
                console.error('Error inserting sample learning path:', err);
            }
        }
    );
};

// Update the signup endpoint to create sample learning dashboard data
app.post('/api/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Validate input
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }
        
        // Check if username or email already exists
        db.get(
            'SELECT * FROM users WHERE username = ? OR email = ?',
            [username, email],
            async (err, user) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }
                
                if (user) {
                    return res.status(400).json({ error: 'Username or email already exists' });
                }
                
                // Hash password
                const hashedPassword = await bcrypt.hash(password, 10);
                
                // Insert new user
                db.run(
                    'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
                    [username, email, hashedPassword],
                    function(err) {
                        if (err) {
                            console.error('Error creating user:', err);
                            return res.status(500).json({ error: 'Failed to create user' });
                        }
                        
                        const userId = this.lastID;
                        
                        // Create sample learning dashboard data for the new user
                        createSampleLearningData(userId);
                        
                        // Generate JWT token
                        const token = jwt.sign(
                            { id: userId, username },
                            process.env.JWT_SECRET || 'your_jwt_secret',
                            { expiresIn: '7d' }
                        );
                        
                        res.json({
                            message: 'User created successfully',
                            token,
                            username
                        });
                    }
                );
            }
        );
    } catch (error) {
        console.error('Error in signup:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Auth endpoints
app.post('/auth/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(400).json({ error: 'Username or email already exists' });
                    }
                    return res.status(500).json({ error: 'Error creating user' });
                }

                const token = jwt.sign(
                    { id: this.lastID, username },
                    process.env.JWT_SECRET || 'your-secret-key',
                    { expiresIn: '24h' }
                );

                res.status(201).json({ token, username });
            }
        );
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Server error during signup' });
    }
});

// Backward compatibility route for old clients
app.post('/auth/login', (req, res) => {
    console.log('Received login request at /auth/login - redirecting to /api/auth/login');
    // Forward the request to the correct endpoint
    req.url = '/api/auth/login';
    app._router.handle(req, res);
});

// Enhanced login endpoint with refresh tokens
app.post('/api/auth/login', async (req, res) => {
    try {
        console.log('Processing login request at /api/auth/login');
        const { username, password } = req.body;

        // Input validation
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Prevent SQL injection by using parameterized queries
        db.get(
            'SELECT * FROM users WHERE username = ?',
            [username],
            async (err, user) => {
            if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Internal server error' });
            }

            if (!user) {
                    // Use a generic error message to prevent username enumeration
                return res.status(401).json({ error: 'Invalid credentials' });
            }

                // Compare password with bcrypt
                const passwordMatch = await bcrypt.compare(password, user.password);
                
                if (!passwordMatch) {
                    // Use a generic error message to prevent username enumeration
                return res.status(401).json({ error: 'Invalid credentials' });
            }

                // Generate tokens
                const { accessToken, refreshToken } = generateTokens(user);
                
                // Store refresh token
                refreshTokens.add(refreshToken);
                
                // Send tokens to client
                res.json({
                    message: 'Login successful',
                    token: accessToken,
                    refreshToken,
                    username: user.username
                });
            }
        );
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Token validation endpoint
app.get('/api/auth/validate', authenticateToken, (req, res) => {
    // If the authenticateToken middleware passes, the token is valid
    res.json({ 
        valid: true,
        username: req.user.username,
        userId: req.user.id
    });
});

app.post('/api/auth/refresh', (req, res) => {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required' });
    }
    
    // Check if refresh token exists in our set
    if (!refreshTokens.has(refreshToken)) {
        return res.status(403).json({ error: 'Invalid refresh token' });
    }
    
    // Verify refresh token
    jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET || 'your_refresh_token_secret',
        (err, user) => {
            if (err) {
                // Remove invalid token
                refreshTokens.delete(refreshToken);
                return res.status(403).json({ error: 'Invalid refresh token' });
            }
            
            // Get user from database to ensure they still exist
            db.get(
                'SELECT * FROM users WHERE id = ?',
                [user.id],
                (err, userData) => {
                    if (err || !userData) {
                        refreshTokens.delete(refreshToken);
                        return res.status(403).json({ error: 'User not found' });
                    }
                    
                    // Generate new access token
                    const accessToken = jwt.sign(
                        { id: userData.id, username: userData.username },
                        process.env.JWT_SECRET || 'your_jwt_secret',
                        { expiresIn: '1h' }
                    );
                    
                    // Send new access token
                    res.json({ token: accessToken });
                }
            );
        }
    );
});

// Add logout endpoint
app.post('/api/auth/logout', (req, res) => {
    const { refreshToken } = req.body;
    
    // Remove refresh token from set
    refreshTokens.delete(refreshToken);
    
    res.json({ message: 'Logout successful' });
});

// Protected route example
app.get('/auth/profile', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});

// Generate questions endpoint
app.post('/api/generate-questions', async (req, res) => {
    try {
        const { career, experience } = req.body;
        
        console.log('Processing generate-questions request:', {
            career,
            experience
        });

        if (!career || !experience) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'Both career and experience are required'
            });
        }

        if (!ANTHROPIC_API_KEY) {
            return res.status(500).json({
                error: 'Server configuration error',
                message: 'API key is not configured'
            });
        }

        console.log('Making request to Anthropic API...');
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01',
                'x-api-key': ANTHROPIC_API_KEY
            },
            body: JSON.stringify({
                model: "claude-3-sonnet-20240229",
                max_tokens: 4000,
                messages: [{
                    role: "user",
                    content: `Generate 20 multiple choice questions for a ${career} position with ${experience} years of experience. Return ONLY a JSON array with this exact format, no other text:
                    [
                        {
                            "question": "Question text here?",
                            "options": ["Option A", "Option B", "Option C", "Option D"],
                            "correctAnswer": 0,
                            "difficulty": "basic",
                            "category": "technical"
                        }
                    ]
                    
                    Rules:
                    1. Generate exactly 20 questions
                    2. difficulty must be one of: "basic", "intermediate", "advanced"
                    3. category must be one of: "technical", "theoretical", "practical", "conceptual"
                    4. correctAnswer must be 0-3 representing the index of the correct option
                    5. Return ONLY the JSON array, no other text or explanation`
                }]
            })
        });

        console.log('Anthropic API response status:', response.status);
        const responseText = await response.text();
        console.log('Raw Anthropic response:', responseText);

        if (!response.ok) {
            throw new Error(`Anthropic API error: ${response.status} - ${responseText}`);
        }

        const data = JSON.parse(responseText);
        
        if (!data.content || !Array.isArray(data.content) || !data.content[0] || !data.content[0].text) {
            throw new Error('Invalid response format from Anthropic API');
        }

        // Extract the JSON array from the response text
        const text = data.content[0].text;
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        
        if (!jsonMatch) {
            throw new Error('Could not find JSON array in response');
        }

        const questions = JSON.parse(jsonMatch[0]);

        if (!Array.isArray(questions)) {
            throw new Error('Parsed content is not an array');
        }

        if (questions.length !== 20) {
            throw new Error(`Expected 20 questions, but got ${questions.length}`);
        }

        // Validate each question
        questions.forEach((q, index) => {
            if (!q.question || !Array.isArray(q.options) || 
                q.options.length !== 4 || 
                typeof q.correctAnswer !== 'number' || 
                !['basic', 'intermediate', 'advanced'].includes(q.difficulty) ||
                !['technical', 'theoretical', 'practical', 'conceptual'].includes(q.category)) {
                throw new Error(`Invalid question format at index ${index}`);
            }
        });

        console.log('Successfully generated and validated questions');
        return res.json({ questions });

    } catch (error) {
        console.error('Error in generate-questions:', error);
        return res.status(500).json({
            error: 'Failed to generate questions',
            message: error.message,
            details: error.stack
        });
    }
});

// Generate learning recommendations based on quiz results
app.post('/api/generate-recommendations', async (req, res) => {
    try {
        const { career, experience, score, weakCategories } = req.body;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01',
                'x-api-key': ANTHROPIC_API_KEY
            },
            body: JSON.stringify({
                model: "claude-3-sonnet-20240229",
                max_tokens: 4000,
                messages: [{
                    role: "user",
                    content: `Create a detailed personalized learning plan for a ${career} professional with ${experience} years of experience who scored ${score}% in their assessment. They need improvement in: ${weakCategories.join(', ')}. 
                    
                    Format as JSON with the following structure:
                    {
                        "summary": "Detailed performance summary with specific insights",
                        "score_analysis": {
                            "overall_score": number,
                            "interpretation": "What this score means",
                            "percentile": "Estimated percentile among peers"
                        },
                        "strengths": [
                            {
                                "area": "Strength area",
                                "details": "Detailed explanation",
                                "how_to_leverage": "How to use this strength"
                            }
                        ],
                        "areas_for_improvement": [
                            {
                                "area": "Improvement area",
                                "current_level": "Current proficiency",
                                "target_level": "Target proficiency",
                                "importance": "Why this matters",
                                "action_items": ["Specific action 1", "Specific action 2"]
                            }
                        ],
                        "job_description": {
                            "title": "Typical job title",
                            "description": "Detailed job description",
                            "responsibilities": ["Responsibility 1", "Responsibility 2"],
                            "required_skills": ["Skill 1", "Skill 2"],
                            "salary_range": "Estimated salary range",
                            "career_path": "Potential career progression"
                        },
                        "recommended_resources": {
                            "courses": [
                                {
                                    "title": "Course title",
                                    "platform": "Platform name",
                                    "url": "Course URL",
                                    "duration": "Estimated duration",
                                    "cost": "Estimated cost",
                                    "description": "Brief description"
                                }
                            ],
                            "books": [
                                {
                                    "title": "Book title",
                                    "author": "Author name",
                                    "url": "Amazon or Goodreads URL",
                                    "description": "Why this book is relevant"
                                }
                            ],
                            "online_resources": [
                                {
                                    "title": "Resource title",
                                    "type": "Article/Video/Tutorial",
                                    "url": "Resource URL",
                                    "description": "What you'll learn"
                                }
                            ],
                            "communities": [
                                {
                                    "name": "Community name",
                                    "platform": "Platform name",
                                    "url": "Community URL",
                                    "why_join": "Benefits of joining"
                                }
                            ]
                        },
                        "learning_path": {
                            "immediate_next_steps": ["Step 1", "Step 2"],
                            "30_day_goals": ["Goal 1", "Goal 2"],
                            "90_day_goals": ["Goal 1", "Goal 2"],
                            "6_month_goals": ["Goal 1", "Goal 2"]
                        },
                        "certification_recommendations": [
                            {
                                "name": "Certification name",
                                "provider": "Provider name",
                                "url": "Certification URL",
                                "difficulty": "Basic/Intermediate/Advanced",
                                "duration": "Estimated time to complete",
                                "cost": "Estimated cost"
                            }
                        ],
                        "timeline_months": 6,
                        "estimated_study_hours_per_week": 10
                    }
                    
                    CRITICAL REQUIREMENTS:
                    1. Include ONLY real, working URLs for all resources. For courses, use actual course URLs from Coursera, Udemy, LinkedIn Learning, etc.
                    2. For books, use actual Amazon.com or Goodreads URLs for real books.
                    3. For communities, use actual URLs to real communities like Stack Overflow, GitHub, Reddit, Discord, etc.
                    4. For certifications, use actual URLs to the official certification pages.
                    5. All recommendations must be highly specific to the ${career} field and ${experience} years experience level.
                    6. Do not use placeholder URLs or fake links - only include real, working URLs that a user could click and visit.
                    7. The job description section must be detailed and accurate for the career and experience level.`
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`Anthropic API error: ${response.status}`);
        }

        const data = await response.json();
        
        // Extract the JSON content from the Anthropic response
        let recommendations = {};
        
        try {
            if (data.content && data.content.length > 0) {
                const content = data.content[0].text;
                // Find JSON in the response
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    recommendations = JSON.parse(jsonMatch[0]);
                }
            }
            
            // Ensure the score is set correctly
            if (recommendations.score_analysis) {
                recommendations.score_analysis.overall_score = score;
            }
            
            // Send the parsed recommendations
            res.json({ recommendations });
        } catch (parseError) {
            console.error('Error parsing recommendations:', parseError);
            // Fallback to sending the raw response
            res.json({ 
                recommendations: {
                    summary: "We encountered an issue generating detailed recommendations.",
                    score_analysis: {
                        overall_score: score,
                        interpretation: "Your score indicates your current knowledge level.",
                        percentile: "Score percentile being calculated..."
                    },
                    strengths: [],
                    areas_for_improvement: [],
                    job_description: {
                        title: career,
                        description: `A ${career} professional with ${experience} years of experience.`,
                        responsibilities: [],
                        required_skills: [],
                        salary_range: "Varies by location and company",
                        career_path: "Career progression information unavailable"
                    },
                    recommended_resources: {
                        courses: [],
                        books: [],
                        online_resources: [],
                        communities: []
                    },
                    learning_path: {
                        immediate_next_steps: [],
                        "30_day_goals": [],
                        "90_day_goals": [],
                        "6_month_goals": []
                    },
                    certification_recommendations: [],
                    timeline_months: 6,
                    estimated_study_hours_per_week: 10
                }
            });
        }
    } catch (error) {
        console.error('Error generating recommendations:', error);
        res.status(500).json({
            error: 'Failed to generate recommendations',
            message: error.message,
            recommendations: {
                summary: "We encountered an issue generating recommendations.",
                score_analysis: {
                    overall_score: score || 0,
                    interpretation: "Your score indicates your current knowledge level.",
                    percentile: "Score percentile being calculated..."
                },
                // Include other default fields
                job_description: {
                    title: career || "Professional",
                    description: `A ${career || "professional"} with ${experience || "some"} years of experience.`,
                    responsibilities: [],
                    required_skills: [],
                    salary_range: "Varies by location and company",
                    career_path: "Career progression information unavailable"
                }
            }
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    // Check database connection
    let dbStatus = 'ok';
    try {
        db.exec('SELECT 1');
    } catch (error) {
        dbStatus = 'error';
        console.error('Database health check failed:', error);
    }
    
    res.json({
        status: 'ok',
        port: PORT,
        server_time: new Date().toISOString(),
        api_url: `http://localhost:${PORT}`,
        database: dbStatus,
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

// Add the save report endpoint
app.post('/api/save-report', authenticateToken, async (req, res) => {
    try {
        console.log('Save report request received');
        const { career, experience, score, report_data } = req.body;
        
        if (!career || !experience || !score) {
            console.error('Missing required fields');
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const userId = req.user.id;
        const timestamp = new Date().toISOString();

        console.log('Processing save report with userId:', userId);
        console.log('Career:', career);
        console.log('Experience:', experience);
        console.log('Score:', score);
        
        // Limit the size of report_data if necessary
        let processedReportData = report_data;
        if (report_data && report_data.length > 1000000) { // If larger than ~1MB
            console.log('Report data too large, truncating');
            // Parse the data, remove non-essential parts, and re-stringify
            try {
                const parsedData = JSON.parse(report_data);
                // Keep only essential parts
                const essentialData = {
                    summary: parsedData.summary,
                    score_analysis: parsedData.score_analysis,
                    strengths: parsedData.strengths?.slice(0, 3) || [],
                    areas_for_improvement: parsedData.areas_for_improvement?.slice(0, 3) || [],
                    job_description: parsedData.job_description || {},
                    recommended_resources: {
                        courses: parsedData.recommended_resources?.courses?.slice(0, 3) || [],
                        books: parsedData.recommended_resources?.books?.slice(0, 3) || [],
                        online_resources: parsedData.recommended_resources?.online_resources?.slice(0, 3) || [],
                        communities: parsedData.recommended_resources?.communities?.slice(0, 3) || []
                    },
                    learning_path: parsedData.learning_path || {},
                    certification_recommendations: parsedData.certification_recommendations?.slice(0, 3) || []
                };
                processedReportData = JSON.stringify(essentialData);
            } catch (parseError) {
                console.error('Error parsing report data:', parseError);
                // If parsing fails, truncate the string
                processedReportData = report_data.substring(0, 1000000);
            }
        }

        // Use a Promise to handle the database operation
        const saveReport = () => {
            return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO reports (user_id, career, experience, timestamp, score, report_data)
             VALUES (?, ?, ?, ?, ?, ?)`,
                    [userId, career, experience, timestamp, score, processedReportData],
            function(err) {
                if (err) {
                    console.error('Error saving report:', err);
                            reject(err);
                        } else {
                            console.log('Report saved successfully with ID:', this.lastID);
                            resolve(this.lastID);
                        }
                    }
                );
            });
        };

        try {
            const reportId = await saveReport();
                res.status(201).json({ 
                    message: 'Report saved successfully',
                reportId: reportId 
            });
        } catch (dbError) {
            console.error('Database error:', dbError);
            res.status(500).json({ 
                error: 'Failed to save report to database',
                details: dbError.message
            });
        }
    } catch (error) {
        console.error('Error in save-report:', error);
        res.status(500).json({ 
            error: 'Server error while saving report',
            details: error.message
        });
    }
});

// Get user's saved reports
app.get('/api/reports', authenticateToken, (req, res) => {
    const userId = req.user.id;
    
    db.all(
        `SELECT id, career, experience, timestamp, score 
         FROM reports 
         WHERE user_id = ? 
         ORDER BY timestamp DESC`,
        [userId],
        (err, reports) => {
            if (err) {
                console.error('Error fetching reports:', err);
                return res.status(500).json({ error: 'Failed to fetch reports' });
            }
            // Always return a reports array, even if it's empty
            res.json({ reports: reports || [] });
        }
    );
});

// Get specific report details
app.get('/api/reports/:id', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const reportId = req.params.id;
    
    db.get(
        `SELECT * FROM reports 
         WHERE id = ? AND user_id = ?`,
        [reportId, userId],
        (err, report) => {
            if (err) {
                console.error('Error fetching report:', err);
                return res.status(500).json({ error: 'Failed to fetch report' });
            }
            if (!report) {
                return res.status(404).json({ error: 'Report not found' });
            }
            res.json({ report });
        }
    );
});

// Fetch relevant jobs
app.post('/api/jobs', authenticateToken, async (req, res) => {
    try {
        const { career, filters } = req.body;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01',
                'x-api-key': ANTHROPIC_API_KEY
            },
            body: JSON.stringify({
                model: "claude-3-sonnet-20240229",
                max_tokens: 4000,
                messages: [{
                    role: "user",
                    content: `Generate 6 realistic job listings for ${career} position. 
                    Consider these filters: Location: ${filters.location}, Job Type: ${filters.jobType}, Experience Level: ${filters.experienceLevel}.
                    
                    Return as JSON array with this structure:
                    [
                        {
                            "id": "unique_string",
                            "title": "Job Title",
                            "company": "Company Name",
                            "location": "Location (Remote/Hybrid/City)",
                            "type": "Full-time/Part-time/Contract",
                            "experience": "Required experience level",
                            "salary": "Salary range",
                            "description": "Brief job description",
                            "skills": ["Required Skill 1", "Required Skill 2"],
                            "postedDate": "Posted X days ago",
                            "isNew": boolean,
                            "applyUrl": "https://example.com/apply"
                        }
                    ]
                    
                    Requirements:
                    1. Use real, well-known companies
                    2. Provide realistic salary ranges based on location and experience
                    3. Include relevant technical skills for ${career}
                    4. Mark jobs as "isNew: true" if postedDate is less than 3 days
                    5. Use realistic job titles and descriptions
                    6. Generate working URLs for the apply links (use real job boards)`
                }]
            })
        });

        if (!response.ok) {
            throw new Error('Failed to fetch job listings');
        }

        const data = await response.json();
        
        // Extract the JSON array from the response
        const text = data.content[0].text;
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        
        if (!jsonMatch) {
            throw new Error('Invalid response format');
        }

        const jobs = JSON.parse(jsonMatch[0]);

        res.json({ jobs });
    } catch (error) {
        console.error('Error fetching jobs:', error);
        res.status(500).json({
            error: 'Failed to fetch job listings',
            message: error.message
        });
    }
});

// Generate business ideas endpoint
app.post('/api/generate-business-ideas', authenticateToken, async (req, res) => {
    try {
        const { profile, filters, useCustomInput } = req.body;
        
        // Log the request for debugging
        console.log('Generating business ideas with:', { 
            useCustomInput, 
            filters,
            hasCustomInput: useCustomInput && profile.customInput ? 'yes' : 'no'
        });
        
        // Construct the prompt based on whether we have custom input
        let prompt = '';
        
        if (useCustomInput && profile.customInput) {
            const customInput = profile.customInput;
            prompt = `Generate 6 innovative business ideas based on this user's custom input and filters:

User Profile:
- Interests & Passions: ${customInput.interests || 'Not specified'}
- Skills & Expertise: ${customInput.skills || 'Not specified'}
- Experience: ${customInput.experience || 'Not specified'}
- Business Goals: ${customInput.goals || 'Not specified'}
- Available Budget: ${customInput.budget || 'Not specified'}
- Time Available: ${customInput.timeAvailable || 'Not specified'}
- Target Market: ${customInput.targetMarket || 'Not specified'}
- Problem to Solve: ${customInput.problemToSolve || 'Not specified'}
- Unique Value Proposition: ${customInput.uniqueValue || 'Not specified'}
- Preferred Industry: ${customInput.industryPreference || 'Not specified'}
- Technology Level: ${customInput.techLevel || 'medium'}
- Scalability Preference: ${customInput.scalability || 'medium'}

Filters: ${JSON.stringify(filters)}`;
        } else {
            prompt = `Generate 6 innovative business ideas based on this profile and filters:

Profile: ${JSON.stringify(profile)}
Filters: ${JSON.stringify(filters)}`;
        }
        
        // Add the common part of the prompt
        prompt += `

Return as JSON array with this structure:
{
    "ideas": [
        {
            "title": "Business Name",
            "shortDescription": "One-line pitch",
            "fullDescription": "Detailed business description",
            "investmentRange": "Required investment range",
            "timeCommitment": "Required time commitment",
            "riskLevel": "low/medium/high",
            "potentialROI": "Estimated ROI range",
            "skills": ["Required Skill 1", "Required Skill 2"],
            "requirements": ["Requirement 1", "Requirement 2"],
            "marketAnalysis": ["Market Point 1", "Market Point 2"],
            "implementationSteps": [
                {
                    "title": "Step Title",
                    "description": "Step Description"
                }
            ]
        }
    ]
}

Requirements:
1. Ideas should leverage the user's specific skills, interests, and experience
2. Match the specified investment range, time commitment, and risk level filters
3. Include realistic market analysis and implementation steps
4. Provide accurate risk assessments and ROI estimates
5. Focus on current market trends and opportunities
6. Consider both traditional and innovative business models
7. Ensure ideas are tailored to the user's unique background and preferences
8. If a specific industry is mentioned, prioritize ideas in that industry
9. If a specific problem is mentioned, prioritize ideas that solve that problem
10. Consider the user's technology level and scalability preferences`;

        console.log('Sending prompt to Anthropic API...');
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01',
                'x-api-key': ANTHROPIC_API_KEY
            },
            body: JSON.stringify({
                model: "claude-3-sonnet-20240229",
                max_tokens: 4000,
                messages: [{
                    role: "user",
                    content: prompt
                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Anthropic API error:', errorData);
            throw new Error('Failed to generate business ideas: ' + (errorData || 'Unknown error'));
        }

        const data = await response.json();
        
        // Extract the JSON object from the response
        const text = data.content[0].text;
        console.log('Received response from Anthropic API');
        
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch) {
            console.error('Invalid response format:', text);
            throw new Error('Invalid response format from AI service');
        }

        try {
        const ideas = JSON.parse(jsonMatch[0]);
        res.json(ideas);
        } catch (parseError) {
            console.error('Error parsing JSON from AI response:', parseError);
            console.error('Raw text:', text);
            throw new Error('Failed to parse business ideas from AI response');
        }
    } catch (error) {
        console.error('Error generating business ideas:', error);
        res.status(500).json({
            error: 'Failed to generate business ideas',
            message: error.message
        });
    }
});

// Save business idea endpoint
app.post('/api/save-business-idea', authenticateToken, async (req, res) => {
    try {
        const { idea } = req.body;
        const userId = req.user.id;

        db.run(
            `INSERT INTO business_ideas (user_id, idea_data)
             VALUES (?, ?)`,
            [userId, JSON.stringify(idea)],
            function(err) {
                if (err) {
                    console.error('Error saving business idea:', err);
                    return res.status(500).json({ error: 'Failed to save business idea' });
                }
                res.status(201).json({ 
                    message: 'Business idea saved successfully',
                    ideaId: this.lastID 
                });
            }
        );
    } catch (error) {
        console.error('Error in save-business-idea:', error);
        res.status(500).json({ error: 'Server error while saving business idea' });
    }
});

// Get user's saved business ideas
app.get('/api/business-ideas', authenticateToken, (req, res) => {
    const userId = req.user.id;
    
    db.all(
        `SELECT id, idea_data, created_at 
         FROM business_ideas 
         WHERE user_id = ? 
         ORDER BY created_at DESC`,
        [userId],
        (err, ideas) => {
            if (err) {
                console.error('Error fetching business ideas:', err);
                return res.status(500).json({ error: 'Failed to fetch business ideas' });
            }
            res.json({ ideas: ideas.map(idea => ({
                ...idea,
                idea_data: JSON.parse(idea.idea_data)
            })) });
        }
    );
});

// Generate interview questions
app.post('/api/interview/questions', authenticateToken, async (req, res) => {
    try {
        const { jobRole, experienceLevel, interviewType } = req.body;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01',
                'x-api-key': ANTHROPIC_API_KEY
            },
            body: JSON.stringify({
                model: "claude-3-sonnet-20240229",
                max_tokens: 4000,
                messages: [{
                    role: "user",
                    content: `Generate 5 ${interviewType} interview questions for a ${jobRole} position at ${experienceLevel} level.

Return as JSON array with this structure:
{
    "questions": [
        {
            "question": "The interview question",
            "category": "Category of question (e.g., Problem Solving, System Design, etc.)",
            "difficulty": "easy/medium/hard",
            "tips": ["Tip 1", "Tip 2", "Tip 3"],
            "idealAnswer": "What an ideal answer should cover",
            "followUp": ["Potential follow-up question 1", "Potential follow-up question 2"]
        }
    ]
}

Make questions:
1. Appropriate for the experience level
2. Specific to the job role
3. Include behavioral and technical aspects where relevant
4. Progressive in difficulty
5. Include detailed tips for answering`
                }]
            })
        });

        if (!response.ok) {
            throw new Error('Failed to generate interview questions');
        }

        const data = await response.json();
        const text = data.content[0].text;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch) {
            throw new Error('Invalid response format');
        }

        const questions = JSON.parse(jsonMatch[0]);
        res.json(questions);
    } catch (error) {
        console.error('Error generating interview questions:', error);
        res.status(500).json({
            error: 'Failed to generate interview questions',
            message: error.message
        });
    }
});

// Analyze interview response
app.post('/api/interview/analyze', authenticateToken, upload.single('video'), async (req, res) => {
    let videoPath = null;
    let audioPath = null;
    
    try {
        if (!req.file) {
            throw new Error('No video file uploaded');
        }

        const question = JSON.parse(req.body.question);
        videoPath = req.file.path;
        audioPath = `${videoPath}.wav`;

        // Extract audio from video
        await new Promise((resolve, reject) => {
            ffmpeg(videoPath)
                .toFormat('wav')
                .on('end', resolve)
                .on('error', reject)
                .save(audioPath);
        });

        // Here you would typically use a speech-to-text service
        // For demo purposes, we'll simulate transcription
        const transcribedText = "This is a simulated transcription of the interview response";

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01',
                'x-api-key': process.env.ANTHROPIC_API_KEY
            },
            body: JSON.stringify({
                model: "claude-3-sonnet-20240229",
                max_tokens: 4000,
                messages: [{
                    role: "user",
                    content: `Analyze this interview response for the question: "${question.question}"

Response transcript: ${transcribedText}

Consider:
1. Relevance to the question
2. Clarity and structure
3. Technical accuracy
4. Communication skills
5. Confidence level

Provide feedback in this JSON format:
{
    "feedback": {
        "analysis": "Overall analysis of the response",
        "positives": ["What was done well"],
        "suggestions": ["Areas for improvement"],
        "score": 85,
        "confidence": "Assessment of confidence level",
        "clarity": "Assessment of communication clarity",
        "completeness": "Assessment of answer completeness",
        "technicalAccuracy": "Assessment of technical knowledge demonstrated"
    }
}`
                }]
            })
        });

        if (!response.ok) {
            throw new Error('Failed to analyze interview response');
        }

        const data = await response.json();
        const feedback = JSON.parse(data.content[0].text);
        res.json(feedback);

    } catch (error) {
        console.error('Error analyzing interview response:', error);
        res.status(500).json({
            error: 'Failed to analyze interview response',
            message: error.message
        });
    } finally {
        // Cleanup temporary files
        try {
            if (videoPath && fs.existsSync(videoPath)) await unlink(videoPath);
            if (audioPath && fs.existsSync(audioPath)) await unlink(audioPath);
        } catch (err) {
            console.error('Error cleaning up files:', err);
        }
    }
});

// Generate final interview feedback
app.post('/api/interview/feedback', authenticateToken, async (req, res) => {
    try {
        const { answers, jobRole, experienceLevel, interviewType } = req.body;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01',
                'x-api-key': process.env.ANTHROPIC_API_KEY
            },
            body: JSON.stringify({
                model: "claude-3-sonnet-20240229",
                max_tokens: 4000,
                messages: [{
                    role: "user",
                    content: `Generate comprehensive interview feedback for a ${jobRole} position (${experienceLevel} level).

Interview type: ${interviewType}
Interview data: ${JSON.stringify(answers)}

Provide detailed feedback in this JSON format:
{
    "feedback": {
        "overallScore": 85,
        "scoreInterpretation": "Detailed explanation of the score and what it means",
        "summary": "Comprehensive performance summary",
        "strengths": [
            {
                "area": "Strength area",
                "details": "Detailed explanation",
                "examples": ["Specific examples from the interview"]
            }
        ],
        "improvements": [
            {
                "area": "Area for improvement",
                "details": "What needs improvement",
                "actionItems": ["Specific actions to improve"],
                "resources": ["Recommended learning resources"]
            }
        ],
        "technicalAssessment": {
            "score": 85,
            "strengths": ["Technical strength 1", "Technical strength 2"],
            "gaps": ["Knowledge gap 1", "Knowledge gap 2"],
            "recommendations": ["Technical learning recommendation 1", "Technical learning recommendation 2"]
        },
        "communicationAssessment": {
            "score": 85,
            "clarity": "Assessment of communication clarity",
            "structure": "Assessment of answer structure",
            "confidence": "Assessment of confidence level",
            "improvements": ["Communication improvement 1", "Communication improvement 2"]
        },
        "nextSteps": [
            {
                "action": "Recommended action",
                "timeline": "Suggested timeline",
                "resources": ["Helpful resource 1", "Helpful resource 2"]
            }
        ],
        "preparationTips": {
            "technical": ["Technical preparation tip 1", "Technical preparation tip 2"],
            "behavioral": ["Behavioral preparation tip 1", "Behavioral preparation tip 2"],
            "companySpecific": ["Company research tip 1", "Company research tip 2"]
        }
    }
}`
                }]
            })
        });

        if (!response.ok) {
            throw new Error('Failed to generate interview feedback');
        }

        const data = await response.json();
        const feedback = JSON.parse(data.content[0].text);
        
        // Save feedback to database
        db.run(
            `INSERT INTO interviews (user_id, job_role, interview_type, feedback)
             VALUES (?, ?, ?, ?)`,
            [req.user.id, jobRole, interviewType, JSON.stringify(feedback)],
            function(err) {
                if (err) {
                    console.error('Error saving interview feedback:', err);
                }
            }
        );

        res.json(feedback);
    } catch (error) {
        console.error('Error generating interview feedback:', error);
        res.status(500).json({
            error: 'Failed to generate interview feedback',
            message: error.message
        });
    }
});

// Initialize Learning Dashboard
app.post('/api/learning/initialize', authenticateToken, async (req, res) => {
    try {
        const { career_path, current_skills, goals } = req.body;
        const userId = req.user.id;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01',
                'x-api-key': ANTHROPIC_API_KEY
            },
            body: JSON.stringify({
                model: "claude-3-sonnet-20240229",
                max_tokens: 4000,
                messages: [{
                    role: "user",
                    content: `Create a personalized learning dashboard for a ${career_path} professional.
                    Current skills: ${JSON.stringify(current_skills)}
                    Career goals: ${JSON.stringify(goals)}

                    Return as JSON with this structure:
                    {
                        "skills_assessment": {
                            "technical_skills": [
                                {
                                    "name": "Skill name",
                                    "current_level": "beginner/intermediate/advanced",
                                    "target_level": "intermediate/advanced/expert",
                                    "priority": "high/medium/low",
                                    "resources": ["Resource 1", "Resource 2"]
                                }
                            ],
                            "soft_skills": [
                                {
                                    "name": "Skill name",
                                    "current_level": "beginner/intermediate/advanced",
                                    "target_level": "intermediate/advanced/expert",
                                    "priority": "high/medium/low",
                                    "resources": ["Resource 1", "Resource 2"]
                                }
                            ]
                        },
                        "learning_path": {
                            "milestones": [
                                {
                                    "title": "Milestone title",
                                    "description": "Milestone description",
                                    "timeline": "Expected completion time",
                                    "skills_gained": ["Skill 1", "Skill 2"],
                                    "resources": ["Resource 1", "Resource 2"]
                                }
                            ]
                        },
                        "recommended_resources": {
                            "courses": [],
                            "books": [],
                            "tutorials": [],
                            "projects": []
                        },
                        "certification_path": [
                            {
                                "name": "Certification name",
                                "provider": "Provider name",
                                "timeline": "Expected completion time",
                                "prerequisites": ["Prerequisite 1", "Prerequisite 2"],
                                "url": "Certification URL"
                            }
                        ]
                    }`
                }]
            })
        });

        if (!response.ok) {
            throw new Error('Failed to generate learning dashboard');
        }

        const data = await response.json();
        const dashboardData = JSON.parse(data.content[0].text);

        // Save to database
        db.run(
            `INSERT INTO learning_dashboard (
                user_id, 
                career_path, 
                skills_data, 
                goals_data, 
                progress_data, 
                resources_data, 
                certificates_data
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                career_path,
                JSON.stringify(dashboardData.skills_assessment),
                JSON.stringify(goals),
                JSON.stringify(dashboardData.learning_path),
                JSON.stringify(dashboardData.recommended_resources),
                JSON.stringify(dashboardData.certification_path)
            ],
            function(err) {
                if (err) {
                    throw new Error('Failed to save dashboard data');
                }
                res.json({
                    message: 'Learning dashboard initialized successfully',
                    dashboard: dashboardData
                });
            }
        );
    } catch (error) {
        console.error('Error initializing learning dashboard:', error);
        res.status(500).json({
            error: 'Failed to initialize learning dashboard',
            message: error.message
        });
    }
});

// Get Learning Dashboard
app.get('/api/learning/dashboard', authenticateToken, (req, res) => {
    const userId = req.user.id;
    
    db.get(
        `SELECT * FROM learning_dashboard 
         WHERE user_id = ? 
         ORDER BY last_updated DESC 
         LIMIT 1`,
        [userId],
        (err, dashboard) => {
            if (err) {
                console.error('Error fetching dashboard:', err);
                return res.status(500).json({ error: 'Failed to fetch dashboard' });
            }
            if (!dashboard) {
                return res.status(404).json({ error: 'Dashboard not found' });
            }

            const dashboardData = {
                career_path: dashboard.career_path,
                skills: JSON.parse(dashboard.skills_data),
                goals: JSON.parse(dashboard.goals_data),
                progress: JSON.parse(dashboard.progress_data),
                resources: JSON.parse(dashboard.resources_data),
                certificates: JSON.parse(dashboard.certificates_data),
                last_updated: dashboard.last_updated
            };

            res.json({ dashboard: dashboardData });
        }
    );
});

// Update Learning Progress
app.post('/api/learning/progress', authenticateToken, async (req, res) => {
    try {
        const { activity_type, activity_data } = req.body;
        const userId = req.user.id;

        // Save activity
        db.run(
            `INSERT INTO learning_activities (
                user_id, 
                activity_type, 
                activity_data, 
                status
            ) VALUES (?, ?, ?, ?)`,
            [userId, activity_type, JSON.stringify(activity_data), 'completed'],
            async function(err) {
                if (err) {
                    throw new Error('Failed to save activity');
                }

                // Get all completed activities
                db.all(
                    `SELECT activity_type, activity_data 
                     FROM learning_activities 
                     WHERE user_id = ? 
                     ORDER BY created_at DESC`,
                    [userId],
                    async (err, activities) => {
                        if (err) {
                            throw new Error('Failed to fetch activities');
                        }

                        // Generate updated recommendations
                        const response = await fetch('https://api.anthropic.com/v1/messages', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'anthropic-version': '2023-06-01',
                                'x-api-key': ANTHROPIC_API_KEY
                            },
                            body: JSON.stringify({
                                model: "claude-3-sonnet-20240229",
                                max_tokens: 4000,
                                messages: [{
                                    role: "user",
                                    content: `Update learning recommendations based on completed activities:
                                    ${JSON.stringify(activities)}

                                    Return as JSON with this structure:
                                    {
                                        "progress_update": {
                                            "completed_items": ["Item 1", "Item 2"],
                                            "skills_gained": ["Skill 1", "Skill 2"],
                                            "next_steps": ["Step 1", "Step 2"]
                                        },
                                        "new_recommendations": {
                                            "courses": [],
                                            "projects": [],
                                            "resources": []
                                        }
                                    }`
                                }]
                            })
                        });

                        if (!response.ok) {
                            throw new Error('Failed to generate recommendations');
                        }

                        const data = await response.json();
                        const updateData = JSON.parse(data.content[0].text);

                        // Update dashboard
                        db.run(
                            `UPDATE learning_dashboard 
                             SET progress_data = ?, 
                                 resources_data = ?,
                                 last_updated = CURRENT_TIMESTAMP 
                             WHERE user_id = ?`,
                            [
                                JSON.stringify(updateData.progress_update),
                                JSON.stringify(updateData.new_recommendations),
                                userId
                            ],
                            function(err) {
                                if (err) {
                                    throw new Error('Failed to update dashboard');
                                }
                                res.json({
                                    message: 'Progress updated successfully',
                                    update: updateData
                                });
                            }
                        );
                    }
                );
            }
        );
    } catch (error) {
        console.error('Error updating learning progress:', error);
        res.status(500).json({
            error: 'Failed to update learning progress',
            message: error.message
        });
    }
});

// Get Learning Activities
app.get('/api/learning/activities', authenticateToken, (req, res) => {
    const userId = req.user.id;
    
    db.all(
        `SELECT * FROM learning_activities 
         WHERE user_id = ? 
         ORDER BY created_at DESC`,
        [userId],
        (err, activities) => {
            if (err) {
                console.error('Error fetching activities:', err);
                return res.status(500).json({ error: 'Failed to fetch activities' });
            }
            res.json({ 
                activities: activities.map(activity => ({
                    ...activity,
                    activity_data: JSON.parse(activity.activity_data)
                }))
            });
        }
    );
});

// Initialize Career Timeline
app.post('/api/career/timeline/initialize', authenticateToken, async (req, res) => {
    try {
        const { current_role, target_role, experience_years, preferences } = req.body;
        const userId = req.user.id;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01',
                'x-api-key': ANTHROPIC_API_KEY
            },
            body: JSON.stringify({
                model: "claude-3-sonnet-20240229",
                max_tokens: 4000,
                messages: [{
                    role: "user",
                    content: `Create a detailed career progression timeline from ${current_role} to ${target_role}.
                    Current experience: ${experience_years} years
                    Preferences: ${JSON.stringify(preferences)}

                    Return as JSON with this structure:
                    {
                        "timeline_overview": {
                            "estimated_years": number,
                            "difficulty_level": "low/medium/high",
                            "key_challenges": ["Challenge 1", "Challenge 2"],
                            "success_factors": ["Factor 1", "Factor 2"]
                        },
                        "career_path": {
                            "stages": [
                                {
                                    "role": "Role title",
                                    "timeline": "Expected duration",
                                    "key_responsibilities": ["Responsibility 1", "Responsibility 2"],
                                    "required_skills": ["Skill 1", "Skill 2"],
                                    "salary_range": "Expected salary range",
                                    "transition_tips": ["Tip 1", "Tip 2"]
                                }
                            ]
                        },
                        "salary_progression": {
                            "current_range": "Current salary range",
                            "target_range": "Target salary range",
                            "progression_stages": [
                                {
                                    "stage": "Stage name",
                                    "timeline": "Timeline",
                                    "salary_range": "Expected range",
                                    "factors": ["Factor 1", "Factor 2"]
                                }
                            ]
                        },
                        "skills_roadmap": {
                            "technical_skills": [
                                {
                                    "skill": "Skill name",
                                    "priority": "high/medium/low",
                                    "timeline": "When to acquire",
                                    "resources": ["Resource 1", "Resource 2"]
                                }
                            ],
                            "soft_skills": [
                                {
                                    "skill": "Skill name",
                                    "priority": "high/medium/low",
                                    "timeline": "When to acquire",
                                    "resources": ["Resource 1", "Resource 2"]
                                }
                            ]
                        },
                        "milestones": [
                            {
                                "title": "Milestone title",
                                "timeline": "Expected timeline",
                                "description": "Detailed description",
                                "success_criteria": ["Criterion 1", "Criterion 2"],
                                "preparation_steps": ["Step 1", "Step 2"]
                            }
                        ]
                    }`
                }]
            })
        });

        if (!response.ok) {
            throw new Error('Failed to generate career timeline');
        }

        const data = await response.json();
        const timelineData = JSON.parse(data.content[0].text);

        // Save to database
        db.run(
            `INSERT INTO career_timeline (
                user_id,
                current_role,
                target_role,
                timeline_data,
                salary_data,
                skills_roadmap,
                milestones
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                current_role,
                target_role,
                JSON.stringify({
                    overview: timelineData.timeline_overview,
                    path: timelineData.career_path
                }),
                JSON.stringify(timelineData.salary_progression),
                JSON.stringify(timelineData.skills_roadmap),
                JSON.stringify(timelineData.milestones)
            ],
            function(err) {
                if (err) {
                    throw new Error('Failed to save timeline data');
                }

                // Create initial goals
                const goals = timelineData.milestones.map(milestone => ({
                    goal_type: 'milestone',
                    goal_data: JSON.stringify(milestone),
                    target_date: milestone.timeline,
                    status: 'pending',
                    progress: 0
                }));

                const timelineId = this.lastID;
                const goalValues = goals.map(goal => 
                    `(${userId}, ${timelineId}, '${goal.goal_type}', '${goal.goal_data}', '${goal.target_date}', '${goal.status}', ${goal.progress})`
                ).join(',');

                db.run(
                    `INSERT INTO career_goals (
                        user_id, timeline_id, goal_type, goal_data, target_date, status, progress
                    ) VALUES ${goalValues}`,
                    function(err) {
                        if (err) {
                            console.error('Error creating initial goals:', err);
                        }
                    }
                );

                res.json({
                    message: 'Career timeline initialized successfully',
                    timeline: timelineData
                });
            }
        );
    } catch (error) {
        console.error('Error initializing career timeline:', error);
        res.status(500).json({
            error: 'Failed to initialize career timeline',
            message: error.message
        });
    }
});

// Get Career Timeline
app.get('/api/career/timeline', authenticateToken, (req, res) => {
    const userId = req.user.id;
    
    db.get(
        `SELECT * FROM career_timeline 
         WHERE user_id = ? 
         ORDER BY last_updated DESC 
         LIMIT 1`,
        [userId],
        (err, timeline) => {
            if (err) {
                console.error('Error fetching timeline:', err);
                return res.status(500).json({ error: 'Failed to fetch timeline' });
            }
            if (!timeline) {
                return res.status(404).json({ error: 'Timeline not found' });
            }

            // Fetch associated goals
            db.all(
                `SELECT * FROM career_goals 
                 WHERE timeline_id = ? 
                 ORDER BY target_date ASC`,
                [timeline.id],
                (err, goals) => {
                    if (err) {
                        console.error('Error fetching goals:', err);
                        return res.status(500).json({ error: 'Failed to fetch goals' });
                    }

                    const timelineData = {
                        current_role: timeline.current_role,
                        target_role: timeline.target_role,
                        timeline: JSON.parse(timeline.timeline_data),
                        salary: JSON.parse(timeline.salary_data),
                        skills: JSON.parse(timeline.skills_roadmap),
                        milestones: JSON.parse(timeline.milestones),
                        goals: goals.map(goal => ({
                            ...goal,
                            goal_data: JSON.parse(goal.goal_data)
                        })),
                        last_updated: timeline.last_updated
                    };

                    res.json({ timeline: timelineData });
                }
            );
        }
    );
});

// Update Career Goal
app.post('/api/career/goals/update', authenticateToken, async (req, res) => {
    try {
        const { goalId, progress, status, notes } = req.body;
        const userId = req.user.id;

        // Update goal
        db.run(
            `UPDATE career_goals 
             SET progress = ?, 
                 status = ?,
                 goal_data = json_set(goal_data, '$.notes', ?)
             WHERE id = ? AND user_id = ?`,
            [progress, status, JSON.stringify(notes), goalId, userId],
            function(err) {
                if (err) {
                    throw new Error('Failed to update goal');
                }

                // If goal is completed, generate new recommendations
                if (status === 'completed') {
                    generateNextSteps(userId, goalId)
                        .then(recommendations => {
                            res.json({
                                message: 'Goal updated successfully',
                                recommendations
                            });
                        })
                        .catch(error => {
                            console.error('Error generating recommendations:', error);
                            res.json({
                                message: 'Goal updated successfully',
                                recommendations: null
                            });
                        });
                } else {
                    res.json({
                        message: 'Goal updated successfully'
                    });
                }
            }
        );
    } catch (error) {
        console.error('Error updating career goal:', error);
        res.status(500).json({
            error: 'Failed to update career goal',
            message: error.message
        });
    }
});

// Helper function to generate next steps
async function generateNextSteps(userId, completedGoalId) {
    try {
        // Get completed goal and timeline data
        const goal = await new Promise((resolve, reject) => {
            db.get(
                `SELECT g.*, t.current_role, t.target_role, t.timeline_data 
                 FROM career_goals g
                 JOIN career_timeline t ON g.timeline_id = t.id
                 WHERE g.id = ? AND g.user_id = ?`,
                [completedGoalId, userId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01',
                'x-api-key': ANTHROPIC_API_KEY
            },
            body: JSON.stringify({
                model: "claude-3-sonnet-20240229",
                max_tokens: 4000,
                messages: [{
                    role: "user",
                    content: `Generate next steps recommendations based on completed career goal:
                    ${JSON.stringify(goal)}

                    Return as JSON with this structure:
                    {
                        "next_steps": [
                            {
                                "action": "Recommended action",
                                "timeline": "Suggested timeline",
                                "resources": ["Resource 1", "Resource 2"],
                                "expected_outcome": "Expected outcome"
                            }
                        ],
                        "skill_focus": ["Skill 1", "Skill 2"],
                        "networking_suggestions": ["Suggestion 1", "Suggestion 2"],
                        "learning_resources": ["Resource 1", "Resource 2"]
                    }`
                }]
            })
        });

        if (!response.ok) {
            throw new Error('Failed to generate recommendations');
        }

        const data = await response.json();
        return JSON.parse(data.content[0].text);
    } catch (error) {
        throw error;
    }
}

// Initialize AI Career Coach
app.post('/api/coach/initialize', authenticateToken, async (req, res) => {
    try {
        console.log('Coach initialization request received:', req.body);
        
        const { career_interests, current_role, career_goals, challenges, coaching_focus } = req.body;
        const userId = req.user.id;
        
        // Validate required fields
        if (!coaching_focus) {
            return res.status(400).json({ error: 'Coaching focus is required' });
        }
        
        if (!current_role) {
            return res.status(400).json({ error: 'Current role is required' });
        }
        
        if (!career_interests) {
            return res.status(400).json({ error: 'Career interests are required' });
        }

        // Check if user already has a coach
        db.get(
            `SELECT id FROM career_coach WHERE user_id = ?`,
            [userId],
            async (err, coach) => {
                if (err) {
                    console.error('Database error checking for existing coach:', err);
                    return res.status(500).json({ error: 'Database error', message: err.message });
                }

                if (coach) {
                    return res.status(400).json({ error: 'Career coach already initialized' });
                }

                // Create user profile for coaching
                const userProfile = {
                    career_interests,
                    current_role,
                    career_goals,
                    challenges
                };

                console.log('Generating coaching insights with user profile:', userProfile);

                try {
                // Generate initial coaching insights
                const response = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'anthropic-version': '2023-06-01',
                        'x-api-key': ANTHROPIC_API_KEY
                    },
                    body: JSON.stringify({
                        model: "claude-3-sonnet-20240229",
                        max_tokens: 4000,
                        messages: [{
                            role: "user",
                            content: `You are a professional career coach. Based on this user profile, generate initial coaching insights and action items:
                            
                            User Profile: ${JSON.stringify(userProfile)}
                            Coaching Focus: ${coaching_focus}
                            
                            Return as JSON with this structure:
                            {
                                "initial_assessment": "Overall assessment of the user's career situation",
                                "strengths": ["Strength 1", "Strength 2"],
                                "growth_areas": ["Growth area 1", "Growth area 2"],
                                "coaching_approach": "Recommended coaching approach",
                                "initial_insights": [
                                    {
                                        "area": "Area of insight",
                                        "insight": "Detailed insight",
                                        "why_important": "Why this matters"
                                    }
                                ],
                                "action_items": [
                                    {
                                        "title": "Action item title",
                                        "description": "Detailed description",
                                        "timeline": "Suggested timeline",
                                        "expected_outcome": "Expected outcome"
                                    }
                                ],
                                "welcome_message": "Personalized welcome message from coach to user"
                            }`
                        }]
                    })
                });

                if (!response.ok) {
                        const errorData = await response.json();
                        console.error('Error from Anthropic API:', errorData);
                        throw new Error('Failed to generate coaching insights: ' + (errorData.error?.message || 'Unknown error'));
                }

                const data = await response.json();
                    console.log('Received response from Anthropic API');
                    
                    let insights;
                    try {
                        insights = JSON.parse(data.content[0].text);
                    } catch (parseError) {
                        console.error('Error parsing Anthropic response:', parseError);
                        console.log('Raw response:', data.content[0].text);
                        throw new Error('Failed to parse coaching insights');
                    }

                // Save to database
                db.run(
                    `INSERT INTO career_coach (
                        user_id,
                        user_profile,
                        coaching_focus,
                        insights,
                        action_items,
                        conversation_history,
                        last_check_in
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        userId,
                        JSON.stringify(userProfile),
                        coaching_focus,
                        JSON.stringify({
                            initial_assessment: insights.initial_assessment,
                            strengths: insights.strengths,
                            growth_areas: insights.growth_areas,
                            coaching_approach: insights.coaching_approach,
                            insights: insights.initial_insights
                        }),
                        JSON.stringify(insights.action_items),
                        JSON.stringify([]),
                        new Date().toISOString()
                    ],
                    function(err) {
                        if (err) {
                                console.error('Error saving coach data to database:', err);
                                throw new Error('Failed to save coach data: ' + err.message);
                        }

                        const coachId = this.lastID;

                        // Save welcome message
                        db.run(
                            `INSERT INTO coach_messages (
                                user_id,
                                coach_id,
                                message_type,
                                message_content,
                                is_user_message
                            ) VALUES (?, ?, ?, ?, ?)`,
                            [
                                userId,
                                coachId,
                                'welcome',
                                insights.welcome_message,
                                false
                            ],
                            function(err) {
                                if (err) {
                                    console.error('Error saving welcome message:', err);
                                }

                                res.json({
                                    message: 'Career coach initialized successfully',
                                    coach_id: coachId,
                                    welcome_message: insights.welcome_message,
                                    insights: {
                                        initial_assessment: insights.initial_assessment,
                                        strengths: insights.strengths,
                                        growth_areas: insights.growth_areas
                                    },
                                    action_items: insights.action_items
                                });
                            }
                        );
                    }
                );
                } catch (error) {
                    console.error('Error in coach initialization:', error);
                    return res.status(500).json({ 
                        error: 'Failed to initialize career coach', 
                        message: error.message 
                    });
                }
            }
        );
    } catch (error) {
        console.error('Error initializing career coach:', error);
        res.status(500).json({
            error: 'Failed to initialize career coach',
            message: error.message
        });
    }
});

// Get Career Coach Data
app.get('/api/coach', authenticateToken, (req, res) => {
    const userId = req.user.id;
    
    db.get(
        `SELECT * FROM career_coach 
         WHERE user_id = ?`,
        [userId],
        (err, coach) => {
            if (err) {
                console.error('Error fetching coach data:', err);
                return res.status(500).json({ error: 'Failed to fetch coach data' });
            }
            if (!coach) {
                return res.status(404).json({ error: 'Career coach not found' });
            }

            // Get recent messages
            db.all(
                `SELECT * FROM coach_messages 
                 WHERE user_id = ? AND coach_id = ? 
                 ORDER BY created_at DESC LIMIT 20`,
                [userId, coach.id],
                (err, messages) => {
                    if (err) {
                        console.error('Error fetching coach messages:', err);
                        return res.status(500).json({ error: 'Failed to fetch coach messages' });
                    }

                    const coachData = {
                        id: coach.id,
                        user_profile: JSON.parse(coach.user_profile),
                        coaching_focus: coach.coaching_focus,
                        insights: JSON.parse(coach.insights),
                        action_items: JSON.parse(coach.action_items),
                        last_check_in: coach.last_check_in,
                        messages: messages.reverse()
                    };

                    res.json({ coach: coachData });
                }
            );
        }
    );
});

// AI Service - Centralized AI functionality
class AIService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.anthropic.com/v1/messages';
        this.defaultModel = 'claude-3-sonnet-20240229';
    }

    // Test the API connection
    async testConnection() {
        try {
            console.log('Testing Anthropic API connection...');
            
            if (!this.apiKey) {
                console.error('ANTHROPIC_API_KEY is not set');
                return false;
            }
            
            const response = await this.generateResponse({
                system: "You are a helpful assistant. Please respond with 'API connection successful'.",
                messages: [
                    {
                        role: "user",
                        content: "Hello, this is a test message. Please respond with 'API connection successful' and demonstrate some formatting."
                    }
                ],
                max_tokens: 100
            });
            
            if (response.success) {
                console.log('Anthropic API test successful:', response.content);
                return true;
            } else {
                console.error('Anthropic API test failed:', response.error);
                return false;
            }
        } catch (error) {
            console.error('Error testing Anthropic API:', error);
            return false;
        }
    }

    // Generate a response from the AI
    async generateResponse({ system, messages, max_tokens = 4000, model = null }) {
        try {
            // Create an AbortController with a timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
                console.error('Claude API request timed out after 30 seconds');
            }, 30000); // 30 second timeout
            
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'anthropic-version': '2023-06-01',
                    'x-api-key': this.apiKey
                },
                body: JSON.stringify({
                    model: model || this.defaultModel,
                    max_tokens: max_tokens,
                    system: system,
                    messages: messages
                }),
                signal: controller.signal
            });
            
            // Clear the timeout since we got a response
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Claude API error response:', response.status, errorText);
                
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch (e) {
                    errorData = { error: errorText };
                }
                
                // Provide more specific error messages based on status code
                let errorMessage = `API error: ${response.status}`;
                if (response.status === 400) {
                    errorMessage = `Bad request: ${errorData.error?.message || 'Invalid request format'}`;
                } else if (response.status === 401) {
                    errorMessage = 'Authentication error: Invalid API key';
                } else if (response.status === 429) {
                    errorMessage = 'Rate limit exceeded: Too many requests';
                } else if (response.status >= 500) {
                    errorMessage = 'API service error: The AI service is currently unavailable';
                }
                
                return { 
                    success: false, 
                    error: errorMessage,
                    details: errorData.error?.message || errorText,
                    status: response.status
                };
            }

            const data = await response.json();
            
            if (!data.content || !data.content[0] || !data.content[0].text) {
                return { 
                    success: false, 
                    error: 'Invalid response format from API',
                    details: 'The API response did not contain the expected content structure'
                };
            }
            
            return {
                success: true,
                content: data.content[0].text,
                rawResponse: data
            };
        } catch (error) {
            // Provide more specific error messages based on error type
            let errorMessage = `Network error: ${error.message}`;
            
            if (error.name === 'AbortError') {
                errorMessage = 'Request timed out: The AI service took too long to respond';
            } else if (error.message.includes('ECONNREFUSED')) {
                errorMessage = 'Connection refused: Could not connect to the AI service';
            } else if (error.message.includes('ENOTFOUND')) {
                errorMessage = 'DNS lookup failed: Could not find the AI service';
            }
            
            return { 
                success: false, 
                error: errorMessage,
                details: error.stack
            };
        }
    }

    // Generate career insights based on user data
    async generateCareerInsights(userData) {
        const system = `You are an AI career advisor. Analyze the user's profile and provide insightful career advice.
        Focus on strengths, areas for improvement, and potential career paths.
        Format your response with clear sections using markdown formatting.`;
        
        const messages = [
            {
                role: "user",
                content: `Please analyze my career profile and provide insights:\n${JSON.stringify(userData, null, 2)}`
            }
        ];
        
        return this.generateResponse({ system, messages });
    }

    // Generate learning recommendations based on user goals
    async generateLearningRecommendations(userGoals, userSkills) {
        const system = `You are an AI learning advisor. Recommend learning resources and paths based on the user's goals and current skills.
        Provide specific, actionable recommendations with links to courses, books, or other resources when possible.
        Format your response with clear sections using markdown formatting.`;
        
        const messages = [
            {
                role: "user",
                content: `Please recommend learning resources based on my goals and skills:
                Goals: ${JSON.stringify(userGoals, null, 2)}
                Current Skills: ${JSON.stringify(userSkills, null, 2)}`
            }
        ];
        
        return this.generateResponse({ system, messages });
    }

    // Generate interview preparation advice
    async generateInterviewPrep(jobRole, userExperience) {
        const system = `You are an AI interview coach. Provide preparation advice for the specified job role based on the user's experience.
        Include common questions, suggested answers, and tips for success.
        Format your response with clear sections using markdown formatting.`;
        
        const messages = [
            {
                role: "user",
                content: `Please help me prepare for an interview for the role of ${jobRole}. 
                My experience: ${userExperience}`
            }
        ];
        
        return this.generateResponse({ system, messages });
    }
}

// Initialize the AI service
const aiService = new AIService(ANTHROPIC_API_KEY);

// Test the API on startup
aiService.testConnection().then(isWorking => {
    if (isWorking) {
        console.log('✅ Anthropic API is working correctly');
    } else {
        console.error('❌ Anthropic API is not working. Please check your API key and network connection.');
    }
});

// Update the coach message endpoint to use the AI service
app.post('/api/coach/message', authenticateToken, async (req, res) => {
    try {
        console.log('Received message request from user:', req.user.id);
        const { message, message_type = 'chat' } = req.body;
        
        if (!message || message.trim() === '') {
            return res.status(400).json({ error: 'Message cannot be empty' });
        }
        
        // Check if Anthropic API key is set
        if (!ANTHROPIC_API_KEY) {
            console.error('ANTHROPIC_API_KEY is not set');
            return res.status(500).json({ 
                error: 'Server configuration error', 
                message: 'API key not configured' 
            });
        }
        
        const userId = req.user.id;

        // Get coach data
        db.get(
            `SELECT * FROM career_coach 
             WHERE user_id = ?`,
            [userId],
            async (err, coach) => {
                if (err) {
                    console.error('Database error when fetching coach:', err);
                    return res.status(500).json({ error: 'Database error', details: err.message });
                }
                
                if (!coach) {
                    console.log('Coach not found for user:', userId);
                    return res.status(404).json({ error: 'Career coach not found' });
                }

                const coachId = coach.id;
                
                // Parse coach data safely
                let userProfile, insights, actionItems;
                try {
                    userProfile = typeof coach.user_profile === 'string' ? JSON.parse(coach.user_profile) : coach.user_profile;
                    insights = typeof coach.insights === 'string' ? JSON.parse(coach.insights) : coach.insights;
                    actionItems = typeof coach.action_items === 'string' ? JSON.parse(coach.action_items) : coach.action_items;
                } catch (parseError) {
                    console.error('Error parsing coach data:', parseError);
                    userProfile = {};
                    insights = [];
                    actionItems = [];
                }

                // Save user message
                db.run(
                    `INSERT INTO coach_messages (
                        user_id,
                        coach_id,
                        message_type,
                        message_content,
                        is_user_message
                    ) VALUES (?, ?, ?, ?, ?)`,
                    [userId, coachId, message_type, message, true],
                    async function(err) {
                        if (err) {
                            console.error('Error saving user message:', err);
                            return res.status(500).json({ error: 'Failed to save user message', details: err.message });
                        }

                        // Get recent conversation history
                        db.all(
                            `SELECT * FROM coach_messages 
                             WHERE user_id = ? AND coach_id = ? 
                             ORDER BY created_at DESC LIMIT 10`,
                            [userId, coachId],
                            async (err, recentMessages) => {
                                if (err) {
                                    console.error('Error fetching conversation history:', err);
                                    return res.status(500).json({ error: 'Failed to fetch conversation history', details: err.message });
                                }

                                try {
                                    console.log('Generating coach response with Claude API');

                                // Format conversation for Claude
                                const conversation = recentMessages.reverse().map(msg => ({
                                    role: msg.is_user_message ? "user" : "assistant",
                                    content: msg.message_content
                                }));

                                    // Generate coach response using the AI service
                                    const system = `You are an AI career coach named Coach Alex. Your role is to provide personalized career guidance, support, and accountability.

User Profile: ${JSON.stringify(userProfile)}
Coaching Focus: ${coach.coaching_focus}
Previous Insights: ${JSON.stringify(insights)}
Action Items: ${JSON.stringify(actionItems)}

Guidelines:
1. Be supportive, empathetic, and professional
2. Ask thoughtful questions to deepen understanding
3. Provide specific, actionable advice
4. Reference the user's specific situation and goals
5. Maintain continuity with previous conversations
6. Suggest resources when appropriate
7. Help the user set and track career goals
8. Provide accountability and encouragement
9. Be concise but thorough in your responses

Formatting Guidelines:
- Use **bold text** for important points and headings
- Use _italic text_ for emphasis
- Use ~underlined text~ for key takeaways
- Use numbered lists (1., 2., etc.) for sequential steps or prioritized items
- Use bullet points (- or *) for non-sequential lists
- Use [blue](text) for positive points, [green](text) for action items, [red](text) for warnings or important notes
- Use !!highlighted text!! for very important information
- Use # for main headings, ## for subheadings
- Use > for quotes or testimonials
- Use --- for section breaks`;

                                    const aiResponse = await aiService.generateResponse({
                                        system,
                                        messages: conversation,
                                        max_tokens: 4000
                                    });

                                    if (!aiResponse.success) {
                                        console.error('Error generating coach response:', aiResponse.error);
                                        return res.status(500).json({ 
                                            error: 'Failed to generate coach response',
                                            message: aiResponse.error
                                        });
                                    }

                                    const coachResponse = aiResponse.content;
                                    console.log('Coach response generated, saving to database');

                                // Save coach response
                                db.run(
                                    `INSERT INTO coach_messages (
                                        user_id,
                                        coach_id,
                                        message_type,
                                        message_content,
                                        is_user_message
                                    ) VALUES (?, ?, ?, ?, ?)`,
                                    [userId, coachId, 'response', coachResponse, false],
                                    function(err) {
                                        if (err) {
                                                console.error('Error saving coach response:', err);
                                                return res.status(500).json({ error: 'Failed to save coach response', details: err.message });
                                        }

                                        // Update last check-in time
                                        db.run(
                                            `UPDATE career_coach 
                                             SET last_check_in = ?, last_updated = CURRENT_TIMESTAMP 
                                             WHERE id = ?`,
                                            [new Date().toISOString(), coachId],
                                            function(err) {
                                                if (err) {
                                                    console.error('Error updating last check-in:', err);
                                                        // Non-critical error, continue
                                                }
                                                    
                                                    console.log('Message exchange completed successfully');

                                        res.json({
                                            message: 'Message sent successfully',
                                            response: coachResponse
                                        });
                                    }
                                );
                                        }
                                    );
                                } catch (apiError) {
                                    console.error('Error with Anthropic API:', apiError);
                                    return res.status(500).json({ 
                                        error: 'Failed to generate coach response',
                                        message: apiError.message
                                    });
                                }
                            }
                        );
                    }
                );
            }
        );
    } catch (error) {
        console.error('Error in coach message endpoint:', error);
        res.status(500).json({
            error: 'Server error while processing message',
            details: error.message
        });
    }
});

// Get Daily Check-in
app.get('/api/coach/check-in', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get coach data
        db.get(
            `SELECT * FROM career_coach 
             WHERE user_id = ?`,
            [userId],
            async (err, coach) => {
                if (err) {
                    throw new Error('Database error');
                }
                if (!coach) {
                    return res.status(404).json({ error: 'Career coach not found' });
                }

                const coachId = coach.id;
                const userProfile = JSON.parse(coach.user_profile);
                const insights = JSON.parse(coach.insights);
                const actionItems = JSON.parse(coach.action_items);

                // Generate check-in questions
                const response = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'anthropic-version': '2023-06-01',
                        'x-api-key': ANTHROPIC_API_KEY
                    },
                    body: JSON.stringify({
                        model: "claude-3-sonnet-20240229",
                        max_tokens: 4000,
                        messages: [{
                            role: "user",
                            content: `As an AI career coach, generate a personalized daily check-in for this user:
                            
                            User Profile: ${JSON.stringify(userProfile)}
                            Coaching Focus: ${coach.coaching_focus}
                            Previous Insights: ${JSON.stringify(insights)}
                            Action Items: ${JSON.stringify(actionItems)}
                            Last Check-in: ${coach.last_check_in}
                            
                            Return as JSON with this structure:
                            {
                                "greeting": "Personalized greeting",
                                "reflection_questions": [
                                    {
                                        "question": "Question text",
                                        "type": "reflection/progress/challenge",
                                        "context": "Why this question is relevant now"
                                    }
                                ],
                                "progress_check": {
                                    "action_item": "Specific action item to check on",
                                    "question": "Question about progress"
                                },
                                "motivation": "Motivational message",
                                "tip_of_the_day": {
                                    "title": "Tip title",
                                    "content": "Detailed tip content",
                                    "application": "How to apply this tip"
                                }
                            }`
                        }]
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to generate check-in');
                }

                const data = await response.json();
                const checkIn = JSON.parse(data.content[0].text);

                // Save check-in message
                db.run(
                    `INSERT INTO coach_messages (
                        user_id,
                        coach_id,
                        message_type,
                        message_content,
                        is_user_message
                    ) VALUES (?, ?, ?, ?, ?)`,
                    [
                        userId,
                        coachId,
                        'check-in',
                        JSON.stringify(checkIn),
                        false
                    ],
                    function(err) {
                        if (err) {
                            throw new Error('Failed to save check-in message');
                        }

                        res.json({
                            message: 'Check-in generated successfully',
                            check_in: checkIn
                        });
                    }
                );
            }
        );
    } catch (error) {
        console.error('Error generating check-in:', error);
        res.status(500).json({
            error: 'Failed to generate check-in',
            message: error.message
        });
    }
});

// Update Action Items
app.post('/api/coach/action-items/update', authenticateToken, async (req, res) => {
    try {
        const { action_item_id, status, notes } = req.body;
        const userId = req.user.id;

        // Get coach data
        db.get(
            `SELECT * FROM career_coach 
             WHERE user_id = ?`,
            [userId],
            async (err, coach) => {
                if (err) {
                    throw new Error('Database error');
                }
                if (!coach) {
                    return res.status(404).json({ error: 'Career coach not found' });
                }

                const actionItems = JSON.parse(coach.action_items);
                
                // Find and update the action item
                const updatedActionItems = actionItems.map((item, index) => {
                    if (index === action_item_id) {
                        return {
                            ...item,
                            status: status || item.status,
                            notes: notes || item.notes
                        };
                    }
                    return item;
                });

                // Update in database
                db.run(
                    `UPDATE career_coach 
                     SET action_items = ?, last_updated = CURRENT_TIMESTAMP 
                     WHERE id = ?`,
                    [JSON.stringify(updatedActionItems), coach.id],
                    function(err) {
                        if (err) {
                            throw new Error('Failed to update action items');
                        }

                        res.json({
                            message: 'Action item updated successfully',
                            action_items: updatedActionItems
                        });
                    }
                );
            }
        );
    } catch (error) {
        console.error('Error updating action item:', error);
        res.status(500).json({
            error: 'Failed to update action item',
            message: error.message
        });
    }
});

// Generate New Insights
app.post('/api/coach/insights/generate', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get coach data and messages
        db.get(
            `SELECT * FROM career_coach 
             WHERE user_id = ?`,
            [userId],
            async (err, coach) => {
                if (err) {
                    throw new Error('Database error');
                }
                if (!coach) {
                    return res.status(404).json({ error: 'Career coach not found' });
                }

                // Get recent messages
                db.all(
                    `SELECT * FROM coach_messages 
                     WHERE user_id = ? AND coach_id = ? 
                     ORDER BY created_at DESC LIMIT 30`,
                    [userId, coach.id],
                    async (err, messages) => {
                        if (err) {
                            throw new Error('Failed to fetch messages');
                        }

                        const userProfile = JSON.parse(coach.user_profile);
                        const currentInsights = JSON.parse(coach.insights);
                        const actionItems = JSON.parse(coach.action_items);

                        // Format conversation for analysis
                        const conversation = messages.map(msg => ({
                            role: msg.is_user_message ? "user" : "assistant",
                            content: msg.message_content,
                            timestamp: msg.created_at
                        }));

                        // Generate new insights
                        const response = await fetch('https://api.anthropic.com/v1/messages', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'anthropic-version': '2023-06-01',
                                'x-api-key': ANTHROPIC_API_KEY
                            },
                            body: JSON.stringify({
                                model: "claude-3-sonnet-20240229",
                                max_tokens: 4000,
                                messages: [{
                                    role: "user",
                                    content: `As an AI career coach, analyze this conversation history and generate new insights and action items:
                                    
                                    User Profile: ${JSON.stringify(userProfile)}
                                    Coaching Focus: ${coach.coaching_focus}
                                    Current Insights: ${JSON.stringify(currentInsights)}
                                    Current Action Items: ${JSON.stringify(actionItems)}
                                    Conversation History: ${JSON.stringify(conversation)}
                                    
                                    Return as JSON with this structure:
                                    {
                                        "updated_assessment": "Updated assessment of the user's career situation",
                                        "new_insights": [
                                            {
                                                "area": "Area of insight",
                                                "insight": "Detailed insight",
                                                "why_important": "Why this matters",
                                                "evidence": "Evidence from conversations"
                                            }
                                        ],
                                        "new_action_items": [
                                            {
                                                "title": "Action item title",
                                                "description": "Detailed description",
                                                "timeline": "Suggested timeline",
                                                "expected_outcome": "Expected outcome",
                                                "status": "pending"
                                            }
                                        ],
                                        "progress_assessment": "Assessment of user's progress",
                                        "coaching_recommendations": ["Recommendation 1", "Recommendation 2"]
                                    }`
                                }]
                            })
                        });

                        if (!response.ok) {
                            throw new Error('Failed to generate insights');
                        }

                        const data = await response.json();
                        const newInsights = JSON.parse(data.content[0].text);

                        // Update insights and add new action items
                        const updatedInsights = {
                            ...currentInsights,
                            assessment: newInsights.updated_assessment,
                            insights: [
                                ...currentInsights.insights,
                                ...newInsights.new_insights
                            ]
                        };

                        const updatedActionItems = [
                            ...actionItems,
                            ...newInsights.new_action_items
                        ];

                        // Update in database
                        db.run(
                            `UPDATE career_coach 
                             SET insights = ?, 
                                 action_items = ?, 
                                 last_updated = CURRENT_TIMESTAMP 
                             WHERE id = ?`,
                            [
                                JSON.stringify(updatedInsights),
                                JSON.stringify(updatedActionItems),
                                coach.id
                            ],
                            function(err) {
                                if (err) {
                                    throw new Error('Failed to update insights');
                                }

                                res.json({
                                    message: 'Insights generated successfully',
                                    insights: updatedInsights,
                                    action_items: updatedActionItems,
                                    progress_assessment: newInsights.progress_assessment,
                                    coaching_recommendations: newInsights.coaching_recommendations
                                });
                            }
                        );
                    }
                );
            }
        );
    } catch (error) {
        console.error('Error generating insights:', error);
        res.status(500).json({
            error: 'Failed to generate insights',
            message: error.message
        });
    }
});

// Create Portfolio
app.post('/api/portfolio/create', authenticateToken, async (req, res) => {
    try {
        const { title, description, template, theme } = req.body;
        const userId = req.user.id;

        // Check if user already has a portfolio
        db.get(
            `SELECT COUNT(*) as count FROM portfolios WHERE user_id = ?`,
            [userId],
            async (err, result) => {
                if (err) {
                    throw new Error('Database error');
                }

                // Create portfolio
                db.run(
                    `INSERT INTO portfolios (
                        user_id,
                        title,
                        description,
                        template,
                        theme,
                        meta_data
                    ) VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        userId,
                        title,
                        description,
                        template || 'standard',
                        theme || 'light',
                        JSON.stringify({
                            seo: {
                                title: title,
                                description: description,
                                keywords: []
                            },
                            social: {
                                linkedin: '',
                                github: '',
                                twitter: '',
                                website: ''
                            }
                        })
                    ],
                    async function(err) {
                        if (err) {
                            throw new Error('Failed to create portfolio');
                        }

                        const portfolioId = this.lastID;

                        // Create default sections
                        const defaultSections = [
                            {
                                section_type: 'about',
                                title: 'About Me',
                                content: 'Tell your professional story here.',
                                display_order: 1
                            },
                            {
                                section_type: 'experience',
                                title: 'Work Experience',
                                content: JSON.stringify([]),
                                display_order: 2
                            },
                            {
                                section_type: 'education',
                                title: 'Education',
                                content: JSON.stringify([]),
                                display_order: 3
                            },
                            {
                                section_type: 'skills',
                                title: 'Skills',
                                content: JSON.stringify([]),
                                display_order: 4
                            },
                            {
                                section_type: 'projects',
                                title: 'Projects',
                                content: JSON.stringify([]),
                                display_order: 5
                            },
                            {
                                section_type: 'contact',
                                title: 'Contact',
                                content: JSON.stringify({
                                    email: '',
                                    phone: '',
                                    location: '',
                                    availability: ''
                                }),
                                display_order: 6
                            }
                        ];

                        // Insert default sections
                        const sectionValues = defaultSections.map(section => 
                            `(${portfolioId}, '${section.section_type}', '${section.title}', '${section.content}', ${section.display_order}, true)`
                        ).join(',');

                        db.run(
                            `INSERT INTO portfolio_sections (
                                portfolio_id, section_type, title, content, display_order, is_visible
                            ) VALUES ${sectionValues}`,
                            function(err) {
                                if (err) {
                                    console.error('Error creating default sections:', err);
                                    throw new Error('Failed to create portfolio sections');
                                }

                                res.status(201).json({
                                    message: 'Portfolio created successfully',
                                    portfolio_id: portfolioId,
                                    title: title,
                                    sections: defaultSections.map(s => ({
                                        type: s.section_type,
                                        title: s.title,
                                        display_order: s.display_order
                                    }))
                                });
                            }
                        );
                    }
                );
            }
        );
    } catch (error) {
        console.error('Error creating portfolio:', error);
        res.status(500).json({
            error: 'Failed to create portfolio',
            message: error.message
        });
    }
});

// Get Portfolio
app.get('/api/portfolio/:id?', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const portfolioId = req.params.id;
    
    let query = `SELECT * FROM portfolios WHERE user_id = ?`;
    let params = [userId];
    
    if (portfolioId) {
        query += ` AND id = ?`;
        params.push(portfolioId);
    } else {
        query += ` ORDER BY last_updated DESC LIMIT 1`;
    }
    
    db.get(query, params, (err, portfolio) => {
        if (err) {
            console.error('Error fetching portfolio:', err);
            return res.status(500).json({ error: 'Failed to fetch portfolio' });
        }
        if (!portfolio) {
            return res.status(404).json({ error: 'Portfolio not found' });
        }

        // Get portfolio sections
        db.all(
            `SELECT * FROM portfolio_sections 
             WHERE portfolio_id = ? 
             ORDER BY display_order ASC`,
            [portfolio.id],
            (err, sections) => {
                if (err) {
                    console.error('Error fetching portfolio sections:', err);
                    return res.status(500).json({ error: 'Failed to fetch portfolio sections' });
                }

                // Get portfolio projects
                db.all(
                    `SELECT * FROM portfolio_projects 
                     WHERE portfolio_id = ? 
                     ORDER BY display_order ASC`,
                    [portfolio.id],
                    (err, projects) => {
                        if (err) {
                            console.error('Error fetching portfolio projects:', err);
                            return res.status(500).json({ error: 'Failed to fetch portfolio projects' });
                        }

                        // Get portfolio skills
                        db.all(
                            `SELECT * FROM portfolio_skills 
                             WHERE portfolio_id = ? 
                             ORDER BY display_order ASC`,
                            [portfolio.id],
                            (err, skills) => {
                                if (err) {
                                    console.error('Error fetching portfolio skills:', err);
                                    return res.status(500).json({ error: 'Failed to fetch portfolio skills' });
                                }

                                // Get portfolio testimonials
                                db.all(
                                    `SELECT * FROM portfolio_testimonials 
                                     WHERE portfolio_id = ? 
                                     ORDER BY display_order ASC`,
                                    [portfolio.id],
                                    (err, testimonials) => {
                                        if (err) {
                                            console.error('Error fetching portfolio testimonials:', err);
                                            return res.status(500).json({ error: 'Failed to fetch portfolio testimonials' });
                                        }

                                        const portfolioData = {
                                            id: portfolio.id,
                                            title: portfolio.title,
                                            description: portfolio.description,
                                            template: portfolio.template,
                                            theme: portfolio.theme,
                                            is_public: portfolio.is_public,
                                            view_count: portfolio.view_count,
                                            custom_domain: portfolio.custom_domain,
                                            meta_data: JSON.parse(portfolio.meta_data),
                                            sections: sections.map(section => ({
                                                id: section.id,
                                                type: section.section_type,
                                                title: section.title,
                                                content: JSON.parse(section.content),
                                                display_order: section.display_order,
                                                is_visible: section.is_visible
                                            })),
                                            projects: projects,
                                            skills: skills,
                                            testimonials: testimonials,
                                            created_at: portfolio.created_at,
                                            last_updated: portfolio.last_updated
                                        };

                                        res.json({ portfolio: portfolioData });
                                    }
                                );
                            }
                        );
                    }
                );
            }
        );
    });
});

// Update Portfolio
app.put('/api/portfolio/:id', authenticateToken, (req, res) => {
    try {
        const { title, description, template, theme, is_public, meta_data } = req.body;
        const userId = req.user.id;
        const portfolioId = req.params.id;

        // Verify ownership
        db.get(
            `SELECT id FROM portfolios WHERE id = ? AND user_id = ?`,
            [portfolioId, userId],
            (err, portfolio) => {
                if (err) {
                    throw new Error('Database error');
                }
                if (!portfolio) {
                    return res.status(404).json({ error: 'Portfolio not found or unauthorized' });
                }

                // Update portfolio
                db.run(
                    `UPDATE portfolios 
                     SET title = ?,
                         description = ?,
                         template = ?,
                         theme = ?,
                         is_public = ?,
                         meta_data = ?,
                         last_updated = CURRENT_TIMESTAMP
                     WHERE id = ?`,
                    [
                        title,
                        description,
                        template,
                        theme,
                        is_public,
                        JSON.stringify(meta_data),
                        portfolioId
                    ],
                    function(err) {
                        if (err) {
                            throw new Error('Failed to update portfolio');
                        }

                        res.json({
                            message: 'Portfolio updated successfully',
                            portfolio_id: portfolioId
                        });
                    }
                );
            }
        );
    } catch (error) {
        console.error('Error updating portfolio:', error);
        res.status(500).json({
            error: 'Failed to update portfolio',
            message: error.message
        });
    }
});

// Update Portfolio Section
app.put('/api/portfolio/section/:id', authenticateToken, (req, res) => {
    try {
        const { title, content, display_order, is_visible } = req.body;
        const userId = req.user.id;
        const sectionId = req.params.id;

        // Verify ownership
        db.get(
            `SELECT ps.id 
             FROM portfolio_sections ps
             JOIN portfolios p ON ps.portfolio_id = p.id
             WHERE ps.id = ? AND p.user_id = ?`,
            [sectionId, userId],
            (err, section) => {
                if (err) {
                    throw new Error('Database error');
                }
                if (!section) {
                    return res.status(404).json({ error: 'Section not found or unauthorized' });
                }

                // Update section
                db.run(
                    `UPDATE portfolio_sections 
                     SET title = ?,
                         content = ?,
                         display_order = ?,
                         is_visible = ?,
                         last_updated = CURRENT_TIMESTAMP
                     WHERE id = ?`,
                    [
                        title,
                        JSON.stringify(content),
                        display_order,
                        is_visible,
                        sectionId
                    ],
                    function(err) {
                        if (err) {
                            throw new Error('Failed to update section');
                        }

                        res.json({
                            message: 'Section updated successfully',
                            section_id: sectionId
                        });
                    }
                );
            }
        );
    } catch (error) {
        console.error('Error updating section:', error);
        res.status(500).json({
            error: 'Failed to update section',
            message: error.message
        });
    }
});

// Add Project
app.post('/api/portfolio/:id/project', authenticateToken, (req, res) => {
    try {
        const { title, description, technologies, image_url, project_url, github_url, start_date, end_date, is_featured } = req.body;
        const userId = req.user.id;
        const portfolioId = req.params.id;

        // Verify ownership
        db.get(
            `SELECT id FROM portfolios WHERE id = ? AND user_id = ?`,
            [portfolioId, userId],
            (err, portfolio) => {
                if (err) {
                    throw new Error('Database error');
                }
                if (!portfolio) {
                    return res.status(404).json({ error: 'Portfolio not found or unauthorized' });
                }

                // Get max display order
                db.get(
                    `SELECT MAX(display_order) as max_order FROM portfolio_projects WHERE portfolio_id = ?`,
                    [portfolioId],
                    (err, result) => {
                        if (err) {
                            throw new Error('Database error');
                        }

                        const displayOrder = (result.max_order || 0) + 1;

                        // Add project
                        db.run(
                            `INSERT INTO portfolio_projects (
                                portfolio_id,
                                title,
                                description,
                                technologies,
                                image_url,
                                project_url,
                                github_url,
                                start_date,
                                end_date,
                                display_order,
                                is_featured
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                portfolioId,
                                title,
                                description,
                                JSON.stringify(technologies),
                                image_url,
                                project_url,
                                github_url,
                                start_date,
                                end_date,
                                displayOrder,
                                is_featured
                            ],
                            function(err) {
                                if (err) {
                                    throw new Error('Failed to add project');
                                }

                                res.status(201).json({
                                    message: 'Project added successfully',
                                    project_id: this.lastID
                                });
                            }
                        );
                    }
                );
            }
        );
    } catch (error) {
        console.error('Error adding project:', error);
        res.status(500).json({
            error: 'Failed to add project',
            message: error.message
        });
    }
});

// Add Skill
app.post('/api/portfolio/:id/skill', authenticateToken, (req, res) => {
    try {
        const { skill_name, skill_category, proficiency_level, years_experience, is_featured } = req.body;
        const userId = req.user.id;
        const portfolioId = req.params.id;

        // Verify ownership
        db.get(
            `SELECT id FROM portfolios WHERE id = ? AND user_id = ?`,
            [portfolioId, userId],
            (err, portfolio) => {
                if (err) {
                    throw new Error('Database error');
                }
                if (!portfolio) {
                    return res.status(404).json({ error: 'Portfolio not found or unauthorized' });
                }

                // Get max display order
                db.get(
                    `SELECT MAX(display_order) as max_order FROM portfolio_skills WHERE portfolio_id = ?`,
                    [portfolioId],
                    (err, result) => {
                        if (err) {
                            throw new Error('Database error');
                        }

                        const displayOrder = (result.max_order || 0) + 1;

                        // Add skill
                        db.run(
                            `INSERT INTO portfolio_skills (
                                portfolio_id,
                                skill_name,
                                skill_category,
                                proficiency_level,
                                years_experience,
                                is_featured,
                                display_order
                            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                            [
                                portfolioId,
                                skill_name,
                                skill_category,
                                proficiency_level,
                                years_experience,
                                is_featured,
                                displayOrder
                            ],
                            function(err) {
                                if (err) {
                                    throw new Error('Failed to add skill');
                                }

                                res.status(201).json({
                                    message: 'Skill added successfully',
                                    skill_id: this.lastID
                                });
                            }
                        );
                    }
                );
            }
        );
    } catch (error) {
        console.error('Error adding skill:', error);
        res.status(500).json({
            error: 'Failed to add skill',
            message: error.message
        });
    }
});

// Add Testimonial
app.post('/api/portfolio/:id/testimonial', authenticateToken, (req, res) => {
    try {
        const { author_name, author_title, author_company, content, rating } = req.body;
        const userId = req.user.id;
        const portfolioId = req.params.id;

        // Verify ownership
        db.get(
            `SELECT id FROM portfolios WHERE id = ? AND user_id = ?`,
            [portfolioId, userId],
            (err, portfolio) => {
                if (err) {
                    throw new Error('Database error');
                }
                if (!portfolio) {
                    return res.status(404).json({ error: 'Portfolio not found or unauthorized' });
                }

                // Get max display order
                db.get(
                    `SELECT MAX(display_order) as max_order FROM portfolio_testimonials WHERE portfolio_id = ?`,
                    [portfolioId],
                    (err, result) => {
                        if (err) {
                            throw new Error('Database error');
                        }

                        const displayOrder = (result.max_order || 0) + 1;

                        // Add testimonial
                        db.run(
                            `INSERT INTO portfolio_testimonials (
                                portfolio_id,
                                author_name,
                                author_title,
                                author_company,
                                content,
                                rating,
                                display_order
                            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                            [
                                portfolioId,
                                author_name,
                                author_title,
                                author_company,
                                content,
                                rating,
                                displayOrder
                            ],
                            function(err) {
                                if (err) {
                                    throw new Error('Failed to add testimonial');
                                }

                                res.status(201).json({
                                    message: 'Testimonial added successfully',
                                    testimonial_id: this.lastID
                                });
                            }
                        );
                    }
                );
            }
        );
    } catch (error) {
        console.error('Error adding testimonial:', error);
        res.status(500).json({
            error: 'Failed to add testimonial',
            message: error.message
        });
    }
});

// Generate Portfolio Content
app.post('/api/portfolio/:id/generate', authenticateToken, async (req, res) => {
    try {
        const { section_type, user_data } = req.body;
        const userId = req.user.id;
        const portfolioId = req.params.id;

        // Verify ownership
        db.get(
            `SELECT * FROM portfolios WHERE id = ? AND user_id = ?`,
            [portfolioId, userId],
            async (err, portfolio) => {
                if (err) {
                    throw new Error('Database error');
                }
                if (!portfolio) {
                    return res.status(404).json({ error: 'Portfolio not found or unauthorized' });
                }

                // Get user's assessment data
                db.get(
                    `SELECT * FROM reports 
                     WHERE user_id = ? 
                     ORDER BY timestamp DESC 
                     LIMIT 1`,
                    [userId],
                    async (err, report) => {
                        let reportData = {};
                        if (!err && report) {
                            reportData = JSON.parse(report.report_data);
                        }

                        // Generate content based on section type
                        const response = await fetch('https://api.anthropic.com/v1/messages', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'anthropic-version': '2023-06-01',
                                'x-api-key': ANTHROPIC_API_KEY
                            },
                            body: JSON.stringify({
                                model: "claude-3-sonnet-20240229",
                                max_tokens: 4000,
                                messages: [{
                                    role: "user",
                                    content: `Generate professional portfolio content for a ${section_type} section.
                                    
                                    User Data: ${JSON.stringify(user_data)}
                                    Assessment Data: ${JSON.stringify(reportData)}
                                    
                                    Return as JSON with appropriate structure for a ${section_type} section.
                                    For "about" sections, include a professional bio.
                                    For "experience" sections, format work history professionally.
                                    For "skills" sections, organize skills by category with proficiency levels.
                                    For "projects" sections, create compelling project descriptions.
                                    For "education" sections, format educational background professionally.
                                    For "contact" sections, suggest professional contact information format.
                                    
                                    Make the content professional, engaging, and optimized for career advancement.`
                                }]
                            })
                        });

                        if (!response.ok) {
                            throw new Error('Failed to generate content');
                        }

                        const data = await response.json();
                        const generatedContent = JSON.parse(data.content[0].text);

                        res.json({
                            message: 'Content generated successfully',
                            content: generatedContent
                        });
                    }
                );
            }
        );
    } catch (error) {
        console.error('Error generating content:', error);
        res.status(500).json({
            error: 'Failed to generate content',
            message: error.message
        });
    }
});

// User data endpoints for component-specific data
app.post('/api/user-data/:componentType', authenticateToken, async (req, res) => {
    try {
        const { componentType } = req.params;
        const userId = req.user.id;
        const data = req.body;
        const timestamp = new Date().toISOString();

        console.log(`Saving ${componentType} data for user ${userId}`);

        // Check if data already exists for this component and user
        db.get(
            `SELECT id FROM user_data WHERE user_id = ? AND component_type = ?`,
            [userId, componentType],
            (err, row) => {
    if (err) {
                    console.error(`Error checking for existing ${componentType} data:`, err);
                    return res.status(500).json({ error: `Failed to save ${componentType} data` });
                }

                const dataJson = JSON.stringify(data);

                if (row) {
                    // Update existing data
                    db.run(
                        `UPDATE user_data 
                         SET data = ?, updated_at = ? 
                         WHERE user_id = ? AND component_type = ?`,
                        [dataJson, timestamp, userId, componentType],
                        function(err) {
                            if (err) {
                                console.error(`Error updating ${componentType} data:`, err);
                                return res.status(500).json({ error: `Failed to update ${componentType} data` });
                            }
                            res.status(200).json({ 
                                message: `${componentType} data updated successfully`,
                                dataId: row.id
                            });
                        }
                    );
                } else {
                    // Insert new data
                    db.run(
                        `INSERT INTO user_data (user_id, component_type, data, created_at, updated_at)
                         VALUES (?, ?, ?, ?, ?)`,
                        [userId, componentType, dataJson, timestamp, timestamp],
                        function(err) {
                            if (err) {
                                console.error(`Error inserting ${componentType} data:`, err);
                                return res.status(500).json({ error: `Failed to save ${componentType} data` });
                            }
                            res.status(201).json({ 
                                message: `${componentType} data saved successfully`,
                                dataId: this.lastID
                            });
                        }
                    );
                }
            }
        );
    } catch (error) {
        console.error(`Error in user-data POST endpoint:`, error);
        res.status(500).json({ 
            error: `Server error while saving data`,
            details: error.message
        });
    }
});

app.get('/api/user-data/:componentType', authenticateToken, async (req, res) => {
    try {
        const { componentType } = req.params;
        const userId = req.user.id;

        console.log(`Retrieving ${componentType} data for user ${userId}`);

        db.get(
            `SELECT data, updated_at FROM user_data WHERE user_id = ? AND component_type = ?`,
            [userId, componentType],
            (err, row) => {
                if (err) {
                    console.error(`Error retrieving ${componentType} data:`, err);
                    return res.status(500).json({ error: `Failed to retrieve ${componentType} data` });
                }

                if (!row) {
                    return res.status(404).json({ error: `No ${componentType} data found` });
                }

                try {
                    const parsedData = JSON.parse(row.data);
                    res.json({ 
                        data: parsedData,
                        updated_at: row.updated_at
                    });
                } catch (parseError) {
                    console.error(`Error parsing ${componentType} data:`, parseError);
                    res.status(500).json({ error: `Failed to parse ${componentType} data` });
                }
            }
        );
    } catch (error) {
        console.error(`Error in user-data GET endpoint:`, error);
        res.status(500).json({ 
            error: `Server error while retrieving data`,
            details: error.message
        });
    }
});

app.delete('/api/user-data/:componentType', authenticateToken, async (req, res) => {
    try {
        const { componentType } = req.params;
        const userId = req.user.id;

        console.log(`Deleting ${componentType} data for user ${userId}`);

        db.run(
            `DELETE FROM user_data WHERE user_id = ? AND component_type = ?`,
            [userId, componentType],
            function(err) {
                if (err) {
                    console.error(`Error deleting ${componentType} data:`, err);
                    return res.status(500).json({ error: `Failed to delete ${componentType} data` });
                }

                if (this.changes === 0) {
                    return res.status(404).json({ error: `No ${componentType} data found` });
                }

                res.json({ message: `${componentType} data deleted successfully` });
            }
        );
    } catch (error) {
        console.error(`Error in user-data DELETE endpoint:`, error);
        res.status(500).json({ 
            error: `Server error while deleting data`,
            details: error.message
        });
    }
});

// Add a ping endpoint for server availability checks
app.get('/ping', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Start the server with dynamic port
findAvailablePort(5000, (err, availablePort) => {
    if (err) {
        console.error('Error finding available port:', err);
    process.exit(1);
    }
    
    PORT = availablePort;
    
    // Save the port to a file so the client can read it
    fs.writeFileSync(path.join(__dirname, '.port'), PORT.toString());
    
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`API URL: http://localhost:${PORT}`);
    });
});

// Learning Dashboard API Endpoints
app.get('/api/learning-dashboard', authenticateToken, (req, res) => {
    const userId = req.user.id;
    
    // Log the request
    console.log(`Fetching learning dashboard data for user: ${userId}`);
    
    // Query the database for learning dashboard data
    db.get(
        `SELECT * FROM users WHERE id = ?`,
        [userId],
        (err, user) => {
            if (err) {
                console.error('Database error when fetching user:', err);
                return res.status(500).json({ error: 'Database error', details: err.message });
            }
            
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            // Get courses in progress
            db.all(
                `SELECT * FROM user_courses 
                 WHERE user_id = ? AND status = 'in_progress'`,
                [userId],
                (err, currentCourses) => {
                    if (err) {
                        console.error('Error fetching current courses:', err);
                        return res.status(500).json({ error: 'Failed to fetch current courses' });
                    }
                    
                    // Get completed courses
                    db.all(
                        `SELECT * FROM user_courses 
                         WHERE user_id = ? AND status = 'completed'`,
                        [userId],
                        (err, completedCourses) => {
                            if (err) {
                                console.error('Error fetching completed courses:', err);
                                return res.status(500).json({ error: 'Failed to fetch completed courses' });
                            }
                            
                            // Get skills
                            db.all(
                                `SELECT * FROM user_skills WHERE user_id = ?`,
                                [userId],
                                (err, skills) => {
                                    if (err) {
                                        console.error('Error fetching skills:', err);
                                        return res.status(500).json({ error: 'Failed to fetch skills' });
                                    }
                                    
                                    // Get certificates
                                    db.all(
                                        `SELECT * FROM user_certificates WHERE user_id = ?`,
                                        [userId],
                                        (err, certificates) => {
                                            if (err) {
                                                console.error('Error fetching certificates:', err);
                                                return res.status(500).json({ error: 'Failed to fetch certificates' });
                                            }
                                            
                                            // Get learning goals
                                            db.all(
                                                `SELECT * FROM learning_goals WHERE user_id = ?`,
                                                [userId],
                                                (err, goals) => {
                                                    if (err) {
                                                        console.error('Error fetching learning goals:', err);
                                                        return res.status(500).json({ error: 'Failed to fetch learning goals' });
                                                    }
                                                    
                                                    // Get learning path
                                                    db.get(
                                                        `SELECT * FROM learning_paths WHERE user_id = ?`,
                                                        [userId],
                                                        (err, learningPath) => {
                                                            if (err) {
                                                                console.error('Error fetching learning path:', err);
                                                                return res.status(500).json({ error: 'Failed to fetch learning path' });
                                                            }
                                                            
                                                            // Get progress data
                                                            db.all(
                                                                `SELECT * FROM course_progress WHERE user_id = ?`,
                                                                [userId],
                                                                (err, progressData) => {
                                                                    if (err) {
                                                                        console.error('Error fetching progress data:', err);
                                                                        return res.status(500).json({ error: 'Failed to fetch progress data' });
                                                                    }
                                                                    
                                                                    // Format progress data
                                                                    const progress = {};
                                                                    progressData.forEach(item => {
                                                                        progress[item.course_id] = item.progress_percentage;
                                                                    });
                                                                    
                                                                    // If no learning path exists, create a default one
                                                                    const path = learningPath || {
                                                                        id: null,
                                                                        user_id: userId,
                                                                        current_focus: 'Not set',
                                                                        next_milestone: 'Not set',
                                                                        recommended_courses: '[]'
                                                                    };
                                                                    
                                                                    // Return the dashboard data
                                                                    res.json({
                                                                        currentCourses: currentCourses || [],
                                                                        completedCourses: completedCourses || [],
                                                                        learningPath: path,
                                                                        skills: skills || [],
                                                                        certificates: certificates || [],
                                                                        goals: goals || [],
                                                                        progress: progress
                                                                    });
                                                                }
                                                            );
                                                        }
                                                    );
                                                }
                                            );
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        }
    );
});

// Update course progress
app.post('/api/learning-dashboard/progress', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { courseId, progress } = req.body;
    
    if (!courseId || progress === undefined) {
        return res.status(400).json({ error: 'Course ID and progress are required' });
    }
    
    // Check if progress record exists
    db.get(
        `SELECT * FROM course_progress 
         WHERE user_id = ? AND course_id = ?`,
        [userId, courseId],
        (err, record) => {
            if (err) {
                console.error('Error checking progress record:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (record) {
                // Update existing record
                db.run(
                    `UPDATE course_progress 
                     SET progress_percentage = ?, updated_at = CURRENT_TIMESTAMP 
                     WHERE user_id = ? AND course_id = ?`,
                    [progress, userId, courseId],
                    function(err) {
                        if (err) {
                            console.error('Error updating progress:', err);
                            return res.status(500).json({ error: 'Failed to update progress' });
                        }
                        
                        // Check if course is completed
                        if (progress >= 100) {
                            db.run(
                                `UPDATE user_courses 
                                 SET status = 'completed', completed_at = CURRENT_TIMESTAMP 
                                 WHERE user_id = ? AND id = ?`,
                                [userId, courseId],
                                function(err) {
                                    if (err) {
                                        console.error('Error updating course status:', err);
                                    }
                                }
                            );
                        }
                        
                        res.json({ message: 'Progress updated successfully' });
                    }
                );
            } else {
                // Create new record
                db.run(
                    `INSERT INTO course_progress (
                        user_id, course_id, progress_percentage, created_at, updated_at
                    ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                    [userId, courseId, progress],
                    function(err) {
                        if (err) {
                            console.error('Error creating progress record:', err);
                            return res.status(500).json({ error: 'Failed to create progress record' });
                        }
                        
                        res.json({ message: 'Progress created successfully' });
                    }
                );
            }
        }
    );
});

// Add learning goal
app.post('/api/learning-dashboard/goals', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { title, description, target_date, status = 'active' } = req.body;
    
    if (!title) {
        return res.status(400).json({ error: 'Goal title is required' });
    }
    
    db.run(
        `INSERT INTO learning_goals (
            user_id, title, description, target_date, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [userId, title, description, target_date, status],
        function(err) {
            if (err) {
                console.error('Error adding learning goal:', err);
                return res.status(500).json({ error: 'Failed to add learning goal' });
            }
            
            res.json({ 
                message: 'Learning goal added successfully',
                goalId: this.lastID
            });
        }
    );
});

// Career Timeline API Endpoints
app.get('/api/career-timeline', authenticateToken, (req, res) => {
    const userId = req.user.id;
    
    // Log the request
    console.log(`Fetching career timeline data for user: ${userId}`);
    
    // Get the user's career timeline
    db.get(
        `SELECT * FROM career_timeline WHERE user_id = ?`,
        [userId],
        (err, timeline) => {
            if (err) {
                console.error('Database error when fetching timeline:', err);
                return res.status(500).json({ error: 'Database error', details: err.message });
            }
            
            // If no timeline exists, create a default one
            if (!timeline) {
                console.log(`No timeline found for user ${userId}, creating default timeline`);
                
                // Create a default timeline
                db.run(
                    `INSERT INTO career_timeline (
                        user_id, 
                        current_role, 
                        target_role, 
                        timeline_data, 
                        salary_data, 
                        skills_roadmap, 
                        milestones,
                        last_updated
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                    [
                        userId, 
                        'Current Role', 
                        'Target Role', 
                        JSON.stringify([]), 
                        JSON.stringify({}), 
                        JSON.stringify([]), 
                        JSON.stringify([])
                    ],
                    function(err) {
                        if (err) {
                            console.error('Error creating default timeline:', err);
                            return res.status(500).json({ error: 'Failed to create timeline' });
                        }
                        
                        // Return the newly created timeline
                        const newTimelineId = this.lastID;
                        db.get(
                            `SELECT * FROM career_timeline WHERE id = ?`,
                            [newTimelineId],
                            (err, newTimeline) => {
                                if (err) {
                                    console.error('Error fetching new timeline:', err);
                                    return res.status(500).json({ error: 'Failed to fetch new timeline' });
                                }
                                
                                // Parse JSON fields
                                const parsedTimeline = {
                                    id: newTimeline.id,
                                    user_id: newTimeline.user_id,
                                    current_role: newTimeline.current_role,
                                    target_role: newTimeline.target_role,
                                    timeline_data: JSON.parse(newTimeline.timeline_data || '[]'),
                                    salary_data: JSON.parse(newTimeline.salary_data || '{}'),
                                    skills_roadmap: JSON.parse(newTimeline.skills_roadmap || '[]'),
                                    milestones: JSON.parse(newTimeline.milestones || '[]'),
                                    last_updated: newTimeline.last_updated
                                };
                                
                                // Get career goals
                                db.all(
                                    `SELECT * FROM career_goals WHERE user_id = ? AND timeline_id = ?`,
                                    [userId, newTimelineId],
                                    (err, goals) => {
                                        if (err) {
                                            console.error('Error fetching goals:', err);
                                            return res.status(500).json({ error: 'Failed to fetch goals' });
                                        }
                                        
                                        // Parse goals data
                                        const parsedGoals = goals.map(goal => ({
                                            ...goal,
                                            goal_data: JSON.parse(goal.goal_data || '{}')
                                        }));
                                        
                                        // Return timeline data
                                        res.json({
                                            timeline: parsedTimeline,
                                            goals: parsedGoals,
                                            milestones: parsedTimeline.milestones,
                                            achievements: [],
                                            projections: {
                                                salary: parsedTimeline.salary_data,
                                                skills: parsedTimeline.skills_roadmap
                                            }
                                        });
                                    }
                                );
                            }
                        );
                    }
                );
            } else {
                // Parse JSON fields
                const parsedTimeline = {
                    id: timeline.id,
                    user_id: timeline.user_id,
                    current_role: timeline.current_role,
                    target_role: timeline.target_role,
                    timeline_data: JSON.parse(timeline.timeline_data || '[]'),
                    salary_data: JSON.parse(timeline.salary_data || '{}'),
                    skills_roadmap: JSON.parse(timeline.skills_roadmap || '[]'),
                    milestones: JSON.parse(timeline.milestones || '[]'),
                    last_updated: timeline.last_updated
                };
                
                // Get career goals
                db.all(
                    `SELECT * FROM career_goals WHERE user_id = ? AND timeline_id = ?`,
                    [userId, timeline.id],
                    (err, goals) => {
                        if (err) {
                            console.error('Error fetching goals:', err);
                            return res.status(500).json({ error: 'Failed to fetch goals' });
                        }
                        
                        // Parse goals data
                        const parsedGoals = goals.map(goal => ({
                            ...goal,
                            goal_data: JSON.parse(goal.goal_data || '{}')
                        }));
                        
                        // Return timeline data
                        res.json({
                            timeline: parsedTimeline,
                            goals: parsedGoals,
                            milestones: parsedTimeline.milestones,
                            achievements: [],
                            projections: {
                                salary: parsedTimeline.salary_data,
                                skills: parsedTimeline.skills_roadmap
                            }
                        });
                    }
                );
            }
        }
    );
});

// Add milestone to career timeline
app.post('/api/career-timeline/milestones', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { title, description, date, type, status = 'planned' } = req.body;
    
    if (!title || !date) {
        return res.status(400).json({ error: 'Title and date are required' });
    }
    
    // Get the user's timeline
    db.get(
        `SELECT * FROM career_timeline WHERE user_id = ?`,
        [userId],
        (err, timeline) => {
            if (err) {
                console.error('Database error when fetching timeline:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (!timeline) {
                return res.status(404).json({ error: 'Timeline not found' });
            }
            
            // Parse existing milestones
            const milestones = JSON.parse(timeline.milestones || '[]');
            
            // Add new milestone
            const newMilestone = {
                id: Date.now().toString(),
                title,
                description,
                date,
                type,
                status
            };
            
            milestones.push(newMilestone);
            
            // Update timeline with new milestones
            db.run(
                `UPDATE career_timeline 
                 SET milestones = ?, last_updated = CURRENT_TIMESTAMP 
                 WHERE id = ?`,
                [JSON.stringify(milestones), timeline.id],
                function(err) {
                    if (err) {
                        console.error('Error updating milestones:', err);
                        return res.status(500).json({ error: 'Failed to add milestone' });
                    }
                    
                    res.json({ 
                        message: 'Milestone added successfully',
                        milestone: newMilestone
                    });
                }
            );
        }
    );
});

// Update milestone in career timeline
app.put('/api/career-timeline/milestones/:id', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const milestoneId = req.params.id;
    const updates = req.body;
    
    // Get the user's timeline
    db.get(
        `SELECT * FROM career_timeline WHERE user_id = ?`,
        [userId],
        (err, timeline) => {
            if (err) {
                console.error('Database error when fetching timeline:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (!timeline) {
                return res.status(404).json({ error: 'Timeline not found' });
            }
            
            // Parse existing milestones
            const milestones = JSON.parse(timeline.milestones || '[]');
            
            // Find the milestone to update
            const milestoneIndex = milestones.findIndex(m => m.id === milestoneId);
            
            if (milestoneIndex === -1) {
                return res.status(404).json({ error: 'Milestone not found' });
            }
            
            // Update the milestone
            milestones[milestoneIndex] = {
                ...milestones[milestoneIndex],
                ...updates
            };
            
            // Update timeline with updated milestones
            db.run(
                `UPDATE career_timeline 
                 SET milestones = ?, last_updated = CURRENT_TIMESTAMP 
                 WHERE id = ?`,
                [JSON.stringify(milestones), timeline.id],
                function(err) {
                    if (err) {
                        console.error('Error updating milestones:', err);
                        return res.status(500).json({ error: 'Failed to update milestone' });
                    }
                    
                    res.json({ 
                        message: 'Milestone updated successfully',
                        milestone: milestones[milestoneIndex]
                    });
                }
            );
        }
    );
});

// Enhanced JWT token generation with refresh tokens
const generateTokens = (user) => {
    // Generate access token (short-lived)
    const accessToken = jwt.sign(
        { id: user.id, username: user.username },
        process.env.JWT_SECRET || 'your_jwt_secret',
        { expiresIn: '1h' } // Short expiration time for security
    );
    
    // Generate refresh token (long-lived)
    const refreshToken = jwt.sign(
        { id: user.id },
        process.env.REFRESH_TOKEN_SECRET || 'your_refresh_token_secret',
        { expiresIn: '7d' } // Longer expiration time
    );
    
    return { accessToken, refreshToken };
};

// Store refresh tokens (in a real app, this would be in a database)
const refreshTokens = new Set();

// Subscription endpoints
app.get('/api/subscription/plans', (req, res) => {
    db.all('SELECT * FROM subscription_plans WHERE is_active = 1', [], (err, plans) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch subscription plans' });
        }
        res.json(plans);
    });
});

app.get('/api/subscription/plans/:id', (req, res) => {
    const planId = req.params.id;
    db.get('SELECT * FROM subscription_plans WHERE id = ? AND is_active = 1', [planId], (err, plan) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch subscription plan' });
        }
        if (!plan) {
            return res.status(404).json({ error: 'Subscription plan not found' });
        }
        res.json(plan);
    });
});

app.get('/api/subscription/user', authenticateToken, (req, res) => {
    const userId = req.user.id;
    db.get(`
        SELECT us.*, sp.name as plan_name, sp.description as plan_description, sp.price, sp.billing_cycle
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.user_id = ? AND us.status = 'active'
        ORDER BY us.created_at DESC
        LIMIT 1
    `, [userId], (err, subscription) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch user subscription' });
        }
        res.json(subscription || { status: 'inactive' });
    });
});

app.post('/api/subscription/subscribe', authenticateToken, (req, res) => {
    const { planId, paymentMethod } = req.body;
    const userId = req.user.id;
    const currentDate = new Date().toISOString();

    // Start a transaction
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Get plan details
        db.get('SELECT * FROM subscription_plans WHERE id = ? AND is_active = 1', [planId], (err, plan) => {
            if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Failed to fetch plan details' });
            }
            if (!plan) {
                db.run('ROLLBACK');
                return res.status(404).json({ error: 'Subscription plan not found' });
            }

            // Calculate end date based on billing cycle
            const endDate = new Date(currentDate);
            if (plan.billing_cycle === 'monthly') {
                endDate.setMonth(endDate.getMonth() + 1);
            } else if (plan.billing_cycle === 'yearly') {
                endDate.setFullYear(endDate.getFullYear() + 1);
            }

            // Insert new subscription
            db.run(`
                INSERT INTO user_subscriptions (
                    user_id, plan_id, status, start_date, end_date,
                    payment_method, last_payment_date, next_payment_date
                ) VALUES (?, ?, 'active', ?, ?, ?, ?, ?)
            `, [
                userId,
                planId,
                currentDate,
                endDate.toISOString(),
                paymentMethod,
                currentDate,
                endDate.toISOString()
            ], function(err) {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Failed to create subscription' });
                }

                // Update user's subscription status
                db.run('UPDATE users SET subscription_status = ? WHERE id = ?', ['active', userId], (err) => {
                    if (err) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: 'Failed to update user subscription status' });
                    }

                    db.run('COMMIT');
                    res.json({
                        message: 'Subscription created successfully',
                        subscriptionId: this.lastID
                    });
                });
            });
        });
    });
});

app.post('/api/subscription/cancel', authenticateToken, (req, res) => {
    const userId = req.user.id;

    db.run(`
        UPDATE user_subscriptions 
        SET status = 'cancelled', end_date = ?
        WHERE user_id = ? AND status = 'active'
    `, [new Date().toISOString(), userId], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to cancel subscription' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: 'No active subscription found' });
        }

        // Update user's subscription status
        db.run('UPDATE users SET subscription_status = ? WHERE id = ?', ['inactive', userId], (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to update user subscription status' });
            }

            res.json({ message: 'Subscription cancelled successfully' });
        });
    });
});

// Subscription analytics endpoints
app.get('/api/subscription/analytics/overview', authenticateToken, (req, res) => {
    const userId = req.user.id;
    
    // Get subscription statistics
    db.get(`
        SELECT 
            COUNT(*) as total_subscribers,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_subscribers,
            SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_subscribers,
            AVG(CASE WHEN status = 'active' THEN price ELSE 0 END) as average_revenue
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.user_id = ?
    `, [userId], (err, stats) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch subscription statistics' });
        }
        res.json(stats);
    });
});

app.get('/api/subscription/analytics/plans', authenticateToken, (req, res) => {
    const userId = req.user.id;
    
    // Get plan distribution
    db.all(`
        SELECT 
            sp.name as plan_name,
            COUNT(*) as subscriber_count,
            SUM(sp.price) as total_revenue
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.user_id = ? AND us.status = 'active'
        GROUP BY sp.name
    `, [userId], (err, plans) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch plan distribution' });
        }
        res.json(plans);
    });
});

app.get('/api/subscription/analytics/history', authenticateToken, (req, res) => {
    const userId = req.user.id;
    
    // Get subscription history
    db.all(`
        SELECT 
            us.*,
            sp.name as plan_name,
            sp.price,
            sp.billing_cycle
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.user_id = ?
        ORDER BY us.created_at DESC
    `, [userId], (err, history) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch subscription history' });
        }
        res.json(history);
    });
});

app.get('/api/subscription/analytics/features', authenticateToken, (req, res) => {
    const userId = req.user.id;
    
    // Get feature usage statistics
    db.all(`
        SELECT 
            sf.feature_name,
            COUNT(*) as usage_count
        FROM subscription_features sf
        JOIN user_subscriptions us ON sf.plan_id = us.plan_id
        WHERE us.user_id = ? AND us.status = 'active'
        GROUP BY sf.feature_name
    `, [userId], (err, features) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch feature usage' });
        }
        res.json(features);
    });
});

// Assessment History Endpoint
app.get('/api/assessments/history', authenticateToken, (req, res) => {
    const userId = req.user.id;
    
    const query = `
        SELECT 
            a.id,
            a.assessment_name,
            a.completed_at,
            a.status,
            a.score,
            COUNT(DISTINCT sa.skill_id) as skills_assessed
        FROM assessments a
        LEFT JOIN skill_assessments sa ON a.id = sa.assessment_id
        WHERE a.user_id = ?
        GROUP BY a.id
        ORDER BY a.completed_at DESC
    `;

    db.all(query, [userId], (err, rows) => {
        if (err) {
            console.error('Error fetching assessment history:', err);
            return res.status(500).json({ error: 'Failed to fetch assessment history' });
        }

        // Format the data
        const formattedRows = rows.map(row => ({
            ...row,
            score: Math.round(row.score * 100), // Convert to percentage
            completed_at: new Date(row.completed_at).toISOString()
        }));

        res.json(formattedRows);
    });
});
  