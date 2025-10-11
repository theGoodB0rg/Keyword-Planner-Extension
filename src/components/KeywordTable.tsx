// src/components/KeywordTable.tsx
import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { KeywordData } from '../utils/types';

interface KeywordTableProps {
  keywords: KeywordData[];
  loading: boolean;
  error: string | null;
  onCopyKeyword?: (keyword: KeywordData) => void;
}

interface CompetitionBadgeProps {
  $competition: 'low' | 'medium' | 'high';
}

type Marketplace = 'amazon.com' | 'amazon.co.uk' | 'amazon.ca';
type ExplanationKey = keyof typeof explanations | null;

type SnapshotData = {
  sponsoredCount: number;
  totalConsidered: number;
  medianRating: number | null;
  medianReviews: number | null;
  priceMin: number | null;
  priceMax: number | null;
  marketplace: string;
};

const snapshotLegendItems = [
  {
    key: 'ads',
    title: 'Ad saturation',
    detail: 'Share of sponsored listings on page one relative to organic results.',
  },
  {
    key: 'reviews',
    title: 'Median reviews',
    detail: 'Median review count for the top results to gauge social proof strength.',
  },
  {
    key: 'price',
    title: 'Price range',
    detail: 'Lowest and highest observed pricing to understand positioning room.',
  },
] as const;

const shimmer = keyframes`
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
`;

const TableContainer = styled.div`
  margin: 0 0 1rem;
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border-radius: 16px;
  border: 1px solid var(--c-border, #e2e8f0);
  background: var(--c-surface, #ffffff);
  box-shadow: 0 16px 40px -32px rgba(15, 23, 42, 0.4);
  max-height: 360px;
  overflow-y: auto;
`;

const LegendBanner = styled.section`
  margin: 1rem 0 0.5rem;
  border: 1px solid var(--c-border, #e2e8f0);
  background: var(--c-surface, #ffffff);
  border-radius: 16px;
  box-shadow: 0 12px 30px -28px rgba(15, 23, 42, 0.4);
  overflow: hidden;
`;

const LegendHeader = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.75rem 1rem;
  background: transparent;
  border: none;
  color: var(--c-text, #0f172a);
  font-weight: 600;
  font-size: 0.85rem;
  text-align: left;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    background: var(--c-bg-alt, #f8fafc);
  }

  &:focus-visible {
    outline: 2px solid rgba(37, 99, 235, 0.35);
    outline-offset: -2px;
  }
`;

const LegendIconWrapper = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 24px;
  border-radius: 8px;
  background: rgba(37, 99, 235, 0.12);
  color: var(--c-accent, #2563eb);
`;

const LegendTitle = styled.span`
  font-size: 0.85rem;
  font-weight: 600;
`;

const LegendChevron = styled.span<{ $open: boolean }>`
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
  transform: rotate(${({ $open }) => ($open ? 90 : 0)}deg);
  color: var(--c-text-dim, #64748b);
`;

const LegendContent = styled.div`
  padding: 0.75rem 1rem 0.9rem;
  border-top: 1px solid var(--c-border, #e2e8f0);
  background: var(--c-bg-alt, #f8fafc);
  display: grid;
  gap: 0.65rem;
`;

const LegendDescription = styled.p`
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.4;
  color: var(--c-text-dim, #64748b);
`;

const LegendSwatchRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-size: 0.72rem;
  color: var(--c-text-dim, #64748b);
`;

const LegendSwatchItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
`;

const LegendSwatch = styled.span<{ $tone: 'base' | 'warn' | 'alert' }>`
  width: 32px;
  height: 6px;
  border-radius: 999px;
  background: ${({ $tone }) => {
    switch ($tone) {
      case 'warn':
        return '#f59e0b';
      case 'alert':
        return '#ef4444';
      default:
        return '#2563eb';
    }
  }};
  flex-shrink: 0;
`;

const LegendList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.5rem;
`;

const LegendItem = styled.li`
  display: grid;
  gap: 0.2rem;
`;

const LegendItemTitle = styled.span`
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--c-text, #0f172a);
`;

const LegendItemDetail = styled.span`
  font-size: 0.75rem;
  line-height: 1.35;
  color: var(--c-text-dim, #64748b);
`;

const SkeletonWrapper = styled.div`
  padding: 1.2rem 1.5rem;
  display: grid;
  gap: 0.75rem;
`;

const SkeletonRow = styled.div`
  display: grid;
  grid-template-columns: 2fr repeat(4, minmax(90px, 1fr));
  gap: 1rem;
`;

const SkeletonBlock = styled.div`
  height: 14px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(226,232,240,0.6) 0px, rgba(203,213,225,0.9) 60px, rgba(226,232,240,0.6) 120px);
  background-size: 200px 100%;
  animation: ${shimmer} 1.4s ease infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
  min-width: 660px;
`;

const TableHead = styled.thead`
  background: var(--c-bg-alt, #f8fafc);
  position: sticky;
  top: 0;
  z-index: 5;
`;

const HeaderRow = styled.tr``;

const HeaderCell = styled.th`
  padding: 0.85rem 1.2rem;
  text-align: left;
  border-bottom: 1px solid var(--c-border, #e2e8f0);
  color: var(--c-text, #0f172a);
  font-weight: 600;
  white-space: nowrap;
  position: relative;
`;

const BodyRow = styled.tr<{ $active?: boolean }>`
  background: ${({ $active }) => ($active ? 'rgba(37, 99, 235, 0.08)' : 'transparent')};
  transition: background 0.2s ease, transform 0.2s ease;

  &:hover {
    background: rgba(37, 99, 235, 0.1);
    transform: translateX(2px);
  }
`;

const TableCell = styled.td`
  padding: 0.85rem 1.2rem;
  border-bottom: 1px solid var(--c-border, #e2e8f0);
  vertical-align: top;
  color: var(--c-text, #0f172a);
`;

const KeywordText = styled.span`
  font-weight: 600;
  display: block;
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const InfoIcon = styled.button`
  cursor: pointer;
  margin-left: 6px;
  font-weight: bold;
  color: var(--c-accent, #2563eb);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--c-accent, #2563eb);
  background: transparent;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  line-height: 16px;
  font-size: 11px;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;

  &:hover {
    background: var(--c-accent, #2563eb);
    color: #fff;
  }
`;

const ExplanationRow = styled.tr`
  background: rgba(37, 99, 235, 0.08);
`;

const ExplanationCell = styled.td`
  padding: 0.85rem 1.2rem;
  font-size: 0.85rem;
  color: var(--c-text-dim, #64748b);
  border-bottom: 1px solid var(--c-border, #e2e8f0);
`;

const CompetitionBadge = styled.span<CompetitionBadgeProps>`
  display: inline-block;
  padding: 0.3rem 0.55rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  ${({ $competition }) => {
    switch ($competition) {
      case 'low':
        return 'background: rgba(34,197,94,0.15); color: #065f46;';
      case 'medium':
        return 'background: rgba(251,191,36,0.2); color: #92400e;';
      case 'high':
        return 'background: rgba(248,113,113,0.2); color: #991b1b;';
      default:
        return '';
    }
  }}
`;

const DemandChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(15, 23, 42, 0.05);
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 14px;
  padding: 0.2rem 0.65rem;
  font-size: 0.75rem;
  margin-top: 0.4rem;
`;

const DemandBar = styled.div`
  display: inline-block;
  height: 6px;
  width: 70px;
  background: #e2e8f0;
  border-radius: 999px;
  overflow: hidden;
`;

const DemandFill = styled.div<{ $pct: number }>`
  height: 100%;
  width: ${({ $pct }) => Math.min(100, Math.max(0, $pct))}%;
  background: ${({ $pct }) => ($pct >= 66 ? '#16a34a' : $pct >= 33 ? '#f59e0b' : '#ef4444')};
  transition: width 0.3s ease;
`;

const RowActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
`;

const ActionButton = styled.button`
  border: 1px solid rgba(148, 163, 184, 0.5);
  background: #ffffff;
  color: var(--c-text, #0f172a);
  border-radius: 10px;
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;

  &:hover {
    background: rgba(37, 99, 235, 0.12);
    color: var(--c-accent, #2563eb);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CopyButton = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.32rem 0.6rem;
  border-radius: 999px;
  border: 1px solid ${({ $active }) => ($active ? 'rgba(34, 197, 94, 0.7)' : 'rgba(148, 163, 184, 0.65)')};
  background: ${({ $active }) => ($active ? 'rgba(34, 197, 94, 0.12)' : '#ffffff')};
  color: ${({ $active }) => ($active ? '#047857' : 'var(--c-text, #0f172a)')};
  font-size: 0.74rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;

  &:hover {
    border-color: rgba(37, 99, 235, 0.65);
    color: var(--c-accent, #2563eb);
  }

  &:focus-visible {
    outline: 2px solid rgba(37, 99, 235, 0.45);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const SnapshotCard = styled.div`
  margin-top: 0.6rem;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: var(--c-bg-alt, #f8fafc);
  border-radius: 14px;
  padding: 0.75rem 0.9rem 0.85rem;
  display: grid;
  gap: 0.75rem;
`;

const InsightCell = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 0.75rem;
  align-items: stretch;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const SnapshotInsight = styled.p`
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.5;
  color: var(--c-text, #0f172a);
`;

const SnapshotBundle = styled.div`
  padding: 0.6rem 0.75rem;
  border-radius: 12px;
  background: rgba(148, 163, 184, 0.12);
  display: grid;
  gap: 0.5rem;
`;

const MetricRow = styled.div`
  display: grid;
  gap: 0.35rem;
`;

const MetricHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
`;

const MetricLabel = styled.span`
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--c-text, #0f172a);
`;

const MetricValue = styled.span`
  font-size: 0.72rem;
  color: var(--c-text-dim, #64748b);
  font-variant-numeric: tabular-nums;
`;

const MetricBar = styled.div`
  height: 6px;
  background: rgba(148, 163, 184, 0.28);
  border-radius: 999px;
  overflow: hidden;
`;

const MetricFill = styled.div<{ $value: number; $tone?: 'warn' | 'alert' }>`
  height: 100%;
  width: ${({ $value }) => Math.min(100, Math.max(0, $value))}%;
  background: ${({ $tone }) => {
    switch ($tone) {
      case 'warn':
        return '#f59e0b';
      case 'alert':
        return '#ef4444';
      default:
        return '#2563eb';
    }
  }};
  transition: width 0.3s ease;
`;

const SnapshotMeta = styled.span`
  font-size: 0.7rem;
  color: var(--c-text-dim, #64748b);
`;

const ClipboardIcon = ({ copied = false }: { copied?: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      fill="currentColor"
      d="M16 4h-1.18A3 3 0 0012 2a3 3 0 00-2.82 2H8a2 2 0 00-2 2v13a2 2 0 002 2h8a2 2 0 002-2V6a2 2 0 00-2-2zm-4-1a1 1 0 011 1h-2a1 1 0 011-1zm4 16H8V6h1.18a3 3 0 002.82 2 3 3 0 002.82-2H16z"
      opacity={copied ? 0.85 : 1}
    />
  </svg>
);

const SnapshotLegendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
    <rect x="2" y="3" width="6" height="2" rx="1" fill="currentColor" opacity="0.45" />
    <rect x="2" y="7" width="10" height="2" rx="1" fill="currentColor" opacity="0.7" />
    <rect x="2" y="11" width="14" height="2" rx="1" fill="currentColor" />
  </svg>
);

const REVIEW_BENCHMARK = 1200;

const clampPercent = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

const safeNumber = (value: number | null | undefined) => (
  typeof value === 'number' && !Number.isNaN(value) ? value : 0
);

const buildSnapshotInsight = (snapshot: SnapshotData) => {
  const total = snapshot.totalConsidered || 0;
  const sponsoredRatio = total > 0 ? snapshot.sponsoredCount / total : 0;
  const rating = safeNumber(snapshot.medianRating);
  const reviews = safeNumber(snapshot.medianReviews);
  const priceMin = safeNumber(snapshot.priceMin);
  const priceMax = safeNumber(snapshot.priceMax);
  const spread = Math.max(0, priceMax - priceMin);

  const insights: string[] = [];

  if (sponsoredRatio >= 0.45) {
    insights.push('Crowded sponsored slots? Expect higher CPC bids or pivot to longer-tail phrasing.');
  } else if (sponsoredRatio <= 0.18) {
    insights.push('Few sponsored listings? Organic visibility can break through quickly.');
  }

  if (reviews >= 800) {
    insights.push('Top listings lean on heavy social proof. Highlight ratings, guarantees, and trust badges.');
  } else if (reviews <= 200) {
    insights.push('Review counts are light. Seize the trust gap with testimonials and detailed benefits.');
  }

  if (rating >= 4.6) {
    insights.push('Competitors maintain near-perfect ratings; differentiate with standout value props.');
  } else if (rating <= 4.0) {
    insights.push('Average ratings are soft. Double down on quality assurances and post-purchase support.');
  }

  if (spread >= priceMin * 0.6) {
    insights.push('Pricing ranges widely. Decide whether to undercut on value or position as premium.');
  } else if (priceMax > 0 && spread <= Math.max(priceMin, 1) * 0.2) {
    insights.push('Pricing is tight. Your copy and keywords must carry differentiation.');
  }

  if (!insights.length) {
    return 'Balanced competition. Lean on persuasive copy and precise keywords to edge ahead.';
  }

  return insights.slice(0, 2).join(' ');
};

const ErrorMessage = styled.div`
  padding: 1rem;
  color: #7f1d1d;
  background: rgba(254, 226, 226, 0.7);
  border-radius: 12px;
  margin: 0.5rem 0;
  text-align: center;
`;

const EmptyMessage = styled.div`
  padding: 1.2rem;
  text-align: center;
  color: var(--c-text-dim, #64748b);
`;

const explanations: Record<string, string> = {
  keyword: 'Keyword: The search phrase users might type into a search engine. Prioritize high-intent phrases that reflect your product benefits.',
  searchVolume: 'Search Volume: Estimated average monthly search volume. Strong candidates balance healthy demand with achievable difficulty.',
  cpc: 'CPC (Cost Per Click): Indicates the commercial value in paid channels. Higher CPC often correlates with buying intent.',
  difficulty: 'Difficulty (0-100): How challenging it is to rank organically. Lower scores mean faster wins.',
  competition: 'Competition: Advertiser competition. Use low or medium competition terms to carve out visibility faster.'
};

const KeywordTable: React.FC<KeywordTableProps> = ({ keywords, loading, error, onCopyKeyword }) => {
  const [visibleExplanation, setVisibleExplanation] = useState<ExplanationKey>(null);
  const [market, setMarket] = useState<Marketplace>('amazon.com');
  const [demandMap, setDemandMap] = useState<Record<string, { score: number; loading: boolean }>>({});
  const [snapshotMap, setSnapshotMap] = useState<Record<string, { loading: boolean; data?: SnapshotData }>>({});
  const [copiedKeyword, setCopiedKeyword] = useState<string | null>(null);
  const [legendOpen, setLegendOpen] = useState<boolean>(false);
  const copyResetRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyResetRef.current !== null) {
        window.clearTimeout(copyResetRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setCopiedKeyword(null);
  }, [keywords]);

  useEffect(() => {
    if (!keywords || keywords.length === 0) return;
    const initial = keywords.slice(0, 16);
    initial.forEach((k) => {
      if (demandMap[k.keyword]?.loading || demandMap[k.keyword]?.score != null) return;
      setDemandMap((prev) => ({ ...prev, [k.keyword]: { score: prev[k.keyword]?.score ?? 0, loading: true } }));
      chrome.runtime.sendMessage({ action: 'getDemandScore', keyword: k.keyword, marketplace: market }, (resp) => {
        if (resp?.success && resp.result) {
          setDemandMap((prev) => ({ ...prev, [k.keyword]: { score: resp.result.score ?? 0, loading: false } }));
        } else {
          setDemandMap((prev) => ({ ...prev, [k.keyword]: { score: 0, loading: false } }));
        }
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keywords, market]);

  const toggleExplanation = (key: ExplanationKey) => {
    setVisibleExplanation((prev) => (prev === key ? null : key));
  };

  const handleCopy = (kw: KeywordData) => {
    onCopyKeyword?.(kw);
    navigator.clipboard.writeText(kw.keyword).catch(() => undefined);
    setCopiedKeyword(kw.keyword);
    if (copyResetRef.current !== null) {
      window.clearTimeout(copyResetRef.current);
    }
    copyResetRef.current = window.setTimeout(() => {
      setCopiedKeyword((prev) => (prev === kw.keyword ? null : prev));
    }, 1600);
  };

  const runSnapshot = (kw: string) => {
    if (snapshotMap[kw]?.loading) return;
    setSnapshotMap((prev) => ({ ...prev, [kw]: { ...(prev[kw] || {}), loading: true } }));
    chrome.runtime.sendMessage({ action: 'getCompetitorSnapshot', keyword: kw, marketplace: market }, (resp) => {
      if (resp?.success && resp.snapshot) {
        const { sponsoredCount, totalConsidered, medianRating, medianReviews, priceMin, priceMax, marketplace: snapshotMarketplace } = resp.snapshot;
        setSnapshotMap((prev) => ({ ...prev, [kw]: { loading: false, data: { sponsoredCount, totalConsidered, medianRating, medianReviews, priceMin, priceMax, marketplace: snapshotMarketplace || market } } }));
      } else {
        setSnapshotMap((prev) => ({ ...prev, [kw]: { loading: false } }));
      }
    });
  };

  const legendContentId = 'snapshot-legend-panel';

  const legendSection = (
    <LegendBanner>
      <LegendHeader
        type="button"
        onClick={() => setLegendOpen((prev) => !prev)}
        aria-expanded={legendOpen}
        aria-controls={legendContentId}
      >
        <LegendIconWrapper>
          <SnapshotLegendIcon />
        </LegendIconWrapper>
        <LegendTitle>What these bars mean</LegendTitle>
        <LegendChevron $open={legendOpen}>
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
            <path d="M4 3l4 3-4 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </LegendChevron>
      </LegendHeader>
      {legendOpen && (
        <LegendContent id={legendContentId}>
          <LegendDescription>
            Snapshot bundles review the first page of results to show where ads, reviews, and pricing create lift or friction.
          </LegendDescription>
          <LegendSwatchRow>
            <LegendSwatchItem>
              <LegendSwatch $tone="base" />
              Open lane
            </LegendSwatchItem>
            <LegendSwatchItem>
              <LegendSwatch $tone="warn" />
              Tightening
            </LegendSwatchItem>
            <LegendSwatchItem>
              <LegendSwatch $tone="alert" />
              Saturated
            </LegendSwatchItem>
          </LegendSwatchRow>
          <LegendList>
            {snapshotLegendItems.map((item) => (
              <LegendItem key={item.key}>
                <LegendItemTitle>{item.title}</LegendItemTitle>
                <LegendItemDetail>{item.detail}</LegendItemDetail>
              </LegendItem>
            ))}
          </LegendList>
        </LegendContent>
      )}
    </LegendBanner>
  );

  if (loading) {
    return (
      <>
        {legendSection}
        <TableContainer aria-busy="true" aria-live="polite">
          <SkeletonWrapper>
            {Array.from({ length: 6 }).map((_, idx) => (
              <SkeletonRow key={idx}>
                <SkeletonBlock />
                <SkeletonBlock />
                <SkeletonBlock />
                <SkeletonBlock />
                <SkeletonBlock />
              </SkeletonRow>
            ))}
          </SkeletonWrapper>
        </TableContainer>
      </>
    );
  }

  if (error) {
    return (
      <>
        {legendSection}
        <ErrorMessage role="alert">{error}</ErrorMessage>
      </>
    );
  }

  if (!keywords || keywords.length === 0) {
    return (
      <>
        {legendSection}
        <EmptyMessage>No keywords to display yet. Run an analysis to uncover new opportunities.</EmptyMessage>
      </>
    );
  }

  const sortedKeywords = [...keywords].sort((a, b) => b.searchVolume - a.searchVolume);

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null || Number.isNaN(value)) return 'N/A';
    return `$${value.toFixed(2)}`;
  };

  const getSnapshotMetrics = (snapshotData: SnapshotData) => {
    const total = snapshotData.totalConsidered || 0;
    const sponsoredRatio = total > 0 ? (snapshotData.sponsoredCount / total) * 100 : 0;
    const reviews = safeNumber(snapshotData.medianReviews);
    const priceMin = safeNumber(snapshotData.priceMin);
    const priceMax = safeNumber(snapshotData.priceMax);
    const spread = Math.max(0, priceMax - priceMin);
    const spreadPct = priceMax > 0 ? (spread / priceMax) * 100 : 0;

    return [
      {
        key: 'ads',
        label: 'Ad saturation',
        value: clampPercent(sponsoredRatio),
        tone: sponsoredRatio >= 60 ? 'alert' : sponsoredRatio >= 35 ? 'warn' : undefined,
        display: total > 0 ? `${snapshotData.sponsoredCount}/${total} ads` : 'No ads',
      },
      {
        key: 'reviews',
        label: 'Median reviews',
        value: clampPercent((reviews / REVIEW_BENCHMARK) * 100),
        tone: reviews >= 900 ? 'alert' : reviews >= 400 ? 'warn' : undefined,
        display: reviews ? reviews.toLocaleString() : 'N/A',
      },
      {
        key: 'price',
        label: 'Price range',
        value: clampPercent(spreadPct),
        tone: priceMax > 0 && spread <= Math.max(priceMin, 1) * 0.2 ? 'warn' : undefined,
        display: priceMax > 0 ? `${formatCurrency(priceMin)} - ${formatCurrency(priceMax)}` : 'N/A',
      },
    ];
  };

  const renderHeaderWithIcon = (key: keyof typeof explanations, label: string) => (
    <HeaderCell>
      {label}
      <InfoIcon type="button" onClick={() => toggleExplanation(key)} title={`Explain ${label}`}>?</InfoIcon>
      {key === 'keyword' && (
        <span style={{ marginLeft: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <label htmlFor="market-select" style={{ fontSize: '0.75rem', color: 'var(--c-text-dim, #64748b)' }}>Marketplace</label>
          <select
            id="market-select"
            name="market-select"
            aria-label="Marketplace selector"
            value={market}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMarket(e.target.value as Marketplace)}
          >
            <option value="amazon.com">amazon.com</option>
            <option value="amazon.co.uk">amazon.co.uk</option>
            <option value="amazon.ca">amazon.ca</option>
          </select>
        </span>
      )}
    </HeaderCell>
  );

  return (
    <>
      {legendSection}
      <TableContainer>
        <Table>
          <TableHead>
            <HeaderRow>
              {renderHeaderWithIcon('keyword', 'Keyword')}
              {renderHeaderWithIcon('searchVolume', 'Search Volume')}
              {renderHeaderWithIcon('cpc', 'CPC')}
              {renderHeaderWithIcon('difficulty', 'Difficulty')}
              {renderHeaderWithIcon('competition', 'Competition')}
            </HeaderRow>
            {visibleExplanation && (
              <ExplanationRow>
                <ExplanationCell colSpan={5}>{explanations[visibleExplanation]}</ExplanationCell>
              </ExplanationRow>
            )}
          </TableHead>
          <tbody>
            {sortedKeywords.map((item) => {
              const snapshot = snapshotMap[item.keyword];
              const snapshotData = snapshot?.data;
              const snapshotLoading = snapshot?.loading;
              return (
                <BodyRow key={item.keyword} $active={copiedKeyword === item.keyword}>
                  <TableCell title={item.keyword}>
                    <KeywordText>{item.keyword}</KeywordText>
                    <DemandChip title="Demand score derived from marketplace signals">
                      Demand
                      <DemandBar>
                        <DemandFill $pct={demandMap[item.keyword]?.score ?? 0} />
                      </DemandBar>
                      <span>{demandMap[item.keyword]?.loading ? 'Calculating...' : `${demandMap[item.keyword]?.score ?? 0}`}</span>
                    </DemandChip>
                    <RowActions>
                      <CopyButton
                        type="button"
                        onClick={() => handleCopy(item)}
                        $active={copiedKeyword === item.keyword}
                        aria-label={`Copy keyword ${item.keyword}`}
                        title="Copy keyword"
                      >
                        <ClipboardIcon copied={copiedKeyword === item.keyword} />
                        <span>Copy</span>
                      </CopyButton>
                      <ActionButton
                        type="button"
                        onClick={() => runSnapshot(item.keyword)}
                        disabled={snapshotLoading}
                        aria-label={`Fetch competitor snapshot for ${item.keyword}`}
                      >
                        {snapshotLoading ? 'Fetching...' : snapshotData ? 'Refresh Snapshot' : 'Quick Snapshot'}
                      </ActionButton>
                    </RowActions>
                    {snapshotData && (
                      <SnapshotCard>
                        <InsightCell>
                          <SnapshotInsight>{buildSnapshotInsight(snapshotData)}</SnapshotInsight>
                          <SnapshotBundle>
                            {getSnapshotMetrics(snapshotData).map((metric) => (
                              <MetricRow key={metric.key}>
                                <MetricHeader>
                                  <MetricLabel>{metric.label}</MetricLabel>
                                  <MetricValue>{metric.display}</MetricValue>
                                </MetricHeader>
                                <MetricBar>
                                  <MetricFill $value={metric.value} $tone={metric.tone} />
                                </MetricBar>
                              </MetricRow>
                            ))}
                          </SnapshotBundle>
                        </InsightCell>
                        <SnapshotMeta>
                          Based on top {snapshotData.totalConsidered} results on {snapshotData.marketplace || market}.
                        </SnapshotMeta>
                      </SnapshotCard>
                    )}
                  </TableCell>
                  <TableCell>{item.searchVolume.toLocaleString()}</TableCell>
                  <TableCell>${item.cpc.toFixed(2)}</TableCell>
                  <TableCell>{item.keywordDifficulty}/100</TableCell>
                  <TableCell>
                    <CompetitionBadge $competition={item.competition}>
                      {item.competition}
                    </CompetitionBadge>
                  </TableCell>
                </BodyRow>
              );
            })}
          </tbody>
        </Table>
      </TableContainer>
    </>
  );
};

export default KeywordTable;
