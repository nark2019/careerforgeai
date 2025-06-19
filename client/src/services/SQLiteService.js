import config from '../config';

class SQLiteService {
    async saveQuizResult(data) {
        try {
            const response = await fetch(`${config.API_URL}/api/quiz-results`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error('Failed to save quiz result');
            }

            return await response.json();
        } catch (error) {
            console.error('Error saving quiz result:', error);
            throw error;
        }
    }

    async getQuizResults() {
        try {
            const response = await fetch(`${config.API_URL}/api/quiz-results`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch quiz results');
            }

            const data = await response.json();
            return data.results;
        } catch (error) {
            console.error('Error fetching quiz results:', error);
            return [];
        }
    }

    async saveCurrentResult(data) {
        try {
            const response = await fetch(`${config.API_URL}/api/current-result`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error('Failed to save current result');
            }

            return await response.json();
        } catch (error) {
            console.error('Error saving current result:', error);
            throw error;
        }
    }

    async getCurrentResult() {
        try {
            const response = await fetch(`${config.API_URL}/api/current-result`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch current result');
            }

            const data = await response.json();
            return data.result;
        } catch (error) {
            console.error('Error fetching current result:', error);
            return null;
        }
    }

    async deleteQuizResult(id) {
        try {
            const response = await fetch(`${config.API_URL}/api/quiz-results/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete quiz result');
            }

            return await response.json();
        } catch (error) {
            console.error('Error deleting quiz result:', error);
            throw error;
        }
    }

    async clearAllData() {
        try {
            const results = await this.getQuizResults();
            await Promise.all(results.map(result => this.deleteQuizResult(result.id)));
            return true;
        } catch (error) {
            console.error('Error clearing all data:', error);
            throw error;
        }
    }
}

export default new SQLiteService(); 