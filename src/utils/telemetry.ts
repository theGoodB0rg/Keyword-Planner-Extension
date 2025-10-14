/**
 * Telemetry & Debugging Utilities
 * 
 * Lightweight logging system for tracking extension behavior across different
 * marketplaces and page types. Logs are stored in chrome.storage.local for
 * manual inspection and debugging.
 * 
 * Phase 0: Telemetry & Evidence Capture
 */

export interface TelemetryEvent {
  timestamp: number;
  url: string;
  eventType: 'detection' | 'extraction' | 'error' | 'navigation';
  platform?: string;
  confidence?: number;
  selectorHits?: Record<string, boolean>;
  failureReason?: string;
  metadata?: Record<string, any>;
}

export interface TelemetrySession {
  sessionId: string;
  startTime: number;
  events: TelemetryEvent[];
  userAgent: string;
}

const TELEMETRY_STORAGE_KEY = 'ext_telemetry_logs';
const MAX_EVENTS_PER_SESSION = 100;
const MAX_SESSIONS = 10;

/**
 * Check if telemetry is enabled via extension settings
 */
async function isTelemetryEnabled(): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get('telemetryEnabled');
    return result.telemetryEnabled !== false; // Default to true
  } catch (error) {
    console.warn('Failed to check telemetry setting:', error);
    return false;
  }
}

/**
 * Get or create current telemetry session
 */
async function getCurrentSession(): Promise<TelemetrySession> {
  try {
    const result = await chrome.storage.local.get(TELEMETRY_STORAGE_KEY);
    const sessions: TelemetrySession[] = result[TELEMETRY_STORAGE_KEY] || [];
    
    // Get the most recent session
    if (sessions.length > 0) {
      const lastSession = sessions[sessions.length - 1];
      // If session is less than 1 hour old, reuse it
      if (Date.now() - lastSession.startTime < 3600000) {
        return lastSession;
      }
    }
    
    // Create new session
    const newSession: TelemetrySession = {
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startTime: Date.now(),
      events: [],
      userAgent: navigator.userAgent,
    };
    
    sessions.push(newSession);
    
    // Keep only the last MAX_SESSIONS sessions
    if (sessions.length > MAX_SESSIONS) {
      sessions.splice(0, sessions.length - MAX_SESSIONS);
    }
    
    await chrome.storage.local.set({ [TELEMETRY_STORAGE_KEY]: sessions });
    return newSession;
  } catch (error) {
    console.error('Failed to get/create telemetry session:', error);
    // Return a temporary in-memory session
    return {
      sessionId: 'temp_session',
      startTime: Date.now(),
      events: [],
      userAgent: navigator.userAgent,
    };
  }
}

/**
 * Log a telemetry event
 */
export async function logTelemetryEvent(event: Omit<TelemetryEvent, 'timestamp' | 'url'>): Promise<void> {
  try {
    const enabled = await isTelemetryEnabled();
    if (!enabled) return;
    
    const session = await getCurrentSession();
    
    const fullEvent: TelemetryEvent = {
      ...event,
      timestamp: Date.now(),
      url: window.location.href,
    };
    
    session.events.push(fullEvent);
    
    // Trim events if session gets too large
    if (session.events.length > MAX_EVENTS_PER_SESSION) {
      session.events.splice(0, session.events.length - MAX_EVENTS_PER_SESSION);
    }
    
    // Save updated session
    const result = await chrome.storage.local.get(TELEMETRY_STORAGE_KEY);
    const sessions: TelemetrySession[] = result[TELEMETRY_STORAGE_KEY] || [];
    
    // Update the current session
    const sessionIndex = sessions.findIndex(s => s.sessionId === session.sessionId);
    if (sessionIndex >= 0) {
      sessions[sessionIndex] = session;
    } else {
      sessions.push(session);
    }
    
    await chrome.storage.local.set({ [TELEMETRY_STORAGE_KEY]: sessions });
  } catch (error) {
    console.error('Failed to log telemetry event:', error);
  }
}

/**
 * Log platform detection result
 */
export async function logPlatformDetection(
  platform: string,
  confidence: number,
  signals: Record<string, boolean>
): Promise<void> {
  await logTelemetryEvent({
    eventType: 'detection',
    platform,
    confidence,
    selectorHits: signals,
    metadata: {
      hostname: window.location.hostname,
      pathname: window.location.pathname,
    },
  });
}

/**
 * Log extraction attempt result
 */
export async function logExtraction(
  platform: string,
  success: boolean,
  selectorHits: Record<string, boolean>,
  extractedFields?: string[]
): Promise<void> {
  await logTelemetryEvent({
    eventType: 'extraction',
    platform,
    selectorHits,
    metadata: {
      success,
      extractedFields: extractedFields || [],
      fieldCount: extractedFields?.length || 0,
    },
  });
}

/**
 * Log extraction failure with reason
 */
export async function logExtractionFailure(
  platform: string,
  reason: string,
  context?: Record<string, any>
): Promise<void> {
  await logTelemetryEvent({
    eventType: 'error',
    platform,
    failureReason: reason,
    metadata: context,
  });
}

/**
 * Log navigation event (for SPA tracking)
 */
export async function logNavigation(
  navigationType: 'initial' | 'pushstate' | 'popstate' | 'mutation',
  metadata?: Record<string, any>
): Promise<void> {
  await logTelemetryEvent({
    eventType: 'navigation',
    metadata: {
      navigationType,
      ...metadata,
    },
  });
}

/**
 * Retrieve all telemetry sessions (for debugging/inspection)
 */
export async function getTelemetrySessions(): Promise<TelemetrySession[]> {
  try {
    const result = await chrome.storage.local.get(TELEMETRY_STORAGE_KEY);
    return result[TELEMETRY_STORAGE_KEY] || [];
  } catch (error) {
    console.error('Failed to retrieve telemetry sessions:', error);
    return [];
  }
}

/**
 * Clear all telemetry data
 */
export async function clearTelemetry(): Promise<void> {
  try {
    await chrome.storage.local.remove(TELEMETRY_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear telemetry:', error);
  }
}

/**
 * Export telemetry sessions as JSON for manual analysis
 */
export async function exportTelemetry(): Promise<string> {
  const sessions = await getTelemetrySessions();
  return JSON.stringify(sessions, null, 2);
}

/**
 * Get telemetry summary statistics
 */
export async function getTelemetrySummary(): Promise<{
  totalSessions: number;
  totalEvents: number;
  platformsDetected: string[];
  errorRate: number;
  lastEventTime: number | null;
}> {
  const sessions = await getTelemetrySessions();
  const allEvents = sessions.flatMap(s => s.events);
  
  const platformsSet = new Set<string>();
  let errorCount = 0;
  
  allEvents.forEach(event => {
    if (event.platform) platformsSet.add(event.platform);
    if (event.eventType === 'error') errorCount++;
  });
  
  return {
    totalSessions: sessions.length,
    totalEvents: allEvents.length,
    platformsDetected: Array.from(platformsSet),
    errorRate: allEvents.length > 0 ? errorCount / allEvents.length : 0,
    lastEventTime: allEvents.length > 0 ? Math.max(...allEvents.map(e => e.timestamp)) : null,
  };
}
