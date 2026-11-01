/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { LabUser, LabTask, LabMeeting, LabDocument, LaneCategory, StatusMetric, DocClass, SubTask, TaskAlert, TaskAttachment } from "../types";
import { 
  Plus, Calendar, Paperclip, Clipboard, CheckCircle2, CircleDot, Clock, AlertCircle, 
  MessageSquare, ExternalLink, RefreshCw, Send, Tag, Users, Edit, Trash2, Link, FileText, ChevronDown, ChevronUp, Bell, Upload, Award, Trophy, Sparkles
} from "lucide-react";
import RewardCelebrationToast from "./RewardCelebrationToast";
import { 
  PHD_REWARD_CATEGORIES, 
  RewardCategory, 
  evaluateTaskRewardTrigger, 
  getRewardQuote, 
  isAllowedRewardAccess 
} from "../services/rewardsDatabase";

interface StudentWorkspaceProps {
  student: LabUser;
  tasks: LabTask[];
  meetings: LabMeeting[];
  documents: LabDocument[];
  allUsers: LabUser[];
  onAddTask: (task: Omit<LabTask, "taskId" | "studentId" | "professorReviewStatus" | "professorCommentsLog">) => void;
  onUpdateTaskLane: (taskId: string, newLane: LaneCategory) => void;
  onUpdateTaskStatus: (taskId: string, newStatus: StatusMetric) => void;
  onLinkEvent: (taskId: string, date: string, notes: string) => void;
  onUploadDoc: (taskId: string, docClass: DocClass, storageUrl: string, fileTitle: string, description: string) => void;
  onDeleteTask?: (taskId: string) => void;
  onEditTask?: (taskId: string, updatedFields: Partial<LabTask>) => void;
  taskAlerts?: Record<string, TaskAlert>;
  onMarkTaskAttendedByStudent?: (taskId: string) => void;
}

export default function StudentWorkspace({
  student,
  tasks,
  meetings,
  documents,
  allUsers,
  onAddTask,
  onUpdateTaskLane,
  onUpdateTaskStatus,
  onLinkEvent,
  onUploadDoc,
  onDeleteTask,
  onEditTask,
  taskAlerts,
  onMarkTaskAttendedByStudent,
}: StudentWorkspaceProps) {
  
  const piUser = allUsers.find((u) => u.designation === "Professor (PI)");
  const piName = piUser ? piUser.name : "Professor (PI)";

  // Compute unattended task alerts count for this student
  const studentUnattendedCount = useMemo(() => {
    if (!taskAlerts) return 0;
    return tasks.filter((t) => t.studentId === student.userId && taskAlerts[t.taskId]?.unattendedForStudent).length;
  }, [tasks, student.userId, taskAlerts]);

  // Local active states for creation prompts
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskStatus, setNewTaskStatus] = useState<StatusMetric>("GREEN");
  const [newTaskStartDate, setNewTaskStartDate] = useState("2026-06-15");
  const [newTaskEndDate, setNewTaskEndDate] = useState("2026-07-15");
  const [newTaskSubTasks, setNewTaskSubTasks] = useState<string[]>([]);
  const [subTaskTitleInput, setSubTaskTitleInput] = useState("");
  const [newTaskRevisedEndDate, setNewTaskRevisedEndDate] = useState("");
  const [newTaskTag, setNewTaskTag] = useState("");
  const [newTaskLane, setNewTaskLane] = useState<LaneCategory>("Planned");
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>("All");

  // Attachment state for Launching new task
  const [newTaskAttachments, setNewTaskAttachments] = useState<TaskAttachment[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isNewTaskDragging, setIsNewTaskDragging] = useState(false);
  const [showAddLinkInput, setShowAddLinkInput] = useState(false);
  const [newLinkName, setNewLinkName] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");

  // Real-time Psychological Reinforcement (ONLY for scholars, hidden from PI/Coordinator)
  const [activeReinforcement, setActiveReinforcement] = useState<{
    category: RewardCategory;
    quote: string;
    taskTitle?: string;
  } | null>(null);

  const triggerReinforcement = (category: RewardCategory, taskTitle?: string, preferredType: "short" | "medium" = "medium") => {
    if (!isAllowedRewardAccess(student.designation)) return;
    const { quote } = getRewardQuote(category, preferredType);
    setActiveReinforcement({
      category,
      quote,
      taskTitle
    });

    // Silently store reinforcement event in backend PostgreSQL database
    fetch("/api/rewards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: student.userId,
        categoryId: category.id,
        quoteSelected: quote,
        psychologicalNeed: category.psychologicalNeed,
        earnedAt: Date.now()
      })
    }).catch(console.error);
  };

  const handleLaneChangeWithRewards = (taskId: string, newLane: LaneCategory) => {
    const targetTask = tasks.find((t) => t.taskId === taskId);
    const previousLane = targetTask?.laneCategory;
    onUpdateTaskLane(taskId, newLane);

    if (targetTask && isAllowedRewardAccess(student.designation)) {
      const updatedTask = {
        ...targetTask,
        laneCategory: newLane,
        actualCompletionDate: newLane === "Completed" ? Date.now() : null
      };
      const matched = evaluateTaskRewardTrigger(updatedTask, "lane_changed", previousLane);
      if (matched) {
        triggerReinforcement(matched, targetTask.title);
      }
    }
  };

  // Edit Task local state hooks
  const [editingTask, setEditingTask] = useState<LabTask | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editStatus, setEditStatus] = useState<StatusMetric>("GREEN");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editSubTasks, setEditSubTasks] = useState<SubTask[]>([]);
  const [editSubTaskTitleInput, setEditSubTaskTitleInput] = useState("");
  const [editRevisedEndDate, setEditRevisedEndDate] = useState("");
  const [editTaskTag, setEditTaskTag] = useState("");

  // Attachment state for Editing task
  const [editAttachments, setEditAttachments] = useState<TaskAttachment[]>([]);
  const [isUploadingEditAttachment, setIsUploadingEditAttachment] = useState(false);
  const [isEditDragging, setIsEditDragging] = useState(false);
  const [showEditAddLinkInput, setShowEditAddLinkInput] = useState(false);
  const [editLinkName, setEditLinkName] = useState("");
  const [editLinkUrl, setEditLinkUrl] = useState("");

  const [extendingTaskId, setExtendingTaskId] = useState<string | null>(null);
  const [extensionDate, setExtensionDate] = useState("");

  const [inlineAttachingTaskId, setInlineAttachingTaskId] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentType, setAttachmentType] = useState<"link" | "document">("link");

  const [taskToConfirmDelete, setTaskToConfirmDelete] = useState<LabTask | null>(null);
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<string, boolean>>({});

  const toggleTaskExpand = (taskId: string) => {
    setExpandedTaskIds((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
    if (onMarkTaskAttendedByStudent && taskAlerts?.[taskId]?.unattendedForStudent) {
      onMarkTaskAttendedByStudent(taskId);
    }
  };
  const [commentToConfirmDelete, setCommentToConfirmDelete] = useState<{
    taskId: string;
    commentId: string;
    commentText: string;
    commentsList: any[];
  } | null>(null);

  const startEditingTask = (task: LabTask) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditStatus(task.currentStatus);
    setEditStartDate(new Date(task.startDate).toISOString().split('T')[0]);
    setEditEndDate(new Date(task.expectedEndDate).toISOString().split('T')[0]);
    setEditSubTasks(task.subTasks || []);
    setEditSubTaskTitleInput("");
    setEditRevisedEndDate(task.revisedEndDate ? new Date(task.revisedEndDate).toISOString().split('T')[0] : "");
    setEditTaskTag(task.taskTag || "");
    setEditAttachments(task.attachments || []);
    setShowEditAddLinkInput(false);
    setEditLinkName("");
    setEditLinkUrl("");
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editTitle.trim()) return;
    if (onEditTask) {
      onEditTask(editingTask.taskId, {
        title: editTitle.trim(),
        currentStatus: editStatus,
        startDate: new Date(editStartDate).getTime(),
        expectedEndDate: new Date(editEndDate).getTime(),
        revisedEndDate: editStatus === "YELLOW" && editRevisedEndDate ? new Date(editRevisedEndDate).getTime() : undefined,
        subTasks: editSubTasks,
        taskTag: editTaskTag.trim() || undefined,
        attachments: editAttachments,
      });

      if (isAllowedRewardAccess(student.designation)) {
        const updatedTask: LabTask = {
          ...editingTask,
          title: editTitle.trim(),
          currentStatus: editStatus,
          startDate: new Date(editStartDate).getTime(),
          expectedEndDate: new Date(editEndDate).getTime(),
          taskTag: editTaskTag.trim() || undefined
        };
        const matched = evaluateTaskRewardTrigger(updatedTask, "status_changed");
        if (matched) {
          triggerReinforcement(matched, updatedTask.title);
        }
      }
    }
    setEditingTask(null);
  };

  const handleUploadFileForNewTask = async (file: File) => {
    setIsUploadingAttachment(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to upload file");
      }

      const data = await res.json();
      const newAtt: TaskAttachment = {
        id: `ATT_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: file.name,
        url: data.storageUrl,
        type: "document",
      };

      setNewTaskAttachments((prev) => [...prev, newAtt]);
    } catch (err: any) {
      console.error("File upload error:", err);
      const fallbackUrl = URL.createObjectURL(file);
      const newAtt: TaskAttachment = {
        id: `ATT_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: file.name,
        url: fallbackUrl,
        type: "document",
      };
      setNewTaskAttachments((prev) => [...prev, newAtt]);
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handleAddLinkForNewTask = () => {
    if (!newLinkUrl.trim()) return;
    const name = newLinkName.trim() || newLinkUrl.trim();
    let url = newLinkUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
    }
    const newAtt: TaskAttachment = {
      id: `ATT_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      url,
      type: "link",
    };
    setNewTaskAttachments((prev) => [...prev, newAtt]);
    setNewLinkName("");
    setNewLinkUrl("");
    setShowAddLinkInput(false);
  };

  const handleUploadFileForEditTask = async (file: File) => {
    setIsUploadingEditAttachment(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to upload file");
      }

      const data = await res.json();
      const newAtt: TaskAttachment = {
        id: `ATT_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: file.name,
        url: data.storageUrl,
        type: "document",
      };

      setEditAttachments((prev) => [...prev, newAtt]);
    } catch (err: any) {
      console.error("Edit file upload error:", err);
      const fallbackUrl = URL.createObjectURL(file);
      const newAtt: TaskAttachment = {
        id: `ATT_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: file.name,
        url: fallbackUrl,
        type: "document",
      };
      setEditAttachments((prev) => [...prev, newAtt]);
    } finally {
      setIsUploadingEditAttachment(false);
    }
  };

  const handleAddLinkForEditTask = () => {
    if (!editLinkUrl.trim()) return;
    const name = editLinkName.trim() || editLinkUrl.trim();
    let url = editLinkUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
    }
    const newAtt: TaskAttachment = {
      id: `ATT_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      url,
      type: "link",
    };
    setEditAttachments((prev) => [...prev, newAtt]);
    setEditLinkName("");
    setEditLinkUrl("");
    setShowEditAddLinkInput(false);
  };

  const handleConfirmDelete = () => {
    if (taskToConfirmDelete && onDeleteTask) {
      onDeleteTask(taskToConfirmDelete.taskId);
    }
    setTaskToConfirmDelete(null);
  };

  // Scheduling Prompts
  const [linkingTaskId, setLinkingTaskId] = useState<string | null>(null);
  const [meetingDate, setMeetingDate] = useState("2026-06-18");
  const [meetingTime, setMeetingTime] = useState("10:00");
  const [meetingNotes, setMeetingNotes] = useState("");

  // Attachment Prompts
  const [attachingTaskId, setAttachingTaskId] = useState<string | null>(null);
  const [docClass, setDocClass] = useState<DocClass>("Research Article");
  const [docTitle, setDocTitle] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [docDescription, setDocDescription] = useState("");
  const [docLocalFile, setDocLocalFile] = useState<File | null>(null);
  const [isDocDragging, setIsDocDragging] = useState(false);

  // Filters to current student tasks only
  const studentTasks = tasks.filter((t) => t.studentId === student.userId);

  // Derived unique tags for filtering
  const uniqueTags = Array.from(new Set(studentTasks.filter(t => t.taskTag).map(t => t.taskTag as string)));
  
  // Filter by tag if selected
  const filteredStudentTasks = selectedTagFilter === "All" 
    ? studentTasks 
    : studentTasks.filter(t => t.taskTag === selectedTagFilter);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const subTasksToInsert: SubTask[] = newTaskSubTasks.map((title) => ({
      id: `SUB_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title,
      isCompleted: false,
    }));

    onAddTask({
      title: newTaskTitle.trim(),
      laneCategory: newTaskLane,
      startDate: new Date(newTaskStartDate).getTime(),
      expectedEndDate: new Date(newTaskEndDate).getTime(),
      currentStatus: newTaskStatus,
      revisedEndDate: newTaskStatus === "YELLOW" && newTaskRevisedEndDate ? new Date(newTaskRevisedEndDate).getTime() : undefined,
      subTasks: subTasksToInsert,
      taskTag: newTaskTag.trim() || undefined,
      attachments: newTaskAttachments,
    });

    if (isAllowedRewardAccess(student.designation)) {
      if (newTaskLane === "Doing") {
        const matched = PHD_REWARD_CATEGORIES.find((c) => c.id === "moved_planned_to_ongoing");
        if (matched) triggerReinforcement(matched, newTaskTitle.trim());
      }
    }

    setNewTaskTitle("");
    setNewTaskStatus("GREEN");
    setNewTaskSubTasks([]);
    setSubTaskTitleInput("");
    setNewTaskRevisedEndDate("");
    setNewTaskTag("");
    setNewTaskLane("Planned");
    setNewTaskAttachments([]);
    setShowAddLinkInput(false);
    setNewLinkName("");
    setNewLinkUrl("");
    setShowAddTask(false);
  };

  const handleLinkEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkingTaskId) return;

    const fullTimestamp = `${meetingDate}T${meetingTime}`;
    onLinkEvent(linkingTaskId, fullTimestamp, meetingNotes.trim());
    setLinkingTaskId(null);
    setMeetingNotes("");
  };

  const handleUploadDocSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!attachingTaskId || !docTitle.trim()) return;

    let targetUrl = docUrl.trim();
    if (docLocalFile) {
      try {
        targetUrl = URL.createObjectURL(docLocalFile);
      } catch (_) {
        targetUrl = `https://labcadence.drive/local-uploads/${encodeURIComponent(docLocalFile.name)}`;
      }
    }

    if (!targetUrl) {
      targetUrl = `https://labcadence.drive/assets/${docTitle.toLowerCase().replace(/\s+/g, "-")}.pdf`;
    }

    onUploadDoc(
      attachingTaskId,
      docClass,
      targetUrl,
      docTitle.trim(),
      docDescription.trim()
    );

    setAttachingTaskId(null);
    setDocTitle("");
    setDocUrl("");
    setDocDescription("");
    setDocLocalFile(null);
    setIsDocDragging(false);
  };

  const lanes: { id: LaneCategory; label: string; bg: string; text: string; ring: string }[] = [
    { id: "Planned", label: "Planned Milestones", bg: "bg-slate-100/70", text: "text-slate-600", ring: "border-slate-200" },
    { id: "Doing", label: "Ongoing / Active Exploits (Doing)", bg: "bg-teal-50/10", text: "text-teal-800", ring: "border-teal-100" },
    { id: "Completed", label: "Completed Lanes", bg: "bg-emerald-50/10", text: "text-emerald-800", ring: "border-emerald-100" }
  ];

  return (
    <div className="space-y-8 font-sans">
      
      {/* Ph.D. Profile Workspace Header (Isolated Banner) */}
      <div className="bg-gradient-to-r from-teal-900 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-teal-800/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="space-y-3 z-10">
          <div className="flex items-center space-x-3">
            <span className="text-[10px] font-mono tracking-widest uppercase bg-teal-600/30 text-teal-300 font-bold px-2.5 py-1 rounded-full border border-teal-500/20">
              {student.designation} Space
            </span>
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[10px] font-semibold text-teal-200 uppercase tracking-wider">
              {student.userId}
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            {student.name}
          </h2>
          <div className="space-y-1.5 pt-1.5 border-t border-teal-800/50">
            <p className="text-xs text-teal-100 tracking-wide font-medium">
              <span className="text-teal-300 font-bold uppercase font-mono mr-1">Domain:</span> {student.researchDomain}
            </p>
            <p className="text-xs text-teal-200 tracking-wide font-medium italic">
              <span className="text-teal-300 font-bold uppercase font-mono not-italic mr-1">Thesis Obj:</span> &ldquo;{student.thesisTopic}&rdquo;
            </p>
          </div>
        </div>

        <div className="mt-6 md:mt-0 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-right font-mono flex md:flex-col items-center md:items-end justify-between w-full md:w-auto">
          <div>
            <p className="text-[10px] text-teal-300 uppercase font-bold tracking-wider">Roster Status</p>
            <p className="text-sm font-extrabold text-teal-200 tracking-tight">ACTIVE STATUS</p>
          </div>
          <div className="md:mt-3 pl-4 md:pl-0 border-l border-white/10 md:border-l-0">
            <p className="text-[10px] text-teal-300 uppercase font-bold tracking-wider">Operational Trackers</p>
            <p className="text-xs text-slate-200 font-medium">{studentTasks.length} Assigned Blocks</p>
          </div>
        </div>
      </div>

      {/* Alert Banner for New Feedback from Principal Investigator */}
      {studentUnattendedCount > 0 && (
        <div className="bg-gradient-to-r from-rose-50 via-red-50 to-amber-50 border-2 border-red-300 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center space-x-3.5">
            <div className="relative p-2.5 bg-red-100 rounded-xl text-red-600 shrink-0">
              <Bell size={22} className="fill-red-600 animate-bounce" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600 text-[9px] font-black text-white items-center justify-center">
                  {studentUnattendedCount}
                </span>
              </span>
            </div>
            <div>
              <h4 className="text-sm font-black text-red-950 flex items-center gap-2">
                New Actionable Feedback from Principal Investigator (PI)
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-200 text-red-800">
                  {studentUnattendedCount} Unattended Alert{studentUnattendedCount > 1 ? "s" : ""}
                </span>
              </h4>
              <p className="text-xs text-red-800/90 font-medium mt-0.5">
                The Principal Investigator has sent new replies, decisions, or review updates. Unattended tasks are highlighted below with glowing red 🔔 badges.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Dynamic Kanban Workspace */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-100 p-4 rounded-2xl border border-slate-200/60 shadow-xs gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Lifecycle Progress Workspace
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Sandboxed progress control loops. Move tasks securely or register academic presentation timelines.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {uniqueTags.length > 0 && (
            <select
              value={selectedTagFilter}
              onChange={(e) => setSelectedTagFilter(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer shadow-sm w-full sm:w-auto"
            >
              <option value="All">All Categories</option>
              {uniqueTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          )}
          {!showAddTask && (
            <button
              id="register-task-btn"
              onClick={() => setShowAddTask(true)}
              className="bg-teal-800 text-white hover:bg-teal-900 transition-all font-semibold text-xs px-3.5 py-2 rounded-xl flex items-center justify-center space-x-2 border border-teal-900 shadow-sm shadow-teal-900/10 cursor-pointer w-full sm:w-auto"
            >
              <Plus size={14} />
              <span>Launch Research Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Insert Task Box Inline */}
      {showAddTask && (
        <form onSubmit={handleCreateTask} className="bg-white border border-teal-100 rounded-2xl p-5 shadow-lg space-y-4 animate-fadeIn">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">
              Initialize New Research Sprint ({newTaskLane} Lane)
            </h4>
            <button
              type="button"
              onClick={() => setShowAddTask(false)}
              className="text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
            >
              Cancel
            </button>
          </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="col-span-12 space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Task Description / Objective
                </label>
                <input
                  id="task-title-input"
                  type="text"
                  required
                  placeholder="e.g., DNA Extraction and Quality Assurance, PCR primer checks..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full text-xs font-semibold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
              
              <div className="col-span-12 md:col-span-3 space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Category Tag
                </label>
                <input
                  id="task-tag-input"
                  type="text"
                  placeholder="e.g., Lab Work"
                  value={newTaskTag}
                  onChange={(e) => setNewTaskTag(e.target.value)}
                  className="w-full text-xs font-semibold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div className="col-span-12 md:col-span-3 space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Initial Lane
                </label>
                <select
                  id="task-lane-input"
                  value={newTaskLane}
                  onChange={(e) => setNewTaskLane(e.target.value as LaneCategory)}
                  className="w-full text-xs font-semibold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700 cursor-pointer"
                >
                  <option value="Planned">Planned</option>
                  <option value="Doing">In Progress / Ongoing (Doing)</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="col-span-12 md:col-span-2 space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Initial Status
                </label>
                <select
                  id="task-status-input"
                  value={newTaskStatus}
                  onChange={(e) => setNewTaskStatus(e.target.value as StatusMetric)}
                  className="w-full text-xs font-semibold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700 cursor-pointer"
                >
                  <option value="GREEN">GREEN (On Track)</option>
                  <option value="YELLOW">YELLOW (Delayed)</option>
                  <option value="RED">RED (Blocked)</option>
                </select>
              </div>

              <div className="col-span-12 md:col-span-2 space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Start Date
                </label>
                <input
                  id="task-start-input"
                  type="date"
                  required
                  value={newTaskStartDate}
                  onChange={(e) => setNewTaskStartDate(e.target.value)}
                  className="w-full text-xs font-semibold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-200 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="col-span-12 md:col-span-2 space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Expected End
                </label>
                <input
                  id="task-end-input"
                  type="date"
                  required
                  value={newTaskEndDate}
                  onChange={(e) => setNewTaskEndDate(e.target.value)}
                  className="w-full text-xs font-semibold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-200 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

          {/* Conditional revised date inside task creation box if YELLOW */}
          {newTaskStatus === "YELLOW" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 animate-fadeIn border-t border-slate-100 pt-3">
              <div className="col-span-12 md:col-span-4 space-y-1.5">
                <label className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                  Revised Expected End (Delayed Reason option)
                </label>
                <input
                  id="task-revised-end-input"
                  type="date"
                  required
                  value={newTaskRevisedEndDate}
                  onChange={(e) => setNewTaskRevisedEndDate(e.target.value)}
                  className="w-full text-xs font-semibold text-slate-850 p-2.5 bg-yellow-50 border border-yellow-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Additional Sub-tasks builder inside task creation */}
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Task Sub-tasks Checklist (Optional)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add sub-task e.g. Prepare buffers, Calibrate machinery..."
                value={subTaskTitleInput}
                onChange={(e) => setSubTaskTitleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (subTaskTitleInput.trim()) {
                      setNewTaskSubTasks([...newTaskSubTasks, subTaskTitleInput.trim()]);
                      setSubTaskTitleInput("");
                    }
                  }
                }}
                className="w-full text-xs font-semibold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-200 focus:bg-white focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (subTaskTitleInput.trim()) {
                    setNewTaskSubTasks([...newTaskSubTasks, subTaskTitleInput.trim()]);
                    setSubTaskTitleInput("");
                  }
                }}
                className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors shrink-0"
              >
                + Add Sub-task
              </button>
            </div>
            {newTaskSubTasks.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {newTaskSubTasks.map((st, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-teal-50 border border-teal-200 text-teal-800 px-2.5 py-1 rounded-lg"
                  >
                    <span>{st}</span>
                    <button
                      type="button"
                      onClick={() => setNewTaskSubTasks(newTaskSubTasks.filter((_, i) => i !== idx))}
                      className="text-teal-650 hover:text-teal-900 font-extrabold focus:outline-none cursor-pointer"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* File Attachments Section during Task Launch */}
          <div className="space-y-2.5 border-t border-slate-100 pt-3">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                <Paperclip size={13} className="text-teal-700" />
                <span>Attach Research Files & Reference Documents (Optional)</span>
              </label>
              <span className="text-[10px] font-mono text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full font-bold">
                {newTaskAttachments.length} attached
              </span>
            </div>

            {/* Drag & Drop or Browse PC Files */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsNewTaskDragging(true);
              }}
              onDragLeave={() => setIsNewTaskDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsNewTaskDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  Array.from(e.dataTransfer.files).forEach((f) => handleUploadFileForNewTask(f as File));
                }
              }}
              className={`p-4 border-2 border-dashed rounded-2xl transition-all text-center select-none ${
                isNewTaskDragging 
                  ? "border-teal-600 bg-teal-50" 
                  : "border-slate-200 bg-slate-50/70 hover:bg-slate-50 hover:border-teal-300"
              }`}
            >
              <input
                id="new-task-file-input"
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    Array.from(e.target.files).forEach((f) => handleUploadFileForNewTask(f as File));
                  }
                  e.target.value = "";
                }}
              />
              <div className="flex flex-col items-center justify-center space-y-1.5">
                <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-2xs text-teal-700">
                  <Upload size={18} className={isUploadingAttachment ? "animate-bounce" : ""} />
                </div>
                <div className="text-xs font-bold text-slate-800">
                  {isUploadingAttachment ? (
                    <span className="text-teal-700 font-bold animate-pulse">Uploading attachment to lab repository...</span>
                  ) : (
                    <>
                      <label htmlFor="new-task-file-input" className="text-teal-700 hover:text-teal-900 underline cursor-pointer">
                        Choose local files from PC
                      </label>{" "}
                      <span className="text-slate-600">or drag and drop here</span>
                    </>
                  )}
                </div>
                <p className="text-[10px] text-slate-400">
                  Supports PDFs, Research Protocols, Datasets (CSV/Excel), Documents, Diagrams, or Raw Data
                </p>
              </div>
            </div>

            {/* External URL Link Option */}
            {!showAddLinkInput ? (
              <button
                type="button"
                onClick={() => setShowAddLinkInput(true)}
                className="text-[11px] text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1 cursor-pointer pt-0.5"
              >
                <Link size={12} />
                <span>+ Or attach Google Drive / Web reference link</span>
              </button>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-fadeIn">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                    <Link size={11} className="text-teal-700" />
                    <span>Attach Drive / Web Reference URL</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddLinkInput(false);
                      setNewLinkName("");
                      setNewLinkUrl("");
                    }}
                    className="text-[10px] text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Document Title (e.g., Google Drive Folder, Overleaf)"
                    value={newLinkName}
                    onChange={(e) => setNewLinkName(e.target.value)}
                    className="text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700 font-medium"
                  />
                  <div className="flex gap-1.5">
                    <input
                      type="url"
                      placeholder="https://drive.google.com/..."
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddLinkForNewTask();
                        }
                      }}
                      className="text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700 flex-1 min-w-0 font-medium font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleAddLinkForNewTask}
                      disabled={!newLinkUrl.trim()}
                      className="bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer shrink-0"
                    >
                      Attach
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* List of Attached Files Preview */}
            {newTaskAttachments.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                  Attached to this Sprint ({newTaskAttachments.length}):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {newTaskAttachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-xl shadow-2xs group hover:border-teal-300 transition-all"
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <div className="p-1.5 bg-teal-50 text-teal-700 rounded-lg shrink-0">
                          {att.type === "document" ? <FileText size={14} /> : <Link size={14} />}
                        </div>
                        <div className="min-w-0">
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-bold text-slate-850 hover:text-teal-700 truncate block max-w-[200px]"
                            title={att.name}
                          >
                            {att.name}
                          </a>
                          <span className="text-[9px] font-mono text-slate-400 capitalize">
                            {att.type}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewTaskAttachments(newTaskAttachments.filter((a) => a.id !== att.id))}
                        className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                        title="Remove attached file"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="bg-teal-800 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-teal-900 border border-teal-950 cursor-pointer"
            >
              Verify & Instantiate
            </button>
          </div>
        </form>
      )}

      {/* Kanban Tri-Lane Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {lanes.map((lane) => {
          const isLaneMatch = (taskLane: string, targetLaneId: LaneCategory) => {
            if (taskLane === targetLaneId) return true;
            if (targetLaneId === "Doing" && (taskLane === "In Progress" || taskLane === "Ongoing" || taskLane.toLowerCase() === "doing")) return true;
            if (targetLaneId === "Planned" && taskLane.toLowerCase() === "planned") return true;
            if (targetLaneId === "Completed" && taskLane.toLowerCase() === "completed") return true;
            return false;
          };
          const laneTasks = filteredStudentTasks.filter((t) => isLaneMatch(t.laneCategory, lane.id));

          return (
            <div key={lane.id} className="flex flex-col space-y-4">
              {/* Lane Header */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center space-x-2">
                  <span className={`text-xs font-black uppercase tracking-wider ${lane.text}`}>
                    {lane.label}
                  </span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold font-mono">
                    {laneTasks.length}
                  </span>
                </div>
              </div>

              {/* Lane Tasks Stack */}
              <div className={`p-3.5 rounded-2xl border ${lane.ring} min-h-[500px] bg-slate-50/50 space-y-4`}>
                {laneTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-200/80 rounded-xl text-slate-400 p-4 text-center">
                    <Clipboard size={22} className="text-slate-300 stroke-[1.5]" />
                    <p className="text-[11px] font-semibold mt-1 font-sans">Lane Empty</p>
                    <p className="text-[9px] text-slate-400">No entries in this phase.</p>
                  </div>
                ) : (
                  laneTasks.map((task) => {
                    // Find affiliated presentation meetings (Section 1.2 Relational Anchor)
                    const linkedMeetings = meetings.filter((m) => m.associatedTaskId === task.taskId);
                    // Find affiliated files (Section 1.3)
                    const linkedDocs = documents.filter((d) => d.associatedTaskId === task.taskId);
                    
                    // Comments parser helper
                    let comments: any[] = [];
                    if (task.professorCommentsLog) {
                      try {
                        comments = JSON.parse(task.professorCommentsLog || "[]");
                      } catch (_) {
                        comments = [];
                      }
                    }

                    // Checks if deadline is exceeded as overdue logic
                    const isOverdue = lane.id !== "Completed" && Date.now() > task.expectedEndDate;
                    const isExpanded = !!expandedTaskIds[task.taskId];

                    const taskAlert = taskAlerts?.[task.taskId];
                    const hasStudentAlert = !!taskAlert?.unattendedForStudent;

                    // Collapsed state: Small box displaying only the title of the task
                    if (!isExpanded) {
                      return (
                        <div
                          key={task.taskId}
                          id={`task-box-${task.taskId}`}
                          onClick={() => toggleTaskExpand(task.taskId)}
                          className={`bg-white border rounded-xl p-3 shadow-xs transition-all cursor-pointer group flex items-center justify-between gap-2.5 relative ${
                            hasStudentAlert
                              ? "border-red-400 ring-2 ring-red-400/50 bg-red-50/30 hover:bg-red-50/60"
                              : isOverdue 
                              ? "border-red-200 hover:border-red-400 hover:bg-red-50/20" 
                              : "border-slate-200 hover:border-teal-500 hover:bg-slate-50/80"
                          }`}
                          title={hasStudentAlert ? "New alert from Principal Investigator - Click to expand" : "Click to expand task details"}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                            <span 
                              className={`h-2 w-2 rounded-full shrink-0 ${
                                hasStudentAlert
                                  ? "bg-red-600 animate-ping"
                                  : isOverdue || task.currentStatus === "RED"
                                  ? "bg-red-500 animate-pulse"
                                  : task.currentStatus === "YELLOW"
                                  ? "bg-yellow-500"
                                  : "bg-emerald-500"
                              }`}
                              title={hasStudentAlert ? "Unattended PI Alert" : isOverdue ? "Deadline Overdue" : `Status: ${task.currentStatus}`}
                            />
                            <h4 className="text-xs font-bold text-slate-800 tracking-tight leading-snug line-clamp-2 group-hover:text-teal-900">
                              {task.title}
                            </h4>
                          </div>
                          <div className="shrink-0 flex items-center space-x-1.5">
                            {hasStudentAlert && (
                              <span className="flex items-center space-x-1 text-[10px] font-black text-red-600 bg-red-100 border border-red-300 px-2 py-0.5 rounded-full animate-pulse shadow-xs">
                                <Bell size={10} className="fill-red-600" />
                                <span className="truncate max-w-[120px]">{taskAlert.studentAlertReason || "PI Feedback"}</span>
                              </span>
                            )}
                            <ChevronDown size={14} className="text-slate-400 group-hover:text-teal-700 transition-transform duration-200" />
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={task.taskId}
                        id={`task-box-${task.taskId}`}
                        className={`bg-white border-2 rounded-xl p-4 shadow-md transition-all space-y-3 animate-fadeIn ${
                          hasStudentAlert ? "border-red-400 ring-2 ring-red-300/40" : "border-teal-650/80"
                        }`}
                      >
                        {/* Student Unattended Feedback Banner inside expanded card */}
                        {hasStudentAlert && (
                          <div className="bg-gradient-to-r from-red-50 via-rose-50 to-red-50 border border-red-300 rounded-xl p-3 shadow-xs flex items-center justify-between gap-3 animate-fadeIn">
                            <div className="flex items-center space-x-2.5 text-xs text-red-900 font-bold min-w-0">
                              <div className="p-1.5 bg-red-100 rounded-lg text-red-600 shrink-0">
                                <Bell size={16} className="fill-red-600 animate-bounce" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-[10px] uppercase tracking-wider text-red-600 font-black">PI Feedback Alert</div>
                                <div className="truncate text-red-950 font-semibold">{taskAlert?.studentAlertReason || "New comments or review status updated by PI."}</div>
                              </div>
                            </div>
                            {onMarkTaskAttendedByStudent && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMarkTaskAttendedByStudent(task.taskId);
                                }}
                                className="px-2.5 py-1 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
                              >
                                Mark Read
                              </button>
                            )}
                          </div>
                        )}
                        {/* Task Title & Primary Metric Status (Clickable header to collapse) */}
                        <div 
                          className="flex justify-between items-start gap-2 cursor-pointer select-none pb-2 border-b border-slate-100 group"
                          onClick={() => toggleTaskExpand(task.taskId)}
                          title="Click to collapse task"
                        >
                          <div className="space-y-1.5 flex-1 min-w-0">
                            {task.taskTag && (
                              <span className="inline-block text-[9px] font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">
                                {task.taskTag}
                              </span>
                            )}
                            <h4 className="text-xs font-extrabold text-slate-900 tracking-tight leading-snug group-hover:text-teal-800 transition-colors">
                              {task.title}
                            </h4>
                          </div>
                          <div className="flex items-center space-x-2 pl-1 shrink-0 text-teal-800">
                            <span 
                              className={`h-2.5 w-2.5 rounded-full ${
                                isOverdue || task.currentStatus === "RED"
                                  ? "bg-red-500 animate-pulse"
                                  : task.currentStatus === "YELLOW"
                                  ? "bg-yellow-500"
                                  : "bg-emerald-500"
                              }`}
                              title={isOverdue ? "Deadline Overdue Block!" : `Current focus is ${task.currentStatus}`}
                            />
                            <span className="text-[10px] font-mono font-bold">Collapse</span>
                            <ChevronUp size={15} />
                          </div>
                        </div>

                        {/* Edit and Delete Operational Options */}
                        <div className="flex items-center space-x-2 pt-1 border-t border-slate-100/65">
                          <button
                            type="button"
                            id={`edit-task-btn-${task.taskId}`}
                            onClick={() => startEditingTask(task)}
                            className="flex items-center space-x-1 px-2.5 py-1 text-[10px] font-bold text-teal-850 hover:bg-teal-50 border border-teal-200/50 rounded-lg transition-all cursor-pointer"
                          >
                            <Edit size={10} />
                            <span>EDIT</span>
                          </button>
                          <button
                            type="button"
                            id={`delete-task-btn-${task.taskId}`}
                            onClick={() => setTaskToConfirmDelete(task)}
                            className="flex items-center space-x-1 px-2.5 py-1 text-[10px] font-bold text-red-700 hover:bg-red-50 border border-red-200/50 rounded-lg transition-all cursor-pointer"
                          >
                            <Trash2 size={10} />
                            <span>Delete</span>
                          </button>
                        </div>

                        {/* Operational details, timeline */}
                        <div className="space-y-1 font-mono text-[10px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <div className="flex justify-between">
                            <span>Sprinted / Start:</span>
                            <span className="font-semibold text-slate-700">
                              {new Date(task.startDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Target Deadline:</span>
                            <span className={`font-semibold ${isOverdue ? "text-red-600 font-extrabold" : "text-slate-700"}`}>
                              {new Date(task.expectedEndDate).toLocaleDateString()} {isOverdue && "(OVERDUE)"}
                            </span>
                          </div>
                          {task.revisedEndDate && (
                            <div className="flex justify-between text-yellow-750 font-bold border-t border-slate-150 pt-1 mt-1">
                              <span>Revised Deadline:</span>
                              <span>
                                {new Date(task.revisedEndDate).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          {task.actualCompletionDate && (
                            <div className="flex justify-between text-emerald-800">
                              <span>Completed Date:</span>
                              <span className="font-bold">
                                {new Date(task.actualCompletionDate).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          {task.extensionCount && task.extensionCount > 0 ? (
                            <div className="flex justify-between text-indigo-700 font-bold border-t border-slate-150 pt-1 mt-1">
                              <span>Deadline Extended:</span>
                              <span>{task.extensionCount} time{task.extensionCount > 1 ? 's' : ''}</span>
                            </div>
                          ) : null}
                        </div>

                        {/* Overdue Action: Extend Deadline */}
                        {isOverdue && (
                          <div className="pt-2">
                            {extendingTaskId === task.taskId ? (
                              <div className="bg-yellow-50 p-2 rounded-lg border border-yellow-200 flex flex-col gap-1 animate-fadeIn">
                                <label className="text-[9px] font-bold text-yellow-800 uppercase">New Expected Date</label>
                                <input
                                  type="date"
                                  value={extensionDate}
                                  onChange={(e) => setExtensionDate(e.target.value)}
                                  className="w-full text-xs p-1.5 rounded-md border border-yellow-300 focus:outline-none"
                                />
                                <div className="flex justify-end gap-1 mt-1">
                                  <button
                                    onClick={() => {
                                      setExtendingTaskId(null);
                                      setExtensionDate("");
                                    }}
                                    className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded text-[9px] cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (extensionDate && onEditTask) {
                                        onEditTask(task.taskId, {
                                          expectedEndDate: new Date(extensionDate).getTime(),
                                          extensionCount: (task.extensionCount || 0) + 1
                                        });
                                      }
                                      setExtendingTaskId(null);
                                      setExtensionDate("");
                                    }}
                                    className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded text-[9px] cursor-pointer"
                                  >
                                    Confirm Extension
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setExtendingTaskId(task.taskId);
                                  setExtensionDate(new Date().toISOString().split('T')[0]);
                                }}
                                className="w-full bg-yellow-100 hover:bg-yellow-200 text-yellow-800 font-bold border border-yellow-300 rounded-lg py-1.5 text-[10px] flex justify-center items-center gap-1 transition-colors cursor-pointer"
                              >
                                <AlertCircle size={10} />
                                Extend Deadline Option
                              </button>
                            )}
                          </div>
                        )}

                        {/* Interactive Subtasks Section inside the Kanban Card */}
                        <div className="border-t border-slate-100/70 pt-2 pb-1 space-y-2">
                          <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                            <span className="font-bold flex items-center gap-1 text-teal-850">
                              <span className="h-1.5 w-1.5 rounded-full bg-teal-650 animate-pulse"></span>
                              <span>Sub-tasks Progress</span>
                            </span>
                            <span className="font-bold text-[9px] text-teal-900 bg-teal-50 px-1.5 py-0.5 rounded-md">
                              {task.subTasks?.filter((s) => s.isCompleted).length || 0}/
                              {task.subTasks?.length || 0}
                            </span>
                          </div>

                          {/* Miniature Progress Bar */}
                          {task.subTasks && task.subTasks.length > 0 && (
                            <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                              <div
                                className="bg-teal-700 h-1 rounded-full transition-all duration-300"
                                style={{
                                  width: `${Math.round(
                                    ((task.subTasks.filter((s) => s.isCompleted).length || 0) /
                                      task.subTasks.length) *
                                      100
                                  )}%`,
                                }}
                              ></div>
                            </div>
                          )}

                          {/* Sub-tasks checklist row */}
                          {task.subTasks && task.subTasks.length > 0 ? (
                            <div className="space-y-1 max-h-36 overflow-y-auto pr-0.5 scrollbar-thin">
                              {task.subTasks.map((sub) => (
                                <label
                                  key={sub.id}
                                  className="flex items-center space-x-2 p-1.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-150/40 rounded-lg cursor-pointer text-[10px] select-none transition-all"
                                >
                                  <input
                                    type="checkbox"
                                    checked={sub.isCompleted}
                                    onChange={() => {
                                      const updatedSubs = (task.subTasks || []).map((s) =>
                                        s.id === sub.id ? { ...s, isCompleted: !s.isCompleted } : s
                                      );
                                      if (onEditTask) {
                                        onEditTask(task.taskId, { subTasks: updatedSubs });
                                      }
                                    }}
                                    className="rounded border-slate-300 text-teal-700 focus:ring-teal-600 cursor-pointer h-3.5 w-3.5 shrink-0"
                                  />
                                  <span className={`font-semibold font-sans leading-tight ${
                                    sub.isCompleted ? "line-through text-slate-450 font-medium" : "text-slate-700 font-bold"
                                  }`}>
                                    {sub.title}
                                  </span>
                                </label>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[9px] text-slate-400 italic">No sub-tasks. Use options below to add.</p>
                          )}

                          {/* Quick sub-task inline appendix */}
                          <div className="flex gap-1.5 pt-0.5">
                            <input
                              type="text"
                              placeholder="+ Add micro sub-task..."
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const val = e.currentTarget.value.trim();
                                  if (val) {
                                    const updatedSubs = [
                                      ...(task.subTasks || []),
                                      {
                                        id: `SUB_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                                        title: val,
                                        isCompleted: false,
                                      }
                                    ];
                                    if (onEditTask) {
                                      onEditTask(task.taskId, { subTasks: updatedSubs });
                                    }
                                    e.currentTarget.value = "";
                                  }
                                }
                              }}
                              className="w-full text-[9px] font-medium px-2 py-1 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none placeholder:italic font-sans"
                            />
                          </div>
                        </div>

                        {/* Attachments Section */}
                        <div className="border-t border-slate-100/70 pt-2 pb-1 space-y-2">
                          <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                            <span className="font-bold flex items-center gap-1 text-indigo-850">
                              <span className="h-1.5 w-1.5 rounded-full bg-indigo-650"></span>
                              <span>Links & Documents</span>
                            </span>
                            <span className="font-bold text-[9px] text-indigo-900 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                              {task.attachments?.length || 0} attached
                            </span>
                          </div>

                          {task.attachments && task.attachments.length > 0 && (
                            <div className="space-y-1">
                              {task.attachments.map((att) => (
                                <div key={att.id} className="flex items-center gap-1.5">
                                  <a
                                    href={att.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex-1 flex items-center space-x-2 p-1.5 bg-indigo-50/30 hover:bg-indigo-50 border border-indigo-100 rounded-lg cursor-pointer text-[10px] transition-all text-indigo-900"
                                  >
                                    {att.type === "link" ? <Link size={10} className="text-indigo-500 shrink-0" /> : <FileText size={10} className="text-indigo-500 shrink-0" />}
                                    <span className="font-semibold truncate">{att.name}</span>
                                  </a>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      if (onEditTask) {
                                        const updatedAtts = task.attachments!.filter(a => a.id !== att.id);
                                        onEditTask(task.taskId, { attachments: updatedAtts });
                                      }
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                                    title="Remove attachment"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {inlineAttachingTaskId === task.taskId ? (
                            <div className="bg-indigo-50 p-2 rounded-lg border border-indigo-200 flex flex-col gap-1.5 animate-fadeIn mt-1">
                              <div className="flex gap-2">
                                <select
                                  value={attachmentType}
                                  onChange={(e) => setAttachmentType(e.target.value as "link" | "document")}
                                  className="text-[9px] p-1 rounded-md border border-indigo-300 focus:outline-none"
                                >
                                  <option value="link">Link</option>
                                  <option value="document">Doc URL</option>
                                </select>
                                <input
                                  type="text"
                                  placeholder="Title (e.g., Draft Paper)"
                                  value={attachmentName}
                                  onChange={(e) => setAttachmentName(e.target.value)}
                                  className="w-full text-[9px] p-1 rounded-md border border-indigo-300 focus:outline-none"
                                />
                              </div>
                              <input
                                type="url"
                                placeholder="https://..."
                                value={attachmentUrl}
                                onChange={(e) => setAttachmentUrl(e.target.value)}
                                className="w-full text-[9px] p-1 rounded-md border border-indigo-300 focus:outline-none"
                              />
                              <div className="flex justify-end gap-1 mt-1">
                                <button
                                  onClick={() => {
                                    setInlineAttachingTaskId(null);
                                    setAttachmentName("");
                                    setAttachmentUrl("");
                                  }}
                                  className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded text-[9px] cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => {
                                    if (attachmentName.trim() && attachmentUrl.trim() && onEditTask) {
                                      const updatedAtts = [
                                        ...(task.attachments || []),
                                        {
                                          id: `ATT_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                                          name: attachmentName.trim(),
                                          url: attachmentUrl.trim(),
                                          type: attachmentType,
                                        }
                                      ];
                                      onEditTask(task.taskId, { attachments: updatedAtts });
                                    }
                                    setInlineAttachingTaskId(null);
                                    setAttachmentName("");
                                    setAttachmentUrl("");
                                  }}
                                  className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-[9px] cursor-pointer"
                                >
                                  Add Attachment
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setInlineAttachingTaskId(task.taskId);
                                setAttachmentName("");
                                setAttachmentUrl("");
                                setAttachmentType("link");
                              }}
                              className="text-[9px] text-indigo-600 hover:text-indigo-800 font-semibold italic flex items-center gap-1 pt-0.5 w-full cursor-pointer"
                            >
                              + Add Link or Document
                            </button>
                          )}
                        </div>

                        {/* Badges / Metrics Row */}
                        <div className="flex flex-wrap gap-1.5">
                          {/* Professor review badge (Section 1.2) */}
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center space-x-1 bg-slate-100 ${
                            task.professorReviewStatus === "Approved"
                              ? "bg-emerald-100 text-emerald-800 font-black"
                              : task.professorReviewStatus === "Revision Requested"
                              ? "bg-red-100 text-red-800 font-black"
                              : "bg-amber-100 text-amber-800"
                          }`}>
                            <span>{task.professorReviewStatus}</span>
                          </span>

                          {/* Linked presentation meetings badge */}
                          {linkedMeetings.map((m) => (
                            <span
                              key={m.meetingId}
                              className="text-[9px] font-bold px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-md flex items-center space-x-1"
                              title={`Linked presentation: ${new Date(m.scheduledTimestamp).toLocaleDateString()}`}
                            >
                              <Users size={8} />
                              <span>Pres Meet</span>
                            </span>
                          ))}
                        </div>

                        {/* Appended Comments & Replies Thread */}
                        <div className="border-t border-slate-100 pt-2 space-y-1.5">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono flex items-center space-x-1">
                            <MessageSquare size={10} className="text-teal-800 animate-pulse" />
                            <span>Discussion &amp; Replies ({comments.length})</span>
                          </span>
                          
                          {comments.length > 0 && (
                            <div className="space-y-1 divide-y divide-slate-105 max-h-36 overflow-y-auto pr-0.5 scrollbar-thin">
                              {comments.map((comm) => (
                                <div key={comm.id} className="text-[10px] pb-1 pt-1 first:pt-0 space-y-1">
                                  <div className="flex justify-between items-center text-slate-400 font-mono text-[9px]">
                                    <span className="font-extrabold text-slate-700">{comm.author}</span>
                                    <div className="flex items-center space-x-2">
                                      <span>{new Date(comm.timestamp).toLocaleDateString()}</span>
                                      {editingCommentId !== comm.id && (
                                        <div className="flex items-center space-x-1 ml-1.5">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingCommentId(comm.id);
                                              setEditingCommentText(comm.comment);
                                            }}
                                            className="text-teal-650 hover:text-teal-900 font-bold hover:underline cursor-pointer"
                                            title="Edit this feedback"
                                          >
                                            Edit
                                          </button>
                                          <span className="text-slate-300">|</span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setCommentToConfirmDelete({
                                                taskId: task.taskId,
                                                commentId: comm.id,
                                                commentText: comm.comment,
                                                commentsList: comments,
                                              });
                                            }}
                                            className="text-red-500 hover:text-red-700 font-bold hover:underline cursor-pointer"
                                            title="Delete this feedback"
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {editingCommentId === comm.id ? (
                                    <div className="flex gap-1 items-center mt-1">
                                      <input
                                        type="text"
                                        value={editingCommentText}
                                        onChange={(e) => setEditingCommentText(e.target.value)}
                                        className="w-full text-[10px] font-semibold px-2 py-1 bg-white border border-teal-350 rounded-lg focus:outline-none"
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            e.preventDefault();
                                            const val = editingCommentText.trim();
                                            if (val) {
                                              const updatedComments = comments.map(c => 
                                                c.id === comm.id ? { ...c, comment: val } : c
                                              );
                                              if (onEditTask) {
                                                onEditTask(task.taskId, {
                                                  professorCommentsLog: JSON.stringify(updatedComments)
                                                });
                                              }
                                              setEditingCommentId(null);
                                              setEditingCommentText("");
                                            }
                                          }
                                        }}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const val = editingCommentText.trim();
                                          if (val) {
                                            const updatedComments = comments.map(c => 
                                              c.id === comm.id ? { ...c, comment: val } : c
                                            );
                                            if (onEditTask) {
                                              onEditTask(task.taskId, {
                                                professorCommentsLog: JSON.stringify(updatedComments)
                                              });
                                            }
                                            setEditingCommentId(null);
                                            setEditingCommentText("");
                                          }
                                        }}
                                        className="bg-teal-600 text-white font-extrabold px-1.5 py-0.5 rounded text-[9px] hover:bg-teal-700 cursor-pointer shrink-0"
                                      >
                                        Save
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingCommentId(null);
                                          setEditingCommentText("");
                                        }}
                                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold px-1.5 py-0.5 rounded text-[9px] cursor-pointer shrink-0"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <p className="text-slate-650 pr-1 mt-0.5 leading-relaxed font-sans">&ldquo;{comm.comment}&rdquo;</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Student Reply Form Element */}
                          <div className="flex gap-1.5 pt-1">
                            <input
                              type="text"
                              id={`student-reply-input-${task.taskId}`}
                              placeholder="Type a response/update..."
                              className="w-full text-[10px] font-semibold px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none placeholder:font-normal font-sans"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const text = e.currentTarget.value.trim();
                                  if (text) {
                                    const parsedComments = [...comments, {
                                      id: `COMM_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                                      timestamp: Date.now(),
                                      author: student.name,
                                      comment: text
                                    }];
                                    if (onEditTask) {
                                      onEditTask(task.taskId, {
                                        professorCommentsLog: JSON.stringify(parsedComments)
                                      });
                                      if (isAllowedRewardAccess(student.designation)) {
                                        const matched = PHD_REWARD_CATEGORIES.find((c) => c.id === "addressing_feedback");
                                        if (matched) triggerReinforcement(matched, task.title);
                                      }
                                    }
                                    e.currentTarget.value = "";
                                  }
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const inputEl = document.getElementById(`student-reply-input-${task.taskId}`) as HTMLInputElement;
                                if (inputEl) {
                                  const text = inputEl.value.trim();
                                  if (text) {
                                    const parsedComments = [...comments, {
                                      id: `COMM_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                                      timestamp: Date.now(),
                                      author: student.name,
                                      comment: text
                                    }];
                                    if (onEditTask) {
                                      onEditTask(task.taskId, {
                                        professorCommentsLog: JSON.stringify(parsedComments)
                                      });
                                      if (isAllowedRewardAccess(student.designation)) {
                                        const matched = PHD_REWARD_CATEGORIES.find((c) => c.id === "addressing_feedback");
                                        if (matched) triggerReinforcement(matched, task.title);
                                      }
                                    }
                                    inputEl.value = "";
                                  }
                                }
                              }}
                              className="bg-teal-50 hover:bg-teal-100 text-teal-850 hover:text-teal-905 border border-teal-200/60 px-2.5 py-1 rounded-lg text-[9px] font-extrabold cursor-pointer transition-colors shrink-0"
                            >
                              Reply
                            </button>
                          </div>
                        </div>

                        {/* Attached document logs list inside card */}
                        {linkedDocs.length > 0 && (
                          <div className="border-t border-slate-100 pt-2 space-y-1">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono flex items-center space-x-1">
                              <Paperclip size={10} />
                              <span>Document Ingestion ({linkedDocs.length})</span>
                            </span>
                            <div className="space-y-1">
                              {linkedDocs.map((doc) => (
                                <div key={doc.docId} className="flex justify-between items-center text-[10px] bg-slate-50 p-1.5 rounded-lg border border-slate-100/80">
                                  <div className="truncate pr-1">
                                    <p className="font-bold text-slate-700 truncate">{doc.docClass}</p>
                                    <p className="text-[9px] text-slate-400 truncate">{doc.fileStorageUrl.substring(doc.fileStorageUrl.lastIndexOf("/") + 1)}</p>
                                  </div>
                                  <a
                                    href={doc.fileStorageUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-teal-800 hover:text-teal-700 flex shrink-0"
                                    title="Open file location"
                                  >
                                    <ExternalLink size={10} />
                                  </a>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Task Action Bar */}
                        <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between text-[11px] font-bold">
                          {/* Lane navigation selector */}
                          <div className="flex items-center space-x-1">
                            <span className="text-slate-400 text-[10px]">Move:</span>
                            <select
                              value={lane.id}
                              onChange={(e) => handleLaneChangeWithRewards(task.taskId, e.target.value as LaneCategory)}
                              className="bg-slate-100 border-none rounded-md py-1 px-1.5 text-[10px] outline-none cursor-pointer text-slate-700 hover:bg-slate-200 transition-colors"
                            >
                              <option value="Planned">Planned</option>
                              <option value="Doing">Doing</option>
                              <option value="Completed">Completed</option>
                            </select>
                          </div>

                          {/* Quick Actions popovers */}
                          <div className="flex items-center space-x-2">
                            {/* Link meeting event button */}
                            <button
                              id={`link-event-btn-${task.taskId}`}
                              onClick={() => setLinkingTaskId(task.taskId)}
                              className="text-teal-800 hover:text-white hover:bg-teal-800 border border-teal-800/25 bg-teal-50/20 px-3 py-2 rounded-md transition-all text-[10px] flex items-center space-x-1 cursor-pointer"
                              title="Link Target Presentation/Meeting Event"
                            >
                              <Calendar size={10} />
                              <span>Link Event</span>
                            </button>

                            {/* Attach publication doc button */}
                            <button
                              id={`attach-doc-btn-${task.taskId}`}
                              onClick={() => setAttachingTaskId(task.taskId)}
                              className="text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 px-3 py-2 rounded-md transition-all text-[10px] flex items-center space-x-1 cursor-pointer"
                              title="Attach literature reference, wet-lab sheets, patents..."
                            >
                              <Paperclip size={10} />
                              <span>Attach Doc</span>
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Target scheduling overlay prompt (Section 3.2 Relational Anchor) */}
      {linkingTaskId && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex justify-between items-start pb-2 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-bold text-slate-900 tracking-tight leading-none">
                  Link Target Presentation / Meeting
                </h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Connect scheduling actions directly to active molecular tasks.
                </p>
              </div>
              <button
                onClick={() => setLinkingTaskId(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLinkEventSubmit} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</label>
                  <input
                    type="date"
                    required
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Time</label>
                  <input
                    type="timer"
                    placeholder="e.g. 10:00"
                    required
                    value={meetingTime}
                    onChange={(e) => setMeetingTime(e.target.value)}
                    className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Presentation / Agenda Notes</label>
                <textarea
                  id="agenda-notes-textarea"
                  required
                  rows={3}
                  placeholder={`Review results with ${piName}, resolve agar concentration spikes, discuss band trails...`}
                  value={meetingNotes}
                  onChange={(e) => setMeetingNotes(e.target.value)}
                  className="w-full text-xs font-medium p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end pt-2 space-x-2">
                <button
                  type="button"
                  onClick={() => setLinkingTaskId(null)}
                  className="px-3.5 py-2 hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
                <button
                  id="sched-presentation-btn"
                  type="submit"
                  className="bg-indigo-700 hover:bg-indigo-800 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Register Presentation Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ingestion & peer tagging prompt (Section 3.3 Target Document Ingestion) */}
      {attachingTaskId && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex justify-between items-start pb-2 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-bold text-slate-900 tracking-tight leading-none">
                  Document Ingestion & Contextual Peer Tagging
                </h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Upload file references. Scanning metadata for active @user mention codes will prompt alert loops.
                </p>
              </div>
              <button
                onClick={() => setAttachingTaskId(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadDocSubmit} className="space-y-3.5">
              {/* Drag & Drop PC File Uploader */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Select File from PC
                </label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDocDragging(true);
                  }}
                  onDragLeave={() => setIsDocDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDocDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      const file = e.dataTransfer.files[0];
                      setDocLocalFile(file);
                      setDocTitle(file.name);
                    }
                  }}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-1 ${
                    isDocDragging ? 'border-teal-600 bg-teal-50/50' : 'border-slate-200 hover:border-slate-350 bg-slate-50'
                  }`}
                >
                  <input
                    type="file"
                    id="student-pc-file"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        setDocLocalFile(file);
                        setDocTitle(file.name);
                      }
                    }}
                  />
                  <label htmlFor="student-pc-file" className="cursor-pointer w-full h-full flex flex-col items-center">
                    <Paperclip className="text-teal-650 mb-1" size={24} />
                    <p className="text-[11px] font-bold text-slate-700">
                      {docLocalFile ? docLocalFile.name : "Choose a local file from PC"}
                    </p>
                    <p className="text-[9px] text-slate-400">
                      {docLocalFile 
                        ? `${(docLocalFile.size / 1024).toFixed(1)} KB — Click to change` 
                        : "or drag and drop document here"
                      }
                    </p>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Classification Class</label>
                  <select
                    value={docClass}
                    onChange={(e) => setDocClass(e.target.value as DocClass)}
                    className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Research Article">Research Article</option>
                    <option value="Patent Draft">Patent Draft</option>
                    <option value="Lab Protocol">Lab Protocol</option>
                    <option value="Data Sheet">Data Sheet</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Storage URL {docLocalFile ? "(Simulated)" : "(Simulated Link)"}</label>
                  <input
                    type="text"
                    disabled={!!docLocalFile}
                    placeholder={docLocalFile ? "Generated from PC file..." : "https://labcadence.drive/gel-protocol.pdf"}
                    value={docLocalFile ? `local-file://${docLocalFile.name}` : docUrl}
                    onChange={(e) => setDocUrl(e.target.value)}
                    className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-xl disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Document Name / Handle</label>
                <input
                  id="doc-title-input"
                  type="text"
                  required
                  placeholder="Agarose Concentration Protocols Draft"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                    <Tag size={10} className="text-teal-800" />
                    <span>Description & Peer Tagging</span>
                  </label>
                  <span className="text-[9px] text-slate-400 font-mono">
                    Add tags like @PROF_01, @STU_02
                  </span>
                </div>
                <textarea
                  id="doc-description-textarea"
                  required
                  rows={3}
                  placeholder="Review @PROF_01, I have optimized agar concentration protocols. @STU_02 check pages 2-4."
                  value={docDescription}
                  onChange={(e) => setDocDescription(e.target.value)}
                  className="w-full text-xs font-medium p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
                <p className="text-[9px] text-slate-400 leading-relaxed">
                  *Our metadata router will parse active mentions in review statements dynamically to route context alerts.
                </p>
              </div>

              <div className="flex justify-end pt-2 space-x-2">
                <button
                  type="button"
                  onClick={() => setAttachingTaskId(null)}
                  className="px-3.5 py-2 hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
                <button
                  id="ingest-file-btn"
                  type="submit"
                  className="bg-teal-800 hover:bg-teal-900 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Ingest & Broadcast Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center z-55 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex justify-between items-start pb-2 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-bold text-slate-900 tracking-tight leading-none">
                  Edit Research Sprint (Task details)
                </h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Revise title, status metrics, or calendar coordinates.
                </p>
              </div>
              <button
                onClick={() => setEditingTask(null)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="col-span-12 md:col-span-8 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Task Title / Description
                  </label>
                  <input
                    id="edit-task-title-input"
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                  />
                </div>
                <div className="col-span-12 md:col-span-4 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Category Tag
                  </label>
                  <input
                    id="edit-task-tag-input"
                    type="text"
                    placeholder="e.g., Lab Work"
                    value={editTaskTag}
                    onChange={(e) => setEditTaskTag(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                  />
                </div>
              </div>              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Current Status Metric
                  </label>
                  <select
                    id="edit-task-status-input"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as StatusMetric)}
                    className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white cursor-pointer"
                  >
                    <option value="GREEN">GREEN (On Track)</option>
                    <option value="YELLOW">YELLOW (Delayed)</option>
                    <option value="RED">RED (Blocked)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Start Date
                  </label>
                  <input
                    id="edit-task-start-input"
                    type="date"
                    required
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Expected End
                  </label>
                  <input
                    id="edit-task-end-input"
                    type="date"
                    required
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                  />
                </div>
              </div>

              {/* Conditional Revised Completion Date option (Only if editStatus is YELLOW) */}
              {editStatus === "YELLOW" && (
                <div className="space-y-1 animate-fadeIn bg-yellow-50 border border-yellow-200 p-3.5 rounded-2xl">
                  <label className="text-[10px] font-bold text-yellow-900 uppercase tracking-wider block">
                    Revised Completion Date (Delayed Status Requirement)
                  </label>
                  <input
                    id="edit-task-revised-date"
                    type="date"
                    required
                    value={editRevisedEndDate}
                    onChange={(e) => setEditRevisedEndDate(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 bg-white border border-slate-200 rounded-xl focus:bg-white"
                  />
                </div>
              )}

              {/* Manage Sub-tasks with option to add multiple */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Modify Sub-tasks ({editSubTasks.length})
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add new subtask to list..."
                    value={editSubTaskTitleInput}
                    onChange={(e) => setEditSubTaskTitleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (editSubTaskTitleInput.trim()) {
                          const newSub: SubTask = {
                            id: `SUB_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                            title: editSubTaskTitleInput.trim(),
                            isCompleted: false,
                          };
                          setEditSubTasks([...editSubTasks, newSub]);
                          setEditSubTaskTitleInput("");
                        }
                      }
                    }}
                    className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (editSubTaskTitleInput.trim()) {
                        const newSub: SubTask = {
                          id: `SUB_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                          title: editSubTaskTitleInput.trim(),
                          isCompleted: false,
                        };
                        setEditSubTasks([...editSubTasks, newSub]);
                        setEditSubTaskTitleInput("");
                      }
                    }}
                    className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-colors"
                  >
                    + Add Sub-task
                  </button>
                </div>

                {editSubTasks.length > 0 ? (
                  <div className="space-y-2 max-h-44 overflow-y-auto pt-1">
                    {editSubTasks.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between p-2 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-xl transition-all"
                      >
                        <label className="flex items-center space-x-2.5 cursor-pointer text-xs select-none">
                          <input
                            type="checkbox"
                            checked={sub.isCompleted}
                            onChange={() => {
                              setEditSubTasks(
                                editSubTasks.map((s) =>
                                  s.id === sub.id ? { ...s, isCompleted: !s.isCompleted } : s
                                )
                              );
                            }}
                            className="rounded border-slate-300 text-teal-700 focus:ring-teal-600 cursor-pointer h-4 w-4"
                          />
                          <span className={`font-semibold ${sub.isCompleted ? "line-through text-slate-400 font-medium" : "text-slate-800 font-bold"}`}>
                            {sub.title}
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setEditSubTasks(editSubTasks.filter((s) => s.id !== sub.id));
                          }}
                          className="text-red-500 hover:text-red-700 text-xs font-extrabold focus:outline-none px-2 py-1 hover:bg-red-55 rounded-lg cursor-pointer transition-all"
                        >
                          ✕ Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-450 italic">No sub-tasks configured for this task yet.</p>
                )}
              </div>

              {/* File Attachments Section in Edit Task Modal */}
              <div className="space-y-2.5 border-t border-slate-100 pt-3">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Paperclip size={12} className="text-teal-700" />
                    <span>Attached Files & References ({editAttachments.length})</span>
                  </label>
                </div>

                {/* Drag & Drop or Browse PC Files for Edit */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsEditDragging(true);
                  }}
                  onDragLeave={() => setIsEditDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsEditDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      Array.from(e.dataTransfer.files).forEach((f) => handleUploadFileForEditTask(f as File));
                    }
                  }}
                  className={`p-3 border-2 border-dashed rounded-xl transition-all text-center select-none ${
                    isEditDragging 
                      ? "border-teal-600 bg-teal-50" 
                      : "border-slate-200 bg-slate-50/70 hover:bg-slate-50 hover:border-teal-300"
                  }`}
                >
                  <input
                    id="edit-task-file-input"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        Array.from(e.target.files).forEach((f) => handleUploadFileForEditTask(f as File));
                      }
                      e.target.value = "";
                    }}
                  />
                  <div className="flex items-center justify-center space-x-2">
                    <Upload size={14} className={isUploadingEditAttachment ? "animate-bounce text-teal-700" : "text-slate-500"} />
                    <span className="text-xs font-semibold text-slate-700">
                      {isUploadingEditAttachment ? (
                        <span className="text-teal-700 font-bold animate-pulse">Uploading file...</span>
                      ) : (
                        <>
                          <label htmlFor="edit-task-file-input" className="text-teal-700 hover:text-teal-900 underline cursor-pointer font-bold">
                            Upload file from PC
                          </label>{" "}
                          <span className="text-slate-500">or drop here</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* External Link Option for Edit */}
                {!showEditAddLinkInput ? (
                  <button
                    type="button"
                    onClick={() => setShowEditAddLinkInput(true)}
                    className="text-[10px] text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Link size={11} />
                    <span>+ Or attach web / Google Drive link</span>
                  </button>
                ) : (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 animate-fadeIn">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                        <Link size={10} className="text-teal-700" />
                        <span>Add Web URL Reference</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowEditAddLinkInput(false);
                          setEditLinkName("");
                          setEditLinkUrl("");
                        }}
                        className="text-[10px] text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        placeholder="Link title"
                        value={editLinkName}
                        onChange={(e) => setEditLinkName(e.target.value)}
                        className="text-xs p-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700 font-medium"
                      />
                      <div className="flex gap-1">
                        <input
                          type="url"
                          placeholder="https://..."
                          value={editLinkUrl}
                          onChange={(e) => setEditLinkUrl(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddLinkForEditTask();
                            }
                          }}
                          className="text-xs p-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700 flex-1 min-w-0 font-mono"
                        />
                        <button
                          type="button"
                          onClick={handleAddLinkForEditTask}
                          disabled={!editLinkUrl.trim()}
                          className="bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg cursor-pointer shrink-0"
                        >
                          Attach
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Edit Attachments List */}
                {editAttachments.length > 0 && (
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {editAttachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      >
                        <div className="flex items-center space-x-1.5 min-w-0">
                          {att.type === "document" ? <FileText size={12} className="text-teal-700 shrink-0" /> : <Link size={12} className="text-teal-700 shrink-0" />}
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-bold text-slate-800 hover:text-teal-700 truncate max-w-[200px]"
                            title={att.name}
                          >
                            {att.name}
                          </a>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditAttachments(editAttachments.filter((a) => a.id !== att.id))}
                          className="text-slate-400 hover:text-red-600 px-1 font-bold cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2 space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-3.5 py-2 hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="save-edit-task-btn"
                  type="submit"
                  className="bg-teal-800 hover:bg-teal-900 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {taskToConfirmDelete && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center z-55 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex items-start space-x-3 text-red-650">
              <div className="p-3 bg-red-50 rounded-2xl border border-red-100 text-red-700 shrink-0">
                <AlertCircle size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-955 uppercase tracking-wider font-mono">
                  Confirm Deletion?
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 font-sans leading-relaxed">
                  Are you sure you want to delete the research task &ldquo;<strong className="text-slate-800">{taskToConfirmDelete.title}</strong>&rdquo;? All associated records and timelines will be removed.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 space-x-2">
              <button
                type="button"
                onClick={() => setTaskToConfirmDelete(null)}
                className="px-3.5 py-2 hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-task-btn"
                type="button"
                onClick={handleConfirmDelete}
                className="bg-red-700 hover:bg-red-800 border border-red-955 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Yes, Delete Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discussion Comment Deletion Confirmation Modal */}
      {commentToConfirmDelete && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center z-55 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex items-start space-x-3 text-red-650">
              <div className="p-3 bg-red-50 rounded-2xl border border-red-100 text-red-700 shrink-0">
                <AlertCircle size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-955 uppercase tracking-wider font-mono">
                  Delete Comment?
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 font-sans leading-relaxed">
                  Are you sure you want to permanently delete this comment/reply? &ldquo;<strong className="text-slate-850">{commentToConfirmDelete.commentText}</strong>&rdquo;
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 space-x-2">
              <button
                type="button"
                onClick={() => setCommentToConfirmDelete(null)}
                className="px-3.5 py-2 hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const updatedComments = commentToConfirmDelete.commentsList.filter(
                    (c) => c.id !== commentToConfirmDelete.commentId
                  );
                  if (onEditTask) {
                    onEditTask(commentToConfirmDelete.taskId, {
                      professorCommentsLog: JSON.stringify(updatedComments),
                    });
                  }
                  setCommentToConfirmDelete(null);
                }}
                className="bg-red-700 hover:bg-red-800 border border-red-955 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Yes, Delete Comment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Task Performance Reinforcement Notification */}
      {activeReinforcement && (
        <RewardCelebrationToast
          category={activeReinforcement.category}
          quote={activeReinforcement.quote}
          taskTitle={activeReinforcement.taskTitle}
          onDismiss={() => setActiveReinforcement(null)}
        />
      )}

    </div>
  );
}
