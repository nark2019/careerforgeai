const mongoose = require('mongoose');

const learningDashboardSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    careerPath: {
        type: String,
        required: true
    },
    skillsData: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    goalsData: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    progressData: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    resourcesData: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    certificatesData: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('LearningDashboard', learningDashboardSchema); 