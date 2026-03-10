import React, { useState } from 'react';

function RoleTitles({ jobTitles, onUpdate, onNext, onBack }) {
  const [inputValue, setInputValue] = useState('');

  const handleAddTitle = (e) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    
    if (trimmed && !jobTitles.includes(trimmed)) {
      onUpdate([...jobTitles, trimmed]);
      setInputValue('');
    }
  };

  const handleRemoveTitle = (titleToRemove) => {
    onUpdate(jobTitles.filter(t => t !== titleToRemove));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAddTitle(e);
    }
  };

  const suggestedTitles = [
    'Software Engineer',
    'Senior Software Engineer',
    'Frontend Developer',
    'Backend Developer',
    'Full Stack Developer',
    'Data Scientist',
    'Machine Learning Engineer',
    'DevOps Engineer',
    'Product Manager',
    'Engineering Manager'
  ];

  const availableSuggestions = suggestedTitles.filter(
    s => !jobTitles.includes(s)
  );

  return (
    <div>
      <h2 className="step-title">Target Job Titles</h2>
      <p className="step-description">
        Specify the job titles or roles you're looking for. Be specific for better matches.
      </p>

      <div className="input-group">
        <label className="input-label">Job Title</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            className="text-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="e.g., Senior Software Engineer, Data Scientist"
          />
          <button
            onClick={handleAddTitle}
            className="btn btn-primary"
            disabled={!inputValue.trim()}
          >
            Add
          </button>
        </div>
      </div>

      {jobTitles.length > 0 && (
        <div>
          <h4 style={{ marginBottom: '0.75rem' }}>Target Roles ({jobTitles.length})</h4>
          <div className="chips-container">
            {jobTitles.map((title, idx) => (
              <div key={idx} className="chip">
                {title}
                <button
                  onClick={() => handleRemoveTitle(title)}
                  className="chip-remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {availableSuggestions.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <h4 style={{ marginBottom: '0.75rem', color: '#666' }}>Quick Add:</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {availableSuggestions.slice(0, 6).map((title, idx) => (
              <button
                key={idx}
                onClick={() => onUpdate([...jobTitles, title])}
                style={{
                  padding: '0.5rem 1rem',
                  border: '2px solid #e9ecef',
                  borderRadius: '8px',
                  background: 'white',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                + {title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="wizard-actions">
        <button onClick={onBack} className="btn btn-secondary">
          ← Back
        </button>
        <button
          onClick={onNext}
          className="btn btn-primary"
          disabled={jobTitles.length === 0}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export default RoleTitles;

