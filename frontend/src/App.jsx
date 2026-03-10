import React, { useState } from 'react';
import ResumeUpload from './components/ResumeUpload';
import CompanySelector from './components/CompanySelector';
import RoleTitles from './components/RoleTitles';
import JobSearch from './components/JobSearch';
import RankedResults from './components/RankedResults';
import ResumeTailor from './components/ResumeTailor';

const STEPS = [
  { id: 1, label: 'Upload Resume' },
  { id: 2, label: 'Select Companies' },
  { id: 3, label: 'Job Titles' },
  { id: 4, label: 'Search Jobs' },
  { id: 5, label: 'View Results' },
  { id: 6, label: 'Tailor Resume' },
];

function App() {
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState({
    resume: null,
    companies: [],
    jobTitles: [],
    jobs: [],
    selectedJob: null,
    tailoredResume: null,
  });

  const updateWizardData = (key, value) => {
    setWizardData(prev => ({ ...prev, [key]: value }));
  };

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step) => {
    setCurrentStep(step);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <ResumeUpload
            resume={wizardData.resume}
            onUpload={(resume) => {
              updateWizardData('resume', resume);
              nextStep();
            }}
          />
        );
      case 2:
        return (
          <CompanySelector
            companies={wizardData.companies}
            onUpdate={(companies) => updateWizardData('companies', companies)}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 3:
        return (
          <RoleTitles
            jobTitles={wizardData.jobTitles}
            onUpdate={(titles) => updateWizardData('jobTitles', titles)}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 4:
        return (
          <JobSearch
            companies={wizardData.companies}
            jobTitles={wizardData.jobTitles}
            resume={wizardData.resume}
            onJobsFound={(jobs) => {
              updateWizardData('jobs', jobs);
              nextStep();
            }}
            onBack={prevStep}
          />
        );
      case 5:
        return (
          <RankedResults
            jobs={wizardData.jobs}
            resume={wizardData.resume}
            onSelectJob={(job) => {
              updateWizardData('selectedJob', job);
              nextStep();
            }}
            onBack={prevStep}
          />
        );
      case 6:
        return (
          <ResumeTailor
            resume={wizardData.resume}
            job={wizardData.selectedJob}
            onComplete={(tailoredResume) => {
              updateWizardData('tailoredResume', tailoredResume);
            }}
            onBack={prevStep}
            onStartOver={() => {
              setCurrentStep(1);
              setWizardData({
                resume: null,
                companies: [],
                jobTitles: [],
                jobs: [],
                selectedJob: null,
                tailoredResume: null,
              });
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🎯 Job Search & Resume Tailoring Tool</h1>
        <p>Find the perfect job and tailor your resume with AI</p>
      </header>

      <main className="main-container">
        <div className="wizard-container">
          {/* Progress bar */}
          <div className="wizard-progress">
            {STEPS.map((step) => (
              <div
                key={step.id}
                className={`progress-step ${
                  step.id === currentStep ? 'active' : ''
                } ${step.id < currentStep ? 'completed' : ''}`}
              >
                <div className="step-circle">{step.id}</div>
                <span className="step-label">{step.label}</span>
              </div>
            ))}
          </div>

          {/* Step content */}
          <div className="wizard-content">{renderStep()}</div>
        </div>
      </main>
    </div>
  );
}

export default App;

