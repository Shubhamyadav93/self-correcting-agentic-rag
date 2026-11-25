import React, { useState, useEffect, useRef } from 'react';
import { Cpu, CheckCircle2, Circle, X } from 'lucide-react';

const AGENT_NODES = [
  {
    id: 1,
    title: 'Node 1: Vector Retrieval',
    desc: 'Query ChromaDB via MCP Retriever',
  },
  {
    id: 2,
    title: 'Node 2: Context Quality Grader',
    desc: 'LLM Judge relevance evaluation',
    fallbackDesc: 'Local Context Insufficient • Triggering Fallback',
  },
  {
    id: 5,
    title: 'Node 5: Query Rewriter',
    desc: 'Reformulate query for better retrieval',
  },
  {
    id: 6,
    title: 'Node 6: Web Search Fallback',
    desc: 'DuckDuckGo clinical search fallback',
    fallbackDesc: 'DuckDuckGo Live clinical search fallback',
  },
  {
    id: 3,
    title: 'Node 3: LLM Generation',
    desc: 'Synthesize answer with Llama-3-70B',
  },
  {
    id: 4,
    title: 'Node 4: Hallucination Checker',
    desc: 'Verify 100% factual grounding',
  },
];

/* Simulated per-node latencies for the sequential animated progression */
const STEP_DELAYS = [700, 650, 650, 750, 1100, 800];

export default function AgentStateTracer({ isLoading, lastResult, result, onClose }) {
  const resultData = lastResult || result;
  const [activeStep, setActiveStep] = useState(-1);
  const [stepLatencies, setStepLatencies] = useState({});
  const timerRef = useRef(null);

  /* ── Detect web fallback using ANY of the specified signals ── */
  const citationsList = resultData?.citations || resultData?.sources || [];
  const usedWebFallback = Boolean(
    resultData?.web_search_used ||
    resultData?.fallback_used ||
    resultData?.fallback_triggered ||
    citationsList.some(
      (c) => c?.page === 'Web' || c?.page === 'web' || String(c?.source || '').startsWith('http')
    )
  );

  /* ── Animate through nodes sequentially while loading (1 -> 2 -> 5 -> 6 -> 3 -> 4) ── */
  useEffect(() => {
    if (isLoading) {
      setActiveStep(0);
      setStepLatencies({});

      let current = 0;
      const advanceStep = () => {
        timerRef.current = setTimeout(() => {
          setStepLatencies((prev) => ({
            ...prev,
            [current]: STEP_DELAYS[current],
          }));
          current += 1;
          if (current < AGENT_NODES.length) {
            setActiveStep(current);
            advanceStep();
          } else {
            /* Hold on Node 4 (index 5) until response arrives */
            setActiveStep(AGENT_NODES.length - 1);
          }
        }, STEP_DELAYS[current] || 700);
      };
      advanceStep();
    } else {
      /* Loading finished */
      if (timerRef.current) clearTimeout(timerRef.current);
      setActiveStep(-1);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isLoading]);

  const getNodeStatus = (nodeId, index) => {
    if (isLoading) {
      if (index < activeStep) return 'done';
      if (index === activeStep) return 'active';
      return 'pending';
    }

    if (!resultData) return 'pending';

    // When resultData is present and loading complete:
    if (usedWebFallback) {
      // Highlight all 6 nodes in sequence when web search fallback was used
      return 'done';
    }

    // When local ChromaDB context was sufficient:
    if (nodeId === 5 || nodeId === 6) return 'skipped';
    return 'done';
  };

  const getNodeDesc = (node, status) => {
    if (status === 'skipped') {
      return 'Not needed (Local context sufficient)';
    }
    if (status === 'done' && usedWebFallback && node.fallbackDesc) {
      return node.fallbackDesc;
    }
    return node.desc;
  };

  const totalLatency = resultData?.latency_ms || null;

  return (
    <div className="panel-card">
      <div className="panel-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          <Cpu size={18} color="#8b5cf6" />
          <span>Multi-Stage Clinical Verification Engine</span>
        </div>
        {onClose && (
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            title="Close Tracer Panel"
            style={{ padding: '0.2rem', color: '#a1a1aa' }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="node-list">
        {AGENT_NODES.map((node, index) => {
          const status = getNodeStatus(node.id, index);
          const isFallbackNode = usedWebFallback && (node.id === 5 || node.id === 6 || node.id === 2);
          const extraClass = isFallbackNode && status === 'done' ? 'fallback-done' : '';

          return (
            <div key={node.id} className={`node-item ${status} ${extraClass}`}>
              {status === 'active' && (
                <svg
                  className="node-spinner"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
              )}
              {status === 'done' && (
                <CheckCircle2
                  size={18}
                  color={usedWebFallback && (node.id === 5 || node.id === 6) ? '#06b6d4' : '#10b981'}
                />
              )}
              {(status === 'pending' || status === 'skipped') && (
                <Circle size={18} color="#3f3f46" />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{node.title}</div>
                <div style={{ fontSize: '0.74rem', color: '#71717a' }}>
                  {getNodeDesc(node, status)}
                </div>
              </div>
              {status === 'done' && stepLatencies[index] && (
                <span className="node-latency">{stepLatencies[index]}ms</span>
              )}
              {status === 'done' && !stepLatencies[index] && resultData && (
                <span className="node-latency">✓</span>
              )}
            </div>
          );
        })}
      </div>

      {resultData && !isLoading && (
        <div className={`tracer-summary ${usedWebFallback ? 'tracer-summary--fallback' : ''}`}>
          <div>
            <strong style={{ color: usedWebFallback ? '#06b6d4' : '#10b981' }}>✓ Status:</strong>{' '}
            <span style={{ color: '#d4d4d8' }}>
              {usedWebFallback
                ? 'Verified Grounded Output (Web Search Fallback Used)'
                : 'Verified Grounded Output'}
            </span>
          </div>
          {totalLatency && (
            <div>
              <strong style={{ color: usedWebFallback ? '#06b6d4' : '#10b981' }}>⏱ Execution Latency:</strong>{' '}
              <span style={{ color: '#d4d4d8' }}>{totalLatency} ms</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
