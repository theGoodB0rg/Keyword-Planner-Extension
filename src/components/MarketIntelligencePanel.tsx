import React from 'react';
import styled from 'styled-components';
import { MarketIntelligenceResult, CompetitorData, TrendData } from '../utils/marketIntelligence';

interface MarketIntelligencePanelProps {
  data: MarketIntelligenceResult | null;
  loading: boolean;
  onRefresh: () => void;
}

const Panel = styled.div`
  display: grid;
  gap: 1.25rem;
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
`;

const PanelTitle = styled.h3`
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--c-text, #0f172a);
`;

const RefreshButton = styled.button`
  background: linear-gradient(135deg, var(--c-accent, #2563eb), #3b82f6);
  color: #ffffff;
  border: none;
  border-radius: 12px;
  padding: 0.45rem 0.95rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 14px 30px -20px rgba(37, 99, 235, 0.6);
  transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 18px 42px -24px rgba(37, 99, 235, 0.7);
  }

  &:active {
    transform: translateY(0);
    filter: brightness(0.97);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    box-shadow: none;
  }
`;

const LoadingState = styled.div`
  padding: 1.5rem;
  text-align: center;
  font-size: 0.9rem;
  color: var(--c-text-dim, #64748b);
`;

const Section = styled.section`
  display: grid;
  gap: 0.75rem;
`;

const SectionTitle = styled.h4`
  margin: 0;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--c-text-dim, #64748b);
`;

const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
`;

const MetricCard = styled.div`
  border-radius: 12px;
  border: 1px solid var(--c-border, #e2e8f0);
  background: rgba(37, 99, 235, 0.05);
  padding: 0.85rem;
  text-align: center;
`;

const MetricValue = styled.div`
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--c-text, #0f172a);
`;

const MetricLabel = styled.div`
  margin-top: 0.25rem;
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  color: var(--c-text-dim, #64748b);
  text-transform: uppercase;
`;

const CompetitorList = styled.div`
  display: grid;
  gap: 0.75rem;
`;

const CompetitorCard = styled.div`
  border-radius: 12px;
  border: 1px solid rgba(59, 130, 246, 0.35);
  background: rgba(59, 130, 246, 0.08);
  padding: 0.85rem;
`;

const CompetitorTitle = styled.div`
  font-weight: 600;
  color: var(--c-text, #0f172a);
  margin-bottom: 0.45rem;
`;

const CompetitorDetails = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-size: 0.8rem;
  color: var(--c-text-dim, #64748b);
`;

const TrendList = styled.div`
  display: grid;
  gap: 0.6rem;
`;

const TrendItem = styled.div<{ direction: TrendData['trendDirection'] }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 10px;
  border: 1px solid var(--c-border, #e2e8f0);
  background: ${({ direction }) =>
    direction === 'up'
      ? 'rgba(34,197,94,0.12)'
      : direction === 'down'
        ? 'rgba(239,68,68,0.12)'
        : 'rgba(148,163,184,0.12)'};
  padding: 0.6rem 0.8rem;
  font-size: 0.85rem;
`;

const TrendKeyword = styled.span`
  font-weight: 600;
  color: var(--c-text, #0f172a);
`;

const TrendIndicator = styled.span<{ direction: TrendData['trendDirection'] }>`
  font-weight: 600;
  color: ${({ direction }) =>
    direction === 'up' ? '#047857' : direction === 'down' ? '#b91c1c' : '#475569'};
`;

const KeywordGapsList = styled.div`
  display: grid;
  gap: 0.6rem;
`;

const KeywordGapCategory = styled.div`
  border-radius: 10px;
  border: 1px dashed var(--c-border, #e2e8f0);
  padding: 0.75rem;
  background: rgba(15, 23, 42, 0.03);
`;

const KeywordGapTitle = styled.div`
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--c-text, #0f172a);
  margin-bottom: 0.35rem;
`;

const KeywordGapItems = styled.div`
  font-size: 0.8rem;
  color: var(--c-text-dim, #64748b);
`;

const RecommendationsList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.5rem;
`;

const RecommendationItem = styled.li`
  border-radius: 10px;
  background: rgba(37, 99, 235, 0.06);
  border: 1px solid rgba(37, 99, 235, 0.2);
  padding: 0.75rem;
  font-size: 0.85rem;
  color: var(--c-text, #0f172a);
`;

const EmptyStateMessage = styled.div`
  border-radius: 12px;
  border: 1px dashed var(--c-border, #e2e8f0);
  background: rgba(148, 163, 184, 0.08);
  padding: 1rem;
  text-align: center;
  color: var(--c-text-dim, #64748b);
`;

const MarketIntelligencePanel: React.FC<MarketIntelligencePanelProps> = ({ data, loading, onRefresh }) => {
  const renderTrendSymbol = (trend: TrendData['trendDirection']) => {
    if (trend === 'up') return '▲';
    if (trend === 'down') return '▼';
    return '▶';
  };

  if (loading && !data) {
    return (
      <Panel>
        <PanelHeader>
          <PanelTitle>Market Intelligence</PanelTitle>
          <RefreshButton onClick={onRefresh} disabled>
            Analyzing...
          </RefreshButton>
        </PanelHeader>
        <LoadingState>Collecting competitor signals...</LoadingState>
      </Panel>
    );
  }

  if (!data) {
    return (
      <Panel>
        <PanelHeader>
          <PanelTitle>Market Intelligence</PanelTitle>
          <RefreshButton onClick={onRefresh}>
            Analyze Market
          </RefreshButton>
        </PanelHeader>
        <EmptyStateMessage>
          Run a market analysis to uncover competitor positioning and trending keywords.
        </EmptyStateMessage>
      </Panel>
    );
  }

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Market Intelligence</PanelTitle>
        <RefreshButton onClick={onRefresh} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </RefreshButton>
      </PanelHeader>

      <Section>
        <SectionTitle>Market overview</SectionTitle>
        <MetricGrid>
          <MetricCard>
            <MetricValue>{data.marketInsights.competitionLevel.toUpperCase()}</MetricValue>
            <MetricLabel>Competition</MetricLabel>
          </MetricCard>
          <MetricCard>
            <MetricValue>{Math.round(data.marketInsights.marketSaturation)}%</MetricValue>
            <MetricLabel>Saturation</MetricLabel>
          </MetricCard>
          <MetricCard>
            <MetricValue>{data.competitors.length}</MetricValue>
            <MetricLabel>Competitors</MetricLabel>
          </MetricCard>
          <MetricCard>
            <MetricValue>{data.trends.length}</MetricValue>
            <MetricLabel>Tracked Keywords</MetricLabel>
          </MetricCard>
        </MetricGrid>
      </Section>

      <Section>
        <SectionTitle>Price positioning</SectionTitle>
        <MetricCard>
          <div style={{ fontWeight: 600 }}>Position: {data.pricePositioning.position.charAt(0).toUpperCase() + data.pricePositioning.position.slice(1)}</div>
          <div style={{ fontSize: '0.8rem', marginTop: '0.4rem', color: 'var(--c-text-dim, #64748b)' }}>
            Market average {`$${data.pricePositioning.competitorAverage.toFixed(2)}`} • Recommended {`$${data.pricePositioning.recommendedPriceRange.min.toFixed(2)} - $${data.pricePositioning.recommendedPriceRange.max.toFixed(2)}`}
          </div>
        </MetricCard>
      </Section>

      <Section>
        <SectionTitle>Top competitors</SectionTitle>
        <CompetitorList>
          {data.competitors.slice(0, 3).map((competitor: CompetitorData, index) => (
            <CompetitorCard key={index}>
              <CompetitorTitle>{competitor.title}</CompetitorTitle>
              <CompetitorDetails>
                <span>${competitor.price.toFixed(2)}</span>
                <span>Rating {competitor.rating.toFixed(1)} ({competitor.reviewCount.toLocaleString()} reviews)</span>
              </CompetitorDetails>
            </CompetitorCard>
          ))}
        </CompetitorList>
      </Section>

      <Section>
        <SectionTitle>Keyword trends</SectionTitle>
        <TrendList>
          {data.trends.slice(0, 5).map((trend: TrendData, index) => (
            <TrendItem key={index} direction={trend.trendDirection}>
              <TrendKeyword>{trend.keyword}</TrendKeyword>
              <TrendIndicator direction={trend.trendDirection}>
                {renderTrendSymbol(trend.trendDirection)} {trend.trendPercentage > 0 ? '+' : ''}{trend.trendPercentage.toFixed(1)}%
              </TrendIndicator>
            </TrendItem>
          ))}
        </TrendList>
      </Section>

      <Section>
        <SectionTitle>Keyword opportunities</SectionTitle>
        <KeywordGapsList>
          {data.keywordGaps.missingKeywords.length > 0 && (
            <KeywordGapCategory>
              <KeywordGapTitle>Missing keywords</KeywordGapTitle>
              <KeywordGapItems>{data.keywordGaps.missingKeywords.join(', ')}</KeywordGapItems>
            </KeywordGapCategory>
          )}
          {data.keywordGaps.opportunityKeywords.length > 0 && (
            <KeywordGapCategory>
              <KeywordGapTitle>New opportunities</KeywordGapTitle>
              <KeywordGapItems>{data.keywordGaps.opportunityKeywords.join(', ')}</KeywordGapItems>
            </KeywordGapCategory>
          )}
        </KeywordGapsList>
      </Section>

      <Section>
        <SectionTitle>AI recommendations</SectionTitle>
        <RecommendationsList>
          {data.marketInsights.recommendations.map((recommendation, index) => (
            <RecommendationItem key={index}>{recommendation}</RecommendationItem>
          ))}
        </RecommendationsList>
      </Section>
    </Panel>
  );
};

export default MarketIntelligencePanel;
