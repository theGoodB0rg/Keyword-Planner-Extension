// src/components/KeywordTable.tsx
import React, { useState, useEffect } from 'react';
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

type Marketplace = 'amazon.com' | 'amazon.co.uk' | 'amazon.ca';

const TableContainer = styled.div`
  margin: 1rem 0;
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  background-color: #fff;
  max-height: 350px;
  overflow-y: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  min-width: 600px;
`;

const TableHead = styled.thead`
  background-color: #f8f9fa;
  position: sticky;
  top: 0;
  z-index: 10;
`;

const TableRow = styled.tr`
  &:nth-child(even) { background-color: #f8f9fa; }
  tbody &:hover { background-color: #f0f0f0; }
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
  &:hover { background-color: #007bff; color: white; }
`;

const ExplanationRow = styled(TableRow)`
  background-color: #e9ecef !important;
  &:hover { background-color: #e0e0f0 !important; }
`;

const ExplanationCell = styled.td`
  padding: 0.75rem;
  font-size: 0.8rem;
  color: #333;
  border-bottom: 1px solid #d1d1d1;
  white-space: normal;
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
  &:hover { white-space: normal; overflow: visible; }
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

const DemandBar = styled.div`
  display: inline-block;
  height: 6px;
  width: 60px;
  background: #eee;
  border-radius: 3px;
  overflow: hidden;
  vertical-align: middle;
  margin-left: 6px;
`;

const DemandFill = styled.div<{ $pct: number }>`
  height: 100%;
  width: ${p => Math.min(100, Math.max(0, p.$pct))}%;
  background: ${p => p.$pct >= 66 ? '#16a34a' : p.$pct >= 33 ? '#f59e0b' : '#ef4444'};
`;

const DemandChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 0.7rem;
  margin-top: 4px;
`;

const RowActions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 6px;
  align-items: center;
`;

const ActionButton = styled.button`
  border: 1px solid #d1d5db;
  background: #ffffff;
  color: #374151;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s ease;
  &:hover { background: #f3f4f6; }
`;

const SnapshotInfo = styled.div`
  margin-top: 6px;
  font-size: 0.75rem;
  color: #374151;
`;

const MarketLabel = styled.label`
  margin-left: 8px;
  font-size: 0.75rem;
  color: #6b7280;
`;

const MarketContainer = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: 8px;
`;

const MarketSelectWrapper = styled.span`
  display: inline-block;
  select {
    border: 1px solid #d0d7de;
    border-radius: 4px;
    height: 24px;
    font-size: 0.75rem;
    background: #fff;
  }
`;

const LoadingOverlay = styled.div`padding: 2rem; text-align: center; color: #6c757d;`;
const ErrorMessage = styled.div`padding: 1rem; color: #721c24; background-color: #f8d7da; border-radius: 4px; margin-bottom: 1rem; text-align: center;`;
const EmptyMessage = styled.div`padding: 2rem; text-align: center; color: #6c757d;`;

const explanations: Record<string, string> = {
  keyword: 'Keyword: The specific search query or phrase users might type into a search engine. These are what you should target in your content to increase organic traffic.',
  searchVolume: 'Search Volume: Estimated average monthly search volume for this keyword. Higher numbers indicate more popularity and traffic potential. Focus on keywords with good volume relative to competition.',
  cpc: 'CPC (Cost Per Click): Estimated Cost Per Click in USD if running paid ads for this keyword. Higher values indicate higher commercial intent and potential revenue value.',
  difficulty: 'Difficulty (0-100): An estimate of how challenging it is to rank organically in search engines for this keyword. Lower numbers are easier to rank for and may produce faster results.',
  competition: 'Competition: Level of competition among advertisers (Low, Medium, High). Low competition keywords are typically easier to rank for and may cost less in paid campaigns.'
};

type ExplanationKey = keyof typeof explanations | null;

const KeywordTable: React.FC<KeywordTableProps> = ({ keywords, loading, error }) => {
  const [visibleExplanation, setVisibleExplanation] = useState<ExplanationKey>(null);
  const [market, setMarket] = useState<Marketplace>('amazon.com');
  const [demandMap, setDemandMap] = useState<Record<string, { score: number; loading: boolean }>>({});
  const [snapshotMap, setSnapshotMap] = useState<Record<string, { loading: boolean; data?: { sponsoredCount: number; totalConsidered: number; medianRating: number | null; medianReviews: number | null; priceMin: number | null; priceMax: number | null; } }>>({});

  const toggleExplanation = (key: ExplanationKey) => {
    setVisibleExplanation(prev => (prev === key ? null : key));
  };

  useEffect(() => {
    if (!keywords || keywords.length === 0) return;
    const first16 = keywords.slice(0, 16);
    first16.forEach(k => {
      if (demandMap[k.keyword]?.loading || demandMap[k.keyword]?.score != null) return;
      setDemandMap(prev => ({ ...prev, [k.keyword]: { score: prev[k.keyword]?.score ?? 0, loading: true } }));
      chrome.runtime.sendMessage({ action: 'getDemandScore', keyword: k.keyword, marketplace: market }, (resp) => {
        if (resp?.success && resp.result) {
          setDemandMap(prev => ({ ...prev, [k.keyword]: { score: resp.result.score ?? 0, loading: false } }));
        } else {
          setDemandMap(prev => ({ ...prev, [k.keyword]: { score: 0, loading: false } }));
        }
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keywords, market]);

  const runSnapshot = (kw: string) => {
    if (snapshotMap[kw]?.loading) return;
    setSnapshotMap(prev => ({ ...prev, [kw]: { ...(prev[kw]||{}), loading: true } }));
    chrome.runtime.sendMessage({ action: 'getCompetitorSnapshot', keyword: kw, marketplace: market }, (resp) => {
      if (resp?.success && resp.snapshot) {
        const { sponsoredCount, totalConsidered, medianRating, medianReviews, priceMin, priceMax } = resp.snapshot;
        setSnapshotMap(prev => ({ ...prev, [kw]: { loading: false, data: { sponsoredCount, totalConsidered, medianRating, medianReviews, priceMin, priceMax } } }));
      } else {
        setSnapshotMap(prev => ({ ...prev, [kw]: { loading: false } }));
      }
    });
  };

  if (loading) return <LoadingOverlay>Loading keywords...</LoadingOverlay>;
  if (error) return <ErrorMessage>{error}</ErrorMessage>;
  if (!keywords || keywords.length === 0) return <EmptyMessage>No keywords to display. Analyze a page to get started.</EmptyMessage>;

  const renderHeaderWithIcon = (key: keyof typeof explanations, label: string) => (
    <TableHeader>
      {label}
      <InfoIcon onClick={() => toggleExplanation(key)} title={`Explain "${label}"`}>?</InfoIcon>
      {key === 'keyword' && (
        <>
          <MarketContainer>
            <MarketLabel id="market-label" htmlFor="market-select">Marketplace:</MarketLabel>
            <MarketSelectWrapper>
              <select
                id="market-select"
                name="market-select"
                aria-label="Marketplace selector"
                aria-labelledby="market-label"
                title="Marketplace selector"
                value={market}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMarket(e.target.value as Marketplace)}
              >
                <option value="amazon.com">amazon.com</option>
                <option value="amazon.co.uk">amazon.co.uk</option>
                <option value="amazon.ca">amazon.ca</option>
              </select>
            </MarketSelectWrapper>
          </MarketContainer>
        </>
      )}
    </TableHeader>
  );

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
                <div>
                  <DemandChip title="Real demand from public suggest signals">
                    Demand
                    <DemandBar>
                      <DemandFill $pct={demandMap[item.keyword]?.score ?? 0} />
                    </DemandBar>
                    <span>{demandMap[item.keyword]?.loading ? '…' : `${demandMap[item.keyword]?.score ?? 0}`}</span>
                  </DemandChip>
                </div>
                <RowActions>
                  <ActionButton aria-label={`Get competitor snapshot for ${item.keyword}`} onClick={() => runSnapshot(item.keyword)}>
                    {snapshotMap[item.keyword]?.loading ? 'Snapshot…' : 'Snapshot'}
                  </ActionButton>
                  {snapshotMap[item.keyword]?.data && (
                    <SnapshotInfo>
                      Ads {snapshotMap[item.keyword]!.data!.sponsoredCount}/{snapshotMap[item.keyword]!.data!.totalConsidered} · Rating {snapshotMap[item.keyword]!.data!.medianRating ?? '—'} · Reviews {snapshotMap[item.keyword]!.data!.medianReviews ?? '—'} · ${snapshotMap[item.keyword]!.data!.priceMin ?? '—'}–${snapshotMap[item.keyword]!.data!.priceMax ?? '—'}
                    </SnapshotInfo>
                  )}
                </RowActions>
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
