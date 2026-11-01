import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

interface PasswordGateProps {
  onUnlock: () => void;
}

export default function PasswordGate({ onUnlock }: PasswordGateProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'demo2026') {
      setError(false);
      onUnlock();
    } else {
      setError(true);
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-slate-900 font-sans transition-opacity duration-500 ease-in-out">
      <div className="w-full max-w-sm p-8 bg-white border border-slate-200">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-full mb-4">
            <Lock className="w-6 h-6 text-slate-700" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">OMI LAB | IISc</h1>
          <p className="text-sm text-slate-500 mt-1">Research Operations Engine</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-slate-700">
                Access Password
              </label>
              <span className="text-[11px] text-slate-400 font-mono">Demo: demo2026</span>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className={`w-full px-3 py-2 border ${error ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-slate-500'
                  } focus:outline-none focus:ring-1 bg-white text-slate-900`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                placeholder="Enter demo2026"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && (
              <p className="text-xs text-red-600 mt-2">Incorrect password. Please try again.</p>
            )}
          </div>
          <button
            type="submit"
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2 px-4 transition-colors"
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}
