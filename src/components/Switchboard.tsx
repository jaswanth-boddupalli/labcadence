/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { LabUser, PeerNotification } from "../types";
import ContactActions from "./ContactActions";
import { 
  User, Shield, Briefcase, Bell, Check, Trash2, Lock, Unlock, KeyRound, X, 
  Users, Edit, Plus, UserPlus, Phone, Mail, Award, BookOpen 
} from "lucide-react";

interface SwitchboardProps {
  users: LabUser[];
  activeUserId: string;
  onUserChange: (userId: string) => void;
  onLockProfile?: () => void;
  notifications: PeerNotification[];
  onMarkNotificationAsRead: (notifId: string) => void;
  onClearNotifications: () => void;
  onUpdateUserPin: (userId: string, pin: string | null) => void;
  onAddStudent: (newStudent: Omit<LabUser, "userId" | "rosterStatus">) => void;
  onEditStudent: (userId: string, updatedFields: Partial<LabUser>) => void;
  onDeleteStudent: (userId: string) => void;
  onOpenEmailSettings?: () => void;
}

export default function Switchboard({
  users,
  activeUserId,
  onUserChange,
  onLockProfile,
  notifications,
  onMarkNotificationAsRead,
  onClearNotifications,
  onUpdateUserPin,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  onOpenEmailSettings,
}: SwitchboardProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [isManagingPin, setIsManagingPin] = useState(false);
  const [pinManageError, setPinManageError] = useState<string | null>(null);
  
  const [currentPinInput, setCurrentPinInput] = useState("");
  const [newPinInput, setNewPinInput] = useState("");
  const [confirmPinInput, setConfirmPinInput] = useState("");
  const [isChangingPin, setIsChangingPin] = useState(false);

  // States for unified Member Directory Management (Roster)
  const [isManagingMembers, setIsManagingMembers] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [memberToConfirmDelete, setMemberToConfirmDelete] = useState<LabUser | null>(null);

  // Form states for ADDing a member
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addDesignation, setAddDesignation] = useState<any>("PhD Scholar");
  const [addDomain, setAddDomain] = useState("");
  const [addThesis, setAddThesis] = useState("");
  const [addError, setAddError] = useState("");

  // Form states for EDITing a member
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editDesignation, setEditDesignation] = useState<any>("PhD Scholar");
  const [editDomain, setEditDomain] = useState("");
  const [editThesis, setEditThesis] = useState("");
  const [editError, setEditError] = useState("");

  const activeUser = users.find((u) => u.userId === activeUserId);
  const isCoordinator = activeUserId === "COORD_01" || activeUser?.name === "J" || activeUser?.designation === "Coordinator" || activeUser?.designation?.toLowerCase() === "coordinator";
  const isPI = activeUser?.designation === "Professor (PI)" || activeUserId === "PROF_01";
  const canManageMembers = isCoordinator || isPI;
  const [editPin, setEditPin] = useState("");
  const activeUserNotifications = notifications.filter(
    (n) => n.targetUserId === activeUserId
  );
  const unreadCount = activeUserNotifications.filter((n) => !n.read).length;

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");

    if (!addName.trim()) {
      setAddError("Name is required");
      return;
    }
    if (!addEmail.trim()) {
      setAddError("Email is required");
      return;
    }

    // Check email uniqueness locally
    const emailExists = users.some((u) => u.email.toLowerCase() === addEmail.toLowerCase().trim());
    if (emailExists) {
      setAddError("This email address is already registered to another member.");
      return;
    }

    onAddStudent({
      name: addName.trim(),
      email: addEmail.trim(),
      phoneNumber: addPhone.trim(),
      designation: addDesignation,
      researchDomain: addDomain.trim(),
      thesisTopic: addThesis.trim(),
    });

    // Reset fields
    setAddName("");
    setAddEmail("");
    setAddPhone("");
    setAddDesignation("PhD Scholar");
    setAddDomain("");
    setAddThesis("");
    setIsAddingNew(false);
  };

  const startEditing = (member: LabUser) => {
    if (!isCoordinator && member.userId !== activeUserId) {
      return;
    }
    setEditingMemberId(member.userId);
    setEditName(member.name);
    setEditEmail(member.email);
    setEditPhone(member.phoneNumber || "");
    setEditDesignation(member.designation);
    setEditDomain(member.researchDomain || "");
    setEditThesis(member.thesisTopic || "");
    setEditPin(member.pinCode || "");
    setEditError("");
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError("");

    if (!editingMemberId) return;
    if (!editName.trim()) {
      setEditError("Name is required.");
      return;
    }
    if (!editEmail.trim()) {
      setEditError("Email is required.");
      return;
    }

    // Check duplicates excluding editing member
    const emailDuplicate = users.some(
      (u) => u.userId !== editingMemberId && u.email.toLowerCase() === editEmail.toLowerCase().trim()
    );
    if (emailDuplicate) {
      setEditError("This email is already in use by another roster profile.");
      return;
    }

    if (!isCoordinator && editingMemberId !== activeUserId) {
      setEditError("Access Denied: You may only modify your own profile.");
      return;
    }

    if (editPin && !/^\d{4}$/.test(editPin)) {
      setEditError("PIN password must be exactly 4 digits.");
      return;
    }

    const payload: Partial<LabUser> = {
      name: editName.trim(),
      email: editEmail.trim(),
      phoneNumber: editPhone.trim(),
      researchDomain: editDomain.trim(),
      thesisTopic: editThesis.trim(),
      pinCode: editPin ? editPin.trim() : undefined,
    };

    if (isCoordinator) {
      payload.designation = editDesignation;
    }

    onEditStudent(editingMemberId, payload);
    setEditingMemberId(null);
  };

  const handleDeleteClick = (userId: string) => {
    onDeleteStudent(userId);
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-xs non-printable">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center min-h-[5rem] gap-4">
          
          {/* Logo and App Title */}
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center space-x-3">
              <div className="h-11 w-11 rounded-xl bg-teal-800 flex items-center justify-center text-white shadow-md shadow-teal-800/10 transition-transform hover:scale-105 shrink-0">
                <span className="font-sans font-bold text-lg tracking-wider">OMI</span>
              </div>
              <div>
                <h1 className="font-sans font-semibold text-lg text-slate-900 tracking-tight leading-none">
                  OMI
                </h1>
                <span className="text-[11px] font-mono font-medium text-teal-700 uppercase tracking-widest bg-teal-50 px-1.5 py-0.5 rounded mt-1 inline-block">
                  Operations Engine
                </span>
              </div>
            </div>
            {/* Mobile notification bell could go here, but let's keep it in the flex wrap below */}
          </div>

          {/* Persona Switchboard Selector & Unified MemberDirectory Trigger */}
          <div className="flex flex-wrap items-center gap-3 md:gap-3.5">
            
            {/* Active View: Only visible for Coordinator */}
            {isCoordinator && (
              <div className="flex items-center space-x-1 sm:space-x-2 bg-slate-100 p-1 sm:p-1.5 rounded-2xl border border-slate-200">
                <span className="hidden sm:inline text-xs font-semibold text-slate-500 px-2 font-sans select-none">
                  Active View:
                </span>
                <select
                  id="persona-selector"
                  value={activeUserId}
                  onChange={(e) => onUserChange(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl text-[11px] sm:text-xs font-bold text-slate-800 py-1.5 px-2 sm:px-3 focus:outline-none focus:ring-1 focus:ring-teal-700 cursor-pointer shadow-xs transition-all hover:bg-slate-5"
                >
                  {users.map((u) => (
                    <option key={u.userId} value={u.userId}>
                      {u.name} ({u.designation}) {u.rosterStatus === "ARCHIVED" ? "[Archived]" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Incredibly Visible Simple Button: "Manage Members" / Roster */}
            {canManageMembers && (
              <button
                id="header-manage-members-btn"
                onClick={() => {
                  setIsManagingMembers(true);
                  setIsAddingNew(false);
                  setEditingMemberId(null);
                  setAddError("");
                  setEditError("");
                }}
                className="bg-teal-800 hover:bg-teal-900 text-white transition-all text-[11px] sm:text-xs font-bold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl flex items-center space-x-1.5 cursor-pointer shadow-sm border border-teal-950 font-sans"
                title="Add, edit member emails & profile details, or manage lab directory"
              >
                <Users size={14} />
                <span className="hidden sm:inline">Manage Members</span>
                <span className="sm:hidden">Roster</span>
              </button>
            )}

            {/* PI Email Alert System Button: Only visible in Coordinator profile */}
            {isCoordinator && onOpenEmailSettings && (
              <button
                id="pi-email-alerts-btn"
                onClick={onOpenEmailSettings}
                className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-teal-800 hover:bg-teal-50 hover:border-teal-200 transition-all cursor-pointer relative shadow-xs"
                title="PI Email Alert Notification Control Center"
              >
                <Mail size={18} />
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-600"></span>
                </span>
              </button>
            )}

            {/* Notifications Alert Center */}
            <div className="relative">
              <button
                id="bell-notifications-btn"
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2.5 rounded-xl border transition-all relative cursor-pointer ${
                  unreadCount > 0
                    ? "border-teal-200 bg-teal-50/50 text-teal-800 hover:bg-teal-50"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
                title="Peer Mentions & Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-white animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Pane */}
              {showNotifications && (
                <div className="absolute -right-2 sm:right-0 mt-3 w-72 sm:w-80 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden z-50">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800 font-sans tracking-tight">
                      Alert Feed ({activeUserNotifications.length})
                    </span>
                    {activeUserNotifications.length > 0 && (
                      <button
                        onClick={onClearNotifications}
                        className="text-[10px] text-red-600 hover:text-red-700 font-semibold flex items-center space-x-1 cursor-pointer"
                      >
                        <Trash2 size={11} />
                        <span>Clear All</span>
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {activeUserNotifications.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 font-sans">
                        <p className="text-xs">No active notification logs.</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          When peer scholars mention you using "@" in documents, alerts register here.
                        </p>
                      </div>
                    ) : (
                      activeUserNotifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-3.5 transition-colors ${
                            n.read ? "bg-white" : "bg-teal-50/20 hover:bg-teal-50/40"
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-mono text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded font-bold">
                              Peer Mention
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(n.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-900 mt-1.5 font-sans leading-tight">
                            {n.senderName} uploaded a document
                          </p>
                          <p className="text-[11px] text-slate-600 italic mt-0.5 font-sans">
                            &ldquo;{n.docTitle}&rdquo;
                          </p>
                          <p className="text-[10px] text-slate-500 bg-slate-50 border border-slate-100 rounded-lg p-2 mt-2 leading-relaxed font-mono">
                            {n.summarySnippet}
                          </p>
                          {!n.read && (
                            <button
                              onClick={() => onMarkNotificationAsRead(n.id)}
                              className="mt-2.5 text-[9px] font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-md flex items-center space-x-1 cursor-pointer"
                            >
                              <Check size={10} />
                              <span>Dismiss Alert</span>
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar Badge */}
            <div className="flex items-center space-x-2.5 border-l border-slate-200 pl-4 select-none">
              <div className="h-10 w-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shadow-inner">
                {activeUser?.designation === "Professor (PI)" ? (
                  <Shield size={18} className="text-teal-800" />
                ) : activeUser?.designation === "Coordinator" ? (
                  <Briefcase size={18} className="text-blue-700" />
                ) : (
                  <User size={18} className="text-emerald-700" />
                )}
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-bold text-slate-900 leading-tight">
                  {activeUser?.name}
                </p>
                <div className="flex items-center space-x-2 mt-0.5">
                  <p className="text-[10px] font-medium text-slate-400 capitalize">
                    {activeUser?.designation}
                  </p>
                  <button
                    id="manage-pin-btn"
                    onClick={() => {
                      setIsManagingPin(true);
                      setPinManageError(null);
                      setCurrentPinInput("");
                      setNewPinInput("");
                      setConfirmPinInput("");
                      setIsChangingPin(false);
                    }}
                    className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                      activeUser?.pinCode 
                        ? "bg-amber-100 text-amber-805 hover:bg-amber-200 border border-amber-300"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 border border-slate-200"
                    }`}
                    title={activeUser?.pinCode ? "Lock Active — Manage security configuration" : "No LOCK — Configure optional 4-digit PIN lock"}
                  >
                    {activeUser?.pinCode ? "🔒 PIN" : "🔑 PIN"}
                  </button>

                  <button
                    id="header-edit-profile-btn"
                    onClick={() => {
                      if (activeUser) {
                        startEditing(activeUser);
                        setIsManagingMembers(true);
                      }
                    }}
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded transition-all cursor-pointer bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200 flex items-center space-x-1"
                    title="Edit my email address, phone number, and profile details"
                  >
                    <Edit size={10} />
                    <span>Edit Profile</span>
                  </button>
                </div>
              </div>

              {onLockProfile && (
                <button
                  id="header-switch-profile-btn"
                  onClick={onLockProfile}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center space-x-1.5 cursor-pointer shadow-xs transition-colors shrink-0 ml-1 sm:ml-2"
                  title="Switch Profile / Return to Profile Selection"
                >
                  <Lock size={12} className="text-teal-400" />
                  <span className="hidden sm:inline">Switch Profile</span>
                  <span className="sm:hidden">Lock</span>
                </button>
              )}
            </div>

          </div>

        </div>
      </div>

      {/* Directory Management Dialog (Incredibly simple and layman-friendly layout) */}
      {isManagingMembers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-scaleUp font-sans">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center select-none">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 leading-none flex items-center space-x-2">
                  <Users size={18} className="text-teal-800" />
                  <span>Lab Member Directory Roster</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1.5">
                  Add, edit detail structures, or delete faculty, student coordinators, and scholars list.
                </p>
              </div>
              <button
                onClick={() => setIsManagingMembers(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable workspace */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* Trigger Toggle: Add New form vs List */}
              {!isAddingNew && !editingMemberId && isCoordinator && (
                <div className="flex justify-end select-none">
                  <button
                    onClick={() => {
                      setIsAddingNew(true);
                      setAddError("");
                    }}
                    className="bg-teal-50 hover:bg-teal-100 text-teal-850 hover:text-teal-900 font-bold text-xs px-3.5 py-2 rounded-xl flex items-center space-x-1 border border-teal-200 cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add New Member</span>
                  </button>
                </div>
              )}

              {/* ADD NEW MEMBER DIRECTORY FORM */}
              {isAddingNew && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 animate-scaleUp">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center space-x-1">
                      <UserPlus size={13} className="text-teal-800" />
                      <span>Enter New Member Details</span>
                    </h4>
                    <button 
                      onClick={() => setIsAddingNew(false)}
                      className="text-slate-400 hover:text-slate-600 text-[11px] font-bold cursor-pointer"
                    >
                      Cancel Form
                    </button>
                  </div>

                  {addError && (
                    <div className="bg-red-50 border border-red-200 text-red-800 text-[11px] font-semibold p-2.5 rounded-lg">
                      {addError}
                    </div>
                  )}

                  <form onSubmit={handleAddSubmit} className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">First & Last Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Dr. Arthur Pendragon"
                          value={addName}
                          onChange={(e) => setAddName(e.target.value)}
                          className="w-full text-xs font-semibold p-2.5 bg-white border border-slate-200 rounded-xl focus:border-teal-700 focus:ring-1 focus:ring-teal-700 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Email Address</label>
                        <input
                          type="email"
                          required
                          placeholder="e.g. arthur.p@labpulse.edu"
                          value={addEmail}
                          onChange={(e) => setAddEmail(e.target.value)}
                          className="w-full text-xs font-semibold p-2.5 bg-white border border-slate-200 rounded-xl focus:border-teal-700 focus:ring-1 focus:ring-teal-700 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Designation / Role</label>
                        <select
                          required
                          value={addDesignation}
                          onChange={(e) => setAddDesignation(e.target.value as any)}
                          className="w-full text-xs font-bold p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer focus:border-teal-700 focus:outline-none"
                        >
                          <option value="Professor (PI)">Professor (PI) - Faculty Member</option>
                          <option value="Coordinator">Coordinator - Laboratory Manager</option>
                          <option value="PhD Scholar">PhD (Doctor of Philosophy Scholar)</option>
                          <option value="P.G. Scholar">P.G. (Post-Graduate Master student)</option>
                          <option value="U.G. Scholar">U.G. (Under-Graduate Bachelor student)</option>
                          <option value="Post Doc">Post Doc (Post-Doctoral Fellow Researcher)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase font-sans">Contact Phone (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. 555-010-3300"
                          value={addPhone}
                          onChange={(e) => setAddPhone(e.target.value)}
                          className="w-full text-xs font-semibold p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">
                        Area of Study / Department Specialty
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Analytical Biochemistry, CRISPR Gene Editing"
                        value={addDomain}
                        onChange={(e) => setAddDomain(e.target.value)}
                        className="w-full text-xs font-semibold p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase font-sans">
                        Primary Thesis / Lab Role Objective Description
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Overseeing chemical synthesis pipelines, bio-reactor modeling, or primary student thesis focus"
                        value={addThesis}
                        onChange={(e) => setAddThesis(e.target.value)}
                        className="w-full text-xs font-medium p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none"
                      />
                    </div>

                    <div className="flex justify-end pt-2 space-x-2.5">
                      <button
                        type="button"
                        onClick={() => setIsAddingNew(false)}
                        className="px-4 py-2 hover:bg-slate-200 border border-slate-250 text-slate-650 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-teal-800 hover:bg-teal-900 border border-teal-950 text-white px-5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                      >
                        Save & Add Member
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* EDIT EXISTING MEMBER FORM */}
              {editingMemberId && (
                <div className="bg-indigo-50/50 border border-indigo-200 rounded-2xl p-5 space-y-4 animate-scaleUp">
                  <div className="flex justify-between items-center border-b border-indigo-200 pb-2">
                    <h4 className="text-xs font-extrabold text-indigo-900 uppercase tracking-wider flex items-center space-x-1">
                      <Edit size={13} className="text-indigo-800" />
                      <span>Edit Member Profile (ID: {editingMemberId})</span>
                    </h4>
                    <button 
                      onClick={() => setEditingMemberId(null)}
                      className="text-indigo-500 hover:text-indigo-700 text-[11px] font-bold cursor-pointer"
                    >
                      Cancel Edit
                    </button>
                  </div>

                  {editError && (
                    <div className="bg-red-50 border border-red-200 text-red-800 text-[11px] font-semibold p-2.5 rounded-lg">
                      {editError}
                    </div>
                  )}

                  <form onSubmit={handleEditSubmit} className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">First & Last Name</label>
                        <input
                          type="text"
                          required
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full text-xs font-semibold p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Email Address</label>
                        <input
                          type="email"
                          required
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="w-full text-xs font-semibold p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-slate-500 uppercase font-sans">Designation / Role</label>
                          {!isCoordinator && (
                            <span className="text-[9px] text-amber-700 font-bold">Only Coordinator J can modify</span>
                          )}
                        </div>
                        <select
                          required
                          disabled={!isCoordinator}
                          value={editDesignation}
                          onChange={(e) => setEditDesignation(e.target.value as any)}
                          className={`w-full text-xs font-bold p-2.5 border border-slate-200 rounded-xl focus:outline-none ${
                            !isCoordinator ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white cursor-pointer'
                          }`}
                        >
                          <option value="Professor (PI)">Professor (PI) - Faculty Member</option>
                          <option value="Coordinator">Coordinator - Laboratory Manager</option>
                          <option value="PhD Scholar">PhD (Doctor of Philosophy Scholar)</option>
                          <option value="P.G. Scholar">P.G. (Post-Graduate Master student)</option>
                          <option value="U.G. Scholar">U.G. (Under-Graduate Bachelor student)</option>
                          <option value="Post Doc">Post Doc (Post-Doctoral Fellow Researcher)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase font-sans">Contact Phone (Optional)</label>
                        <input
                          type="text"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          className="w-full text-xs font-semibold p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase font-sans">Area of Study / Department Specialty</label>
                      <input
                        type="text"
                        value={editDomain}
                        onChange={(e) => setEditDomain(e.target.value)}
                        className="w-full text-xs font-semibold p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Primary Thesis / Lab Role Objective Description</label>
                      <textarea
                        rows={2}
                        value={editThesis}
                        onChange={(e) => setEditThesis(e.target.value)}
                        className="w-full text-xs font-medium p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1 bg-teal-50/50 border border-teal-200 p-3 rounded-xl">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-teal-900 uppercase font-mono tracking-wider">
                          Private 4-Digit Password / PIN
                        </label>
                        <span className="text-[9px] text-teal-700 font-bold">
                          {isCoordinator ? "Coordinator can reset any scholar's PIN" : "Secures your private view"}
                        </span>
                      </div>
                      <input
                        type="password"
                        maxLength={4}
                        placeholder={editPin ? "•••• (Configured - enter new 4 digits to change)" : "Create 4-digit PIN password"}
                        value={editPin}
                        onChange={(e) => setEditPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        className="w-full text-xs font-mono font-bold p-2.5 bg-white border border-teal-300 rounded-lg focus:outline-none tracking-widest text-center"
                      />
                    </div>

                    <div className="flex justify-end pt-2 space-x-2.5">
                      <button
                        type="button"
                        onClick={() => setEditingMemberId(null)}
                        className="px-4 py-2 hover:bg-slate-200 border border-slate-250 text-slate-650 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-700 border border-indigo-805 text-white px-5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                      >
                        Save Member Changes
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* EXTREMELY CLEAR ROSTER LIST */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                  Registered Members Directory list ({users.length})
                </h4>

                <div className="divide-y divide-slate-150 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                  {users.map((member) => (
                    <div 
                      key={member.userId} 
                      className={`p-4 hover:bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition-colors ${
                        editingMemberId === member.userId ? "bg-indigo-50/25" : ""
                      }`}
                    >
                      {/* Left: Metadata */}
                      <div className="space-y-2 select-none">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${member.rosterStatus === "ARCHIVED" ? "bg-slate-300" : "bg-emerald-500"}`}></span>
                          <span className="text-xs font-extrabold text-slate-900">{member.name}</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                            member.designation === "Professor (PI)"
                              ? "bg-rose-50 text-rose-800 border-rose-100"
                              : member.designation === "Coordinator"
                                ? "bg-blue-50 text-blue-800 border-blue-100"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}>
                            {member.designation}
                          </span>
                          <span className="text-[9px] font-mono text-slate-400 block">ID: {member.userId}</span>
                          {member.userId === activeUserId && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 border border-teal-200">
                              Your Account
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                          <span className="flex items-center space-x-1">
                            <Mail size={11} className="text-slate-400" />
                            <span>{member.email}</span>
                          </span>
                          {member.phoneNumber && (
                            <span className="flex items-center space-x-1">
                              <Phone size={11} className="text-slate-400" />
                              <span>{member.phoneNumber}</span>
                            </span>
                          )}
                          {member.researchDomain && (
                            <span className="flex items-center space-x-1">
                              <Award size={11} className="text-slate-400" />
                              <span>{member.researchDomain}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Layman Options (EDIT & DELETE) */}
                      <div className="flex items-center space-x-2 shrink-0 md:justify-end select-none">
                        <ContactActions
                          name={member.name}
                          email={member.email}
                          phoneNumber={member.phoneNumber}
                          compact={true}
                          onEditRequested={() => startEditing(member)}
                        />
                        {/* Edit: Only Coordinator or the individual themselves */}
                        {(isCoordinator || member.userId === activeUserId) && (
                          <button
                            id={`header-edit-${member.userId}`}
                            type="button"
                            onClick={() => startEditing(member)}
                            className={`border p-2.5 rounded-xl transition-all cursor-pointer font-sans text-xs font-bold flex items-center space-x-1 ${
                              member.userId === activeUserId
                                ? 'bg-teal-50 border-teal-300 text-teal-800 hover:bg-teal-100 shadow-xs'
                                : 'bg-slate-50 border-slate-250 hover:bg-slate-100 text-slate-650 hover:text-slate-900'
                            }`}
                            title={member.userId === activeUserId ? "Edit my profile" : "Edit member details"}
                          >
                            <Edit size={13} />
                            <span className="hidden sm:inline">{member.userId === activeUserId ? "Edit Profile" : "Edit"}</span>
                          </button>
                        )}
                        {/* Delete: Only Coordinator J */}
                        {isCoordinator && (
                          <button
                            id={`header-delete-${member.userId}`}
                            type="button"
                            onClick={() => {
                              setMemberToConfirmDelete(member);
                            }}
                            className="bg-rose-50 border border-rose-250 hover:bg-rose-100 p-2.5 rounded-xl text-rose-700 hover:text-rose-800 transition-all cursor-pointer font-sans text-xs font-bold flex items-center space-x-1"
                            title="Delete member"
                          >
                            <Trash2 size={13} />
                            <span className="hidden sm:inline">Delete</span>
                          </button>
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Footer shadow border */}
            <div className="p-4 bg-slate-50 border-t border-slate-150 flex justify-end">
              <button
                onClick={() => setIsManagingMembers(false)}
                className="bg-slate-800 text-white hover:bg-slate-900 text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer transition-colors"
              >
                Close Directory
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal Backdrop and Card for managing user PIN */}
      {isManagingPin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xs w-full p-6 border border-slate-200 shadow-2xl relative animate-scaleUp">
            
            <button
              onClick={() => setIsManagingPin(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="flex items-center space-x-2.5 mb-4 select-none">
              <div className="p-2 bg-amber-50 rounded-xl border border-amber-200 text-amber-700">
                <KeyRound size={20} />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-slate-900 tracking-tight font-display">
                  Profile Passcode Guard
                </h3>
                <p className="text-[9px] text-slate-400 font-medium">
                  {activeUser?.pinCode ? "Verify current credential to adjust lock status" : "Establish an optional digit lock code"}
                </p>
              </div>
            </div>

            {pinManageError && (
              <div className="p-2.5 mb-4 rounded-xl bg-red-50 border border-red-200 text-[10px] text-red-800 font-bold">
                {pinManageError}
              </div>
            )}

            <div className="space-y-4 font-sans">
              {/* If PIN is already active */}
              {activeUser?.pinCode ? (
                <>
                  {!isChangingPin ? (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold block">
                          Current 4-Digit PIN
                        </label>
                        <input
                          id="current-pin-verify"
                          type="password"
                          pattern="[0-9]*"
                          inputMode="numeric"
                          maxLength={4}
                          value={currentPinInput}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                            setCurrentPinInput(val);
                          }}
                          placeholder="••••"
                          className="w-full text-center tracking-widest text-lg font-mono font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (currentPinInput !== activeUser.pinCode) {
                              setPinManageError("Incorrect PIN entered.");
                              return;
                            }
                            setPinManageError(null);
                            setIsChangingPin(true);
                            setNewPinInput("");
                            setConfirmPinInput("");
                          }}
                          className="flex-1 py-2.5 px-3 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold border border-teal-950 shadow-sm cursor-pointer transition-colors"
                        >
                          Modify PIN
                        </button>
                        <button
                          onClick={() => {
                            if (currentPinInput !== activeUser.pinCode) {
                              setPinManageError("Incorrect PIN entered.");
                              return;
                            }
                            onUpdateUserPin(activeUserId, null);
                            setIsManagingPin(false);
                          }}
                          className="py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-750 border border-red-200 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold block">
                          New 4-Digit PIN
                        </label>
                        <input
                          id="new-pin-input-change"
                          type="password"
                          pattern="[0-9]*"
                          inputMode="numeric"
                          maxLength={4}
                          value={newPinInput}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                            setNewPinInput(val);
                          }}
                          placeholder="••••"
                          className="w-full text-center tracking-widest text-lg font-mono font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold block">
                          Confirm New PIN
                        </label>
                        <input
                          id="confirm-pin-input-change"
                          type="password"
                          pattern="[0-9]*"
                          inputMode="numeric"
                          maxLength={4}
                          value={confirmPinInput}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                            setConfirmPinInput(val);
                          }}
                          placeholder="••••"
                          className="w-full text-center tracking-widest text-lg font-mono font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                        />
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => setIsChangingPin(false)}
                          className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold border border-slate-200 cursor-pointer transition-colors"
                        >
                          Back
                        </button>
                        <button
                          onClick={() => {
                            if (!/^\d{4}$/.test(newPinInput)) {
                              setPinManageError("PIN must be exactly 4 digits.");
                              return;
                            }
                            if (newPinInput !== confirmPinInput) {
                              setPinManageError("Confirm PIN does not match.");
                              return;
                            }
                            onUpdateUserPin(activeUserId, newPinInput);
                            setIsManagingPin(false);
                          }}
                          className="flex-1 py-2.5 px-3 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold border border-teal-950 shadow-sm cursor-pointer transition-colors"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold block">
                      Create 4-Digit PIN Code
                    </label>
                    <input
                      id="new-pin-setup"
                      type="password"
                      pattern="[0-9]*"
                      inputMode="numeric"
                      maxLength={4}
                      value={newPinInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                        setNewPinInput(val);
                      }}
                      placeholder="••••"
                      className="w-full text-center tracking-widest text-lg font-mono font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold block">
                      Confirm PIN Code
                    </label>
                    <input
                      id="confirm-pin-setup"
                      type="password"
                      pattern="[0-9]*"
                      inputMode="numeric"
                      maxLength={4}
                      value={confirmPinInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                        setConfirmPinInput(val);
                      }}
                      placeholder="••••"
                      className="w-full text-center tracking-widest text-lg font-mono font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                    />
                  </div>

                  <button
                    onClick={() => {
                      if (!/^\d{4}$/.test(newPinInput)) {
                        setPinManageError("PIN must be exactly 4 digits.");
                        return;
                      }
                      if (newPinInput !== confirmPinInput) {
                        setPinManageError("PINs do not match.");
                        return;
                      }
                      onUpdateUserPin(activeUserId, newPinInput);
                      setIsManagingPin(false);
                    }}
                    className="w-full py-2.5 px-4 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold border border-teal-950 shadow-md cursor-pointer transition-colors"
                  >
                    Activate Profile Lock
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
      {/* Member Deletion Confirmation Modal */}
      {memberToConfirmDelete && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center z-[100] p-4 text-left">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex items-start space-x-3 text-red-650">
              <div className="p-3 bg-red-50 rounded-2xl border border-red-100 text-red-700 shrink-0">
                <Trash2 size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-955 uppercase tracking-wider font-mono">
                  Delete Lab Member?
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 font-sans leading-relaxed">
                  Are you absolutely sure you want to delete <strong className="text-slate-800">{memberToConfirmDelete.name}</strong>? This will delete all associated records.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 space-x-2">
              <button
                type="button"
                onClick={() => setMemberToConfirmDelete(null)}
                className="px-3.5 py-2 hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-member-btn"
                type="button"
                onClick={() => {
                  handleDeleteClick(memberToConfirmDelete.userId);
                  setMemberToConfirmDelete(null);
                }}
                className="bg-red-700 hover:bg-red-800 border border-red-955 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Yes, Delete Member
              </button>
            </div>
          </div>
        </div>
      )}

    </header>
  );
}
