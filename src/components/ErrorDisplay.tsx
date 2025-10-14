// src/components/ErrorDisplay.tsx
import React, { useState } from 'react';
import styled from 'styled-components';
import { StructuredError, getErrorSuggestions } from '../utils/errorMessages';

interface ErrorDisplayProps {
  error: StructuredError;
  onRetry?: () => void;
  onDismiss?: () => void;
  onCustomAction?: (actionType: string) => void;
}

const ErrorContainer = styled.div<{ $severity: 'error' | 'warning' | 'info' }>`
  background: ${p => {
    switch (p.$severity) {
      case 'error': return '#fee2e2';
      case 'warning': return '#fef3c7';
      case 'info': return '#dbeafe';
      default: return '#f3f4f6';
    }
  }};
  border: 1px solid ${p => {
    switch (p.$severity) {
      case 'error': return '#fecaca';
      case 'warning': return '#fde68a';
      case 'info': return '#bfdbfe';
      default: return '#e5e7eb';
    }
  }};
  border-radius: 8px;
  padding: 1rem;
  margin: 0.75rem 0;
`;

const ErrorHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
`;

const ErrorIcon = styled.span<{ $severity: 'error' | 'warning' | 'info' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${p => {
    switch (p.$severity) {
      case 'error': return '#fca5a5';
      case 'warning': return '#fcd34d';
      case 'info': return '#93c5fd';
      default: return '#d1d5db';
    }
  }};
  color: ${p => {
    switch (p.$severity) {
      case 'error': return '#7f1d1d';
      case 'warning': return '#78350f';
      case 'info': return '#1e3a8a';
      default: return '#374151';
    }
  }};
  font-weight: 700;
  font-size: 0.875rem;
`;

const ErrorContent = styled.div`
  flex: 1;
`;

const ErrorTitle = styled.h4<{ $severity: 'error' | 'warning' | 'info' }>`
  margin: 0 0 0.25rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: ${p => {
    switch (p.$severity) {
      case 'error': return '#991b1b';
      case 'warning': return '#92400e';
      case 'info': return '#1e40af';
      default: return '#1f2937';
    }
  }};
`;

const ErrorMessage = styled.p`
  margin: 0 0 0.75rem;
  font-size: 0.8rem;
  line-height: 1.4;
  color: #374151;
`;

const ErrorDetails = styled.details`
  margin: 0.5rem 0;
  font-size: 0.75rem;
  color: #6b7280;
`;

const ErrorSummary = styled.summary`
  cursor: pointer;
  font-weight: 600;
  padding: 0.25rem 0;
  user-select: none;
  
  &:hover {
    color: #374151;
  }
`;

const ErrorDetailsPre = styled.pre`
  margin: 0.5rem 0 0;
  padding: 0.5rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 0.7rem;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
`;

const SuggestionsList = styled.ul`
  margin: 0.5rem 0;
  padding-left: 1.25rem;
  font-size: 0.75rem;
  line-height: 1.5;
  color: #4b5563;
`;

const SuggestionItem = styled.li`
  margin: 0.25rem 0;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  flex-wrap: wrap;
`;

const ActionButton = styled.button<{ $primary?: boolean }>`
  padding: 0.4rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 4px;
  border: 1px solid ${p => p.$primary ? '#2563eb' : '#d1d5db'};
  background: ${p => p.$primary ? '#2563eb' : '#ffffff'};
  color: ${p => p.$primary ? '#ffffff' : '#374151'};
  cursor: pointer;
  transition: all 0.15s ease;
  
  &:hover {
    background: ${p => p.$primary ? '#1d4ed8' : '#f9fafb'};
    border-color: ${p => p.$primary ? '#1d4ed8' : '#9ca3af'};
  }
  
  &:focus-visible {
    outline: 2px solid rgba(37, 99, 235, 0.4);
    outline-offset: 2px;
  }
`;

const DismissButton = styled.button`
  background: transparent;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 0.25rem;
  margin-left: auto;
  
  &:hover {
    color: #374151;
  }
`;

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ 
  error, 
  onRetry, 
  onDismiss,
  onCustomAction 
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const handleAction = (actionType: string) => {
    switch (actionType) {
      case 'retry':
        onRetry?.();
        break;
      case 'report':
        // Copy error details to clipboard for reporting
        const reportData = `Error Report:\nCode: ${error.code}\nTitle: ${error.title}\nMessage: ${error.message}\nDetails: ${error.details || 'None'}`;
        navigator.clipboard.writeText(reportData).then(() => {
          alert('Error details copied to clipboard. Please email them to support.');
        });
        break;
      default:
        onCustomAction?.(actionType);
    }
  };
  
  const iconSymbol = error.severity === 'error' ? '✕' : error.severity === 'warning' ? '⚠' : 'ℹ';
  
  return (
    <ErrorContainer $severity={error.severity} role="alert">
      <ErrorHeader>
        <ErrorIcon $severity={error.severity}>{iconSymbol}</ErrorIcon>
        <ErrorContent>
          <ErrorTitle $severity={error.severity}>{error.title}</ErrorTitle>
          <ErrorMessage>{error.message}</ErrorMessage>
          
          {error.actionable && (
            <div>
              <ActionButton 
                onClick={() => setShowSuggestions(!showSuggestions)}
                style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
              >
                {showSuggestions ? 'Hide' : 'Show'} Suggestions
              </ActionButton>
            </div>
          )}
          
          {showSuggestions && error.actionable && (
            <SuggestionsList>
              {getErrorSuggestions(error.code ?? 'UNKNOWN_ERROR').map((suggestion, idx) => (
                <SuggestionItem key={idx}>{suggestion}</SuggestionItem>
              ))}
            </SuggestionsList>
          )}
          
          {error.details && (
            <ErrorDetails>
              <ErrorSummary>Technical Details</ErrorSummary>
              <ErrorDetailsPre>{error.details}</ErrorDetailsPre>
            </ErrorDetails>
          )}
          
          {error.actions && error.actions.length > 0 && (
            <ActionButtons>
              {error.actions.map((action, idx) => (
                <ActionButton
                  key={idx}
                  $primary={idx === 0}
                  onClick={() => handleAction(action.action)}
                >
                  {action.label}
                </ActionButton>
              ))}
            </ActionButtons>
          )}
        </ErrorContent>
        {onDismiss && (
          <DismissButton onClick={onDismiss} title="Dismiss">
            ✕
          </DismissButton>
        )}
      </ErrorHeader>
    </ErrorContainer>
  );
};

export default ErrorDisplay;
