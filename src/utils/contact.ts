/**
 * Contact and Messaging Utilities for WhatsApp and Email Integration
 * OMI LAB | IISc - Research Operations Engine
 */

export interface MessageContext {
  type?: 'general' | 'task' | 'meeting' | 'document';
  title?: string;
  details?: string;
  senderName?: string;
}

/**
 * Sanitize and format phone number for WhatsApp wa.me API
 * WhatsApp requires international format digits with no +, -, () or spaces
 */
export function cleanPhoneForWhatsApp(phoneNumber?: string): string {
  if (!phoneNumber) return '';
  
  // Remove all non-numeric characters except +
  let cleaned = phoneNumber.trim().replace(/[^\d+]/g, '');
  
  // Remove leading +
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  
  // If 10 digits without country code (common in India), prepend 91
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    cleaned = '91' + cleaned;
  }
  
  return cleaned;
}

/**
 * Checks if a phone number is a realistic contact number (not empty or dummy)
 */
export function isValidPhoneNumber(phoneNumber?: string): boolean {
  if (!phoneNumber) return false;
  const cleaned = cleanPhoneForWhatsApp(phoneNumber);
  
  // Check for dummy placeholder numbers like +1 (555) 000-0000 or 000
  if (cleaned.includes('000000') || cleaned.includes('555000') || cleaned.length < 8) {
    return false;
  }
  
  return true;
}

/**
 * Generate formatted message body
 */
export function generateMessageText(name: string, context?: MessageContext): string {
  const greeting = name ? `Hello ${name},` : 'Hello,';
  
  if (!context || context.type === 'general' || !context.type) {
    let msg = `${greeting}\n\nReaching out regarding OMI LAB (IISc) Research Operations.`;
    if (context?.details) {
      msg += `\n\n${context.details}`;
    }
    return msg;
  }
  
  if (context.type === 'task') {
    let msg = `${greeting}\n\nRegarding your research task: "${context.title || 'Active Task'}".`;
    if (context.details) {
      msg += `\n\nNotes: ${context.details}`;
    } else {
      msg += `\n\nPlease share a quick update on your current status or if you need any coordinator/PI assistance.`;
    }
    return msg;
  }
  
  if (context.type === 'meeting') {
    let msg = `${greeting}\n\nReminder for the upcoming OMI LAB meeting: "${context.title || 'Research Review'}".`;
    if (context.details) {
      msg += `\n\nDetails: ${context.details}`;
    }
    return msg;
  }
  
  if (context.type === 'document') {
    let msg = `${greeting}\n\nA document has been updated for your attention: "${context.title || 'Research Document'}".`;
    if (context.details) {
      msg += `\n\nReference: ${context.details}`;
    }
    return msg;
  }
  
  return `${greeting}\n\nOMI LAB IISc Research Operations update.`;
}

/**
 * Build a WhatsApp Web / App direct chat URL
 */
export function buildWhatsAppUrl(phoneNumber?: string, name: string = '', context?: MessageContext): string | null {
  const cleaned = cleanPhoneForWhatsApp(phoneNumber);
  if (!cleaned || !isValidPhoneNumber(phoneNumber)) return null;
  
  const text = generateMessageText(name, context);
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
}

/**
 * Build a mailto: URL for default email client
 */
export function buildMailtoUrl(email?: string, name: string = '', context?: MessageContext): string | null {
  if (!email || !email.includes('@')) return null;
  
  let subject = 'OMI LAB | IISc - Research Operations Update';
  if (context?.type === 'task' && context.title) {
    subject = `[Task Update] ${context.title} - OMI LAB IISc`;
  } else if (context?.type === 'meeting' && context.title) {
    subject = `[Meeting Notice] ${context.title} - OMI LAB IISc`;
  } else if (context?.type === 'document' && context.title) {
    subject = `[Document Reference] ${context.title} - OMI LAB IISc`;
  }
  
  const body = generateMessageText(name, context) + '\n\nBest regards,\nOMI LAB Research Team\nIndian Institute of Science (IISc), Bangalore';
  
  return `mailto:${email.trim()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
