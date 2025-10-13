// src/components/ConfidenceBadge.tsx
import React from 'react';
import styled from 'styled-components';
import { ConfidenceLevel, getConfidenceDisplay } from '../utils/confidence';
import { Tooltip } from './Tooltip';

interface ConfidenceBadgeProps {
  score: number;
  level: ConfidenceLevel;
  explanation?: string;
  showPercentage?: boolean;
  showStars?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const BadgeContainer = styled.span<{ $level: ConfidenceLevel; $size: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: ${p => p.$size === 'small' ? '0.1rem 0.35rem' : p.$size === 'large' ? '0.3rem 0.6rem' : '0.15rem 0.45rem'};
  border-radius: 999px;
  font-size: ${p => p.$size === 'small' ? '0.65rem' : p.$size === 'large' ? '0.8rem' : '0.7rem'};
  font-weight: 600;
  background: ${p => {
    const display = getConfidenceDisplay(p.$level);
    return `${display.color}15`;
  }};
  border: 1px solid ${p => {
    const display = getConfidenceDisplay(p.$level);
    return `${display.color}40`;
  }};
  color: ${p => {
    const display = getConfidenceDisplay(p.$level);
    return display.color;
  }};
  white-space: nowrap;
`;

const StarContainer = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 1px;
  letter-spacing: -1px;
`;

const Star = styled.span<{ $filled: boolean }>`
  opacity: ${p => p.$filled ? 1 : 0.3};
  font-size: 0.85em;
`;

const PercentageText = styled.span``;

const TooltipHeader = styled.div`
  margin-bottom: 0.25rem;
`;

const TooltipExplanation = styled.div`
  font-size: 0.85em;
  opacity: 0.9;
`;

const TooltipFooter = styled.div`
  margin-top: 0.5rem;
  font-size: 0.8em;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  padding-top: 0.4rem;
`;

const Percentage = styled.span`
  font-variant-numeric: tabular-nums;
  font-weight: 700;
`;

const Icon = styled.span`
  font-size: 0.9em;
`;

const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  score,
  level,
  explanation,
  showPercentage = true,
  showStars = true,
  size = 'small'
}) => {
  const display = getConfidenceDisplay(level);
  
  const renderStars = () => {
    if (!showStars) return null;
    
    return (
      <StarContainer>
        {[1, 2, 3].map(i => (
          <Star key={i} $filled={i <= display.stars}>⭐</Star>
        ))}
      </StarContainer>
    );
  };
  
  const tooltipContent = (
    <div>
      <TooltipHeader>
        <strong>{display.label}</strong> ({score}%)
      </TooltipHeader>
      {explanation && (
        <TooltipExplanation>
          {explanation}
        </TooltipExplanation>
      )}
      <TooltipFooter>
        <div><strong>Score Ranges:</strong></div>
        <div>• 70-100%: High confidence ✓</div>
        <div>• 40-69%: Medium confidence ◐</div>
        <div>• 0-39%: Low confidence !</div>
      </TooltipFooter>
    </div>
  );
  
  return (
    <Tooltip content={tooltipContent} position="top" maxWidth="260px">
      <BadgeContainer $level={level} $size={size}>
        {showStars && renderStars()}
        {showPercentage && <Percentage>{score}%</Percentage>}
        {!showPercentage && !showStars && <Icon>{display.icon}</Icon>}
      </BadgeContainer>
    </Tooltip>
  );
};

export default ConfidenceBadge;
