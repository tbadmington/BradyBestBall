'use client';

import React, { useState } from 'react';
import { Trophy, Flag, ChevronLeft, ChevronRight, RotateCcw, Edit2, Check, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { useRound } from '../lib/useRound';

export default function GolfScorecard() {
  const {
    groups,
    pars,
    scores,
    loaded,
    syncStatus,
    updateGroups,
    updatePars,
    updateScores,
    resetScores,
  } = useRound();

  const [currentHole, setCurrentHole] = useState(0);
  const [view, setView] = useState('entry');
  const [editingGroup, setEditingGroup] = useState(null);

  const setPlayerScore = (groupId, hole, playerIdx, value) => {
    updateScores((prev) => {
      const next = { ...prev };
      if (!next[groupId]) next[groupId] = {};
      if (!next[groupId][hole]) next[groupId][hole] = [null, null, null, null];
      const arr = [...next[groupId][hole]];
      arr[playerIdx] = value;
      next[groupId][hole] = arr;
      return next;
    });
  };

  const bestBallForHole = (groupId, hole) => {
    const arr = scores[groupId]?.[hole];
    if (!arr) return null;
    const valid = arr.filter((v) => typeof v === 'number');
    if (valid.length < 2) return null;
    const sorted = [...valid].sort((a, b) => a - b);
    return sorted[0] + sorted[1];
  };

  const groupTotal = (groupId) => {
    let total = 0;
    let holesPlayed = 0;
    for (let h = 0; h < 18; h++) {
      const bb = bestBallForHole(groupId, h);
      if (bb !== null) {
        total += bb;
        holesPlayed++;
      }
    }
    return { total, holesPlayed };
  };

  const groupParForHolesPlayed = (groupId) => {
    let parSum = 0;
    for (let h = 0; h < 18; h++) {
      if (bestBallForHole(groupId, h) !== null) parSum += pars[h];
    }
    return parSum;
  };

  const standings = groups
    .map((g) => {
      const { total, holesPlayed } = groupTotal(g.id);
      const parPlayed = groupParForHolesPlayed(g.id);
      return { ...g, total, holesPlayed, parPlayed, toPar: total - parPlayed };
    })
    .sort((a, b) => {
      if (a.holesPlayed === 0 && b.holesPlayed === 0) return a.id - b.id;
      if (a.holesPlayed === 0) return 1;
      if (b.holesPlayed === 0) return -1;
      return a.toPar - b.toPar;
    });

  const handleReset = () => {
    if (confirm('Reset all scores for everyone? This cannot be undone.')) {
      resetScores();
      setCurrentHole(0);
    }
  };

  const updateGroupName = (groupId, name) => {
    updateGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, name } : g)));
  };

  const updatePlayerName = (groupId, idx, name) => {
    updateGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, players: g.players.map((p, i) => (i === idx ? name : p)) }
          : g
      )
    );
  };

  const updatePar = (hole, value) => {
    const v = parseInt(value, 10);
    if (isNaN(v) || v < 3 || v > 6) return;
    updatePars((prev) => prev.map((p, i) => (i === hole ? v : p)));
  };

  if (!loaded) {
    return (
      <div style={styles.loading}>
        <div style={styles.loadingText}>Loading round…</div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <style>{`
        * { box-sizing: border-box; }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] { -moz-appearance: textfield; }
        .score-btn {
          transition: all 0.15s ease;
        }
        .score-btn:hover {
          background: #f5efe0 !important;
          border-color: #1a3a2a !important;
        }
        .score-btn.active {
          background: #1a3a2a !important;
          color: #f5efe0 !important;
          border-color: #1a3a2a !important;
        }
        .nav-btn:hover:not(:disabled) {
          background: #1a3a2a !important;
          color: #f5efe0 !important;
        }
        .nav-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        .tab-btn.active {
          background: #1a3a2a !important;
          color: #f5efe0 !important;
        }
      `}</style>

      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.brand}>
            <Flag size={20} style={{ color: '#c89b3c' }} />
            <div style={{ flex: 1 }}>
              <div style={styles.title}>Best Ball</div>
              <div style={styles.subtitle}>Clifton Park · Five Groups · 18 Holes</div>
            </div>
            <SyncIndicator status={syncStatus} />
          </div>
          <div style={styles.tabs}>
            <button
              className={`tab-btn ${view === 'entry' ? 'active' : ''}`}
              style={styles.tab}
              onClick={() => setView('entry')}
            >
              Score Entry
            </button>
            <button
              className={`tab-btn ${view === 'scoreboard' ? 'active' : ''}`}
              style={styles.tab}
              onClick={() => setView('scoreboard')}
            >
              Scoreboard
            </button>
          </div>
        </div>
      </header>

      {view === 'entry' && (
        <main style={styles.main}>
          <div style={styles.holeNav}>
            <button
              className="nav-btn"
              style={styles.navBtn}
              onClick={() => setCurrentHole(Math.max(0, currentHole - 1))}
              disabled={currentHole === 0}
            >
              <ChevronLeft size={18} />
            </button>
            <div style={styles.holeDisplay}>
              <div style={styles.holeLabel}>Hole</div>
              <div style={styles.holeNumber}>{currentHole + 1}</div>
              <div style={styles.parRow}>
                <span style={styles.parLabel}>Par</span>
                <input
                  type="number"
                  min="3"
                  max="6"
                  value={pars[currentHole]}
                  onChange={(e) => updatePar(currentHole, e.target.value)}
                  style={styles.parInput}
                />
              </div>
            </div>
            <button
              className="nav-btn"
              style={styles.navBtn}
              onClick={() => setCurrentHole(Math.min(17, currentHole + 1))}
              disabled={currentHole === 17}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div style={styles.holeStrip}>
            {Array.from({ length: 18 }).map((_, i) => {
              const allEntered = groups.every((g) => bestBallForHole(g.id, i) !== null);
              return (
                <button
                  key={i}
                  onClick={() => setCurrentHole(i)}
                  style={{
                    ...styles.holeChip,
                    ...(i === currentHole ? styles.holeChipActive : {}),
                    ...(allEntered && i !== currentHole ? styles.holeChipDone : {}),
                  }}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          <div style={styles.groupsList}>
            {groups.map((group) => {
              const bb = bestBallForHole(group.id, currentHole);
              const par = pars[currentHole];
              const isEditing = editingGroup === group.id;
              return (
                <div key={group.id} style={styles.groupCard}>
                  <div style={styles.groupHeader}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={group.name}
                        onChange={(e) => updateGroupName(group.id, e.target.value)}
                        style={styles.groupNameInput}
                        autoFocus
                      />
                    ) : (
                      <div style={styles.groupName}>{group.name}</div>
                    )}
                    <div style={styles.groupHeaderRight}>
                      {bb !== null && (
                        <div style={styles.bestBallBadge}>
                          <span style={styles.bestBallLabel}>Best Ball</span>
                          <span style={styles.bestBallValue}>{bb}</span>
                          <span
                            style={{
                              ...styles.bestBallPar,
                              color:
                                bb - par * 2 < 0
                                  ? '#c89b3c'
                                  : bb - par * 2 > 0
                                  ? '#a83232'
                                  : '#5a6a5a',
                            }}
                          >
                            {bb - par * 2 === 0
                              ? 'E'
                              : bb - par * 2 > 0
                              ? `+${bb - par * 2}`
                              : bb - par * 2}
                          </span>
                        </div>
                      )}
                      <button
                        onClick={() => setEditingGroup(isEditing ? null : group.id)}
                        style={styles.editBtn}
                        aria-label="Edit names"
                      >
                        {isEditing ? <Check size={14} /> : <Edit2 size={14} />}
                      </button>
                    </div>
                  </div>

                  <div style={styles.playersGrid}>
                    {group.players.map((player, pIdx) => {
                      const playerScore = scores[group.id]?.[currentHole]?.[pIdx] ?? null;
                      const isBestTwo = (() => {
                        const arr = scores[group.id]?.[currentHole];
                        if (!arr) return false;
                        const indexed = arr
                          .map((v, i) => ({ v, i }))
                          .filter((x) => typeof x.v === 'number')
                          .sort((a, b) => a.v - b.v);
                        return indexed.slice(0, 2).some((x) => x.i === pIdx);
                      })();
                      const displayName = player || `Player ${pIdx + 1}`;
                      const isEmpty = !player;
                      return (
                        <div key={pIdx} style={styles.playerRow}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={player}
                              placeholder={`Player ${pIdx + 1}`}
                              onChange={(e) => updatePlayerName(group.id, pIdx, e.target.value)}
                              style={styles.playerNameInput}
                            />
                          ) : (
                            <div
                              style={{
                                ...styles.playerName,
                                ...(isBestTwo ? styles.playerNameBest : {}),
                                ...(isEmpty ? styles.playerNameEmpty : {}),
                              }}
                            >
                              {displayName}
                              {isBestTwo && <span style={styles.bestDot}>•</span>}
                            </div>
                          )}
                          <div style={styles.scoreButtons}>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                              <button
                                key={n}
                                className={`score-btn ${playerScore === n ? 'active' : ''}`}
                                style={styles.scoreBtn}
                                onClick={() =>
                                  setPlayerScore(
                                    group.id,
                                    currentHole,
                                    pIdx,
                                    playerScore === n ? null : n
                                  )
                                }
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={styles.footer}>
            <button onClick={handleReset} style={styles.resetBtn}>
              <RotateCcw size={14} /> Reset Round
            </button>
          </div>
        </main>
      )}

      {view === 'scoreboard' && (
        <main style={styles.main}>
          <div style={styles.leaderboard}>
            <div style={styles.leaderboardHeader}>
              <Trophy size={18} style={{ color: '#c89b3c' }} />
              <span style={styles.leaderboardTitle}>Leaderboard</span>
            </div>
            {standings.map((s, idx) => (
              <div key={s.id} style={styles.standingRow}>
                <div style={styles.standingPos}>{idx + 1}</div>
                <div style={styles.standingMain}>
                  <div style={styles.standingName}>{s.name}</div>
                  <div style={styles.standingMeta}>
                    {s.holesPlayed === 0
                      ? 'No scores yet'
                      : `Thru ${s.holesPlayed} · ${s.total} strokes`}
                  </div>
                </div>
                <div style={styles.standingScore}>
                  {s.holesPlayed === 0 ? (
                    <span style={styles.standingDash}>—</span>
                  ) : (
                    <span
                      style={{
                        color:
                          s.toPar < 0
                            ? '#c89b3c'
                            : s.toPar > 0
                            ? '#a83232'
                            : '#1a3a2a',
                      }}
                    >
                      {s.toPar === 0 ? 'E' : s.toPar > 0 ? `+${s.toPar}` : s.toPar}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={styles.fullCard}>
            <div style={styles.fullCardHeader}>Hole-by-Hole · Best Ball</div>
            <div style={styles.fullCardScroll}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={{ ...styles.th, textAlign: 'left' }}>Hole</th>
                    {Array.from({ length: 18 }).map((_, i) => (
                      <th key={i} style={styles.th}>
                        {i + 1}
                      </th>
                    ))}
                    <th style={{ ...styles.th, background: '#1a3a2a', color: '#f5efe0' }}>Tot</th>
                  </tr>
                  <tr>
                    <td style={{ ...styles.parCell, textAlign: 'left' }}>Par</td>
                    {pars.map((p, i) => (
                      <td key={i} style={styles.parCell}>
                        {p}
                      </td>
                    ))}
                    <td style={{ ...styles.parCell, fontWeight: 700 }}>
                      {pars.reduce((a, b) => a + b, 0)}
                    </td>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => {
                    const { total, holesPlayed } = groupTotal(g.id);
                    return (
                      <tr key={g.id}>
                        <td style={{ ...styles.td, textAlign: 'left', fontWeight: 600 }}>
                          {g.name}
                        </td>
                        {Array.from({ length: 18 }).map((_, i) => {
                          const bb = bestBallForHole(g.id, i);
                          const par = pars[i];
                          let color = '#2a3a2a';
                          if (bb !== null) {
                            if (bb - par * 2 < 0) color = '#c89b3c';
                            else if (bb - par * 2 > 0) color = '#a83232';
                          }
                          return (
                            <td key={i} style={{ ...styles.td, color }}>
                              {bb ?? '–'}
                            </td>
                          );
                        })}
                        <td
                          style={{
                            ...styles.td,
                            fontWeight: 700,
                            background: '#f0e9d6',
                          }}
                        >
                          {holesPlayed > 0 ? total : '–'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}

function SyncIndicator({ status }) {
  const config = {
    connecting: { Icon: Loader2, color: '#c89b3c', label: 'Connecting', spin: true },
    saving: { Icon: Loader2, color: '#c89b3c', label: 'Saving', spin: true },
    synced: { Icon: Wifi, color: '#9bc89b', label: 'Live' },
    error: { Icon: WifiOff, color: '#e89b9b', label: 'Offline' },
  }[status] || { Icon: Wifi, color: '#9bc89b', label: 'Live' };

  const { Icon, color, label, spin } = config;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color, fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .sync-spin { animation: spin 1s linear infinite; }
      `}</style>
      <Icon size={12} className={spin ? 'sync-spin' : ''} />
      <span>{label}</span>
    </div>
  );
}

const styles = {
  app: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #f5efe0 0%, #ebe3cf 100%)',
    fontFamily: "'Inter', -apple-system, sans-serif",
    color: '#1a2a1a',
    paddingBottom: 40,
  },
  loading: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f5efe0',
    fontFamily: "'Cormorant Garamond', serif",
  },
  loadingText: {
    fontSize: 20,
    color: '#1a3a2a',
    fontStyle: 'italic',
  },
  header: {
    background: '#1a3a2a',
    borderBottom: '3px solid #c89b3c',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  headerInner: {
    maxWidth: 900,
    margin: '0 auto',
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 26,
    fontWeight: 600,
    color: '#f5efe0',
    letterSpacing: '0.02em',
    lineHeight: 1,
  },
  subtitle: {
    fontSize: 10,
    color: '#c89b3c',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    marginTop: 4,
    fontWeight: 500,
  },
  tabs: {
    display: 'flex',
    gap: 0,
    background: '#0f2a1c',
    borderRadius: 6,
    padding: 3,
  },
  tab: {
    flex: 1,
    padding: '10px 16px',
    background: 'transparent',
    border: 'none',
    color: '#a8b8a8',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    borderRadius: 4,
    fontFamily: 'inherit',
    transition: 'all 0.2s',
  },
  main: {
    maxWidth: 900,
    margin: '0 auto',
    padding: '20px 16px',
  },
  holeNav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#fffaeb',
    border: '1px solid #d4c89a',
    borderRadius: 10,
    padding: '14px 16px',
    marginBottom: 12,
    boxShadow: '0 1px 0 rgba(26,58,42,0.05)',
  },
  navBtn: {
    background: '#fffaeb',
    border: '1.5px solid #1a3a2a',
    color: '#1a3a2a',
    width: 40,
    height: 40,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  holeDisplay: {
    textAlign: 'center',
  },
  holeLabel: {
    fontSize: 10,
    letterSpacing: '0.2em',
    color: '#7a8a7a',
    textTransform: 'uppercase',
    fontWeight: 600,
  },
  holeNumber: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 44,
    fontWeight: 600,
    color: '#1a3a2a',
    lineHeight: 1,
    margin: '2px 0 4px',
  },
  parRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  parLabel: {
    fontSize: 10,
    letterSpacing: '0.15em',
    color: '#7a8a7a',
    textTransform: 'uppercase',
    fontWeight: 600,
  },
  parInput: {
    width: 36,
    padding: '2px 4px',
    border: '1px solid #d4c89a',
    borderRadius: 4,
    background: '#f5efe0',
    fontSize: 13,
    fontWeight: 600,
    textAlign: 'center',
    color: '#1a3a2a',
    fontFamily: 'inherit',
  },
  holeStrip: {
    display: 'grid',
    gridTemplateColumns: 'repeat(9, 1fr)',
    gap: 4,
    marginBottom: 16,
  },
  holeChip: {
    padding: '6px 0',
    background: '#fffaeb',
    border: '1px solid #d4c89a',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    color: '#5a6a5a',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  holeChipActive: {
    background: '#1a3a2a',
    borderColor: '#1a3a2a',
    color: '#f5efe0',
  },
  holeChipDone: {
    background: '#c89b3c',
    borderColor: '#c89b3c',
    color: '#1a3a2a',
  },
  groupsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  groupCard: {
    background: '#fffaeb',
    border: '1px solid #d4c89a',
    borderRadius: 10,
    overflow: 'hidden',
    boxShadow: '0 1px 2px rgba(26,58,42,0.06)',
  },
  groupHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: 'linear-gradient(180deg, #f0e9d6 0%, #ebe3cf 100%)',
    borderBottom: '1px solid #d4c89a',
    gap: 12,
  },
  groupName: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 22,
    fontWeight: 600,
    color: '#1a3a2a',
  },
  groupNameInput: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 22,
    fontWeight: 600,
    color: '#1a3a2a',
    background: '#fffaeb',
    border: '1px solid #1a3a2a',
    borderRadius: 4,
    padding: '2px 8px',
    flex: 1,
  },
  groupHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  bestBallBadge: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 6,
    background: '#1a3a2a',
    color: '#f5efe0',
    padding: '4px 10px',
    borderRadius: 16,
  },
  bestBallLabel: {
    fontSize: 9,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    opacity: 0.7,
    fontWeight: 600,
  },
  bestBallValue: {
    fontSize: 16,
    fontWeight: 700,
    fontFamily: "'Cormorant Garamond', serif",
  },
  bestBallPar: {
    fontSize: 11,
    fontWeight: 600,
    background: '#f5efe0',
    padding: '1px 6px',
    borderRadius: 8,
  },
  editBtn: {
    background: 'transparent',
    border: '1px solid #5a6a5a',
    color: '#5a6a5a',
    width: 28,
    height: 28,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  playersGrid: {
    padding: '8px 12px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  playerRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: '8px 4px',
    borderBottom: '1px dashed #e4dcc4',
  },
  playerName: {
    fontSize: 13,
    fontWeight: 500,
    color: '#2a3a2a',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  playerNameBest: {
    color: '#c89b3c',
    fontWeight: 700,
  },
  playerNameEmpty: {
    color: '#a8a896',
    fontStyle: 'italic',
  },
  bestDot: {
    color: '#c89b3c',
    fontSize: 18,
    lineHeight: 0,
  },
  playerNameInput: {
    fontSize: 13,
    fontWeight: 500,
    color: '#2a3a2a',
    background: '#f5efe0',
    border: '1px solid #d4c89a',
    borderRadius: 4,
    padding: '4px 8px',
    fontFamily: 'inherit',
  },
  scoreButtons: {
    display: 'grid',
    gridTemplateColumns: 'repeat(9, 1fr)',
    gap: 4,
  },
  scoreBtn: {
    padding: '8px 0',
    background: '#fffaeb',
    border: '1.5px solid #d4c89a',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    color: '#1a3a2a',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  footer: {
    marginTop: 24,
    display: 'flex',
    justifyContent: 'center',
  },
  resetBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'transparent',
    border: '1px solid #a83232',
    color: '#a83232',
    padding: '8px 16px',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  leaderboard: {
    background: '#fffaeb',
    border: '1px solid #d4c89a',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 16,
    boxShadow: '0 1px 2px rgba(26,58,42,0.06)',
  },
  leaderboardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '14px 18px',
    background: '#1a3a2a',
    color: '#f5efe0',
  },
  leaderboardTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 20,
    fontWeight: 600,
    letterSpacing: '0.04em',
  },
  standingRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 18px',
    borderBottom: '1px solid #ebe3cf',
    gap: 14,
  },
  standingPos: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 28,
    fontWeight: 600,
    color: '#c89b3c',
    width: 32,
    textAlign: 'center',
  },
  standingMain: {
    flex: 1,
  },
  standingName: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 20,
    fontWeight: 600,
    color: '#1a3a2a',
    lineHeight: 1.2,
  },
  standingMeta: {
    fontSize: 11,
    color: '#7a8a7a',
    marginTop: 2,
    letterSpacing: '0.04em',
  },
  standingScore: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 30,
    fontWeight: 700,
  },
  standingDash: {
    color: '#c4bca4',
  },
  fullCard: {
    background: '#fffaeb',
    border: '1px solid #d4c89a',
    borderRadius: 10,
    overflow: 'hidden',
    boxShadow: '0 1px 2px rgba(26,58,42,0.06)',
  },
  fullCardHeader: {
    padding: '12px 18px',
    background: 'linear-gradient(180deg, #f0e9d6 0%, #ebe3cf 100%)',
    borderBottom: '1px solid #d4c89a',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#1a3a2a',
  },
  fullCardScroll: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 12,
    minWidth: 600,
  },
  th: {
    padding: '8px 6px',
    background: '#f0e9d6',
    color: '#1a3a2a',
    fontWeight: 700,
    fontSize: 11,
    textAlign: 'center',
    borderBottom: '1px solid #d4c89a',
  },
  parCell: {
    padding: '6px',
    textAlign: 'center',
    fontSize: 10,
    color: '#7a8a7a',
    background: '#faf4e3',
    borderBottom: '1px solid #d4c89a',
    fontWeight: 500,
  },
  td: {
    padding: '10px 6px',
    textAlign: 'center',
    borderBottom: '1px solid #ebe3cf',
    fontWeight: 500,
  },
};
