// src/components/Tooltip.tsx
import React, { useState } from 'react';
import styled from 'styled-components';

interface TooltipProps {
  content: string | React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  maxWidth?: string;
}

const TooltipWrapper = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
`;

const TooltipTrigger = styled.span`
  cursor: help;
  display: inline-flex;
  align-items: center;
`;

const TooltipContent = styled.div<{ $position: string; $visible: boolean; $maxWidth: string }>`
  position: absolute;
  z-index: 1000;
  background: #1e293b;
  color: #f8fafc;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  line-height: 1.4;
  white-space: normal;
  max-width: ${p => p.$maxWidth};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  pointer-events: none;
  opacity: ${p => p.$visible ? 1 : 0};
  visibility: ${p => p.$visible ? 'visible' : 'hidden'};
  transition: opacity 0.2s ease, visibility 0.2s ease;
  
  ${p => {
    switch (p.$position) {
      case 'top':
        return `
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-bottom: 8px;
        `;
      case 'bottom':
        return `
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-top: 8px;
        `;
      case 'left':
        return `
          right: 100%;
          top: 50%;
          transform: translateY(-50%);
          margin-right: 8px;
        `;
      case 'right':
        return `
          left: 100%;
          top: 50%;
          transform: translateY(-50%);
          margin-left: 8px;
        `;
      default:
        return `
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-bottom: 8px;
        `;
    }
  }}

  &::after {
    content: '';
    position: absolute;
    border: 5px solid transparent;
    
    ${p => {
      switch (p.$position) {
        case 'top':
          return `
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            border-top-color: #1e293b;
          `;
        case 'bottom':
          return `
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            border-bottom-color: #1e293b;
          `;
        case 'left':
          return `
            left: 100%;
            top: 50%;
            transform: translateY(-50%);
            border-left-color: #1e293b;
          `;
        case 'right':
          return `
            right: 100%;
            top: 50%;
            transform: translateY(-50%);
            border-right-color: #1e293b;
          `;
        default:
          return `
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            border-top-color: #1e293b;
          `;
      }
    }}
  }
`;

const InfoIconStyled = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: rgba(37, 99, 235, 0.12);
  color: #2563eb;
  font-size: 0.7rem;
  font-weight: 700;
  margin-left: 4px;
  
  &:hover {
    background: rgba(37, 99, 235, 0.2);
  }
`;

export const Tooltip: React.FC<TooltipProps> = ({ 
  content, 
  children, 
  position = 'top',
  maxWidth = '220px'
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <TooltipWrapper
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      <TooltipTrigger>{children}</TooltipTrigger>
      <TooltipContent $position={position} $visible={visible} $maxWidth={maxWidth}>
        {content}
      </TooltipContent>
    </TooltipWrapper>
  );
};

export const InfoIcon: React.FC<{ tooltip: string | React.ReactNode; position?: 'top' | 'bottom' | 'left' | 'right' }> = ({ 
  tooltip, 
  position = 'top' 
}) => {
  return (
    <Tooltip content={tooltip} position={position}>
      <InfoIconStyled>?</InfoIconStyled>
    </Tooltip>
  );
};

export default Tooltip;
