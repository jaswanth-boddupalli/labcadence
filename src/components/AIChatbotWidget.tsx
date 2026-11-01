/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { LabUser } from "../types";
import { 
  Bot, Send, X, Sparkles, RefreshCw, Copy, Check, ChevronDown, 
  MessageSquare, AlertTriangle, Clock, CheckCircle2, ShieldCheck, UserCheck
} from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: number;
}

interface AIChatbotWidgetProps {
  activeUser: LabUser;
  isCoordinator: boolean;
  isOpen?: boolean;
  onToggleOpen?: () => void;
}

export default function AIChatbotWidget({
  activeUser,
  isCoordinator,
  isOpen: controlledIsOpen,
  onToggleOpen
}: AIChatbotWidgetProps) {
  // STRICT ACCESS CONTROL: Only PI and Coordinator can mount/view this feature
  const isPI = activeUser.designation === "Professor (PI)";
  const isCoord = activeUser.designation === "Coordinator" || isCoordinator;
  const isAuthorized = isPI || isCoord;

  if (!isAuthorized) {
    return null;
  }

  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = (open: boolean) => {
    if (onToggleOpen) {
      if (open !== isOpen) onToggleOpen();
    } else {
      setInternalIsOpen(open);
    }
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: `Hello ${activeUser.name}! I'm your collaborative project assistant.\n\nI convert technical project management metrics and updates into clear, friendly, and human status reports. Feel free to ask about any researcher's progress, items waiting for your review, or upcoming deadlines!`,
      timestamp: Date.now()
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      id: `user_${Date.now()}`,
      sender: "user",
      text,
      timestamp: Date.now()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chatbot/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          userRole: activeUser.designation,
          userId: activeUser.userId
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to query AI assistant.");
      }

      const botMsg: Message = {
        id: `bot_${Date.now()}`,
        sender: "assistant",
        text: data.answer,
        timestamp: data.timestamp || Date.now()
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot_err_${Date.now()}`,
          sender: "assistant",
          text: `⚠️ **Error querying database context**: ${err.message}`,
          timestamp: Date.now()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderFormattedContent = (rawText: string) => {
    // Replace <br><br> and <br> with newlines
    const normalized = rawText
      .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, "\n\n")
      .replace(/<br\s*\/?>/gi, "\n");

    const sections = normalized.split(/\n\s*\n/);

    return (
      <div className="space-y-3.5 font-sans">
        {sections.map((section, sIdx) => {
          const trimmedSection = section.trim();
          if (!trimmedSection) return null;

          const lines = trimmedSection.split("\n");
          return (
            <div key={sIdx} className="space-y-1.5">
              {lines.map((line, lIdx) => {
                const lineTrimmed = line.trim();
                if (!lineTrimmed) return null;

                const isHeader =
                  lineTrimmed.startsWith("👋") ||
                  lineTrimmed.startsWith("📊") ||
                  lineTrimmed.startsWith("🚀") ||
                  lineTrimmed.startsWith("🎯") ||
                  lineTrimmed.startsWith("###") ||
                  lineTrimmed.startsWith("##");

                if (isHeader) {
                  return (
                    <div
                      key={lIdx}
                      className="font-extrabold text-[12.5px] text-teal-950 flex items-center space-x-1.5 pb-1 border-b border-teal-100"
                    >
                      <span>{lineTrimmed.replace(/^[#]+\s*/, "")}</span>
                    </div>
                  );
                }

                const isBullet =
                  lineTrimmed.startsWith("•") ||
                  lineTrimmed.startsWith("-") ||
                  lineTrimmed.startsWith("*");

                if (isBullet) {
                  return (
                    <div
                      key={lIdx}
                      className="pl-2 flex items-start space-x-2 text-slate-700 leading-relaxed text-xs"
                    >
                      <span className="text-teal-600 font-bold select-none leading-tight mt-0.5">•</span>
                      <span className="flex-1">{lineTrimmed.replace(/^[•\-\*]\s*/, "")}</span>
                    </div>
                  );
                }

                return (
                  <p key={lIdx} className="text-slate-800 leading-relaxed text-xs">
                    {lineTrimmed}
                  </p>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  const quickPrompts = [
    { label: "Tasks waiting for PI review", query: "How many tasks are currently waiting for my review or feedback?" },
    { label: "Immediate attention (RED blockers)", query: "Which specific tasks need my immediate attention today?" },
    { label: "Approaching deadlines this week", query: "Which tasks are approaching their deadline this week?" },
    { label: "Overdue tasks still Ongoing", query: "Are there any tasks that have crossed their end date but are still marked as 'Ongoing'?" },
    { label: "Lab productivity summary", query: "Overall, how many tasks were moved to 'Completed' across the lab, and summarize productivity?" },
    { label: "Dr. Jordan progress", query: "What did Dr. Jordan work on and what are his active ongoing tasks?" }
  ];

  return (
    <>
      {/* Floating Widget Launcher Button (Bottom Right) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-teal-800 to-slate-900 hover:from-teal-700 hover:to-slate-800 text-white p-3.5 sm:px-5 sm:py-3.5 rounded-full shadow-2xl flex items-center space-x-2.5 transition-all transform hover:scale-105 border border-teal-500/30 group cursor-pointer font-sans"
          title="Open PI & Coordinator AI Lab Assistant"
        >
          <div className="relative">
            <Bot size={22} className="text-teal-300 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
            </span>
          </div>
          <span className="hidden sm:inline text-xs font-black tracking-wide uppercase">
            AI Lab Assistant
          </span>
          <span className="text-[10px] bg-teal-900/80 text-teal-300 px-2 py-0.5 rounded-full font-mono border border-teal-700/50">
            {isPI ? "PI Role" : "Coordinator"}
          </span>
        </button>
      )}

      {/* Floating Chat Assistant Drawer / Modal */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[95vw] sm:w-[480px] max-h-[85vh] h-[640px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-fadeIn font-sans">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-slate-950 text-white p-4 flex items-center justify-between border-b border-teal-800/50 shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-teal-500/20 rounded-xl border border-teal-500/30 text-teal-300">
                <Bot size={20} />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-black tracking-tight text-white">
                    PI & Coordinator AI Assistant
                  </h3>
                  <span className="text-[9px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-400/30">
                    Live RAG
                  </span>
                </div>
                <p className="text-[10px] text-teal-200/80 font-medium">
                  {isPI ? "Principal Investigator Terminal" : "Coordinator Operational Channel"}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => {
                  setMessages([
                    {
                      id: "welcome_reset",
                      sender: "assistant",
                      text: `Hello ${activeUser.name}! Conversation reset. Ready to generate clear, friendly status reports whenever you need!`,
                      timestamp: Date.now()
                    }
                  ]);
                }}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                title="Reset conversation"
              >
                <RefreshCw size={14} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="Minimize assistant"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Role Access Banner */}
          <div className="bg-teal-50/80 border-b border-teal-100 px-4 py-1.5 flex items-center justify-between text-[11px] text-teal-850 font-bold shrink-0">
            <div className="flex items-center space-x-1.5">
              <ShieldCheck size={13} className="text-teal-700" />
              <span>Restricted Access: Verified {isPI ? "Principal Investigator" : "Coordinator"}</span>
            </div>
            <span className="text-[10px] font-mono text-teal-700 bg-white px-1.5 py-0.2 rounded border border-teal-200">
              PostgreSQL Connected
            </span>
          </div>

          {/* Quick Prompts Bar */}
          <div className="bg-slate-50 border-b border-slate-150 p-2.5 overflow-x-auto shrink-0 flex items-center gap-1.5 no-scrollbar">
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                disabled={isLoading}
                onClick={() => handleSendMessage(qp.query)}
                className="whitespace-nowrap bg-white hover:bg-teal-50 hover:border-teal-300 border border-slate-200 text-slate-700 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50 shrink-0"
              >
                {qp.label}
              </button>
            ))}
          </div>

          {/* Message Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {messages.map((m) => {
              const isUser = m.sender === "user";
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  <div className="flex items-center space-x-1.5 mb-1 text-[10px] text-slate-400 font-mono">
                    <span>{isUser ? activeUser.name : "AI Lab Assistant"}</span>
                    <span>•</span>
                    <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>

                  <div
                    className={`relative group max-w-[92%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                      isUser
                        ? "bg-teal-800 text-white rounded-br-none shadow-sm"
                        : "bg-white text-slate-800 rounded-bl-none border border-slate-200 shadow-sm"
                    }`}
                  >
                    {/* Render message text with simple markdown styling */}
                    {isUser ? (
                      <div className="whitespace-pre-wrap font-sans text-xs">
                        {m.text}
                      </div>
                    ) : (
                      renderFormattedContent(m.text)
                    )}

                    {!isUser && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleCopy(m.id, m.text)}
                          className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition-colors"
                          title="Copy response"
                        >
                          {copiedId === m.id ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex flex-col items-start space-y-1 animate-pulse">
                <div className="text-[10px] text-teal-700 font-mono flex items-center space-x-1">
                  <Sparkles size={11} className="animate-spin text-teal-600" />
                  <span>Querying PostgreSQL relational models...</span>
                </div>
                <div className="bg-white border border-teal-200 text-teal-900 rounded-2xl rounded-bl-none p-3 shadow-xs text-xs flex items-center space-x-2">
                  <div className="h-2 w-2 rounded-full bg-teal-600 animate-bounce"></div>
                  <div className="h-2 w-2 rounded-full bg-teal-600 animate-bounce [animation-delay:0.2s]"></div>
                  <div className="h-2 w-2 rounded-full bg-teal-600 animate-bounce [animation-delay:0.4s]"></div>
                  <span className="text-slate-500 font-medium pl-1">Synthesizing database context...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-slate-200 shrink-0">
            <div className="relative flex items-center">
              <input
                type="text"
                value={inputText}
                disabled={isLoading}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask for a friendly status report, researcher progress, or reviews..."
                className="w-full text-xs bg-slate-100 focus:bg-white text-slate-800 placeholder-slate-400 pl-3.5 pr-12 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-700 transition-all"
              />
              <button
                type="button"
                disabled={!inputText.trim() || isLoading}
                onClick={() => handleSendMessage()}
                className="absolute right-1.5 bg-teal-800 hover:bg-teal-900 disabled:opacity-40 text-white p-2 rounded-lg transition-colors cursor-pointer"
                title="Send query"
              >
                <Send size={14} />
              </button>
            </div>
            <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-slate-400 font-mono">
              <span>Enter to send</span>
              <span>Exclusive to PI & Coordinator</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

