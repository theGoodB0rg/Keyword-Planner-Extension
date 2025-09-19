import React from 'react';
import styled from 'styled-components';
import { MarketIntelligenceResult, CompetitorData, TrendData } from '../utils/marketIntelligence';

interface MarketIntelligencePanelProps {
  data: MarketIntelligenceResult | null;
  loading: boolean;
  onRefresh: () => void;
}

const Panel = styled.div`
  margin-top: 1.5rem;
  padding: 1rem;
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
`;

const PanelHeader = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #f8f9fa;
`;

const PanelTitle = styled.h3`
  font-size: 1.1rem;
  color: #212529;
  margin: 0;
  font-weight: 600;
`;

const RefreshButton = styled.button`
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover:not(:disabled) {
    background: #0056b3;
  }

  &:disabled {
    background: #6c757d;
    cursor: not-allowed;
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  color: #6c757d;
  font-size: 0.875rem;
`;

const Section = styled.div`
  margin-bottom: 1.5rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h4`
  font-size: 0.95rem;
  color: #495057;
  margin: 0 0 0.75rem 0;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

const MetricCard = styled.div`
  background: #f8f9fa;
  padding: 0.75rem;
  border-radius: 4px;
  text-align: center;
`;

const MetricValue = styled.div`
  font-size: 1.25rem;
  font-weight: bold;
  color: #212529;
  margin-bottom: 0.25rem;
`;

const MetricLabel = styled.div`
  font-size: 0.75rem;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const CompetitorList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const CompetitorCard = styled.div`
  background: #f8f9fa;
  padding: 0.75rem;
  border-radius: 4px;
  border-left: 3px solid #007bff;
`;

const CompetitorTitle = styled.div`
  font-weight: 600;
  font-size: 0.875rem;
  color: #212529;
  margin-bottom: 0.25rem;
`;

const CompetitorDetails = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  font-size: 0.75rem;
  color: #6c757d;
`;

const TrendList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const TrendItem = styled.div<{ direction: 'up' | 'down' | 'stable' }>`
  display: flex;
  justify-content: between;
  align-items: center;
  padding: 0.5rem;
  background: #f8f9fa;
  border-radius: 4px;
  border-left: 3px solid ${props => 
    props.direction === 'up' ? '#28a745' : 
    props.direction === 'down' ? '#dc3545' : 
    '#6c757d'
  };
`;

const TrendKeyword = styled.span`
  font-size: 0.875rem;
  color: #212529;
  font-weight: 500;
`;

const TrendIndicator = styled.span<{ direction: 'up' | 'down' | 'stable' }>`
  font-size: 0.75rem;
  color: ${props => 
    props.direction === 'up' ? '#28a745' : 
    props.direction === 'down' ? '#dc3545' : 
    '#6c757d'
  };
  font-weight: 600;
`;

const RecommendationsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const RecommendationItem = styled.div`
  padding: 0.5rem;
  background: #e8f5e8;
  border-radius: 4px;
  font-size: 0.875rem;
  color: #155724;
  border-left: 3px solid #28a745;
`;

const KeywordGapsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const KeywordGapCategory = styled.div`
  padding: 0.5rem;
  background: #fff3cd;
  border-radius: 4px;
  border-left: 3px solid #ffc107;
`;

const KeywordGapTitle = styled.div`
  font-weight: 600;
  font-size: 0.875rem;
  color: #856404;
  margin-bottom: 0.25rem;
`;

const KeywordGapItems = styled.div`
  font-size: 0.75rem;
  color: #856404;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: #6c757d;
`;

const PricePositioningCard = styled.div<{ position: 'low' | 'average' | 'high' }>`
  background: ${props => 
    props.position === 'low' ? '#d4edda' : 
    props.position === 'high' ? '#f8d7da' : 
    '#d1ecf1'
  };
  border: 1px solid ${props => 
    props.position === 'low' ? '#c3e6cb' : 
    props.position === 'high' ? '#f5c6cb' : 
    '#b8daff'
  };
  color: ${props => 
    props.position === 'low' ? '#155724' : 
    props.position === 'high' ? '#721c24' : 
    '#0c5460'
  };
  padding: 0.75rem;
  border-radius: 4px;
  font-size: 0.875rem;
`;

const MarketIntelligencePanel: React.FC<MarketIntelligencePanelProps> = ({
  data,
  loading,
  onRefresh
}) => {
  if (loading) {
    return (
      <Panel>
        <PanelHeader>
          <PanelTitle>🔍 Market Intelligence</PanelTitle>
        </PanelHeader>
        <LoadingSpinner>
          Analyzing market data and competitors...
        </LoadingSpinner>
      </Panel>
    );
  }

  if (!data) {
    return (
      <Panel>
        <PanelHeader>
          <PanelTitle>🔍 Market Intelligence</PanelTitle>
          <RefreshButton onClick={onRefresh}>
            Analyze Market
          </RefreshButton>
        </PanelHeader>
        <EmptyState>
          Click "Analyze Market" to get competitor insights and trend data.
        </EmptyState>
      </Panel>
    );
  }

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>🔍 Market Intelligence</PanelTitle>
        <RefreshButton onClick={onRefresh} disabled={loading}>
          Refresh
        </RefreshButton>
      </PanelHeader>

      {/* Market Overview */}
      <Section>
        <SectionTitle>Market Overview</SectionTitle>
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

      {/* Price Positioning */}
      <Section>
        <SectionTitle>Price Positioning</SectionTitle>
        <PricePositioningCard position={data.pricePositioning.position}>
          <strong>Position:</strong> {data.pricePositioning.position.charAt(0).toUpperCase() + data.pricePositioning.position.slice(1)}
          <br />
          <strong>Market Average:</strong> ${data.pricePositioning.competitorAverage.toFixed(2)}
          <br />
          <strong>Recommended Range:</strong> ${data.pricePositioning.recommendedPriceRange.min.toFixed(2)} - ${data.pricePositioning.recommendedPriceRange.max.toFixed(2)}
        </PricePositioningCard>
      </Section>

      {/* Top Competitors */}
      <Section>
        <SectionTitle>Top Competitors</SectionTitle>
        <CompetitorList>
          {data.competitors.slice(0, 3).map((competitor, index) => (
            <CompetitorCard key={index}>
              <CompetitorTitle>{competitor.title}</CompetitorTitle>
              <CompetitorDetails>
                <span>${competitor.price.toFixed(2)}</span>
                <span>★ {competitor.rating.toFixed(1)} ({competitor.reviewCount.toLocaleString()} reviews)</span>
              </CompetitorDetails>
            </CompetitorCard>
          ))}
        </CompetitorList>
      </Section>

      {/* Keyword Trends */}
      <Section>
        <SectionTitle>Keyword Trends</SectionTitle>
        <TrendList>
          {data.trends.slice(0, 5).map((trend, index) => (
            <TrendItem key={index} direction={trend.trendDirection}>
              <TrendKeyword>{trend.keyword}</TrendKeyword>
              <TrendIndicator direction={trend.trendDirection}>
                {trend.trendDirection === 'up' ? '↗' : trend.trendDirection === 'down' ? '↘' : '→'} 
                {trend.trendPercentage > 0 ? '+' : ''}{trend.trendPercentage.toFixed(1)}%
              </TrendIndicator>
            </TrendItem>
          ))}
        </TrendList>
      </Section>

      {/* Keyword Gaps */}
      <Section>
        <SectionTitle>Keyword Opportunities</SectionTitle>
        <KeywordGapsList>
          {data.keywordGaps.missingKeywords.length > 0 && (
            <KeywordGapCategory>
              <KeywordGapTitle>Missing Keywords</KeywordGapTitle>
              <KeywordGapItems>{data.keywordGaps.missingKeywords.join(', ')}</KeywordGapItems>
            </KeywordGapCategory>
          )}
          {data.keywordGaps.opportunityKeywords.length > 0 && (
            <KeywordGapCategory>
              <KeywordGapTitle>New Opportunities</KeywordGapTitle>
              <KeywordGapItems>{data.keywordGaps.opportunityKeywords.join(', ')}</KeywordGapItems>
            </KeywordGapCategory>
          )}
        </KeywordGapsList>
      </Section>

      {/* Recommendations */}
      <Section>
        <SectionTitle>AI Recommendations</SectionTitle>
        <RecommendationsList>
          {data.marketInsights.recommendations.map((recommendation, index) => (
            <RecommendationItem key={index}>
              {recommendation}
            </RecommendationItem>
          ))}
        </RecommendationsList>
      </Section>
    </Panel>
  );
};

export default MarketIntelligencePanel;