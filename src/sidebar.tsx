// /src/popup.tsx
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';

import Header from './components/Header';
import MarketIntelligencePanel from './components/MarketIntelligencePanel';
// Try importing version from package.json (tsconfig has resolveJsonModule)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import pkg from '../package.json';
import KeywordTable from './components/KeywordTable';
import { KeywordData } from './utils/types';
import { isOfflineMode, toggleOfflineMode, loadKeywords as loadKeywordsFromStorage } from './utils/storage';
import { ProductOptimizationResult, LongTailSuggestion, MetaSuggestion, RewrittenBullet, GapResult } from './types/product';
import { AiTaskType } from './types/product';
import { MarketIntelligenceResult, MarketIntelligenceEngine } from './utils/marketIntelligence';

const Container = styled.div`
  font-family: Arial, sans-serif;
  color: #212529;
  width: 100%;
  height: 100vh;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
`;

const Content = styled.main`
  padding: 1rem;
  flex: 1;
  background: #ffffff;
  overflow-y: auto;
  margin: 0.5rem;
  margin-bottom: 0;
  border-radius: 8px 8px 0 0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const ActionButton = styled.button`
  background-color: #4285f4;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.3s, opacity 0.3s;
  margin-right: 0.5rem; /* Add some margin between buttons */

  &:last-child {
    margin-right: 0;
  }
  
  &:hover {
    background-color: #3367d6;
  }
  
  &:disabled {
    background-color: #b8c2cc;
    cursor: not-allowed;
    opacity: 0.7;
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-start;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 8px;
  
  @media (max-width: 400px) {
    flex-direction: column;
    
    button {
      width: 100%;
      margin-right: 0;
    }
  }
`;

const Footer = styled.footer`
  padding: 0.75rem 1rem;
  background-color: #ffffff;
  border-top: 1px solid #e9ecef;
  font-size: 0.75rem;
  color: #6c757d;
  text-align: center;
  margin: 0 0.5rem 0.5rem 0.5rem;
  border-radius: 0 0 8px 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  flex-shrink: 0;
`;
const Notice = styled.div`
  background: #fff3cd;
  border: 1px solid #ffecb5;
  color: #664d03;
  padding: 8px 12px;
  border-radius: 4px;
  margin-bottom: 8px;
`;

// New styled button for Copy, different color
const SecondaryButton = styled(ActionButton)`
  background-color: #6c757d;
  &:hover {
    background-color: #5a6268;
  }
`;

// Green button for recommendations
const SuccessButton = styled(ActionButton)`
  background-color: #28a745;
  &:hover {
    background-color: #218838;
  }
`;

// New recommendations panel component
const RecommendationsPanel = styled.div`
  margin-top: 1.5rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
`;

const RecommendationTitle = styled.h3`
  font-size: 1rem;
  margin-top: 0;
  margin-bottom: 0.5rem;
  color: #212529;
`;

const RecommendationList = styled.ul`
  margin: 0;
  padding-left: 1.5rem;
`;

const RecommendationItem = styled.li`
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  line-height: 1.4;
`;

// Optimization Panel Styles
const OptimizationPanel = styled.div`
  margin-top: 1.25rem;
  padding: 1rem;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  background: #fafafa;
`;
const OptSection = styled.section`
  margin-bottom: 0.75rem;
  &:last-of-type { margin-bottom: 0; }
`;
const OptList = styled.ul`
  margin: 0.25rem 0 0 0.75rem;
  padding: 0;
  list-style: disc;
`;
const OptOrderedList = styled.ol`
  margin: 0.25rem 0 0 0.75rem;
  padding: 0;
`;
const OptItem = styled.li`
  font-size: 0.75rem;
  line-height: 1.3;
  margin-bottom: 0.25rem;
`;
const Muted = styled.span`
  opacity: 0.6;
`;
const MetaBlock = styled.div`
  font-size: 0.75rem;
  margin-top: 2px;
`;
const SmallMeta = styled.div`
  margin-top: 0.75rem;
  font-size: 0.65rem;
  opacity: 0.6;
`;
const PanelHeading = styled.h3`
  margin: 0 0 0.5rem;
  font-size: 1rem;
`;
const InlineActions = styled.div`
  display: flex;
  gap: 6px;
  margin-top: 0.5rem;
  flex-wrap: wrap;
`;
const TinyButton = styled.button`
  background: #fff;
  border: 1px solid #d0d7de;
  padding: 2px 8px;
  font-size: 0.65rem;
  border-radius: 3px;
  cursor: pointer;
  line-height: 1.2;
  &:hover { background: #f3f4f6; }
  &:disabled { opacity: .5; cursor: not-allowed; }
`;
const Badge = styled.span`
  background: #e2e3e5;
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 0.55rem;
  font-weight: 600;
  letter-spacing: .5px;
  text-transform: uppercase;
  margin-left: 6px;
`;
const MetaDescriptionLabel = styled.strong`
  display: block;
  margin-top: 0.5rem;
`;
const RecHeading = styled.h4`
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
`;
const RecParagraph = styled.p`
  font-size: 0.8rem;
  margin: 0 0 0.5rem;
`;
const TipContainer = styled.div`
  font-size: 0.8rem;
  margin-top: 1rem;
  color: #6c757d;
`;
const NoMarginP = styled.p`
  margin: 0;
`;

// History Viewer Styles
const HistoryList = styled.ul`
  list-style: none;
  padding-left: 0;
  margin: 0.25rem 0 0;
`;
const HistoryListItem = styled.li`
  margin-bottom: 6px;
`;
const HistoryRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;
const HistoryToggleButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  text-align: left;
  flex: 1;
  font-size: 0.7rem;
  &:hover { text-decoration: underline; }
`;
const SnapshotDetail = styled.div`
  margin-top: 4px;
  font-size: 0.65rem;
  background: #fff;
  border: 1px solid #eee;
  padding: 6px;
  border-radius: 3px;
`;

const KeywordChip = styled.span`
  display: inline-block;
  background-color: #e9ecef;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  margin-right: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.8rem;
`;

const ChipContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  margin-top: 0.5rem;
`;

const App: React.FC = () => {
  const [keywords, setKeywords] = useState<KeywordData[]>([]);
  const [keywordsLoading, setKeywordsLoading] = useState<boolean>(true); 
  const [error, setError] = useState<string | null>(null);
  const [offlineMode, setOfflineMode] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false); 
  const [copyButtonText, setCopyButtonText] = useState("Copy Keywords");
  const [showRecommendations, setShowRecommendations] = useState<boolean>(false);
  const [optimization, setOptimization] = useState<ProductOptimizationResult | null>(null);
  const [optimizationLoading, setOptimizationLoading] = useState<boolean>(false);
  const [optimizationError, setOptimizationError] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [history, setHistory] = useState<ProductOptimizationResult[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState<number | null>(null);
  const [unsupportedPage, setUnsupportedPage] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<Record<AiTaskType, {state: 'pending' | 'running' | 'done' | 'error'; elapsedMs?: number; heuristic?: boolean}>>({
    'generate.longTail': { state: 'pending' },
    'generate.meta': { state: 'pending' },
    'rewrite.bullets': { state: 'pending' },
    'detect.gaps': { state: 'pending' }
  });
  
  // Market Intelligence State
  const [marketIntelligence, setMarketIntelligence] = useState<MarketIntelligenceResult | null>(null);
  const [marketIntelligenceLoading, setMarketIntelligenceLoading] = useState<boolean>(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    const messageListener = (message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
      console.log("Popup: Received runtime message:", message);
      if (message.action === 'keywordsUpdated') {
        console.log("Popup: 'keywordsUpdated' message received with keywords:", message.keywords);
        setKeywords(message.keywords || []);
        setError(null); 
        if (message.keywords && message.keywords.length === 0 && !isAnalyzing) { // Only show if not in midst of analysis
            setError("Analysis complete, but no keywords were found for this page.");
        }
        setKeywordsLoading(false);
        setIsAnalyzing(false);
      }
      if (message.action === 'pageUnsupported') {
        setUnsupportedPage(message.url || '');
        setKeywordsLoading(false);
        setIsAnalyzing(false);
      }
      if (message.action === 'productOptimizationUpdated') {
        console.log("Popup: Product optimization update received", message.optimization);
        setOptimization(message.optimization || null);
        setOptimizationLoading(false);
        setOptimizationError(null);
        // Prepend into history view (avoid duplication by timestamp)
        if (message.optimization && !history.find(h => h.timestamp === message.optimization.timestamp)) {
          setHistory(prev => [message.optimization, ...prev].slice(0, 10));
        }
        // Mark all tasks done once final optimization arrives (if not already)
        setTaskStatus(prev => {
          const next = { ...prev } as any;
          (Object.keys(next) as AiTaskType[]).forEach(k => { if (next[k].state !== 'error') next[k].state = 'done'; });
          return next;
        });
      }
      if (message.action === 'optimizationProgress' && message.event) {
        const e = message.event as { task: AiTaskType; status: 'start'|'done'|'error'; elapsedMs?: number; fallbackUsed?: boolean };
        setTaskStatus(prev => ({
          ...prev,
          [e.task]: {
            state: e.status === 'start' ? 'running' : e.status === 'done' ? 'done' : 'error',
            elapsedMs: e.elapsedMs,
            heuristic: e.fallbackUsed === true
          }
        }));
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, [isAnalyzing]); // Added isAnalyzing to dependencies for re-evaluating error message logic

  const loadInitialData = async () => {
    setKeywordsLoading(true); setError(null); setOptimizationLoading(true);
    try {
      const isOffline = await isOfflineMode();
      setOfflineMode(isOffline);
      await loadKeywords(false); // Initial load might not need its own loading indicator if page load is quick
      // Fetch existing optimization if any
      chrome.runtime.sendMessage({ action: 'getProductOptimization' }, (resp) => {
        if (resp?.success) {
          setOptimization(resp.optimization || null);
        }
        setOptimizationLoading(false);
      });
      // Load optimization history
      setHistoryLoading(true);
      chrome.runtime.sendMessage({ action: 'getProductOptimizationHistory' }, (resp) => {
        if (resp?.success) {
          setHistory(resp.history || []);
        }
        setHistoryLoading(false);
      });
    } catch (err) {
      setError('Failed to initialize.'); setKeywordsLoading(false); setOptimizationLoading(false);
    } finally {
        setKeywordsLoading(false); // Ensure loading is false after initial setup
    }
  };

  const loadKeywords = async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) setKeywordsLoading(true); 
    setError(null); 
    try {
      const loadedKeywords = await loadKeywordsFromStorage();
      setKeywords(loadedKeywords);
    } catch (err) {
      setError('Failed to load keywords.'); setKeywords([]); 
    } finally {
      if (showLoadingIndicator || keywordsLoading) setKeywordsLoading(false); 
    }
  };

  const handleAnalyzeCurrentPage = () => {
  setIsAnalyzing(true); setKeywordsLoading(true); setOptimizationLoading(true); setError(null); setOptimizationError(null);
    // reset task statuses
    setTaskStatus({ 'generate.longTail': { state: 'pending' }, 'generate.meta': { state: 'pending' }, 'rewrite.bullets': { state: 'pending' }, 'detect.gaps': { state: 'pending' } });
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
          setError(`Error accessing tabs: ${chrome.runtime.lastError.message}.`);
          setIsAnalyzing(false); setKeywordsLoading(false); setOptimizationLoading(false); return;
        }
        const tab = tabs[0];
        if (!tab?.id) {
          setError('No active tab found.'); setIsAnalyzing(false); setKeywordsLoading(false); setOptimizationLoading(false); return;
        }
        const url = tab.url || '';
        const restrictedProtocols = ['chrome:', 'chrome-extension:', 'edge:', 'about:', 'file:'];
        if (restrictedProtocols.some(protocol => url.startsWith(protocol)) || !url.startsWith('http')) {
          setError('Cannot analyze this page type.'); setIsAnalyzing(false); setKeywordsLoading(false); setOptimizationLoading(false); return;
        }
        chrome.tabs.sendMessage(tab.id, { action: 'manualAnalyze' }, (responseFromContentScript) => {
            const runtimeError = chrome.runtime.lastError;
            if (runtimeError) {
              setError(`Error initiating analysis: ${runtimeError.message}`);
              setIsAnalyzing(false); setKeywordsLoading(false); setOptimizationLoading(false); return;
            }
            if (!responseFromContentScript?.success) {
              setError(responseFromContentScript?.error || 'Content script failed to initiate analysis.');
              setIsAnalyzing(false); setKeywordsLoading(false); setOptimizationLoading(false);
            }
            // Now wait for 'keywordsUpdated' from background via runtime.onMessage listener
          }
        );
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setIsAnalyzing(false); setKeywordsLoading(false); setOptimizationLoading(false);
    }
  };

  const handleToggleOfflineMode = async () => {
    setError(null); setKeywordsLoading(true); setOptimizationLoading(true);
    try {
      const newValue = await toggleOfflineMode();
      setOfflineMode(newValue);
      await loadKeywords(); 
    } catch (err) {
      setError('Failed to toggle offline mode.'); setKeywordsLoading(false); setOptimizationLoading(false);
      const currentMode = await isOfflineMode(); setOfflineMode(currentMode);
    }
  };

  const handleRefresh = () => {
    if(isAnalyzing) setIsAnalyzing(false); 
    loadKeywords(); 
  };

  const handleCopyKeywords = () => {
    if (keywords.length === 0) {
        setCopyButtonText("No Keywords");
        setTimeout(() => setCopyButtonText("Copy Keywords"), 2000);
        return;
    }
    
    // Format keywords with their search volume for better business utility
    const keywordText = keywords.map(kw => 
      `${kw.keyword} (${kw.searchVolume.toLocaleString()} searches/mo, $${kw.cpc.toFixed(2)} CPC)`
    ).join('\n');
    
    navigator.clipboard.writeText(keywordText)
      .then(() => {
        setCopyButtonText("Copied!");
        setTimeout(() => setCopyButtonText("Copy Keywords"), 2000);
      })
      .catch(err => {
        console.error('Popup: Failed to copy keywords to clipboard:', err);
        setCopyButtonText("Copy Failed");
        setError("Failed to copy keywords. Check console for details.");
        setTimeout(() => {
            setCopyButtonText("Copy Keywords");
            setError(null); // Clear error after a bit
        }, 3000);
      });
  };

  const toggleRecommendations = () => {
    setShowRecommendations(prev => !prev);
  };

  const refreshOptimization = () => {
    if (optimizationLoading) return;
    setOptimizationLoading(true); setOptimizationError(null);
    chrome.runtime.sendMessage({ action: 'refreshProductOptimization' }, (resp) => {
      if (chrome.runtime.lastError) {
        setOptimizationError(chrome.runtime.lastError.message || 'Unknown runtime error');
        setOptimizationLoading(false);
        return;
      }
      if (!resp?.success) {
        setOptimizationError(resp?.error || 'Refresh failed');
        setOptimizationLoading(false);
      }
      // success path handled by runtime listener updating optimization & clearing loading
    });
  };

  const exportOptimization = () => {
    if (!optimization) return;
    try {
      const lines: string[] = [];
      lines.push(`# Product Optimization Export`);
      lines.push(`Title: ${optimization.product.title}`);
      if (optimization.longTail?.length) {
        lines.push(`\nLong-Tail:`);
        optimization.longTail.forEach(l => lines.push(`- ${l.phrase} (${(l.score ?? 0).toFixed(2)})`));
      }
      if (optimization.meta) {
        lines.push(`\nMeta Title: ${optimization.meta.metaTitle}`);
        lines.push(`Meta Description: ${optimization.meta.metaDescription}`);
      }
      if (optimization.rewrittenBullets?.length) {
        lines.push(`\nRewritten Bullets:`);
        optimization.rewrittenBullets.slice(0,5).forEach((b,i)=> lines.push(`${i+1}. ${b.rewritten}`));
      }
      if (optimization.gaps?.gaps?.length) {
        lines.push(`\nAttribute Gaps (${optimization.gaps.classification}):`);
        optimization.gaps.gaps.slice(0,10).forEach(g=> lines.push(`- ${g.key}: ${g.suggestion}`));
      }
      const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'product_optimization.txt';
      a.click();
      URL.revokeObjectURL(url);
      setExportStatus('Exported');
      setTimeout(()=> setExportStatus(null), 2000);
    } catch (e) {
      setExportStatus('Failed');
      setTimeout(()=> setExportStatus(null), 2500);
    }
  };

  const toggleHistory = () => {
    setShowHistory(prev => !prev);
  };

  const viewSnapshot = (idx: number) => {
    setSelectedHistoryIndex(idx === selectedHistoryIndex ? null : idx);
  };

  const applySnapshot = (idx: number) => {
    const snap = history[idx];
    if (snap) {
      setOptimization(snap);
    }
  };

  // Get keyword recommendations based on the current keywords
  const getKeywordRecommendations = () => {
    if (!keywords || keywords.length === 0) return [];
    
    const recommendations = [];
    
    // Find best low competition keywords
    const lowCompKeywords = keywords
      .filter(kw => kw.competition === 'low')
      .sort((a, b) => b.searchVolume - a.searchVolume);
      
    if (lowCompKeywords.length > 0) {
      recommendations.push({
        title: "Low Competition Opportunities",
        content: "These keywords have relatively low competition and good search volume - ideal for quicker SEO results:",
        keywords: lowCompKeywords.slice(0, 3)
      });
    }
    
    // Find best value keywords (search volume / difficulty ratio)
    const valueKeywords = [...keywords]
      .filter(kw => kw.keywordDifficulty > 0) // Avoid division by zero
      .sort((a, b) => (b.searchVolume / b.keywordDifficulty) - (a.searchVolume / a.keywordDifficulty))
      .slice(0, 3);
      
    if (valueKeywords.length > 0) {
      recommendations.push({
        title: "Best ROI Keywords",
        content: "These keywords offer the best potential return on investment based on search volume vs. difficulty:",
        keywords: valueKeywords
      });
    }
    
    // Find commercial intent keywords (high CPC)
    const commercialKeywords = [...keywords]
      .sort((a, b) => b.cpc - a.cpc)
      .slice(0, 3);
      
    if (commercialKeywords.length > 0) {
      recommendations.push({
        title: "Commercial Intent Keywords",
        content: "These keywords have high commercial value (CPC) indicating strong buyer intent:",
        keywords: commercialKeywords
      });
    }
    
    return recommendations;
  };

  // Market Intelligence Handler
  const handleMarketIntelligenceAnalysis = async () => {
    if (!optimization?.product) {
      setError('No product data available. Please analyze a product page first.');
      return;
    }

    setMarketIntelligenceLoading(true);
    try {
      const keywordList = keywords.map(k => k.keyword);
      const engine = MarketIntelligenceEngine.getInstance();
      const result = await engine.analyzeMarket(optimization.product, keywordList);
      setMarketIntelligence(result);
    } catch (error) {
      console.error('Market intelligence analysis failed:', error);
      setError('Failed to analyze market data. Please try again.');
    } finally {
      setMarketIntelligenceLoading(false);
    }
  };

  return (
    <Container>
      <Header 
        isOfflineMode={offlineMode} 
        onToggleOfflineMode={handleToggleOfflineMode} 
      />
      <Content>
        {unsupportedPage && (
          <Notice>
            This page type isn’t supported for analysis yet.
          </Notice>
        )}
        <ButtonContainer>
          <ActionButton onClick={handleAnalyzeCurrentPage} disabled={isAnalyzing || keywordsLoading}>
            {isAnalyzing ? 'Analyzing...' : (keywordsLoading && !isAnalyzing ? 'Loading...' : 'Analyze Page')}
          </ActionButton>
          <ActionButton onClick={handleRefresh} disabled={isAnalyzing || keywordsLoading}>
            Refresh
          </ActionButton>
          <SecondaryButton onClick={handleCopyKeywords} disabled={keywordsLoading || isAnalyzing || keywords.length === 0}>
            {copyButtonText}
          </SecondaryButton>
          {keywords.length > 0 && (
            <SuccessButton onClick={toggleRecommendations} disabled={keywordsLoading || isAnalyzing}>
              {showRecommendations ? 'Hide Recommendations' : 'Get Recommendations'}
            </SuccessButton>
          )}
        </ButtonContainer>
        <InlineActions style={{marginBottom: '0.5rem'}}>
          <TinyButton onClick={toggleHistory} disabled={historyLoading}>{showHistory ? 'Hide History' : 'Show History'}{historyLoading ? '…' : ''}</TinyButton>
          {showHistory && history.length > 0 && <TinyButton disabled>{history.length} snapshots</TinyButton>}
        </InlineActions>
        <KeywordTable keywords={keywords} loading={keywordsLoading} error={error} />
        {!optimization && optimizationLoading && (
          <OptimizationPanel>
            <PanelHeading>Product Optimization</PanelHeading>
            <Muted>Generating optimization suggestions...</Muted>
          </OptimizationPanel>
        )}
        {optimizationError && !optimizationLoading && !optimization && (
          <OptimizationPanel>
            <PanelHeading>Product Optimization</PanelHeading>
            <Muted>Error: {optimizationError}</Muted>
          </OptimizationPanel>
        )}
        {optimization && (
          <OptimizationPanel>
            <PanelHeading>
              Product Optimization
              {offlineMode && <Badge>Heuristic</Badge>}
              {!offlineMode && optimizationLoading && <Badge>Updating</Badge>}
            </PanelHeading>
            <OptSection>
              <strong>Tasks:</strong>
              <OptList>
                {(['generate.longTail','generate.meta','rewrite.bullets','detect.gaps'] as AiTaskType[]).map((t) => (
                  <OptItem key={t}>
                    {t}
                    {' '}
                    <Badge>{taskStatus[t]?.state || 'pending'}</Badge>
                    {taskStatus[t]?.elapsedMs != null && <Muted> ({Math.round(taskStatus[t]!.elapsedMs!)}ms)</Muted>}
                    {taskStatus[t]?.heuristic && <Badge>Fallback</Badge>}
                  </OptItem>
                ))}
              </OptList>
            </OptSection>
            <OptSection>
              <strong>Long-Tail Suggestions:</strong>
              <OptList>
                {(optimization.longTail || []).slice(0,6).map((lt: LongTailSuggestion, i: number) => (
                  <OptItem key={i}>{lt.phrase} <Muted>({(lt.score ?? 0).toFixed(2)})</Muted></OptItem>
                ))}
              </OptList>
            </OptSection>
            {optimization.meta && (
              <OptSection>
                <strong>Meta Title:</strong>
                <MetaBlock>{optimization.meta.metaTitle}</MetaBlock>
                <MetaDescriptionLabel>Meta Description:</MetaDescriptionLabel>
                <MetaBlock>{optimization.meta.metaDescription}</MetaBlock>
              </OptSection>
            )}
            {optimization.rewrittenBullets && optimization.rewrittenBullets.length > 0 && (
              <OptSection>
                <strong>Rewritten Bullets:</strong>
                <OptOrderedList>
                  {optimization.rewrittenBullets.slice(0,5).map((b: RewrittenBullet, i: number) => (
                    <OptItem as="li" key={i}>{b.rewritten}</OptItem>
                  ))}
                </OptOrderedList>
              </OptSection>
            )}
            {optimization.gaps && optimization.gaps.gaps && (
              <OptSection>
                <strong>Attribute Gaps ({optimization.gaps.classification}):</strong>
                <OptList>
                  {optimization.gaps.gaps.slice(0,6).map((g: any, i: number) => (
                    <OptItem key={i}>{g.key} - <Muted>{g.suggestion}</Muted></OptItem>
                  ))}
                </OptList>
              </OptSection>
            )}
            <InlineActions>
              <TinyButton onClick={refreshOptimization} disabled={optimizationLoading}>Refresh</TinyButton>
              <TinyButton onClick={exportOptimization} disabled={optimizationLoading}>{exportStatus ? exportStatus : 'Export'}</TinyButton>
              <TinyButton onClick={() => { navigator.clipboard.writeText(JSON.stringify(optimization, null, 2)); setExportStatus('Copied'); setTimeout(()=> setExportStatus(null), 1500); }} disabled={optimizationLoading}>Copy JSON</TinyButton>
            </InlineActions>
            <SmallMeta>Cached at {new Date(optimization.timestamp).toLocaleTimeString()}</SmallMeta>
          </OptimizationPanel>
        )}
        {showHistory && (
          <OptimizationPanel>
            <PanelHeading>Optimization History {historyLoading && <Badge>Loading</Badge>}</PanelHeading>
            {(!history || history.length === 0) && !historyLoading && <Muted>No snapshots captured yet.</Muted>}
            {history && history.length > 0 && (
              <HistoryList>
                {history.map((h, idx) => (
                  <HistoryListItem key={h.timestamp}>
                    <HistoryRow>
                      <HistoryToggleButton onClick={() => viewSnapshot(idx)}>
                        <strong>{new Date(h.timestamp).toLocaleTimeString()}</strong> {h.product?.title ? '– ' + (h.product.title.length > 40 ? h.product.title.slice(0,40)+'…' : h.product.title) : ''}
                      </HistoryToggleButton>
                      <TinyButton onClick={() => applySnapshot(idx)}>Use</TinyButton>
                    </HistoryRow>
                    {selectedHistoryIndex === idx && (
                      <SnapshotDetail>
                        {h.longTail && h.longTail.length > 0 && (
                          <div><strong>LongTail:</strong> {h.longTail.slice(0,3).map(l => l.phrase).join(', ')}</div>
                        )}
                        {h.meta && (
                          <div><strong>Meta:</strong> {h.meta.metaTitle.slice(0,60)}…</div>
                        )}
                        {h.rewrittenBullets && h.rewrittenBullets.length > 0 && (
                          <div><strong>Bullets:</strong> {h.rewrittenBullets.slice(0,2).map(b=> b.rewritten.slice(0,40)+'…').join(' | ')}</div>
                        )}
                        {h.gaps && h.gaps.gaps && (
                          <div><strong>Gaps:</strong> {h.gaps.gaps.slice(0,2).map(g=> g.key).join(', ')}</div>
                        )}
                      </SnapshotDetail>
                    )}
                  </HistoryListItem>
                ))}
              </HistoryList>
            )}
          </OptimizationPanel>
        )}

        {/* Market Intelligence Panel */}
        <MarketIntelligencePanel
          data={marketIntelligence}
          loading={marketIntelligenceLoading}
          onRefresh={handleMarketIntelligenceAnalysis}
        />
        
        {showRecommendations && keywords.length > 0 && (
          <RecommendationsPanel>
            <RecommendationTitle>Keyword Recommendations</RecommendationTitle>
            {getKeywordRecommendations().map((recommendation, idx) => (
              <div key={idx}>
                <RecHeading>{recommendation.title}</RecHeading>
                <RecParagraph>{recommendation.content}</RecParagraph>
                <ChipContainer>
                  {recommendation.keywords.map((kw, kwIdx) => (
                    <KeywordChip key={kwIdx} title={`Search volume: ${kw.searchVolume}, CPC: $${kw.cpc.toFixed(2)}, Difficulty: ${kw.keywordDifficulty}/100`}>
                      {kw.keyword}
                    </KeywordChip>
                  ))}
                </ChipContainer>
              </div>
            ))}
            <TipContainer>
              <NoMarginP>
                <strong>Pro Tip:</strong> Focus on keywords with lower difficulty scores and decent search volumes for quicker SEO results.
              </NoMarginP>
            </TipContainer>
          </RecommendationsPanel>
        )}
      </Content>
      <Footer>
        Product Listing Optimizer {offlineMode ? '(Offline Mode)' : '(Online Mode)'} v{(pkg?.version as string) || '1.0.0'}
      </Footer>
    </Container>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);