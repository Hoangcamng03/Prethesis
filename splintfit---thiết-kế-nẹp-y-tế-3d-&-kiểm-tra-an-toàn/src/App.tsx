/**
 * SplintFit - Medical 3D Splint CAD & Safety Suite
 * Implements the QMainWindow engineering layout:
 * - TopBar (Header controls, case picker, stage, mode, undo/redo)
 * - Left: Stepper (5 steps with prerequisites & tooltip lock reason)
 * - Center: ThreeViewport (3D WebGL Three.js interactive canvas)
 * - Right: RightPanelContainer (QStackedWidget step-specific parameter panels)
 * - Bottom: StatusBar (progress, warnings, confidence badge & toasts)
 */
import React, { useEffect } from 'react';
import { ProjectProvider, useProject } from './context/ProjectContext';
import { TopBar } from './components/layout/TopBar';
import { Stepper } from './components/layout/Stepper';
import { ThreeViewport } from './components/viewport/ThreeViewport';
import { RightPanelContainer } from './components/layout/RightPanelContainer';
import { StatusBar } from './components/layout/StatusBar';
import { StageChangeDialog } from './components/modals/StageChangeDialog';

const MainLayout: React.FC = () => {
  const { undo, redo, goToStep, canUndo, canRedo } = useProject();

  // Global hotkeys for Undo (Ctrl+Z), Redo (Ctrl+Y / Ctrl+Shift+Z), and Step navigation (1..5)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input or select
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo) redo();
        } else {
          if (canUndo) undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        if (canRedo) redo();
      } else if (['1', '2', '3', '4', '5'].includes(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        goToStep(parseInt(e.key));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo, goToStep]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#F6F8FA] text-[#24292F]">
      {/* Thanh trên (Top Bar) */}
      <TopBar />

      {/* Vùng làm việc chính: Stepper + Khung 3D + Bảng thông số */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Tiến trình 5 bước (Bên trái) */}
        <Stepper />

        {/* Khung 3D trung tâm (Three.js WebGL / PyVista Interactor) */}
        <main className="flex-1 relative h-full flex flex-col min-w-0">
          <ThreeViewport />
        </main>

        {/* Bảng thông số theo bước (Bên phải - QStackedWidget) */}
        <RightPanelContainer />
      </div>

      {/* Thanh dưới (Status Bar & Toasts) */}
      <StatusBar />

      {/* Dialog xác nhận đổi giai đoạn Cấp <-> Chính thức */}
      <StageChangeDialog />
    </div>
  );
};

export default function App() {
  return (
    <ProjectProvider>
      <MainLayout />
    </ProjectProvider>
  );
}
