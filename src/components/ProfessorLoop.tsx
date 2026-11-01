/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { LabUser, LabTask, ReviewStatus, ProfessorComment, TaskAlert } from "../types";
import ContactActions from "./ContactActions";
import { 
  ShieldCheck, AlertOctagon, MessageSquare, Check, X, RefreshCw, Send, 
  HelpCircle, ChevronRight, GraduationCap, ArrowUpRight, Link, FileText, Trash2,
  ChevronDown, ChevronUp, Bell, Users, Sparkles, Mail, Edit
} from "lucide-react";

interface ProfessorLoopProps {
  professor: LabUser;
  tasks: LabTask[];
  students: LabUser[];
  onAddPIComment: (taskId: string, comment: string) => void;
  onUpdateReviewStatus: (taskId: string, status: ReviewStatus) => void;
  onEditTask?: (taskId: string, updatedFields: Partial<LabTask>) => void;
  taskAlerts?: Record<string, TaskAlert>;
  onMarkTaskAttendedByPI?: (taskId: string) => void;
}

export default function ProfessorLoop({
  professor,
  tasks,
  students,
  onAddPIComment,
  onUpdateReviewStatus,
  onEditTask,
  taskAlerts,
  onMarkTaskAttendedByPI,
}: ProfessorLoopProps) {
  
  // Local comments text tracker by taskId
  const [commentInputs, setCommentInputs] = useState<{ [taskId: string]: string }>({});
  
  // State for expanding/collapsing individual student/person layers
  const [expandedStudentIds, setExpandedStudentIds] = useState<Record<string, boolean>>({});

  // State for expanding/collapsing individual tasks
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<string, boolean>>({});

  const toggleStudentExpand = (studentId: string) => {
    setExpandedStudentIds((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  const toggleTaskExpand = (taskId: string) => {
    const nextState = !expandedTaskIds[taskId];
    setExpandedTaskIds((prev) => ({
      ...prev,
      [taskId]: nextState,
    }));
    // When PI opens/expands the task, mark it attended
    if (nextState && onMarkTaskAttendedByPI) {
      onMarkTaskAttendedByPI(taskId);
    }
  };

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [commentToConfirmDelete, setCommentToConfirmDelete] = useState<{
    taskId: string;
    commentId: string;
    commentText: string;
    commentsList: ProfessorComment[];
  } | null>(null);

  const handleSendComment = (taskId: string) => {
    const text = commentInputs[taskId]?.trim();
    if (!text) return;

    onAddPIComment(taskId, text);
    setCommentInputs(prev => ({ ...prev, [taskId]: "" }));
    if (onMarkTaskAttendedByPI) {
      onMarkTaskAttendedByPI(taskId);
    }
  };

  // Group tasks by student / person name
  const studentsWithTasks = useMemo(() => {
    return students
      .map((student) => {
        const studentTasks = tasks.filter((t) => t.studentId === student.userId);
        const pendingCount = studentTasks.filter((t) => t.professorReviewStatus === "Pending Review").length;
        const blockedCount = studentTasks.filter((t) => t.currentStatus === "RED").length;
        const unattendedAlertsCount = studentTasks.filter(
          (t) => taskAlerts?.[t.taskId]?.unattendedForPI
        ).length;
        return {
          student,
          tasks: studentTasks,
          pendingCount,
          blockedCount,
          unattendedAlertsCount,
        };
      })
      .filter((group) => group.tasks.length > 0)
      .sort((a, b) => {
        // Students with unattended alerts come first, then pending reviews, then name
        if (b.unattendedAlertsCount !== a.unattendedAlertsCount) {
          return b.unattendedAlertsCount - a.unattendedAlertsCount;
        }
        if (b.pendingCount !== a.pendingCount) {
          return b.pendingCount - a.pendingCount;
        }
        return a.student.name.localeCompare(b.student.name);
      });
  }, [students, tasks, taskAlerts]);

  // Overall metric counters
  const totalUnattendedAlerts = useMemo(() => {
    return tasks.filter((t) => taskAlerts?.[t.taskId]?.unattendedForPI).length;
  }, [tasks, taskAlerts]);

  const totalPendingReviews = useMemo(() => {
    return tasks.filter((t) => t.professorReviewStatus === "Pending Review").length;
  }, [tasks]);

  return (
    <div className="space-y-8 font-sans">
      
      {/* Principal Investigator Portal Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden">
        <div className="absolute left-0 top-0 w-80 h-80 bg-teal-800/5 rounded-full blur-2xl -ml-20 -mt-25 pointer-events-none"></div>
        <div className="space-y-2 z-10">
          <div className="flex flex-wrap items-center gap-2">
            <GraduationCap className="text-teal-800" size={24} />
            <span className="text-[10px] font-mono tracking-widest font-black uppercase text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200/50">
              Principal Investigator Portal
            </span>
            <span className="text-[11px] font-mono text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-2xs">
              <Mail size={12} className="text-teal-700" />
              <span className="font-semibold">{professor.email}</span>
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-950 tracking-tight">
            {professor.name} Evaluation Loop
          </h2>
          <p className="text-xs text-slate-500 max-w-xl">
            Authorize clearances, review student tasks grouped by researcher, resolve thermal blocks, and issue feedback append logs directly into academic lifecycles.
          </p>
        </div>

        {/* Action Counters / Alert Handles */}
        <div className="mt-4 md:mt-0 flex flex-wrap gap-2.5 items-center shrink-0">
          {totalUnattendedAlerts > 0 && (
            <div className="px-4 py-3 bg-red-600 text-white rounded-2xl text-center md:text-right shrink-0 shadow-md shadow-red-600/20 animate-pulse">
              <p className="text-[10px] font-bold uppercase tracking-widest font-mono flex items-center justify-center md:justify-end gap-1">
                <Bell size={12} className="fill-white" />
                <span>Unattended Alerts</span>
              </p>
              <p className="text-xl font-black mt-0.5">{totalUnattendedAlerts} Action{totalUnattendedAlerts > 1 ? 's' : ''} Needed</p>
            </div>
          )}
          <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl text-center md:text-right shrink-0">
            <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest font-mono">Pending Reviews</p>
            <p className="text-xl font-black text-amber-950 mt-0.5">{totalPendingReviews} Tasks</p>
          </div>
        </div>
      </div>

      {/* Main Review Dashboard: Person Layer Categories */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
              <ShieldCheck className="text-teal-800" size={18} />
              <span>Student Evaluation Queue — Categorized by Person</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Click on any researcher's name below to expand and evaluate their specific tasks and unattended alerts.
            </p>
          </div>
          <div className="text-[11px] font-mono font-bold text-slate-500">
            {studentsWithTasks.length} Active Researcher{studentsWithTasks.length > 1 ? 's' : ''}
          </div>
        </div>

        <div className="divide-y divide-slate-150">
          {studentsWithTasks.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <ShieldCheck size={40} className="text-slate-250 mx-auto stroke-[1.5]" />
              <p className="font-bold text-slate-700 text-sm mt-3.5">Evaluation Queue Clean</p>
              <p className="text-xs text-slate-500 mt-1">
                There are currently no tasks registered under any students globally. Outstanding work.
              </p>
            </div>
          ) : (
            studentsWithTasks.map((group) => {
              const isStudentExpanded = !!expandedStudentIds[group.student.userId];
              const hasAlerts = group.unattendedAlertsCount > 0;

              return (
                <div key={group.student.userId} className="border-b border-slate-150 last:border-b-0">
                  {/* Layer: Person Name & Summary (Click to expand person) */}
                  <div
                    id={`person-layer-${group.student.userId}`}
                    onClick={() => toggleStudentExpand(group.student.userId)}
                    className={`p-4 sm:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer transition-colors select-none ${
                      hasAlerts 
                        ? "bg-red-50/20 hover:bg-red-50/40" 
                        : isStudentExpanded 
                        ? "bg-slate-50/70" 
                        : "hover:bg-slate-50/60 bg-white"
                    }`}
                    title="Click to view/hide tasks from this person"
                  >
                    <div className="flex items-center space-x-3.5 flex-1 min-w-0">
                      <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-teal-800 to-teal-950 text-white font-black flex items-center justify-center text-sm shadow-sm shrink-0">
                        {group.student.name.replace(/^(Mr.|Ms.|Dr.|Prof.)s+/i, "").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight leading-tight truncate hover:text-teal-900">
                            {group.student.name}
                          </h3>
                          <span className="text-[10px] font-mono font-bold text-teal-850 bg-teal-50 border border-teal-200/60 px-2 py-0.5 rounded-full shrink-0">
                            {group.student.designation}
                          </span>
                        </div>
                        {group.student.researchDomain && (
                          <p className="text-[11px] text-slate-500 font-medium truncate font-sans">
                            {group.student.researchDomain} {group.student.thesisTopic ? `· "${group.student.thesisTopic}"` : ""}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Badges, Alert Count & Expand controls */}
                    <div className="flex flex-wrap items-center gap-2 self-end md:self-auto shrink-0" onClick={(e) => e.stopPropagation()}>
                      {/* Bell Icon with Alert Count for Unattended tasks */}
                      {hasAlerts && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-red-600 text-white font-black text-[11px] rounded-full animate-pulse shadow-sm shadow-red-500/30">
                          <Bell size={12} className="fill-white" />
                          <span>{group.unattendedAlertsCount} Unattended Alert{group.unattendedAlertsCount > 1 ? 's' : ''}</span>
                        </span>
                      )}

                      {group.pendingCount > 0 && (
                        <span className="text-[10px] font-extrabold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                          {group.pendingCount} Pending Review
                        </span>
                      )}

                      {group.blockedCount > 0 && (
                        <span className="text-[10px] font-extrabold text-red-800 bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg animate-pulse">
                          {group.blockedCount} Blocked
                        </span>
                      )}

                      <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                        {group.tasks.length} Task{group.tasks.length > 1 ? 's' : ''}
                      </span>

                      <ContactActions
                        name={group.student.name}
                        email={group.student.email}
                        phoneNumber={group.student.phoneNumber}
                        compact={true}
                      />

                      <button
                        type="button"
                        onClick={() => toggleStudentExpand(group.student.userId)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer ml-1"
                      >
                        <span>{isStudentExpanded ? "Hide Tasks" : "View Tasks"}</span>
                        {isStudentExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Tasks List for this person */}
                  {isStudentExpanded && (
                    <div className="bg-slate-50/70 p-4 sm:p-5 pl-4 sm:pl-14 border-t border-slate-150 space-y-3 animate-fadeIn">
                      <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold">
                        <span>Tasks by {group.student.name} ({group.tasks.length})</span>
                        <span className="text-[9px] text-slate-400 font-sans normal-case">Click task box to open/close details</span>
                      </div>

                      <div className="space-y-2.5">
                        {group.tasks.map((task) => {
                          const taskAlert = taskAlerts?.[task.taskId];
                          const isUnattended = !!taskAlert?.unattendedForPI;
                          const isExpanded = !!expandedTaskIds[task.taskId];
                          const isBlocked = task.currentStatus === "RED";

                          // Comments list extraction
                          let commentsList: ProfessorComment[] = [];
                          if (task.professorCommentsLog) {
                            try {
                              commentsList = JSON.parse(task.professorCommentsLog);
                            } catch (_) {
                              commentsList = [];
                            }
                          }

                          // 1. Collapsed state: Small box displaying only the title of the task (with bell alert if unattended)
                          if (!isExpanded) {
                            return (
                              <div
                                key={task.taskId}
                                id={`pi-task-box-${task.taskId}`}
                                onClick={() => toggleTaskExpand(task.taskId)}
                                className={`p-3 px-4 rounded-xl border transition-all cursor-pointer group flex items-center justify-between gap-3 shadow-xs ${
                                  isUnattended
                                    ? 'bg-red-50/25 border-red-300 ring-1 ring-red-200/80 hover:bg-red-50/50'
                                    : isBlocked
                                    ? 'bg-amber-50/20 border-amber-200 hover:bg-amber-50/40'
                                    : 'bg-white border-slate-200 hover:bg-teal-50/20 hover:border-teal-400'
                                }`}
                                title="Click to expand task review"
                              >
                                <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                                  {/* Bell Icon alert if unattended */}
                                  {isUnattended ? (
                                    <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-white bg-red-600 px-2 py-0.5 rounded-full animate-pulse shrink-0 shadow-xs">
                                      <Bell size={10} className="fill-white" />
                                      <span>{taskAlert?.piAlertReason || "Unattended Alert"}</span>
                                    </span>
                                  ) : (
                                    <span
                                      className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                                        isBlocked 
                                          ? "bg-red-500 animate-pulse" 
                                          : task.professorReviewStatus === "Pending Review" 
                                          ? "bg-yellow-500" 
                                          : "bg-emerald-500"
                                      }`}
                                      title={isBlocked ? "RED Block Metric" : task.professorReviewStatus}
                                    />
                                  )}
                                  <h4 className="text-xs font-bold text-slate-800 tracking-tight leading-snug line-clamp-2 group-hover:text-teal-900">
                                    {task.title}
                                  </h4>
                                </div>
                                <div className="shrink-0 flex items-center space-x-1.5 text-slate-400 group-hover:text-teal-700">
                                  <span className="text-[10px] font-mono font-medium hidden sm:inline">Expand</span>
                                  <ChevronDown size={14} className="transition-transform duration-200" />
                                </div>
                              </div>
                            );
                          }

                          // 2. Expanded state: Full review card with collapse header
                          return (
                            <div 
                              key={task.taskId} 
                              id={`pi-task-box-${task.taskId}`}
                              className={`p-6 rounded-2xl border-2 transition-all space-y-4 animate-fadeIn shadow-md ${
                                isBlocked ? 'bg-red-50/15 border-red-300' : 'bg-white border-teal-650/80'
                              }`}
                            >
                              {/* Clickable Header to Collapse */}
                              <div
                                onClick={() => toggleTaskExpand(task.taskId)}
                                className="flex justify-between items-start gap-3 cursor-pointer pb-3 border-b border-slate-200/80 group select-none"
                                title="Click to collapse review"
                              >
                                <div className="space-y-1 flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    {isUnattended && (
                                      <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-white bg-red-600 px-2 py-0.5 rounded-full animate-pulse shadow-xs">
                                        <Bell size={10} className="fill-white" />
                                        <span>{taskAlert?.piAlertReason || "Unattended Update"}</span>
                                      </span>
                                    )}
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                                      task.currentStatus === "RED"
                                        ? "bg-red-100 text-red-800 animate-pulse border border-red-200"
                                        : "bg-yellow-100 text-yellow-800 border border-yellow-250"
                                    }`}>
                                      {task.currentStatus} Block Metric
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-400">ID: {task.taskId}</span>
                                    <ChevronRight size={12} className="text-slate-400" />
                                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200/50">
                                      Pipeline: {task.laneCategory}
                                    </span>
                                  </div>

                                  <div>
                                    {task.taskTag && (
                                      <span className="inline-block mb-1 text-[9px] font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">
                                        {task.taskTag}
                                      </span>
                                    )}
                                    <h4 className="text-sm font-extrabold text-slate-900 tracking-tight leading-snug group-hover:text-teal-800 transition-colors">
                                      {task.title}
                                    </h4>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-1.5 text-teal-800 pl-2 shrink-0">
                                  <span className="text-[10px] font-mono font-bold">Collapse</span>
                                  <ChevronUp size={16} />
                                </div>
                              </div>

                              <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
                                
                                {/* Research Item Metadata and Context */}
                                <div className="space-y-3 flex-1">
                                  
                                  {/* Timeline */}
                                  <div className="text-[10px] text-slate-500 font-mono flex flex-wrap gap-x-4 gap-y-1">
                                    <span>Started: <strong className="text-slate-700">{new Date(task.startDate).toLocaleDateString()}</strong></span>
                                    <span>Deadline: <strong className={isBlocked ? "text-red-700 font-extrabold" : "text-slate-700"}>{new Date(task.expectedEndDate).toLocaleDateString()}</strong></span>
                                    {task.revisedEndDate && (
                                      <span className="text-yellow-750 font-black bg-yellow-50 border border-yellow-200/50 px-1.5 py-0.5 rounded">
                                        Revised: {new Date(task.revisedEndDate).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>

                                  {/* Sub-tasks lists for PI Context */}
                                  {task.subTasks && task.subTasks.length > 0 && (
                                    <div className="mt-2.5 space-y-1.5 bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                                      <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-extrabold">Sub-task Checklist Milestones</p>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 px-1">
                                        {task.subTasks.map((sub) => (
                                          <div key={sub.id} className="flex items-center space-x-2 text-[10px] leading-tight">
                                            <span className={`text-[11px] font-black shrink-0 ${sub.isCompleted ? "text-emerald-600" : "text-slate-300"}`}>
                                              {sub.isCompleted ? "●" : "○"}
                                            </span>
                                            <span className={`font-medium ${sub.isCompleted ? "line-through text-slate-450 font-normal" : "text-slate-700 font-bold"}`}>
                                              {sub.title}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Attachments for PI Context */}
                                  {task.attachments && task.attachments.length > 0 && (
                                    <div className="mt-2.5 space-y-1.5 bg-indigo-50/50 border border-indigo-100 rounded-xl p-2.5">
                                      <p className="text-[10px] font-mono uppercase tracking-widest text-indigo-700 font-extrabold flex items-center gap-1">
                                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                                        Attached Documents & Links
                                      </p>
                                      <div className="flex flex-col gap-1.5 px-1">
                                        {task.attachments.map((att) => (
                                          <div key={att.id} className="flex items-center gap-1.5">
                                            <a
                                              href={att.url}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="flex-1 flex items-center space-x-2 p-1.5 bg-white hover:bg-indigo-50 border border-indigo-150 rounded-lg cursor-pointer text-[10px] transition-all text-indigo-900 shadow-xs"
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
                                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 bg-white rounded-lg transition-colors cursor-pointer shrink-0 shadow-xs"
                                              title="Remove attachment"
                                            >
                                              <Trash2 size={11} />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Review Signing Buttons & Append Loop */}
                                <div className="space-y-4 w-full lg:w-96 shrink-0 lg:border-l lg:border-slate-150 lg:pl-6">
                                  <div className="space-y-1.5">
                                    <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Review Sign-Off Decisions</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      <button
                                        id={`approve-btn-${task.taskId}`}
                                        onClick={() => {
                                          onUpdateReviewStatus(task.taskId, "Approved");
                                          if (onMarkTaskAttendedByPI) onMarkTaskAttendedByPI(task.taskId);
                                        }}
                                        className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer border transition-all ${
                                          task.professorReviewStatus === "Approved"
                                            ? "bg-emerald-800 text-white border-emerald-950"
                                            : "bg-emerald-50 text-emerald-800 border-emerald-250 hover:bg-emerald-100"
                                        }`}
                                      >
                                        <Check size={12} />
                                        <span>Mark Approved</span>
                                      </button>
                                      <button
                                        id={`rev-request-btn-${task.taskId}`}
                                        onClick={() => {
                                          onUpdateReviewStatus(task.taskId, "Revision Requested");
                                          if (onMarkTaskAttendedByPI) onMarkTaskAttendedByPI(task.taskId);
                                        }}
                                        className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer border transition-all ${
                                          task.professorReviewStatus === "Revision Requested"
                                            ? "bg-red-800 text-white border-red-950"
                                            : "bg-red-50 text-red-800 hover:bg-red-100 border-red-250"
                                        }`}
                                      >
                                        <X size={12} />
                                        <span>Request Revision</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Comment Append Input */}
                                  <div className="space-y-1.5">
                                    <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Chronological feedback remarks</label>
                                    <div className="relative">
                                      <input
                                        id={`feedback-comment-input-${task.taskId}`}
                                        type="text"
                                        placeholder="Add guidance / feedback for student..."
                                        value={commentInputs[task.taskId] || ""}
                                        onChange={(e) => setCommentInputs(prev => ({ ...prev, [task.taskId]: e.target.value }))}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleSendComment(task.taskId);
                                          }
                                        }}
                                        className="w-full text-xs font-semibold pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                                      />
                                      <button
                                        id={`send-comment-btn-${task.taskId}`}
                                        type="button"
                                        onClick={() => handleSendComment(task.taskId)}
                                        className="absolute right-1 w-8 h-8 top-1 cursor-pointer hover:bg-teal-50 text-teal-800 border border-teal-100/50 rounded-lg flex items-center justify-center"
                                        title="Commit feedback comment"
                                      >
                                        <Send size={12} />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Display historic evaluation append remarks */}
                                  {commentsList.length > 0 && (
                                    <div className="bg-slate-50 border border-slate-150 p-3 rounded-2xl space-y-2">
                                      <p className="text-[9px] font-mono uppercase tracking-widest text-slate-400 font-black">Feedback Registry ({commentsList.length})</p>
                                      <div className="divide-y divide-slate-150 max-h-32 overflow-y-auto space-y-1.5">
                                        {commentsList.map((comm) => (
                                          <div key={comm.id} className="text-[10px] pt-1.5 first:pt-0 space-y-1">
                                            <div className="flex justify-between items-center font-mono text-[9px] text-slate-400">
                                              <span className="font-bold text-slate-600">{comm.author}</span>
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
                                                          commentsList: commentsList,
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
                                                        const updatedComments = commentsList.map(c => 
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
                                                      const updatedComments = commentsList.map(c => 
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
                                              <p className="text-slate-600 mt-0.5 italic leading-relaxed">&ldquo;{comm.comment}&rdquo;</p>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                </div>

                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
      
      {/* Comment Deletion Confirmation Modal */}
      {commentToConfirmDelete && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center z-55 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4 animate-scaleUp text-left">
            <div className="flex items-start space-x-3 text-red-650">
              <div className="p-3 bg-red-50 rounded-2xl border border-red-100 text-red-700 shrink-0">
                <AlertOctagon size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-955 uppercase tracking-wider font-mono">
                  Delete PI Feedback?
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 font-sans leading-relaxed">
                  Are you sure you want to permanently delete this academic evaluation comment? &ldquo;<strong className="text-slate-850">{commentToConfirmDelete.commentText}</strong>&rdquo;
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
                Yes, Delete Feedback
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
