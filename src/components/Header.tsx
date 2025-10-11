import React from 'react';
import styled from 'styled-components';

interface HeaderProps {
  isOfflineMode: boolean;
  onToggleOfflineMode: () => void;
}

interface ToggleSwitchProps {
  $isChecked: boolean;
}

interface StatusBadgeProps {
  $isOffline: boolean;
}

const HeaderContainer = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
  padding: 1.5rem clamp(1rem, 2vw, 2rem) 0.75rem;
  color: var(--c-text, #0f172a);
`;

const Title = styled.h1`
  margin: 0;
  font-size: clamp(1.35rem, 3vw, 1.6rem);
  font-weight: 700;
  color: var(--c-text, #0f172a);
`;

const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
`;

const ToggleLabel = styled.label`
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 0.875rem;
  margin-right: 0.5rem;
`;

const ToggleSwitch = styled.div<ToggleSwitchProps>`
  position: relative;
  width: 48px;
  height: 24px;
  background: ${props => props.$isChecked ? 'linear-gradient(135deg, var(--c-accent, #2563eb), #3b82f6)' : 'rgba(148, 163, 184, 0.5)'};
  border-radius: 999px;
  transition: background 0.25s ease;
  margin-left: 0.5rem;

  &::after {
    content: '';
    position: absolute;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background-color: #ffffff;
    top: 2px;
    left: ${props => props.$isChecked ? '26px' : '2px'};
    transition: left 0.25s ease;
    box-shadow: 0 4px 10px rgba(15, 23, 42, 0.15);
  }
`;

const StatusBadge = styled.span<StatusBadgeProps>`
  display: inline-block;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  margin-left: 0.75rem;
  background: ${props => props.$isOffline ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.18)'};
  color: ${props => props.$isOffline ? '#991b1b' : '#047857'};
  text-transform: uppercase;
`;

const Header: React.FC<HeaderProps> = ({ isOfflineMode, onToggleOfflineMode }) => {
  return (
    <HeaderContainer>
      <Title>AI Keyword Planner</Title>
      
      <ToggleContainer>
        <ToggleLabel>
          Offline Mode
          <ToggleSwitch $isChecked={isOfflineMode} onClick={onToggleOfflineMode} />
        </ToggleLabel>
        
        <StatusBadge $isOffline={isOfflineMode}>
          {isOfflineMode ? 'OFFLINE' : 'ONLINE'}
        </StatusBadge>
      </ToggleContainer>
    </HeaderContainer>
  );
};

export default Header; 