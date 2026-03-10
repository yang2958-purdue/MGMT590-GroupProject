import React, { useState } from 'react';

function CompanySelector({ companies, onUpdate, onNext, onBack }) {
  const [inputValue, setInputValue] = useState('');

  const handleAddCompany = (e) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    
    if (trimmed && !companies.includes(trimmed)) {
      onUpdate([...companies, trimmed]);
      setInputValue('');
    }
  };

  const handleRemoveCompany = (companyToRemove) => {
    onUpdate(companies.filter(c => c !== companyToRemove));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAddCompany(e);
    }
  };

  const suggestedCompanies = [
    'Google', 'Amazon', 'Microsoft', 'Apple', 'Meta',
    'Netflix', 'Tesla', 'Airbnb', 'Uber', 'Stripe'
  ];

  const availableSuggestions = suggestedCompanies.filter(
    s => !companies.includes(s)
  );

  return (
    <div>
      <h2 className="step-title">Select Target Companies</h2>
      <p className="step-description">
        Add the companies you're interested in. You can type custom names or select from suggestions.
      </p>

      <div className="input-group">
        <label className="input-label">Company Name</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            className="text-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="e.g., Google, Amazon, OpenAI"
          />
          <button
            onClick={handleAddCompany}
            className="btn btn-primary"
            disabled={!inputValue.trim()}
          >
            Add
          </button>
        </div>
      </div>

      {companies.length > 0 && (
        <div>
          <h4 style={{ marginBottom: '0.75rem' }}>Selected Companies ({companies.length})</h4>
          <div className="chips-container">
            {companies.map((company, idx) => (
              <div key={idx} className="chip">
                {company}
                <button
                  onClick={() => handleRemoveCompany(company)}
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
            {availableSuggestions.map((company, idx) => (
              <button
                key={idx}
                onClick={() => onUpdate([...companies, company])}
                style={{
                  padding: '0.5rem 1rem',
                  border: '2px solid #e9ecef',
                  borderRadius: '8px',
                  background: 'white',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                + {company}
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
          disabled={companies.length === 0}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export default CompanySelector;

