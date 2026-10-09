import React, { useRef } from 'react';
import { useProject } from '../../context/ProjectContext';
import {
  UploadCloud,
  FileCheck2,
  AlertTriangle,
  CheckCircle,
  Eye,
  Sliders,
  RotateCcw,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { HelpPopover } from '../common/HelpPopover';

export const LoadScanPanel: React.FC = () => {
  const {
    state,
    updateCaliperMeasurements,
    checkScaleRatio,
    toggleShowHoles,
    setFillSmallHoles,
    loadScanPresetFile,
    nextStep,
    addToast,
  } = useProject();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCustomFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadScanPresetFile(file.name);
    }
  };

  const { meshStats, caliperMeasurements } = state;

  return (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Panel Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">① Nạp quét &amp; Chuẩn hoá</h2>
          <HelpPopover
            title="Quy trình nạp quét 3D"
            content="Nạp file quét từ máy quét 3D quang học hoặc CT. Dữ liệu cần được kiểm tra tỉ lệ đối chiếu với thước kẹp vật lý để tránh sai số trước khi thiết kế nẹp."
          />
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Kiểm tra toàn vẹn lưới tam giác, tỉ lệ thực và vá lỗ quét
        </p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Upload Drop Zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 hover:border-[#0F6CBD] rounded-xl p-4 text-center cursor-pointer bg-[#F6F8FA] hover:bg-blue-50/30 transition-all group"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".stl,.obj,.ply"
            onChange={handleCustomFileUpload}
            className="hidden"
          />
          <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-[#0F6CBD] mx-auto transition-colors" />
          <div className="mt-2 text-xs font-semibold text-slate-700">
            Kéo thả hoặc bấm để chọn file quét
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Định dạng hỗ trợ: .stl, .obj, .ply
          </div>
          <button
            type="button"
            className="mt-3 px-3 py-1.5 text-xs font-medium text-[#0F6CBD] bg-white border border-slate-200 shadow-2xs rounded-lg group-hover:border-[#0F6CBD]"
          >
            Chọn file quét từ máy tính
          </button>
        </div>

        {/* Scan File Info Card */}
        <div className="bg-[#F6F8FA] border border-slate-200 rounded-lg p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <FileCheck2 className="w-3.5 h-3.5 text-[#0F6CBD]" />
              {state.scanFileName}
            </span>
            <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              Lưới kín hợp lệ
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/80 text-slate-600">
            <div>
              <span className="text-[11px] text-slate-400 block">Số điểm quét:</span>
              <span className="font-semibold tabular-nums">
                {meshStats.pointCount.toLocaleString()} đỉnh
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Số tam giác:</span>
              <span className="font-semibold tabular-nums">
                {meshStats.triangleCount.toLocaleString()} mặt
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-[11px] text-slate-400 block">Kích thước hộp bao (L × W × H):</span>
              <span className="font-semibold tabular-nums text-slate-800">
                {meshStats.boundingBox.lengthMm} × {meshStats.boundingBox.widthMm} × {meshStats.boundingBox.heightMm} mm
              </span>
            </div>
          </div>

          {/* Unit selection */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-600 font-medium">Đơn vị file:</span>
            <select
              value={meshStats.unit}
              onChange={() => addToast('info', 'Đơn vị', 'Đang sử dụng hệ milimet (mm)')}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-semibold"
            >
              <option value="mm">Milimet (mm)</option>
              <option value="cm">Centimet (cm)</option>
              <option value="m">Met (m)</option>
            </select>
          </div>
        </div>

        {/* Physical Caliper Measurements */}
        <div className="border border-slate-200 rounded-lg p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              Số đo đối chiếu thước kẹp (Thực tế)
            </span>
            <HelpPopover
              title="Đối chiếu thước kẹp"
              content="Nhập chu vi đo trực tiếp bằng thước dây trên người bệnh để so sánh với chu vi mô hình 3D. Sai số vượt quá 3mm cảnh báo mô hình quét bị co giãn."
            />
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <label className="text-slate-600">Chu vi cổ tay (mm):</label>
              <input
                type="number"
                step="0.5"
                value={caliperMeasurements.wristCircumference}
                onChange={(e) =>
                  updateCaliperMeasurements(
                    'wristCircumference',
                    parseFloat(e.target.value) || 0
                  )
                }
                className="w-20 px-2 py-1 text-right border border-slate-200 rounded focus:border-[#0F6CBD] outline-none font-semibold tabular-nums"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-slate-600">Chu vi cẳng tay (mm):</label>
              <input
                type="number"
                step="0.5"
                value={caliperMeasurements.forearmCircumference}
                onChange={(e) =>
                  updateCaliperMeasurements(
                    'forearmCircumference',
                    parseFloat(e.target.value) || 0
                  )
                }
                className="w-20 px-2 py-1 text-right border border-slate-200 rounded focus:border-[#0F6CBD] outline-none font-semibold tabular-nums"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-slate-600">Chiều dài bàn tay (mm):</label>
              <input
                type="number"
                step="0.5"
                value={caliperMeasurements.handLength}
                onChange={(e) =>
                  updateCaliperMeasurements(
                    'handLength',
                    parseFloat(e.target.value) || 0
                  )
                }
                className="w-20 px-2 py-1 text-right border border-slate-200 rounded focus:border-[#0F6CBD] outline-none font-semibold tabular-nums"
              />
            </div>
          </div>

          {/* Scale check button & result */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={checkScaleRatio}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0F6CBD] hover:bg-[#0c589c] rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Kiểm tra tỉ lệ
            </button>

            {meshStats.scaleMatch === 'pass' ? (
              <div className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Đạt (Lệch {meshStats.discrepancyMm} mm)</span>
              </div>
            ) : meshStats.scaleMatch === 'divergent' ? (
              <div className="flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Lệch {meshStats.discrepancyMm} mm (&gt;3mm)</span>
              </div>
            ) : (
              <span className="text-[11px] text-slate-400">Chưa kiểm tra</span>
            )}
          </div>
        </div>

        {/* Defect Holes Inspection & Repair */}
        <div className="border border-slate-200 rounded-lg p-3 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800">Thống kê lỗ khuyết trên lưới</span>
            <HelpPopover
              title="Lỗ khuyết bề mặt"
              content="Các vùng da bị che khuất khi quét quang học tạo thành lỗ thủng trên mesh. Phần mềm tự động nối vá các lỗ nhỏ để tạo bề mặt nẹp liên tục."
            />
          </div>

          <div className="flex items-center justify-between text-slate-600">
            <span>Số lượng lỗ: <strong>{meshStats.holeCount} lỗ</strong></span>
            <span>Lỗ lớn nhất: <strong>{meshStats.maxHoleDiameterMm} mm</strong></span>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={toggleShowHoles}
              className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                meshStats.hasShowHoles
                  ? 'bg-red-50 text-red-700 border-red-300'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              {meshStats.hasShowHoles ? 'Đang hiện lỗ đỏ' : 'Hiện biên lỗ quét'}
            </button>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={meshStats.fillSmallHoles}
                onChange={(e) => setFillSmallHoles(e.target.checked, meshStats.maxHoleThresholdMm)}
                className="rounded text-[#0F6CBD] focus:ring-0"
              />
              <span className="font-medium text-slate-700">Tự động lấp lỗ nhỏ</span>
            </label>

            {meshStats.fillSmallHoles && (
              <div className="flex items-center justify-between pl-5">
                <span className="text-slate-500 text-[11px]">Ngưỡng tối đa:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="15"
                    value={meshStats.maxHoleThresholdMm}
                    onChange={(e) =>
                      setFillSmallHoles(
                        meshStats.fillSmallHoles,
                        parseFloat(e.target.value) || 5.0
                      )
                    }
                    className="w-16 px-1.5 py-0.5 text-right border border-slate-200 rounded text-xs font-semibold"
                  />
                  <span className="text-slate-500 text-[11px]">mm</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Panel Footer Nav Buttons */}
      <div className="p-3 border-t border-slate-200 flex items-center justify-between bg-[#F6F8FA]">
        <button
          type="button"
          onClick={() => {
            updateCaliperMeasurements('wristCircumference', 165);
            addToast('info', 'Đặt lại', 'Đã đặt lại số đo chuẩn');
          }}
          className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Đặt lại
        </button>

        <button
          type="button"
          onClick={nextStep}
          className="px-4 py-2 text-xs font-semibold text-white bg-[#0F6CBD] hover:bg-[#0c589c] rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
        >
          <span>Tiếp tục Bước ②</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
