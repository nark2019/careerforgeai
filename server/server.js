const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();

// Middleware
app.use(cors({
    origin: [
        'http://localhost:3000', 
        'http://localhost:3001',
        'https://career-forge-ht2xvfj4l-onnyonje-gmailcoms-projects.vercel.app',
        'https://client-6dnmcn1kf-onnyonje-gmailcoms-projects.vercel.app'
    ],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'Origin', 'x-api-key']
}));
app.use(express.json());

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Quiz Results Endpoints
app.post('/api/quiz-results', async (req, res) => {
    try {
        const { id, career, experience, score, reportId, recommendations, answers, questions } = req.body;
        const userId = req.user?.id || 'guest';
        const timestamp = new Date().toISOString();

        const stmt = db.prepare(`
            INSERT INTO quiz_results (id, user_id, career, experience, score, report_id, timestamp, recommendations, answers, questions)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            id,
            userId,
            career,
            experience,
            score,
            reportId,
            timestamp,
            JSON.stringify(recommendations),
            JSON.stringify(answers),
            JSON.stringify(questions)
        );

        res.json({ success: true, id });
    } catch (error) {
        console.error('Error saving quiz result:', error);
        res.status(500).json({ error: 'Failed to save quiz result' });
    }
});

app.get('/api/quiz-results', async (req, res) => {
    try {
        const userId = req.user?.id || 'guest';
        const stmt = db.prepare(`
            SELECT * FROM quiz_results 
            WHERE user_id = ? 
            ORDER BY timestamp DESC 
            LIMIT 5
        `);
        
        const results = stmt.all(userId).map(row => ({
            ...row,
            recommendations: JSON.parse(row.recommendations || 'null'),
            answers: JSON.parse(row.answers || 'null'),
            questions: JSON.parse(row.questions || 'null')
        }));

        res.json({ results });
    } catch (error) {
        console.error('Error fetching quiz results:', error);
        res.status(500).json({ error: 'Failed to fetch quiz results' });
    }
});

app.post('/api/current-result', async (req, res) => {
    try {
        const { id, career, experience, score, reportId, recommendations, answers, questions } = req.body;
        const userId = req.user?.id || 'guest';
        const timestamp = new Date().toISOString();

        // First delete any existing current result for this user
        const deleteStmt = db.prepare('DELETE FROM current_results WHERE user_id = ?');
        deleteStmt.run(userId);

        // Then insert the new current result
        const insertStmt = db.prepare(`
            INSERT INTO current_results (id, user_id, career, experience, score, report_id, timestamp, recommendations, answers, questions)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        insertStmt.run(
            id,
            userId,
            career,
            experience,
            score,
            reportId,
            timestamp,
            JSON.stringify(recommendations),
            JSON.stringify(answers),
            JSON.stringify(questions)
        );

        res.json({ success: true, id });
    } catch (error) {
        console.error('Error saving current result:', error);
        res.status(500).json({ error: 'Failed to save current result' });
    }
});

app.get('/api/current-result', async (req, res) => {
    try {
        const userId = req.user?.id || 'guest';
        const stmt = db.prepare('SELECT * FROM current_results WHERE user_id = ?');
        const result = stmt.get(userId);

        if (result) {
            result.recommendations = JSON.parse(result.recommendations || 'null');
            result.answers = JSON.parse(result.answers || 'null');
            result.questions = JSON.parse(result.questions || 'null');
        }

        res.json({ result });
    } catch (error) {
        console.error('Error fetching current result:', error);
        res.status(500).json({ error: 'Failed to fetch current result' });
    }
});

app.delete('/api/quiz-results/:id', async (req, res) => {
    try {
        const userId = req.user?.id || 'guest';
        const stmt = db.prepare('DELETE FROM quiz_results WHERE id = ? AND user_id = ?');
        stmt.run(req.params.id, userId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting quiz result:', error);
        res.status(500).json({ error: 'Failed to delete quiz result' });
    }
});

// Jobs API Endpoints
app.post('/api/jobs', authenticateToken, async (req, res) => {
    try {
        const { career, experience, location, jobType } = req.body;
        const userId = req.user?.id || 'guest';
        
        // For now, return mock data
        const mockJobs = [
            {
                id: 1,
                title: 'Senior Software Engineer',
                company: 'TechCorp',
                location: 'Remote',
                type: 'Full-time',
                experience: '5+ years',
                skills: ['JavaScript', 'React', 'Node.js', 'AWS'],
                description: 'We are looking for a Senior Software Engineer to join our growing team. You will be responsible for developing and maintaining our core products.',
                salary: '$120,000 - $180,000',
                applyUrl: 'https://example.com/apply',
                isNew: true,
                postedDate: '2 days ago'
            },
            {
                id: 2,
                title: 'Full Stack Developer',
                company: 'StartupX',
                location: 'Hybrid',
                type: 'Full-time',
                experience: '3+ years',
                skills: ['TypeScript', 'React', 'Python', 'Docker'],
                description: 'Join our innovative startup as a Full Stack Developer. Help us build the next generation of our platform.',
                salary: '$90,000 - $140,000',
                applyUrl: 'https://example.com/apply',
                isNew: false,
                postedDate: '1 week ago'
            },
            {
                id: 3,
                title: 'Frontend Engineer',
                company: 'DesignCo',
                location: 'On-site',
                type: 'Contract',
                experience: '2+ years',
                skills: ['React', 'Vue.js', 'CSS', 'UI/UX'],
                description: 'Looking for a Frontend Engineer to help create beautiful and responsive web applications.',
                salary: '$80,000 - $120,000',
                applyUrl: 'https://example.com/apply',
                isNew: true,
                postedDate: '3 days ago'
            }
        ];

        // Filter jobs based on criteria
        let filteredJobs = mockJobs;
        if (location && location !== 'All') {
            filteredJobs = filteredJobs.filter(job => job.location === location);
        }
        if (jobType && jobType !== 'All') {
            filteredJobs = filteredJobs.filter(job => job.type === jobType);
        }

        // Add a small delay to simulate real API latency
        await new Promise(resolve => setTimeout(resolve, 1000));

        res.json({ 
            jobs: filteredJobs,
            userId,
            filters: { location, jobType, experience }
        });
    } catch (error) {
        console.error('Error fetching jobs:', error);
        res.status(500).json({ 
            error: 'Failed to fetch jobs',
            message: error.message 
        });
    }
});

// Career Coach Endpoints
app.get('/api/coach', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const stmt = db.prepare('SELECT * FROM career_coach WHERE user_id = ?');
        const coach = stmt.get(userId);

        if (!coach) {
            return res.status(404).json({ error: 'Coach not found' });
        }

        // Get chat history
        const chatStmt = db.prepare('SELECT * FROM coach_messages WHERE user_id = ? ORDER BY created_at ASC');
        const messages = chatStmt.all(userId);

        res.json({
            coach: {
                id: coach.id,
                name: coach.name,
                focus: coach.focus,
                created_at: coach.created_at
            },
            messages: messages.map(msg => ({
                id: msg.id,
                is_user_message: msg.is_user_message === 1,
                message_content: msg.message_content,
                created_at: msg.created_at
            }))
        });
    } catch (error) {
        console.error('Error fetching coach:', error);
        res.status(500).json({ error: 'Failed to fetch coach data' });
    }
});

app.post('/api/coach/initialize', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { coaching_focus, career_interests, current_role, career_goals, challenges } = req.body;

        // Check if coach already exists for this user
        const existingCoach = db.prepare('SELECT id FROM career_coach WHERE user_id = ?').get(userId);
        if (existingCoach) {
            return res.status(400).json({ error: 'Career coach already initialized' });
        }

        // Create new coach
        const coachStmt = db.prepare(`
            INSERT INTO career_coach (user_id, focus, created_at)
            VALUES (?, ?, datetime('now'))
        `);
        const result = coachStmt.run(userId, coaching_focus);

        // Add initial message
        const welcomeMessage = `Hi! I'm your AI Career Coach. I understand you're interested in ${career_interests} and currently working as a ${current_role}. 
        Your goals include ${career_goals}, and you're facing challenges with ${challenges}. I'm here to help you achieve your career objectives.
        
        How would you like to start our coaching session today?`;

        const messageStmt = db.prepare(`
            INSERT INTO coach_messages (user_id, is_user_message, message_content, created_at)
            VALUES (?, 0, ?, datetime('now'))
        `);
        messageStmt.run(userId, welcomeMessage);

        res.json({
            success: true,
            coach: {
                id: result.lastInsertRowid,
                focus: coaching_focus,
                created_at: new Date().toISOString()
            },
            messages: [{
                id: 1,
                is_user_message: false,
                message_content: welcomeMessage,
                created_at: new Date().toISOString()
            }]
        });
    } catch (error) {
        console.error('Error initializing coach:', error);
        res.status(500).json({ error: 'Failed to initialize coach' });
    }
});

app.post('/api/coach/message', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { message } = req.body;

        // Save user message
        const userMessageStmt = db.prepare(`
            INSERT INTO coach_messages (user_id, is_user_message, message_content, created_at)
            VALUES (?, 1, ?, datetime('now'))
        `);
        userMessageStmt.run(userId, message);

        // Generate AI response (you can integrate with an AI service here)
        const aiResponse = await generateAIResponse(message, userId);

        // Save AI response
        const aiMessageStmt = db.prepare(`
            INSERT INTO coach_messages (user_id, is_user_message, message_content, created_at)
            VALUES (?, 0, ?, datetime('now'))
        `);
        aiMessageStmt.run(userId, aiResponse);

        res.json({
            success: true,
            message: aiResponse
        });
    } catch (error) {
        console.error('Error processing message:', error);
        res.status(500).json({ error: 'Failed to process message' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 