import React from 'react';
import { useProject } from '../../context/ProjectContext';
import {
  FileScan,
  Crosshair,
  Sliders,
  ShieldCheck,
  Share2,
  Lock,
  CheckCircle2,
} from 'lucide-react';

interface StepDef {
  step: number;
  numberSymbol: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
}

const STEPS: StepDef[] = [
  {
    step: 1,
    numberSymbol: '①',
    title: 'Nạp quét',
    subtitle: 'Mesh 3D & thước kẹp',
    icon: FileScan,
  },
  {
    step: 2,
    numberSymbol: '②',
    title: 'Mốc giải phẫu',
    subtitle: 'Đoạn cố định & ổ gãy',
    icon: Crosshair,
  },
  {
    step: 3,
    numberSymbol: '③',
    title: 'Thiết kế nẹp',
    subtitle: 'Khoảng hở & khe mở',
    icon: Sliders,
  },
  {
    step: 4,
    numberSymbol: '④',
    title: 'Kiểm tra an toàn',
    subtitle: 'Bản đồ nhiệt & mặt cắt',
    icon: ShieldCheck,
  },
  {
    step: 5,
    numberSymbol: '⑤',
    title: 'Xuất sang Fusion 360',
    subtitle: 'Duyệt ca & thông số CAD',
    icon: Share2,
  },
];

export const Stepper: React.FC = () => {
  const { state, goToStep, stepRequirementsMet } = useProject();

  return (
    <aside className="w-56 bg-white border-r border-[#D0D7DE] flex flex-col shrink-0 select-none">
      <div className="p-3 border-b border-slate-100 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Tiến trình thiết kế
        </span>
        <span className="text-[11px] font-semibold text-[#0F6CBD] bg-blue-50 px-2 py-0.5 rounded">
          Bước {state.currentStep}/5
        </span>
      </div>

      <nav className="p-2 space-y-1.5 flex-1">
        {STEPS.map((stepItem) => {
          const isActive = state.currentStep === stepItem.step;
          const { met, reason } = stepRequirementsMet(stepItem.step);
          const isCompleted = state.currentStep > stepItem.step && met;
          const Icon = stepItem.icon;

          return (
            <div key={stepItem.step} className="relative group">
              <button
                type="button"
                onClick={() => met && goToStep(stepItem.step)}
                disabled={!met}
                className={`w-full text-left p-2.5 rounded-lg flex items-start gap-2.5 transition-all ${
                  isActive
                    ? 'bg-[#0F6CBD] text-white shadow-xs font-semibold'
                    : met
                    ? 'hover:bg-slate-50 text-slate-700'
                    : 'opacity-55 cursor-not-allowed bg-slate-50/50 text-slate-400'
                }`}
              >
                {/* Step indicator */}
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : isCompleted
                      ? 'bg-emerald-100 text-emerald-700'
                      : met
                      ? 'bg-slate-100 text-slate-600'
                      : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {isCompleted && !isActive ? (
                    <CheckCircle2 className="w-4 h-4 text-[#2E7D32]" />
                  ) : !met ? (
                    <Lock className="w-3.5 h-3.5" />
                  ) : (
                    <span>{stepItem.step}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs truncate block ${
                        isActive ? 'text-white font-semibold' : 'text-slate-800 font-medium'
                      }`}
                    >
                      {stepItem.title}
                    </span>
                    {!met && <Lock className="w-3 h-3 text-slate-400 ml-1 shrink-0" />}
                  </div>
                  <span
                    className={`text-[11px] block truncate mt-0.5 ${
                      isActive ? 'text-blue-100' : 'text-slate-500'
                    }`}
                  >
                    {stepItem.subtitle}
                  </span>
                </div>
              </button>

              {/* Tooltip on locked step hover */}
              {!met && reason && (
                <div className="absolute left-full top-2 ml-2 z-50 hidden group-hover:block w-56 p-2 bg-slate-900 text-white text-[11px] rounded shadow-lg pointer-events-none">
                  <div className="font-semibold text-amber-300 mb-0.5">Yêu cầu hoàn thành:</div>
                  <div className="leading-snug">{reason}</div>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Patient info widget at bottom of stepper */}
      <div className="p-3 bg-[#F6F8FA] border-t border-slate-200 m-2 rounded-lg text-xs space-y-1">
        <div className="text-[10px] uppercase font-bold text-slate-500">Thông tin ca bệnh</div>
        <div className="font-semibold text-slate-800 truncate">{state.patientName}</div>
        <div className="flex items-center justify-between text-slate-600 text-[11px] pt-1 border-t border-slate-200/60">
          <span>Chi: {state.handSide === 'left' ? 'Tay Trái' : 'Tay Phải'}</span>
          <span className="font-medium text-amber-700">
            {state.stage === 'acute' ? 'Cấp tính' : 'Chính thức'}
          </span>
        </div>
      </div>
    </aside>
  );
};
