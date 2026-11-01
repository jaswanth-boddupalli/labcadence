/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Mail, Send, CheckCircle2, AlertTriangle, ShieldCheck, 
  Settings, History, RefreshCw, X, ExternalLink, Key, Server
} from "lucide-react";
import { LabEmailAlert, EmailConfig } from "../types";

interface EmailAlertSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
  currentUserName: string;
}

export default function EmailAlertSettingsModal({
  isOpen,
  onClose,
  onShowToast,
  currentUserName
}: EmailAlertSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"history" | "config">("history");
  const [alerts, setAlerts] = useState<LabEmailAlert[]>([]);
  const [config, setConfig] = useState<EmailConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);

  // Form states for SMTP
  const [host, setHost] = useState("smtp.gmail.com");
  const [port, setPort] = useState(587);
  const [secure, setSecure] = useState(false);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [from, setFrom] = useState('"LabPulse Alert" <notifications@example.edu>');
  const [piEmail, setPiEmail] = useState("pi@example.edu");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [alertsRes, configRes] = await Promise.all([
        fetch("/api/alerts/history"),
        fetch("/api/email-config")
      ]);

      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData || []);
      }

      if (configRes.ok) {
        const configData: EmailConfig = await configRes.json();
        setConfig(configData);
        setHost(configData.host || "smtp.gmail.com");
        setPort(configData.port || 587);
        setSecure(configData.secure || false);
        setUser(configData.user || "");
        setFrom(configData.from || '"LabPulse Alert" <notifications@example.edu>');
        setPiEmail(configData.piEmail || "pi@example.edu");
      }
    } catch (e: any) {
      console.error("Failed to load email config/alerts:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTestError(null);
    setTestSuccess(null);
    try {
      const res = await fetch("/api/email-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host,
          port,
          secure,
          user: user.trim(),
          pass: pass.trim() || undefined,
          from: from.trim(),
          piEmail: piEmail.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save configuration");
      onShowToast("Email configuration saved successfully.");
      setPass("");
      loadData();
    } catch (e: any) {
      onShowToast(`Save failed: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestAlert = async () => {
    setIsSendingTest(true);
    setTestError(null);
    setTestSuccess(null);
    try {
      const res = await fetch("/api/email-config/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderName: currentUserName || "Lab Member"
        })
      });
      const data = await res.json();
      if (data.deliveryStatus && data.deliveryStatus.includes("FAILED")) {
        const errMsg = data.errorMessage || 'Check SMTP credentials';
        setTestError(errMsg);
        onShowToast(`⚠️ Test email failed: ${errMsg}`);
      } else {
        const msg = `📧 Test alert sent to Principal Investigator (${data.recipientEmail})!`;
        setTestSuccess(msg);
        onShowToast(msg);
      }
      loadData();
    } catch (e: any) {
      setTestError(e.message);
      onShowToast(`Test alert failed: ${e.message}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  const isGmailAuthError = testError && (
    testError.includes("535") || 
    testError.includes("BadCredentials") || 
    testError.includes("Username and Password not accepted")
  );

  const renderFeedbackBanners = () => (
    <>
      {isGmailAuthError && (
        <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl text-amber-950 text-xs space-y-2.5 animate-fadeIn">
          <div className="flex items-center space-x-2 font-bold text-amber-900 text-sm">
            <AlertTriangle size={18} className="text-amber-600 shrink-0" />
            <span>Google SMTP Authentication Notice (Error 535: Bad Credentials)</span>
          </div>
          <p className="leading-relaxed">
            Google rejected the login. Google <strong>does not accept your standard Gmail password</strong> for SMTP applications. You must generate and use a 16-character <strong>Google App Password</strong>.
          </p>
          <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-2 text-[11px]">
            <p className="font-bold text-slate-800 uppercase tracking-wider">
              How to get your 16-character App Password (1 minute):
            </p>
            <ol className="list-decimal pl-4 space-y-1.5 text-slate-700">
              <li>
                Make sure <strong>2-Step Verification</strong> is ON for <span className="font-semibold text-slate-900">{user || "your-account@gmail.com"}</span> in Google Account Security.
              </li>
              <li>
                Open the Google App Passwords page:{" "}
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noreferrer"
                  className="text-teal-700 font-bold underline inline-flex items-center space-x-0.5 hover:text-teal-900"
                >
                  <span>myaccount.google.com/apppasswords</span>
                  <ExternalLink size={11} className="inline ml-1" />
                </a>
              </li>
              <li>
                App name: Enter <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold">OMI LabPulse</code> and click <strong>Create</strong>.
              </li>
              <li>
                Copy the generated <strong>16-letter code</strong> (e.g. <code className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-mono font-bold">abcd efgh ijkl mnop</code>).
              </li>
              <li>
                Switch to the <strong>SMTP Server Settings</strong> tab, paste it into the <strong>App Password</strong> field, and click <strong>Save SMTP Settings</strong>.
              </li>
            </ol>
            {activeTab !== "config" && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("config")}
                  className="text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-lg cursor-pointer inline-flex items-center space-x-1"
                >
                  <Settings size={12} />
                  <span>Open SMTP Server Settings Tab</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {testError && !isGmailAuthError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 text-xs flex items-start space-x-2 animate-fadeIn">
          <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">SMTP Connection / Authentication Failed</p>
            <p className="font-mono text-[11px] text-rose-700">{testError}</p>
          </div>
        </div>
      )}

      {testSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span className="font-semibold">{testSuccess}</span>
        </div>
      )}
    </>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-scaleUp">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-teal-500/20 text-teal-300 rounded-xl border border-teal-500/30">
              <Mail size={20} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-sm tracking-tight text-white font-sans">
                  PI Email Alert System
                </h3>
                <span className="text-[10px] font-mono bg-teal-900/60 text-teal-300 px-2 py-0.5 rounded-full border border-teal-700/50">
                  Target: {config?.piEmail || "pi@example.edu"}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                Every person update triggers a direct alert notification to the Principal Investigator
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Status Callout Banner */}
        <div className="bg-teal-50/70 border-b border-teal-150 px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center space-x-2">
            {config?.configured ? (
              <span className="flex items-center space-x-1.5 text-emerald-800 text-xs font-bold font-sans">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>SMTP Live Delivery Active</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1.5 text-amber-800 text-xs font-semibold font-sans">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span>Simulation & Logging Mode (Configure SMTP below for direct SMTP dispatch)</span>
              </span>
            )}
            <span className="text-slate-300">|</span>
            <span className="text-[11px] text-slate-600 font-mono">Recipient: Principal Investigator &lt;{config?.piEmail || "pi@example.edu"}&gt;</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSendTestAlert}
              disabled={isSendingTest}
              className="bg-teal-700 hover:bg-teal-800 text-white text-[11px] font-bold px-3 py-1 rounded-lg flex items-center space-x-1 cursor-pointer transition-colors disabled:opacity-50"
            >
              <Send size={11} />
              <span>{isSendingTest ? "Sending Test..." : "Send Test Alert to PI"}</span>
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 px-6 pt-3 gap-2 bg-slate-50/50 shrink-0">
          <button
            onClick={() => setActiveTab("history")}
            className={`pb-2.5 px-3 text-xs font-bold flex items-center space-x-1.5 cursor-pointer border-b-2 transition-colors ${
              activeTab === "history"
                ? "border-teal-700 text-teal-800"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <History size={14} />
            <span>Dispatched Alerts History ({alerts.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("config")}
            className={`pb-2.5 px-3 text-xs font-bold flex items-center space-x-1.5 cursor-pointer border-b-2 transition-colors ${
              activeTab === "config"
                ? "border-teal-700 text-teal-800"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Settings size={14} />
            <span>SMTP Server Settings</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === "history" && (
            <div className="space-y-4">
              {renderFeedbackBanners()}

              {/* Keywords Summary Box */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                <div>
                  <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    1. Member Updates ➔ Principal Investigator (PI Mail):
                  </p>
                  <div className="flex flex-wrap gap-1.5 text-xs font-mono">
                    <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md border border-emerald-300">
                      &ldquo;Researcher updated new task&rdquo;
                    </span>
                    <span className="bg-sky-100 text-sky-900 px-2 py-0.5 rounded-md border border-sky-300">
                      &ldquo;Researcher Updated sub-task&rdquo;
                    </span>
                    <span className="bg-purple-100 text-purple-900 px-2 py-0.5 rounded-md border border-purple-300">
                      &ldquo;Researcher shared a file&rdquo;
                    </span>
                    <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md border border-amber-300">
                      &ldquo;Researcher added a comment&rdquo;
                    </span>
                  </div>
                </div>

                <div className="pt-1 border-t border-slate-200/60">
                  <p className="text-[10px] font-bold text-teal-800 uppercase tracking-wider mb-1">
                    2. Principal Investigator (PI) Updates ➔ Individual Person Mails:
                  </p>
                  <div className="flex flex-wrap gap-1.5 text-xs font-mono">
                    <span className="bg-teal-100 text-teal-900 px-2 py-0.5 rounded-md border border-teal-300">
                      &ldquo;PI added a comment&rdquo;
                    </span>
                    <span className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded-md border border-blue-300">
                      &ldquo;PI updated review status&rdquo;
                    </span>
                    <span className="bg-indigo-100 text-indigo-900 px-2 py-0.5 rounded-md border border-indigo-300">
                      &ldquo;PI Updated sub-task&rdquo;
                    </span>
                    <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md border border-emerald-300">
                      &ldquo;PI shared a file&rdquo;
                    </span>
                  </div>
                </div>
              </div>

              {/* Table of Dispatched Alerts */}
              <div className="flex justify-between items-center pt-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                  Recent Email Alerts Dispatched
                </h4>
                <button
                  onClick={loadData}
                  disabled={isLoading}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center space-x-1 cursor-pointer"
                >
                  <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
                  <span>Refresh</span>
                </button>
              </div>

              {alerts.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-200">
                  <Mail className="mx-auto text-slate-300 mb-2" size={32} />
                  <p className="text-xs font-bold text-slate-600">No alerts dispatched yet</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Perform any task update, subtask check, file upload, or comment in the app to trigger alerts.
                  </p>
                  <button
                    onClick={handleSendTestAlert}
                    className="mt-3 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer"
                  >
                    Send Verification Alert
                  </button>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 text-[11px] font-bold">
                        <th className="py-2.5 px-3">Keyword / Notification</th>
                        <th className="py-2.5 px-3">Updated By</th>
                        <th className="py-2.5 px-3">Recipient Mail</th>
                        <th className="py-2.5 px-3">Task Reference</th>
                        <th className="py-2.5 px-3">Delivery Status</th>
                        <th className="py-2.5 px-3">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {alerts.map((alert) => (
                        <tr key={alert.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-teal-900">
                            &ldquo;{alert.keyword}&rdquo;
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800 font-sans">
                            {alert.senderName}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                            {alert.recipientEmail}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 font-sans max-w-[150px] truncate" title={alert.taskTitle || alert.details}>
                            {alert.taskTitle || alert.taskId || "Lab Operation"}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              alert.deliveryStatus.startsWith("DELIVERED")
                                ? "bg-emerald-100 text-emerald-800"
                                : alert.deliveryStatus.startsWith("FAILED")
                                ? "bg-red-100 text-red-800"
                                : "bg-sky-100 text-sky-800"
                            }`}>
                              {alert.deliveryStatus}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 font-mono text-[10px]">
                            {new Date(alert.createdAt).toLocaleString("en-IN", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "config" && (
            <form onSubmit={handleSaveConfig} className="space-y-4">
              {renderFeedbackBanners()}

              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-blue-900 text-xs leading-relaxed">
                <p className="font-bold flex items-center space-x-1 mb-1">
                  <Server size={14} className="text-blue-700" />
                  <span>SMTP Outbound Configuration</span>
                </p>
                Configure credentials to dispatch real emails directly to the Principal Investigator via Google Workspace, institutional email, or Microsoft 365. For Gmail, use an <strong>App Password</strong> generated from your Google Account security panel.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">PI Recipient Email</label>
                  <input
                    type="email"
                    value={piEmail}
                    onChange={(e) => setPiEmail(e.target.value)}
                    required
                    placeholder="pi@example.edu"
                    className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">SMTP Host</label>
                  <input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    required
                    placeholder="smtp.gmail.com"
                    className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">SMTP Port</label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(parseInt(e.target.value, 10))}
                    required
                    className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">SSL / TLS Mode</label>
                  <select
                    value={secure ? "true" : "false"}
                    onChange={(e) => setSecure(e.target.value === "true")}
                    className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none cursor-pointer"
                  >
                    <option value="false">STARTTLS (Port 587 - Recommended)</option>
                    <option value="true">Direct SSL (Port 465)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sender Account (SMTP User)</label>
                  <input
                    type="email"
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    placeholder="notifications@example.edu or gmail"
                    className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      App Password (SMTP Password) {config?.hasPassword && "(Set & Saved)"}
                    </label>
                    <a
                      href="https://myaccount.google.com/apppasswords"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-teal-700 hover:text-teal-900 font-bold inline-flex items-center space-x-0.5"
                    >
                      <span>Create App Password</span>
                      <ExternalLink size={9} className="ml-0.5" />
                    </a>
                  </div>
                  <input
                    type="password"
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    placeholder={config?.hasPassword ? "•••••••••••••••• (Leave blank to keep current)" : "Enter 16-character App Password"}
                    className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-mono"
                  />
                  <p className="text-[10px] text-slate-500 leading-tight">
                    ⚠️ <strong>Gmail Note:</strong> Use your 16-character Google App Password here, NOT your regular personal email password.
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">From Header / Name</label>
                <input
                  type="text"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end pt-3 space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleSendTestAlert}
                  disabled={isSendingTest}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  {isSendingTest ? "Sending Test..." : "Send Test to PI"}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-slate-900 hover:bg-black text-white px-5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm"
                >
                  {isSaving ? "Saving..." : "Save SMTP Settings"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-between items-center text-[11px] text-slate-500 shrink-0">
          <span>OMI LAB &bull; Indian Institute of Science (IISc), Bangalore</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl font-semibold text-slate-700 text-xs cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}

