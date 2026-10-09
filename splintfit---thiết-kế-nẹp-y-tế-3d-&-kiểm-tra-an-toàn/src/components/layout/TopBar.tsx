import React, { useRef } from 'react';
import { useProject } from '../../context/ProjectContext';
import { PRESET_CASES } from '../../utils/initialState';
import {
  Undo2,
  Redo2,
  Save,
  FolderOpen,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';

export const TopBar: React.FC = () => {
  const {
    state,
    canUndo,
    canRedo,
    undo,
    redo,
    switchCasePreset,
    setHandSide,
    requestStageChange,
    setUiMode,
    saveProjectFile,
    loadProjectFile,
  } = useProject();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        if (text) loadProjectFile(text);
      };
      reader.readAsText(file);
    }
    if (e.target) e.target.value = '';
  };

  return (
    <header className="h-14 bg-white border-b border-[#D0D7DE] px-4 flex items-center justify-between shrink-0 shadow-xs z-30 select-none">
      {/* Left zone: Brand and Case ID & Hand Picker */}
      <div className="flex items-center gap-3">
        {/* App Title */}
        <div className="flex items-center gap-2 pr-3 border-r border-slate-200">
          <div className="w-7 h-7 rounded-lg bg-[#0F6CBD] flex items-center justify-center text-white shadow-xs">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-slate-900 block leading-tight">
              SplintFit
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Medical CAD v2.4</span>
          </div>
        </div>

        {/* Mã ca selector */}
        <div className="flex items-center gap-1.5 bg-[#F6F8FA] border border-slate-200 rounded-lg px-2.5 py-1">
          <span className="text-xs font-medium text-slate-500">Mã ca:</span>
          <select
            value={state.caseId}
            onChange={(e) => switchCasePreset(e.target.value)}
            className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
          >
            {PRESET_CASES.map((c) => (
              <option key={c.caseId} value={c.caseId}>
                {c.caseId} ({c.title.split(':')[0]})
              </option>
            ))}
          </select>
        </div>

        {/* Tay [Trái | Phải] */}
        <div className="flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-lg">
          <button
            type="button"
            onClick={() => setHandSide('left')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              state.handSide === 'left'
                ? 'bg-white text-[#0F6CBD] shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tay Trái
          </button>
          <button
            type="button"
            onClick={() => setHandSide('right')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              state.handSide === 'right'
                ? 'bg-white text-[#0F6CBD] shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tay Phải
          </button>
        </div>

        {/* Giai đoạn [Cấp | Chính thức] */}
        <div className="flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-lg">
          <button
            type="button"
            onClick={() => requestStageChange('acute')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              state.stage === 'acute'
                ? 'bg-amber-500 text-white shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Giai đoạn cấp tính: chừa chỗ sưng nề ≥ 5mm (mặc định 8mm)"
          >
            Giai đoạn Cấp
          </button>
          <button
            type="button"
            onClick={() => requestStageChange('definitive')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              state.stage === 'definitive'
                ? 'bg-[#0F6CBD] text-white shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Giai đoạn chính thức: nẹp ôm khít vững chắc (mặc định 3mm)"
          >
            Giai đoạn Chính thức
          </button>
        </div>
      </div>

      {/* Right zone: Mode, Save/Load, Undo/Redo */}
      <div className="flex items-center gap-2">
        {/* Chế độ [Đơn giản | Chuyên gia] */}
        <div className="flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-lg mr-2">
          <button
            type="button"
            onClick={() => setUiMode('simple')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1 transition-all ${
              state.uiMode === 'simple'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Chế độ cho kỹ thuật viên nhanh"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Đơn giản
          </button>
          <button
            type="button"
            onClick={() => setUiMode('expert')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1 transition-all ${
              state.uiMode === 'expert'
                ? 'bg-white text-[#0F6CBD] shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Chế độ chi tiết đầy đủ tham số y khoa và mm"
          >
            <Layers className="w-3.5 h-3.5 text-[#0F6CBD]" />
            Chuyên gia
          </button>
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-white">
          <button
            type="button"
            disabled={!canUndo}
            onClick={undo}
            title="Hoàn tác (Undo) Ctrl+Z"
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-35 disabled:hover:bg-transparent rounded"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <div className="w-[1px] h-3.5 bg-slate-200 mx-0.5" />
          <button
            type="button"
            disabled={!canRedo}
            onClick={redo}
            title="Làm lại (Redo) Ctrl+Y"
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-35 disabled:hover:bg-transparent rounded"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Save / Open file buttons */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.splintfit.json"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Mở dự án .splintfit.json"
          className="px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 transition-colors"
        >
          <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
          Mở
        </button>

        <button
          type="button"
          onClick={saveProjectFile}
          title="Lưu dự án thành file .splintfit.json"
          className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0F6CBD] hover:bg-[#0c589c] rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          Lưu
        </button>
      </div>
    </header>
  );
};
