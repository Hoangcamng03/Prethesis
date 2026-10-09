/**
 * SplintFit - Central Project State Management (ProjectContext)
 * Implements QUndoStack, background simulation, toasts, and stage switching logic.
 */
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  ProjectState,
  ClinicalStage,
  UiMode,
  HandSide,
  SplintDesignParams,
  Landmark,
  ImmobilizationSegment,
  FractureZone,
  ToastMessage,
  CrossSectionSlice,
  SafetyCheckItem,
} from '../types';
import {
  getInitialProjectState,
  DEFAULT_PARAMS_ACUTE,
  DEFAULT_PARAMS_DEFINITIVE,
  PRESET_CASES,
} from '../utils/initialState';
import { computeCrossSections } from '../utils/proceduralMesh';

interface ProjectContextValue {
  state: ProjectState;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;

  // Navigation
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  stepRequirementsMet: (step: number) => { met: boolean; reason?: string };

  // Case & Clinical stage
  switchCasePreset: (caseId: string) => void;
  setHandSide: (side: HandSide) => void;
  requestStageChange: (newStage: ClinicalStage) => void;
  confirmStageChange: (resetParamsToDefault: boolean) => void;
  pendingStageChange: ClinicalStage | null;
  cancelStageChange: () => void;
  setUiMode: (mode: UiMode) => void;

  // Scan & Caliper (Step 1)
  updateCaliperMeasurements: (field: keyof ProjectState['caliperMeasurements'], value: number) => void;
  checkScaleRatio: () => void;
  toggleShowHoles: () => void;
  setFillSmallHoles: (fill: boolean, threshold?: number) => void;
  loadScanPresetFile: (filename: string) => void;

  // Landmarks & Segments (Step 2)
  setActiveLandmark: (id: string | null) => void;
  updateLandmarkPosition: (id: string, position: [number, number, number] | null) => void;
  updateLandmarkRelief: (id: string, extraReliefMm: number) => void;
  resetLandmark: (id: string) => void;
  clearAllLandmarks: () => void;
  toggleSegmentFixed: (segmentId: string) => void;
  updateFractureZone: (zone: Partial<FractureZone>) => void;

  // Design Parameters (Step 3)
  updateParams: (partial: Partial<SplintDesignParams>) => void;
  resetParamsToStageDefault: () => void;

  // Display toggles
  toggleDisplayOption: (key: keyof ProjectState['displayOptions'], value?: boolean | number) => void;
  setActiveSliceZ: (z: number) => void;

  // Approval (Step 5)
  setDoctorApproval: (reviewed: boolean, reviewerName: string) => void;

  // File operations
  saveProjectFile: () => void;
  loadProjectFile: (fileContent: string) => void;

  // Toasts
  toasts: ToastMessage[];
  addToast: (type: ToastMessage['type'], title: string, message: string) => void;
  removeToast: (id: string) => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ProjectState>(() => getInitialProjectState('acute'));
  const [history, setHistory] = useState<ProjectState[]>([]);
  const [redoStack, setRedoStack] = useState<ProjectState[]>([]);
  const [pendingStageChange, setPendingStageChange] = useState<ClinicalStage | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Debounce timer for parameter changes (150ms as specified)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const addToast = useCallback((type: ToastMessage['type'], title: string, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, title, message, timestamp: Date.now() }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Push state to undo history
  const pushHistory = useCallback((currentState: ProjectState) => {
    setHistory((prev) => [...prev.slice(-30), currentState]);
    setRedoStack([]);
  }, []);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, state]);
    setState(previous);
    addToast('info', 'Hoàn tác', 'Đã quay lại trạng thái trước đó');
  }, [history, state, addToast]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setHistory((prev) => [...prev, state]);
    setState(next);
    addToast('info', 'Làm lại', 'Đã thực hiện lại thao tác');
  }, [redoStack, state, addToast]);

  // Step Requirements Validation
  const stepRequirementsMet = useCallback(
    (step: number): { met: boolean; reason?: string } => {
      if (step === 1) return { met: true };

      if (step === 2) {
        if (!state.scanFileName) {
          return { met: false, reason: 'Cần tải lên hoặc chọn file dữ liệu quét 3D trước.' };
        }
        return { met: true };
      }

      if (step === 3) {
        // Step 3 requires step 1 and at least 3 landmarks pinned in step 2
        const pinnedCount = state.landmarks.filter((l) => l.isPinned).length;
        if (pinnedCount < 3) {
          return {
            met: false,
            reason: `Cần xác định tối thiểu 3 mốc giải phẫu (hiện có ${pinnedCount}/5).`,
          };
        }
        return { met: true };
      }

      if (step === 4) {
        return { met: true };
      }

      if (step === 5) {
        // Step 5 locked if step 4 has any failed safety check
        const failedChecks = state.safetyChecks.filter((c) => !c.isPassed);
        if (failedChecks.length > 0) {
          return {
            met: false,
            reason: `Còn ${failedChecks.length} tiêu chuẩn an toàn chưa đạt. Vui lòng chỉnh lại ở Bước ④.`,
          };
        }
        return { met: true };
      }

      return { met: true };
    },
    [state.scanFileName, state.landmarks, state.safetyChecks]
  );

  const goToStep = useCallback(
    (step: number) => {
      const check = stepRequirementsMet(step);
      if (!check.met) {
        addToast('warning', 'Bước bị khoá', check.reason || 'Chưa đủ điều kiện chuyển bước');
        return;
      }
      setState((prev) => ({ ...prev, currentStep: step }));
    },
    [stepRequirementsMet, addToast]
  );

  const nextStep = useCallback(() => {
    if (state.currentStep < 5) {
      goToStep(state.currentStep + 1);
    }
  }, [state.currentStep, goToStep]);

  const prevStep = useCallback(() => {
    if (state.currentStep > 1) {
      setState((prev) => ({ ...prev, currentStep: prev.currentStep - 1 }));
    }
  }, [state.currentStep]);

  // Case preset switcher
  const switchCasePreset = useCallback((caseId: string) => {
    const preset = PRESET_CASES.find((c) => c.caseId === caseId);
    if (!preset) return;
    const newState = getInitialProjectState(preset.stage);
    newState.caseId = preset.caseId;
    newState.handSide = preset.handSide;
    setState(newState);
    setHistory([]);
    setRedoStack([]);
    addToast('success', 'Đã chuyển ca', `Đã nạp ${preset.title}`);
  }, [addToast]);

  const setHandSide = useCallback((side: HandSide) => {
    setState((prev) => ({ ...prev, handSide: side }));
  }, []);

  // Clinical Stage Transitions with prompt
  const requestStageChange = useCallback((newStage: ClinicalStage) => {
    if (newStage === state.stage) return;
    setPendingStageChange(newStage);
  }, [state.stage]);

  const confirmStageChange = useCallback((resetParamsToDefault: boolean) => {
    if (!pendingStageChange) return;
    pushHistory(state);

    setState((prev) => {
      let updatedParams = { ...prev.params };
      if (resetParamsToDefault) {
        updatedParams =
          pendingStageChange === 'acute'
            ? { ...DEFAULT_PARAMS_ACUTE }
            : { ...DEFAULT_PARAMS_DEFINITIVE };
      } else {
        // Enforce hard limit if acute
        if (pendingStageChange === 'acute' && updatedParams.swellingAllowanceMm < 5) {
          updatedParams.swellingAllowanceMm = 5;
        }
      }

      const updatedSlices = computeCrossSections(updatedParams);
      return {
        ...prev,
        stage: pendingStageChange,
        params: updatedParams,
        slices: updatedSlices,
      };
    });

    addToast(
      'info',
      'Đã đổi giai đoạn',
      `Chuyển sang ${pendingStageChange === 'acute' ? 'Giai đoạn Cấp' : 'Giai đoạn Chính thức'}`
    );
    setPendingStageChange(null);
  }, [pendingStageChange, state, pushHistory, addToast]);

  const cancelStageChange = useCallback(() => {
    setPendingStageChange(null);
  }, []);

  const setUiMode = useCallback((mode: UiMode) => {
    setState((prev) => ({ ...prev, uiMode: mode }));
    addToast('info', 'Chế độ hiển thị', mode === 'simple' ? 'Chế độ Đơn giản' : 'Chế độ Chuyên gia');
  }, [addToast]);

  // Step 1 Actions
  const updateCaliperMeasurements = useCallback(
    (field: keyof ProjectState['caliperMeasurements'], value: number) => {
      setState((prev) => ({
        ...prev,
        caliperMeasurements: {
          ...prev.caliperMeasurements,
          [field]: value,
        },
      }));
    },
    []
  );

  const checkScaleRatio = useCallback(() => {
    setState((prev) => {
      // Forearm 3D model circumference at wrist is approx 163mm
      const diff = Math.abs(prev.caliperMeasurements.wristCircumference - 163.6);
      const isPass = diff <= 3.0;

      return {
        ...prev,
        meshStats: {
          ...prev.meshStats,
          scaleMatch: isPass ? 'pass' : 'divergent',
          discrepancyMm: Math.round(diff * 10) / 10,
        },
        safetyChecks: prev.safetyChecks.map((c) =>
          c.id === 'caliper_match'
            ? {
                ...c,
                isPassed: isPass,
                valueString: `${Math.round(diff * 10) / 10} mm`,
              }
            : c
        ),
      };
    });

    const diff = Math.abs(state.caliperMeasurements.wristCircumference - 163.6);
    if (diff <= 3.0) {
      addToast('success', 'Kiểm tra tỉ lệ: Đạt', `Độ lệch ${diff.toFixed(1)} mm nằm trong ngưỡng cho phép (≤ 3.0 mm)`);
    } else {
      addToast('warning', 'Kiểm tra tỉ lệ: Lệch', `Độ lệch ${diff.toFixed(1)} mm vượt ngưỡng an toàn! Cần hiệu chỉnh tỉ lệ quét.`);
    }
  }, [state.caliperMeasurements.wristCircumference, addToast]);

  const toggleShowHoles = useCallback(() => {
    setState((prev) => ({
      ...prev,
      meshStats: {
        ...prev.meshStats,
        hasShowHoles: !prev.meshStats.hasShowHoles,
      },
      displayOptions: {
        ...prev.displayOptions,
        showHoles: !prev.displayOptions.showHoles,
      },
    }));
  }, []);

  const setFillSmallHoles = useCallback((fill: boolean, threshold = 5.0) => {
    setState((prev) => ({
      ...prev,
      meshStats: {
        ...prev.meshStats,
        fillSmallHoles: fill,
        maxHoleThresholdMm: threshold,
      },
    }));
    addToast('info', 'Xử lý lưới quét', fill ? `Tự động lấp lỗ khuyết < ${threshold} mm` : 'Đã tắt tự động lấp lỗ');
  }, [addToast]);

  const loadScanPresetFile = useCallback((filename: string) => {
    setState((prev) => ({
      ...prev,
      scanFileName: filename,
    }));
    addToast('success', 'Nạp dữ liệu quét', `Đã nạp file thành công: ${filename}`);
  }, [addToast]);

  // Step 2 Actions
  const setActiveLandmark = useCallback((id: string | null) => {
    setState((prev) => ({ ...prev, activeLandmarkId: id }));
  }, []);

  const updateLandmarkPosition = useCallback(
    (id: string, position: [number, number, number] | null) => {
      pushHistory(state);
      setState((prev) => ({
        ...prev,
        landmarks: prev.landmarks.map((l) =>
          l.id === id ? { ...l, position, isPinned: position !== null } : l
        ),
      }));
      addToast('success', 'Ghim mốc giải phẫu', `Đã xác định vị trí mốc`);
    },
    [state, pushHistory, addToast]
  );

  const updateLandmarkRelief = useCallback((id: string, extraReliefMm: number) => {
    setState((prev) => ({
      ...prev,
      landmarks: prev.landmarks.map((l) =>
        l.id === id ? { ...l, extraReliefMm } : l
      ),
    }));
  }, []);

  const resetLandmark = useCallback((id: string) => {
    pushHistory(state);
    setState((prev) => ({
      ...prev,
      landmarks: prev.landmarks.map((l) =>
        l.id === id ? { ...l, position: null, isPinned: false } : l
      ),
    }));
    addToast('info', 'Chấm lại mốc', 'Vui lòng bấm lên vị trí trên mô hình 3D');
  }, [state, pushHistory, addToast]);

  const clearAllLandmarks = useCallback(() => {
    pushHistory(state);
    setState((prev) => ({
      ...prev,
      landmarks: prev.landmarks.map((l) => ({ ...l, position: null, isPinned: false })),
    }));
    addToast('warning', 'Xoá mốc', 'Đã xoá toàn bộ mốc giải phẫu');
  }, [state, pushHistory, addToast]);

  const toggleSegmentFixed = useCallback(
    (segmentId: string) => {
      pushHistory(state);
      setState((prev) => ({
        ...prev,
        segments: prev.segments.map((s) =>
          s.id === segmentId ? { ...s, isFixed: !s.isFixed } : s
        ),
      }));
    },
    [state, pushHistory]
  );

  const updateFractureZone = useCallback(
    (zone: Partial<FractureZone>) => {
      setState((prev) => ({
        ...prev,
        fractureZone: {
          ...prev.fractureZone,
          ...zone,
        },
      }));
    },
    []
  );

  // Step 3 Actions (with 150ms debounce)
  const updateParams = useCallback(
    (partial: Partial<SplintDesignParams>) => {
      // Update state immediately for reactive UI sliders
      setState((prev) => {
        const nextParams = { ...prev.params, ...partial };

        // Hard limit check for Acute mode: Swelling allowance minimum is 5.0mm
        let warningText = '';
        if (prev.stage === 'acute' && nextParams.swellingAllowanceMm < 5.0) {
          warningText = 'Giai đoạn Cấp yêu cầu chừa chỗ sưng tối thiểu ≥ 5.0 mm';
        }

        return {
          ...prev,
          params: nextParams,
          isProcessing: true,
          processingTask: 'Đang cập nhật xem trước nẹp (150ms)...',
        };
      });

      // Debounce recomputing heavy geometry & slices
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        setState((prev) => {
          const recomputedSlices = computeCrossSections(prev.params);

          // Update safety checks
          const minClearanceVal = prev.params.swellingAllowanceMm + prev.params.paddingThicknessMm;
          const isPassedClearance = minClearanceVal >= 2.0;
          const isFilletPassed = prev.params.edgeFilletRadiusMm >= 2.0;

          const updatedChecks: SafetyCheckItem[] = prev.safetyChecks.map((c) => {
            if (c.id === 'min_clearance') {
              return {
                ...c,
                isPassed: isPassedClearance,
                valueString: `${minClearanceVal.toFixed(1)} mm`,
              };
            }
            if (c.id === 'fillet_rounded') {
              return {
                ...c,
                isPassed: isFilletPassed,
                valueString: `${prev.params.edgeFilletRadiusMm.toFixed(1)} mm`,
              };
            }
            return c;
          });

          return {
            ...prev,
            slices: recomputedSlices,
            safetyChecks: updatedChecks,
            isProcessing: false,
            processingTask: 'Sẵn sàng',
          };
        });
      }, 150);
    },
    []
  );

  const resetParamsToStageDefault = useCallback(() => {
    pushHistory(state);
    const defaultVals =
      state.stage === 'acute' ? { ...DEFAULT_PARAMS_ACUTE } : { ...DEFAULT_PARAMS_DEFINITIVE };
    updateParams(defaultVals);
    addToast('info', 'Đặt lại thông số', 'Đã khôi phục thông số gợi ý theo giai đoạn lâm sàng');
  }, [state, pushHistory, updateParams, addToast]);

  // Display toggles
  const toggleDisplayOption = useCallback(
    (key: keyof ProjectState['displayOptions'], value?: boolean | number) => {
      setState((prev) => ({
        ...prev,
        displayOptions: {
          ...prev.displayOptions,
          [key]: value !== undefined ? value : !prev.displayOptions[key],
        },
      }));
    },
    []
  );

  const setActiveSliceZ = useCallback((z: number) => {
    setState((prev) => ({
      ...prev,
      displayOptions: {
        ...prev.displayOptions,
        activeSliceZ: z,
      },
    }));
  }, []);

  // Step 5 Actions
  const setDoctorApproval = useCallback((reviewed: boolean, reviewerName: string) => {
    setState((prev) => ({
      ...prev,
      approval: {
        doctorReviewed: reviewed,
        reviewerName,
        reviewDate: reviewed ? new Date().toISOString() : '',
      },
    }));
  }, []);

  // Project file save / load (.splintfit.json)
  const saveProjectFile = useCallback(() => {
    const exportData = {
      version: '1.0.0',
      application: 'SplintFit Medical CAD',
      exportTimestamp: new Date().toISOString(),
      caseId: state.caseId,
      patientName: state.patientName,
      handSide: state.handSide,
      stage: state.stage,
      meshStats: state.meshStats,
      caliperMeasurements: state.caliperMeasurements,
      landmarks: state.landmarks,
      segments: state.segments,
      fractureZone: state.fractureZone,
      params: state.params,
      approval: state.approval,
      safetyChecks: state.safetyChecks,
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(exportData, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `${state.caseId}_project.splintfit.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    addToast('success', 'Lưu dự án', `Đã xuất file dự án ${state.caseId}_project.splintfit.json`);
  }, [state, addToast]);

  const loadProjectFile = useCallback(
    (fileContent: string) => {
      try {
        const parsed = JSON.parse(fileContent);
        if (parsed.params && parsed.landmarks) {
          pushHistory(state);
          setState((prev) => ({
            ...prev,
            caseId: parsed.caseId || prev.caseId,
            patientName: parsed.patientName || prev.patientName,
            handSide: parsed.handSide || prev.handSide,
            stage: parsed.stage || prev.stage,
            landmarks: parsed.landmarks || prev.landmarks,
            segments: parsed.segments || prev.segments,
            params: parsed.params || prev.params,
            approval: parsed.approval || prev.approval,
            slices: computeCrossSections(parsed.params || prev.params),
          }));
          addToast('success', 'Nạp dự án thành công', `Đã mở ca ${parsed.caseId}`);
        } else {
          addToast('error', 'Lỗi tệp tin', 'Tệp .splintfit.json không đúng định dạng');
        }
      } catch (e) {
        addToast('error', 'Lỗi phân tích cú pháp', 'Không thể đọc tệp .splintfit.json');
      }
    },
    [state, pushHistory, addToast]
  );

  return (
    <ProjectContext.Provider
      value={{
        state,
        canUndo: history.length > 0,
        canRedo: redoStack.length > 0,
        undo,
        redo,
        goToStep,
        nextStep,
        prevStep,
        stepRequirementsMet,
        switchCasePreset,
        setHandSide,
        requestStageChange,
        confirmStageChange,
        pendingStageChange,
        cancelStageChange,
        setUiMode,
        updateCaliperMeasurements,
        checkScaleRatio,
        toggleShowHoles,
        setFillSmallHoles,
        loadScanPresetFile,
        setActiveLandmark,
        updateLandmarkPosition,
        updateLandmarkRelief,
        resetLandmark,
        clearAllLandmarks,
        toggleSegmentFixed,
        updateFractureZone,
        updateParams,
        resetParamsToStageDefault,
        toggleDisplayOption,
        setActiveSliceZ,
        setDoctorApproval,
        saveProjectFile,
        loadProjectFile,
        toasts,
        addToast,
        removeToast,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = (): ProjectContextValue => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
