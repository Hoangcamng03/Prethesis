import React, { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface HelpPopoverProps {
  title: string;
  content: string;
}

export const HelpPopover: React.FC<HelpPopoverProps> = ({ title, content }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Giải thích thuật ngữ y khoa"
        className="p-1 text-slate-400 hover:text-[#0F6CBD] focus:outline-none transition-colors rounded"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 bottom-full mb-2 z-50 w-72 p-3 bg-white border border-slate-200 shadow-xl rounded-lg text-left">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 mb-1.5">
              <span className="text-xs font-semibold text-slate-900">{title}</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs leading-relaxed text-slate-600">{content}</p>
          </div>
        </>
      )}
    </div>
  );
};
