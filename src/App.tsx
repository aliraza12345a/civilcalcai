import React, { useState } from 'react';
import { Dashboard } from './pages/Dashboard';
import { BeamWorkspace } from './pages/BeamWorkspace';
import { SectionWorkspace } from './pages/SectionWorkspace';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'beam-workspace' | 'section-workspace'>('dashboard');
  const [customIx, setCustomIx] = useState<number | undefined>(undefined);

  const handleSelectCalculator = (id: string) => {
    if (id === 'structural-beams') {
      setCurrentPage('beam-workspace');
    } else if (id === 'cross-sections') {
      setCurrentPage('section-workspace');
    }
  };

  const handleBackToDashboard = () => {
    setCurrentPage('dashboard');
  };

  const handleSendIxToBeam = (ix: number) => {
    setCustomIx(ix);
    setCurrentPage('beam-workspace');
  };

  const handleOpenSectionCalculator = () => {
    setCurrentPage('section-workspace');
  };

  if (currentPage === 'beam-workspace') {
    return (
      <BeamWorkspace 
        onBack={handleBackToDashboard} 
        initialIx={customIx}
        onOpenSectionCalculator={handleOpenSectionCalculator}
      />
    );
  }

  if (currentPage === 'section-workspace') {
    return (
      <SectionWorkspace 
        onBack={handleBackToDashboard} 
        onSendIxToBeam={handleSendIxToBeam}
      />
    );
  }

  return <Dashboard onSelectCalculator={handleSelectCalculator} />;
};

export default App;
