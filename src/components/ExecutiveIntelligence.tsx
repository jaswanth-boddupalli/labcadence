/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { LabUser, LabTask, LabMeeting, LabDocument } from "../types";
import { 
  Plus, Calendar, Mail, FileText, Download, Printer, Play, 
  CheckCircle2, Sparkles, Loader2, ListChecks, CheckSquare, Square, RefreshCcw,
  AlertTriangle
} from "lucide-react";

interface ExecutiveIntelligenceProps {
  students: LabUser[];
  tasks: LabTask[];
  meetings: LabMeeting[];
  documents: LabDocument[];
}

interface CompiledReportData {
  startDate: string;
  endDate: string;
  totalMembers: number;
  totalTasks: number;
  completedTasksCount: number;
  doingTasksCount: number;
  plannedTasksCount: number;
  redStatusCount: number;
  studentBreakdowns: {
    userId: string;
    name: string;
    designation: string;
    researchDomain?: string;
    thesisTopic?: string;
    completed: LabTask[];
    doing: LabTask[];
    planned: LabTask[];
    feedbackComments: string[];
  }[];
}

export default function ExecutiveIntelligence({
  students,
  tasks,
  meetings,
  documents,
}: ExecutiveIntelligenceProps) {
  
  // Date selection states (aligned to default business boundaries 2026-05-01 to 2026-06-15)
  const [startDateStr, setStartDateStr] = useState("2026-05-01");
  const [endDateStr, setEndDateStr] = useState("2026-06-15");

  // Multi-select roster state (initialise checking all active ones)
  const activeScholars = students.filter((s) => s.rosterStatus === "ACTIVE");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(
    activeScholars.map((s) => s.userId)
  );

  // Compile states
  const [isCompiling, setIsCompiling] = useState(false);
  const [compiledReport, setCompiledReport] = useState<string | null>(null);
  const [compiledReportData, setCompiledReportData] = useState<CompiledReportData | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);

  // Toggle single user
  const handleToggleStudent = (userId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Toggle Select All
  const handleToggleSelectAll = () => {
    if (selectedStudentIds.length === activeScholars.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(activeScholars.map((s) => s.userId));
    }
  };

  // Compiler request execution
  const handleCompileReports = () => {
    setCompileError(null);
    setIsCompiling(true);
    setCompiledReport(null);
    setCompiledReportData(null);

    const startEpoch = new Date(startDateStr).getTime();
    const endEpoch = new Date(endDateStr).getTime();

    // Perform data slice selection strictly based on target date boundaries & selected target personnel
    const filteredTasks = tasks.map(t => {
      let parsedComments: any[] = [];
      try {
        parsedComments = JSON.parse(t.professorCommentsLog || "[]");
      } catch (_) {
        parsedComments = [];
      }
      return { ...t, comments: parsedComments };
    }).filter((t) => {
      const belongsToStudent = selectedStudentIds.includes(t.studentId);
      
      const taskInDatesRange = 
        (t.startDate >= startEpoch && t.startDate <= endEpoch) ||
        (t.expectedEndDate >= startEpoch && t.expectedEndDate <= endEpoch) ||
        (t.actualCompletionDate && t.actualCompletionDate >= startEpoch && t.actualCompletionDate <= endEpoch);

      return belongsToStudent && taskInDatesRange;
    });

    const filteredStudents = students.filter((s) =>
      selectedStudentIds.includes(s.userId)
    );

    // Build the clean structured report info object
    const studentBreakdowns = filteredStudents.map((student) => {
      const scholarTasks = filteredTasks.filter((t) => t.studentId === student.userId);
      const completed = scholarTasks.filter((t) => t.laneCategory === "Completed");
      const doing = scholarTasks.filter((t) => t.laneCategory === "Doing" || (t.laneCategory as any) === "In Progress" || (t.laneCategory as any) === "Ongoing");
      const planned = scholarTasks.filter((t) => t.laneCategory === "Planned");

      // Extract all evaluation comments left during this period
      const bComments: string[] = [];
      scholarTasks.forEach((t) => {
        t.comments.forEach((c: any) => {
          const commentText = typeof c === "object" ? c.comment || c.text : c;
          bComments.push(`[Task: ${t.title}] "${commentText}" (${c.author || "PI Verification"})`);
        });
      });

      return {
        userId: student.userId,
        name: student.name,
        designation: student.designation,
        researchDomain: student.researchDomain,
        thesisTopic: student.thesisTopic,
        completed,
        doing,
        planned,
        feedbackComments: bComments,
      };
    });

    const totalTasks = studentBreakdowns.reduce((sum, b) => sum + b.completed.length + b.doing.length + b.planned.length, 0);
    const completedTasksCount = studentBreakdowns.reduce((sum, b) => sum + b.completed.length, 0);
    const doingTasksCount = studentBreakdowns.reduce((sum, b) => sum + b.doing.length, 0);
    const plannedTasksCount = studentBreakdowns.reduce((sum, b) => sum + b.planned.length, 0);
    const redStatusCount = studentBreakdowns.reduce((sum, b) => {
      const redInS = [...b.completed, ...b.doing, ...b.planned].filter(t => t.currentStatus === "RED").length;
      return sum + redInS;
    }, 0);

    const reportData: CompiledReportData = {
      startDate: startDateStr,
      endDate: endDateStr,
      totalMembers: filteredStudents.length,
      totalTasks,
      completedTasksCount,
      doingTasksCount,
      plannedTasksCount,
      redStatusCount,
      studentBreakdowns,
    };

    // Fast, responsive presentation processing simulation (600ms)
    setTimeout(() => {
      setCompiledReportData(reportData);
      
      // Generate clean markdown representation for markdown and docx download assets
      let mdReport = `# Laboratory Progress Summary Report\n\n`;
      mdReport += `**Evaluation Window:** ${startDateStr} to ${endDateStr}\n`;
      mdReport += `**Selected Cohort Profiles:** ${filteredStudents.length} active members\n`;
      mdReport += `**Total Tasks Audited:** ${totalTasks} entries (${completedTasksCount} Completed, ${doingTasksCount} Ongoing, ${plannedTasksCount} Planned)\n\n`;
      mdReport += `***\n\n`;

      studentBreakdowns.forEach((b) => {
        mdReport += `## Member: ${b.name} (${b.designation})\n`;
        if (b.researchDomain) mdReport += `- **Specialization:** ${b.researchDomain}\n`;
        if (b.thesisTopic) mdReport += `- **Objective:** ${b.thesisTopic}\n`;
        mdReport += `\n`;

        mdReport += `### Completed Tasks vs Timelines\n`;
        if (b.completed.length > 0) {
          b.completed.forEach((t) => {
            mdReport += `- ${t.title} (Started: ${new Date(t.startDate).toLocaleDateString()}, Ended: ${t.actualCompletionDate ? new Date(t.actualCompletionDate).toLocaleDateString() : 'Completed'}, Status Check: ${t.currentStatus})\n`;
          });
        } else {
          mdReport += `- No completed tasks found in this period.\n`;
        }
        mdReport += `\n`;

        mdReport += `### Active Tasks (Doing)\n`;
        if (b.doing.length > 0) {
          b.doing.forEach((t) => {
            mdReport += `- ${t.title} (Started: ${new Date(t.startDate).toLocaleDateString()}, Expected: ${new Date(t.expectedEndDate).toLocaleDateString()}, Status: ${t.currentStatus})\n`;
          });
        } else {
          mdReport += `- No active tasks in progress.\n`;
        }
        mdReport += `\n`;

        mdReport += `### Planned Tasks\n`;
        if (b.planned.length > 0) {
          b.planned.forEach((t) => {
            mdReport += `- ${t.title} (Target Start: ${new Date(t.startDate).toLocaleDateString()}, Expected: ${new Date(t.expectedEndDate).toLocaleDateString()}, Status: ${t.currentStatus})\n`;
          });
        } else {
          mdReport += `- No upcoming tasks planned.\n`;
        }
        mdReport += `\n`;

        mdReport += `### Feedback & Reviews Digest\n`;
        if (b.feedbackComments.length > 0) {
          b.feedbackComments.forEach((c) => {
            mdReport += `- ${c}\n`;
          });
        } else {
          mdReport += `- No reviews or feedback comments logged in this period.\n`;
        }
        mdReport += `\n***\n\n`;
      });

      setCompiledReport(mdReport);
      setIsCompiling(false);
    }, 600);
  };

  // Downloads processed report material
  const handleDownloadMarkdown = () => {
    if (!compiledReport) return;
    const blob = new Blob([compiledReport], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `OMI_Academic_Log_${startDateStr}_to_${endDateStr}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Simulates download ready docx
  const handleDownloadDocx = () => {
    if (!compiledReport) return;
    
    // Use proper MS Word HTML markup
    const headerHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>Academic Report</title>
      <style>
        body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.6; color: #333; }
        h1 { color: #0f172a; font-size: 24pt; text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 20px; }
        h2 { color: #0f766e; font-size: 16pt; margin-top: 30px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; }
        h3 { color: #334155; font-size: 13pt; margin-top: 20px; }
        p { margin: 10px 0; }
        table { border-collapse: collapse; width: 100%; margin: 15px 0; }
        th { background-color: #f1f5f9; color: #0f172a; font-weight: bold; padding: 10px; border: 1px solid #cbd5e1; text-align: left; }
        td { padding: 10px; border: 1px solid #cbd5e1; }
        ul { margin: 10px 0; padding-left: 20px; }
        li { margin-bottom: 8px; }
        .highlight { background-color: #f0fdf4; color: #166534; padding: 2px 6px; font-weight: bold; border-radius: 4px; }
        .highlight-yellow { background-color: #fefce8; color: #854d0e; padding: 2px 6px; font-weight: bold; border-radius: 4px; }
        .highlight-red { background-color: #fef2f2; color: #991b1b; padding: 2px 6px; font-weight: bold; border-radius: 4px; }
      </style>
    </head>
    <body>`;
    
    let bodyHtml = `<h1>Laboratory Progress Summary Report</h1>`;
    bodyHtml += `<p><strong>Evaluation Window:</strong> ${startDateStr} to ${endDateStr}</p>`;
    
    if (compiledReportData) {
      compiledReportData.studentBreakdowns.forEach((b: any) => {
        bodyHtml += `<h2>Member: ${b.name} (${b.designation})</h2>`;
        if (b.researchDomain) bodyHtml += `<p><strong>Specialization:</strong> ${b.researchDomain}</p>`;
        if (b.thesisTopic) bodyHtml += `<p><strong>Objective:</strong> ${b.thesisTopic}</p>`;
        
        bodyHtml += `<h3>Completed Tasks</h3>`;
        if (b.completed.length > 0) {
          bodyHtml += `<table><thead><tr><th>Task Title</th><th>Start Date</th><th>Completion Date</th><th>Review Status</th></tr></thead><tbody>`;
          b.completed.forEach((t: any) => {
            bodyHtml += `<tr>
              <td><strong>${t.title}</strong></td>
              <td>${new Date(t.startDate).toLocaleDateString()}</td>
              <td>${t.actualCompletionDate ? new Date(t.actualCompletionDate).toLocaleDateString() : 'Completed'}</td>
              <td><span class="highlight">${t.professorReviewStatus}</span></td>
            </tr>`;
          });
          bodyHtml += `</tbody></table>`;
        } else {
          bodyHtml += `<p><em>No completed tasks found in this period.</em></p>`;
        }

        bodyHtml += `<h3>Active Tasks (In Progress)</h3>`;
        if (b.doing.length > 0) {
          bodyHtml += `<ul>`;
          b.doing.forEach((t: any) => {
            let statusClass = "highlight";
            if(t.currentStatus === "YELLOW") statusClass = "highlight-yellow";
            if(t.currentStatus === "RED") statusClass = "highlight-red";
            
            bodyHtml += `<li><strong>${t.title}</strong> (Started: ${new Date(t.startDate).toLocaleDateString()}, Deadline: ${new Date(t.expectedEndDate).toLocaleDateString()}) - <span class="${statusClass}">${t.currentStatus}</span></li>`;
          });
          bodyHtml += `</ul>`;
        } else {
          bodyHtml += `<p><em>No active tasks in progress.</em></p>`;
        }

        bodyHtml += `<h3>Planned Tasks</h3>`;
        if (b.planned.length > 0) {
          bodyHtml += `<ul>`;
          b.planned.forEach((t: any) => {
            bodyHtml += `<li><strong>${t.title}</strong> (Target Start: ${new Date(t.startDate).toLocaleDateString()})</li>`;
          });
          bodyHtml += `</ul>`;
        } else {
          bodyHtml += `<p><em>No upcoming tasks planned.</em></p>`;
        }

        bodyHtml += `<h3>Feedback & Reviews Digest</h3>`;
        if (b.feedbackComments.length > 0) {
          bodyHtml += `<ul>`;
          b.feedbackComments.forEach((c: string) => {
            bodyHtml += `<li><em>&ldquo;${c}&rdquo;</em></li>`;
          });
          bodyHtml += `</ul>`;
        } else {
          bodyHtml += `<p><em>No reviews or comments logged in this period.</em></p>`;
        }
      });
    }

    const footerHtml = `</body></html>`;
    
    // MS Word understands application/msword and .doc extension for HTML payloads.
    // The \ufeff byte order mark ensures UTF-8 rendering.
    const blob = new Blob(['\ufeff', headerHtml + bodyHtml + footerHtml], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `OMI_Academic_Log_${startDateStr}_to_${endDateStr}.doc`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Native Print Dialog
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 font-sans">
      
      {/* Search banner */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-800 to-indigo-950 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none"></div>
        <div className="space-y-2 z-10">
          <div className="flex items-center space-x-3">
            <span className="text-[10px] font-mono tracking-widest uppercase bg-indigo-500/30 text-indigo-150 font-bold px-2.5 py-1 rounded-full border border-indigo-400/20 flex items-center space-x-1">
              <Sparkles size={10} className="text-indigo-300 mr-1" />
              <span>Executive Reporting Portal</span>
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight flex items-center space-x-2">
            <span>Executive Progress Compiler</span>
          </h2>
          <p className="text-xs text-indigo-100 max-w-xl">
            Select student rosters, boundary dates, pull inner intersections of metadata automatically and generate a clean comprehensive laboratory progress report.
          </p>
        </div>
      </div>

      {/* Query Configuration Form */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest font-mono">
              Configure Date Ranges & Target Cohort
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Select date ranges and check members to include in the compiled progress summary.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Calendar Window Selectors */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center space-x-2">
              <Calendar size={14} className="text-teal-800" />
              <span>1. Enter Date Boundaries</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Start Date</label>
                <input
                  id="calendar-start-input"
                  type="date"
                  value={startDateStr}
                  onChange={(e) => setStartDateStr(e.target.value)}
                  className="w-full text-xs font-semibold p-3 text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">End Date</label>
                <input
                  id="calendar-end-input"
                  type="date"
                  value={endDateStr}
                  onChange={(e) => setEndDateStr(e.target.value)}
                  className="w-full text-xs font-semibold p-3 text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
              *The system compiles all tasks and comments logged within these selected boundaries.
            </p>
          </div>

          {/* Roster Checked Boxes */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center space-x-2">
                <ParagraphIcon size={14} className="text-indigo-800" />
                <span>2. Select Members to Include</span>
              </h4>
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="text-[10px] font-bold text-teal-800 hover:text-teal-900 bg-teal-50 hover:bg-teal-100/50 px-2.5 py-1 rounded-md cursor-pointer"
              >
                {selectedStudentIds.length === activeScholars.length ? "Deselect All" : "Select All"}
              </button>
            </div>

            <div className="bg-slate-50/50 border border-slate-150 rounded-2xl p-4 space-y-2.5 max-h-48 overflow-y-auto">
              {activeScholars.map((student) => {
                const isSelected = selectedStudentIds.includes(student.userId);
                return (
                  <label
                    key={student.userId}
                    className="flex items-center space-x-3 p-2 bg-white border border-slate-150 rounded-xl hover:border-slate-350 hover:bg-slate-50 cursor-pointer select-none transition-all"
                  >
                    <input
                      id={`cohort-checkbox-${student.userId}`}
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleStudent(student.userId)}
                      className="hidden"
                    />
                    <div className="text-teal-850 shrink-0">
                      {isSelected ? (
                        <CheckSquare size={16} className="fill-teal-50" />
                      ) : (
                        <Square size={16} className="text-slate-300" />
                      )}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-850 leading-none">{student.name}</p>
                      <p className="text-[10px] text-slate-500 truncate leading-tight mt-1">{student.designation} {student.researchDomain ? `— ${student.researchDomain}` : ''}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

        </div>

        {/* Compile Trigger Frame */}
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            id="compile-reports-master-btn"
            disabled={isCompiling || selectedStudentIds.length === 0}
            onClick={handleCompileReports}
            className={`w-full font-sans font-bold text-xs py-3.5 px-6 rounded-2xl flex items-center justify-center space-x-2.5 transition-all shadow-md cursor-pointer ${
              selectedStudentIds.length === 0
                ? "bg-slate-150 text-slate-400 cursor-not-allowed border border-slate-200"
                : "bg-teal-800 border border-teal-950 text-white hover:bg-teal-900 shadow-teal-900/10"
            }`}
          >
            {isCompiling ? (
              <>
                <Loader2 size={16} className="animate-spin text-white" />
                <span>Compiling Member Records & Timelines...</span>
              </>
            ) : (
              <>
                <Play size={14} className="fill-white" />
                <span>COMPILE PROGRESS LOGS & GENERATE REPORT</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Synthesis Display Sheet */}
      {compiledReportData && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-lg animate-fadeIn block-print animate-fadeIn" id="compiled-report-section">
          
          {/* Action Bar Header */}
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 non-printable">
            <div>
              <span className="text-[10px] font-mono tracking-widest uppercase font-black bg-emerald-50 text-emerald-850 px-2 py-0.5 rounded border border-emerald-200">
                Compilation Success
              </span>
              <p className="text-xs text-slate-500 mt-1 font-sans">
                Progress logs compiled. You can export as Markdown, Microsoft Word, or print is directly to a clean vector PDF.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                id="doc-download-md-btn"
                onClick={handleDownloadMarkdown}
                className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all text-[11px] font-bold px-3 py-2 rounded-xl flex items-center space-x-1.5 cursor-pointer shadow-xs"
                title="Download plain academic markdown file"
              >
                <Download size={12} />
                <span>Download .md</span>
              </button>
              <button
                id="doc-download-docx-btn"
                onClick={handleDownloadDocx}
                className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all text-[11px] font-bold px-3 py-2 rounded-xl flex items-center space-x-1.5 cursor-pointer shadow-xs"
                title="Download editable Word document"
              >
                <FileText size={12} className="text-blue-700" />
                <span>Download Word (.doc)</span>
              </button>
              <button
                id="doc-print-pdf-btn"
                onClick={handlePrint}
                className="bg-teal-800 text-white hover:bg-teal-900 transition-all text-[11px] font-bold px-3 py-2 rounded-xl flex items-center space-x-1.5 cursor-pointer shadow-sm border border-teal-950"
                title="Save report directly as PDF"
              >
                <Printer size={12} />
                <span>Print / Save to PDF</span>
              </button>
            </div>
          </div>

          {/* Academic Log Details Sheet */}
          <div className="p-8 md:p-12 bg-white max-w-4xl mx-auto select-text selection:bg-teal-100 block-print">
            
            {/* Styled header for prints specifically */}
            <div className="printed-header-container mb-8 border-b-2 border-slate-900 pb-4">
              <h2 className="text-center font-sans text-2xl font-black uppercase tracking-tight text-slate-900">
                Laboratory Progress Summary Report
              </h2>
              <div className="flex justify-between font-mono text-[11px] mt-4 text-slate-500">
                <span>INSTITUTION: LABPULSE RESEARCH OPERATIONS</span>
                <span>WINDOW: {startDateStr} TO {endDateStr}</span>
              </div>
            </div>

            {/* Structured Report Layout without any parsed MD or hashtags */}
            <div className="space-y-8 font-sans">
              
              {/* Executive Summary Panel Card */}
              <div className="bg-slate-50 border border-slate-250 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900 font-sans uppercase tracking-tight">
                  Executive Overlook Metrics
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-150 p-4 rounded-xl text-center shadow-xs">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Selected Members</p>
                    <p className="text-xl font-black text-slate-900 mt-1">{compiledReportData.totalMembers}</p>
                  </div>
                  <div className="bg-white border border-slate-150 p-4 rounded-xl text-center shadow-xs">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Total Tasks Audited</p>
                    <p className="text-xl font-black text-slate-900 mt-1">{compiledReportData.totalTasks}</p>
                  </div>
                  <div className="bg-white border border-slate-150 p-4 rounded-xl text-center shadow-xs">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Completed Work</p>
                    <p className="text-xl font-black text-emerald-800 mt-1">
                      {compiledReportData.completedTasksCount}
                    </p>
                  </div>
                  <div className="bg-white border border-slate-150 p-4 rounded-xl text-center shadow-xs">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Red Status Alerts</p>
                    <p className="text-xl font-black text-red-600 mt-1">{compiledReportData.redStatusCount}</p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  *This document compiles all trackable research tasks, scheduled dates, and professor evaluation responses in OMI for the selected period.
                </p>
              </div>

              {/* Individual member breakdowns */}
              <div className="space-y-10">
                {compiledReportData.studentBreakdowns.map((b: any) => (
                  <div key={b.userId} className="border-t border-slate-200 pt-8 first:border-0 first:pt-0 space-y-5">
                    
                    {/* Name of member section heading */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-150 pb-2.5">
                      <div>
                        <h3 className="text-base font-extrabold text-slate-950 tracking-tight">
                          {b.name}
                        </h3>
                        <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                          Designation: <span className="text-teal-800">{b.designation}</span>
                        </p>
                      </div>
                      <div className="text-left md:text-right mt-1.5 md:mt-0 text-[10px] text-slate-500 font-mono">
                        {b.researchDomain && (
                          <p>Specialization: <strong className="text-slate-700">{b.researchDomain}</strong></p>
                        )}
                        {b.thesisTopic && (
                          <p className="truncate max-w-xs">Objective: <strong className="text-slate-750">{b.thesisTopic}</strong></p>
                        )}
                      </div>
                    </div>

                    {/* Completed tasks table */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold text-slate-450 uppercase tracking-widest font-mono">
                        ✓ Completed Tasks
                      </h4>
                      {b.completed.length === 0 ? (
                        <p className="text-xs text-slate-450 italic bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                          No tasks completed in this time window.
                        </p>
                      ) : (
                        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs">
                          <table className="w-full text-left text-xs font-sans border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                                <th className="py-2.5 px-4">Task Title</th>
                                <th className="py-2.5 px-4">Start Date</th>
                                <th className="py-2.5 px-4">Completion Date</th>
                                <th className="py-2.5 px-4">Review Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {b.completed.map((t: any) => (
                                <tr key={t.taskId} className="hover:bg-slate-50/50">
                                  <td className="py-2 px-4 font-bold text-slate-800">{t.title}</td>
                                  <td className="py-2 px-4 text-slate-550">{new Date(t.startDate).toLocaleDateString()}</td>
                                  <td className="py-2 px-4 text-slate-550">
                                    {t.actualCompletionDate ? new Date(t.actualCompletionDate).toLocaleDateString() : "Completed"}
                                  </td>
                                  <td className="py-2 px-4">
                                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${
                                      t.professorReviewStatus === "Approved"
                                        ? "bg-emerald-50 text-emerald-800 border-emerald-100"
                                        : t.professorReviewStatus === "Revision Requested"
                                          ? "bg-amber-50 text-amber-800 border-amber-150"
                                          : "bg-blue-50 text-blue-800 border-blue-150"
                                    }`}>
                                      {t.professorReviewStatus}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Active exploits logic */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-slate-450 uppercase tracking-widest font-mono">
                          ⚡ Ongoing Tasks (In Progress)
                        </h4>
                        {b.doing.length === 0 ? (
                          <p className="text-xs text-slate-450 italic bg-slate-50/20 p-3 rounded-xl border border-slate-150">
                            No active ongoing tasks.
                          </p>
                        ) : (
                          <ul className="space-y-2">
                            {b.doing.map((t: any) => (
                              <li key={t.taskId} className="bg-slate-50 border border-slate-150 rounded-xl p-3 flex justify-between items-start">
                                <div className="space-y-1">
                                  <p className="text-xs font-extrabold text-slate-800 leading-tight">{t.title}</p>
                                  <p className="text-[10px] text-slate-455 font-semibold">
                                    Deadline: {new Date(t.expectedEndDate).toLocaleDateString()}
                                  </p>
                                </div>
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${
                                  t.currentStatus === "GREEN"
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-100"
                                    : t.currentStatus === "YELLOW"
                                      ? "bg-amber-50 text-amber-800 border-amber-150"
                                      : "bg-red-50 text-red-800 border-red-150 animate-pulse"
                                }`}>
                                  {t.currentStatus}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-slate-455 uppercase tracking-widest font-mono">
                          📅 Future Milestones (Planned)
                        </h4>
                        {b.planned.length === 0 ? (
                          <p className="text-xs text-slate-450 italic bg-slate-50/20 p-3 rounded-xl border border-slate-150">
                            No upcoming tasks planned.
                          </p>
                        ) : (
                          <ul className="space-y-2">
                            {b.planned.map((t: any) => (
                              <li key={t.taskId} className="bg-slate-50 border border-slate-150 rounded-xl p-3 flex justify-between items-start">
                                <div className="space-y-1">
                                  <p className="text-xs font-extrabold text-slate-800 leading-tight">{t.title}</p>
                                  <p className="text-[10px] text-slate-450 font-semibold font-sans">
                                    Target Start: {new Date(t.startDate).toLocaleDateString()}
                                  </p>
                                </div>
                                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                  Planned
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                    </div>

                    {/* PI feedbacks comments loop */}
                    <div className="space-y-2 pt-1.5">
                      <h4 className="text-[10px] font-bold text-slate-450 uppercase tracking-widest font-mono">
                        💬 Reviewer Comments & Feedback Digest
                      </h4>
                      {b.feedbackComments.length === 0 ? (
                        <p className="text-xs text-slate-450 italic bg-white p-2.5 rounded-xl border border-slate-150">
                          No professor review responses compiled in this window.
                        </p>
                      ) : (
                        <ul className="space-y-1.5">
                          {b.feedbackComments.map((c: string, idx: number) => (
                            <li key={idx} className="text-xs font-medium text-slate-650 bg-slate-50/50 p-2.5 border border-slate-150 rounded-xl leading-relaxed italic">
                              &ldquo;{c}&rdquo;
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                  </div>
                ))}
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

function ParagraphIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M12 12H3" />
      <path d="M16 6H3" />
      <path d="M12 18H3" />
      <path d="M16 12a4 4 0 0 1 4-4v10a4 4 0 0 1-4-4z" />
    </svg>
  );
}
