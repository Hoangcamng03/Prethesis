import React from 'react';
import { useProject } from '../../context/ProjectContext';
import {
  Crosshair,
  RotateCcw,
  Trash2,
  Check,
  CircleDot,
  CheckSquare,
  Square,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  Navigation,
} from 'lucide-react';
import { HelpPopover } from '../common/HelpPopover';

export const LandmarksPanel: React.FC = () => {
  const {
    state,
    setActiveLandmark,
    resetLandmark,
    clearAllLandmarks,
    toggleSegmentFixed,
    updateFractureZone,
    toggleDisplayOption,
    nextStep,
    prevStep,
    addToast,
  } = useProject();

  const activeLandmark = state.landmarks.find((l) => l.id === state.activeLandmarkId);

  return (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Panel Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            ② Mốc giải phẫu &amp; Vùng cố định
          </h2>
          <HelpPopover
            title="Mốc giải phẫu & Vùng cố định"
            content="Chấm mốc giải phẫu xương giúp phần mềm định vị chính xác hình học chi và mở rộng relief ở các điểm xương nhô để tránh loét tỳ đè."
          />
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Ghim mốc xương nhô, chọn các đoạn cố định và vùng ổ gãy
        </p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Interactive Guided Landmarking Card */}
        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#0F6CBD] flex items-center gap-1.5">
              <Crosshair className="w-4 h-4" />
              Hướng dẫn chấm mốc giải phẫu
            </span>
            <span className="text-[11px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-blue-100">
              {state.landmarks.filter((l) => l.isPinned).length}/{state.landmarks.length} Đã ghim
            </span>
          </div>

          <div className="bg-white rounded-lg p-2.5 border border-blue-100 text-xs">
            {activeLandmark ? (
              <div className="space-y-1">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5 text-amber-700">
                  <CircleDot className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                  Đang chọn: {activeLandmark.label}
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  👉 Bấm trực tiếp lên bề mặt mô hình 3D để ghim điểm{' '}
                  <strong>{activeLandmark.label}</strong> ({activeLandmark.description}).
                </p>
              </div>
            ) : (
              <p className="text-slate-600 text-xs">
                Chọn một mốc dưới danh sách để ghim hoặc di chuyển điểm trên mô hình 3D.
              </p>
            )}
          </div>
        </div>

        {/* Landmarks List */}
        <div className="border border-slate-200 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">Danh sách mốc giải phẫu</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={clearAllLandmarks}
                className="text-[11px] font-medium text-red-600 hover:text-red-700 p-1 flex items-center gap-1"
                title="Xoá tất cả mốc"
              >
                <Trash2 className="w-3 h-3" />
                Xoá tất cả
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            {state.landmarks.map((lmk) => {
              const isSelected = state.activeLandmarkId === lmk.id;

              return (
                <div
                  key={lmk.id}
                  className={`p-2 rounded-lg border text-xs transition-all ${
                    isSelected
                      ? 'border-[#0F6CBD] bg-blue-50/50 shadow-2xs'
                      : lmk.isPinned
                      ? 'border-slate-200 bg-white hover:border-slate-300'
                      : 'border-dashed border-slate-300 bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveLandmark(isSelected ? null : lmk.id)
                      }
                      className="flex items-center gap-2 text-left font-medium text-slate-800 flex-1"
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 text-[10px] ${
                          lmk.isPinned
                            ? 'bg-[#2E7D32] text-white'
                            : 'bg-slate-300 text-slate-600'
                        }`}
                      >
                        {lmk.isPinned ? '✓' : '•'}
                      </div>
                      <span className={isSelected ? 'font-bold text-[#0F6CBD]' : ''}>
                        {lmk.label}
                      </span>
                    </button>

                    <div className="flex items-center gap-1">
                      {lmk.isPinned ? (
                        <button
                          type="button"
                          onClick={() => resetLandmark(lmk.id)}
                          className="px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded"
                        >
                          Chấm lại
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActiveLandmark(lmk.id)}
                          className="px-2 py-0.5 text-[11px] font-semibold text-[#0F6CBD] bg-blue-100/70 hover:bg-blue-100 rounded"
                        >
                          Ghim ngay
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Position Coordinates display */}
                  {lmk.position && (
                    <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between pl-5 font-mono tabular-nums">
                      <span>
                        [{lmk.position[0]}, {lmk.position[1]}, {lmk.position[2]}] mm
                      </span>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1 rounded">
                        +{lmk.extraReliefMm}mm chừa xương nhô
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Immobilization Segments Tree */}
        <div className="border border-slate-200 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              Đoạn giải phẫu cần cố định
            </span>
            <HelpPopover
              title="Phạm vi cố định"
              content="Chọn các vùng xương và khớp cần được bất động. Đoạn được tick 'Cố định' sẽ được bao bọc bởi nẹp; đoạn 'Để tự do' sẽ được cắt mở để cử động tự do."
            />
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg text-xs overflow-hidden">
            {state.segments.map((seg) => (
              <div
                key={seg.id}
                onClick={() => toggleSegmentFixed(seg.id)}
                className={`flex items-center justify-between p-2.5 cursor-pointer hover:bg-slate-50 transition-colors ${
                  seg.isFixed ? 'bg-white' : 'bg-slate-50/70 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  {seg.isFixed ? (
                    <CheckSquare className="w-4 h-4 text-[#0F6CBD]" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  <span className={`font-medium ${seg.isFixed ? 'text-slate-800' : 'text-slate-400'}`}>
                    {seg.name}
                  </span>
                </div>

                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                    seg.isFixed
                      ? 'bg-blue-50 text-[#0F6CBD]'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {seg.isFixed ? 'Cố định' : 'Để tự do'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Fracture Zone Marking */}
        <div className="border border-slate-200 rounded-lg p-3 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              Vùng ổ gãy &amp; Tổn thương mô mềm
            </span>
            <HelpPopover
              title="Chừa thêm vùng ổ gãy"
              content="Khu vực tổn thương xương hoặc vết thương hở cần được chừa thêm khoảng hở để tránh áp lực cục bộ và hạn chế đau đớn."
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                updateFractureZone({ hasZone: !state.fractureZone.hasZone })
              }
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition-colors ${
                state.fractureZone.hasZone
                  ? 'bg-amber-500 text-white border-amber-600'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <CircleDot className="w-3.5 h-3.5" />
              {state.fractureZone.hasZone ? 'Đã đánh dấu vùng gãy' : 'Đánh dấu vùng gãy'}
            </button>

            {state.fractureZone.hasZone && (
              <span className="text-[11px] text-amber-700 font-medium">
                Bán kính: {state.fractureZone.radiusMm} mm
              </span>
            )}
          </div>

          {state.fractureZone.hasZone && (
            <div className="bg-[#F6F8FA] p-2.5 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Khoảng chừa thêm tại ổ gãy:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="5"
                    value={state.fractureZone.extraReliefMm}
                    onChange={(e) =>
                      updateFractureZone({
                        extraReliefMm: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-16 px-1.5 py-0.5 text-right border border-slate-300 rounded font-semibold text-xs tabular-nums"
                  />
                  <span className="text-slate-500">mm</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                Vòng cam nổi trên mô hình 3D biểu thị vị trí ổ gãy được tạo khoảng hở riêng.
              </p>
            </div>
          )}
        </div>

        {/* Display Axes & Alignment */}
        <div className="border border-slate-200 rounded-lg p-3 text-xs flex items-center justify-between">
          <div>
            <span className="font-bold text-slate-800 block">Hiển thị trục chi giải phẫu</span>
            <span className="text-[11px] text-slate-500">
              Đường nét đứt màu xanh dọc trục cẳng tay và cổ tay
            </span>
          </div>
          <button
            type="button"
            onClick={() => toggleDisplayOption('showAxes')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              state.displayOptions.showAxes
                ? 'bg-[#2E7D32] text-white border-emerald-700'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            {state.displayOptions.showAxes ? 'Đang hiện' : 'Ẩn trục'}
          </button>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="p-3 border-t border-slate-200 flex items-center justify-between bg-[#F6F8FA]">
        <button
          type="button"
          onClick={prevStep}
          className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Bước ①</span>
        </button>

        <button
          type="button"
          onClick={nextStep}
          className="px-4 py-2 text-xs font-semibold text-white bg-[#0F6CBD] hover:bg-[#0c589c] rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
        >
          <span>Tiếp tục sang Thiết kế nẹp ③</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
