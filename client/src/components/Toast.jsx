import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useRoom } from '../context/RoomContext';

export default function Toast() {
  const { toast, showToast } = useRoom();
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (toast) {
      setExiting(false);
      setVisible(true);
      setProgress(100);

      // Progress countdown
      const duration = 3500;
      const interval = 50;
      const decrement = (interval / duration) * 100;
      const progressTimer = setInterval(() => {
        setProgress(prev => {
          if (prev <= 0) {
            clearInterval(progressTimer);
            return 0;
          }
          return prev - decrement;
        });
      }, interval);

      const exitTimer = setTimeout(() => {
        setExiting(true);
        setTimeout(() => {
          setVisible(false);
          showToast(null);
        }, 280);
      }, duration);

      return () => {
        clearTimeout(exitTimer);
        clearInterval(progressTimer);
      };
    } else {
      setVisible(false);
    }
  }, [toast]);

  if (!toast || !visible) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />,
    info: <Info className="w-5 h-5 text-sky-500 flex-shrink-0" />
  };

  const bgStyles = {
    success: 'bg-white border-emerald-200',
    error: 'bg-white border-rose-200',
    info: 'bg-white border-sky-200'
  };

  const progressColors = {
    success: 'bg-emerald-500',
    error: 'bg-rose-500',
    info: 'bg-sky-500'
  };

  const textColor = {
    success: 'text-emerald-800',
    error: 'text-rose-800',
    info: 'text-sky-800'
  };

  return (
    <div
      className={`fixed bottom-20 lg:bottom-6 right-4 z-50 ${
        exiting ? 'toast-exit' : 'toast-enter'
      }`}
    >
      <div className={`relative flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl shadow-slate-900/5 ${bgStyles[toast.type || 'success']} overflow-hidden min-w-[240px] max-w-md`}>
        {icons[toast.type || 'success']}
        <span className={`text-xs font-semibold ${textColor[toast.type || 'success']}`}>
          {toast.message}
        </span>
        <button
          onClick={() => {
            setExiting(true);
            setTimeout(() => {
              setVisible(false);
              showToast(null);
            }, 250);
          }}
          className="ml-2 text-slate-300 hover:text-slate-500 transition flex-shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-100">
          <div
            className={`h-full transition-all duration-75 ${progressColors[toast.type || 'success']}`}
            style={{ width: `${progress}%`, opacity: 0.5 }}
          />
        </div>
      </div>
    </div>
  );
}
