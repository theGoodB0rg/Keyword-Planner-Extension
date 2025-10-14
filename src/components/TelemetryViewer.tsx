/**
 * Telemetry Viewer Component
 * 
 * Developer tool for inspecting telemetry logs.
 * Add this to popup or sidebar when telemetry is enabled.
 */

import React, { useState, useEffect } from 'react';
import { 
  getTelemetrySessions, 
  getTelemetrySummary, 
  exportTelemetry, 
  clearTelemetry 
} from '../utils/telemetry';

interface TelemetryViewerProps {
  onClose?: () => void;
}

export const TelemetryViewer: React.FC<TelemetryViewerProps> = ({ onClose }) => {
  const [summary, setSummary] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  useEffect(() => {
    loadTelemetry();
  }, []);

  const loadTelemetry = async () => {
    setLoading(true);
    try {
      const [summaryData, sessionsData] = await Promise.all([
        getTelemetrySummary(),
        getTelemetrySessions()
      ]);
      setSummary(summaryData);
      setSessions(sessionsData);
    } catch (error) {
      console.error('Failed to load telemetry:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const json = await exportTelemetry();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `telemetry-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export telemetry:', error);
    }
  };

  const handleClear = async () => {
    if (confirm('Clear all telemetry data? This cannot be undone.')) {
      await clearTelemetry();
      await loadTelemetry();
    }
  };

  if (loading) {
    return <div style={styles.container}>Loading telemetry...</div>;
  }

  const selectedSessionData = sessions.find(s => s.sessionId === selectedSession);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>📊 Telemetry Viewer</h3>
        {onClose && (
          <button onClick={onClose} style={styles.closeButton}>✕</button>
        )}
      </div>

      {summary && (
        <div style={styles.summary}>
          <div style={styles.stat}>
            <strong>Sessions:</strong> {summary.totalSessions}
          </div>
          <div style={styles.stat}>
            <strong>Events:</strong> {summary.totalEvents}
          </div>
          <div style={styles.stat}>
            <strong>Error Rate:</strong> {(summary.errorRate * 100).toFixed(1)}%
          </div>
          <div style={styles.stat}>
            <strong>Platforms:</strong> {summary.platformsDetected.join(', ') || 'None'}
          </div>
        </div>
      )}

      <div style={styles.actions}>
        <button onClick={handleExport} style={styles.button}>
          Export JSON
        </button>
        <button onClick={handleClear} style={styles.buttonDanger}>
          Clear Data
        </button>
        <button onClick={loadTelemetry} style={styles.button}>
          Refresh
        </button>
      </div>

      <div style={styles.sessionList}>
        <h4>Sessions</h4>
        {sessions.length === 0 ? (
          <div style={styles.empty}>No telemetry data yet</div>
        ) : (
          sessions.map(session => (
            <div
              key={session.sessionId}
              style={{
                ...styles.sessionItem,
                ...(selectedSession === session.sessionId ? styles.sessionItemSelected : {})
              }}
              onClick={() => setSelectedSession(
                selectedSession === session.sessionId ? null : session.sessionId
              )}
            >
              <div style={styles.sessionHeader}>
                <strong>{new Date(session.startTime).toLocaleString()}</strong>
                <span style={styles.badge}>{session.events.length} events</span>
              </div>
              <div style={styles.sessionMeta}>
                ID: {session.sessionId.substring(0, 20)}...
              </div>
            </div>
          ))
        )}
      </div>

      {selectedSessionData && (
        <div style={styles.eventList}>
          <h4>Events in Session</h4>
          {selectedSessionData.events.map((event: any, idx: number) => (
            <div key={idx} style={styles.eventItem}>
              <div style={styles.eventHeader}>
                <span style={{
                  ...styles.eventType,
                  ...(event.eventType === 'error' ? styles.eventTypeError : {}),
                  ...(event.eventType === 'detection' ? styles.eventTypeDetection : {}),
                  ...(event.eventType === 'extraction' ? styles.eventTypeExtraction : {})
                }}>
                  {event.eventType}
                </span>
                <span style={styles.eventTime}>
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
              {event.platform && (
                <div style={styles.eventDetail}>
                  <strong>Platform:</strong> {event.platform}
                  {event.confidence && ` (${(event.confidence * 100).toFixed(0)}%)`}
                </div>
              )}
              {event.failureReason && (
                <div style={{ ...styles.eventDetail, color: '#d32f2f' }}>
                  <strong>Reason:</strong> {event.failureReason}
                </div>
              )}
              <div style={styles.eventUrl}>{event.url}</div>
              {event.selectorHits && Object.keys(event.selectorHits).length > 0 && (
                <details style={styles.details}>
                  <summary>Selector Hits</summary>
                  <pre style={styles.pre}>
                    {JSON.stringify(event.selectorHits, null, 2)}
                  </pre>
                </details>
              )}
              {event.metadata && Object.keys(event.metadata).length > 0 && (
                <details style={styles.details}>
                  <summary>Metadata</summary>
                  <pre style={styles.pre}>
                    {JSON.stringify(event.metadata, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '16px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '13px',
    maxHeight: '600px',
    overflowY: 'auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    borderBottom: '2px solid #e0e0e0',
    paddingBottom: '8px'
  },
  title: {
    margin: 0,
    fontSize: '16px'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '4px 8px'
  },
  summary: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    marginBottom: '16px',
    padding: '12px',
    background: '#f5f5f5',
    borderRadius: '4px'
  },
  stat: {
    fontSize: '12px'
  },
  actions: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px'
  },
  button: {
    padding: '6px 12px',
    fontSize: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    background: 'white',
    cursor: 'pointer'
  },
  buttonDanger: {
    padding: '6px 12px',
    fontSize: '12px',
    border: '1px solid #d32f2f',
    borderRadius: '4px',
    background: 'white',
    color: '#d32f2f',
    cursor: 'pointer'
  },
  sessionList: {
    marginBottom: '16px'
  },
  sessionItem: {
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  sessionItemSelected: {
    background: '#e3f2fd',
    borderColor: '#2196f3'
  },
  sessionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px'
  },
  sessionMeta: {
    fontSize: '11px',
    color: '#666'
  },
  badge: {
    background: '#2196f3',
    color: 'white',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px'
  },
  eventList: {
    marginTop: '16px'
  },
  eventItem: {
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    marginBottom: '8px',
    background: '#fafafa'
  },
  eventHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '4px'
  },
  eventType: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
    background: '#e0e0e0'
  },
  eventTypeError: {
    background: '#ffebee',
    color: '#c62828'
  },
  eventTypeDetection: {
    background: '#e8f5e9',
    color: '#2e7d32'
  },
  eventTypeExtraction: {
    background: '#e3f2fd',
    color: '#1565c0'
  },
  eventTime: {
    fontSize: '11px',
    color: '#666'
  },
  eventDetail: {
    fontSize: '12px',
    marginBottom: '4px'
  },
  eventUrl: {
    fontSize: '11px',
    color: '#666',
    wordBreak: 'break-all',
    marginTop: '4px'
  },
  details: {
    marginTop: '8px',
    fontSize: '11px'
  },
  pre: {
    background: '#fff',
    padding: '8px',
    borderRadius: '4px',
    overflow: 'auto',
    fontSize: '10px',
    margin: '4px 0 0 0'
  },
  empty: {
    padding: '16px',
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic'
  }
};
