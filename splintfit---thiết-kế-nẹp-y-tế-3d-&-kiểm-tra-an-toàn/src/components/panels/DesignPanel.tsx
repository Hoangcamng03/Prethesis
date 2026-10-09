import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import {
  Sliders,
  Layers,
  Wind,
  Printer,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import { HelpPopover } from '../common/HelpPopover';
import { SeamPosition, SplintMaterial, SplintType } from '../../types';

export const DesignPanel: React.FC = () => {
  const {
    state,
    updateParams,
    resetParamsToStageDefault,
    updateLandmarkRelief,
    nextStep,
    prevStep,
    addToast,
  } = useProject();

  const [activeTab, setActiveTab] = useState<'basic' | 'fit' | 'aeration' | 'material'>('basic');

  const { params, stage, uiMode } = state;

  // Hard limit check for Acute mode: swelling allowance cannot be < 5.0 mm
  const isAcuteHardLimitViolated = stage === 'acute' && params.swellingAllowanceMm < 5.0;

  // Simple Mode Controls
  if (uiMode === 'simple') {
    return (
      <div className="flex flex-col h-full bg-white select-none">
        {/* Header */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">③ Thiết kế nẹp (Chế độ Đơn giản)</h2>
            <HelpPopover
              title="Chế độ Đơn giản"
              content="Dành cho kỹ thuật viên điều chỉnh nhanh với 4 lựa chọn trọng tâm. Các thông số kỹ thuật chi tiết được tự động tính toán tối ưu theo giai đoạn."
            />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cấu hình nhanh kiểu dáng và mức độ ôm sát của nẹp
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* 1. Kiểu nẹp */}
          <div className="border border-slate-200 rounded-lg p-3 space-y-2 text-xs">
            <span className="font-bold text-slate-800 block">1. Kiểu nẹp</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateParams({ splintType: 'single_piece' })}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  params.splintType === 'single_piece'
                    ? 'border-[#0F6CBD] bg-blue-50/70 font-semibold text-[#0F6CBD]'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-bold text-xs">Nẹp cố định</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Một mảnh có khe mở</div>
              </button>

              <button
                type="button"
                onClick={() => updateParams({ splintType: 'bivalve' })}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  params.splintType === 'bivalve'
                    ? 'border-[#0F6CBD] bg-blue-50/70 font-semibold text-[#0F6CBD]'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-bold text-xs">Bó bột 2 mảnh</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Hai mảnh vỏ ghép đối xứng</div>
              </button>
            </div>
          </div>

          {/* 2. Đoạn cố định summary */}
          <div className="border border-slate-200 rounded-lg p-3 text-xs space-y-1">
            <span className="font-bold text-slate-800 block">2. Phạm vi cố định</span>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {state.segments
                .filter((s) => s.isFixed)
                .map((s) => (
                  <span
                    key={s.id}
                    className="bg-blue-50 text-[#0F6CBD] border border-blue-200 px-2 py-0.5 rounded text-[11px] font-semibold"
                  >
                    {s.name}
                  </span>
                ))}
            </div>
          </div>

          {/* 3. Độ rộng rãi (Chặt - Vừa - Rộng) */}
          <div className="border border-slate-200 rounded-lg p-3 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">3. Độ rộng rãi (Độ khít)</span>
              <span className="text-[11px] text-slate-500 font-medium">
                Khoảng hở: {params.swellingAllowanceMm} mm
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  if (stage === 'acute') {
                    addToast('warning', 'Giới hạn an toàn', 'Giai đoạn cấp không nên chọn nẹp quá chặt (tối thiểu 5 mm)');
                    updateParams({ swellingAllowanceMm: 5 });
                  } else {
                    updateParams({ swellingAllowanceMm: 2 });
                  }
                }}
                className={`py-2 rounded-lg border text-center font-semibold transition-all ${
                  params.swellingAllowanceMm <= 3
                    ? 'border-[#0F6CBD] bg-blue-50 text-[#0F6CBD]'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                Chặt (Ôm sát)
              </button>

              <button
                type="button"
                onClick={() => updateParams({ swellingAllowanceMm: stage === 'acute' ? 7 : 4 })}
                className={`py-2 rounded-lg border text-center font-semibold transition-all ${
                  params.swellingAllowanceMm > 3 && params.swellingAllowanceMm <= 7
                    ? 'border-[#0F6CBD] bg-blue-50 text-[#0F6CBD]'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                Vừa vặn
              </button>

              <button
                type="button"
                onClick={() => updateParams({ swellingAllowanceMm: stage === 'acute' ? 9 : 8 })}
                className={`py-2 rounded-lg border text-center font-semibold transition-all ${
                  params.swellingAllowanceMm > 7
                    ? 'border-[#0F6CBD] bg-blue-50 text-[#0F6CBD]'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                Rộng rãi (Chống sưng)
              </button>
            </div>
          </div>

          {/* 4. Độ thoáng */}
          <div className="border border-slate-200 rounded-lg p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">4. Độ thoáng khí</span>
              <span className="font-semibold text-[#0F6CBD]">
                {params.aerationRatioPercent}% diện tích
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={40}
              step={5}
              value={params.aerationRatioPercent}
              onChange={(e) =>
                updateParams({ aerationRatioPercent: parseInt(e.target.value) })
              }
              className="w-full accent-[#0F6CBD] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Đặc hoàn toàn (0%)</span>
              <span>Tiêu chuẩn (25%)</span>
              <span>Rất thoáng (40%)</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 flex items-center justify-between bg-[#F6F8FA]">
          <button
            type="button"
            onClick={resetParamsToStageDefault}
            className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Đặt lại
          </button>
          <button
            type="button"
            onClick={nextStep}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#0F6CBD] hover:bg-[#0c589c] rounded-lg shadow-xs flex items-center gap-1.5"
          >
            <span>Tiếp tục Kiểm tra an toàn ④</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Expert Mode Controls (QTabWidget with 4 tabs)
  return (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">③ Thiết kế nẹp (Chuyên gia)</h2>
          <HelpPopover
            title="Thiết kế nẹp y khoa"
            content="Mọi thông số được kiểm soát chính xác bằng mm. Xem trước 3D được tự động tính toán lại sau 150 ms debounce."
          />
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Tuỳ chỉnh 4 nhóm tham số: Cơ bản, Độ khít, Đóng mở &amp; thoáng, Vật liệu
        </p>
      </div>

      {/* 4 Tabs Header */}
      <div className="flex border-b border-slate-200 bg-[#F6F8FA] px-2 pt-1 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('basic')}
          className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-t border-x ${
            activeTab === 'basic'
              ? 'bg-white border-slate-200 border-b-transparent text-[#0F6CBD]'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Cơ bản
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('fit')}
          className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-t border-x ${
            activeTab === 'fit'
              ? 'bg-white border-slate-200 border-b-transparent text-[#0F6CBD]'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Độ khít
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('aeration')}
          className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-t border-x ${
            activeTab === 'aeration'
              ? 'bg-white border-slate-200 border-b-transparent text-[#0F6CBD]'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Đóng mở &amp; Thoáng
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('material')}
          className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-t border-x ${
            activeTab === 'material'
              ? 'bg-white border-slate-200 border-b-transparent text-[#0F6CBD]'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Vật liệu &amp; In
        </button>
      </div>

      {/* Tab Content Panels */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Tab 1: Cơ bản */}
        {activeTab === 'basic' && (
          <div className="space-y-4 text-xs">
            {/* Kiểu nẹp */}
            <div className="border border-slate-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Kiểu nẹp</span>
                <HelpPopover
                  title="Kiểu nẹp cố định vs Bó bột 2 mảnh"
                  content="Nẹp cố định 1 mảnh thuận tiện tháo lắp hàng ngày bằng đai Velcro. Bó bột 2 mảnh ôm trọn chi thích hợp gãy xương không vững cần cố định tuyệt đối."
                />
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-slate-200 hover:bg-slate-50">
                  <input
                    type="radio"
                    name="splintType"
                    checked={params.splintType === 'single_piece'}
                    onChange={() => updateParams({ splintType: 'single_piece' })}
                    className="text-[#0F6CBD] focus:ring-0"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 block">Nẹp cố định (1 mảnh)</span>
                    <span className="text-[11px] text-slate-500">Khe mở linh hoạt, đai dán tiện lợi</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-slate-200 hover:bg-slate-50">
                  <input
                    type="radio"
                    name="splintType"
                    checked={params.splintType === 'bivalve'}
                    onChange={() => updateParams({ splintType: 'bivalve' })}
                    className="text-[#0F6CBD] focus:ring-0"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 block">Bó bột 2 mảnh (Bivalve shell)</span>
                    <span className="text-[11px] text-slate-500">2 nửa vỏ đối xứng kẹp chặt xương</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Kéo dài qua khớp */}
            <div className="border border-slate-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Kéo dài qua khớp (mm)</span>
                <span className="font-semibold text-[#0F6CBD] tabular-nums">
                  {params.jointExtensionMm} mm
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={30}
                step={1}
                value={params.jointExtensionMm}
                onChange={(e) => updateParams({ jointExtensionMm: parseInt(e.target.value) })}
                className="w-full accent-[#0F6CBD] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>10 mm (Gọn)</span>
                <span>20 mm (Tiêu chuẩn)</span>
                <span>30 mm (Bảo vệ tối đa)</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Độ khít */}
        {activeTab === 'fit' && (
          <div className="space-y-4 text-xs">
            {/* Độ rộng rãi chừa chỗ sưng */}
            <div
              className={`border rounded-lg p-3 space-y-2 transition-colors ${
                isAcuteHardLimitViolated
                  ? 'border-red-400 bg-red-50/40'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">
                  Độ rộng rãi (chừa chỗ sưng)
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={12}
                    step={0.5}
                    value={params.swellingAllowanceMm}
                    onChange={(e) =>
                      updateParams({
                        swellingAllowanceMm: parseFloat(e.target.value) || 1,
                      })
                    }
                    className={`w-16 px-1.5 py-0.5 text-right border rounded font-semibold tabular-nums text-xs ${
                      isAcuteHardLimitViolated
                        ? 'border-red-500 text-red-700 bg-white'
                        : 'border-slate-200'
                    }`}
                  />
                  <span className="text-slate-500">mm</span>
                </div>
              </div>

              <input
                type="range"
                min={1}
                max={12}
                step={0.5}
                value={params.swellingAllowanceMm}
                onChange={(e) =>
                  updateParams({ swellingAllowanceMm: parseFloat(e.target.value) })
                }
                className="w-full accent-[#0F6CBD] cursor-pointer"
              />

              <div className="flex justify-between text-[10px] text-slate-400">
                <span>1 mm</span>
                <span>Gợi ý: Cấp (8mm) / Chính thức (3mm)</span>
                <span>12 mm</span>
              </div>

              {/* Hard limit warning message */}
              {isAcuteHardLimitViolated && (
                <div className="p-2 rounded bg-red-100 border border-red-300 text-red-800 text-[11px] flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                  <div>
                    <strong>Cảnh báo an toàn y khoa:</strong> Ở giai đoạn Cấp tính,
                    mô mềm có nguy cơ sưng nề nhanh. Khoảng rộng rãi bắt buộc tối thiểu{' '}
                    <strong>≥ 5.0 mm</strong> để phòng ngừa hoại tử và hội chứng chèn ép khoang!
                  </div>
                </div>
              )}
            </div>

            {/* Lớp lót mềm */}
            <div className="border border-slate-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Lớp lót mềm (xốp / mút eva)</span>
                <span className="font-semibold text-[#0F6CBD] tabular-nums">
                  {params.paddingThicknessMm} mm
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={4}
                step={0.5}
                value={params.paddingThicknessMm}
                onChange={(e) =>
                  updateParams({ paddingThicknessMm: parseFloat(e.target.value) })
                }
                className="w-full accent-[#0F6CBD] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>0 mm (Không lót)</span>
                <span>2 mm (Mỏng)</span>
                <span>4 mm (Lót dày)</span>
              </div>
            </div>

            {/* Độ dày thành nẹp */}
            <div className="border border-slate-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Độ dày thành nẹp</span>
                <span className="font-semibold text-[#0F6CBD] tabular-nums">
                  {params.wallThicknessMm} mm
                </span>
              </div>
              <input
                type="range"
                min={2}
                max={5}
                step={0.5}
                value={params.wallThicknessMm}
                onChange={(e) =>
                  updateParams({ wallThicknessMm: parseFloat(e.target.value) })
                }
                className="w-full accent-[#0F6CBD] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>2.0 mm (Nhẹ)</span>
                <span>3.0 mm (Chuẩn)</span>
                <span>5.0 mm (Chịu lực cao)</span>
              </div>
            </div>

            {/* Chừa thêm ở chỗ xương nhô */}
            <div className="border border-slate-200 rounded-lg p-3 space-y-2">
              <span className="font-bold text-slate-800 block">
                Chừa thêm ở chỗ xương nhô (Bony Prominences)
              </span>
              <div className="space-y-1.5">
                {state.landmarks
                  .filter((l) => l.isPinned)
                  .map((lmk) => (
                    <div
                      key={lmk.id}
                      className="flex items-center justify-between p-2 rounded bg-[#F6F8FA] border border-slate-200"
                    >
                      <span className="font-medium text-slate-700">{lmk.label}:</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="4"
                          value={lmk.extraReliefMm}
                          onChange={(e) =>
                            updateLandmarkRelief(
                              lmk.id,
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-14 px-1.5 py-0.5 text-right border border-slate-300 rounded font-semibold text-xs tabular-nums"
                        />
                        <span className="text-slate-500">mm</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Đóng mở & Thoáng */}
        {activeTab === 'aeration' && (
          <div className="space-y-4 text-xs">
            {/* Vị trí khe mở */}
            <div className="border border-slate-200 rounded-lg p-3 space-y-2">
              <span className="font-bold text-slate-800 block">Vị trí khe mở</span>
              <select
                value={params.seamPosition}
                onChange={(e) =>
                  updateParams({ seamPosition: e.target.value as SeamPosition })
                }
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium"
              >
                <option value="dorsal">Mu bàn tay / Mặt lưng (Dorsal seam)</option>
                <option value="volar">Lòng bàn tay / Mặt gấp (Volar seam)</option>
                <option value="radial">Bờ ngoài / Cạnh xương quay (Radial seam)</option>
                <option value="ulnar">Bờ trong / Cạnh xương trụ (Ulnar seam)</option>
              </select>
            </div>

            {/* Dây đai Velcro */}
            <div className="border border-slate-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Số lượng dây đai Velcro</span>
                <span className="font-semibold text-[#0F6CBD]">{params.strapCount} dây</span>
              </div>
              <input
                type="range"
                min={2}
                max={5}
                step={1}
                value={params.strapCount}
                onChange={(e) => updateParams({ strapCount: parseInt(e.target.value) })}
                className="w-full accent-[#0F6CBD] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>2 dây</span>
                <span>3 dây</span>
                <span>4 dây</span>
                <span>5 dây</span>
              </div>
            </div>

            {/* Tỷ lệ lỗ thoáng & kích thước lỗ */}
            <div className="border border-slate-200 rounded-lg p-3 space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Tỷ lệ lỗ thoáng</span>
                  <span className="font-semibold text-[#0F6CBD]">
                    {params.aerationRatioPercent}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={40}
                  step={5}
                  value={params.aerationRatioPercent}
                  onChange={(e) =>
                    updateParams({ aerationRatioPercent: parseInt(e.target.value) })
                  }
                  className="w-full accent-[#0F6CBD] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Kích thước lỗ thoáng (mm)</span>
                  <span className="font-semibold text-[#0F6CBD]">
                    {params.aerationHoleSizeMm} mm
                  </span>
                </div>
                <input
                  type="range"
                  min={4}
                  max={8}
                  step={0.5}
                  value={params.aerationHoleSizeMm}
                  onChange={(e) =>
                    updateParams({ aerationHoleSizeMm: parseFloat(e.target.value) })
                  }
                  className="w-full accent-[#0F6CBD] cursor-pointer"
                />
              </div>
            </div>

            {/* Cửa sổ xem vết thương */}
            <div className="border border-slate-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Cửa sổ xem vết thương</span>
                  <span className="text-[11px] text-slate-500">
                    Khoét lỗ quan sát vết mổ thay băng không cần tháo nẹp
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = params.woundWindowCount > 0 ? 0 : 1;
                    updateParams({ woundWindowCount: nextVal });
                    addToast(
                      'info',
                      'Cửa sổ vết thương',
                      nextVal > 0 ? 'Đã thêm cửa sổ quan sát trên nẹp' : 'Đã bỏ cửa sổ quan sát'
                    );
                  }}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                    params.woundWindowCount > 0
                      ? 'bg-amber-500 text-white border-amber-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {params.woundWindowCount > 0 ? 'Đã thêm (1)' : 'Thêm cửa sổ'}
                </button>
              </div>
            </div>

            {/* Bo tròn mép */}
            <div className="border border-slate-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Bo tròn mép viền (Fillet)</span>
                <span className="font-semibold text-[#0F6CBD] tabular-nums">
                  {params.edgeFilletRadiusMm} mm
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                step={0.5}
                value={params.edgeFilletRadiusMm}
                onChange={(e) =>
                  updateParams({ edgeFilletRadiusMm: parseFloat(e.target.value) })
                }
                className="w-full accent-[#0F6CBD] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>1 mm (Sắc)</span>
                <span>3 mm (Khuyến nghị y khoa)</span>
                <span>5 mm (Êm ái)</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Vật liệu & In */}
        {activeTab === 'material' && (
          <div className="space-y-4 text-xs">
            {/* Loại vật liệu */}
            <div className="border border-slate-200 rounded-lg p-3 space-y-2">
              <span className="font-bold text-slate-800 block">Vật liệu in 3D</span>
              <select
                value={params.material}
                onChange={(e) =>
                  updateParams({ material: e.target.value as SplintMaterial })
                }
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium"
              >
                <option value="PETG">PETG Y tế (Kháng ẩm, dẻo dai vừa phải, dễ vệ sinh)</option>
                <option value="PLA_Medical">PLA Medical (Sinh học, phân huỷ, độ cứng cao)</option>
                <option value="TPU_95A">TPU Shore 95A (Cao su đàn hồi, êm dịu mô mềm)</option>
                <option value="PA12_Nylon">PA12 Nylon SLS (Chịu lực cao, độ bền công nghiệp)</option>
              </select>
            </div>

            {/* Hướng in */}
            <div className="border border-slate-200 rounded-lg p-3 space-y-2">
              <span className="font-bold text-slate-800 block">Hướng đặt phôi in tối ưu</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateParams({ printOrientation: 'vertical' })}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    params.printOrientation === 'vertical'
                      ? 'border-[#0F6CBD] bg-blue-50/70 font-semibold text-[#0F6CBD]'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs">Dọc trục (Khuyến nghị)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Tiết diện tháp, ít đỡ support</div>
                </button>

                <button
                  type="button"
                  onClick={() => updateParams({ printOrientation: 'angle_45' })}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    params.printOrientation === 'angle_45'
                      ? 'border-[#0F6CBD] bg-blue-50/70 font-semibold text-[#0F6CBD]'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs">Nghiêng 45°</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Tăng độ bền uốn theo thớ</div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Nav */}
      <div className="p-3 border-t border-slate-200 flex items-center justify-between bg-[#F6F8FA]">
        <button
          type="button"
          onClick={resetParamsToStageDefault}
          className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Đặt lại</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevStep}
            className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Bước ②</span>
          </button>

          <button
            type="button"
            onClick={nextStep}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#0F6CBD] hover:bg-[#0c589c] rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <span>Tiếp tục Kiểm tra an toàn ④</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
