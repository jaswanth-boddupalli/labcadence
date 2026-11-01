/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { RewardCategory } from "../services/rewardsDatabase";
import { Sparkles, X, CheckCircle2 } from "lucide-react";

interface RewardCelebrationToastProps {
  category: RewardCategory;
  quote: string;
  taskTitle?: string;
  onDismiss: () => void;
}

export default function RewardCelebrationToast({
  category,
  quote,
  taskTitle,
  onDismiss
}: RewardCelebrationToastProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const duration = 6500; // 6.5s
    const interval = 50;
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= step) {
          clearInterval(timer);
          onDismiss();
          return 0;
        }
        return prev - step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [onDismiss]);

  return (
    <div className="fixed top-6 right-4 sm:right-6 z-50 max-w-md w-[92vw] sm:w-full animate-fadeIn font-sans drop-shadow-2xl">
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-950 text-white rounded-3xl p-5 shadow-2xl border-2 border-teal-400/40 relative overflow-hidden backdrop-blur-md">
        
        {/* Glow ambient circle */}
        <div className="absolute right-0 top-0 w-36 h-36 bg-teal-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex items-start space-x-3.5">
            {/* Badge Icon */}
            <div className="text-3xl p-2.5 bg-white/10 rounded-2xl border border-white/20 shrink-0 shadow-inner flex items-center justify-center">
              {category.badge.icon}
            </div>

            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-teal-300 bg-teal-500/25 px-2 py-0.5 rounded-full border border-teal-500/40">
                  {category.psychologicalNeed} Reinforcement
                </span>
                <span className="text-[10px] text-teal-400 font-bold font-mono">
                  Trigger #{category.categoryNumber}
                </span>
              </div>

              <h4 className="text-sm font-black text-white leading-tight">
                {category.badge.name}
              </h4>

              {taskTitle && (
                <p className="text-[11px] text-teal-200/80 truncate max-w-[280px]">
                  Ref: &ldquo;{taskTitle}&rdquo;
                </p>
              )}

              <p className="text-xs sm:text-sm font-extrabold text-amber-200 italic pt-1 leading-snug">
                &ldquo;{quote}&rdquo;
              </p>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="Dismiss reinforcement"
          >
            <X size={16} />
          </button>
        </div>

        {/* Timed progress indicator */}
        <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span className="text-teal-300/80 font-medium">Task Performance Reinforcement</span>
          <span className="text-teal-300 font-bold">{category.badge.level}</span>
        </div>

        {/* Dynamic Countdown Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 transition-all duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
