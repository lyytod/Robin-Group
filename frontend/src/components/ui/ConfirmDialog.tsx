import React, { useEffect, useRef } from 'react';
import { Trash2, AlertTriangle, Info, AlertCircle, X } from 'lucide-react';
import { useConfirmStore } from '../../store/confirmStore';

export const ConfirmDialog: React.FC = () => {
  const { isOpen, title, message, confirmText, cancelText, type, itemDetails, closeConfirm } =
    useConfirmStore();

  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  // Auto-focus tombol batal demi keamanan saat modal terbuka
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        cancelBtnRef.current?.focus();
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          closeConfirm(false);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, closeConfirm]);

  if (!isOpen) return null;

  const renderIcon = () => {
    switch (type) {
      case 'danger':
        return (
          <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 ring-8 ring-rose-50 flex items-center justify-center mb-1">
            <Trash2 className="w-7 h-7" />
          </div>
        );
      case 'warning':
        return (
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 ring-8 ring-amber-50 flex items-center justify-center mb-1">
            <AlertTriangle className="w-7 h-7" />
          </div>
        );
      case 'info':
      default:
        return (
          <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 ring-8 ring-blue-50 flex items-center justify-center mb-1">
            <Info className="w-7 h-7" />
          </div>
        );
    }
  };

  const getConfirmButtonClasses = () => {
    switch (type) {
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-rose-200';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white shadow-amber-200';
      case 'info':
      default:
        return 'bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white shadow-primary-200';
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-surface-950/60 backdrop-blur-sm animate-fade-in">
      {/* Overlay click to cancel */}
      <div className="fixed inset-0" onClick={() => closeConfirm(false)} />

      {/* Modal Dialog Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="bg-white rounded-2xl shadow-2xl border border-surface-200 max-w-md w-full p-6 space-y-4 relative z-10 animate-scale-in"
      >
        {/* Close Button X */}
        <button
          onClick={() => closeConfirm(false)}
          className="absolute top-4 right-4 p-1.5 text-surface-400 hover:text-surface-600 rounded-xl hover:bg-surface-100 transition-colors"
          title="Tutup (Esc)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Icon */}
        <div className="flex flex-col items-center text-center pt-1">
          {renderIcon()}
          <h3 id="confirm-dialog-title" className="text-lg font-bold text-surface-900 mt-2">
            {title}
          </h3>
          <div className="text-sm text-surface-600 mt-1.5 leading-relaxed">
            {typeof message === 'string' ? <p>{message}</p> : message}
          </div>
        </div>

        {/* Item Details Box (Jika Diberikan) */}
        {itemDetails && itemDetails.length > 0 && (
          <div className="bg-surface-50 border border-surface-200/80 rounded-xl p-3 text-xs space-y-1.5">
            {itemDetails.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-surface-600">
                <span className="text-surface-500 font-medium">{item.label}</span>
                <span className="font-semibold text-surface-900 font-mono">{item.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Warning Callout Box khusus tipe Danger */}
        {type === 'danger' && (
          <div className="bg-rose-50/80 border border-rose-200/80 rounded-xl p-2.5 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>Tindakan ini tidak dapat dibatalkan. Pastikan data sudah benar.</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={() => closeConfirm(false)}
            className="flex-1 py-2.5 px-4 text-sm font-semibold text-surface-700 bg-surface-100 hover:bg-surface-200 rounded-xl transition-all"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => closeConfirm(true)}
            className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 ${getConfirmButtonClasses()}`}
          >
            {type === 'danger' && <Trash2 className="w-4 h-4" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

