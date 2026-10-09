import React from 'react';
import { useProject } from '../../context/ProjectContext';
import { AlertTriangle } from 'lucide-react';

export const StageChangeDialog: React.FC = () => {
  const { pendingStageChange, confirmStageChange, cancelStageChange } = useProject();

  if (!pendingStageChange) return null;

  const isSwitchingToDefinitive = pendingStageChange === 'definitive';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Xác nhận chuyển giai đoạn điều trị
              </h3>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                {isSwitchingToDefinitive ? (
                  <>
                    Chuyển sang <strong>Giai đoạn Chính thức</strong>: khoảng rộng rãi chừa chỗ sưng nề theo khuyến nghị y khoa sẽ giảm từ <strong>8 mm → 3 mm</strong> để nẹp ôm khít vững chắc hơn.
                  </>
                ) : (
                  <>
                    Chuyển sang <strong>Giai đoạn Cấp</strong>: nẹp bắt buộc phải chừa khoảng rộng rãi tối thiểu <strong>≥ 5 mm (khuyến nghị 8 mm)</strong> để đề phòng thiếu máu cục bộ do phù nề cấp tính.
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={cancelStageChange}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Huỷ bỏ
            </button>
            <button
              type="button"
              onClick={() => confirmStageChange(false)}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
            >
              Giữ thông số chỉnh tay
            </button>
            <button
              type="button"
              onClick={() => confirmStageChange(true)}
              className="px-4 py-2 text-xs font-medium text-white bg-[#0F6CBD] hover:bg-[#0c589c] rounded-lg shadow-sm transition-colors"
            >
              Đặt lại mặc định ({isSwitchingToDefinitive ? '3 mm' : '8 mm'})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
