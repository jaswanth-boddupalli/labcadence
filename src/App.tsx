/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { 
  DEFAULT_USERS, DEFAULT_TASKS, DEFAULT_MEETINGS, DEFAULT_DOCUMENTS 
} from "./data";
import { 
  LabUser, LabTask, LabMeeting, LabDocument, PeerNotification, 
  LaneCategory, StatusMetric, ReviewStatus, DocClass, TaskAlert 
} from "./types";
import Switchboard from "./components/Switchboard";
import StudentWorkspace from "./components/StudentWorkspace";
import CoordinatorBridge from "./components/CoordinatorBridge";
import ProfessorLoop from "./components/ProfessorLoop";
import ExecutiveIntelligence from "./components/ExecutiveIntelligence";
import ProfileGate from "./components/ProfileGate";
import EmailAlertSettingsModal from "./components/EmailAlertSettingsModal";
import AIChatbotWidget from "./components/AIChatbotWidget";
import { 
  FolderLock, Database, ShieldAlert, FileText, CheckCircle2, 
  Info, Sparkles, ExternalLink, Paperclip, Users, X, Upload, Download, Lock, Bot
} from "lucide-react";

export default function App() {
  const [showEmailAlertsModal, setShowEmailAlertsModal] = useState(false);
  const [showAIChatbot, setShowAIChatbot] = useState(false);
  
  // State Initialization — all data loaded from PostgreSQL API on mount
  const [users, setUsers] = useState<LabUser[]>(DEFAULT_USERS);
  const [tasks, setTasks] = useState<LabTask[]>(DEFAULT_TASKS);

  const [meetings, setMeetings] = useState<LabMeeting[]>(() => {
    const saved = localStorage.getItem("labpulse_meetings");
    return saved ? JSON.parse(saved) : DEFAULT_MEETINGS;
  });

  const [documents, setDocuments] = useState<LabDocument[]>(() => {
    const saved = localStorage.getItem("labpulse_documents");
    return saved ? JSON.parse(saved) : DEFAULT_DOCUMENTS;
  });

  const [notifications, setNotifications] = useState<PeerNotification[]>(() => {
    const saved = localStorage.getItem("labpulse_notifications");
    return saved ? JSON.parse(saved) : [];
  });

  const [taskAlerts, setTaskAlerts] = useState<Record<string, TaskAlert>>(() => {
    const saved = localStorage.getItem("labpulse_task_alerts");
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem("labpulse_task_alerts", JSON.stringify(taskAlerts));
  }, [taskAlerts]);

  // Active persona session - loads from sessionStorage or null on start so Profile Selection is first
  const [activeUserId, setActiveUserId] = useState<string | null>(() => {
    return sessionStorage.getItem("labpulse_active_user") || null;
  });
  const [activeTab, setActiveTab] = useState<string>("workspace"); // Default to personal workspace

  const handleLock = () => {
    setActiveUserId(null);
    sessionStorage.removeItem("labpulse_active_user");
    localStorage.removeItem("labpulse_auth");
    showToast("Profile locked. Select your profile to enter.");
  };

  const handleSelectUser = (selectedUser: LabUser) => {
    setActiveUserId(selectedUser.userId);
    sessionStorage.setItem("labpulse_active_user", selectedUser.userId);
    if (selectedUser.designation === "Professor (PI)") {
      setActiveTab("professor");
    } else if (selectedUser.designation === "Coordinator") {
      setActiveTab("coordinator");
    } else {
      setActiveTab("workspace");
    }
    showToast(`Welcome back, ${selectedUser.name}!`);
  };

  // States for unlocking profiles with optional 4-digit PINs
  const [pinPromptUserId, setPinPromptUserId] = useState<string | null>(null);
  const [pinUnlockInput, setPinUnlockInput] = useState<string>("");
  const [pinUnlockError, setPinUnlockError] = useState<string | null>(null);

  // Simulated browser alerts for UI feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load data from PostgreSQL API on mount
  useEffect(() => {
    async function fetchDatabase() {
      try {
        const [usersRes, tasksRes, docsRes] = await Promise.all([
          fetch("/api/users"),
          fetch("/api/tasks"),
          fetch("/api/documents")
        ]);

        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(usersData || []);
          // Preserve individual profile selection: do NOT force override to Coordinator
        }
        if (tasksRes.ok) {
          const tasksData = await tasksRes.json();
          setTasks(tasksData || []);
        }
        if (docsRes.ok) {
          const docsData = await docsRes.json();
          if (docsData && docsData.length > 0) setDocuments(docsData);
        }
      } catch (err) {
        console.error("Failed to fetch from PostgreSQL", err);
      }
    }
    fetchDatabase();
  }, []);

  // Synchronize localStorage with state hooks (meetings, documents, notifications — Phase 2)

  useEffect(() => {
    localStorage.setItem("labpulse_meetings", JSON.stringify(meetings));
  }, [meetings]);

  useEffect(() => {
    localStorage.setItem("labpulse_documents", JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    localStorage.setItem("labpulse_notifications", JSON.stringify(notifications));
  }, [notifications]);

  // Shared Document Hub direct upload states
  const [showDirectUpload, setShowDirectUpload] = useState(false);
  const [directDocTitle, setDirectDocTitle] = useState("");
  const [directDocClass, setDirectDocClass] = useState<DocClass>("Research Article");
  const [directDocUrl, setDirectDocUrl] = useState("");
  const [directDocDesc, setDirectDocDesc] = useState("");
  const [directDocStudentId, setDirectDocStudentId] = useState("");
  const [directDocTaskId, setDirectDocTaskId] = useState("");
  const [directDocLocalFile, setDirectDocLocalFile] = useState<File | null>(null);
  const [isDirectDocDragging, setIsDirectDocDragging] = useState(false);

  // Find active profile with a safe fallback to prevent crashes on empty databases
  const activeUser = users.find((u) => u.userId === activeUserId) || users[0] || {
    userId: "default",
    name: "System Setup",
    designation: "Professor (PI)",
    email: "setup@local",
    phoneNumber: "000",
    rosterStatus: "ACTIVE"
  } as LabUser;

  const isCoordinator = activeUser.designation === "Coordinator" || activeUserId === "COORD_01" || activeUser.name === "J";

  // Guard tab selections based on active user role
  useEffect(() => {
    const isProfessor = activeUser.designation === "Professor (PI)";
    if (!isCoordinator && !isProfessor) {
      if (activeTab === "coordinator" || activeTab === "executive" || activeTab === "professor") {
        setActiveTab("workspace");
      }
    } else if (isProfessor) {
      if (activeTab === "coordinator" || activeTab === "executive" || activeTab === "workspace") {
        setActiveTab("professor");
      }
    } else {
      if (activeTab === "workspace") {
        setActiveTab("coordinator");
      }
    }
  }, [activeUser, activeTab]);

  // Helper to handle switching active user with optional PIN intercept
  const handleUserChangeAttempt = (targetUserId: string) => {
    if (targetUserId === activeUserId) return;
    setPinPromptUserId(targetUserId);
    setPinUnlockInput("");
    setPinUnlockError(null);
  };

  // Helper to save/remove user pins — persists to PostgreSQL
  const handleUpdateUserPin = async (userId: string, pin: string | null) => {
    const targetUser = users.find((u) => u.userId === userId);
    if (!targetUser) return;
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...targetUser, pinCode: pin || null }),
      });
      if (!res.ok) throw new Error("Failed to update PIN");
      setUsers((prev) =>
        prev.map((u) => (u.userId === userId ? { ...u, pinCode: pin || undefined } : u))
      );
    } catch (e: any) {
      console.error(e);
      showToast(`Error updating PIN: ${e.message}`);
    }
  };


  // Step 3.1: Dynamic Roster Mutation Add Student Record
  const handleAddStudent = async (newStudent: Omit<LabUser, "userId" | "rosterStatus">) => {
    // Generate new ID prefixed by designation
    let prefix = "STU_";
    if (newStudent.designation === "Professor (PI)") {
      prefix = "PROF_";
    } else if (newStudent.designation === "Coordinator") {
      prefix = "COORD_";
    }

    const activeIds = users
      .filter((u) => u.userId.startsWith(prefix))
      .map((u) => {
        const match = u.userId.match(new RegExp(`${prefix}(\\d+)`));
        return match ? parseInt(match[1], 10) : 0;
      });
    const maxVal = Math.max(...activeIds, 0);
    const nextVal = maxVal + 1;
    const nextId = `${prefix}${nextVal < 10 ? "0" + nextVal : nextVal}`;

    const studentRecord: LabUser = {
      ...newStudent,
      userId: nextId,
      rosterStatus: "ACTIVE",
    };

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studentRecord),
      });
      if (!res.ok) throw new Error("Failed to create user");
      setUsers((prev) => [...prev, studentRecord]);
      showToast(`Roster Mutation: ${newStudent.name} admitted successfully as ${nextId} (${newStudent.designation}).`);
    } catch (e: any) {
      console.error(e);
      showToast(`Error adding student: ${e.message}`);
    }
  };

  const handleEditStudent = async (userId: string, updatedFields: Partial<LabUser>) => {
    const targetUser = users.find((u) => u.userId === userId);
    if (!targetUser) return;
    const merged = { ...targetUser, ...updatedFields };
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(merged),
      });
      if (!res.ok) throw new Error("Failed to update user");
      setUsers((prev) =>
        prev.map((u) => (u.userId === userId ? merged : u))
      );
      showToast(`Scholar Profile details for ${userId} updated successfully.`);
    } catch (e: any) {
      console.error(e);
      showToast(`Error updating student: ${e.message}`);
    }
  };

  const handleDeleteStudent = async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete user");
      // Re-fetch tasks (DB cascades ON DELETE CASCADE)
      const tasksRes = await fetch("/api/tasks");
      if (tasksRes.ok) setTasks(await tasksRes.json() || []);
      // Remove user from local state
      const remainingUsers = users.filter((u) => u.userId !== userId);
      if (activeUserId === userId && remainingUsers.length > 0) {
        const preferred = remainingUsers.find((u) => u.designation === "Professor (PI)") ||
                          remainingUsers.find((u) => u.designation === "Coordinator") ||
                          remainingUsers[0];
        setActiveUserId(preferred.userId);
      }
      setUsers(remainingUsers);
      // Also refresh meetings since DB cascades those too
      setMeetings((prev) => prev.filter((m) => m.organizerId !== userId));
      showToast(`Roster profile ${userId} and all related work pipelines safely deleted.`);
    } catch (e: any) {
      console.error(e);
      showToast(`Error deleting student: ${e.message}`);
    }
  };

  // Step 3.1: Archive Student Profile
  const handleArchiveStudent = async (userId: string) => {
    const targetUser = users.find((u) => u.userId === userId);
    if (!targetUser) return;
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...targetUser, rosterStatus: "ARCHIVED" }),
      });
      if (!res.ok) throw new Error("Failed to archive user");
      setUsers((prev) =>
        prev.map((u) => (u.userId === userId ? { ...u, rosterStatus: "ARCHIVED" as const } : u))
      );
      showToast(`Roster Archive: scholar profile ${userId} roster status locked to ARCHIVED.`);
    } catch (e: any) {
      console.error(e);
      showToast(`Error archiving student: ${e.message}`);
    }
  };

  // Step 3.1.2: Unarchive (Restore) Student Profile
  const handleUnarchiveStudent = async (userId: string) => {
    const targetUser = users.find((u) => u.userId === userId);
    if (!targetUser) return;
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...targetUser, rosterStatus: "ACTIVE" }),
      });
      if (!res.ok) throw new Error("Failed to unarchive user");
      setUsers((prev) =>
        prev.map((u) => (u.userId === userId ? { ...u, rosterStatus: "ACTIVE" as const } : u))
      );
      showToast(`Roster Restoration: scholar profile ${userId} status restored to ACTIVE.`);
    } catch (e: any) {
      console.error(e);
      showToast(`Error unarchiving student: ${e.message}`);
    }
  };


  // Two-way task alert trigger for PI when student updates task / subtask / file / status / comments
  const triggerTaskAlertForPI = async (
    taskId: string,
    studentId: string,
    actionType: "new_task" | "sub_task" | "file" | "comment" | "status" | "lane" | "general" = "general",
    details?: string,
    customKeyword?: string
  ) => {
    // If the person performing the update is the PI himself, don't dispatch alert to himself
    if (activeUser.userId === "PROF_01" || activeUser.designation === "Professor (PI)") {
      return;
    }

    const student = users.find((u) => u.userId === studentId) || activeUser;
    const personName = activeUser.name || student?.name || "Lab Member";
    const task = tasks.find((t) => t.taskId === taskId);
    const taskTitle = task?.title || "Research Task";

    let keyword = customKeyword;
    if (!keyword) {
      if (actionType === "new_task") keyword = `${personName} udated new task`;
      else if (actionType === "sub_task") keyword = `${personName} Updated sub-task`;
      else if (actionType === "file") keyword = `${personName} shared a file`;
      else if (actionType === "comment") keyword = `${personName} added a comment`;
      else if (actionType === "status") keyword = `${personName} updated task status`;
      else if (actionType === "lane") keyword = `${personName} updated task lane`;
      else keyword = `${personName} updated task details`;
    }

    // 1. Update In-App Alert State
    if (taskId) {
      setTaskAlerts((prev) => ({
        ...prev,
        [taskId]: {
          taskId,
          studentId: studentId || activeUserId || "",
          unattendedForPI: true,
          piAlertReason: keyword,
          unattendedForStudent: prev[taskId]?.unattendedForStudent || false,
          studentAlertReason: prev[taskId]?.studentAlertReason,
          lastUpdated: Date.now(),
        },
      }));
    }

    // 2. Dispatch notification to PI for header bell counter accumulation
    const piUser = users.find((u) => u.designation === "Professor (PI)");
    if (piUser) {
      const newNotif: PeerNotification = {
        id: `PI_ALERT_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        targetUserId: piUser.userId,
        docId: "",
        sourceTaskId: taskId || "",
        senderName: personName,
        docTitle: keyword,
        summarySnippet: details || `${personName}: ${keyword}`,
        timestamp: Date.now(),
        read: false,
      };
      setNotifications((prev) => [...prev, newNotif]);
    }

    // 3. Dispatch automated alert notification directly to PI mail
    try {
      const res = await fetch("/api/alerts/notify-pi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderName: personName,
          senderUserId: activeUserId || studentId,
          keyword,
          taskId: taskId || undefined,
          taskTitle: taskTitle || undefined,
          details: details || `Update by ${personName}`
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`📧 Alert sent to PI: "${keyword}"`);
      }
    } catch (err) {
      console.error("Failed to dispatch alert notification to PI mail:", err);
    }
  };

  // Two-way task alert trigger for Student when PI replies / makes decision / review status
  const triggerTaskAlertForStudent = async (
    taskId: string,
    studentId: string,
    actionType: "comment" | "review_status" | "sub_task" | "file" | "status" | "general" = "general",
    details?: string,
    customKeyword?: string
  ) => {
    const student = users.find((u) => u.userId === studentId);
    const studentName = student?.name || "Scholar";
    const studentEmail = student?.email;
    const task = tasks.find((t) => t.taskId === taskId);
    const taskTitle = task?.title || "Research Task";

    let keyword = customKeyword;
    if (!keyword) {
      if (actionType === "comment") keyword = "PI added a comment";
      else if (actionType === "review_status") keyword = "PI updated review status";
      else if (actionType === "sub_task") keyword = "PI Updated sub-task";
      else if (actionType === "file") keyword = "PI shared a file";
      else if (actionType === "status") keyword = "PI updated task status";
      else keyword = "PI updated task";
    }

    // 1. Update in-app alert status for Student
    if (taskId) {
      setTaskAlerts((prev) => ({
        ...prev,
        [taskId]: {
          taskId,
          studentId,
          unattendedForPI: false,
          piAlertReason: prev[taskId]?.piAlertReason,
          unattendedForStudent: true,
          studentAlertReason: keyword,
          lastUpdated: Date.now(),
        },
      }));
    }

    // 2. Dispatch notification to Student for header bell counter accumulation
    const newNotif: PeerNotification = {
      id: `STU_ALERT_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      targetUserId: studentId,
      docId: "",
      sourceTaskId: taskId || "",
      senderName: "Principal Investigator (PI)",
      docTitle: keyword,
      summarySnippet: details || keyword,
      timestamp: Date.now(),
      read: false,
    };
    setNotifications((prev) => [...prev, newNotif]);

    // 3. Dispatch automated alert email directly to individual student's mail
    try {
      const res = await fetch("/api/alerts/notify-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          studentEmail,
          studentName,
          senderName: activeUser?.name || "Principal Investigator",
          keyword,
          taskId: taskId || undefined,
          taskTitle: taskTitle || undefined,
          details: details || `Update by PI`
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`📧 Alert sent to ${studentName} (${data.recipientEmail || studentEmail}): "${keyword}"`);
      }
    } catch (err) {
      console.error("Failed to dispatch alert email to student:", err);
    }
  };

  // Mark task attended by PI (clears unattendedForPI alert and marks matching notifications read)
  const handleMarkTaskAttendedByPI = (taskId: string) => {
    setTaskAlerts((prev) => {
      if (!prev[taskId]) return prev;
      return {
        ...prev,
        [taskId]: {
          ...prev[taskId],
          unattendedForPI: false,
        },
      };
    });
    setNotifications((prev) =>
      prev.map((n) =>
        n.sourceTaskId === taskId && n.targetUserId === activeUser.userId
          ? { ...n, read: true }
          : n
      )
    );
  };

  // Mark task attended by Student (clears unattendedForStudent alert and marks matching notifications read)
  const handleMarkTaskAttendedByStudent = (taskId: string) => {
    setTaskAlerts((prev) => {
      if (!prev[taskId]) return prev;
      return {
        ...prev,
        [taskId]: {
          ...prev[taskId],
          unattendedForStudent: false,
        },
      };
    });
    setNotifications((prev) =>
      prev.map((n) =>
        n.sourceTaskId === taskId && n.targetUserId === activeUserId
          ? { ...n, read: true }
          : n
      )
    );
  };

  // Step 3.2 Add Task Sprint in student workspace
  const handleAddTask = async (
    newTask: Omit<LabTask, "taskId" | "studentId" | "professorReviewStatus" | "professorCommentsLog">
  ) => {
    const activeTaskIds = tasks
      .filter((t) => t.taskId.startsWith("TASK_"))
      .map((t) => {
        const match = t.taskId.match(/TASK_(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      });
    const maxVal = Math.max(...activeTaskIds, 200);
    const nextTaskId = `TASK_${maxVal + 1}`;

    const taskRecord: LabTask = {
      ...newTask,
      taskId: nextTaskId,
      studentId: activeUserId || "",
      professorReviewStatus: "Pending Review",
      professorCommentsLog: JSON.stringify([]),
    };

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskRecord),
      });
      if (!res.ok) throw new Error("Failed to create task");
      setTasks((prev) => [...prev, taskRecord]);
      const attachmentCount = newTask.attachments?.length || 0;
      const attachmentSnippet = attachmentCount > 0 
        ? ` (${attachmentCount} file(s) attached: ${newTask.attachments!.map(a => a.name).join(", ")})` 
        : "";
      triggerTaskAlertForPI(
        nextTaskId,
        activeUserId || "",
        "new_task",
        `New task registered: "${newTask.title}" in ${newTask.laneCategory} lane${attachmentSnippet}. Expected deadline: ${new Date(newTask.expectedEndDate).toLocaleDateString()}`,
        `${activeUser.name} udated new task`
      );
      showToast(`Task Registered: "${newTask.title.substring(0, 30)}..." launched into Planned Lane.`);
    } catch (e: any) {
      console.error(e);
      showToast(`Error adding task: ${e.message}`);
    }
  };

  // Move Task Lane category & auto-complete date (Section 1.2 & 3.2)
  const handleUpdateTaskLane = async (taskId: string, newLane: LaneCategory) => {
    const completedTimestamp = newLane === "Completed" ? Date.now() : null;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ laneCategory: newLane, actualCompletionDate: completedTimestamp }),
      });
      if (!res.ok) throw new Error("Failed to update task lane");
      setTasks((prev) =>
        prev.map((t) => {
          if (t.taskId === taskId) {
            return {
              ...t,
              laneCategory: newLane,
              actualCompletionDate: completedTimestamp,
            };
          }
          return t;
        })
      );
      const targetTask = tasks.find((t) => t.taskId === taskId);
      if (targetTask && activeUser.designation !== "Professor (PI)") {
        triggerTaskAlertForPI(
          taskId,
          targetTask.studentId,
          "lane",
          `Task "${targetTask.title}" shifted to ${newLane} lane.`,
          `${activeUser.name} updated task lane`
        );
      }
      showToast(`Task ${taskId} shifted to ${newLane} lane.`);
    } catch (e: any) {
      console.error(e);
      showToast(`Error updating lane: ${e.message}`);
    }
  };

  // Update Task Status Metric (GREEN, YELLOW, RED)
  const handleUpdateTaskStatus = async (taskId: string, newStatus: StatusMetric) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentStatus: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setTasks((prev) =>
        prev.map((t) => (t.taskId === taskId ? { ...t, currentStatus: newStatus } : t))
      );
      const targetTask = tasks.find((t) => t.taskId === taskId);
      if (targetTask && activeUser.designation !== "Professor (PI)") {
        triggerTaskAlertForPI(
          taskId,
          targetTask.studentId,
          "status",
          `Status indicator of "${targetTask.title}" changed to ${newStatus}.`,
          `${activeUser.name} updated task status`
        );
      }
    } catch (e: any) {
      console.error(e);
      showToast(`Error updating status: ${e.message}`);
    }
  };

  // Step 3.2 Link Target Event Presentations (Meeting Anchor)
  const handleLinkEvent = (taskId: string, dateStr: string, notes: string) => {
    const activeMeetIds = meetings
      .filter((m) => m.meetingId.startsWith("MEET_"))
      .map((m) => {
        const match = m.meetingId.match(/MEET_(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      });
    const maxVal = Math.max(...activeMeetIds, 900);
    const meetId = `MEET_${maxVal + 1}`;
    
    const meetingRecord: LabMeeting = {
      meetingId: meetId,
      associatedTaskId: taskId,
      organizerId: activeUserId || "",
      scheduledTimestamp: new Date(dateStr).getTime(),
      agendaNotes: notes,
    };

    setMeetings((prev) => [...prev, meetingRecord]);
    if (activeUser.designation !== "Professor (PI)") {
      triggerTaskAlertForPI(
        taskId,
        activeUserId || "",
        "general",
        `Scheduled presentation for ${dateStr}. Agenda: ${notes}`,
        `${activeUser.name} scheduled a presentation`
      );
    }
    showToast(`Presentation Link: Milestone presentation registered successfully.`);
  };

  // Coordinator scheduled presentations
  const handleScheduleMeeting = (newMeeting: Omit<LabMeeting, "meetingId">) => {
    const activeMeetIds = meetings
      .filter((m) => m.meetingId.startsWith("MEET_"))
      .map((m) => {
        const match = m.meetingId.match(/MEET_(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      });
    const maxVal = Math.max(...activeMeetIds, 900);
    const meetId = `MEET_${maxVal + 1}`;

    const meetingRecord: LabMeeting = {
      meetingId: meetId,
      ...newMeeting,
    };
    setMeetings((prev) => [...prev, meetingRecord]);
    if (activeUser.designation !== "Professor (PI)") {
      triggerTaskAlertForPI(
        newMeeting.associatedTaskId,
        newMeeting.organizerId || activeUserId || "",
        "general",
        `Coordinator scheduled milestone presentation. Notes: ${newMeeting.agendaNotes}`,
        `${activeUser.name} scheduled a presentation`
      );
    }
    showToast("Presentation meeting scheduled successfully by Coordinator.");
  };

  // Step 3.3 Document Ingestion and Contextual Peer Tagging (Regex Search)
  const handleUploadDoc = (
    taskId: string | undefined,
    dClass: DocClass,
    storageUrl: string,
    fileTitle: string,
    description: string,
    studentId?: string
  ) => {
    const activeDocIds = documents
      .filter((d) => d.docId.startsWith("DOC_"))
      .map((d) => {
        const match = d.docId.match(/DOC_(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      });
    const maxDocVal = Math.max(...activeDocIds, 700);
    const docId = `DOC_${maxDocVal + 1}`;

    // Scan description string for regex @mention annotations corresponding to active users
    const tagMatches = description.match(/@([A-Za-z0-9_]+)/g) || [];
    const parsedMatchedUserIds = tagMatches.map((tag) => tag.substring(1).trim());

    // Filter to retain only real registered users (e.g., PROF_01, STU_01)
    const validTaggedUserIds = parsedMatchedUserIds.filter((uid) =>
      users.some((u) => u.userId === uid)
    );

    const docRecord: LabDocument = {
      docId,
      associatedTaskId: taskId || undefined,
      associatedStudentId: studentId,
      docClass: dClass,
      uploadedBy: activeUser.name,
      fileStorageUrl: storageUrl,
      taggedUsersRaw: validTaggedUserIds.map((uid) => `@${uid}`).join(", ") || "None",
      aiSummarySnippet: description, // Auto summaries of uploader's description
    };

    setDocuments((prev) => [...prev, docRecord]);
    if (taskId) {
      const targetTask = tasks.find((t) => t.taskId === taskId);
      if (targetTask && activeUser.designation !== "Professor (PI)") {
        triggerTaskAlertForPI(
          taskId,
          targetTask.studentId,
          "file",
          `File shared: "${fileTitle}" (${dClass}). Description: ${description}`,
          `${activeUser.name} shared a file`
        );
      }
    } else if (activeUser.designation !== "Professor (PI)") {
      triggerTaskAlertForPI(
        "",
        studentId || activeUserId || "",
        "file",
        `File shared in Hub: "${fileTitle}" (${dClass}). Description: ${description}`,
        `${activeUser.name} shared a file`
      );
    }

    // Construct and dispatch alert notification blocks to targeted tagged users
    if (validTaggedUserIds.length > 0) {
      const newNotifs: PeerNotification[] = validTaggedUserIds.map((uid) => ({
        id: `ALERT_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        targetUserId: uid,
        docId,
        sourceTaskId: taskId || "",
        senderName: activeUser.name,
        docTitle: fileTitle,
        summarySnippet: description,
        timestamp: Date.now(),
        read: false,
      }));

      setNotifications((prev) => [...prev, ...newNotifs]);
      showToast(`Tagging Router: Dispatched analytical alert block notices to ${validTaggedUserIds.join(", ")}`);
    } else {
      showToast(`Document ingested successfully directly.`);
    }
  };

  const handleHubDirectDocSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directDocTitle.trim()) return;
    
    let generatedUrl = directDocUrl.trim();
    if (directDocLocalFile) {
      try {
        generatedUrl = URL.createObjectURL(directDocLocalFile);
      } catch (_) {
        generatedUrl = `https://labpulse.drive/local-uploads/${encodeURIComponent(directDocLocalFile.name)}`;
      }
    }
    
    if (!generatedUrl) {
      generatedUrl = `https://labpulse.drive/assets/${directDocTitle.toLowerCase().replace(/\s+/g, "-")}.pdf`;
    }

    handleUploadDoc(
      directDocTaskId || undefined,
      directDocClass,
      generatedUrl,
      directDocTitle.trim(),
      directDocDesc.trim(),
      directDocStudentId || undefined
    );

    setShowDirectUpload(false);
    setDirectDocTitle("");
    setDirectDocClass("Research Article");
    setDirectDocUrl("");
    setDirectDocDesc("");
    setDirectDocStudentId("");
    setDirectDocTaskId("");
    setDirectDocLocalFile(null);
    setIsDirectDocDragging(false);
  };

  // Add Professor PI Comment
  const handleAddPIComment = async (taskId: string, commentText: string) => {
    const task = tasks.find((t) => t.taskId === taskId);
    if (!task) return;
    
    let currentComments = [];
    try {
      currentComments = JSON.parse(task.professorCommentsLog || "[]");
    } catch (_) {
      currentComments = [];
    }

    const newCommentRecord = {
      id: `COMM_${Date.now()}`,
      timestamp: Date.now(),
      author: activeUser.name,
      comment: commentText,
    };
    
    const newLog = JSON.stringify([...currentComments, newCommentRecord]);

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ professorCommentsLog: newLog }),
      });
      if (!res.ok) throw new Error("Failed to add comment");
      setTasks((prev) =>
        prev.map((t) => (t.taskId === taskId ? { ...t, professorCommentsLog: newLog } : t))
      );
      triggerTaskAlertForStudent(
        taskId,
        task.studentId,
        "comment",
        `Guidance / Comment: "${commentText}"`,
        `PI added a comment`
      );
      handleMarkTaskAttendedByPI(taskId);
      showToast(`Review Append: Guidance logged under Task ${taskId}.`);
    } catch (e: any) {
      console.error(e);
      showToast(`Error adding comment: ${e.message}`);
    }
  };

  // Update Professor Review sign-off details (Pending, Approved, Revision)
  const handleUpdateReviewStatus = async (taskId: string, newReviewStatus: ReviewStatus) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ professorReviewStatus: newReviewStatus }),
      });
      if (!res.ok) throw new Error("Failed to update review status");
      setTasks((prev) =>
        prev.map((t) =>
          t.taskId === taskId ? { ...t, professorReviewStatus: newReviewStatus } : t
        )
      );
      const targetTask = tasks.find((t) => t.taskId === taskId);
      if (targetTask) {
        triggerTaskAlertForStudent(
          taskId,
          targetTask.studentId,
          "review_status",
          `Review sign-off status updated to "${newReviewStatus}" for task "${targetTask.title}".`,
          `PI updated review status to ${newReviewStatus}`
        );
      }
      handleMarkTaskAttendedByPI(taskId);
      showToast(`Task ${taskId} review state committed to: ${newReviewStatus}.`);
    } catch (e: any) {
      console.error(e);
      showToast(`Error updating review status: ${e.message}`);
    }
  };

  // Clear or dismiss alerts/notifications (Sphere 4 feed)
  const handleMarkNotificationAsRead = (notifId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
    );
  };

  const handleClearNotifications = () => {
    setNotifications((prev) => prev.filter((n) => n.targetUserId !== activeUserId));
  };

  // --- Task, Meeting, Document Mutations and confirmation helpers ---
  const handleEditTask = async (taskId: string, updatedFields: Partial<LabTask>) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedFields),
      });
      if (!res.ok) throw new Error("Failed to edit task");
      setTasks((prev) =>
        prev.map((t) => (t.taskId === taskId ? { ...t, ...updatedFields } : t))
      );
      const targetTask = tasks.find((t) => t.taskId === taskId);
      if (targetTask && activeUser.designation !== "Professor (PI)") {
        if (updatedFields.subTasks) {
          const doneCount = updatedFields.subTasks.filter(s => s.isCompleted).length;
          const totalCount = updatedFields.subTasks.length;
          triggerTaskAlertForPI(
            taskId,
            targetTask.studentId,
            "sub_task",
            `Sub-task progress: ${doneCount}/${totalCount} completed. [${updatedFields.subTasks.map(s => (s.isCompleted ? '✓' : '○') + ' ' + s.title).join(', ')}]`,
            `${activeUser.name} Updated sub-task`
          );
        } else if (updatedFields.professorCommentsLog) {
          let latestComment = "Added a comment in discussion thread.";
          try {
            const parsed = JSON.parse(updatedFields.professorCommentsLog);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const last = parsed[parsed.length - 1];
              latestComment = last.comment || last.text || latestComment;
            }
          } catch (_) {}
          triggerTaskAlertForPI(
            taskId,
            targetTask.studentId,
            "comment",
            `Comment logged on "${targetTask.title}": "${latestComment}"`,
            `${activeUser.name} added a comment`
          );
        } else if (updatedFields.attachments) {
          triggerTaskAlertForPI(
            taskId,
            targetTask.studentId,
            "file",
            `Attachments updated (${updatedFields.attachments.length} files attached).`,
            `${activeUser.name} shared a file`
          );
        } else if (updatedFields.currentStatus) {
          triggerTaskAlertForPI(
            taskId,
            targetTask.studentId,
            "status",
            `Status indicator changed to ${updatedFields.currentStatus}.`,
            `${activeUser.name} updated task status`
          );
        } else if (updatedFields.revisedEndDate) {
          triggerTaskAlertForPI(
            taskId,
            targetTask.studentId,
            "general",
            `Target deadline revised to ${new Date(updatedFields.revisedEndDate).toLocaleDateString()}.`,
            `${activeUser.name} updated task deadline`
          );
        } else {
          triggerTaskAlertForPI(
            taskId,
            targetTask.studentId,
            "general",
            `Task details modified for "${updatedFields.title || targetTask.title}".`,
            `${activeUser.name} updated task`
          );
        }
      } else if (targetTask && activeUser.designation === "Professor (PI)") {
        // Dispatched directly to individual student's mail
        if (updatedFields.subTasks) {
          const doneCount = updatedFields.subTasks.filter(s => s.isCompleted).length;
          const totalCount = updatedFields.subTasks.length;
          triggerTaskAlertForStudent(
            taskId,
            targetTask.studentId,
            "sub_task",
            `Sub-task progress updated by PI: ${doneCount}/${totalCount} completed. [${updatedFields.subTasks.map(s => (s.isCompleted ? '✓' : '○') + ' ' + s.title).join(', ')}]`,
            `PI Updated sub-task`
          );
        } else if (updatedFields.professorCommentsLog) {
          let latestComment = "Added guidance in discussion thread.";
          try {
            const parsed = JSON.parse(updatedFields.professorCommentsLog);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const last = parsed[parsed.length - 1];
              latestComment = last.comment || last.text || latestComment;
            }
          } catch (_) {}
          triggerTaskAlertForStudent(
            taskId,
            targetTask.studentId,
            "comment",
            `Guidance / Feedback on "${targetTask.title}": "${latestComment}"`,
            `PI added a comment`
          );
        } else if (updatedFields.attachments) {
          triggerTaskAlertForStudent(
            taskId,
            targetTask.studentId,
            "file",
            `Attachments updated by PI (${updatedFields.attachments.length} files attached).`,
            `PI shared a file`
          );
        } else if (updatedFields.currentStatus) {
          triggerTaskAlertForStudent(
            taskId,
            targetTask.studentId,
            "status",
            `Status indicator changed to ${updatedFields.currentStatus} by PI.`,
            `PI updated task status`
          );
        } else if (updatedFields.revisedEndDate) {
          triggerTaskAlertForStudent(
            taskId,
            targetTask.studentId,
            "general",
            `Target deadline revised to ${new Date(updatedFields.revisedEndDate).toLocaleDateString()} by PI.`,
            `PI updated task deadline`
          );
        } else {
          triggerTaskAlertForStudent(
            taskId,
            targetTask.studentId,
            "general",
            `Task details modified by PI for "${updatedFields.title || targetTask.title}".`,
            `PI updated task`
          );
        }
      }
      showToast(`Task ${taskId} details updated successfully.`);
    } catch (e: any) {
      console.error(e);
      showToast(`Error editing task: ${e.message}`);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete task");
      setTasks((prev) => prev.filter((t) => t.taskId !== taskId));
      
      // Re-fetch cascading records (meetings cascade, documents set-null)
      const [meetingsRes, docsRes] = await Promise.all([
        fetch("/api/meetings").catch(() => null),
        fetch("/api/documents")
      ]);
      // Note: /api/meetings might not exist yet if Phase 2 isn't deployed, so we fallback gracefully
      if (docsRes.ok) {
        const docs = await docsRes.json();
        setDocuments(docs || []);
      }
      
      setMeetings((prev) => prev.filter((m) => m.associatedTaskId !== taskId)); // Optimistic local clean
      
      showToast(`Task ${taskId} and associated records successfully deleted.`);
    } catch (e: any) {
      console.error(e);
      showToast(`Error deleting task: ${e.message}`);
    }
  };

  const handleEditMeeting = (meetingId: string, updatedFields: Partial<LabMeeting>) => {
    setMeetings((prev) =>
      prev.map((m) => (m.meetingId === meetingId ? { ...m, ...updatedFields } : m))
    );
    showToast(`Scheduled Presentation completed rescheduling.`);
  };

  const handleDeleteMeeting = (meetingId: string) => {
    setMeetings((prev) => prev.filter((m) => m.meetingId !== meetingId));
    showToast(`Scheduled presentation ${meetingId} successfully deleted.`);
  };

  // Edit & Delete states for Documents
  const [editingDoc, setEditingDoc] = useState<LabDocument | null>(null);
  const [editDocClass, setEditDocClass] = useState<DocClass>("Research Article");
  const [editDocSummary, setEditDocSummary] = useState("");
  const [docToConfirmDelete, setDocToConfirmDelete] = useState<LabDocument | null>(null);

  const startEditingDocument = (doc: LabDocument) => {
    setEditingDoc(doc);
    setEditDocClass(doc.docClass);
    setEditDocSummary(doc.aiSummarySnippet);
  };

  const handleSaveDocEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc) return;
    setDocuments((prev) =>
      prev.map((d) =>
        d.docId === editingDoc.docId
          ? { ...d, docClass: editDocClass, aiSummarySnippet: editDocSummary }
          : d
      )
    );
    setEditingDoc(null);
    showToast(`Shared Document Asset ${editingDoc.docId} updated successfully.`);
  };

  const handleConfirmDeleteDoc = () => {
    if (docToConfirmDelete) {
      setDocuments((prev) => prev.filter((d) => d.docId !== docToConfirmDelete.docId));
      setDocToConfirmDelete(null);
      showToast("Selected document asset was successfully removed from Sphere 4.");
    }
  };

  const handleExportData = () => {
    const exportData = {
      users,
      tasks,
      meetings,
      documents,
      notifications
    };
    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `labpulse_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast("Application data exported successfully.");
  };

  if (!activeUserId) {
    return (
      <ProfileGate
        users={users}
        onSelectUser={handleSelectUser}
        onUpdateUserPin={handleUpdateUserPin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col antialiased">
      
      {/* Switchboard Persona Selector Center & Peer tagging alert badge */}
      <Switchboard
        users={users}
        activeUserId={activeUserId}
        onUserChange={handleUserChangeAttempt}
        onLockProfile={handleLock}
        notifications={notifications}
        onMarkNotificationAsRead={handleMarkNotificationAsRead}
        onClearNotifications={handleClearNotifications}
        onUpdateUserPin={handleUpdateUserPin}
        onAddStudent={handleAddStudent}
        onEditStudent={handleEditStudent}
        onDeleteStudent={handleDeleteStudent}
        onOpenEmailSettings={isCoordinator ? () => setShowEmailAlertsModal(true) : undefined}
      />

      {/* PI Email Alert Settings & Dispatched History Modal - ONLY for Coordinator Profile */}
      {isCoordinator && (
        <EmailAlertSettingsModal
          isOpen={showEmailAlertsModal}
          onClose={() => setShowEmailAlertsModal(false)}
          onShowToast={showToast}
          currentUserName={activeUser.name}
        />
      )}

      {/* Toast Alert Popups */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white rounded-2xl px-5 py-4 shadow-2xl border border-slate-800 flex items-center space-x-3 max-w-sm"
          >
            <Sparkles className="text-teal-400 shrink-0" size={18} />
            <span className="text-xs font-semibold leading-relaxed font-sans">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Navigation Routing Bar tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-3 non-printable">
          <button
            id="tab-btn-documents"
            onClick={() => setActiveTab("documents")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
              activeTab === "documents"
                ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Shared Document Hub
          </button>

          {activeUser.designation !== "Professor (PI)" && activeUser.designation !== "Coordinator" && (
            <button
              id="tab-btn-workspace"
              onClick={() => setActiveTab("workspace")}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                activeTab === "workspace"
                  ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              My Research Workspace
            </button>
          )}

          {/* Coordinator Bridge & Executive Report Compiler - ONLY for COORDINATOR Profile */}
          {(activeUser.designation === "Coordinator" || activeUserId === "COORD_01") && (
            <>
              <button
                id="tab-btn-coordinator"
                onClick={() => setActiveTab("coordinator")}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                  activeTab === "coordinator"
                    ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Coordinator Bridge
              </button>

              <button
                id="tab-btn-executive"
                onClick={() => setActiveTab("executive")}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                  activeTab === "executive"
                    ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Executive Report Compiler
              </button>
            </>
          )}

          {(activeUser.designation === "Professor (PI)" || activeUser.designation === "Coordinator") && (
            <button
              id="tab-btn-professor"
              onClick={() => setActiveTab("professor")}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                activeTab === "professor"
                  ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              PI Evaluation Loop
            </button>
          )}

          {/* Feature 1: AI Chatbot Feature is ONLY for PI and COORDINATOR */}
          {(activeUser.designation === "Professor (PI)" || activeUser.designation === "Coordinator" || isCoordinator) && (
            <button
              id="tab-btn-ai-assistant"
              onClick={() => setShowAIChatbot(true)}
              className="px-3.5 py-2 rounded-xl font-bold text-xs cursor-pointer transition-all bg-gradient-to-r from-teal-900 to-slate-900 text-teal-200 hover:text-white border border-teal-700/50 shadow-sm flex items-center space-x-1.5"
              title="PI & Coordinator AI Lab Assistant (Live RAG)"
            >
              <Bot size={14} className="text-teal-400 animate-pulse" />
              <span>AI Lab Assistant</span>
              <span className="text-[9px] font-mono bg-teal-500/20 text-emerald-300 px-1 py-0.2 rounded border border-teal-500/30">RAG</span>
            </button>
          )}

          <div className="flex-1"></div>
          
          <button
            onClick={handleLock}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl font-bold text-xs cursor-pointer transition-all bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 shadow-sm ml-2"
            title="Lock the application"
          >
            <Lock size={14} />
            <span>Lock</span>
          </button>

          <button
            onClick={handleExportData}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl font-bold text-xs cursor-pointer transition-all bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 shadow-sm ml-auto"
            title="Download all application data"
          >
            <Download size={14} />
            <span>Export Data</span>
          </button>
        </div>

        {/* Tab Components Wrapper */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            
            {/* Tab 1: Shared Document Hub (Sphere 4) */}
            {activeTab === "documents" && (
              <motion.div
                key="documents-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
                        <FolderLock className="text-teal-800" size={24} />
                        <span>Sphere 4: Shared Document Hub</span>
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        A collective intellectual repository. Literature articles, wet-lab sheets, and patent drafts are registered under tasks or direct profiles with dynamic tagging notification routers.
                      </p>
                    </div>
                    <button
                      type="button"
                      id="direct-upload-file-btn"
                      onClick={() => {
                        setShowDirectUpload(true);
                        setDirectDocTitle("");
                        setDirectDocClass("Research Article");
                        setDirectDocUrl("");
                        setDirectDocDesc("");
                        setDirectDocStudentId("");
                        setDirectDocTaskId("");
                      }}
                      className="bg-teal-800 hover:bg-teal-900 border border-teal-955 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-md shadow-teal-900/10 hover:shadow-lg hover:shadow-teal-900/15 cursor-pointer font-sans shrink-0"
                    >
                      <Upload size={14} />
                      <span>Upload / Attach File</span>
                    </button>
                  </div>

                  {/* Documents Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                    {documents.map((doc) => {
                      const associatedTask = doc.associatedTaskId ? tasks.find((t) => t.taskId === doc.associatedTaskId) : undefined;
                      const studentId = doc.associatedStudentId || (associatedTask ? associatedTask.studentId : undefined);
                      const studentObj = studentId ? users.find((u) => u.userId === studentId) : null;

                      return (
                        <div
                          key={doc.docId}
                          className="bg-slate-50 border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                        >
                          <div className="space-y-2.5">
                            <div className="flex justify-between items-start">
                              <span className="text-[10px] font-mono font-black uppercase text-teal-850 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                                {doc.docClass}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 font-bold">{doc.docId}</span>
                            </div>

                            {associatedTask ? (
                              <p className="text-xs font-extrabold text-slate-800 leading-snug">
                                Ref Task: &ldquo;{associatedTask.title}&rdquo;
                              </p>
                            ) : studentObj ? (
                              <p className="text-xs font-extrabold text-teal-800 leading-snug">
                                Member Profile Attachment: <strong className="text-slate-800">{studentObj.name}</strong>
                              </p>
                            ) : (
                              <p className="text-xs font-extrabold text-slate-500 leading-snug">
                                General Lab Asset
                              </p>
                            )}

                            <p className="text-[11px] text-slate-600 leading-relaxed italic bg-white p-3 border border-slate-150 rounded-xl">
                              &ldquo;{doc.aiSummarySnippet}&rdquo;
                            </p>

                            <div className="pt-1.5 space-y-1">
                              <p className="text-[10px] text-slate-450 font-mono">
                                Uploaded By: <strong className="text-slate-700">{doc.uploadedBy}</strong>
                              </p>
                              {doc.taggedUsersRaw && doc.taggedUsersRaw !== "None" && (
                                <div className="flex items-center space-x-1">
                                  <span className="text-[10px] font-mono bg-indigo-50 border border-indigo-200 text-indigo-800 font-black px-1.5 rounded uppercase">Mentions</span>
                                  <span className="text-[10px] font-mono font-bold text-slate-605">{doc.taggedUsersRaw}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-200/60 flex justify-between items-center text-[10px] font-mono gap-1 animate-fadeIn">
                            <span className="text-slate-400 shrink-0">
                              {doc.associatedTaskId ? `Task: ${doc.associatedTaskId}` : studentObj ? `Member: ${studentObj.userId}` : "General Asset"}
                            </span>
                            <div className="flex items-center space-x-1">
                              <button
                                type="button"
                                id={`edit-doc-btn-${doc.docId}`}
                                onClick={() => startEditingDocument(doc)}
                                className="text-indigo-850 hover:bg-indigo-50 border border-indigo-150 rounded px-2 py-1 font-bold cursor-pointer text-[9px] transition-colors shrink-0"
                              >
                                EDIT
                              </button>
                              <button
                                type="button"
                                id={`delete-doc-btn-${doc.docId}`}
                                onClick={() => setDocToConfirmDelete(doc)}
                                className="text-red-755 hover:bg-red-55 border border-red-150 rounded px-2 py-1 font-bold cursor-pointer text-[9px] transition-colors shrink-0"
                              >
                                Delete
                              </button>
                              <a
                                href={doc.fileStorageUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-teal-850 hover:text-teal-900 font-bold flex items-center space-x-0.5 bg-white hover:bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg transition-colors cursor-pointer text-[9px] shrink-0"
                              >
                                <span>Inspect</span>
                                <ExternalLink size={8} />
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Tab 2: Student Workspace (Sphere 1) - Only rendered for scholars */}
            {activeTab === "workspace" && activeUser.designation !== "Professor (PI)" && activeUser.designation !== "Coordinator" && (
              <motion.div
                key="workspace-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
              >
                <StudentWorkspace
                  student={activeUser}
                  tasks={tasks}
                  meetings={meetings}
                  documents={documents}
                  allUsers={users}
                  onAddTask={handleAddTask}
                  onUpdateTaskLane={handleUpdateTaskLane}
                  onUpdateTaskStatus={handleUpdateTaskStatus}
                  onLinkEvent={handleLinkEvent}
                  onUploadDoc={handleUploadDoc}
                  onDeleteTask={handleDeleteTask}
                  onEditTask={handleEditTask}
                  taskAlerts={taskAlerts}
                  onMarkTaskAttendedByStudent={handleMarkTaskAttendedByStudent}
                />
              </motion.div>
            )}

            {/* Tab 3: Coordinator Bridge (Sphere 2) - ONLY for Coordinator */}
            {activeTab === "coordinator" && (activeUser.designation === "Coordinator" || activeUserId === "COORD_01") && (
              <motion.div
                key="coordinator-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
              >
                <CoordinatorBridge
                  users={users}
                  tasks={tasks}
                  meetings={meetings}
                  onAddStudent={handleAddStudent}
                  onArchiveStudent={handleArchiveStudent}
                  onUnarchiveStudent={handleUnarchiveStudent}
                  onScheduleMeeting={handleScheduleMeeting}
                  onDeleteMeeting={handleDeleteMeeting}
                  onEditMeeting={handleEditMeeting}
                  onEditStudent={handleEditStudent}
                  onDeleteStudent={handleDeleteStudent}
                  documents={documents}
                  onUploadDoc={handleUploadDoc}
                />
              </motion.div>
            )}
 
            {/* Tab 4: Professor Sign-Off Evaluation Loop (Sphere 3) */}
            {activeTab === "professor" && (
              <motion.div
                key="professor-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
              >
                <ProfessorLoop
                  professor={activeUser}
                  tasks={tasks}
                  students={users.filter((u) => u.designation !== "Professor (PI)" && u.designation !== "Coordinator")}
                  onAddPIComment={handleAddPIComment}
                  onUpdateReviewStatus={handleUpdateReviewStatus}
                  onEditTask={handleEditTask}
                  taskAlerts={taskAlerts}
                  onMarkTaskAttendedByPI={handleMarkTaskAttendedByPI}
                />
              </motion.div>
            )}

            {/* Tab 5: Executive Query Report Compiler (Sphere 5) - ONLY for Coordinator */}
            {activeTab === "executive" && (activeUser.designation === "Coordinator" || activeUserId === "COORD_01") && (
              <motion.div
                key="executive-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
              >
                <ExecutiveIntelligence
                  students={users}
                  tasks={tasks}
                  meetings={meetings}
                  documents={documents}
                />
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </main>

      {/* Footer Branding Area */}
      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800 non-printable">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-2">
          <p className="text-xs tracking-wide">
            Done by Nihal and jaswanth
          </p>
        </div>
      </footer>      {/* Centered PIN Unlock Dialog Overlay */}
      {pinPromptUserId && (() => {
        const targetUserObj = users.find((u) => u.userId === pinPromptUserId);
        const coordinatorObj = users.find((u) => u.userId === "COORD_01" || u.designation === "Coordinator");
        const isPinConfigured = Boolean(targetUserObj?.pinCode);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-xs w-full p-6 border border-slate-200 shadow-2xl relative animate-scaleUp">
              
              <button
                onClick={() => setPinPromptUserId(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-650 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>

              <div className="flex flex-col items-center text-center space-y-3 mb-6">
                <div className="p-3 bg-teal-50 rounded-2xl border border-teal-100 text-teal-800">
                  <FolderLock size={24} />
                </div>
                <div className="space-y-1 select-none">
                  <h3 className="text-xs font-black text-slate-955 uppercase tracking-wider font-mono">
                    Profile Lock Screen
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {isPinConfigured ? (
                      <>Please enter the 4-digit password configured by <strong className="text-slate-800">{targetUserObj?.name}</strong> to enter.</>
                    ) : (
                      <>No private password is set yet for <strong className="text-slate-800">{targetUserObj?.name}</strong>. Create a 4-digit PIN now to secure this account.</>
                    )}
                  </p>
                </div>
              </div>

              {pinUnlockError && (
                <div className="p-2.5 mb-4 rounded-xl bg-red-50 border border-red-200 text-[10px] text-red-700 font-bold text-center">
                  {pinUnlockError}
                </div>
              )}

              <div className="space-y-4">
                <input
                  id="unlock-pin-input"
                  type="password"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength={4}
                  value={pinUnlockInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setPinUnlockInput(val);
                    setPinUnlockError(null);
                  }}
                  placeholder="••••"
                  className="w-full text-center tracking-widest text-lg font-mono font-bold p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  autoFocus
                />

                <div className="flex gap-2">
                  <button
                    onClick={() => setPinPromptUserId(null)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-xl text-xs font-extrabold cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!targetUserObj) return;

                      if (!isPinConfigured) {
                        if (!/^\d{4}$/.test(pinUnlockInput)) {
                          setPinUnlockError("PIN password must be exactly 4 digits.");
                          return;
                        }
                        await handleUpdateUserPin(pinPromptUserId, pinUnlockInput);
                        setActiveUserId(pinPromptUserId);
                        setPinPromptUserId(null);
                        showToast(`Password Established: Persona changed to ${targetUserObj.name}.`);
                      } else {
                        const isMatch = pinUnlockInput === targetUserObj.pinCode;
                        const isCoordinatorMaster = coordinatorObj?.pinCode && pinUnlockInput === coordinatorObj.pinCode;

                        if (isMatch || isCoordinatorMaster) {
                          setActiveUserId(pinPromptUserId);
                          setPinPromptUserId(null);
                          showToast(`Access Cleared: Persona changed to ${targetUserObj.name}.`);
                        } else {
                          setPinUnlockError("Incorrect password. Please try again.");
                          setPinUnlockInput("");
                        }
                      }
                    }}
                    className="flex-1 py-2.5 bg-teal-800 hover:bg-teal-900 border border-teal-950 text-white rounded-xl text-xs font-extrabold shadow-sm cursor-pointer transition-colors"
                  >
                    {isPinConfigured ? "Unlock" : "Set & Unlock"}
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Edit Shared Document Asset Modal */}
      {editingDoc && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center z-55 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex justify-between items-start pb-2 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-bold text-slate-900 tracking-tight leading-none">
                  Edit Shared Document Node Metadata
                </h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Revise classification or description keywords.
                </p>
              </div>
              <button
                onClick={() => setEditingDoc(null)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDocEdit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Document Class / Genre</label>
                <select
                  id="edit-doc-class-select"
                  value={editDocClass}
                  onChange={(e) => setEditDocClass(e.target.value as DocClass)}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                >
                  <option value="Research Article">Research Article</option>
                  <option value="Lab Protocol">Lab Protocol</option>
                  <option value="Data Sheet">Data Sheet</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description & AI Summary</label>
                <textarea
                  id="edit-doc-summary-textarea"
                  required
                  rows={4}
                  value={editDocSummary}
                  onChange={(e) => setEditDocSummary(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                />
              </div>

              <div className="flex justify-end pt-2 space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="px-3.5 py-2 hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="save-edit-doc-btn"
                  type="submit"
                  className="bg-teal-800 hover:bg-teal-900 border border-teal-950 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Document Confirmation Dialog */}
      {docToConfirmDelete && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center z-55 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex items-start space-x-3 text-red-650">
              <div className="p-3 bg-red-50 rounded-2xl border border-red-100 text-red-700 shrink-0">
                <ShieldAlert size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-955 uppercase tracking-wider font-mono">
                  Confirm Ingestion Removals?
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 font-sans leading-relaxed">
                  Are you sure you want to delete document asset &ldquo;<strong className="text-slate-800">{docToConfirmDelete.docId}</strong>&rdquo;? Mentions and linked notification alert pipelines will be broken.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 space-x-2">
              <button
                type="button"
                onClick={() => setDocToConfirmDelete(null)}
                className="px-3.5 py-2 hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-doc-btn"
                type="button"
                onClick={handleConfirmDeleteDoc}
                className="bg-red-700 hover:bg-red-800 border border-red-955 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Yes, Purge Asset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shared Document Hub Direct Upload Modal */}
      {showDirectUpload && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-55 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Upload className="text-teal-800" size={16} />
                  <span>Direct Document Upload</span>
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Upload an academic file asset. Link it directly to a researcher and/or task.
                </p>
              </div>
              <button
                onClick={() => setShowDirectUpload(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleHubDirectDocSubmit} className="space-y-3">
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
                      setDirectDocLocalFile(file);
                      setDirectDocTitle(file.name);
                    }
                  }}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-1 ${
                    isDirectDocDragging ? 'border-teal-600 bg-teal-50/50' : 'border-slate-200 hover:border-teal-350 bg-slate-50'
                  }`}
                >
                  <input
                    type="file"
                    id="direct-pc-file"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        setDirectDocLocalFile(file);
                        setDirectDocTitle(file.name);
                      }
                    }}
                  />
                  <label htmlFor="direct-pc-file" className="cursor-pointer w-full h-full flex flex-col items-center">
                    <Paperclip className="text-teal-650 mb-1" size={24} />
                    <p className="text-[11px] font-bold text-slate-700">
                      {directDocLocalFile ? directDocLocalFile.name : "Choose a local file from PC"}
                    </p>
                    <p className="text-[9px] text-slate-400">
                      {directDocLocalFile 
                        ? `${(directDocLocalFile.size / 1024).toFixed(1)} KB — Click to change` 
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
                  placeholder="e.g. DNA Isolation Bio-Protocol"
                  value={directDocTitle}
                  onChange={(e) => setDirectDocTitle(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Storage link {directDocLocalFile && "(Simulated)"}</label>
                  <input
                    type="text"
                    disabled={!!directDocLocalFile}
                    placeholder={directDocLocalFile ? "Generated from PC file..." : "https://drive.google/..."}
                    value={directDocLocalFile ? `local-file://${directDocLocalFile.name}` : directDocUrl}
                    onChange={(e) => setDirectDocUrl(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              </div>

              {/* Link options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Assign to Researcher</label>
                  <select
                    value={directDocStudentId}
                    onChange={(e) => setDirectDocStudentId(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                  >
                    <option value="">-- No Specific Scholar --</option>
                    {users.map((u) => (
                      <option key={u.userId} value={u.userId}>
                        {u.name} ({u.userId})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Link to Active Task</label>
                  <select
                    value={directDocTaskId}
                    onChange={(e) => setDirectDocTaskId(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                  >
                    <option value="">-- No Active Task --</option>
                    {tasks.map((t) => {
                      const researcher = users.find((u) => u.userId === t.studentId);
                      return (
                        <option key={t.taskId} value={t.taskId}>
                          {t.title} ({researcher ? researcher.name : t.studentId})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description summary / tagging</label>
                  <span className="text-[9px] font-mono text-slate-400">@Name to tag</span>
                </div>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide brief details about this file. Mentions on @PROF_01, @STU_02 will trigger alerts."
                  value={directDocDesc}
                  onChange={(e) => setDirectDocDesc(e.target.value)}
                  className="w-full text-xs font-medium p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end pt-2 space-x-2">
                <button
                  type="button"
                  onClick={() => setShowDirectUpload(false)}
                  className="px-3.5 py-2 hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-teal-800 hover:bg-teal-900 border border-teal-950 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  Upload Ingestion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FEATURE 1: AI Chatbot Feature is ONLY for PI and COORDINATOR */}
      {(activeUser.designation === "Professor (PI)" || activeUser.designation === "Coordinator" || isCoordinator) && (
        <AIChatbotWidget
          activeUser={activeUser}
          isCoordinator={isCoordinator}
          isOpen={showAIChatbot}
          onToggleOpen={() => setShowAIChatbot(!showAIChatbot)}
        />
      )}

    </div>
  );
}
