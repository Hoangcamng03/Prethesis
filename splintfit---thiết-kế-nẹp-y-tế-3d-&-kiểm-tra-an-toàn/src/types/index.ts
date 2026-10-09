/**
 * SplintFit - Core Types and Data Models
 */

export type HandSide = 'left' | 'right';
export type ClinicalStage = 'acute' | 'definitive'; // Cấp tính | Chính thức
export type UiMode = 'simple' | 'expert'; // Đơn giản | Chuyên gia

export interface Landmark {
  id: string;
  name: string;
  label: string;
  description: string;
  position: [number, number, number] | null; // [x, y, z] mm
  isPinned: boolean;
  extraReliefMm: number; // Chừa thêm ở chỗ xương nhô (mm)
}

export interface ImmobilizationSegment {
  id: string;
  name: string;
  isFixed: boolean; // Cố định (true) or Để tự do (false)
  angleDeg?: number;
}

export interface FractureZone {
  hasZone: boolean;
  center: [number, number, number];
  radiusMm: number;
  extraReliefMm: number; // Chừa thêm vùng gãy (mm)
}

export interface CaliperMeasurements {
  wristCircumference: number; // Chu vi cổ tay (mm)
  forearmCircumference: number; // Chu vi cẳng tay (mm)
  handLength: number; // Chiều dài bàn tay (mm)
}

export interface MeshStats {
  pointCount: number;
  triangleCount: number;
  boundingBox: {
    lengthMm: number; // Chiều dài Z
    widthMm: number;  // Chiều rộng X
    heightMm: number; // Chiều sâu Y
  };
  unit: 'mm' | 'cm' | 'm';
  holeCount: number;
  maxHoleDiameterMm: number;
  hasShowHoles: boolean;
  fillSmallHoles: boolean;
  maxHoleThresholdMm: number;
  scaleMatch: 'pass' | 'divergent' | 'unchecked';
  discrepancyMm: number;
}

export type SplintType = 'single_piece' | 'bivalve'; // Nẹp cố định | Bó bột 2 mảnh
export type SeamPosition = 'dorsal' | 'volar' | 'radial' | 'ulnar'; // Vị trí khe mở
export type SplintMaterial = 'PETG' | 'PLA_Medical' | 'TPU_95A' | 'PA12_Nylon';
export type PrintOrientation = 'vertical' | 'angle_45' | 'horizontal';

export interface SplintDesignParams {
  // Cơ bản
  splintType: SplintType;
  jointExtensionMm: number; // Kéo dài qua khớp (10 - 30 mm)

  // Độ khít
  swellingAllowanceMm: number; // Độ rộng rãi chừa chỗ sưng (1 - 12 mm, cấp >= 5mm)
  paddingThicknessMm: number; // Lớp lót mềm (0 - 4 mm)
  wallThicknessMm: number; // Độ dày thành nẹp (2 - 5 mm)

  // Đóng mở & thoáng
  seamPosition: SeamPosition;
  strapCount: number; // 2 - 5 dây đai
  aerationRatioPercent: number; // Tỷ lệ lỗ thoáng 0 - 40%
  aerationHoleSizeMm: number; // Kích thước lỗ 4 - 8 mm
  woundWindowCount: number; // Cửa sổ xem vết thương
  woundWindowRadiusMm: number;
  edgeFilletRadiusMm: number; // Bo tròn mép (1 - 5 mm)

  // Vật liệu & in
  material: SplintMaterial;
  printOrientation: PrintOrientation;
}

export interface CrossSectionSlice {
  index: number;
  positionZMm: number;
  widthMm: number;
  depthMm: number;
  perimeterMm: number;
  coveragePercent: number;
  confidencePercent: number;
  skinContour: [number, number][]; // 2D points on transverse plane
  splintContour: [number, number][];
  minClearanceMm: number;
  maxClearanceMm: number;
}

export interface SafetyCheckItem {
  id: string;
  label: string;
  description: string;
  isPassed: boolean;
  valueString: string;
  thresholdString: string;
}

export interface ClinicalApproval {
  doctorReviewed: boolean;
  reviewerName: string;
  reviewDate?: string;
  notes?: string;
}

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
}

export interface ProjectState {
  caseId: string;
  patientName: string;
  handSide: HandSide;
  stage: ClinicalStage;
  uiMode: UiMode;
  currentStep: number; // 1 to 5

  // Scan file & metadata
  scanFileName: string;
  meshStats: MeshStats;
  caliperMeasurements: CaliperMeasurements;

  // Landmarks & Segments
  landmarks: Landmark[];
  activeLandmarkId: string | null;
  segments: ImmobilizationSegment[];
  fractureZone: FractureZone;

  // Design parameters
  params: SplintDesignParams;

  // Viewport display states
  displayOptions: {
    showHeatmap: boolean;
    showConfidence: boolean;
    showScanMesh: boolean;
    showSplintMesh: boolean;
    showLandmarks: boolean;
    showAxes: boolean;
    showHoles: boolean;
    splintOpacity: number;
    wireframe: boolean;
    activeSliceZ: number; // mm
    measureToolActive: boolean;
  };

  // Safety Analysis results
  slices: CrossSectionSlice[];
  safetyChecks: SafetyCheckItem[];
  overallConfidence: number; // 0 - 100%

  // Clinical approval
  approval: ClinicalApproval;

  // Background computation state
  isProcessing: boolean;
  processingTask: string;
  processingProgress: number; // 0 - 100
}
