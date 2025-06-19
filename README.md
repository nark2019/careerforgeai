# CareerForge AI

A comprehensive career development application that helps users assess their skills, plan their career path, and improve their job prospects through AI-powered tools and personalized guidance.

## Core Features

### Assessment and Analysis
- **CareerForge AI Assessment**: AI-powered skill assessment with:
  - Personalized question generation based on career field
  - Real-time scoring and analysis
  - Detailed performance breakdown
  - Percentile ranking among peers
  - Strength and weakness identification

### Career Development Tools
- **AI Interview Preparation**:
  - Real-time feedback on responses
  - Body language and presentation analysis
  - Industry-specific question banks
  - Performance tracking over time

- **AI Career Coach**:
  - 24/7 personalized guidance
  - Goal setting and tracking
  - Progress monitoring
  - Customized action plans
  - Regular check-ins and adjustments

- **Million Dollar Ideas Generator**:
  - AI-powered business idea generation
  - Market analysis and viability assessment
  - Skills-to-business opportunity matching
  - Revenue potential estimation
  - Implementation roadmap

### Professional Growth
- **Career Timeline**:
  - Visual career journey mapping
  - Milestone tracking
  - Goal setting and progress monitoring
  - Achievement documentation
  - Future path planning

- **Portfolio Builder**:
  - Professional portfolio creation
  - Project showcase
  - Skills presentation
  - Customizable templates
  - Multi-media support

- **Profile Management**:
  - Comprehensive skill tracking
  - Career history documentation
  - Achievement logging
  - Professional development tracking
  - Certification management

- **CV Upgrade Tool**:
  - AI-powered CV optimization
  - Industry-specific recommendations
  - Keyword optimization
  - Format enhancement
  - ATS compatibility check

### Learning and Development
- **Personalized Learning Paths**:
  - Custom curriculum generation
  - Resource recommendations
  - Progress tracking
  - Skill gap analysis
  - Timeline planning

- **Assessment History**:
  - Historical performance tracking
  - Progress visualization
  - Improvement analytics
  - Comparative analysis
  - Result archiving

### Data Storage and Management
- **SQLite Database Integration**:
  - Secure data storage
  - Quiz results management
  - Assessment history tracking
  - User profile storage
  - Performance analytics

## Technical Features

### Port Management
- Dynamic port allocation (5000-5005)
- Automatic port conflict resolution
- Client-server port synchronization
- Fallback port handling

### Data Persistence
- SQLite database for reliable storage
- Automatic data synchronization
- Offline data handling
- Data backup and recovery
- Duplicate entry management

### Authentication
- Secure user authentication
- Session management
- Token-based authorization
- User data protection
- Role-based access control

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm run install-all
   ```
3. Ensure SQLite is installed on your system
4. Initialize the database:
   ```bash
   npm run init-db
   ```

## Running the Application

### Quick Start
```bash
npm run start-app
```

This will:
1. Initialize the database
2. Kill any conflicting port processes
3. Start the server
4. Launch the client application
5. Connect client to server

### Manual Start

For development or debugging:

1. Start the server:
   ```bash
   node server.js
   ```

2. Start the client:
   ```bash
   cd client
   npm start
   ```

## Development

### Key Directories
- `/client` - React frontend application
- `/server` - Node.js backend server
- `/database` - SQLite database schemas and migrations
- `/services` - Shared services and utilities

### Database Schema
- `quiz_results` - Assessment results and analytics
- `current_results` - Active session data
- `user_profiles` - User information and settings

## Troubleshooting

1. Database Issues:
   - Verify career_app.db exists
   - Check file permissions
   - Run database migrations
   - Clear corrupted data

2. Port Conflicts:
   - Check ports 5000-5005
   - Kill conflicting processes
   - Use manual port assignment

3. Performance Issues:
   - Clear browser cache
   - Update dependencies
   - Check server logs
   - Monitor database size

## License

MIT 