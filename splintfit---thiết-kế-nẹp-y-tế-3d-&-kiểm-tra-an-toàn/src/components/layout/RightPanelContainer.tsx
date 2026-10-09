import React from 'react';
import { useProject } from '../../context/ProjectContext';
import { LoadScanPanel } from '../panels/LoadScanPanel';
import { LandmarksPanel } from '../panels/LandmarksPanel';
import { DesignPanel } from '../panels/DesignPanel';
import { SafetyPanel } from '../panels/SafetyPanel';
import { ExportPanel } from '../panels/ExportPanel';

export const RightPanelContainer: React.FC = () => {
  const { state } = useProject();

  return (
    <aside className="w-96 bg-white border-l border-[#D0D7DE] flex flex-col shrink-0 shadow-xs z-10 overflow-hidden">
      {state.currentStep === 1 && <LoadScanPanel />}
      {state.currentStep === 2 && <LandmarksPanel />}
      {state.currentStep === 3 && <DesignPanel />}
      {state.currentStep === 4 && <SafetyPanel />}
      {state.currentStep === 5 && <ExportPanel />}
    </aside>
  );
};
