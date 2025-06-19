import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import config from '../config';
import DataService from '../services/DataService';
import LoginRequired from './common/LoginRequired';
import SaveButton from './common/SaveButton';

// Add CSS styles at the top of the file
const styles = {
    typingAnimation: {
        display: 'flex',
        alignItems: 'center',
        columnGap: '4px',
    },
    dot: {
        width: '8px',
        height: '8px',
        backgroundColor: '#6c757d',
        borderRadius: '50%',
        display: 'inline-block',
        animation: 'typingAnimation 1.4s infinite ease-in-out both',
    },
    dot1: {
        animationDelay: '0s',
    },
    dot2: {
        animationDelay: '0.2s',
    },
    dot3: {
        animationDelay: '0.4s',
    },
    '@keyframes typingAnimation': {
        '0%, 80%, 100%': {
            transform: 'scale(0.6)',
        },
        '40%': {
            transform: 'scale(1)',
        },
    },
    messageBubble: {
        borderRadius: '18px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        position: 'relative',
    },
    userBubble: {
        borderBottomRightRadius: '4px',
    },
    coachBubble: {
        borderBottomLeftRadius: '4px',
    },
    errorBubble: {
        backgroundColor: '#f8d7da',
        color: '#721c24',
        border: '1px solid #f5c6cb',
    },
    systemBubble: {
        backgroundColor: '#d1ecf1',
        color: '#0c5460',
        border: '1px solid #bee5eb',
    },
    formattedMessage: {
        lineHeight: '1.5',
        fontSize: '0.95rem'
    },
    listItem: {
        marginBottom: '8px',
        display: 'flex',
        alignItems: 'flex-start'
    },
    listNumber: {
        minWidth: '24px',
        fontWeight: 'bold',
        color: '#007bff',
        marginRight: '6px'
    },
    bullet: {
        minWidth: '20px',
        color: '#007bff',
        marginRight: '6px',
        fontSize: '1.2em'
    }
};

// Helper function to safely parse JSON
const safeJsonParse = (jsonString) => {
    if (!jsonString) return null;
    if (typeof jsonString === 'object') return jsonString;
    
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('Error parsing JSON:', error);
        return null;
    }
};

// Add a function to format the message content with proper styling
const formatMessageContent = (content) => {
    if (!content) return '';
    
    // Replace markdown-style formatting with HTML
    let formattedContent = content
        // Bold text (either ** or __ format)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/__(.*?)__/g, '<strong>$1</strong>')
        
        // Italic text (either * or _ format)
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/_(.*?)_/g, '<em>$1</em>')
        
        // Underline
        .replace(/~(.*?)~/g, '<u>$1</u>')
        
        // Headers
        .replace(/^# (.*?)$/gm, '<h3 style="margin-top: 10px; margin-bottom: 10px; color: #333;">$1</h3>')
        .replace(/^## (.*?)$/gm, '<h4 style="margin-top: 8px; margin-bottom: 8px; color: #444;">$1</h4>')
        .replace(/^### (.*?)$/gm, '<h5 style="margin-top: 6px; margin-bottom: 6px; color: #555;">$1</h5>')
        
        // Numbered lists - look for lines starting with 1., 2., etc.
        .replace(/^(\d+)\. (.*?)$/gm, '<div style="margin-bottom: 8px; display: flex; align-items: flex-start;"><span style="min-width: 24px; font-weight: bold; color: #007bff; margin-right: 6px;">$1.</span><span>$2</span></div>')
        
        // Bullet lists - look for lines starting with - or *
        .replace(/^- (.*?)$/gm, '<div style="margin-bottom: 8px; display: flex; align-items: flex-start;"><span style="min-width: 20px; color: #007bff; margin-right: 6px; font-size: 1.2em;">•</span><span>$1</span></div>')
        .replace(/^\* (.*?)$/gm, '<div style="margin-bottom: 8px; display: flex; align-items: flex-start;"><span style="min-width: 20px; color: #007bff; margin-right: 6px; font-size: 1.2em;">•</span><span>$1</span></div>')
        
        // Highlight important text
        .replace(/\!\!(.*?)\!\!/g, '<span style="background-color: #fff3cd; padding: 2px 4px; border-radius: 3px;">$1</span>')
        
        // Add color to text with custom syntax: [red](text)
        .replace(/\[red\]\((.*?)\)/g, '<span style="color: #dc3545;">$1</span>')
        .replace(/\[green\]\((.*?)\)/g, '<span style="color: #28a745;">$1</span>')
        .replace(/\[blue\]\((.*?)\)/g, '<span style="color: #007bff;">$1</span>')
        .replace(/\[orange\]\((.*?)\)/g, '<span style="color: #fd7e14;">$1</span>')
        .replace(/\[purple\]\((.*?)\)/g, '<span style="color: #6f42c1;">$1</span>')
        
        // Convert URLs to clickable links
        .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color: #007bff; text-decoration: underline;">$1</a>')
        
        // Add horizontal rule
        .replace(/^---$/gm, '<hr style="border: 0; height: 1px; background-color: #dee2e6; margin: 15px 0;">')
        
        // Add blockquote styling
        .replace(/^> (.*?)$/gm, '<blockquote style="border-left: 3px solid #6c757d; padding-left: 10px; margin-left: 5px; color: #6c757d; font-style: italic;">$1</blockquote>')
        
        // Convert line breaks to <br> tags
        .replace(/\n/g, '<br>');
    
    return formattedContent;
};

// Update the MessageBubble component to show only AI responses
const MessageBubble = ({ message }) => {
    // Handle different message types
    if (message.message_type === 'typing') {
        return (
            <div style={{...styles.messageBubble, ...styles.coachBubble, padding: '12px', backgroundColor: '#f8f9fa'}} className="message-bubble">
                <div style={styles.typingAnimation} className="typing-animation">
                    <span style={{...styles.dot, ...styles.dot1}} className="dot"></span>
                    <span style={{...styles.dot, ...styles.dot2}} className="dot"></span>
                    <span style={{...styles.dot, ...styles.dot3}} className="dot"></span>
                </div>
            </div>
        );
    }
    
    if (message.message_type === 'error') {
        return (
            <div style={{...styles.messageBubble, ...styles.errorBubble, padding: '12px'}} className="message-bubble">
                <i className="bi bi-exclamation-triangle me-2"></i>
                {message.message_content}
            </div>
        );
    }
    
    if (message.message_type === 'system') {
        return (
            <div style={{...styles.messageBubble, ...styles.systemBubble, padding: '12px'}} className="message-bubble">
                <i className="bi bi-info-circle me-2"></i>
                {message.message_content}
            </div>
        );
    }
    
    // Default chat message
    const bubbleStyle = message.is_user_message 
        ? {...styles.messageBubble, ...styles.userBubble, padding: '12px', backgroundColor: '#007bff', color: 'white'} 
        : {...styles.messageBubble, ...styles.coachBubble, padding: '12px', backgroundColor: '#f8f9fa'};
    
    // Add a small AI indicator for coach messages and format the content
    if (!message.is_user_message) {
        return (
            <div style={bubbleStyle} className="message-bubble">
                <small className="text-muted d-block mb-1" style={{fontSize: '0.7rem'}}>
                    <i className="bi bi-stars"></i> AI Response
                </small>
                <div 
                    className="formatted-message"
                    dangerouslySetInnerHTML={{ __html: formatMessageContent(message.message_content) }}
                    style={styles.formattedMessage}
                />
            </div>
        );
    }
    
    return (
        <div style={bubbleStyle} className="message-bubble">
            {message.message_content}
        </div>
    );
};

function CareerCoach() {
    const [selectedCoach, setSelectedCoach] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sendingError, setSendingError] = useState('');
    const [view, setView] = useState('chat'); // chat, insights, actions
    const [initializing, setInitializing] = useState(false);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
    const messagesEndRef = useRef(null);
    const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);
    const [selectedCoachingFocus, setSelectedCoachingFocus] = useState('career_development');
    const [currentRole, setCurrentRole] = useState('');
    const [careerInterests, setCareerInterests] = useState('');
    const [careerGoals, setCareerGoals] = useState('');
    const [challenges, setChallenges] = useState('');
    const userId = localStorage.getItem('userId') || 'guest';

    // Helper function to get user-specific storage key
    const getUserStorageKey = () => `career-coach-${userId}`;

    // Update the save to localStorage function
    const saveMessagesToLocalStorage = (messagesToSave) => {
        try {
            const storageKey = getUserStorageKey();
            const dataToSave = {
                coach: selectedCoach,
                messages: messagesToSave,
                lastUpdated: new Date().toISOString()
            };
            localStorage.setItem(storageKey, JSON.stringify(dataToSave));
            console.log('Saved chat history to localStorage for user:', userId);
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    };

    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            
            try {
                // Try to load from local storage first with user-specific key
                const storageKey = getUserStorageKey();
                const storedData = localStorage.getItem(storageKey);
                if (storedData) {
                    try {
                        const data = JSON.parse(storedData);
                        if (data.coach && data.messages) {
                            console.log('Loading coach data from local storage for user:', userId);
                            setSelectedCoach(data.coach);
                            setMessages(data.messages || []);
                            setLoading(false);
                            return;
                        }
                    } catch (e) {
                        console.error('Error parsing local storage data:', e);
                        // Continue to try loading from server
                    }
                }
                
                // If not in local storage, try to fetch from server
                if (DataService.isLoggedIn()) {
                    try {
                        await config.detectServer();
                        
                        console.log('Fetching coach data from server for user:', userId);
                        const token = localStorage.getItem('token');
                        const response = await fetch(`${config.API_URL}/api/coach`, {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        });

                        console.log('Coach data response status:', response.status);
                        
                        if (response.ok) {
                            const data = await response.json();
                            console.log('Coach data loaded from server:', data);
                            
                            if (data.coach) {
                                setSelectedCoach(data.coach);
                                setMessages(data.messages || []);
                                
                                // Save to local storage with user-specific key
                                saveMessagesToLocalStorage(data.messages || []);
                            }
                        } else if (response.status === 404) {
                            console.log('Coach not initialized yet for user:', userId);
                        } else {
                            console.error('Error loading coach data:', response.status);
                            throw new Error(`Server returned ${response.status}`);
                        }
                    } catch (error) {
                        console.error('Error loading coach data:', error);
                        if (!storedData) {
                            setMessages([{
                                id: Date.now(),
                                is_user_message: false,
                                message_type: 'error',
                                message_content: 'Failed to load coach data. Please try refreshing the page.',
                                created_at: new Date().toISOString()
                            }]);
                        }
                    }
                }
            } finally {
                setLoading(false);
            }
        };
        
        loadInitialData();
    }, [userId]); // Add userId as a dependency

    // Update messages effect to save to localStorage
    useEffect(() => {
        if (messages.length > 0) {
            saveMessagesToLocalStorage(messages);
        }
    }, [messages]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Add a function to display error messages
    const displayError = (message, details = null) => {
        console.error(message, details);
        setError(message);
        
        // Add error message to chat if it's related to messaging
        if (message.includes('message') || message.includes('chat')) {
            setMessages(prevMessages => [
                ...prevMessages,
                {
                    id: Date.now(),
                    is_user_message: false,
                    message_type: 'error',
                    message_content: message,
                    created_at: new Date().toISOString()
                }
            ]);
        }
    };

    const initializeCoach = async () => {
        setLoading(true);
        setError('');
        
        try {
            if (!DataService.isLoggedIn()) {
                setShowLoginPrompt(true);
                return;
            }
            
            // Try to detect the server first
            try {
                await config.detectServer();
            } catch (error) {
                displayError('Could not connect to server. Please check your connection and try again.', error);
                return;
            }
            
            // Log the data being sent to help with debugging
            console.log('Initializing coach with data:', {
                coaching_focus: selectedCoachingFocus,
                career_interests: careerInterests,
                current_role: currentRole,
                career_goals: careerGoals,
                challenges: challenges
            });
            
            const token = localStorage.getItem('token');
            const response = await fetch(`${config.API_URL}/api/coach/initialize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    coaching_focus: selectedCoachingFocus,
                    career_interests: careerInterests,
                    current_role: currentRole,
                    career_goals: careerGoals,
                    challenges: challenges
                })
            });
            
            // Log the response status to help with debugging
            console.log('Coach initialization response status:', response.status);
            
            // Try to get the response body regardless of status
            const responseText = await response.text();
            console.log('Coach initialization response:', responseText);
            
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error('Error parsing response JSON:', e);
                displayError('Invalid response from server. Please try again later.', e);
                return;
            }
            
            // If coach already exists, load it instead of showing an error
            if (!response.ok && data.error === 'Career coach already initialized') {
                console.log('Coach already initialized, loading existing coach...');
                
                // Fetch the existing coach
                try {
                    const coachResponse = await fetch(`${config.API_URL}/api/coach`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    if (!coachResponse.ok) {
                        throw new Error('Failed to load existing coach');
                    }
                    
                    const coachData = await coachResponse.json();
                    setSelectedCoach(coachData.coach);
                    setMessages(coachData.messages || []);
                    
                    // Save to local storage
                    saveMessagesToLocalStorage(coachData.messages || []);
                    
                    // Switch to chat view
                    setView('chat');
                    return;
                } catch (loadError) {
                    console.error('Error loading existing coach:', loadError);
                    displayError(`Failed to load existing coach: ${loadError.message}`, loadError);
                    return;
                }
            } else if (!response.ok) {
                displayError(`Failed to initialize coach: ${data.error || data.message || 'Unknown error'}`, data);
                return;
            }
            
            setSelectedCoach({
                id: data.coach_id,
                coaching_focus: selectedCoachingFocus,
                user_profile: {
                    career_interests: careerInterests,
                    current_role: currentRole,
                    career_goals: careerGoals,
                    challenges: challenges
                },
                insights: data.insights || {},
                action_items: data.action_items || []
            });
            
            // Create initial messages array with welcome message
            const initialMessages = [{
                id: Date.now(),
                is_user_message: false,
                message_type: 'text',
                message_content: data.welcome_message || 'Welcome to your career coaching session!',
                created_at: new Date().toISOString()
            }];
            
            setMessages(initialMessages);
            
            // Save to local storage
            saveMessagesToLocalStorage(initialMessages);
            
            // Show success message
            setMessages(prevMessages => [
                ...prevMessages,
                {
                    id: Date.now() + 1,
                    is_user_message: false,
                    message_type: 'system',
                    message_content: 'Your career coach has been initialized! You can now start chatting.',
                    created_at: new Date().toISOString()
                }
            ]);
            
            // Switch to chat view
            setView('chat');
        } catch (error) {
            displayError(`Failed to initialize coach: ${error.message}`, error);
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim()) return;
        
        // Clear any previous sending errors
        setSendingError('');
        
        // Get the message content and clear the input
        const messageContent = newMessage.trim();
        setNewMessage('');

        // Add user message to UI immediately
        const userMessage = {
            id: Date.now(),
            is_user_message: true,
            message_type: 'text',
            message_content: messageContent,
            created_at: new Date().toISOString()
        };
        
        setMessages(prevMessages => [...prevMessages, userMessage]);
        
        // Save user message to local storage immediately
        const updatedMessages = [...messages, userMessage];
        saveMessagesToLocalStorage(updatedMessages);
        
        // Scroll to bottom to show new message
        setTimeout(scrollToBottom, 100);
        
        // Send message to server with retry
        await sendMessageWithRetry(messageContent);
    };

    // Add a ping function to check if the server is reachable
    const pingServer = async () => {
        try {
            console.log('Checking server health at:', `${config.API_URL}/api/health`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
            
            const response = await fetch(`${config.API_URL}/api/health`, {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            console.log('Health check response:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('Server health data:', data);
                
                // Update the API URL if it's different
                if (data.api_url && data.api_url !== config.API_URL) {
                    console.log(`Updating API URL from ${config.API_URL} to ${data.api_url}`);
                    config.setApiUrl(data.api_url);
                }
            }
            
            return response.ok;
        } catch (error) {
            console.error('Error checking server health:', error);
            return false;
        }
    };

    // Update the sendMessageWithRetry function with better error handling
    const sendMessageWithRetry = async (messageContent) => {
        // Set typing indicator
        const typingIndicatorId = Date.now() + '-typing';
        setMessages(prevMessages => [
            ...prevMessages,
            {
                id: typingIndicatorId,
            is_user_message: false,
            message_type: 'typing',
                message_content: '',
            created_at: new Date().toISOString()
            }
        ]);
        
        // Scroll to the typing indicator
        setTimeout(scrollToBottom, 100);
        
        // Track retry attempts
        let retryCount = 0;
        const maxRetries = 3;
        
        const attemptSend = async () => {
            try {
                // Check if user is authenticated
                if (!DataService.isLoggedIn()) {
                    setShowLoginPrompt(true);
                    throw new Error('User not authenticated');
                }
                
                // Try to detect the server first
                try {
                    await config.detectServer();
                } catch (serverError) {
                    console.error('Server detection failed:', serverError);
                    throw new Error('Could not connect to server. Please check your connection.');
                }
                
                // Check if server is reachable
                const serverAvailable = await pingServer();
                if (!serverAvailable) {
                    throw new Error('Server is currently unavailable. Please try again later.');
                }
                
                console.log(`Sending message to server (attempt ${retryCount + 1}/${maxRetries + 1}):`, messageContent);
                
                // Send message to server with retry
            const token = localStorage.getItem('token');
                const response = await DataService.fetchWithRetry(
                    `${config.API_URL}/api/coach/message`,
                    {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                            coach_id: selectedCoach.id,
                            message: messageContent
                        })
                    },
                    2, // max retries within fetchWithRetry
                    1000 // delay between retries
                );
                
                // Parse the response
                let data;
                try {
                    data = await response.json();
                    console.log('Response received:', data);
                } catch (e) {
                    console.error('Error parsing response JSON:', e);
                    throw new Error('Invalid response from server. Please try again.');
                }

            if (!response.ok) {
                    const errorMessage = data.message || data.error || `Server error: ${response.status}`;
                    console.error('Server error:', errorMessage, data);
                    throw new Error(errorMessage);
            }

                if (!data.response) {
                    console.error('Missing response in data:', data);
                    throw new Error('Server returned an invalid response. Please try again.');
                }
            
            // Remove typing indicator and add coach response
                setMessages(prevMessages => {
                    const filteredMessages = prevMessages.filter(msg => msg.id !== typingIndicatorId);
                    return [
                        ...filteredMessages,
                        {
                            id: data.id || Date.now(),
                is_user_message: false,
                            message_type: 'text',
                message_content: data.response,
                            created_at: data.created_at || new Date().toISOString()
                        }
                    ];
                });
                
                // Save messages to local storage
                const updatedMessages = [
                    ...messages.filter(msg => msg.id !== typingIndicatorId),
                    {
                        id: data.id || Date.now(),
                        is_user_message: false,
                        message_type: 'text',
                        message_content: data.response,
                        created_at: data.created_at || new Date().toISOString()
                    }
                ];
                saveMessagesToLocalStorage(updatedMessages);
                
                // Scroll to bottom to show new message
                setTimeout(scrollToBottom, 100);
                
                // Clear any sending error
                setSendingError('');
                
                return true;
            } catch (error) {
                console.error(`Error sending message (attempt ${retryCount + 1}/${maxRetries + 1}):`, error);
                
                // If we have retries left, try again
                if (retryCount < maxRetries) {
                    retryCount++;
                    console.log(`Retrying message send (${retryCount}/${maxRetries})...`);
                    
                    // Wait longer between each retry
                    const retryDelay = 2000 * retryCount;
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    
                    // Try again
                    return attemptSend();
                }
                
                // No more retries, show error
                // Remove typing indicator
                setMessages(prevMessages => {
                    return prevMessages.filter(msg => msg.id !== typingIndicatorId);
                });
                
                // Add error message
                const errorMessage = error.name === 'AbortError' 
                    ? 'Request timed out. The server might be busy. Please try again.'
                    : `Failed to get response: ${error.message}. Your message was saved locally.`;
                
                setMessages(prevMessages => [
                    ...prevMessages,
                    {
                        id: Date.now() + '-error',
                        is_user_message: false,
                        message_type: 'error',
                        message_content: errorMessage,
                created_at: new Date().toISOString()
                    }
                ]);
                
                // Set sending error
                setSendingError(errorMessage);
                
                // Scroll to bottom to show error message
                setTimeout(scrollToBottom, 100);
                
                return false;
            }
        };
        
        return attemptSend();
    };

    const getCheckIn = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${config.API_URL}/api/coach/check-in`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to get check-in');
            }

            const data = await response.json();
            
            // Add check-in message
            const checkInMessage = {
                id: Date.now(),
                is_user_message: false,
                message_content: JSON.stringify(data.check_in),
                message_type: 'check-in',
                created_at: new Date().toISOString()
            };
            
            setMessages(prev => [...prev, checkInMessage]);
            setView('chat');
            
        } catch (error) {
            console.error('Error getting check-in:', error);
            setError('Failed to get your daily check-in. Please try again later.');
        }
    };

    const updateActionItem = async (id, status) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${config.API_URL}/api/coach/action-items/update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    action_item_id: id,
                    status: status
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update action item');
            }

            const data = await response.json();
            
            // Update coach data with new action items
            setSelectedCoach(prev => ({
                ...prev,
                action_items: data.action_items
            }));
            
        } catch (error) {
            console.error('Error updating action item:', error);
            setError('Failed to update action item. Please try again.');
        }
    };

    const generateInsights = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${config.API_URL}/api/coach/insights/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to generate insights');
            }

            const data = await response.json();
            
            // Update coach data with new insights and action items
            setSelectedCoach(prev => ({
                ...prev,
                insights: data.insights,
                action_items: data.action_items
            }));
            
            // Show success message
            setMessages(prev => [...prev, {
                id: Date.now(),
                is_user_message: false,
                message_content: "I've analyzed our conversations and generated new insights and action items for you. Check them out in the Insights and Actions tabs!",
                message_type: 'system',
                created_at: new Date().toISOString()
            }]);
            
        } catch (error) {
            console.error('Error generating insights:', error);
            setError('Failed to generate insights. Please try again later.');
        }
    };

    const renderCheckIn = (content) => {
        try {
            const checkIn = typeof content === 'string' ? safeJsonParse(content) : content;
            
            if (!checkIn) {
                return (
                    <div className="alert alert-warning">
                        Unable to display check-in content. Please try again later.
                    </div>
                );
            }
            
            return (
                <div className="check-in-container">
                    <h5 className="mb-3">{checkIn.greeting}</h5>
                    
                    <div className="mb-4">
                        <h6 className="text-primary">Reflection Questions</h6>
                        <ul className="list-group">
                            {checkIn.reflection_questions?.map((q, i) => (
                                <li key={i} className="list-group-item">
                                    <div className="fw-bold">{q.question}</div>
                                    <small className="text-muted">{q.context}</small>
                                </li>
                            )) || <li className="list-group-item">No reflection questions available</li>}
                        </ul>
                    </div>
                    
                    <div className="mb-4">
                        <h6 className="text-primary">Progress Check</h6>
                        <div className="card">
                            <div className="card-body">
                                <h6 className="card-subtitle mb-2 text-muted">{checkIn.progress_check.action_item}</h6>
                                <p className="card-text">{checkIn.progress_check.question}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mb-4">
                        <h6 className="text-primary">Tip of the Day</h6>
                        <div className="card">
                            <div className="card-body">
                                <h6 className="card-title">{checkIn.tip_of_the_day.title}</h6>
                                <p className="card-text">{checkIn.tip_of_the_day.content}</p>
                                <p className="card-text"><small className="text-muted">Application: {checkIn.tip_of_the_day.application}</small></p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mb-3">
                        <p className="fst-italic">{checkIn.motivation}</p>
                    </div>
                </div>
            );
        } catch (error) {
            console.error('Error rendering check-in:', error);
            return (
                <div className="alert alert-danger">
                    Error displaying check-in content.
                </div>
            );
        }
    };

    // Add a function to handle scroll events
    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        const isBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 10;
        setIsScrolledToBottom(isBottom);
    };

    // Add a useEffect to inject the keyframe animation CSS
    useEffect(() => {
        // Create a style element for the keyframe animation
        const styleElement = document.createElement('style');
        styleElement.innerHTML = `
            @keyframes typingAnimation {
                0%, 80%, 100% {
                    transform: scale(0.6);
                    opacity: 0.6;
                }
                40% {
                    transform: scale(1);
                    opacity: 1;
                }
            }
            
            .chat-messages {
                scroll-behavior: smooth;
            }
            
            .message-time {
                font-size: 0.75rem;
                opacity: 0.7;
            }
            
            .message-bubble {
                transition: all 0.3s ease;
            }
            
            .message-bubble:hover {
                box-shadow: 0 3px 8px rgba(0,0,0,0.15);
            }
        `;
        
        // Add the style element to the document head
        document.head.appendChild(styleElement);
        
        // Clean up on component unmount
        return () => {
            document.head.removeChild(styleElement);
        };
    }, []);

    if (showLoginPrompt) {
        return (
            <LoginRequired 
                message="You need to be logged in to use the Career Coach."
                returnPath="/career-coach"
            />
        );
    }

    if (loading) {
        return (
            <div className="container mt-5 text-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-3">Loading your career coach...</p>
            </div>
        );
    }

    if (!selectedCoach) {
        return (
            <div className="container mt-5">
                <div className="card shadow-sm">
                    <div className="card-body">
                        <h3 className="h5 mb-4">Initialize Your Career Coach</h3>
                        
                        {error && (
                            <div className="alert alert-danger" role="alert">
                                {error}
                            </div>
                        )}
                        
                        <form onSubmit={(e) => { e.preventDefault(); initializeCoach(); }}>
                            <div className="mb-3">
                                <label htmlFor="coaching_focus" className="form-label">Coaching Focus</label>
                                <select
                                    className="form-select"
                                    id="coaching_focus"
                                    value={selectedCoachingFocus}
                                    onChange={(e) => setSelectedCoachingFocus(e.target.value)}
                                    required
                                >
                                    <option value="career_development">Career Development</option>
                                    <option value="job_search">Job Search</option>
                                    <option value="leadership">Leadership Development</option>
                                    <option value="work_life_balance">Work-Life Balance</option>
                                    <option value="skill_development">Skill Development</option>
                                </select>
                            </div>
                            
                            <div className="mb-3">
                                <label htmlFor="current_role" className="form-label">Current Role</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="current_role"
                                    value={currentRole}
                                    onChange={(e) => setCurrentRole(e.target.value)}
                                    placeholder="e.g., Software Developer, Marketing Manager"
                                    required
                                />
                            </div>
                            
                            <div className="mb-3">
                                <label htmlFor="career_interests" className="form-label">Career Interests</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="career_interests"
                                    value={careerInterests}
                                    onChange={(e) => setCareerInterests(e.target.value)}
                                    placeholder="e.g., AI, Product Management, UX Design"
                                    required
                                />
                            </div>
                            
                            <div className="mb-3">
                                <label htmlFor="career_goals" className="form-label">Career Goals</label>
                                <textarea
                                    className="form-control"
                                    id="career_goals"
                                    value={careerGoals}
                                    onChange={(e) => setCareerGoals(e.target.value)}
                                    placeholder="What do you want to achieve in your career?"
                                    rows="3"
                                    required
                                ></textarea>
                            </div>
                            
                            <div className="mb-3">
                                <label htmlFor="challenges" className="form-label">Current Challenges</label>
                                <textarea
                                    className="form-control"
                                    id="challenges"
                                    value={challenges}
                                    onChange={(e) => setChallenges(e.target.value)}
                                    placeholder="What challenges are you facing in your career?"
                                    rows="3"
                                    required
                                ></textarea>
                            </div>
                            
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                        Initializing...
                                    </>
                                ) : (
                                    'Initialize Coach'
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mt-5">
            <div className="row">
                <div className="col-md-3">
                    <div className="card shadow-sm mb-4">
                        <div className="card-body">
                            <div className="text-center mb-3">
                                <div className="display-1 text-primary">
                                    <i className="bi bi-person-circle"></i>
                                </div>
                                <h3 className="h5 mb-0">Coach Alex</h3>
                                <p className="text-muted small">Your AI Career Coach</p>
                            </div>
                            
                            <div className="list-group list-group-flush">
                                <button
                                    className={`list-group-item list-group-item-action ${view === 'chat' ? 'active' : ''}`}
                                    onClick={() => setView('chat')}
                                >
                                    <i className="bi bi-chat-dots me-2"></i>
                                    Chat
                                </button>
                                <button
                                    className={`list-group-item list-group-item-action ${view === 'insights' ? 'active' : ''}`}
                                    onClick={() => setView('insights')}
                                >
                                    <i className="bi bi-lightbulb me-2"></i>
                                    Insights
                                </button>
                                <button
                                    className={`list-group-item list-group-item-action ${view === 'actions' ? 'active' : ''}`}
                                    onClick={() => setView('actions')}
                                >
                                    <i className="bi bi-check2-square me-2"></i>
                                    Action Items
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="card shadow-sm">
                            <div className="card-body">
                            <h5 className="card-title">Coaching Focus</h5>
                            <p className="card-text">{selectedCoach.coaching_focus.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</p>
                            
                            <h5 className="card-title mt-3">Career Interests</h5>
                            <p className="card-text">
                                {selectedCoach.user_profile && typeof selectedCoach.user_profile === 'object' 
                                    ? selectedCoach.user_profile.career_interests 
                                    : safeJsonParse(selectedCoach.user_profile)?.career_interests || 'Not specified'}
                            </p>
                            
                            <h5 className="card-title mt-3">Current Role</h5>
                            <p className="card-text">
                                {selectedCoach.user_profile && typeof selectedCoach.user_profile === 'object' 
                                    ? selectedCoach.user_profile.current_role 
                                    : safeJsonParse(selectedCoach.user_profile)?.current_role || 'Not specified'}
                            </p>
                            </div>
                        </div>
                </div>
                
                <div className="col-md-9">
                    {error && (
                        <div className="alert alert-danger mb-4" role="alert">
                            {error}
                        </div>
                    )}
                    
                        <div className="card shadow-sm">
                            <div className="card-body">
                            {view === 'chat' && (
                                <>
                                    <div 
                                        className="chat-messages p-3" 
                                        style={{ height: '500px', overflowY: 'auto', position: 'relative' }}
                                        onScroll={handleScroll}
                                    >
                                    {messages.length === 0 ? (
                                        <div className="text-center text-muted my-5">
                                                <div className="display-1">
                                                    <i className="bi bi-chat-dots"></i>
                                                </div>
                                            <p className="mt-3">Start chatting with your career coach!</p>
                                        </div>
                                    ) : (
                                            messages.map((msg, index) => (
                                                <div 
                                                    key={msg.id || index} 
                                                    className={`message mb-3 ${msg.is_user_message ? 'text-end' : ''}`}
                                                >
                                                    {!msg.is_user_message && msg.message_type !== 'typing' && (
                                                        <div className="d-flex align-items-center mb-1">
                                                            <div className="text-primary me-2">
                                                                <i className="bi bi-person-circle"></i>
                                                            </div>
                                                            <div className="fw-bold">Coach Alex</div>
                                                        </div>
                                                    )}
                                                    
                                                    <div style={{ 
                                                        display: 'inline-block',
                                                        maxWidth: '80%',
                                                        textAlign: 'left'
                                                    }}>
                                                        <MessageBubble message={msg} />
                                                    </div>
                                                    
                                                    {/* Add timestamp for non-typing messages */}
                                                    {msg.message_type !== 'typing' && (
                                                        <div className="message-time small text-muted mt-1">
                                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                            <div ref={messagesEndRef} />
                                        
                                        {!isScrolledToBottom && messages.length > 0 && (
                                            <button 
                                                className="btn btn-sm btn-primary rounded-circle position-absolute"
                                                style={{ bottom: '20px', right: '20px', width: '40px', height: '40px' }}
                                                onClick={scrollToBottom}
                                            >
                                                <i className="bi bi-arrow-down"></i>
                                            </button>
                                    )}
                                </div>
                                    
                                    {sendingError && (
                                        <div className="alert alert-danger mt-3 mb-3" role="alert">
                                            <i className="bi bi-exclamation-triangle me-2"></i>
                                            {sendingError}
                                            <button 
                                                className="btn btn-sm btn-outline-danger ms-3"
                                                onClick={() => {
                                                    // Restore the last message to the input field
                                                    const lastUserMessage = [...messages]
                                                        .reverse()
                                                        .find(msg => msg.is_user_message);
                                                    if (lastUserMessage) {
                                                        setNewMessage(lastUserMessage.message_content);
                                                    }
                                                }}
                                            >
                                                <i className="bi bi-arrow-repeat me-1"></i>
                                                Retry
                                            </button>
                                        </div>
                                    )}
                                
                                <div className="chat-input mt-3">
                                        <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }}>
                                        <div className="input-group">
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Type your message..."
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                    disabled={messages.some(msg => msg.message_type === 'typing')}
                                            />
                                            <button
                                                className="btn btn-primary"
                                                    type="submit"
                                                    disabled={!newMessage.trim() || messages.some(msg => msg.message_type === 'typing')}
                                            >
                                                <i className="bi bi-send"></i>
                                            </button>
                                        </div>
                                    </form>
                                </div>
                                </>
                    )}
                    
                            {view === 'insights' && selectedCoach && selectedCoach.insights && (
                        <div className="card shadow-sm">
                            <div className="card-body">
                                <h3 className="h5 mb-4">Career Insights</h3>
                                
                                <div className="mb-4">
                                    <h4 className="h6 text-primary">Assessment</h4>
                                            <p>{selectedCoach.insights.initial_assessment || selectedCoach.insights.assessment}</p>
                                </div>
                                
                                <div className="row mb-4">
                                    <div className="col-md-6">
                                        <h4 className="h6 text-primary">Strengths</h4>
                                        <ul className="list-group">
                                                    {selectedCoach.insights.strengths.map((strength, index) => (
                                                <li key={index} className="list-group-item">
                                                    <i className="bi bi-star-fill text-warning me-2"></i>
                                                    {strength}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="col-md-6">
                                        <h4 className="h6 text-primary">Growth Areas</h4>
                                        <ul className="list-group">
                                                    {selectedCoach.insights.growth_areas.map((area, index) => (
                                                <li key={index} className="list-group-item">
                                                    <i className="bi bi-arrow-up-circle-fill text-success me-2"></i>
                                                    {area}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                                
                                <h4 className="h6 text-primary mb-3">Detailed Insights</h4>
                                <div className="accordion">
                                            {selectedCoach.insights.insights.map((insight, index) => (
                                        <div key={index} className="accordion-item">
                                            <h2 className="accordion-header">
                                                <button
                                                    className="accordion-button collapsed"
                                                    type="button"
                                                    data-bs-toggle="collapse"
                                                    data-bs-target={`#insight-${index}`}
                                                >
                                                    {insight.area}
                                                </button>
                                            </h2>
                                            <div
                                                id={`insight-${index}`}
                                                className="accordion-collapse collapse"
                                                        data-bs-parent="#accordion"
                                            >
                                                <div className="accordion-body">
                                                            {insight.description}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                                                </div>
                                            </div>
                                            </div>
            </div>
        </div>
    );
}

export default CareerCoach; 