import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Flame,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Sliders,
  Maximize2,
} from 'lucide-react';
import { HelpPopover } from '../common/HelpPopover';

export const SafetyPanel: React.FC = () => {
  const {
    state,
    toggleDisplayOption,
    setActiveSliceZ,
    nextStep,
    prevStep,
    addToast,
  } = useProject();

  const { slices, safetyChecks, displayOptions } = state;

  // Selected slice for detailed 2D visualization
  const activeSlice =
    slices.find((s) => Math.abs(s.positionZMm - displayOptions.activeSliceZ) < 8) ||
    slices[4];

  const allPassed = safetyChecks.every((c) => c.isPassed);

  return (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            ④ Kiểm tra an toàn y khoa
          </h2>
          <HelpPopover
            title="Kiểm tra an toàn lâm sàng"
            content="Phân tích bản đồ nhiệt độ hở da-nẹp, phân tích mặt cắt ngang 2D và kiểm tra 5 tiêu chuẩn an toàn bắt buộc trước khi xuất chế tạo."
          />
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Bản đồ nhiệt khoảng hở, mặt cắt 2D và danh sách tiêu chuẩn Đạt / Chưa đạt
        </p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Heatmap & Confidence Toggles */}
        <div className="border border-slate-200 rounded-lg p-3 space-y-2.5 text-xs bg-[#F6F8FA]">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800">Hiển thị trực quan 3D</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleDisplayOption('showHeatmap')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  displayOptions.showHeatmap
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                Bản đồ nhiệt
              </button>

              <button
                type="button"
                onClick={() => toggleDisplayOption('showConfidence')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  displayOptions.showConfidence
                    ? 'bg-[#0F6CBD] text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Lớp tin cậy
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 leading-snug">
            Màu bản đồ nhiệt: Đỏ (&lt;1.5mm - Chèn ép), Xanh lá (2-8mm - Đạt tiêu chuẩn), Xanh dương (&gt;11mm - Quá rộng).
          </div>
        </div>

        {/* 2D Cross-Section Viewer (PyQtGraph equivalent) */}
        <div className="border border-slate-200 rounded-lg p-3 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800">
              Mặt cắt ngang 2D tại Z = {displayOptions.activeSliceZ} mm
            </span>
            <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold">
              Khoảng hở: {activeSlice.minClearanceMm} mm (Đạt)
            </span>
          </div>

          {/* Slider for Cross-Section Position */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-[11px]">
              <span>Khuỷu tay (-140 mm)</span>
              <span className="font-semibold text-slate-800">
                Vị trí cắt: {displayOptions.activeSliceZ} mm
              </span>
              <span>Bàn tay (+45 mm)</span>
            </div>
            <input
              type="range"
              min={-140}
              max={45}
              step={5}
              value={displayOptions.activeSliceZ}
              onChange={(e) => setActiveSliceZ(parseInt(e.target.value))}
              className="w-full accent-[#0F6CBD] cursor-pointer"
            />
          </div>

          {/* High-Precision 2D SVG Cross-Section Graph */}
          <div className="relative w-full h-44 bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center p-2">
            <svg viewBox="-80 -80 160 160" className="w-full h-full max-h-40">
              {/* Grid axes */}
              <line x1="-75" y1="0" x2="75" y2="0" stroke="#334155" strokeWidth="0.8" strokeDasharray="3,3" />
              <line x1="0" y1="-75" x2="0" y2="75" stroke="#334155" strokeWidth="0.8" strokeDasharray="3,3" />

              {/* Splint Contour (Outer layer) */}
              <polygon
                points={activeSlice.splintContour.map((p) => `${p[0]},${p[1]}`).join(' ')}
                fill="rgba(15, 108, 189, 0.25)"
                stroke="#38bdf8"
                strokeWidth="1.8"
              />

              {/* Skin Contour (Inner arm) */}
              <polygon
                points={activeSlice.skinContour.map((p) => `${p[0]},${p[1]}`).join(' ')}
                fill="#deb89a"
                stroke="#f97316"
                strokeWidth="1.5"
              />

              {/* Dimension ticks */}
              <text x="5" y="-60" fill="#94a3b8" fontSize="6" fontFamily="sans-serif">
                Đường nẹp ngoài
              </text>
              <text x="5" y="-2" fill="#fdba74" fontSize="6" fontFamily="sans-serif">
                Bề mặt da quét
              </text>
            </svg>

            {/* Quick stats overlay in graph */}
            <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-xs text-white p-1 rounded text-[10px] space-y-0.5 tabular-nums">
              <div>Rộng: {activeSlice.widthMm} mm · Sâu: {activeSlice.depthMm} mm</div>
              <div>Độ phủ điểm: {activeSlice.coveragePercent}%</div>
            </div>
          </div>
        </div>

        {/* Cross-Section Table (Bảng mặt cắt) */}
        <div className="border border-slate-200 rounded-lg p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800">Bảng phân tích các mặt cắt</span>
            <span className="text-[11px] text-slate-500">Bấm dòng để nhảy tới vị trí 3D</span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F6F8FA] border-b border-slate-200 text-slate-700 font-semibold">
                <tr>
                  <th className="py-2 px-2.5">Vị trí Z</th>
                  <th className="py-2 px-2">Rộng</th>
                  <th className="py-2 px-2">Sâu</th>
                  <th className="py-2 px-2">Chu vi</th>
                  <th className="py-2 px-2">Độ phủ</th>
                  <th className="py-2 px-2">Độ tin cậy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {slices.map((slice) => {
                  const isCurrent =
                    Math.abs(slice.positionZMm - displayOptions.activeSliceZ) < 8;
                  return (
                    <tr
                      key={slice.index}
                      onClick={() => setActiveSliceZ(slice.positionZMm)}
                      className={`cursor-pointer transition-colors ${
                        isCurrent
                          ? 'bg-blue-50 font-semibold text-[#0F6CBD]'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <td className="py-1.5 px-2.5">{slice.positionZMm} mm</td>
                      <td className="py-1.5 px-2">{slice.widthMm} mm</td>
                      <td className="py-1.5 px-2">{slice.depthMm} mm</td>
                      <td className="py-1.5 px-2">{slice.perimeterMm} mm</td>
                      <td className="py-1.5 px-2">{slice.coveragePercent}%</td>
                      <td className="py-1.5 px-2 text-emerald-700">
                        {slice.confidencePercent}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Safety Checklist (Danh sách kiểm tra Đạt / Chưa đạt) */}
        <div className="border border-slate-200 rounded-lg p-3 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#0F6CBD]" />
              Tiêu chuẩn an toàn y khoa (5 tiêu chí bắt buộc)
            </span>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                allPassed
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {allPassed ? 'Đủ điều kiện xuất CAD' : 'Cần khắc phục'}
            </span>
          </div>

          <div className="space-y-2">
            {safetyChecks.map((item) => (
              <div
                key={item.id}
                className={`p-2.5 rounded-lg border flex items-start gap-2.5 transition-colors ${
                  item.isPassed
                    ? 'border-emerald-200 bg-emerald-50/40'
                    : 'border-red-300 bg-red-50/60'
                }`}
              >
                {item.isPassed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{item.label}</span>
                    <span
                      className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                        item.isPassed
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {item.isPassed ? 'ĐẠT' : 'CHƯA ĐẠT'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                    {item.description}
                  </p>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1 tabular-nums">
                    <span>Thực tế: <strong>{item.valueString}</strong></span>
                    <span>Ngưỡng chuẩn: <strong>{item.thresholdString}</strong></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Nav */}
      <div className="p-3 border-t border-slate-200 flex items-center justify-between bg-[#F6F8FA]">
        <button
          type="button"
          onClick={prevStep}
          className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Bước ③</span>
        </button>

        <button
          type="button"
          onClick={nextStep}
          disabled={!allPassed}
          className={`px-4 py-2 text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors ${
            allPassed
              ? 'bg-[#0F6CBD] hover:bg-[#0c589c] text-white'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <span>Tiếp tục Xuất sang Fusion 360 ⑤</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
