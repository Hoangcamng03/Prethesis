/**
 * SplintFit - Default Initial State & Preset Clinical Cases
 */
import { ProjectState, ClinicalStage, SplintDesignParams } from '../types';
import { computeCrossSections } from './proceduralMesh';

export const DEFAULT_PARAMS_ACUTE: SplintDesignParams = {
  splintType: 'single_piece',
  jointExtensionMm: 20,
  swellingAllowanceMm: 8, // Acute mode suggested 8mm
  paddingThicknessMm: 3,  // Acute mode suggested 3mm
  wallThicknessMm: 3,
  seamPosition: 'dorsal',
  strapCount: 3,
  aerationRatioPercent: 25,
  aerationHoleSizeMm: 6,
  woundWindowCount: 0,
  woundWindowRadiusMm: 18,
  edgeFilletRadiusMm: 3,
  material: 'PETG',
  printOrientation: 'vertical',
};

export const DEFAULT_PARAMS_DEFINITIVE: SplintDesignParams = {
  splintType: 'single_piece',
  jointExtensionMm: 20,
  swellingAllowanceMm: 3, // Definitive mode suggested 3mm
  paddingThicknessMm: 2,  // Definitive mode suggested 2mm
  wallThicknessMm: 3,
  seamPosition: 'dorsal',
  strapCount: 3,
  aerationRatioPercent: 30,
  aerationHoleSizeMm: 6,
  woundWindowCount: 0,
  woundWindowRadiusMm: 18,
  edgeFilletRadiusMm: 3,
  material: 'PETG',
  printOrientation: 'vertical',
};

export function getInitialProjectState(stage: ClinicalStage = 'acute'): ProjectState {
  const params = stage === 'acute' ? { ...DEFAULT_PARAMS_ACUTE } : { ...DEFAULT_PARAMS_DEFINITIVE };
  const initialSlices = computeCrossSections(params);

  return {
    caseId: 'SF-2026-0842',
    patientName: 'Trần Văn Nam (42T)',
    handSide: 'right',
    stage,
    uiMode: 'expert',
    currentStep: 1,

    scanFileName: 'patient_arm_scan_0842.stl',
    meshStats: {
      pointCount: 18450,
      triangleCount: 36900,
      boundingBox: {
        lengthMm: 275.0,
        widthMm: 86.4,
        heightMm: 74.2,
      },
      unit: 'mm',
      holeCount: 2,
      maxHoleDiameterMm: 4.8,
      hasShowHoles: false,
      fillSmallHoles: true,
      maxHoleThresholdMm: 5.0,
      scaleMatch: 'pass',
      discrepancyMm: 1.4,
    },

    caliperMeasurements: {
      wristCircumference: 165.0,
      forearmCircumference: 235.0,
      handLength: 182.0,
    },

    landmarks: [
      {
        id: 'olecranon',
        name: 'Mỏm khuỷu (Olecranon)',
        label: 'Mỏm khuỷu',
        description: 'Đỉnh xương nhô phía sau khuỷu tay',
        position: [0, -38, -155],
        isPinned: true,
        extraReliefMm: 2.0,
      },
      {
        id: 'cubital_fossa',
        name: 'Nếp khuỷu (Cubital fossa)',
        label: 'Nếp khuỷu',
        description: 'Nếp gấp gập phía trước khuỷu tay',
        position: [0, 24, -135],
        isPinned: true,
        extraReliefMm: 1.0,
      },
      {
        id: 'radial_styloid',
        name: 'Mỏm trâm quay (Radial styloid)',
        label: 'Cổ tay (Mỏm trâm quay)',
        description: 'Mốc xương nhô bờ ngoài cổ tay',
        position: [27, 0, 0],
        isPinned: true,
        extraReliefMm: 1.5,
      },
      {
        id: 'mcp_joints',
        name: 'Khớp bàn–ngón MCP (Metacarpophalangeal)',
        label: 'Khớp bàn–ngón MCP',
        description: 'Gốc các ngón tay 1–5',
        position: [22, 2, 42],
        isPinned: true,
        extraReliefMm: 1.0,
      },
      {
        id: 'fingertips',
        name: 'Đầu ngón tay (Fingertips)',
        label: 'Đầu ngón tay',
        description: 'Đỉnh xa nhất của bàn tay',
        position: [0, 0, 110],
        isPinned: true,
        extraReliefMm: 0.0,
      },
    ],
    activeLandmarkId: null,

    segments: [
      { id: 'elbow', name: 'Khuỷu tay', isFixed: false, angleDeg: 90 },
      { id: 'forearm', name: 'Cẳng tay', isFixed: true },
      { id: 'wrist', name: 'Cổ tay', isFixed: true, angleDeg: 15 },
      { id: 'hand', name: 'Bàn tay', isFixed: true },
      { id: 'fingers', name: 'Ngón 1–5', isFixed: false },
    ],

    fractureZone: {
      hasZone: true,
      center: [14, -6, -20],
      radiusMm: 24,
      extraReliefMm: 1.5,
    },

    params,

    displayOptions: {
      showHeatmap: false,
      showConfidence: false,
      showScanMesh: true,
      showSplintMesh: true,
      showLandmarks: true,
      showAxes: true,
      showHoles: false,
      splintOpacity: 0.75,
      wireframe: false,
      activeSliceZ: -40,
      measureToolActive: false,
    },

    slices: initialSlices,
    safetyChecks: [
      {
        id: 'min_clearance',
        label: 'Khoảng hở tối thiểu',
        description: 'Khoảng cách giữa da và thành trong nẹp đạt chuẩn y tế (> 2.0 mm)',
        isPassed: true,
        valueString: '2.4 mm',
        thresholdString: '≥ 2.0 mm',
      },
      {
        id: 'no_intersection',
        label: 'Không có điểm xâm thực',
        description: 'Không có điểm quét da nào nằm bên trong vật liệu nẹp',
        isPassed: true,
        valueString: '0 điểm vi phạm',
        thresholdString: '0 điểm',
      },
      {
        id: 'slice_coverage',
        label: 'Độ phủ mặt cắt',
        description: 'Mỗi mặt cắt ngang đạt độ phủ điểm tối thiểu',
        isPassed: true,
        valueString: '88.4% (Tối thiểu)',
        thresholdString: '≥ 85.0%',
      },
      {
        id: 'caliper_match',
        label: 'Đối chiếu số đo thước kẹp',
        description: 'Sai lệch giữa số đo vật lý và mô hình 3D trong giới hạn cho phép',
        isPassed: true,
        valueString: '1.4 mm',
        thresholdString: '≤ 3.0 mm',
      },
      {
        id: 'fillet_rounded',
        label: 'Bo tròn mép nẹp',
        description: 'Mép và vành nẹp đã được vê tròn tránh gây rách và chèn ép da',
        isPassed: true,
        valueString: '3.0 mm',
        thresholdString: '≥ 2.0 mm',
      },
    ],
    overallConfidence: 96.8,

    approval: {
      doctorReviewed: false,
      reviewerName: '',
      reviewDate: '',
      notes: '',
    },

    isProcessing: false,
    processingTask: 'Sẵn sàng',
    processingProgress: 100,
  };
}

export const PRESET_CASES = [
  {
    caseId: 'SF-2026-0842',
    title: 'Ca 1: Gãy đầu dưới xương quay (Colles fracture)',
    description: 'Nẹp cẳng tay - cổ tay chừa ngón tay, giai đoạn cấp tính chừa sưng nề 8mm.',
    handSide: 'right' as const,
    stage: 'acute' as const,
  },
  {
    caseId: 'SF-2026-0843',
    title: 'Ca 2: Viêm bao gân De Quervain / Sau phẫu thuật',
    description: 'Nẹp cố định cổ - bàn - ngón cái, giai đoạn chính thức ôm sát 3mm.',
    handSide: 'left' as const,
    stage: 'definitive' as const,
  },
  {
    caseId: 'SF-2026-0844',
    title: 'Ca 3: Chấn thương khuỷu & Cẳng tay trẻ em',
    description: 'Cố định qua khớp khuỷu 90 độ, vật liệu y tế kháng khuẩn.',
    handSide: 'right' as const,
    stage: 'acute' as const,
  },
];
