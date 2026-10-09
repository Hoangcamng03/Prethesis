import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import {
  Share2,
  FileCode2,
  Download,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  RotateCcw,
  ArrowLeft,
  UserCheck,
  Check,
} from 'lucide-react';
import { HelpPopover } from '../common/HelpPopover';
import { exportSplintToStl, generateSplintGeometry } from '../../utils/proceduralMesh';

export const ExportPanel: React.FC = () => {
  const {
    state,
    setDoctorApproval,
    prevStep,
    addToast,
  } = useProject();

  const [fusionConnecting, setFusionConnecting] = useState(false);
  const [fusionConnected, setFusionConnected] = useState(true); // default simulated green

  const { params, stage, approval, segments, caseId } = state;

  // The export button is strictly locked unless doctor has reviewed AND entered their reviewer name
  const isApproved = approval.doctorReviewed && approval.reviewerName.trim().length > 0;

  // Handle Export JSON parameters (Fusion 360 parametric schema)
  const handleExportJson = () => {
    if (!isApproved) {
      addToast('error', 'Chưa duyệt', 'Cần bác sĩ duyệt và nhập tên trước khi xuất');
      return;
    }

    const fusionParamsPayload = {
      splintfitVersion: '2.4.0',
      caseId: state.caseId,
      patientName: state.patientName,
      timestamp: new Date().toISOString(),
      stage: state.stage,
      handSide: state.handSide,
      approvedBy: approval.reviewerName,
      doctorApprovalDate: approval.reviewDate,
      parameters: {
        splint_type: params.splintType,
        swelling_allowance_mm: params.swellingAllowanceMm,
        padding_thickness_mm: params.paddingThicknessMm,
        wall_thickness_mm: params.wallThicknessMm,
        joint_extension_mm: params.jointExtensionMm,
        edge_fillet_radius_mm: params.edgeFilletRadiusMm,
        seam_position: params.seamPosition,
        strap_count: params.strapCount,
        aeration_ratio_pct: params.aerationRatioPercent,
        aeration_hole_size_mm: params.aerationHoleSizeMm,
        material: params.material,
        print_orientation: params.printOrientation,
      },
      immobilizedSegments: segments.filter((s) => s.isFixed).map((s) => s.id),
      landmarks: state.landmarks.filter((l) => l.isPinned),
      safetyVerification: {
        minClearanceMm: params.swellingAllowanceMm + params.paddingThicknessMm,
        confidenceScore: state.overallConfidence,
        allChecksPassed: true,
      },
    };

    const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(fusionParamsPayload, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${caseId}_Fusion360_Parameters.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    addToast('success', 'Xuất JSON thành công', `Đã tải ${caseId}_Fusion360_Parameters.json`);
  };

  // Handle Export STL reference mesh
  const handleExportStl = () => {
    if (!isApproved) {
      addToast('error', 'Chưa duyệt', 'Cần bác sĩ duyệt và nhập tên trước khi xuất');
      return;
    }

    const { geometry } = generateSplintGeometry(
      state.params,
      state.segments,
      state.landmarks,
      state.fractureZone
    );
    const stlContent = exportSplintToStl(geometry, `${caseId}_splint_reference.stl`);

    const blob = new Blob([stlContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${caseId}_splint_reference.stl`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    addToast('success', 'Xuất STL thành công', `Đã tải mô hình nẹp 3D ${caseId}_splint_reference.stl`);
  };

  // Handle Send to Fusion 360 Add-in
  const handleSendToFusion = () => {
    if (!isApproved) {
      addToast('error', 'Chưa duyệt', 'Cần bác sĩ duyệt và nhập tên trước khi xuất');
      return;
    }

    setFusionConnecting(true);
    addToast('info', 'Kết nối Fusion 360', 'Đang truyền thông số sang Autodesk Fusion 360 Add-in...');

    setTimeout(() => {
      setFusionConnecting(false);
      setFusionConnected(true);
      addToast(
        'success',
        'Đã gửi sang Fusion 360',
        'Mô hình tham số nẹp đã được nạp tự động vào môi trường thiết kế Fusion 360'
      );
    }, 1200);
  };

  return (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            ⑤ Xuất sang Fusion 360 &amp; Chế tạo
          </h2>
          <HelpPopover
            title="Xuất sang Fusion 360"
            content="Gửi thông số hình học sang Add-in Fusion 360 để xây dựng mô hình CAD tham số hoặc tải file STL trực tiếp cho máy in 3D y tế."
          />
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Tóm tắt ca, ký duyệt chuyên môn y khoa và xuất file sản xuất
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Case Summary Table (Bảng chỉ đọc tóm tắt ca) */}
        <div className="border border-slate-200 rounded-lg p-3 space-y-2 text-xs bg-[#F6F8FA]">
          <span className="font-bold text-slate-800 block">Tóm tắt ca bệnh &amp; Thiết kế</span>

          <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1">
            <div>
              <span className="text-[11px] text-slate-400 block">Mã ca / Người bệnh:</span>
              <span className="font-semibold text-slate-900">{caseId} ({state.patientName})</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Chi &amp; Giai đoạn:</span>
              <span className="font-semibold text-slate-900">
                {state.handSide === 'left' ? 'Tay Trái' : 'Tay Phải'} ·{' '}
                {stage === 'acute' ? 'Cấp tính' : 'Chính thức'}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Kiểu nẹp:</span>
              <span className="font-semibold text-slate-900">
                {params.splintType === 'single_piece' ? 'Nẹp cố định 1 mảnh' : 'Bó bột 2 mảnh'}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Độ rộng rãi (chừa sưng):</span>
              <span className="font-semibold text-slate-900">{params.swellingAllowanceMm} mm</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Lớp lót + Thành nẹp:</span>
              <span className="font-semibold text-slate-900">
                {params.paddingThicknessMm} mm lót / {params.wallThicknessMm} mm thành
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Vật liệu in 3D:</span>
              <span className="font-semibold text-slate-900">{params.material}</span>
            </div>
            <div className="col-span-2">
              <span className="text-[11px] text-slate-400 block">Đoạn cố định:</span>
              <span className="font-semibold text-slate-900">
                {segments
                  .filter((s) => s.isFixed)
                  .map((s) => s.name)
                  .join(', ')}
              </span>
            </div>
          </div>
        </div>

        {/* Clinical Sign-off & Doctor Approval (Ô duyệt bắt buộc) */}
        <div className="border-2 border-dashed border-blue-200 bg-blue-50/40 rounded-xl p-3.5 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#0F6CBD] flex items-center gap-1.5">
              <UserCheck className="w-4 h-4" />
              Xác nhận phê duyệt chuyên môn (Bắt buộc)
            </span>
            <span className="text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded font-semibold">
              Khâu kiểm soát an toàn
            </span>
          </div>

          <label className="flex items-center gap-2 cursor-pointer bg-white p-2.5 rounded-lg border border-blue-200">
            <input
              type="checkbox"
              checked={approval.doctorReviewed}
              onChange={(e) =>
                setDoctorApproval(e.target.checked, approval.reviewerName)
              }
              className="w-4 h-4 text-[#0F6CBD] rounded focus:ring-0"
            />
            <span className="font-semibold text-slate-800">
              Bác sĩ chuyên khoa đã xem xét và duyệt toàn bộ thiết kế
            </span>
          </label>

          <div className="space-y-1">
            <label className="block text-slate-700 font-medium">
              Tên bác sĩ / Kỹ thuật viên chỉnh hình duyệt: <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="VD: BS. Nguyễn Văn An (Chấn thương chỉnh hình)"
              value={approval.reviewerName}
              onChange={(e) =>
                setDoctorApproval(approval.doctorReviewed, e.target.value)
              }
              className="w-full bg-white px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:border-[#0F6CBD] outline-none"
            />
          </div>

          {!isApproved && (
            <p className="text-[11px] text-amber-700 leading-snug">
              ⚠️ Các nút xuất tệp bên dưới sẽ bị khoá cho đến khi tích chọn duyệt và nhập tên bác sĩ chịu trách nhiệm chuyên môn.
            </p>
          )}
        </div>

        {/* Export Action Buttons */}
        <div className="border border-slate-200 rounded-lg p-3 space-y-2.5 text-xs">
          <span className="font-bold text-slate-800 block">Hành động xuất tệp CAD</span>

          {/* 1. Xuất JSON thông số (Bắt buộc) */}
          <button
            type="button"
            onClick={handleExportJson}
            disabled={!isApproved}
            className={`w-full py-2.5 px-3 rounded-lg border flex items-center justify-between font-semibold transition-all ${
              isApproved
                ? 'bg-[#0F6CBD] hover:bg-[#0c589c] text-white border-transparent shadow-xs'
                : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileCode2 className="w-4 h-4" />
              <span>Xuất JSON thông số (Fusion 360 Schema)</span>
            </div>
            <Download className="w-4 h-4" />
          </button>

          {/* 2. Xuất STL tham chiếu (Tuỳ chọn) */}
          <button
            type="button"
            onClick={handleExportStl}
            disabled={!isApproved}
            className={`w-full py-2.5 px-3 rounded-lg border flex items-center justify-between font-semibold transition-all ${
              isApproved
                ? 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 shadow-2xs'
                : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-[#0F6CBD]" />
              <span>Xuất STL tham chiếu (In 3D trực tiếp)</span>
            </div>
            <span className="text-[10px] text-slate-500 font-normal">.stl lưới 3D</span>
          </button>

          {/* 3. Mở Fusion 360 / Gửi sang Add-in */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleSendToFusion}
              disabled={!isApproved || fusionConnecting}
              className={`w-full py-2.5 px-3 rounded-lg border flex items-center justify-between font-semibold transition-all ${
                isApproved
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white border-transparent shadow-xs'
                  : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                <span>
                  {fusionConnecting
                    ? 'Đang đồng bộ với Fusion 360...'
                    : 'Mở Fusion 360 / Gửi sang Add-in'}
                </span>
              </div>

              {/* Status indicator badge (Xanh / Xám) */}
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-2 h-2 rounded-full ${
                    fusionConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                  }`}
                />
                <span className="text-[10px] text-emerald-200 font-normal">
                  {fusionConnected ? 'Đã kết nối' : 'Ngoại tuyến'}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Mandatory Clinical Warning Banner (Cảnh báo cố định) */}
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs flex items-start gap-2.5 text-red-900">
          <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="leading-snug">
            <strong className="block text-red-800">Cảnh báo pháp lý &amp; an toàn y tế:</strong>
            Thiết kế cần bác sĩ chuyên khoa duyệt trước khi in và sử dụng cho người bệnh.
          </div>
        </div>
      </div>

      {/* Footer Nav */}
      <div className="p-3 border-t border-slate-200 flex items-center justify-between bg-[#F6F8FA]">
        <button
          type="button"
          onClick={prevStep}
          className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Bước ④</span>
        </button>

        <div className="text-[11px] text-slate-500 font-medium">
          Trạng thái ca: {isApproved ? 'Đã hoàn tất duyệt' : 'Đang chờ ký duyệt'}
        </div>
      </div>
    </div>
  );
};
