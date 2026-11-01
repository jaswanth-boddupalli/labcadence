import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { Pool } from "pg";
import multer from "multer";
import crypto from "crypto";
import fs from "fs";
import nodemailer from "nodemailer";

dotenv.config();

// PostgreSQL Configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/labcadence",
});

// Helper to get formatted RFC 5322 From address
function getFromAddress(): string {
  const user = process.env.SMTP_USER?.trim() || "notifications@example.com";
  const rawFrom = process.env.SMTP_FROM?.trim();

  if (!rawFrom) {
    return `"OMI Lab Alert" <${user}>`;
  }

  // If only a display name was provided (no @ symbol), ensure the authenticated email is attached
  if (!rawFrom.includes("@")) {
    const cleanName = rawFrom.replace(/["']/g, "").trim();
    return `"${cleanName}" <${user}>`;
  }

  // If raw email was provided without display brackets
  if (!rawFrom.includes("<") && rawFrom.includes("@")) {
    return `"OMI Lab Alert" <${rawFrom}>`;
  }

  return rawFrom;
}

// Helper to get SMTP transporter
function getEmailTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const user = process.env.SMTP_USER?.trim();
  let pass = process.env.SMTP_PASS?.trim();

  // If using Gmail and password contains spaces (e.g. Google 4x4 app password formatting), strip spaces
  if (host.includes("gmail") && pass) {
    pass = pass.replace(/\s+/g, "");
  }

  if (user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false
      }
    });
  }
  return null;
}

// Helper to get PI details
async function getPIDetails() {
  try {
    const result = await pool.query(
      "SELECT user_id, name, email, designation FROM lab_users WHERE designation = 'Professor (PI)' LIMIT 1"
    );
    if (result.rows.length > 0) {
      return {
        userId: result.rows[0].user_id,
        name: result.rows[0].name,
        email: result.rows[0].email || process.env.PI_EMAIL || "pi@example.edu",
        designation: result.rows[0].designation
      };
    }
  } catch (err) {
    console.error("Error fetching PI details from database:", err);
  }
  return {
    userId: "PROF_01",
    name: "Prof. Alex Wright",
    email: process.env.PI_EMAIL || "pi@example.edu",
    designation: "Professor (PI)"
  };
}

// Helper to send PI alert email directly to Principal Investigator's mail
async function sendPIAlertEmail({
  senderName,
  senderUserId,
  keyword,
  taskId,
  taskTitle,
  details
}: {
  senderName: string;
  senderUserId?: string;
  keyword: string;
  taskId?: string;
  taskTitle?: string;
  details?: string;
}) {
  const pi = await getPIDetails();
  const alertId = `ALERT_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const now = new Date();
  const dateString = now.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short"
  });

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const recipientEmail = pi.email;
  const emailSubject = `Alert Notification: ${keyword}${taskTitle ? ` - ${taskTitle}` : ''}`;

  const plainText = `[ALERT NOTIFICATION] OMI LAB | Indian Institute of Science (IISc)
Recipient: ${pi.name} (${recipientEmail})

"${keyword}"

• Updated By: ${senderName}
• Action Keyword: ${keyword}
${taskTitle ? `• Research Task: ${taskTitle} (${taskId || 'N/A'})\n` : ''}${details ? `• Details: ${details}\n` : ''}• Date & Time: ${dateString} IST
• Dashboard Link: ${appUrl}

This is an automated alert notification from LabCadence.`;

  const htmlContent = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);">
  <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 22px 28px; color: #ffffff;">
    <div style="font-size: 11px; font-weight: 800; letter-spacing: 0.12em; color: #38bdf8; text-transform: uppercase;">Research Operations &bull; Lifecycle Engine</div>
    <h1 style="margin: 6px 0 0 0; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">LabCadence Alert Notification</h1>
    <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">Research Lifecycle and Task Coordination</p>
  </div>
  
  <div style="background: #ecfdf5; border-bottom: 2px solid #86efac; border-top: 1px solid #d1fae5; padding: 18px 28px;">
    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #047857; letter-spacing: 0.08em; margin-bottom: 4px;">Direct Alert Notification for PI (${pi.name})</div>
    <div style="font-size: 19px; font-weight: 800; color: #064e3b; font-family: 'Courier New', monospace; letter-spacing: -0.01em;">&ldquo;${keyword}&rdquo;</div>
  </div>

  <div style="padding: 24px 28px;">
    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      <tr>
        <td style="padding: 9px 0; color: #64748b; font-weight: 600; width: 140px;">Updated By:</td>
        <td style="padding: 9px 0; color: #0f172a; font-weight: 700; font-size: 14px;">${senderName}</td>
      </tr>
      <tr>
        <td style="padding: 9px 0; color: #64748b; font-weight: 600;">Action Keyword:</td>
        <td style="padding: 9px 0; color: #0284c7; font-weight: 800; font-size: 14px;">${keyword}</td>
      </tr>
      ${taskTitle ? `
      <tr>
        <td style="padding: 9px 0; color: #64748b; font-weight: 600;">Research Task:</td>
        <td style="padding: 9px 0; color: #0f172a; font-weight: 600;">${taskTitle} ${taskId ? `<span style="color: #64748b; font-size: 11px; font-family: monospace;">(${taskId})</span>` : ''}</td>
      </tr>` : ''}
      ${details ? `
      <tr>
        <td style="padding: 9px 0; color: #64748b; font-weight: 600; vertical-align: top;">Update Details:</td>
        <td style="padding: 9px 0; color: #334155; font-size: 13px; line-height: 1.5; background-color: #f8fafc; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0;">${details}</td>
      </tr>` : ''}
      <tr>
        <td style="padding: 9px 0; color: #64748b; font-weight: 600;">Timestamp:</td>
        <td style="padding: 9px 0; color: #475569; font-weight: 500;">${dateString} (IST)</td>
      </tr>
      <tr>
        <td style="padding: 9px 0; color: #64748b; font-weight: 600;">Recipient:</td>
        <td style="padding: 9px 0; color: #0f172a; font-weight: 600;">${pi.name} &lt;<a href="mailto:${recipientEmail}" style="color: #0d9488; text-decoration: none;">${recipientEmail}</a>&gt;</td>
      </tr>
    </table>

    <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center;">
      <a href="${appUrl}" style="display: inline-block; background-color: #0d9488; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; padding: 11px 26px; border-radius: 10px; box-shadow: 0 2px 4px rgba(13, 148, 136, 0.2);">Open Task in LabCadence</a>
    </div>
  </div>

  <div style="background-color: #f8fafc; padding: 14px 28px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.4;">
    Automated Alert Notification dispatched directly to PI <strong>${pi.name}</strong> (&lt;${recipientEmail}&gt;).<br/>
    Indian Institute of Science (IISc), Bangalore &bull; Optics and Microfluidics Instrumentation
  </div>
</div>`;

  let deliveryStatus = "DELIVERED";
  let deliveryChannel = "SMTP";
  let errorMessage: string | null = null;

  const transporter = getEmailTransporter();
  if (transporter) {
    try {
      const fromAddress = getFromAddress();
      const info = await transporter.sendMail({
        from: fromAddress,
        to: recipientEmail,
        subject: emailSubject,
        text: plainText,
        html: htmlContent
      });
      console.log(`[ALERT EMAIL DELIVERED VIA SMTP] To: ${recipientEmail} | From: ${fromAddress} | MessageId: ${info.messageId} | Response: ${info.response} | Keyword: "${keyword}"`);
    } catch (err: any) {
      console.error(`[SMTP ERROR] Failed to deliver alert email:`, err.message);
      deliveryStatus = "FAILED (SMTP ERROR)";
      deliveryChannel = "SMTP (ATTEMPTED)";
      errorMessage = err.message;
    }
  } else {
    deliveryStatus = "LOGGED (SMTP NOT CONFIGURED)";
    deliveryChannel = "LOCAL_LOG";
    console.log(`[ALERT EMAIL LOGGED] To: ${recipientEmail} | Keyword: "${keyword}" | Sender: ${senderName} | Task: ${taskTitle || 'N/A'}`);
  }

  // Persist record into lab_email_alerts table
  try {
    await pool.query(
      `INSERT INTO lab_email_alerts (
        id, recipient_email, sender_name, sender_user_id, keyword, task_id, task_title, details, delivery_status, delivery_channel, error_message, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        alertId,
        recipientEmail,
        senderName,
        senderUserId || null,
        keyword,
        taskId || null,
        taskTitle || null,
        details || null,
        deliveryStatus,
        deliveryChannel,
        errorMessage,
        Date.now()
      ]
    );
  } catch (dbErr: any) {
    console.error("Failed to persist alert in lab_email_alerts table:", dbErr.message);
  }

  return {
    success: deliveryStatus.startsWith("DELIVERED") || deliveryStatus.startsWith("LOGGED"),
    alertId,
    recipientEmail,
    keyword,
    deliveryStatus,
    deliveryChannel,
    errorMessage
  };
}

// Helper to send Alert email from PI directly to individual student's mail
async function sendStudentAlertEmail({
  studentId,
  studentEmail,
  studentName,
  senderName = "Prof. Alex Wright",
  keyword,
  taskId,
  taskTitle,
  details
}: {
  studentId?: string;
  studentEmail?: string;
  studentName?: string;
  senderName?: string;
  keyword: string;
  taskId?: string;
  taskTitle?: string;
  details?: string;
}) {
  let recipientEmail = studentEmail;
  let recipientName = studentName || "Scholar";

  // If studentEmail is missing, fetch from database using studentId
  if (!recipientEmail && studentId) {
    try {
      const res = await pool.query("SELECT name, email FROM lab_users WHERE user_id = $1 LIMIT 1", [studentId]);
      if (res.rows.length > 0) {
        recipientEmail = res.rows[0].email;
        if (!studentName) recipientName = res.rows[0].name;
      }
    } catch (err: any) {
      console.error("Failed to lookup student email for alert:", err.message);
    }
  }

  if (!recipientEmail) {
    throw new Error(`Cannot send alert: No email found for student ${studentId || studentName}`);
  }

  const alertId = `ALERT_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const now = new Date();
  const dateString = now.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short"
  });

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const emailSubject = `Alert Notification from PI: ${keyword}${taskTitle ? ` - ${taskTitle}` : ''}`;

  const plainText = `[ALERT NOTIFICATION FROM PI] OMI LAB | Indian Institute of Science (IISc)
Recipient: ${recipientName} (${recipientEmail})
From: ${senderName} (Professor & PI)

"${keyword}"

• Action Keyword: ${keyword}
• From: ${senderName}
${taskTitle ? `• Research Task: ${taskTitle} (${taskId || 'N/A'})\n` : ''}${details ? `• Details: ${details}\n` : ''}• Date & Time: ${dateString} IST
• Dashboard Link: ${appUrl}

This is an automated alert notification from LabCadence.`;

  const htmlContent = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);">
  <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 22px 28px; color: #ffffff;">
    <div style="font-size: 11px; font-weight: 800; letter-spacing: 0.12em; color: #38bdf8; text-transform: uppercase;">Research Operations &bull; Lifecycle Engine</div>
    <h1 style="margin: 6px 0 0 0; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">LabCadence Alert Notification</h1>
    <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">Research Lifecycle and Task Coordination</p>
  </div>
  
  <div style="background: #f0fdf4; border-bottom: 2px solid #86efac; border-top: 1px solid #dcfce7; padding: 18px 28px;">
    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #166534; letter-spacing: 0.08em; margin-bottom: 4px;">Direct Alert Notification from PI (${senderName})</div>
    <div style="font-size: 19px; font-weight: 800; color: #14532d; font-family: 'Courier New', monospace; letter-spacing: -0.01em;">&ldquo;${keyword}&rdquo;</div>
  </div>

  <div style="padding: 24px 28px;">
    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      <tr>
        <td style="padding: 9px 0; color: #64748b; font-weight: 600; width: 140px;">Recipient:</td>
        <td style="padding: 9px 0; color: #0f172a; font-weight: 700; font-size: 14px;">${recipientName} &lt;<a href="mailto:${recipientEmail}" style="color: #0d9488; text-decoration: none;">${recipientEmail}</a>&gt;</td>
      </tr>
      <tr>
        <td style="padding: 9px 0; color: #64748b; font-weight: 600;">From:</td>
        <td style="padding: 9px 0; color: #0f172a; font-weight: 700; font-size: 14px;">${senderName} (Professor &amp; PI)</td>
      </tr>
      <tr>
        <td style="padding: 9px 0; color: #64748b; font-weight: 600;">Action Keyword:</td>
        <td style="padding: 9px 0; color: #0284c7; font-weight: 800; font-size: 14px;">${keyword}</td>
      </tr>
      ${taskTitle ? `
      <tr>
        <td style="padding: 9px 0; color: #64748b; font-weight: 600;">Research Task:</td>
        <td style="padding: 9px 0; color: #0f172a; font-weight: 600;">${taskTitle} ${taskId ? `<span style="color: #64748b; font-size: 11px; font-family: monospace;">(${taskId})</span>` : ''}</td>
      </tr>` : ''}
      ${details ? `
      <tr>
        <td style="padding: 9px 0; color: #64748b; font-weight: 600; vertical-align: top;">Update Details:</td>
        <td style="padding: 9px 0; color: #334155; font-size: 13px; line-height: 1.5; background-color: #f8fafc; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0;">${details}</td>
      </tr>` : ''}
      <tr>
        <td style="padding: 9px 0; color: #64748b; font-weight: 600;">Timestamp:</td>
        <td style="padding: 9px 0; color: #475569; font-weight: 500;">${dateString} (IST)</td>
      </tr>
    </table>

    <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center;">
      <a href="${appUrl}" style="display: inline-block; background-color: #0d9488; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; padding: 11px 26px; border-radius: 10px; box-shadow: 0 2px 4px rgba(13, 148, 136, 0.2);">Open Task in LabCadence</a>
    </div>
  </div>

  <div style="background-color: #f8fafc; padding: 14px 28px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.4;">
    Automated Alert Notification dispatched directly from <strong>${senderName}</strong> to ${recipientName}.<br/>
    Indian Institute of Science (IISc), Bangalore &bull; Optics and Microfluidics Instrumentation
  </div>
</div>`;

  let deliveryStatus = "DELIVERED";
  let deliveryChannel = "SMTP";
  let errorMessage: string | null = null;

  const transporter = getEmailTransporter();
  if (transporter) {
    try {
      const fromAddress = getFromAddress();
      const info = await transporter.sendMail({
        from: fromAddress,
        to: recipientEmail,
        subject: emailSubject,
        text: plainText,
        html: htmlContent
      });
      console.log(`[ALERT EMAIL DELIVERED TO STUDENT VIA SMTP] To: ${recipientEmail} | From: ${fromAddress} | MessageId: ${info.messageId} | Response: ${info.response} | Keyword: "${keyword}"`);
    } catch (err: any) {
      console.error(`[SMTP ERROR] Failed to deliver alert email to student:`, err.message);
      deliveryStatus = "FAILED (SMTP ERROR)";
      deliveryChannel = "SMTP (ATTEMPTED)";
      errorMessage = err.message;
    }
  } else {
    deliveryStatus = "LOGGED (SMTP NOT CONFIGURED)";
    deliveryChannel = "LOCAL_LOG";
    console.log(`[ALERT EMAIL TO STUDENT LOGGED] To: ${recipientEmail} | Keyword: "${keyword}" | Sender: ${senderName} | Task: ${taskTitle || 'N/A'}`);
  }

  // Persist record into lab_email_alerts table
  try {
    await pool.query(
      `INSERT INTO lab_email_alerts (
        id, recipient_email, sender_name, sender_user_id, keyword, task_id, task_title, details, delivery_status, delivery_channel, error_message, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        alertId,
        recipientEmail,
        senderName,
        "PROF_01",
        keyword,
        taskId || null,
        taskTitle || null,
        details || null,
        deliveryStatus,
        deliveryChannel,
        errorMessage,
        Date.now()
      ]
    );
  } catch (dbErr: any) {
    console.error("Failed to persist student alert in lab_email_alerts table:", dbErr.message);
  }

  return {
    success: deliveryStatus.startsWith("DELIVERED") || deliveryStatus.startsWith("LOGGED"),
    alertId,
    recipientEmail,
    recipientName,
    keyword,
    deliveryStatus,
    deliveryChannel,
    errorMessage
  };
}

function updateEnvFile(updates: Record<string, string>) {
  const envPath = path.join(process.cwd(), ".env");
  let content = "";
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, "utf-8");
  }

  for (const [key, value] of Object.entries(updates)) {
    process.env[key] = value;
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`);
    } else {
      content += `\n${key}=${value}`;
    }
  }

  fs.writeFileSync(envPath, content.trim() + "\n", "utf-8");
}

// Multer Storage Configuration for PDFs
const storageDir = path.join(process.cwd(), "storage");
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, storageDir);
  },
  filename: (req, file, cb) => {
    const hash = crypto.randomBytes(16).toString("hex");
    cb(null, `${hash}-${file.originalname}`);
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB maximum per attachment
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));

  // Expose /storage statically
  app.use('/storage', express.static(storageDir));

  // -----------------------------------------------------
  // NEW DATABASE ENDPOINTS
  // -----------------------------------------------------

  // GET /api/users
  app.get("/api/users", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM lab_users");
      const mapped = result.rows.map(row => ({
        userId: row.user_id,
        name: row.name,
        designation: row.designation,
        email: row.email,
        phoneNumber: row.phone_number,
        researchDomain: row.research_domain,
        thesisTopic: row.thesis_topic,
        rosterStatus: row.roster_status,
        pinCode: row.pin_code
      }));
      res.json(mapped);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/users (Upsert)
  app.post("/api/users", async (req, res) => {
    try {
      const { userId, name, designation, email, phoneNumber, researchDomain, thesisTopic, rosterStatus, pinCode } = req.body;
      const query = `
        INSERT INTO lab_users (user_id, name, designation, email, phone_number, research_domain, thesis_topic, roster_status, pin_code)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (user_id) DO UPDATE SET
          name = EXCLUDED.name,
          designation = EXCLUDED.designation,
          email = EXCLUDED.email,
          phone_number = EXCLUDED.phone_number,
          research_domain = EXCLUDED.research_domain,
          thesis_topic = EXCLUDED.thesis_topic,
          roster_status = EXCLUDED.roster_status,
          pin_code = EXCLUDED.pin_code
        RETURNING *;
      `;
      const result = await pool.query(query, [userId, name, designation, email, phoneNumber, researchDomain, thesisTopic, rosterStatus || 'ACTIVE', pinCode]);
      
      // If updating the PI user, keep PI_EMAIL in process.env and .env synchronized
      if ((designation === "Professor (PI)" || userId === "PROF_01") && email) {
        process.env.PI_EMAIL = email;
        updateEnvFile({ PI_EMAIL: email });
        console.log(`[PI EMAIL SYNCED] Synchronized PI email to ${email}`);
      }

      res.json(result.rows[0]);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // DELETE /api/users/:userId
  app.delete("/api/users/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const result = await pool.query("DELETE FROM lab_users WHERE user_id = $1 RETURNING *;", [userId]);
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ success: true, deleted: result.rows[0] });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // Helper to normalize lane categories
  function normalizeLane(lane: string | undefined): string {
    if (!lane) return "Planned";
    if (lane === "In Progress" || lane === "Ongoing" || lane.toLowerCase() === "doing") return "Doing";
    if (lane.toLowerCase() === "planned") return "Planned";
    if (lane.toLowerCase() === "completed") return "Completed";
    return lane;
  }

  // GET /api/tasks
  app.get("/api/tasks", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM lab_tasks");
      const mapped = result.rows.map(row => ({
        taskId: row.task_id,
        studentId: row.student_id,
        title: row.title,
        laneCategory: normalizeLane(row.lane_category),
        startDate: Number(row.start_date),
        expectedEndDate: Number(row.expected_end_date),
        revisedEndDate: row.revised_end_date ? Number(row.revised_end_date) : undefined,
        actualCompletionDate: row.actual_completion_date ? Number(row.actual_completion_date) : null,
        currentStatus: row.current_status,
        professorReviewStatus: row.professor_review_status,
        professorCommentsLog: row.professor_comments_log,
        subTasks: JSON.parse(row.sub_tasks || "[]"),
        extensionCount: row.extension_count,
        attachments: JSON.parse(row.attachments || "[]"),
        taskTag: row.task_tag
      }));
      res.json(mapped);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/tasks
  app.post("/api/tasks", async (req, res) => {
    try {
      const { 
        taskId, studentId, title, laneCategory, startDate, expectedEndDate, 
        revisedEndDate, actualCompletionDate, currentStatus, 
        professorReviewStatus, professorCommentsLog, subTasks, extensionCount, attachments, taskTag 
      } = req.body;
      
      const query = `
        INSERT INTO lab_tasks (
          task_id, student_id, title, lane_category, start_date, expected_end_date, revised_end_date, 
          actual_completion_date, current_status, professor_review_status, professor_comments_log, sub_tasks, extension_count, attachments, task_tag
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *;
      `;
      const values = [
        taskId, studentId, title, normalizeLane(laneCategory), startDate, expectedEndDate,
        revisedEndDate || null, actualCompletionDate || null, currentStatus,
        professorReviewStatus || 'Pending Review', professorCommentsLog || '[]',
        JSON.stringify(subTasks || []), extensionCount || 0, JSON.stringify(attachments || []), taskTag || null
      ];
      const result = await pool.query(query, values);
      res.json(result.rows[0]);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // PUT /api/tasks/:taskId
  app.put("/api/tasks/:taskId", async (req, res) => {
    try {
      const { taskId } = req.params;
      const {
        title, laneCategory, startDate, expectedEndDate, revisedEndDate,
        actualCompletionDate, currentStatus, professorReviewStatus,
        professorCommentsLog, subTasks, extensionCount, attachments, taskTag
      } = req.body;
      
      const updateFields: string[] = [];
      const values: any[] = [taskId];
      let idx = 2;

      if (title !== undefined) { updateFields.push(`title = $${idx++}`); values.push(title); }
      if (laneCategory !== undefined) { updateFields.push(`lane_category = $${idx++}`); values.push(normalizeLane(laneCategory)); }
      if (startDate !== undefined) { updateFields.push(`start_date = $${idx++}`); values.push(startDate); }
      if (expectedEndDate !== undefined) { updateFields.push(`expected_end_date = $${idx++}`); values.push(expectedEndDate); }
      if (revisedEndDate !== undefined) { updateFields.push(`revised_end_date = $${idx++}`); values.push(revisedEndDate); }
      if (actualCompletionDate !== undefined) { updateFields.push(`actual_completion_date = $${idx++}`); values.push(actualCompletionDate); }
      if (currentStatus !== undefined) { updateFields.push(`current_status = $${idx++}`); values.push(currentStatus); }
      if (professorReviewStatus !== undefined) { updateFields.push(`professor_review_status = $${idx++}`); values.push(professorReviewStatus); }
      if (professorCommentsLog !== undefined) { updateFields.push(`professor_comments_log = $${idx++}`); values.push(professorCommentsLog); }
      if (subTasks !== undefined) { updateFields.push(`sub_tasks = $${idx++}`); values.push(JSON.stringify(subTasks)); }
      if (extensionCount !== undefined) { updateFields.push(`extension_count = $${idx++}`); values.push(extensionCount); }
      if (attachments !== undefined) { updateFields.push(`attachments = $${idx++}`); values.push(JSON.stringify(attachments)); }
      if (taskTag !== undefined) { updateFields.push(`task_tag = $${idx++}`); values.push(taskTag); }

      if (updateFields.length === 0) return res.status(400).json({ error: "No fields to update" });

      const query = `UPDATE lab_tasks SET ${updateFields.join(', ')} WHERE task_id = $1 RETURNING *;`;
      const result = await pool.query(query, values);
      res.json(result.rows[0]);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // DELETE /api/tasks/:taskId
  app.delete("/api/tasks/:taskId", async (req, res) => {
    try {
      const { taskId } = req.params;
      const result = await pool.query("DELETE FROM lab_tasks WHERE task_id = $1 RETURNING *;", [taskId]);
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json({ success: true, deleted: result.rows[0] });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/documents
  app.get("/api/documents", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM lab_documents");
      const mapped = result.rows.map(row => ({
        docId: row.doc_id,
        associatedTaskId: row.associated_task_id,
        associatedStudentId: row.associated_student_id,
        docClass: row.doc_class,
        uploadedBy: row.uploaded_by,
        fileStorageUrl: row.file_storage_url,
        taggedUsersRaw: row.tagged_users_raw,
        aiSummarySnippet: row.ai_summary_snippet
      }));
      res.json(mapped);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/documents/upload
  app.post("/api/documents/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      const { docId, associatedTaskId, associatedStudentId, docClass, uploadedBy, taggedUsersRaw, aiSummarySnippet } = req.body;
      const fileStorageUrl = `/storage/${req.file.filename}`;
      
      const query = `
        INSERT INTO lab_documents (
          doc_id, associated_task_id, associated_student_id, doc_class, uploaded_by, file_storage_url, tagged_users_raw, ai_summary_snippet
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
      `;
      const values = [
        docId,
        associatedTaskId || null,
        associatedStudentId || null,
        docClass || 'Research Article',
        uploadedBy || 'System',
        fileStorageUrl,
        taggedUsersRaw || 'None',
        aiSummarySnippet || ''
      ];
      
      const result = await pool.query(query, values);
      res.json({
        success: true,
        document: result.rows[0],
        fileUrl: fileStorageUrl
      });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/upload: Upload any file attachment for research tasks
  app.post("/api/upload", upload.single("file"), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const fileStorageUrl = `/storage/${req.file.filename}`;
      res.json({
        success: true,
        filename: req.file.originalname,
        storageUrl: fileStorageUrl,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
    } catch (err: any) {
      console.error("Task attachment upload error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // -----------------------------------------------------
  // PI EMAIL ALERT NOTIFICATION ENDPOINTS
  // -----------------------------------------------------

  // POST /api/alerts/notify-pi: Dispatches direct alert email to PI
  app.post("/api/alerts/notify-pi", async (req, res) => {
    try {
      const { senderName, senderUserId, keyword, taskId, taskTitle, details } = req.body;
      if (!keyword || !senderName) {
        return res.status(400).json({ error: "keyword and senderName are required" });
      }
      const result = await sendPIAlertEmail({
        senderName,
        senderUserId,
        keyword,
        taskId,
        taskTitle,
        details
      });
      res.json(result);
    } catch (e: any) {
      console.error("Alert dispatch failure:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/alerts/notify-student: Dispatches alert email from PI to individual student's mail
  app.post("/api/alerts/notify-student", async (req, res) => {
    try {
      const { studentId, studentEmail, studentName, senderName, keyword, taskId, taskTitle, details } = req.body;
      if (!keyword || (!studentId && !studentEmail)) {
        return res.status(400).json({ error: "keyword and (studentId or studentEmail) are required" });
      }
      const result = await sendStudentAlertEmail({
        studentId,
        studentEmail,
        studentName,
        senderName: senderName || "Prof. Alex Wright",
        keyword,
        taskId,
        taskTitle,
        details
      });
      res.json(result);
    } catch (e: any) {
      console.error("Student alert dispatch failure:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/alerts/history: Fetches recent email alert logs
  app.get("/api/alerts/history", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM lab_email_alerts ORDER BY created_at DESC LIMIT 50");
      const mapped = result.rows.map(r => ({
        id: r.id,
        recipientEmail: r.recipient_email,
        senderName: r.sender_name,
        senderUserId: r.sender_user_id,
        keyword: r.keyword,
        taskId: r.task_id,
        taskTitle: r.task_title,
        details: r.details,
        deliveryStatus: r.delivery_status,
        deliveryChannel: r.delivery_channel,
        errorMessage: r.error_message,
        createdAt: Number(r.created_at)
      }));
      res.json(mapped);
    } catch (e: any) {
      console.error("Error retrieving alert history:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/email-config: Read current SMTP configuration status & PI recipient
  app.get("/api/email-config", async (req, res) => {
    try {
      const pi = await getPIDetails();
      res.json({
        configured: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT || "587", 10),
        secure: process.env.SMTP_SECURE === "true",
        user: process.env.SMTP_USER || "",
        hasPassword: !!process.env.SMTP_PASS,
        from: process.env.SMTP_FROM || `"LabCadence Alert" <${process.env.SMTP_USER || "notifications@example.com"}>`,
        piEmail: pi.email,
        piName: pi.name
      });
    } catch (e: any) {
      console.error("Error fetching email configuration:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/email-config: Update SMTP settings & save to .env
  app.post("/api/email-config", async (req, res) => {
    try {
      const { host, port, secure, user, pass, from, piEmail } = req.body;
      const updates: Record<string, string> = {};
      if (host !== undefined) updates.SMTP_HOST = host.trim();
      if (port !== undefined) updates.SMTP_PORT = String(port);
      if (secure !== undefined) updates.SMTP_SECURE = String(secure);
      if (user !== undefined) updates.SMTP_USER = user.trim();
      if (pass !== undefined && pass !== "") {
        let cleanPass = pass.trim();
        const currentHost = host || process.env.SMTP_HOST || "";
        if (currentHost.includes("gmail")) {
          cleanPass = cleanPass.replace(/\s+/g, "");
        }
        updates.SMTP_PASS = cleanPass;
      }
      if (from !== undefined) updates.SMTP_FROM = from.trim();
      if (piEmail !== undefined) {
        updates.PI_EMAIL = piEmail;
        await pool.query("UPDATE lab_users SET email = $1 WHERE designation = 'Professor (PI)'", [piEmail]);
      }

      updateEnvFile(updates);

      res.json({
        success: true,
        message: "Email configuration saved successfully.",
        configured: !!(process.env.SMTP_USER && process.env.SMTP_PASS)
      });
    } catch (e: any) {
      console.error("Error saving email configuration:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/email-config/test: Dispatches an immediate test alert to PI
  app.post("/api/email-config/test", async (req, res) => {
    try {
      const pi = await getPIDetails();
      const result = await sendPIAlertEmail({
        senderName: req.body.senderName || "System Self-Test",
        keyword: "System Test Alert to Principal Investigator",
        taskTitle: "Email Alert Verification Test",
        details: `This is a verification alert confirming email connectivity to the Principal Investigator (${pi.email}).`
      });
      res.json(result);
    } catch (e: any) {
      console.error("Error sending test alert:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // -----------------------------------------------------
  // FEATURE 1: PI & COORDINATOR AI CHATBOT ROUTE
  // -----------------------------------------------------
  app.post("/api/chatbot/query", async (req, res) => {
    try {
      const { prompt, history, userRole, userId } = req.body;

      // Access Control: Strictly limited to PI and Lab Coordinator
      const roleStr = (userRole || "").toLowerCase();
      const isAllowed = 
        roleStr.includes("professor") || 
        roleStr.includes("pi") || 
        roleStr.includes("coordinator") ||
        userId === "COORD_01" ||
        userId === "PROF_01";

      if (userRole && !isAllowed) {
        return res.status(403).json({
          success: false,
          error: "Access Denied: The AI Chatbot is strictly restricted to PI and Lab Coordinator roles."
        });
      }

      if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
        return res.status(400).json({ success: false, error: "Prompt is required." });
      }

      // Query complete live database context
      const usersResult = await pool.query(
        "SELECT user_id, name, designation, email, phone_number, research_domain, thesis_topic, roster_status FROM lab_users"
      );
      const tasksResult = await pool.query(
        "SELECT * FROM lab_tasks ORDER BY expected_end_date ASC"
      );
      const docsResult = await pool.query(
        "SELECT doc_id, associated_task_id, associated_student_id, doc_class, uploaded_by, ai_summary_snippet FROM lab_documents"
      );
      const meetingsResult = await pool.query(
        "SELECT meeting_id, associated_task_id, scheduled_timestamp, agenda_notes FROM lab_meetings"
      );

      const allUsers = usersResult.rows;
      const allTasks = tasksResult.rows;
      const allDocs = docsResult.rows;
      const allMeetings = meetingsResult.rows;
      const now = Date.now();

      const students = allUsers.filter(u => !u.designation.toLowerCase().includes("professor") && !u.designation.toLowerCase().includes("coordinator"));

      const databaseContextString = `
DATABASE CONTEXT:
Total Registered Students: ${students.length}
Students: ${students.map(s => `${s.name} (ID: ${s.user_id}, Domain: ${s.research_domain || 'N/A'}, Thesis: "${s.thesis_topic || 'N/A'}")`).join('; ')}

Total Tasks: ${allTasks.length}
- Completed: ${allTasks.filter(t => t.lane_category === 'Completed').length}
- Doing / Ongoing: ${allTasks.filter(t => t.lane_category === 'Doing').length}
- Planned: ${allTasks.filter(t => t.lane_category === 'Planned').length}
- Pending PI Review / Revision: ${allTasks.filter(t => t.professor_review_status === 'Pending Review' || t.professor_review_status === 'Revision Requested').length}
- Red Status (Blocked): ${allTasks.filter(t => t.current_status === 'RED').length}

DETAILED TASK ENTRIES:
${allTasks.map(t => {
  const student = allUsers.find(u => u.user_id === t.student_id);
  const isOverdue = t.lane_category !== 'Completed' && now > Number(t.expected_end_date);
  return `* Task [${t.task_id}]: "${t.title}"
  Scholar: ${student ? student.name : t.student_id} (${t.student_id})
  Lane: ${t.lane_category} | Status Metric: ${t.current_status} | PI Review: ${t.professor_review_status || 'Pending Review'}
  Start: ${new Date(Number(t.start_date)).toLocaleDateString()} | Deadline: ${new Date(Number(t.expected_end_date)).toLocaleDateString()}${t.revised_end_date ? ` (Revised: ${new Date(Number(t.revised_end_date)).toLocaleDateString()})` : ''}${t.actual_completion_date ? ` | Completed: ${new Date(Number(t.actual_completion_date)).toLocaleDateString()}` : ''}
  Overdue: ${isOverdue ? 'YES' : 'NO'}
  Comments: ${t.professor_comments_log || '[]'}`;
}).join('\n')}

SHARED DOCUMENTS & RECENT UPLOADS:
${allDocs.map(d => `* Doc [${d.doc_id}] (${d.doc_class}): Uploaded by ${d.uploaded_by} | Task: ${d.associated_task_id || 'General'} | Summary: "${d.ai_summary_snippet}"`).join('\n')}
`;

      const systemPrompt = `Role & Formatting Rules:
You are a friendly, collaborative AI Lab Assistant.

CRITICAL FORMATTING INSTRUCTION:
You MUST separate each section using double newlines (\\n\\n) or HTML line breaks (<br>).
NEVER collapse headings, bullet points, or sections into a single line or paragraph block.
Always output clear, vertically stacked paragraphs and list items.

Structure your response strictly as follows:

👋 Greeting & Brief Overview
(1 short introductory line)

<br><br>

📊 Key Highlights
• Point 1
• Point 2

<br><br>

🚀 Recent Accomplishments
• Task 1 — Completed by [Name]
• Task 2 — Completed by [Name]

<br><br>

🎯 Next Steps / Action Items
(1 short closing sentence)`;

      let answer = "";
      const apiKey = process.env.GEMINI_API_KEY;

      if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
        try {
          const ai = new GoogleGenAI({
            apiKey: apiKey,
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
          });
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Database Context:\n${databaseContextString}\n\nUser Query: ${prompt}`,
            config: {
              systemInstruction: systemPrompt
            }
          });
          answer = response.text || "";
        } catch (genErr: any) {
          console.warn("Gemini API call failed, falling back to local analytical engine:", genErr.message);
        }
      }

      // If no API key or if API failed, provide high-precision conversational response matching the exact 4-section layout
      if (!answer) {
        const q = prompt.toLowerCase();

        const titles = new Set(["dr", "dr.", "mr", "mr.", "ms", "ms.", "mrs", "mrs.", "prof", "prof."]);
        // Intent 1: Individual Student Tracking
        let mentionedStudent = students.find(s => 
          q.includes(s.user_id.toLowerCase()) || 
          q.includes(s.name.toLowerCase())
        );

        if (!mentionedStudent) {
          mentionedStudent = students.find(s => {
            const tokens = s.name.toLowerCase().split(/\s+/).filter(part => part.length >= 3 && !titles.has(part));
            return tokens.some(token => q.includes(token));
          });
        }

        if (mentionedStudent) {
          const sTasks = allTasks.filter(t => t.student_id === mentionedStudent.user_id);
          const completed = sTasks.filter(t => t.lane_category === 'Completed');
          const ongoing = sTasks.filter(t => t.lane_category === 'Doing');
          const planned = sTasks.filter(t => t.lane_category === 'Planned');
          const pendingReview = sTasks.filter(t => t.professor_review_status === 'Pending Review');

          answer = `👋 Greeting & Brief Overview
Hello! Here is a friendly update on the active research progress for ${mentionedStudent.name}.

<br><br>

📊 Key Highlights
${ongoing.length > 0 ? ongoing.map(t => `• ${t.title} — Active in progress (Target: ${new Date(Number(t.expected_end_date)).toLocaleDateString()})`).join('\n') : '• No ongoing tasks in active progress at the moment.'}
${planned.length > 0 ? planned.map(t => `• ${t.title} — Planned milestone scheduled to begin`).join('\n') : ''}

<br><br>

🚀 Recent Accomplishments
${completed.length > 0 ? completed.map(t => `• ${t.title} — Completed by ${mentionedStudent.name}`).join('\n') : (allTasks.filter(t => t.lane_category === 'Completed').length > 0 ? allTasks.filter(t => t.lane_category === 'Completed').slice(-2).map(t => {
  const s = allUsers.find(u => u.user_id === t.student_id);
  return `• ${t.title} — Completed by ${s ? s.name : t.student_id}`;
}).join('\n') : '• No completed milestones in this cycle yet.')}

<br><br>

🎯 Next Steps / Action Items
${pendingReview.length > 0 ? `${pendingReview.length} task(s) are currently in your queue waiting for your review and guidance.` : 'Continue ongoing research towards the target milestone deadlines.'}`;
        } 
        // Intent 2: PI Workload & Action Items
        else if (q.includes("waiting") || q.includes("review") || q.includes("feedback") || q.includes("attention") || q.includes("workload")) {
          const pendingReviewTasks = allTasks.filter(t => t.professor_review_status === 'Pending Review' || t.professor_review_status === 'Revision Requested');
          const blockedTasks = allTasks.filter(t => t.current_status === 'RED');
          const completedRecent = allTasks.filter(t => t.lane_category === 'Completed').slice(-3);

          answer = `👋 Greeting & Brief Overview
Hello! Here is a supportive overview of items waiting for your guidance and review today.

<br><br>

📊 Key Highlights
• You have ${pendingReviewTasks.length} task(s) currently awaiting your evaluation and feedback.
${pendingReviewTasks.slice(0, 4).map(t => {
  const s = allUsers.find(u => u.user_id === t.student_id);
  return `• ${t.title} (${s ? s.name : t.student_id}) — Submitted for sign-off`;
}).join('\n')}
${blockedTasks.length > 0 ? `• 🚨 ${blockedTasks.length} blocked task(s) flagged with obstacles needing direct input.` : '• All active lab tracks are currently running smoothly without critical roadblocks.'}

<br><br>

🚀 Recent Accomplishments
${completedRecent.length > 0 ? completedRecent.map(t => {
  const s = allUsers.find(u => u.user_id === t.student_id);
  return `• ${t.title} — Completed by ${s ? s.name : t.student_id}`;
}).join('\n') : '• No recent completions recorded.'}

<br><br>

🎯 Next Steps / Action Items
Leaving a quick sign-off or feedback note on these items will allow scholars to proceed with their next steps.`;
        }
        // Intent 4: Deadline & Timeline Management
        else if (q.includes("deadline") || q.includes("overdue") || q.includes("approaching") || q.includes("end date") || q.includes("crossed") || q.includes("delayed") || q.includes("not started")) {
          const sevenDaysFromNow = now + 7 * 24 * 60 * 60 * 1000;
          const approaching = allTasks.filter(t => t.lane_category !== 'Completed' && Number(t.expected_end_date) >= now && Number(t.expected_end_date) <= sevenDaysFromNow);
          const overdueOngoing = allTasks.filter(t => t.lane_category === 'Doing' && now > Number(t.expected_end_date));
          const completedRecent = allTasks.filter(t => t.lane_category === 'Completed').slice(-3);

          answer = `👋 Greeting & Brief Overview
Hello! Here is a conversational check on upcoming milestone timelines across the lab.

<br><br>

📊 Key Highlights
${approaching.length > 0 ? approaching.map(t => {
  const s = allUsers.find(u => u.user_id === t.student_id);
  const daysLeft = Math.ceil((Number(t.expected_end_date) - now) / (1000 * 60 * 60 * 24));
  return `• ${t.title} (${s ? s.name : t.student_id}) — Due in ${daysLeft} day(s) on ${new Date(Number(t.expected_end_date)).toLocaleDateString()}`;
}).join('\n') : '• No deadlines approaching in the next 7 days — pacing is steady.'}
${overdueOngoing.length > 0 ? `• ⚠️ ${overdueOngoing.length} task(s) currently ongoing past their scheduled target date.` : '• All ongoing milestones are on schedule.'}

<br><br>

🚀 Recent Accomplishments
${completedRecent.length > 0 ? completedRecent.map(t => {
  const s = allUsers.find(u => u.user_id === t.student_id);
  return `• ${t.title} — Completed by ${s ? s.name : t.student_id}`;
}).join('\n') : '• Tasks are currently in active progress.'}

<br><br>

🎯 Next Steps / Action Items
A brief check-in on these upcoming milestones will ensure everyone has the resources needed to deliver on time.`;
        }
        // Intent 3: Lab-Wide Productivity Overview
        else if (q.includes("productivity") || q.includes("overview") || q.includes("accomplishment") || q.includes("summary") || q.includes("how many")) {
          const completed = allTasks.filter(t => t.lane_category === 'Completed');
          const doing = allTasks.filter(t => t.lane_category === 'Doing');
          const planned = allTasks.filter(t => t.lane_category === 'Planned');
          const activeStudentsWithTasks = new Set(allTasks.filter(t => t.lane_category === 'Doing').map(t => t.student_id));
          const completionRate = allTasks.length > 0 ? Math.round((completed.length / allTasks.length) * 100) : 0;

          answer = `👋 Greeting & Brief Overview
Hello! Here is an encouraging snapshot of our overall laboratory research velocity and momentum.

<br><br>

📊 Key Highlights
• ${students.length} scholars are actively collaborating across ${allTasks.length} tracked projects.
• ${doing.length} active projects in progress across ${activeStudentsWithTasks.size} researchers.
• Milestone completion rate is currently at ${completionRate}%.

<br><br>

🚀 Recent Accomplishments
${completed.length > 0 ? completed.slice(-3).map(t => {
  const s = allUsers.find(u => u.user_id === t.student_id);
  return `• ${t.title} — Completed by ${s ? s.name : t.student_id}`;
}).join('\n') : '• No completed milestones in this cycle yet.'}

<br><br>

🎯 Next Steps / Action Items
Continuing regular review touchpoints on ongoing work will help turn more active efforts into completed publications.`;
        }
        // Default general query answer
        else {
          const completed = allTasks.filter(t => t.lane_category === 'Completed');
          answer = `👋 Greeting & Brief Overview
Hello! I'm happy to help. Here is a friendly status update on where things stand in the lab today.

<br><br>

📊 Key Highlights
• ${students.length} active scholars (${students.slice(0, 4).map(s => s.name).join(', ')}, etc.)
• ${allTasks.filter(t => t.lane_category === 'Doing').length} active projects currently in ongoing execution
• ${allTasks.filter(t => t.professor_review_status === 'Pending Review').length} task(s) currently awaiting your evaluation

<br><br>

🚀 Recent Accomplishments
${completed.length > 0 ? completed.slice(-3).map(t => {
  const s = allUsers.find(u => u.user_id === t.student_id);
  return `• ${t.title} — Completed by ${s ? s.name : t.student_id}`;
}).join('\n') : '• Milestones are currently being actively pursued.'}

<br><br>

🎯 Next Steps / Action Items
Feel free to ask for conversational updates on any specific researcher, upcoming deadlines, or pending reviews!`;
        }
      }

      res.json({
        success: true,
        answer: answer.trim(),
        timestamp: Date.now()
      });

    } catch (e: any) {
      console.error("AI Chatbot endpoint error:", e);
      res.status(500).json({ success: false, error: e.message || "Failed to query AI assistant." });
    }
  });

  // -----------------------------------------------------
  // FEATURE 2: SCHOLAR REWARDS DATABASE ENDPOINTS
  // -----------------------------------------------------
  app.get("/api/rewards/:studentId", async (req, res) => {
    try {
      const { studentId } = req.params;
      const result = await pool.query(
        "SELECT * FROM lab_scholar_rewards WHERE student_id = $1 ORDER BY earned_at DESC",
        [studentId]
      );
      res.json(result.rows.map(row => ({
        rewardId: row.reward_id,
        studentId: row.student_id,
        categoryId: row.category_id,
        taskId: row.task_id,
        quoteSelected: row.quote_selected,
        psychologicalNeed: row.psychological_need,
        earnedAt: Number(row.earned_at)
      })));
    } catch (e: any) {
      console.error("Error fetching scholar rewards:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/rewards", async (req, res) => {
    try {
      const { rewardId, studentId, categoryId, taskId, quoteSelected, psychologicalNeed, earnedAt } = req.body;
      const query = `
        INSERT INTO lab_scholar_rewards (
          reward_id, student_id, category_id, task_id, quote_selected, psychological_need, earned_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
      `;
      const values = [
        rewardId || `RWD_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        studentId,
        categoryId,
        taskId || null,
        quoteSelected,
        psychologicalNeed,
        earnedAt || Date.now()
      ];
      const result = await pool.query(query, values);
      res.json(result.rows[0]);
    } catch (e: any) {
      console.error("Error recording scholar reward:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // -----------------------------------------------------
  // EXISTING API FOR GENAI COMPILATION
  // -----------------------------------------------------

  // API endpoint for report compilation
  app.post("/api/compile", async (req, res) => {
    try {
      const { startDate, endDate, students, tasks, meetings, documents } = req.body;

      if (!students || students.length === 0) {
        return res.status(400).json({
          success: false,
          error: "At least one Ph.D. Scholar must be selected to compile. Add or select active roster members."
        });
      }

      // Format a highly structured hierarchical log representing the extracted records for Gemini
      let dataPayload = `================================================================
ACTIVE EVALUATION BOUNDARIES:
Start Date: ${startDate || '2026-05-01'}
End Date: ${endDate || '2026-06-15'}

================================================================
SELECTED STUDENT PROFILES & METADATA:
${students.map((s: any, idx: number) => `
Student Class #${idx + 1}:
- User ID: ${s.userId}
- Name: ${s.name}
- Email: ${s.email}
- Contact: ${s.phoneNumber || 'N/A'}
- Primary Research Domain: ${s.researchDomain || 'N/A'}
- Specific Thesis Topic: ${s.thesisTopic || 'N/A'}
- Enrollment Date: ${s.userId.startsWith('STU_') ? 'Joined early cycle' : 'Record compiled'}
- Status in System: ${s.rosterStatus}
`).join('\n')}

================================================================
CHRONOLOGICAL RESEARCH TASKS SUBSET:
${tasks && tasks.length > 0 ? tasks.map((t: any, idx: number) => `
Task Entry #${idx + 1}:
- Task ID: ${t.taskId}
- Assigned Scholar ID: ${t.studentId} (${(students.find((s: any) => s.userId === t.studentId)?.name) || 'Unknown Student'})
- Heading Title: ${t.title}
- Operational Pipeline Lane: ${t.laneCategory} (Completed, Doing, or Planned)
- Start Date Timestamp: ${t.startDate ? new Date(t.startDate).toLocaleDateString() : 'N/A'}
- Expected Deadline Timestamp: ${t.expectedEndDate ? new Date(t.expectedEndDate).toLocaleDateString() : 'N/A'}
- Actual Completion Date: ${t.actualCompletionDate ? new Date(t.actualCompletionDate).toLocaleDateString() : 'N/A (Active/Planned)'}
- Visual Status Indicator: ${t.currentStatus} (GREEN, YELLOW, or RED)
- Professor Evaluation State: ${t.professorReviewStatus || 'Pending Review'}
- Professor Comments Log: ${t.professorCommentsLog ? JSON.stringify(t.professorCommentsLog) : '[]'}
`).join('\n') : 'No research tasks matched this duration / cohort criteria.'}

================================================================
ASSOCIATED MEETINGS & PRESENTATION MILESTONES:
${meetings && meetings.length > 0 ? meetings.map((m: any, idx: number) => `
Meeting Scheduled #${idx + 1}:
- Meeting ID: ${m.meetingId}
- Linked Task ID: ${m.associatedTaskId} (${(tasks?.find((t: any) => t.taskId === m.associatedTaskId)?.title) || 'Unknown Key Task'})
- scheduledTimestamp: ${m.scheduledTimestamp ? new Date(m.scheduledTimestamp).toLocaleString() : 'N/A'}
- Agenda notes of performance: ${m.agendaNotes || 'No notes compiled'}
`).join('\n') : 'No meeting entries affiliated with chosen tasks.'}

================================================================
SHARED ASSETS & LITERAL LITERATURE INGESTION:
${documents && documents.length > 0 ? documents.map((d: any, idx: number) => `
Document Registry #${idx + 1}:
- Doc ID: ${d.docId}
- Allied Task ID: ${d.associatedTaskId}
- Class Classification: ${d.docClass}
- Uploader Username ID: ${d.uploadedBy}
- Location URI: ${d.fileStorageUrl || 'N/A'}
- Targeted Tagged Users: ${d.taggedUsersRaw || 'None'}
- AI Extracted Summary Snippet: ${d.aiSummarySnippet || 'N/A'}
`).join('\n') : 'No documents registry linked.'}
================================================================`;

      const apiKey = process.env.GEMINI_API_KEY;

      // Handle missing api keys gracefully but cleanly
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        console.warn("GEMINI_API_KEY environment variable is not defined or is placeholder. Generating high-fidelity mock synthesis report.");
        
        // Generate beautiful mockup synthesis
        const generatedMock = `# Executive Laboratory Summary Panel
During this evaluation window (${startDate} to ${endDate}), the laboratory has demonstrated strong academic momentum. Over ${tasks.length} core tasks were tracked across ${students.length} doctoral candidate profiles, yielding a milestone resolution rate of ${Math.round((tasks.filter((t: any) => t.laneCategory === 'Completed').length / (tasks.length || 1)) * 100)}%. There are currently ${tasks.filter((t: any) => t.currentStatus === 'RED').length} active system blocks (RED status) necessitating targeted professor intervention. Outstanding milestones highlight consistent progress across advanced chemical and molecular biotechnology domains.

${students.map((s: any) => {
  const studentTasks = tasks.filter((t: any) => t.studentId === s.userId);
  const completed = studentTasks.filter((t: any) => t.laneCategory === 'Completed');
  const doing = studentTasks.filter((t: any) => t.laneCategory === 'Doing');
  const planned = studentTasks.filter((t: any) => t.laneCategory === 'Planned');
  
  const commentsList: string[] = [];
  studentTasks.forEach((t: any) => {
    if (t.professorCommentsLog) {
      try {
        const parsed = typeof t.professorCommentsLog === 'string' ? JSON.parse(t.professorCommentsLog) : t.professorCommentsLog;
        if (Array.isArray(parsed)) {
          commentsList.push(...parsed.map((c: any) => `*${t.title}*: "${typeof c === 'object' ? c.comment || c.text : c}"`));
        } else if (parsed && typeof parsed === 'object') {
          commentsList.push(`*${t.title}*: "${parsed.comment || parsed.text || JSON.stringify(parsed)}"`);
        } else {
          commentsList.push(`*${t.title}*: "${parsed}"`);
        }
      } catch (e) {
        commentsList.push(`*${t.title}*: "${t.professorCommentsLog}"`);
      }
    }
  });

  return `## ${s.name}
- **Research Domain:** ${s.researchDomain || 'Biotechnology & Bio-engineering'} \n- **Thesis Topic:** ${s.thesisTopic || 'Molecular Pathway Discovery'}

### Completed Tasks vs. Assigned Timelines
| Completed Tasks | Start Date | Expected Deadline | Date Completed | Review Status |
| :--- | :--- | :--- | :--- | :--- |
${completed.length > 0 ? completed.map((t: any) => `| ${t.title} | ${new Date(t.startDate).toLocaleDateString()} | ${new Date(t.expectedEndDate).toLocaleDateString()} | ${t.actualCompletionDate ? new Date(t.actualCompletionDate).toLocaleDateString() : 'Completed'} | ${t.professorReviewStatus || 'Approved'} |`).join('\n') : '| No completed tasks registry matches this duration. | - | - | - | - |'}

### Active Exploits (Doing)
${doing.length > 0 ? doing.map((t: any) => `* **${t.title}**
  * Start Date: ${new Date(t.startDate).toLocaleDateString()}
  * Target Deadline: ${new Date(t.expectedEndDate).toLocaleDateString()}
  * Metric Status: ${t.currentStatus}
  * Review Sign-Off: ${t.professorReviewStatus}`).join('\n') : '* No ongoing active exploits recorded.'}

### Upcoming Milestones (Planned)
${planned.length > 0 ? planned.map((t: any) => `* **${t.title}**
  * Target Start Date: ${new Date(t.startDate).toLocaleDateString()}
  * Projected Duration: Approaching schedule
  * Status Indicator: ${t.currentStatus}`).join('\n') : '* No upcoming tasks planned.'}

### Feedback & Actions Digest
${commentsList.length > 0 ? commentsList.map(c => `- **PI Correction Required** in ${c}`).join('\n') : '- No active corrective critiques logged by the Professor in this period.'}
`;
}).join('\n\n')}

***
*Note: Because no active Google AI Studio GEMINI_API_KEY was found in the environment, this report was synthesized using our local state compiler engine. Supply a valid security token in target Settings to access full LLM research diagnostics.*`;

        return res.status(200).json({ success: true, report: generatedMock });
      }

      // Initialize Google GenAI with recommended params
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      console.log("Invoking Gemini 3.5 Flash for academic report aggregation...");
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Please compile the publication-grade OMI progress summary report based on this relational slice:\n\n${dataPayload}`,
        config: {
          systemInstruction: `You are an expert academic administrator, principal investigator's operational assistant, and technical research evaluator. Your task is to ingest a raw dataset representing a structured slice of PhD student research tracking logs collected between specific calendar boundaries, and synthesize this input into a highly professional, objective, publication-grade Laboratory Progress Summary Report.

You must strictly satisfy the following output generation rules:
- Document Structure: Begin with a global "Executive Laboratory Summary Panel" containing a high-level 4-sentence overview of research velocity, aggregate milestone completion rates, and outstanding lab blockers.
- Individual Cohort Analysis: For each distinct student present in the payload data, generate an isolated section titled with their full name. Inside their section, build a markdown table detailing "Completed Tasks vs. Assigned Timelines", followed by bulleted deep dives into their "Active Exploits (Doing)" and "Upcoming Milestones (Planned)".
- Feedback & Actions Digest: Synthesize all historic comments provided by the Professor during this time window, clearly listing the explicit corrections or adjustments the student must satisfy in the upcoming research sprint.
- Professional Tone: Maintain an authoritative, formal, and strictly objective academic tone. Avoid any conversational introductions, placeholders, or meta-commentary. Use clean, semantic markdown formatting throughout.`
        }
      });

      res.status(200).json({
        success: true,
        report: response.text
      });

    } catch (e: any) {
      console.error("Express compilation router exploded:", e);
      res.status(500).json({ success: false, error: e.message || "Internal Engine Error" });
    }
  });

  // Vite development vs production configurations
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

