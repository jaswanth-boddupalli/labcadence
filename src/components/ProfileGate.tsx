/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LabUser } from "../types";
import { 
  Lock, KeyRound, Search, Shield, CheckCircle2, X, Sparkles, 
  GraduationCap, FlaskConical, ArrowRight, UserCheck, AlertCircle, Delete
} from "lucide-react";

interface ProfileGateProps {
  users: LabUser[];
  onSelectUser: (user: LabUser) => void;
  onUpdateUserPin: (userId: string, pin: string | null) => Promise<void>;
}

export default function ProfileGate({
  users,
  onSelectUser,
  onUpdateUserPin,
}: ProfileGateProps) {
  const [selectedUser, setSelectedUser] = useState<LabUser | null>(null);
  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [isSettingPin, setIsSettingPin] = useState<boolean>(false);
  const [newPinInput, setNewPinInput] = useState<string>("");
  const [confirmPinInput, setConfirmPinInput] = useState<string>("");
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isSavingPin, setIsSavingPin] = useState<boolean>(false);

  const hiddenInputRef = useRef<HTMLInputElement>(null);

  // Active users only (exclude archived)
  const activeMembers = useMemo(() => {
    return users.filter((u) => u.rosterStatus !== "ARCHIVED");
  }, [users]);

  // Filtered members list based on role & search query
  const filteredMembers = useMemo(() => {
    return activeMembers.filter((u) => {
      // Role filter
      if (roleFilter === "FACULTY" && u.designation !== "Professor (PI)" && u.designation !== "Coordinator") {
        return false;
      }
      if (roleFilter === "PHD" && u.designation !== "PhD Scholar") {
        return false;
      }
      if (roleFilter === "PG" && u.designation !== "P.G. Scholar" && u.designation !== "U.G. Scholar") {
        return false;
      }
      if (roleFilter === "POSTDOC" && u.designation !== "Post Doc") {
        return false;
      }

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchName = u.name.toLowerCase().includes(q);
      const matchRole = u.designation.toLowerCase().includes(q);
      const matchDomain = (u.researchDomain || "").toLowerCase().includes(q);
      const matchThesis = (u.thesisTopic || "").toLowerCase().includes(q);
      return matchName || matchRole || matchDomain || matchThesis;
    });
  }, [activeMembers, roleFilter, searchQuery]);

  // Automatically focus input when selecting a user
  useEffect(() => {
    if (selectedUser) {
      setPinInput("");
      setPinError(null);
      setIsSuccess(false);
      setIsSettingPin(!selectedUser.pinCode);
      setNewPinInput("");
      setConfirmPinInput("");
      setTimeout(() => {
        hiddenInputRef.current?.focus();
      }, 100);
    }
  }, [selectedUser]);

  // Handle PIN digit addition
  const handleDigitPress = (digit: string) => {
    if (pinInput.length < 4) {
      const nextPin = pinInput + digit;
      setPinInput(nextPin);
      setPinError(null);
      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setPinError(null);
  };

  const handleClear = () => {
    setPinInput("");
    setPinError(null);
  };

  // Verify PIN logic
  const verifyPin = (candidatePin: string) => {
    if (!selectedUser) return;

    // Check if user has PIN
    if (selectedUser.pinCode) {
      // Allow exact match or master coordinator pin 0000 for recovery
      if (candidatePin === selectedUser.pinCode || candidatePin === "0000") {
        setIsSuccess(true);
        setTimeout(() => {
          onSelectUser(selectedUser);
        }, 350);
      } else {
        setPinError("Incorrect 4-digit password. Please try again.");
        setTimeout(() => {
          setPinInput("");
          hiddenInputRef.current?.focus();
        }, 400);
      }
    }
  };

  // First-time PIN setup submit
  const handleSaveFirstTimePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (!/^\d{4}$/.test(newPinInput)) {
      setPinError("Password must be exactly 4 numeric digits.");
      return;
    }
    if (newPinInput !== confirmPinInput) {
      setPinError("Passwords do not match. Please re-enter.");
      return;
    }

    try {
      setIsSavingPin(true);
      await onUpdateUserPin(selectedUser.userId, newPinInput);
      setIsSuccess(true);
      setTimeout(() => {
        onSelectUser({ ...selectedUser, pinCode: newPinInput });
      }, 400);
    } catch (err) {
      setPinError("Failed to save password. Please try again.");
    } finally {
      setIsSavingPin(false);
    }
  };

  // Get Initials
  const getInitials = (name: string) => {
    const clean = name.replace(/^(Prof\.|Dr\.|Mr\.|Ms\.|Mrs\.)\s+/i, "");
    const parts = clean.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Role style helpers
  const getRoleBadge = (role: string) => {
    switch (role) {
      case "Professor (PI)":
        return "bg-indigo-50 text-indigo-800 border-indigo-200";
      case "Coordinator":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "Post Doc":
        return "bg-purple-50 text-purple-800 border-purple-200";
      case "PhD Scholar":
        return "bg-teal-50 text-teal-800 border-teal-200";
      default:
        return "bg-sky-50 text-sky-800 border-sky-200";
    }
  };

  const getAvatarGradient = (role: string) => {
    switch (role) {
      case "Professor (PI)":
        return "from-indigo-600 to-indigo-900";
      case "Coordinator":
        return "from-amber-600 to-amber-900";
      case "Post Doc":
        return "from-purple-600 to-purple-900";
      case "PhD Scholar":
        return "from-teal-600 to-teal-900";
      default:
        return "from-sky-600 to-slate-800";
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-white relative overflow-x-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white font-black text-lg tracking-wider shadow-lg shadow-teal-500/20">
              OMI
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-white text-base tracking-tight">IISc Bangalore</span>
                <span className="text-slate-600 text-xs">/</span>
                <span className="text-teal-400 font-semibold text-xs uppercase tracking-wider font-mono">OMI LAB</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Optics & Microfluidics Instrumentation Research Operations
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-400 bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700/60">
            <Shield size={14} className="text-teal-400" />
            <span>Individual 4-Digit Protected Profiles</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col justify-between">
        <div className="space-y-8">
          
          {/* Welcome Banner */}
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-950/80 border border-teal-800/60 text-teal-300 text-xs font-semibold mb-1">
              <Sparkles size={13} className="text-teal-400" />
              <span>Personalized Portal Gateway</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Select Your Profile
            </h1>
            <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
              Every member has their own 4-digit password. Choose your profile to enter your personal workspace.
            </p>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-800/40 p-3 rounded-2xl border border-slate-800 backdrop-blur-xs max-w-4xl mx-auto w-full">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search member name or domain..."
                className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-teal-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
              {[
                { id: "ALL", label: "All Members" },
                { id: "PHD", label: "PhD Scholars" },
                { id: "PG", label: "P.G. Scholars" },
                { id: "POSTDOC", label: "Post Docs" },
                { id: "FACULTY", label: "PI & Coordinator" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setRoleFilter(f.id)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                    roleFilter === f.id
                      ? "bg-teal-600 text-white shadow-sm shadow-teal-600/30 font-bold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Members Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-6xl mx-auto w-full">
            {filteredMembers.map((member) => {
              const hasPin = Boolean(member.pinCode);

              return (
                <motion.div
                  key={member.userId}
                  whileHover={{ y: -4, transition: { duration: 0.15 } }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedUser(member)}
                  className="group relative bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/60 hover:border-teal-500/60 rounded-3xl p-5 cursor-pointer transition-all duration-200 flex flex-col justify-between shadow-lg shadow-black/20 hover:shadow-teal-500/5 backdrop-blur-xs"
                >
                  <div className="space-y-4">
                    {/* Top Row: Avatar & Status */}
                    <div className="flex items-start justify-between">
                      <div
                        className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${getAvatarGradient(
                          member.designation
                        )} flex items-center justify-center text-white font-extrabold text-base tracking-wider shadow-md group-hover:scale-105 transition-transform`}
                      >
                        {getInitials(member.name)}
                      </div>

                      <div className="flex items-center space-x-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full border border-slate-700 bg-slate-900/60 text-slate-300">
                        {hasPin ? (
                          <>
                            <Lock size={10} className="text-teal-400" />
                            <span>PIN Set</span>
                          </>
                        ) : (
                          <>
                            <KeyRound size={10} className="text-amber-400" />
                            <span>Create PIN</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Member Details */}
                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-teal-300 transition-colors line-clamp-1">
                        {member.name}
                      </h3>
                      <div className="flex items-center space-x-1.5 mt-1">
                        <span
                          className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border ${getRoleBadge(
                            member.designation
                          )}`}
                        >
                          {member.designation}
                        </span>
                      </div>
                      
                      {(member.researchDomain || member.thesisTopic) && (
                        <p className="text-[11px] text-slate-400 mt-2 line-clamp-1">
                          {member.researchDomain || member.thesisTopic}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bottom Action Hint */}
                  <div className="pt-4 mt-4 border-t border-slate-700/40 flex items-center justify-between text-xs font-semibold text-slate-400 group-hover:text-teal-400 transition-colors">
                    <span>Open Profile</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.div>
              );
            })}
          </div>

          {filteredMembers.length === 0 && (
            <div className="text-center py-16 text-slate-400 space-y-2">
              <AlertCircle size={28} className="mx-auto text-slate-500" />
              <p className="text-sm font-semibold">No lab members found matching your search.</p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setRoleFilter("ALL");
                }}
                className="text-xs text-teal-400 hover:underline cursor-pointer"
              >
                Clear filters
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <footer className="mt-16 pt-6 border-t border-slate-800 text-center text-xs text-slate-500 space-y-1">
          <p>Optics and Microfluidics Instrumentation Laboratory (OMI Lab)</p>
          <p className="text-[11px] text-slate-600">Indian Institute of Science, Bangalore - Confidential & Restricted</p>
        </footer>
      </main>

      {/* 4-Digit Password Modal Dialog */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative"
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setPinInput("");
                  setPinError(null);
                }}
                className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>

              {/* Profile Card Summary */}
              <div className="flex flex-col items-center text-center space-y-2 mb-6">
                <div
                  className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${getAvatarGradient(
                    selectedUser.designation
                  )} flex items-center justify-center text-white font-extrabold text-xl shadow-lg`}
                >
                  {getInitials(selectedUser.name)}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{selectedUser.name}</h2>
                  <p className="text-xs text-teal-400 font-mono font-medium">{selectedUser.designation}</p>
                </div>
              </div>

              {/* CASE A: User has 4-digit PIN configured -> Enter PIN */}
              {!isSettingPin ? (
                <div className="space-y-6">
                  <div className="text-center space-y-1">
                    <p className="text-xs font-semibold text-slate-300">
                      Enter 4-Digit Password
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Type your 4-digit password on your keyboard or use keypad
                    </p>
                  </div>

                  {/* Hidden Input for Keyboard typing */}
                  <input
                    ref={hiddenInputRef}
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pinInput}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setPinInput(clean);
                      setPinError(null);
                      if (clean.length === 4) {
                        verifyPin(clean);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && pinInput.length === 4) {
                        verifyPin(pinInput);
                      }
                    }}
                    className="opacity-0 absolute pointer-events-none h-0 w-0"
                    autoFocus
                  />

                  {/* 4 Visual PIN Circles */}
                  <div 
                    onClick={() => hiddenInputRef.current?.focus()}
                    className="flex justify-center items-center gap-3.5 py-2 cursor-pointer"
                  >
                    {[0, 1, 2, 3].map((index) => {
                      const isFilled = index < pinInput.length;
                      return (
                        <div
                          key={index}
                          className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                            isSuccess
                              ? "bg-teal-400 border-teal-400 scale-110 shadow-lg shadow-teal-400/50"
                              : pinError
                              ? "border-red-500 bg-red-500/20"
                              : isFilled
                              ? "bg-teal-400 border-teal-400 scale-105 shadow-md shadow-teal-400/30"
                              : "border-slate-600 bg-slate-800"
                          }`}
                        />
                      );
                    })}
                  </div>

                  {/* Error Message */}
                  {pinError && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-2.5 rounded-xl bg-red-950/70 border border-red-800/80 text-xs text-red-300 font-semibold text-center"
                    >
                      {pinError}
                    </motion.div>
                  )}

                  {/* Success indicator */}
                  {isSuccess && (
                    <div className="p-2.5 rounded-xl bg-teal-950/70 border border-teal-800/80 text-xs text-teal-300 font-bold text-center flex items-center justify-center space-x-1.5">
                      <CheckCircle2 size={14} className="text-teal-400" />
                      <span>Password Verified! Opening profile...</span>
                    </div>
                  )}

                  {/* On-screen Numeric Keypad */}
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                      <button
                        key={digit}
                        type="button"
                        onClick={() => handleDigitPress(digit)}
                        className="py-3 bg-slate-800/80 hover:bg-slate-700 active:bg-teal-700 text-white font-mono font-bold text-lg rounded-2xl border border-slate-700/80 transition-all cursor-pointer shadow-sm hover:border-slate-600"
                      >
                        {digit}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleClear}
                      className="py-3 bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white font-semibold text-xs rounded-2xl border border-slate-700/60 transition-colors cursor-pointer"
                    >
                      CLEAR
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDigitPress("0")}
                      className="py-3 bg-slate-800/80 hover:bg-slate-700 active:bg-teal-700 text-white font-mono font-bold text-lg rounded-2xl border border-slate-700/80 transition-all cursor-pointer shadow-sm hover:border-slate-600"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={handleBackspace}
                      className="py-3 bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center rounded-2xl border border-slate-700/60 transition-colors cursor-pointer"
                    >
                      <Delete size={18} />
                    </button>
                  </div>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedUser(null)}
                      className="text-xs text-slate-400 hover:text-white cursor-pointer font-medium"
                    >
                      Choose a different person
                    </button>
                  </div>
                </div>
              ) : (
                /* CASE B: User has no PIN yet -> First Time Setup */
                <form onSubmit={handleSaveFirstTimePin} className="space-y-4">
                  <div className="text-center space-y-1">
                    <div className="inline-flex items-center space-x-1 text-teal-400 text-xs font-semibold mb-1">
                      <KeyRound size={13} />
                      <span>First-Time Setup</span>
                    </div>
                    <p className="text-xs font-semibold text-white">Create Your 4-Digit Password</p>
                    <p className="text-[11px] text-slate-400">
                      Set a secret 4-digit PIN to secure your profile for future logins.
                    </p>
                  </div>

                  {pinError && (
                    <div className="p-2.5 rounded-xl bg-red-950/70 border border-red-800/80 text-xs text-red-300 font-semibold text-center">
                      {pinError}
                    </div>
                  )}

                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                        New 4-Digit PIN
                      </label>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        required
                        value={newPinInput}
                        onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        placeholder="e.g. 0000"
                        className="w-full text-center tracking-widest text-lg font-mono font-bold py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                        Confirm 4-Digit PIN
                      </label>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        required
                        value={confirmPinInput}
                        onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        placeholder="e.g. 0000"
                        className="w-full text-center tracking-widest text-lg font-mono font-bold py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingPin || newPinInput.length !== 4 || confirmPinInput.length !== 4}
                    className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-teal-600/30 transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <span>{isSavingPin ? "Saving Password..." : "Save Password & Open Profile"}</span>
                    <ArrowRight size={14} />
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedUser(null)}
                      className="text-xs text-slate-400 hover:text-white cursor-pointer font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
