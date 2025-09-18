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
  padding: 1rem;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.25rem;
  color: #212529;
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
  width: 40px;
  height: 20px;
  background-color: ${props => props.$isChecked ? '#4285f4' : '#ced4da'};
  border-radius: 20px;
  transition: background-color 0.3s;
  margin-left: 0.5rem;
  
  &::after {
    content: '';
    position: absolute;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background-color: white;
    top: 2px;
    left: ${props => props.$isChecked ? '22px' : '2px'};
    transition: left 0.3s;
  }
`;

const StatusBadge = styled.span<StatusBadgeProps>`
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: bold;
  margin-left: 0.5rem;
  background-color: ${props => props.$isOffline ? '#f8d7da' : '#d4edda'};
  color: ${props => props.$isOffline ? '#721c24' : '#155724'};
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