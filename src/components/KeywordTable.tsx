// src/components/KeywordTable.tsx
import React, { useState } from 'react';
import styled from 'styled-components';
import { KeywordData } from '../utils/types';

interface KeywordTableProps {
  keywords: KeywordData[];
  loading: boolean;
  error: string | null;
}

interface CompetitionBadgeProps {
  $competition: 'low' | 'medium' | 'high';
}

const TableContainer = styled.div`
  margin: 1rem 0;
  width: 100%;
  overflow-x: auto; /* This enables horizontal scrolling */
  -webkit-overflow-scrolling: touch; /* Smooth scrolling on touch devices */
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  background-color: #fff;
  max-height: 350px; /* Set max height to prevent it from taking too much space */
  overflow-y: auto; /* Allow vertical scrolling if many keywords */
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  min-width: 600px; /* Force table to be at least this wide to encourage scrolling */
`;

const TableHead = styled.thead`
  background-color: #f8f9fa;
  position: sticky;
  top: 0;
  z-index: 10;
`;

const TableRow = styled.tr`
  &:nth-child(even) {
    background-color: #f8f9fa;
  }
  
  tbody &:hover {
    background-color: #f0f0f0;
  }
`;

const TableHeader = styled.th`
  padding: 0.75rem;
  text-align: left;
  border-bottom: 2px solid #e9ecef;
  color: #495057;
  white-space: nowrap;
  position: relative; 
`;

const InfoIcon = styled.span`
  cursor: pointer;
  margin-left: 4px;
  font-weight: bold;
  color: #007bff;
  display: inline-block;
  border: 1px solid #007bff;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  line-height: 14px; 
  text-align: center;
  font-size: 10px;

  &:hover {
    background-color: #007bff;
    color: white;
  }
`;

const ExplanationRow = styled(TableRow)`
  background-color: #e9ecef !important; 
  &:hover {
    background-color: #e0e0f0 !important; /* Slightly different hover for explanation */
  }
`;

const ExplanationCell = styled.td`
  padding: 0.75rem;
  font-size: 0.8rem;
  color: #333;
  border-bottom: 1px solid #d1d1d1;
  white-space: normal; /* Allow explanation text to wrap */
`;


const TableCell = styled.td`
  padding: 0.75rem;
  border-bottom: 1px solid #e9ecef;
  vertical-align: top;
`;

const KeywordText = styled.span`
  font-weight: 500;
  display: block; 
  max-width: 250px; 
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  
  &:hover {
    white-space: normal;
    overflow: visible;
  }
`;

const CompetitionBadge = styled.span<CompetitionBadgeProps>`
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: bold;
  text-transform: uppercase;
  white-space: nowrap;
  
  ${({ $competition }) => {
    switch ($competition) {
      case 'low': return 'background-color: #d4edda; color: #155724;';
      case 'medium': return 'background-color: #fff3cd; color: #856404;';
      case 'high': return 'background-color: #f8d7da; color: #721c24;';
      default: return '';
    }
  }}
`;

const LoadingOverlay = styled.div`padding: 2rem; text-align: center; color: #6c757d;`;
const ErrorMessage = styled.div`padding: 1rem; color: #721c24; background-color: #f8d7da; border-radius: 4px; margin-bottom: 1rem; text-align: center;`;
const EmptyMessage = styled.div`padding: 2rem; text-align: center; color: #6c757d;`;

const explanations: Record<string, string> = {
  keyword: "Keyword: The specific search query or phrase users might type into a search engine. These are what you should target in your content to increase organic traffic.",
  searchVolume: "Search Volume: Estimated average monthly search volume for this keyword. Higher numbers indicate more popularity and traffic potential. Focus on keywords with good volume relative to competition.",
  cpc: "CPC (Cost Per Click): Estimated Cost Per Click in USD if running paid ads for this keyword. Higher values indicate higher commercial intent and potential revenue value.",
  difficulty: "Difficulty (0-100): An estimate of how challenging it is to rank organically in search engines for this keyword. Lower numbers are easier to rank for and may produce faster results.",
  competition: "Competition: Level of competition among advertisers (Low, Medium, High). Low competition keywords are typically easier to rank for and may cost less in paid campaigns."
};

type ExplanationKey = keyof typeof explanations | null;

const KeywordTable: React.FC<KeywordTableProps> = ({ keywords, loading, error }) => {
  const [visibleExplanation, setVisibleExplanation] = useState<ExplanationKey>(null);

  const toggleExplanation = (key: ExplanationKey) => {
    setVisibleExplanation(prev => (prev === key ? null : key));
  };

  if (loading) return <LoadingOverlay>Loading keywords...</LoadingOverlay>;
  if (error) return <ErrorMessage>{error}</ErrorMessage>;
  if (!keywords || keywords.length === 0) return <EmptyMessage>No keywords to display. Analyze a page to get started.</EmptyMessage>;
  
  const renderHeaderWithIcon = (key: keyof typeof explanations, label: string) => (
    <TableHeader>
      {label}
      <InfoIcon onClick={() => toggleExplanation(key)} title={`Explain "${label}"`}>?</InfoIcon>
    </TableHeader>
  );

  // Sort keywords by search volume (highest first)
  const sortedKeywords = [...keywords].sort((a, b) => b.searchVolume - a.searchVolume);

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            {renderHeaderWithIcon('keyword', 'Keyword')}
            {renderHeaderWithIcon('searchVolume', 'Search Volume')}
            {renderHeaderWithIcon('cpc', 'CPC')}
            {renderHeaderWithIcon('difficulty', 'Difficulty')}
            {renderHeaderWithIcon('competition', 'Competition')}
          </TableRow>
          {visibleExplanation && (
            <ExplanationRow>
              <ExplanationCell colSpan={5}>
                {explanations[visibleExplanation]}
              </ExplanationCell>
            </ExplanationRow>
          )}
        </TableHead>
        <tbody>
          {sortedKeywords.map((item, index) => (
            <TableRow key={index}>
              <TableCell title={item.keyword}>
                <KeywordText>{item.keyword}</KeywordText>
              </TableCell>
              <TableCell>{item.searchVolume.toLocaleString()}</TableCell>
              <TableCell>${item.cpc.toFixed(2)}</TableCell>
              <TableCell>{item.keywordDifficulty}/100</TableCell>
              <TableCell>
                <CompetitionBadge $competition={item.competition}>
                  {item.competition}
                </CompetitionBadge>
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    </TableContainer>
  );
};

export default KeywordTable;