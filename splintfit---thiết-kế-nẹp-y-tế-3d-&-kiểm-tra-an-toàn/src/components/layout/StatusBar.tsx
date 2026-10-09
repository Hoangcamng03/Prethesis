import React, { useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Info,
  XCircle,
  X,
  Shield,
} from 'lucide-react';

export const StatusBar: React.FC = () => {
  const { state, toasts, removeToast } = useProject();

  // Auto dismiss toasts after 4.5 seconds
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      removeToast(toasts[0].id);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toasts, removeToast]);

  // Determine warnings
  const warnings: string[] = [];
  if (state.stage === 'acute' && state.params.swellingAllowanceMm < 5.0) {
    warnings.push('Cảnh báo: Khoảng rộng rãi dưới mức tối thiểu 5.0 mm ở giai đoạn Cấp!');
  }
  if (state.meshStats.scaleMatch === 'divergent') {
    warnings.push('Cảnh báo: Sai lệch số đo quét so với thước kẹp > 3.0 mm!');
  }

  return (
    <>
      <footer className="h-8 bg-[#F6F8FA] border-t border-[#D0D7DE] px-4 flex items-center justify-between shrink-0 text-xs text-slate-600 select-none z-20">
        {/* Left: Processing status */}
        <div className="flex items-center gap-3">
          {state.isProcessing ? (
            <div className="flex items-center gap-2 text-[#0F6CBD] font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{state.processingTask}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-600">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Sẵn sàng · Cập nhật thời gian thực</span>
            </div>
          )}

          <div className="h-3 w-[1px] bg-slate-300 mx-1" />

          {/* Warnings ticker */}
          {warnings.length > 0 ? (
            <div className="flex items-center gap-1.5 text-amber-700 font-medium animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>{warnings[0]}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-500">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Hệ thống bình thường · Không có xung đột hình học</span>
            </div>
          )}
        </div>

        {/* Right: Confidence badge & model stats */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Lưới quét: {state.meshStats.pointCount.toLocaleString()} đỉnh · {state.meshStats.triangleCount.toLocaleString()} mặt
          </span>

          <div className="h-3 w-[1px] bg-slate-300" />

          {/* Overall Confidence Badge */}
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 px-2.5 py-0.5 rounded-full font-semibold text-[11px] shadow-2xs">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>Độ tin cậy tổng: {state.overallConfidence}%</span>
            <span className="text-emerald-600 font-normal">· Đạt chuẩn y tế</span>
          </div>
        </div>
      </footer>

      {/* Floating Toast Notification Stack in bottom-right corner */}
      <div className="fixed bottom-10 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          let bgClass = 'bg-white border-slate-200 text-slate-800';
          let Icon = Info;
          let iconColor = 'text-[#0F6CBD]';

          if (toast.type === 'success') {
            bgClass = 'bg-white border-emerald-200 text-slate-800';
            Icon = CheckCircle2;
            iconColor = 'text-emerald-600';
          } else if (toast.type === 'warning') {
            bgClass = 'bg-amber-50 border-amber-300 text-amber-900';
            Icon = AlertTriangle;
            iconColor = 'text-amber-600';
          } else if (toast.type === 'error') {
            bgClass = 'bg-red-50 border-red-300 text-red-900';
            Icon = XCircle;
            iconColor = 'text-red-600';
          }

          return (
            <div
              key={toast.id}
              className={`p-3 rounded-lg shadow-lg border pointer-events-auto flex items-start gap-2.5 transition-all transform animate-in fade-in slide-in-from-bottom-2 ${bgClass}`}
            >
              <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold">{toast.title}</div>
                <div className="text-xs mt-0.5 text-slate-600 leading-snug">{toast.message}</div>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
};
