import React, { useState } from 'react';
import { Mail, MessageCircle, Send, X, ExternalLink, AlertCircle, Sparkles } from 'lucide-react';
import { 
  buildWhatsAppUrl, 
  buildMailtoUrl, 
  isValidPhoneNumber, 
  cleanPhoneForWhatsApp,
  MessageContext 
} from '../utils/contact';

interface ContactActionsProps {
  name: string;
  email?: string;
  phoneNumber?: string;
  context?: MessageContext;
  compact?: boolean;
  onEditRequested?: () => void;
}

export default function ContactActions({
  name,
  email,
  phoneNumber,
  context,
  compact = false,
  onEditRequested
}: ContactActionsProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedType, setSelectedType] = useState<NonNullable<MessageContext['type']>>(context?.type || 'general');
  const [customSubject, setCustomSubject] = useState(
    context?.title ? `[OMI LAB] ${context.title}` : 'OMI LAB | IISc - Research Operations'
  );
  const [customText, setCustomText] = useState(context?.details || '');

  const hasValidPhone = isValidPhoneNumber(phoneNumber);
  const hasValidEmail = Boolean(email && email.includes('@'));

  // Quick 1-click links
  const quickWhatsAppUrl = hasValidPhone ? buildWhatsAppUrl(phoneNumber, name, context) : null;
  const quickMailtoUrl = hasValidEmail ? buildMailtoUrl(email, name, context) : null;

  // Modal custom links
  const modalContext: MessageContext = {
    type: selectedType,
    title: customSubject,
    details: customText
  };
  const modalWhatsAppUrl = hasValidPhone ? buildWhatsAppUrl(phoneNumber, name, modalContext) : null;
  const modalMailtoUrl = hasValidEmail ? buildMailtoUrl(email, name, modalContext) : null;

  const handleOpenWhatsApp = () => {
    if (modalWhatsAppUrl) {
      window.open(modalWhatsAppUrl, '_blank', 'noopener,noreferrer');
      setShowModal(false);
    }
  };

  const handleOpenEmail = () => {
    if (modalMailtoUrl) {
      window.location.href = modalMailtoUrl;
      setShowModal(false);
    }
  };

  return (
    <div className="inline-flex items-center gap-1.5 select-none">
      {/* 1-Click WhatsApp Button */}
      {hasValidPhone ? (
        <a
          href={quickWhatsAppUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center space-x-1 font-semibold rounded-lg transition-all cursor-pointer shadow-xs ${
            compact 
              ? 'px-2 py-1 text-[10px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200' 
              : 'px-2.5 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700 hover:shadow-sm'
          }`}
          title={`Open WhatsApp chat with ${name} (${phoneNumber})`}
        >
          <MessageCircle size={compact ? 11 : 13} className="shrink-0" />
          <span>WhatsApp</span>
        </a>
      ) : (
        <button
          type="button"
          onClick={() => {
            if (onEditRequested) {
              onEditRequested();
            } else {
              alert(`No mobile number registered for ${name}. Please update this profile to enable WhatsApp.`);
            }
          }}
          className={`inline-flex items-center space-x-1 font-medium rounded-lg transition-colors cursor-pointer opacity-60 hover:opacity-100 ${
            compact
              ? 'px-2 py-1 text-[10px] bg-slate-100 text-slate-500 border border-slate-200'
              : 'px-2.5 py-1.5 text-xs bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
          }`}
          title="No valid mobile number. Click to add phone."
        >
          <MessageCircle size={compact ? 11 : 13} className="text-slate-400" />
          <span>No WhatsApp</span>
        </button>
      )}

      {/* 1-Click Email Button */}
      {hasValidEmail ? (
        <a
          href={quickMailtoUrl || '#'}
          className={`inline-flex items-center space-x-1 font-semibold rounded-lg transition-all cursor-pointer shadow-xs ${
            compact
              ? 'px-2 py-1 text-[10px] bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200'
              : 'px-2.5 py-1.5 text-xs bg-sky-600 hover:bg-sky-700 text-white border border-sky-700 hover:shadow-sm'
          }`}
          title={`Draft email to ${name} (${email})`}
        >
          <Mail size={compact ? 11 : 13} className="shrink-0" />
          <span>Email</span>
        </a>
      ) : null}

      {/* Custom Message Composer Trigger */}
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className={`inline-flex items-center space-x-1 font-medium rounded-lg transition-colors cursor-pointer bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-250 ${
          compact ? 'px-1.5 py-1 text-[10px]' : 'px-2 py-1.5 text-xs'
        }`}
        title="Compose a tailored message or choose templates"
      >
        <Send size={compact ? 10 : 12} />
        {!compact && <span>Compose</span>}
      </button>

      {/* Modern Composer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden text-left">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs">
                  {name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Message {name}</h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {email || 'No email'} {phoneNumber ? `? ${phoneNumber}` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg hover:bg-slate-200/70 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Form */}
            <div className="p-5 space-y-4">
              {/* Template selector */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Message Purpose / Template
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {(['general', 'task', 'meeting', 'document'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setSelectedType(t);
                        if (t === 'task') {
                          setCustomText('Please share an update regarding your research task progress and any pending blockers.');
                        } else if (t === 'meeting') {
                          setCustomText('Gentle reminder regarding our upcoming review meeting. Please arrive with your latest progress notes.');
                        } else if (t === 'document') {
                          setCustomText('A research document has been uploaded for your attention. Please review it on the lab portal.');
                        } else {
                          setCustomText('');
                        }
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold capitalize border transition-all text-center ${
                        selectedType === t
                          ? 'bg-teal-50 border-teal-500 text-teal-900 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Subject / Topic
                </label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="e.g. OMI LAB Research Review"
                  className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* Note / Body */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Custom Note / Instructions
                </label>
                <textarea
                  rows={4}
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Type your note or instructions for this scholar..."
                  className="w-full text-xs font-medium p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* Phone warning if missing */}
              {!hasValidPhone && (
                <div className="flex items-center space-x-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>
                    No valid mobile number is registered for this scholar. You can send via <strong>Email</strong>, or update their phone in the Roster.
                  </span>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200/50 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex items-center space-x-2">
                {hasValidPhone && (
                  <button
                    type="button"
                    onClick={handleOpenWhatsApp}
                    className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all cursor-pointer"
                  >
                    <MessageCircle size={14} />
                    <span>Send on WhatsApp</span>
                  </button>
                )}

                {hasValidEmail && (
                  <button
                    type="button"
                    onClick={handleOpenEmail}
                    className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 shadow-sm transition-all cursor-pointer"
                  >
                    <Mail size={14} />
                    <span>Open in Email</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
