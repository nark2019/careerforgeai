const sqlite3 = require('sqlite3').verbose();
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Report = require('../models/Report');
const BusinessIdea = require('../models/BusinessIdea');
const Interview = require('../models/Interview');
const LearningDashboard = require('../models/LearningDashboard');

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB Connected...');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
};

// Connect to SQLite
const db = new sqlite3.Database('./career_app.db', (err) => {
    if (err) {
        console.error('Error connecting to SQLite:', err);
        process.exit(1);
    }
    console.log('SQLite Connected...');
});

// Migrate Users
const migrateUsers = () => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM users', async (err, rows) => {
            if (err) {
                reject(err);
                return;
            }

            try {
                for (const row of rows) {
                    const user = new User({
                        username: row.username,
                        email: row.email,
                        password: row.password,
                        createdAt: row.created_at
                    });
                    await user.save();
                }
                console.log(`Migrated ${rows.length} users`);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    });
};

// Migrate Reports
const migrateReports = () => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM reports', async (err, rows) => {
            if (err) {
                reject(err);
                return;
            }

            try {
                for (const row of rows) {
                    const report = new Report({
                        userId: row.user_id,
                        career: row.career,
                        experience: row.experience,
                        score: row.score,
                        reportData: JSON.parse(row.report_data),
                        timestamp: row.timestamp
                    });
                    await report.save();
                }
                console.log(`Migrated ${rows.length} reports`);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    });
};

// Migrate Business Ideas
const migrateBusinessIdeas = () => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM business_ideas', async (err, rows) => {
            if (err) {
                reject(err);
                return;
            }

            try {
                for (const row of rows) {
                    const businessIdea = new BusinessIdea({
                        userId: row.user_id,
                        ideaData: JSON.parse(row.idea_data),
                        createdAt: row.created_at
                    });
                    await businessIdea.save();
                }
                console.log(`Migrated ${rows.length} business ideas`);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    });
};

// Migrate Interviews
const migrateInterviews = () => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM interviews', async (err, rows) => {
            if (err) {
                reject(err);
                return;
            }

            try {
                for (const row of rows) {
                    const interview = new Interview({
                        userId: row.user_id,
                        jobRole: row.job_role,
                        interviewType: row.interview_type,
                        feedback: row.feedback,
                        createdAt: row.created_at
                    });
                    await interview.save();
                }
                console.log(`Migrated ${rows.length} interviews`);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    });
};

// Migrate Learning Dashboard
const migrateLearningDashboard = () => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM learning_dashboard', async (err, rows) => {
            if (err) {
                reject(err);
                return;
            }

            try {
                for (const row of rows) {
                    const dashboard = new LearningDashboard({
                        userId: row.user_id,
                        careerPath: row.career_path,
                        skillsData: JSON.parse(row.skills_data),
                        goalsData: JSON.parse(row.goals_data),
                        progressData: JSON.parse(row.progress_data),
                        resourcesData: JSON.parse(row.resources_data),
                        certificatesData: JSON.parse(row.certificates_data),
                        lastUpdated: row.last_updated
                    });
                    await dashboard.save();
                }
                console.log(`Migrated ${rows.length} learning dashboards`);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    });
};

// Main migration function
const migrate = async () => {
    try {
        await connectDB();
        
        console.log('Starting migration...');
        
        await migrateUsers();
        await migrateReports();
        await migrateBusinessIdeas();
        await migrateInterviews();
        await migrateLearningDashboard();
        
        console.log('Migration completed successfully!');
        
        // Close connections
        db.close();
        await mongoose.connection.close();
        
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

// Run migration
migrate(); 