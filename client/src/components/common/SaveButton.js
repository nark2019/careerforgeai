import React, { useState } from 'react';
import DataService from '../../services/DataService';

/**
 * SaveButton - A reusable component for saving data
 * @param {Object} props - Component props
 * @param {string} props.componentType - The type of component (e.g., 'quiz', 'portfolio')
 * @param {Object} props.data - The data to save
 * @param {Function} props.onSaveSuccess - Function to call when save is successful
 * @param {Function} props.onSaveError - Function to call when save fails
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.disabled - Whether the button is disabled
 * @returns {JSX.Element} - The rendered component
 */
function SaveButton({ 
    componentType, 
    data, 
    onSaveSuccess, 
    onSaveError, 
    className = 'btn-primary', 
    disabled = false 
}) {
    const [saveStatus, setSaveStatus] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        if (!data || isLoading) return;

        // Check if user is logged in
        if (!DataService.isLoggedIn()) {
            setSaveStatus('Please log in to save');
            if (onSaveError) onSaveError(new Error('Authentication required'));
            return;
        }

        setIsLoading(true);
        setSaveStatus('Saving...');

        try {
            const result = await DataService.saveData(componentType, data);
            setSaveStatus('Saved successfully!');
            
            // Reset status after 3 seconds
            setTimeout(() => {
                if (setSaveStatus) { // Check if component is still mounted
                    setSaveStatus('');
                }
            }, 3000);
            
            if (onSaveSuccess) onSaveSuccess(result);
        } catch (error) {
            console.error(`Error saving ${componentType} data:`, error);
            setSaveStatus('Failed to save');
            
            // Reset status after 3 seconds and show retry
            setTimeout(() => {
                if (setSaveStatus) { // Check if component is still mounted
                    setSaveStatus('Retry?');
                }
            }, 3000);
            
            if (onSaveError) onSaveError(error);
        } finally {
            setIsLoading(false);
        }
    };

    // Determine button class based on status
    let buttonClass = `btn ${className}`;
    if (saveStatus === 'Saved successfully!') {
        buttonClass = 'btn btn-success';
    } else if (saveStatus === 'Failed to save') {
        buttonClass = 'btn btn-danger';
    }

    return (
        <button 
            className={buttonClass}
            onClick={handleSave}
            disabled={disabled || isLoading}
        >
            {isLoading && (
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            )}
            {saveStatus === 'Saved successfully!' && (
                <i className="bi bi-check-circle me-2"></i>
            )}
            {saveStatus === 'Failed to save' && (
                <i className="bi bi-exclamation-triangle me-2"></i>
            )}
            {saveStatus || 'Save'}
        </button>
    );
}

export default SaveButton; 