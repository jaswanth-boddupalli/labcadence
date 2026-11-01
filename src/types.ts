/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = "Professor (PI)" | "Coordinator" | "PhD Scholar" | "P.G. Scholar" | "U.G. Scholar" | "Post Doc";
export type RosterStatus = "ACTIVE" | "ARCHIVED";
export type LaneCategory = "Completed" | "Doing" | "Planned";
export type StatusMetric = "GREEN" | "YELLOW" | "RED";
export type ReviewStatus = "Pending Review" | "Approved" | "Revision Requested";
export type DocClass = "Research Article" | "Patent Draft" | "Lab Protocol" | "Data Sheet";

export interface LabUser {
  userId: string;
  name: string;
  designation: UserRole;
  email: string;
  phoneNumber: string;
  researchDomain?: string; // Populated for PhD Scholar entries only
  thesisTopic?: string;     // Active academic thesis objective
  rosterStatus: RosterStatus;
  pinCode?: string;        // Optional 4-digit PIN password
}

export interface ProfessorComment {
  id: string;
  timestamp: number;
  author: string;
  comment: string;
}

export interface SubTask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  type: "link" | "document";
}

export interface LabTask {
  taskId: string;
  studentId: string; // Foreign key linking to LabUser (must be PhD Scholar)
  title: string;
  laneCategory: LaneCategory;
  startDate: number;
  expectedEndDate: number;
  revisedEndDate?: number; // Optional revised end date if currentStatus is YELLOW
  actualCompletionDate?: number | null; // Populated instantly when transitioning to Completed
  currentStatus: StatusMetric; // GREEN, YELLOW, RED
  professorReviewStatus: ReviewStatus; // Pending Review, Approved, Revision Requested
  professorCommentsLog: string; // Serialized string JSON array of ProfessorComment objects
  subTasks?: SubTask[]; // Optional list of sub-tasks
  extensionCount?: number; // Tracks how many times an overdue task was extended
  attachments?: TaskAttachment[]; // Optional list of links/documents attached to the task
  taskTag?: string; // Optional short tag or category name
}

export interface LabMeeting {
  meetingId: string;
  associatedTaskId: string; // Foreign key linking to LabTask
  organizerId: string;       // Foreign key linking to LabUser
  scheduledTimestamp: number;
  agendaNotes: string;
}

export interface LabDocument {
  docId: string;
  associatedTaskId?: string; // Foreign key linking to LabTask (Optional)
  associatedStudentId?: string; // Foreign key linking to LabUser (Direct user upload optional)
  docClass: DocClass;
  uploadedBy: string; // Name or ID of uploader
  fileStorageUrl: string; // Attachment source / URL
  taggedUsersRaw: string; // e.g., "@PROF_01, @STU_04"
  aiSummarySnippet: string; // Extracted summary snippet
}

export interface PeerNotification {
  id: string;
  targetUserId: string;
  docId: string;
  sourceTaskId: string;
  senderName: string;
  docTitle: string;
  summarySnippet: string;
  timestamp: number;
  read: boolean;
}

export interface TaskAlert {
  taskId: string;
  studentId: string;
  unattendedForPI: boolean;
  piAlertReason?: string;
  unattendedForStudent: boolean;
  studentAlertReason?: string;
  lastUpdated: number;
}

export interface LabEmailAlert {
  id: string;
  recipientEmail: string;
  senderName: string;
  senderUserId?: string;
  keyword: string;
  taskId?: string;
  taskTitle?: string;
  details?: string;
  deliveryStatus: string;
  deliveryChannel: string;
  errorMessage?: string;
  createdAt: number;
}

export interface EmailConfig {
  configured: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  hasPassword: boolean;
  from: string;
  piEmail: string;
  piName: string;
}
