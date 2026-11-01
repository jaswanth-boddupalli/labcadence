/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import ContactActions from "./ContactActions";
import { LabUser, LabTask, LabMeeting, StatusMetric, UserRole, LabDocument, DocClass } from "../types";
import { 
  UserPlus, Archive, Calendar, Users, AlertTriangle, CheckCircle2, Circle, 
  Search, ShieldAlert, ArrowRight, BookOpen, Clock, Tag, Edit, Trash2,
  Upload, Paperclip, RefreshCcw, FileText
} from "lucide-react";

interface CoordinatorBridgeProps {
  users: LabUser[];
  tasks: LabTask[];
  meetings: LabMeeting[];
  onAddStudent: (student: Omit<LabUser, "userId" | "rosterStatus">) => void;
  onArchiveStudent: (userId: string) => void;
  onUnarchiveStudent?: (userId: string) => void;
  onScheduleMeeting: (meeting: Omit<LabMeeting, "meetingId">) => void;
  onDeleteMeeting?: (meetingId: string) => void;
  onEditMeeting?: (meetingId: string, updated: Partial<LabMeeting>) => void;
  onEditStudent?: (userId: string, updated: Partial<LabUser>) => void;
  onDeleteStudent?: (userId: string) => void;
  documents?: LabDocument[];
  onUploadDoc?: (taskId: string | undefined, docClass: DocClass, storageUrl: string, fileTitle: string, description: string, studentId?: string) => void;
}

export default function CoordinatorBridge({
  users,
  tasks,
  meetings,
  onAddStudent,
  onArchiveStudent,
  onUnarchiveStudent,
  onScheduleMeeting,
  onDeleteMeeting,
  onEditMeeting,
  onEditStudent,
  onDeleteStudent,
  documents = [],
  onUploadDoc,
}: CoordinatorBridgeProps) {
  
  // Search state for auditing
  const [searchTerm, setSearchTerm] = useState("");

  // Add Scholar States
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSchName, setNewSchName] = useState("");
  const [newSchEmail, setNewSchEmail] = useState("");
  const [newSchPhone, setNewSchPhone] = useState("");
  const [newSchDomain, setNewSchDomain] = useState("");
  const [newSchThesis, setNewSchThesis] = useState("");
  const [newSchDesignation, setNewSchDesignation] = useState<UserRole>("PhD Scholar");
  const [formError, setFormError] = useState("");

  // Edit Scholar States
  const [editingStudent, setEditingStudent] = useState<LabUser | null>(null);
  const [editSchName, setEditSchName] = useState("");
  const [editSchEmail, setEditSchEmail] = useState("");
  const [editSchPhone, setEditSchPhone] = useState("");
  const [editSchDomain, setEditSchDomain] = useState("");
  const [editSchThesis, setEditSchThesis] = useState("");
  const [editSchDesignation, setEditSchDesignation] = useState<UserRole>("PhD Scholar");

  // Delete Scholar Confirmation States
  const [studentToConfirmDelete, setStudentToConfirmDelete] = useState<LabUser | null>(null);

  // Direct Document Attachment per Scholar States
  const [uploadingForStudent, setUploadingForStudent] = useState<LabUser | null>(null);
  const [directDocTitle, setDirectDocTitle] = useState("");
  const [directDocClass, setDirectDocClass] = useState<DocClass>("Research Article");
  const [directDocUrl, setDirectDocUrl] = useState("");
  const [directDocDesc, setDirectDocDesc] = useState("");
  const [directLocalFile, setDirectLocalFile] = useState<File | null>(null);
  const [isDirectDocDragging, setIsDirectDocDragging] = useState(false);

  const startEditingStudent = (student: LabUser) => {
    setEditingStudent(student);
    setEditSchName(student.name);
    setEditSchEmail(student.email);
    setEditSchPhone(student.phoneNumber);
    setEditSchDomain(student.researchDomain || "");
    setEditSchThesis(student.thesisTopic || "");
    setEditSchDesignation(student.designation);
  };

  const handleSaveStudentEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !editSchName.trim()) return;
    if (onEditStudent) {
      onEditStudent(editingStudent.userId, {
        name: editSchName.trim(),
        email: editSchEmail.trim().toLowerCase(),
        phoneNumber: editSchPhone.trim() || "+1 (555) 000-0000",
        researchDomain: editSchDomain.trim() || undefined,
        thesisTopic: editSchThesis.trim() || undefined,
        designation: editSchDesignation,
      });
    }
    setEditingStudent(null);
  };

  const handleConfirmDeleteStudent = () => {
    if (studentToConfirmDelete && onDeleteStudent) {
      onDeleteStudent(studentToConfirmDelete.userId);
    }
    setStudentToConfirmDelete(null);
  };

  const handleDirectDocSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadingForStudent || !directDocTitle.trim()) return;
    if (onUploadDoc) {
      let generatedUrl = directDocUrl.trim();
      if (directLocalFile) {
        try {
          generatedUrl = URL.createObjectURL(directLocalFile);
        } catch (_) {
          generatedUrl = `https://labpulse.drive/local-uploads/${encodeURIComponent(directLocalFile.name)}`;
        }
      }
      
      if (!generatedUrl) {
        generatedUrl = `https://labpulse.drive/assets/${directDocTitle.toLowerCase().replace(/\s+/g, "-")}.pdf`;
      }

      onUploadDoc(
        undefined, // No task ID
        directDocClass,
        generatedUrl,
        directDocTitle.trim(),
        directDocDesc.trim(),
        uploadingForStudent.userId // Selected Student Id
      );
    }
    setUploadingForStudent(null);
    setDirectDocTitle("");
    setDirectDocClass("Research Article");
    setDirectDocUrl("");
    setDirectDocDesc("");
    setDirectLocalFile(null);
    setIsDirectDocDragging(false);
  };

  // Schedule States
  const [showSchedForm, setShowSchedForm] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [schedDate, setSchedDate] = useState("2026-06-18");
  const [schedTime, setSchedTime] = useState("10:00");
  const [schedNotes, setSchedNotes] = useState("");
  const [schedOrganizerId, setSchedOrganizerId] = useState("");

  // Edit/Delete Meeting state hooks
  const [editingMeeting, setEditingMeeting] = useState<LabMeeting | null>(null);
  const [editMeetDate, setEditMeetDate] = useState("");
  const [editMeetTime, setEditMeetTime] = useState("");
  const [editMeetNotes, setEditMeetNotes] = useState("");
  const [meetingToConfirmDelete, setMeetingToConfirmDelete] = useState<LabMeeting | null>(null);

  const startEditingMeeting = (meet: LabMeeting) => {
    setEditingMeeting(meet);
    const dateObj = new Date(meet.scheduledTimestamp);
    setEditMeetDate(dateObj.toISOString().split("T")[0]);
    const hours = String(dateObj.getHours()).padStart(2, "0");
    const minutes = String(dateObj.getMinutes()).padStart(2, "0");
    setEditMeetTime(`${hours}:${minutes}`);
    setEditMeetNotes(meet.agendaNotes);
  };

  const handleSaveMeetEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeeting) return;
    const fullTimestamp = new Date(`${editMeetDate}T${editMeetTime}`).getTime();
    if (onEditMeeting) {
      onEditMeeting(editingMeeting.meetingId, {
        scheduledTimestamp: fullTimestamp,
        agendaNotes: editMeetNotes.trim(),
      });
    }
    setEditingMeeting(null);
  };

  const handleConfirmDeleteMeet = () => {
    if (meetingToConfirmDelete && onDeleteMeeting) {
      onDeleteMeeting(meetingToConfirmDelete.meetingId);
    }
    setMeetingToConfirmDelete(null);
  };

  const activeScholars = users.filter(
    (u) => u.rosterStatus === "ACTIVE"
  );
  const archivedScholars = users.filter(
    (u) => u.rosterStatus === "ARCHIVED"
  );

  const handleAddStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    // Validate email uniqueness
    const emailExists = users.some(
      (u) => u.email.trim().toLowerCase() === newSchEmail.trim().toLowerCase()
    );
    if (emailExists) {
      setFormError("Crucial Mutation Block: A researcher profile with this unique email already exists.");
      return;
    }

    onAddStudent({
      name: newSchName.trim(),
      email: newSchEmail.trim().toLowerCase(),
      phoneNumber: newSchPhone.trim() || "+1 (555) 000-0000",
      researchDomain: newSchDomain.trim() || undefined,
      thesisTopic: newSchThesis.trim() || undefined,
      designation: newSchDesignation,
    });

    // Reset Form
    setNewSchName("");
    setNewSchEmail("");
    setNewSchPhone("");
    setNewSchDomain("");
    setNewSchThesis("");
    setNewSchDesignation("PhD Scholar");
    setShowAddForm(false);
  };

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskId || !schedOrganizerId) return;

    const fullTimestamp = new Date(`${schedDate}T${schedTime}`).getTime();

    onScheduleMeeting({
      associatedTaskId: selectedTaskId,
      organizerId: schedOrganizerId,
      scheduledTimestamp: fullTimestamp,
      agendaNotes: schedNotes.trim() || "Milestone progress and feedback evaluation review.",
    });

    setSelectedTaskId("");
    setSchedNotes("");
    setShowSchedForm(false);
  };

  // Quick metrics calculations
  const totalTasks = tasks.length;
  const redTasks = tasks.filter((t) => t.currentStatus === "RED").length;
  const yellowTasks = tasks.filter((t) => t.currentStatus === "YELLOW").length;
  const approvedTasks = tasks.filter((t) => t.professorReviewStatus === "Approved").length;

  return (
    <div className="space-y-8 font-sans">
      
      {/* Title Header Section */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <Users className="text-blue-700" size={24} />
            <span>Coordinator Bridge Control Panel</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Perform roster mutations, manage academic admissions or archiving, schedule presentation boards, and run multi-profile timeline audits.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
          <button
            id="open-add-student-btn"
            onClick={() => setShowAddForm(true)}
            className="bg-teal-800 text-white hover:bg-teal-900 transition-all text-xs font-bold px-4 py-2 rounded-xl flex items-center space-x-2 border border-teal-900 shadow-sm cursor-pointer"
          >
            <UserPlus size={14} />
            <span>Add New Member Profile</span>
          </button>
          <button
            id="open-scheduling-btn-comp"
            onClick={() => setShowSchedForm(true)}
            className="bg-indigo-700 text-white hover:bg-indigo-800 transition-all text-xs font-bold px-4 py-2 rounded-xl flex items-center space-x-2 border border-indigo-800 shadow-sm cursor-pointer"
          >
            <Calendar size={14} />
            <span>Schedule Presentation Meeting</span>
          </button>
        </div>
      </div>

      {/* Roster Add Mutator Modal Form */}
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex justify-between items-start pb-2 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-bold text-slate-900 tracking-tight leading-none">
                  Add New Member to Directory
                </h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Admit coordinators, faculty, or scholars into the active laboratory roster.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setFormError("");
                }}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800 flex items-start space-x-2 font-semibold">
                <ShieldAlert size={16} className="text-red-700 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddStudentSubmit} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                  <input
                    id="new-student-name"
                    type="text"
                    required
                    placeholder="e.g., Jennifer Lawrence"
                    value={newSchName}
                    onChange={(e) => setNewSchName(e.target.value)}
                    className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Contact Number</label>
                  <input
                    id="new-student-phone"
                    type="text"
                    placeholder="+1 (555) 302-1200"
                    value={newSchPhone}
                    onChange={(e) => setNewSchPhone(e.target.value)}
                    className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Role / Designation</label>
                  <select
                    id="new-student-designation"
                    required
                    value={newSchDesignation}
                    onChange={(e) => setNewSchDesignation(e.target.value as any)}
                    className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                  >
                    <option value="Professor (PI)">Professor (PI)</option>
                    <option value="Coordinator">Coordinator</option>
                    <option value="PhD Scholar">PhD (Ph.D. Scholar)</option>
                    <option value="P.G. Scholar">P.G. (Post Graduate)</option>
                    <option value="U.G. Scholar">U.G. (Under Graduate)</option>
                    <option value="Post Doc">Post Doc (Post Doctoral)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Unique Email</label>
                  <input
                    id="new-student-email"
                    type="email"
                    required
                    placeholder="jennifer.l@labpulse.edu"
                    value={newSchEmail}
                    onChange={(e) => setNewSchEmail(e.target.value)}
                    className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                  Research Domain / Field Of Specialization { (newSchDesignation === "Professor (PI)" || newSchDesignation === "Coordinator") ? "(Optional)" : "" }
                </label>
                <input
                  id="new-student-domain"
                  type="text"
                  required={newSchDesignation !== "Professor (PI)" && newSchDesignation !== "Coordinator"}
                  placeholder={newSchDesignation === "Professor (PI)" || newSchDesignation === "Coordinator" ? "e.g. Chemical Engineering (Optional)" : "e.g. Synthetic Biomaterials, Genome-splicing"}
                  value={newSchDomain}
                  onChange={(e) => setNewSchDomain(e.target.value)}
                  className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Academic Thesis / Role Objective { (newSchDesignation === "Professor (PI)" || newSchDesignation === "Coordinator") ? "(Optional)" : "" }
                </label>
                <textarea
                  id="new-student-thesis"
                  required={newSchDesignation !== "Professor (PI)" && newSchDesignation !== "Coordinator"}
                  rows={2}
                  placeholder={newSchDesignation === "Professor (PI)" || newSchDesignation === "Coordinator" ? "e.g. Overseeing laboratory operations, or leave blank" : "Review chemical behaviors of synthetic cellulose breakdown in closed bioreactors..."}
                  value={newSchThesis}
                  onChange={(e) => setNewSchThesis(e.target.value)}
                  className="w-full text-xs font-medium p-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end pt-2 space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3.5 py-2 hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="submit-add-student-btn"
                  type="submit"
                  className="bg-teal-800 hover:bg-teal-900 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Save Member Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Presentation Scheduling Modal Form */}
      {showSchedForm && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex justify-between items-start pb-2 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-bold text-slate-900 tracking-tight leading-none">
                  Schedule Joint Presentation Board
                </h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Anchor upcoming presentations directly back to specific task tracking IDs relational records.
                </p>
              </div>
              <button
                onClick={() => setShowSchedForm(false)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Underlying Research Task Target</label>
                <select
                  required
                  value={selectedTaskId}
                  onChange={(e) => {
                    setSelectedTaskId(e.target.value);
                    // Autofill organizer
                    const task = tasks.find((t) => t.taskId === e.target.value);
                    if (task) setSchedOrganizerId(task.studentId);
                  }}
                  className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                >
                  <option value="">Select a Task Target...</option>
                  {tasks.map((t) => {
                    const candidate = users.find((u) => u.userId === t.studentId);
                    return (
                      <option key={t.taskId} value={t.taskId}>
                        {candidate ? candidate.name : t.studentId} — &ldquo;{t.title.substring(0, 45)}...&rdquo;
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date Boundary</label>
                  <input
                    type="date"
                    required
                    value={schedDate}
                    onChange={(e) => setSchedDate(e.target.value)}
                    className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Time Boundary</label>
                  <input
                    type="text"
                    placeholder="e.g. 14:30"
                    required
                    value={schedTime}
                    onChange={(e) => setSchedTime(e.target.value)}
                    className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Presenting Academic Organizer (Scholar)</label>
                <select
                  required
                  value={schedOrganizerId}
                  onChange={(e) => setSchedOrganizerId(e.target.value)}
                  className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                >
                  <option value="">Select presenting scholar...</option>
                  {activeScholars.map((s) => (
                    <option key={s.userId} value={s.userId}>
                      {s.name} ({s.userId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Coordination & Agenda Notes</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Review findings, evaluate gel trailing index, adjust cleavage timeline..."
                  value={schedNotes}
                  onChange={(e) => setSchedNotes(e.target.value)}
                  className="w-full text-xs font-medium p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                />
              </div>

              <div className="flex justify-end pt-2 space-x-2">
                <button
                  type="button"
                  onClick={() => setShowSchedForm(false)}
                  className="px-3.5 py-2 hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="submit-scheduling-btn-comp"
                  type="submit"
                  className="bg-indigo-700 hover:bg-indigo-800 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Affix and Register Meeting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Multi-Profile Active Auditing Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider">Simultaneous Audits</p>
            <p className="text-xl font-black text-slate-950 mt-1">{activeScholars.length}</p>
          </div>
          <div className="p-2 border border-emerald-100 bg-emerald-50 rounded-xl text-emerald-700 font-bold font-mono text-[10px]">
            ACTIVE
          </div>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider">Roster Safely Deleted</p>
            <p className="text-xl font-black text-slate-950 mt-1">{archivedScholars.length}</p>
          </div>
          <div className="p-2 border border-slate-200 bg-slate-50 rounded-xl text-slate-500 font-bold font-mono text-[10px]">
            ARCHIVED
          </div>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider">Critical Blockers</p>
            <p className="text-xl font-black text-red-600 mt-1">{redTasks}</p>
          </div>
          <div className="p-2 border border-red-100 bg-red-50 rounded-xl text-red-700 font-bold font-mono text-[10px] animate-pulse">
            RED CRITS
          </div>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider">Approving Clearances</p>
            <p className="text-xl font-black text-emerald-800 mt-1">{approvedTasks}</p>
          </div>
          <div className="p-2 border border-emerald-100 bg-emerald-50 rounded-xl text-emerald-800 font-bold font-mono text-[10px]">
            APPROVED
          </div>
        </div>
      </div>

      {/* Roster & Simultaneous Progress Audit Dashboard */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
              Integrated Roster Audit & Progress Matrix (Sphere 2)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Supervise all registered PhD Scholar profiles, active task lane distributions, and deadlines concurrently.
            </p>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-3 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search scholar name / domain..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs font-semibold pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-700"
            />
          </div>
        </div>

        {/* Audit List */}
        <div className="divide-y divide-slate-100">
          {users
            .filter(
              (u) =>
                u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (u.researchDomain && u.researchDomain.toLowerCase().includes(searchTerm.toLowerCase()))
            )
            .map((student) => {
              const scholarTasks = tasks.filter((t) => t.studentId === student.userId);
              const completedTasks = scholarTasks.filter((t) => t.laneCategory === "Completed");
              const doingTasks = scholarTasks.filter((t) => t.laneCategory === "Doing" || (t.laneCategory as any) === "In Progress" || (t.laneCategory as any) === "Ongoing");
              const plannedTasks = scholarTasks.filter((t) => t.laneCategory === "Planned");
              const scholarDocs = documents.filter((d) => {
                const isDirect = d.associatedStudentId === student.userId;
                const isViaTask = d.associatedTaskId ? scholarTasks.some((t) => t.taskId === d.associatedTaskId) : false;
                return isDirect || isViaTask;
              });

              return (
                <div key={student.userId} className="p-6 transition-colors hover:bg-slate-50">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    {/* Scholar Identity Details */}
                    <div className="space-y-1.5 max-w-md">
                      <div className="flex items-center space-x-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${student.rosterStatus === "ACTIVE" ? "bg-emerald-500" : "bg-slate-400"}`}></span>
                        <h4 className="text-sm font-extrabold text-slate-900">{student.name}</h4>
                        <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                          {student.userId}
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${
                          student.designation === "Professor (PI)"
                            ? "bg-rose-50 text-rose-800 border-rose-200"
                            : student.designation === "Coordinator"
                            ? "bg-amber-50 text-amber-805 border-amber-200"
                            : student.designation === "PhD Scholar"
                            ? "bg-blue-50 text-blue-800 border-blue-200"
                            : student.designation === "P.G. Scholar"
                            ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                            : student.designation === "U.G. Scholar"
                            ? "bg-purple-50 text-purple-800 border-purple-200"
                            : "bg-teal-50 text-teal-800 border-teal-200"
                        }`}>
                          {student.designation}
                        </span>
                        {student.rosterStatus === "ARCHIVED" && (
                          <span className="text-[9px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md">
                            Roster Archived
                          </span>
                        )}
                      </div>
                      {student.researchDomain && (
                        <p className="text-xs text-slate-600 font-medium font-sans">
                          <span className="text-slate-400 font-bold uppercase mr-1">Domain:</span> {student.researchDomain}
                        </p>
                      )}
                      {student.thesisTopic && (
                        <p className="text-xs text-slate-500 tracking-wide leading-relaxed italic pr-2">
                          <span className="text-slate-400 font-bold uppercase mr-1 not-italic">Role / Thesis Objective:</span> &ldquo;{student.thesisTopic}&rdquo;
                        </p>
                      )}

                      {/* Quick Contact Dispatch (WhatsApp & Email) */}
                      <div className="pt-2 flex items-center space-x-2">
                        <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">Direct Reach:</span>
                        <ContactActions
                          name={student.name}
                          email={student.email}
                          phoneNumber={student.phoneNumber}
                          compact={true}
                          onEditRequested={() => startEditingStudent(student)}
                        />
                      </div>

                      {/* Direct & Task Document References */}
                      {scholarDocs.length > 0 && (
                        <div className="mt-3.5 bg-slate-50 border border-slate-150 p-2.5 rounded-xl space-y-1.5 max-w-sm">
                          <p className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 select-none">
                            <Paperclip size={10} className="text-teal-700" />
                            <span>Linked Documents ({scholarDocs.length})</span>
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {scholarDocs.map((doc) => (
                              <div
                                key={doc.docId}
                                className="flex items-center space-x-1 bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-[10px] shadow-xs"
                              >
                                <span className={`text-[8px] font-mono font-black uppercase rounded ${
                                  doc.docClass === "Research Article" ? "text-blue-700 bg-blue-50" :
                                  doc.docClass === "Patent Draft" ? "text-amber-700 bg-amber-50" :
                                  doc.docClass === "Lab Protocol" ? "text-purple-700 bg-purple-50" :
                                  "text-emerald-700 bg-emerald-50"
                                } px-1`}>
                                  {doc.docClass[0]}
                                </span>
                                <span className="font-semibold text-slate-700 max-w-[125px] truncate" title={doc.aiSummarySnippet}>
                                  {doc.aiSummarySnippet && doc.aiSummarySnippet.length > 18
                                    ? doc.aiSummarySnippet.substring(0, 18) + "..."
                                    : doc.aiSummarySnippet || "Attached file"}
                                </span>
                                <a
                                  href={doc.fileStorageUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-teal-800 hover:text-teal-950 font-bold px-1 transition-colors hover:scale-110 inline-block text-[11px]"
                                  title="Open file URL"
                                >
                                  ↗
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Progress Lane Distributions */}
                    <div className="flex items-center space-x-6 shrink-0 bg-slate-100/50 border border-slate-100 p-3 rounded-2xl">
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">Planned</p>
                        <p className="text-xs font-extrabold text-slate-800 mt-0.5">{plannedTasks.length}</p>
                      </div>
                      <div className="h-6 w-px bg-slate-200"></div>
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-450 uppercase font-mono tracking-wider text-teal-800">Doing</p>
                        <p className="text-xs font-extrabold text-teal-900 mt-0.5">{doingTasks.length}</p>
                      </div>
                      <div className="h-6 w-px bg-slate-200"></div>
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-450 uppercase font-mono tracking-wider text-emerald-800">Completed</p>
                        <p className="text-xs font-extrabold text-emerald-900 mt-0.5">{completedTasks.length}</p>
                      </div>
                    </div>

                    {/* Deadline Actions (Transition exiting to archived securely) */}
                    <div className="space-y-1.5 lg:text-right shrink-0">
                      <p className="text-[10px] font-mono text-slate-400">Roster Administration</p>
                      <div className="flex flex-wrap lg:justify-end gap-1.5">
                        {student.rosterStatus === "ACTIVE" ? (
                          <>
                            <button
                              type="button"
                              id={`edit-member-btn-${student.userId}`}
                              onClick={() => startEditingStudent(student)}
                              className="bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors py-2 px-3 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer font-sans"
                              title="Edit email address, contact details, or specialization"
                            >
                              <Edit size={11} />
                              <span>Edit Details</span>
                            </button>
                            <button
                              id={`archive-btn-${student.userId}`}
                              onClick={() => onArchiveStudent(student.userId)}
                              className="bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 transition-colors py-2 px-3 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer"
                            >
                              <Archive size={11} />
                              <span>Archive</span>
                            </button>
                            <button
                              type="button"
                              id={`upload-to-student-btn-${student.userId}`}
                              onClick={() => {
                                setUploadingForStudent(student);
                                setDirectDocTitle("");
                                setDirectDocClass("Research Article");
                                setDirectDocUrl("");
                                setDirectDocDesc("");
                              }}
                              className="bg-teal-50 border border-teal-250 text-teal-850 hover:bg-teal-100 transition-all py-2 px-3 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer font-sans"
                              title="Upload / attach document under this scholar profile"
                            >
                              <Upload size={11} />
                              <span>Attach File</span>
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-500 italic bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 inline-block font-sans">
                              Archived
                            </span>
                            {onUnarchiveStudent && (
                              <button
                                type="button"
                                id={`unarchive-btn-${student.userId}`}
                                onClick={() => onUnarchiveStudent(student.userId)}
                                className="bg-emerald-55 border border-emerald-250 text-emerald-800 hover:bg-emerald-100 transition-colors py-2 px-3 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer"
                                title="Restore scholar profile to active status"
                              >
                                <RefreshCcw size={11} />
                                <span>Unarchive</span>
                              </button>
                            )}
                          </div>
                        )}
                        <button
                          type="button"
                          id={`edit-student-btn-${student.userId}`}
                          onClick={() => startEditingStudent(student)}
                          className="bg-indigo-50 border border-indigo-250 text-indigo-750 hover:bg-indigo-100 transition-all py-2 px-3 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer"
                        >
                          <Edit size={11} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          id={`delete-student-btn-${student.userId}`}
                          onClick={() => setStudentToConfirmDelete(student)}
                          className="bg-rose-50 border border-rose-250 text-rose-755 hover:bg-rose-100 transition-all py-2 px-3 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer"
                        >
                          <Trash2 size={11} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Scholars active task deadline checklist sub-row */}
                  {scholarTasks.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-dashed border-slate-200 space-y-2">
                      <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-mono flex items-center space-x-1">
                        <Clock size={11} />
                        <span>Timelines and Status Audit</span>
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {scholarTasks.map((t) => {
                          const isOverdue = t.laneCategory !== "Completed" && Date.now() > t.expectedEndDate;
                          return (
                             <div key={t.taskId} className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 flex flex-col justify-between gap-1.5">
                               <div className="flex justify-between items-start gap-1.5 w-full">
                                 <div>
                                   <p className="text-[11px] font-extrabold text-slate-700 leading-tight truncate max-w-[180px]">{t.title}</p>
                                   <p className="text-[9px] text-slate-450 font-mono mt-0.5">
                                     End: {new Date(t.expectedEndDate).toLocaleDateString()} {isOverdue && "(OVERDUE)"}
                                   </p>
                                   {t.revisedEndDate && (
                                     <p className="text-[9px] text-yellow-750 font-black font-mono mt-0.5">
                                       Revised End: {new Date(t.revisedEndDate).toLocaleDateString()}
                                     </p>
                                   )}
                                 </div>
                                 <div className="flex shrink-0 items-center space-x-1.5">
                                   <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md ${
                                     t.laneCategory === "Completed"
                                       ? "bg-emerald-100 text-emerald-800"
                                       : t.laneCategory === "Doing"
                                       ? "bg-blue-100 text-blue-800"
                                       : "bg-slate-200 text-slate-600"
                                   }`}>
                                     {t.laneCategory}
                                   </span>
                                   <span className={`h-2 w-2 rounded-full ${
                                     isOverdue || t.currentStatus === "RED"
                                       ? "bg-red-500 animate-pulse"
                                       : t.currentStatus === "YELLOW"
                                       ? "bg-yellow-500"
                                       : "bg-emerald-500"
                                   }`}></span>
                                 </div>
                               </div>
                               {/* Subtasks micro-status summary */}
                               {t.subTasks && t.subTasks.length > 0 && (
                                 <div className="text-[9px] font-mono text-slate-500 border-t border-slate-200/60 pt-1 flex justify-between items-center w-full">
                                   <span>Sub-tasks progress:</span>
                                   <span className="font-bold text-teal-800">
                                     {t.subTasks.filter((s) => s.isCompleted).length}/{t.subTasks.length} completed
                                   </span>
                                 </div>
                               )}
                             </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Registered meetings list under student row */}
                  {meetings.some(m => m.organizerId === student.userId) && (
                    <div className="mt-2.5 space-y-1">
                      <p className="text-[9px] uppercase font-bold tracking-widest text-slate-400 font-mono flex items-center space-x-1">
                        <Calendar size={10} />
                        <span>Scheduled Milestone Presentations</span>
                      </p>
                      <div className="space-y-1.5">
                        {meetings.filter(m => m.organizerId === student.userId).map((meet) => {
                          const associatedTask = tasks.find(t => t.taskId === meet.associatedTaskId);
                          return (
                            <div key={meet.meetingId} className="bg-indigo-50/20 border border-indigo-100 rounded-lg p-2.5 flex flex-col md:flex-row justify-between text-[10px] items-start md:items-center text-slate-600 font-sans gap-2">
                              <div className="flex flex-col space-y-1">
                                <div className="flex items-center space-x-2">
                                  <span className="font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-1.5 rounded uppercase">Presentation</span>
                                  <p className="font-semibold text-slate-700 truncate max-w-[280px]">
                                    Task: &ldquo;{associatedTask ? associatedTask.title : 'Unspecified'}&rdquo;
                                  </p>
                                </div>
                                <div className="flex items-center space-x-3 text-slate-500 font-mono text-[9px] pl-0.5">
                                  <span>{new Date(meet.scheduledTimestamp).toLocaleDateString()} at {new Date(meet.scheduledTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  <span className="text-slate-400 italic font-sans max-w-[180px] truncate" title={meet.agendaNotes}>
                                    &ldquo;{meet.agendaNotes}&rdquo;
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 shrink-0 md:self-center">
                                <button
                                  type="button"
                                  id={`edit-meet-${meet.meetingId}`}
                                  onClick={() => startEditingMeeting(meet)}
                                  className="text-indigo-850 hover:bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 rounded transition-all flex items-center space-x-0.5 font-bold cursor-pointer text-[9px]"
                                >
                                  <Edit size={10} />
                                  <span>EDIT</span>
                                </button>
                                <button
                                  type="button"
                                  id={`delete-meet-${meet.meetingId}`}
                                  onClick={() => setMeetingToConfirmDelete(meet)}
                                  className="text-red-700 hover:bg-red-55 border border-red-200 px-1.5 py-0.5 rounded transition-all flex items-center space-x-0.5 font-bold cursor-pointer text-[9px]"
                                >
                                  <Trash2 size={10} />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
        </div>
      </div>

      {/* Edit Milestone Meeting Modal */}
      {editingMeeting && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center z-55 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex justify-between items-start pb-2 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-bold text-slate-900 tracking-tight leading-none">
                  Edit Scheduled Milestone Presentation
                </h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Reschedule the date / time or update session agenda comments.
                </p>
              </div>
              <button
                onClick={() => setEditingMeeting(null)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMeetEdit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</label>
                  <input
                    id="edit-meet-date-input"
                    type="date"
                    required
                    value={editMeetDate}
                    onChange={(e) => setEditMeetDate(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Time</label>
                  <input
                    id="edit-meet-time-input"
                    type="time"
                    required
                    value={editMeetTime}
                    onChange={(e) => setEditMeetTime(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Session Agenda Notes</label>
                <textarea
                  id="edit-meet-notes-textarea"
                  required
                  rows={3}
                  value={editMeetNotes}
                  onChange={(e) => setEditMeetNotes(e.target.value)}
                  className="w-full text-xs font-medium p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                />
              </div>

              <div className="flex justify-end pt-2 space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingMeeting(null)}
                  className="px-3.5 py-2 hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="save-edit-meet-btn"
                  type="submit"
                  className="bg-indigo-800 hover:bg-indigo-900 border border-indigo-950 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Save Rescheduling
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Meeting Confirmation Dialog */}
      {meetingToConfirmDelete && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center z-55 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex items-start space-x-3 text-red-650">
              <div className="p-3 bg-red-50 rounded-2xl border border-red-100 text-red-700 shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-955 uppercase tracking-wider font-mono">
                  Delete Milestone Meeting?
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 font-sans leading-relaxed">
                  Are you sure you want to delete this scheduled presentation on &ldquo;<strong className="text-slate-850">{new Date(meetingToConfirmDelete.scheduledTimestamp).toLocaleDateString()}</strong>&rdquo;? This workflow operation cannot be reversed.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 space-x-2">
              <button
                type="button"
                onClick={() => setMeetingToConfirmDelete(null)}
                className="px-3.5 py-2 hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-meet-btn"
                type="button"
                onClick={handleConfirmDeleteMeet}
                className="bg-red-700 hover:bg-red-800 border border-red-955 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
              >
                Yes, Delete Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Scholar Modal Dialog */}
      {editingStudent && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center z-55 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex justify-between items-start pb-2 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-bold text-slate-900 tracking-tight leading-none">
                  Edit Lab Member Details
                </h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Update full name, credentials, specialization, and role objective.
                </p>
              </div>
              <button
                onClick={() => setEditingStudent(null)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStudentEdit} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Member Name</label>
                  <input
                    id="edit-student-name-input"
                    type="text"
                    required
                    value={editSchName}
                    onChange={(e) => setEditSchName(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Contact Number</label>
                  <input
                    id="edit-student-phone-input"
                    type="text"
                    value={editSchPhone}
                    onChange={(e) => setEditSchPhone(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Role / Designation</label>
                  <select
                    id="edit-student-designation-select"
                    value={editSchDesignation}
                    onChange={(e) => setEditSchDesignation(e.target.value as any)}
                    className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                  >
                    <option value="Professor (PI)">Professor (PI)</option>
                    <option value="Coordinator">Coordinator</option>
                    <option value="PhD Scholar">PhD (Ph.D. Scholar)</option>
                    <option value="P.G. Scholar">P.G. (Post Graduate)</option>
                    <option value="U.G. Scholar">U.G. (Under Graduate)</option>
                    <option value="Post Doc">Post Doc (Post Doctoral)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Email Address</label>
                  <input
                    id="edit-student-email-input"
                    type="email"
                    required
                    value={editSchEmail}
                    onChange={(e) => setEditSchEmail(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Domain / Area Of Specialization { (editSchDesignation === "Professor (PI)" || editSchDesignation === "Coordinator") ? "(Optional)" : "" }
                </label>
                <input
                  id="edit-student-domain-input"
                  type="text"
                  required={editSchDesignation !== "Professor (PI)" && editSchDesignation !== "Coordinator"}
                  placeholder={editSchDesignation === "Professor (PI)" || editSchDesignation === "Coordinator" ? "e.g. Molecular Biology" : ""}
                  value={editSchDomain}
                  onChange={(e) => setEditSchDomain(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Academic Thesis / Role Objective { (editSchDesignation === "Professor (PI)" || editSchDesignation === "Coordinator") ? "(Optional)" : "" }
                </label>
                <textarea
                  id="edit-student-thesis-input"
                  required={editSchDesignation !== "Professor (PI)" && editSchDesignation !== "Coordinator"}
                  rows={2}
                  placeholder={editSchDesignation === "Professor (PI)" || editSchDesignation === "Coordinator" ? "Describe core responsibilities..." : ""}
                  value={editSchThesis}
                  onChange={(e) => setEditSchThesis(e.target.value)}
                  className="w-full text-xs font-medium p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                />
              </div>

              <div className="flex justify-end pt-2 space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-3.5 py-2 hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="save-edit-student-btn"
                  type="submit"
                  className="bg-indigo-800 hover:bg-indigo-900 border border-indigo-950 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  Save Profile Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Scholar Confirmation Dialog */}
      {studentToConfirmDelete && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center z-55 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex items-start space-x-3 text-red-650">
              <div className="p-3 bg-red-50 rounded-2xl border border-red-100 text-red-700 shrink-0">
                <ShieldAlert size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-955 uppercase tracking-wider font-mono">
                  Purge Scholar Roster?
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 font-sans leading-relaxed">
                  Are you sure you want to permanently delete researcher profile &ldquo;<strong className="text-slate-800">{studentToConfirmDelete.name}</strong>&rdquo; ({studentToConfirmDelete.userId})? All associated tasks, presentations, and documents will be completely missing from their historical pipelines.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 space-x-2">
              <button
                type="button"
                onClick={() => setStudentToConfirmDelete(null)}
                className="px-3.5 py-2 hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-student-btn"
                type="button"
                onClick={handleConfirmDeleteStudent}
                className="bg-red-700 hover:bg-red-800 border border-red-955 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                title="Delete Scholar from entire list"
              >
                Yes, Purge Scholar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct document upload modal under a person */}
      {uploadingForStudent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-55 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Upload className="text-teal-800" size={16} />
                  <span>Attach Document to Profile</span>
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Upload an academic or research asset directly under <strong className="text-slate-800">{uploadingForStudent.name}</strong>.
                </p>
              </div>
              <button
                onClick={() => setUploadingForStudent(null)}
                className="text-slate-450 hover:text-slate-650 cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDirectDocSubmit} className="space-y-3.5">
              {/* Drag & Drop PC File Uploader */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Select File from PC
                </label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDirectDocDragging(true);
                  }}
                  onDragLeave={() => setIsDirectDocDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDirectDocDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      const file = e.dataTransfer.files[0];
                      setDirectLocalFile(file);
                      setDirectDocTitle(file.name);
                    }
                  }}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-1 ${
                    isDirectDocDragging ? 'border-teal-600 bg-teal-50/50' : 'border-slate-200 hover:border-slate-350 bg-slate-50'
                  }`}
                >
                  <input
                    type="file"
                    id="coordinator-pc-file"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        setDirectLocalFile(file);
                        setDirectDocTitle(file.name);
                      }
                    }}
                  />
                  <label htmlFor="coordinator-pc-file" className="cursor-pointer w-full h-full flex flex-col items-center">
                    <Paperclip className="text-teal-650 mb-1" size={24} />
                    <p className="text-[11px] font-bold text-slate-700">
                      {directLocalFile ? directLocalFile.name : "Choose a local file from PC"}
                    </p>
                    <p className="text-[9px] text-slate-400">
                      {directLocalFile 
                        ? `${(directLocalFile.size / 1024).toFixed(1)} KB — Click to change` 
                        : "or drag and drop document here"
                      }
                    </p>
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Document Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DNA Gel Analysis Report"
                  value={directDocTitle}
                  onChange={(e) => setDirectDocTitle(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Classification</label>
                  <select
                    value={directDocClass}
                    onChange={(e) => setDirectDocClass(e.target.value as DocClass)}
                    className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                  >
                    <option value="Research Article">Research Article</option>
                    <option value="Patent Draft">Patent Draft</option>
                    <option value="Lab Protocol">Lab Protocol</option>
                    <option value="Data Sheet">Data Sheet</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Storage URL {directLocalFile ? "(Simulated)" : "(Simulated)"}</label>
                  <input
                    type="text"
                    disabled={!!directLocalFile}
                    placeholder={directLocalFile ? "Generated from PC file..." : "https://drive.google/..."}
                    value={directLocalFile ? `local-file://${directLocalFile.name}` : directDocUrl}
                    onChange={(e) => setDirectDocUrl(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description & Peer Tagging</label>
                  <span className="text-[9px] font-mono text-slate-400">Use @Name to tag</span>
                </div>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide a comprehensive summary of this file. You can tag other members using @PROF_01, @STU_02 etc."
                  value={directDocDesc}
                  onChange={(e) => setDirectDocDesc(e.target.value)}
                  className="w-full text-xs font-medium p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end pt-2 space-x-2">
                <button
                  type="button"
                  onClick={() => setUploadingForStudent(null)}
                  className="px-3.5 py-2 hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer font-sans"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-teal-800 hover:bg-teal-900 border border-teal-950 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  Upload & Tag Peers
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
