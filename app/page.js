'use client';

import React, { useState, useEffect } from 'react';
import {
  Trophy, Flag, ChevronLeft, ChevronRight, RotateCcw, Edit2, Check,
  Wifi, WifiOff, Loader2, Users, User, Settings, Award,
  Target, Wind, Crosshair, Pencil, X,
} from 'lucide-react';
import { useRound } from '../lib/useRound';

const MY_GROUP_KEY = 'bestball-my-group-id';

// Hole index (0-17) -> competition config
const COMPETITIONS = {
  6: { id: 'ffp', label: 'Furthest From Pin', short: 'FFP', Icon: Target, color: '#7a4ec2' },
  10: { id: 'ld', label: 'Long Drive', short: 'LD', Icon: Wind, color: '#1a3a2a' },
  13: { id: 'ctp', label: 'Closest To Pin', short: 'CTP', Icon: Crosshair, color: '#c89b3c' },
};

export default function GolfScorecard() {
  const {
    groups, pars, scores, competitions, loaded, syncStatus,
    updateGroups, updatePars, updateScores, updateCompetitions, resetScores,
  } = useRound();

  const [currentHole, setCurrentHole] = useState(0);
  const [view, setView] = useState('my-group');
  const [editingGroup, setEditingGroup] = useState(null);
  const [myGroupId, setMyGroupId] = useState(null);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [editingComp, setEditingComp] = useState(null); // 'ld' | 'ctp' | 'ffp' | null
  const [compInput, setCompInput] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(MY_GROUP_KEY);
      if (saved) setMyGroupId(parseInt(saved, 10));
    } catch (e) {}
  }, []);

  const pickGroup = (id) => {
    setMyGroupId(id);
    try { localStorage.setItem(MY_GROUP_KEY, String(id)); } catch (e) {}
    setShowGroupPicker(false);
  };

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
    let total = 0, holesPlayed = 0;
    for (let h = 0; h < 18; h++) {
      const bb = bestBallForHole(groupId, h);
      if (bb !== null) { total += bb; holesPlayed++; }
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

  // Individual player stats
  const playerStats = (groupId, playerIdx) => {
    let total = 0, holesPlayed = 0, parPlayed = 0;
    for (let h = 0; h < 18; h++) {
      const v = scores[groupId]?.[h]?.[playerIdx];
      if (typeof v === 'number') {
        total += v;
        holesPlayed++;
        parPlayed += pars[h];
      }
    }
    return { total, holesPlayed, parPlayed, toPar: total - parPlayed };
  };

  const teamStandings = groups
    .map((g) => {
      const { total, holesPlayed } = groupTotal(g.id);
      const parPlayed = groupParForHolesPlayed(g.id);
      // For team best ball, the team's "par" for each hole is 2x (two players' contributions)
      return { ...g, total, holesPlayed, parPlayed, toPar: total - parPlayed * 2 };
    })
    .sort((a, b) => {
      if (a.holesPlayed === 0 && b.holesPlayed === 0) return a.id - b.id;
      if (a.holesPlayed === 0) return 1;
      if (b.holesPlayed === 0) return -1;
      return a.toPar - b.toPar;
    });

  const playerStandings = [];
  groups.forEach((g) => {
    g.players.forEach((name, pIdx) => {
      if (!name) return; // skip empty slots
      const stats = playerStats(g.id, pIdx);
      playerStandings.push({
        name,
        groupId: g.id,
        groupName: g.name,
        playerIdx: pIdx,
        ...stats,
      });
    });
  });
  playerStandings.sort((a, b) => {
    if (a.holesPlayed === 0 && b.holesPlayed === 0) return a.name.localeCompare(b.name);
    if (a.holesPlayed === 0) return 1;
    if (b.holesPlayed === 0) return -1;
    return a.toPar - b.toPar;
  });

  const handleReset = () => {
    if (confirm('Reset all scores AND competition winners for everyone? This cannot be undone.')) {
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

  const saveCompWinner = (compId) => {
    const name = compInput.trim();
    updateCompetitions((prev) => {
      const next = { ...prev };
      if (name) {
        next[compId] = { winner: name };
      } else {
        delete next[compId];
      }
      return next;
    });
    setEditingComp(null);
    setCompInput('');
  };

  if (!loaded) {
    return (
      <div style={styles.loading}>
        <div style={styles.loadingText}>Loading round…</div>
      </div>
    );
  }

  const myGroup = groups.find((g) => g.id === myGroupId) || null;
  const visibleGroups =
    view === 'my-group' ? (myGroup ? [myGroup] : []) : groups;
  const currentCompetition = COMPETITIONS[currentHole];

  return (
    <div style={styles.app}>
      <style>{`
        * { box-sizing: border-box; }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type="number"] { -moz-appearance: textfield; }
        .score-btn { transition: all 0.15s ease; }
        .score-btn:hover { background: #f5efe0 !important; border-color: #1a3a2a !important; }
        .score-btn.active { background: #1a3a2a !important; color: #f5efe0 !important; border-color: #1a3a2a !important; }
        .nav-btn:hover:not(:disabled) { background: #1a3a2a !important; color: #f5efe0 !important; }
        .nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .tab-btn.active { background: #1a3a2a !important; color: #f5efe0 !important; }
        .picker-btn:hover { background: #f0e9d6 !important; border-color: #1a3a2a !important; }
        .lb-tab.active { background: #1a3a2a !important; color: #f5efe0 !important; }
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
            <button className={`tab-btn ${view === 'my-group' ? 'active' : ''}`} style={styles.tab} onClick={() => setView('my-group')}>
              <User size={12} style={{ marginRight: 4, verticalAlign: '-2px' }} />
              My Group
            </button>
            <button className={`tab-btn ${view === 'all-groups' ? 'active' : ''}`} style={styles.tab} onClick={() => setView('all-groups')}>
              <Users size={12} style={{ marginRight: 4, verticalAlign: '-2px' }} />
              All Groups
            </button>
            <button className={`tab-btn ${view === 'scoreboard' ? 'active' : ''}`} style={styles.tab} onClick={() => setView('scoreboard')}>
              <Trophy size={12} style={{ marginRight: 4, verticalAlign: '-2px' }} />
              Scoreboard
            </button>
          </div>
        </div>
      </header>

      {view === 'my-group' && (!myGroup || showGroupPicker) && (
        <GroupPicker
          groups={groups}
          currentId={myGroupId}
          onPick={pickGroup}
          onCancel={myGroup ? () => setShowGroupPicker(false) : null}
        />
      )}

      {(view === 'my-group' || view === 'all-groups') && !(view === 'my-group' && (!myGroup || showGroupPicker)) && (
        <main style={styles.main}>
          {view === 'my-group' && myGroup && (
            <div style={styles.myGroupBar}>
              <div style={styles.myGroupBarText}>
                Entering scores for <strong>{myGroup.name}</strong>
              </div>
              <button onClick={() => setShowGroupPicker(true)} style={styles.changeGroupBtn}>
                <Settings size={12} /> Change
              </button>
            </div>
          )}

          <div style={styles.holeNav}>
            <button className="nav-btn" style={styles.navBtn} onClick={() => setCurrentHole(Math.max(0, currentHole - 1))} disabled={currentHole === 0}>
              <ChevronLeft size={18} />
            </button>
            <div style={styles.holeDisplay}>
              <div style={styles.holeLabel}>Hole</div>
              <div style={styles.holeNumberRow}>
                <div style={styles.holeNumber}>{currentHole + 1}</div>
                {currentCompetition && (
                  <CompetitionBadge comp={currentCompetition} size="lg" />
                )}
              </div>
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
              {currentCompetition && (
                <CompetitionInline
                  comp={currentCompetition}
                  winner={competitions[currentCompetition.id]?.winner}
                  onEdit={() => {
                    setEditingComp(currentCompetition.id);
                    setCompInput(competitions[currentCompetition.id]?.winner || '');
                  }}
                />
              )}
            </div>
            <button className="nav-btn" style={styles.navBtn} onClick={() => setCurrentHole(Math.min(17, currentHole + 1))} disabled={currentHole === 17}>
              <ChevronRight size={18} />
            </button>
          </div>

          <div style={styles.holeStrip}>
            {Array.from({ length: 18 }).map((_, i) => {
              const groupsToCheck = view === 'my-group' && myGroup ? [myGroup] : groups;
              const allEntered = groupsToCheck.every((g) => bestBallForHole(g.id, i) !== null);
              const comp = COMPETITIONS[i];
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
                  <span>{i + 1}</span>
                  {comp && (
                    <comp.Icon
                      size={9}
                      style={{
                        marginLeft: 3,
                        color: i === currentHole ? '#c89b3c' : comp.color,
                        verticalAlign: '-1px',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div style={styles.groupsList}>
            {visibleGroups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                currentHole={currentHole}
                par={pars[currentHole]}
                scores={scores}
                isEditing={editingGroup === group.id}
                onToggleEdit={() => setEditingGroup(editingGroup === group.id ? null : group.id)}
                onUpdateGroupName={(name) => updateGroupName(group.id, name)}
                onUpdatePlayerName={(idx, name) => updatePlayerName(group.id, idx, name)}
                onSetScore={(playerIdx, value) => setPlayerScore(group.id, currentHole, playerIdx, value)}
                bestBall={bestBallForHole(group.id, currentHole)}
                isMyGroup={group.id === myGroupId}
              />
            ))}
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
          {/* 1. Group leaderboard */}
          <div style={styles.leaderboard}>
            <div style={styles.leaderboardHeader}>
              <Trophy size={18} style={{ color: '#c89b3c' }} />
              <span style={styles.leaderboardTitle}>Groups</span>
            </div>
            {teamStandings.map((s, idx) => (
              <div key={s.id} style={{ ...styles.standingRow, ...(s.id === myGroupId ? styles.standingRowMine : {}) }}>
                <div style={styles.standingPos}>{idx + 1}</div>
                <div style={styles.standingMain}>
                  <div style={styles.standingName}>
                    {s.name}
                    {s.id === myGroupId && <span style={styles.youBadge}>YOU</span>}
                  </div>
                  <div style={styles.standingMeta}>
                    {s.holesPlayed === 0 ? 'No scores yet' : `Thru ${s.holesPlayed} · ${s.total} strokes`}
                  </div>
                </div>
                <div style={styles.standingScore}>
                  {s.holesPlayed === 0 ? (
                    <span style={styles.standingDash}>—</span>
                  ) : (
                    <span style={{ color: s.toPar < 0 ? '#c89b3c' : s.toPar > 0 ? '#a83232' : '#1a3a2a' }}>
                      {s.toPar === 0 ? 'E' : s.toPar > 0 ? `+${s.toPar}` : s.toPar}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 2. Competitions panel */}
          <div style={styles.compPanel}>
            <div style={styles.compPanelHeader}>
              <Award size={16} style={{ color: '#c89b3c' }} />
              <span style={styles.compPanelTitle}>Competitions</span>
            </div>
            {Object.entries(COMPETITIONS).map(([holeIdx, comp]) => {
              const winner = competitions[comp.id]?.winner;
              return (
                <div key={comp.id} style={styles.compRow}>
                  <div style={styles.compRowLeft}>
                    <div style={{ ...styles.compIconBox, background: comp.color }}>
                      <comp.Icon size={16} color="#f5efe0" />
                    </div>
                    <div>
                      <div style={styles.compRowLabel}>{comp.label}</div>
                      <div style={styles.compRowHole}>Hole {parseInt(holeIdx) + 1}</div>
                    </div>
                  </div>
                  <div style={styles.compRowRight}>
                    {winner ? (
                      <>
                        <div style={styles.compWinnerName}>{winner}</div>
                        <button
                          onClick={() => {
                            setEditingComp(comp.id);
                            setCompInput(winner);
                          }}
                          style={styles.compEditBtn}
                          aria-label="Edit winner"
                        >
                          <Pencil size={12} />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingComp(comp.id);
                          setCompInput('');
                        }}
                        style={styles.compSetBtn}
                      >
                        Set winner
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 3. Individual leaderboard */}
          <div style={styles.leaderboard}>
            <div style={styles.leaderboardHeader}>
              <User size={18} style={{ color: '#c89b3c' }} />
              <span style={styles.leaderboardTitle}>Individuals</span>
            </div>
            {playerStandings.map((p, idx) => (
              <div
                key={`${p.groupId}-${p.playerIdx}`}
                style={{ ...styles.standingRow, ...(p.groupId === myGroupId ? styles.standingRowMine : {}) }}
              >
                <div style={styles.standingPos}>{idx + 1}</div>
                <div style={styles.standingMain}>
                  <div style={styles.standingName}>
                    {p.name}
                    {p.groupId === myGroupId && <span style={styles.youBadge}>YOU</span>}
                  </div>
                  <div style={styles.standingMeta}>
                    {p.holesPlayed === 0
                      ? `${p.groupName} · No scores yet`
                      : `${p.groupName} · Thru ${p.holesPlayed} · ${p.total} strokes`}
                  </div>
                </div>
                <div style={styles.standingScore}>
                  {p.holesPlayed === 0 ? (
                    <span style={styles.standingDash}>—</span>
                  ) : (
                    <span style={{ color: p.toPar < 0 ? '#c89b3c' : p.toPar > 0 ? '#a83232' : '#1a3a2a' }}>
                      {p.toPar === 0 ? 'E' : p.toPar > 0 ? `+${p.toPar}` : p.toPar}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Hole-by-hole grid */}
          <div style={styles.fullCard}>
            <div style={styles.fullCardHeader}>Hole-by-Hole · Best Ball</div>
            <div style={styles.fullCardScroll}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={{ ...styles.th, textAlign: 'left' }}>Hole</th>
                    {Array.from({ length: 18 }).map((_, i) => {
                      const comp = COMPETITIONS[i];
                      return (
                        <th key={i} style={styles.th}>
                          <div style={styles.thInner}>
                            {i + 1}
                            {comp && (
                              <comp.Icon
                                size={10}
                                style={{ marginLeft: 2, color: comp.color, verticalAlign: '-1px' }}
                              />
                            )}
                          </div>
                        </th>
                      );
                    })}
                    <th style={{ ...styles.th, background: '#1a3a2a', color: '#f5efe0' }}>Tot</th>
                  </tr>
                  <tr>
                    <td style={{ ...styles.parCell, textAlign: 'left' }}>Par</td>
                    {pars.map((p, i) => (
                      <td key={i} style={styles.parCell}>{p}</td>
                    ))}
                    <td style={{ ...styles.parCell, fontWeight: 700 }}>{pars.reduce((a, b) => a + b, 0)}</td>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => {
                    const { total, holesPlayed } = groupTotal(g.id);
                    const isMine = g.id === myGroupId;
                    return (
                      <tr key={g.id} style={isMine ? { background: '#fff5db' } : undefined}>
                        <td style={{ ...styles.td, textAlign: 'left', fontWeight: 600 }}>
                          {g.name}
                          {isMine && <span style={styles.youBadgeSmall}>YOU</span>}
                        </td>
                        {Array.from({ length: 18 }).map((_, i) => {
                          const bb = bestBallForHole(g.id, i);
                          const par = pars[i];
                          const diff = bb !== null ? bb - par * 2 : null;
                          return (
                            <td key={i} style={styles.td}>
                              {bb !== null ? (
                                <ScoreMarker value={bb} diff={diff} size="sm" />
                              ) : (
                                <span style={{ color: '#bbb' }}>–</span>
                              )}
                            </td>
                          );
                        })}
                        <td style={{ ...styles.td, fontWeight: 700, background: isMine ? '#f0e2a8' : '#f0e9d6' }}>
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

      {/* Competition winner edit modal */}
      {editingComp && (
        <div style={styles.modalBackdrop} onClick={() => setEditingComp(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>
                {COMPETITIONS[Object.keys(COMPETITIONS).find((k) => COMPETITIONS[k].id === editingComp)].label}
              </div>
              <button onClick={() => setEditingComp(null)} style={styles.modalClose} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div style={styles.modalBody}>
              <label style={styles.modalLabel}>Winner</label>
              <input
                type="text"
                value={compInput}
                onChange={(e) => setCompInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveCompWinner(editingComp); }}
                placeholder="Player name"
                style={styles.modalInput}
                autoFocus
              />
              <div style={styles.modalActions}>
                {competitions[editingComp]?.winner && (
                  <button
                    onClick={() => { setCompInput(''); saveCompWinner(editingComp); }}
                    style={styles.modalClearBtn}
                  >
                    Clear
                  </button>
                )}
                <div style={{ flex: 1 }} />
                <button onClick={() => setEditingComp(null)} style={styles.modalCancelBtn}>
                  Cancel
                </button>
                <button onClick={() => saveCompWinner(editingComp)} style={styles.modalSaveBtn}>
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============== COMPETITION COMPONENTS ============== */

function CompetitionBadge({ comp, size = 'sm' }) {
  const dims = {
    sm: { box: 18, icon: 11, font: 8 },
    lg: { box: 28, icon: 16, font: 9 },
  }[size];
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: comp.color,
        color: '#f5efe0',
        padding: size === 'lg' ? '3px 8px' : '2px 5px',
        borderRadius: 4,
        fontSize: dims.font,
        fontWeight: 700,
        letterSpacing: '0.1em',
      }}
    >
      <comp.Icon size={dims.icon} />
      <span>{comp.short}</span>
    </div>
  );
}

function CompetitionInline({ comp, winner, onEdit }) {
  return (
    <button
      onClick={onEdit}
      style={{
        marginTop: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: '#fff5db',
        border: `1px solid ${comp.color}55`,
        borderRadius: 6,
        padding: '5px 10px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 11,
        color: '#1a3a2a',
        margin: '8px auto 0',
      }}
    >
      <comp.Icon size={12} style={{ color: comp.color }} />
      <span style={{ fontWeight: 600 }}>{comp.label}:</span>
      <span style={{ color: winner ? '#1a3a2a' : '#7a8a7a', fontStyle: winner ? 'normal' : 'italic' }}>
        {winner || 'tap to set winner'}
      </span>
    </button>
  );
}

/* ============== GROUP CARD ============== */

function GroupCard({
  group, currentHole, par, scores,
  isEditing, onToggleEdit,
  onUpdateGroupName, onUpdatePlayerName, onSetScore,
  bestBall, isMyGroup,
}) {
  const maxScore = par * 2;

  return (
    <div style={{ ...styles.groupCard, ...(isMyGroup ? styles.groupCardMine : {}) }}>
      <div style={styles.groupHeader}>
        {isEditing ? (
          <input
            type="text"
            value={group.name}
            onChange={(e) => onUpdateGroupName(e.target.value)}
            style={styles.groupNameInput}
            autoFocus
          />
        ) : (
          <div style={styles.groupNameRow}>
            <div style={styles.groupName}>{group.name}</div>
            {isMyGroup && <span style={styles.youBadge}>YOU</span>}
          </div>
        )}
        <div style={styles.groupHeaderRight}>
          {bestBall !== null && (
            <div style={styles.bestBallBadge}>
              <span style={styles.bestBallLabel}>Best Ball</span>
              <ScoreMarker value={bestBall} diff={bestBall - par * 2} size="md" inverted />
              <span
                style={{
                  ...styles.bestBallPar,
                  color: bestBall - par * 2 < 0 ? '#c89b3c' : bestBall - par * 2 > 0 ? '#e89b9b' : '#c4c4ac',
                }}
              >
                {bestBall - par * 2 === 0 ? 'E' : bestBall - par * 2 > 0 ? `+${bestBall - par * 2}` : bestBall - par * 2}
              </span>
            </div>
          )}
          <button onClick={onToggleEdit} style={styles.editBtn} aria-label="Edit names">
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
                  onChange={(e) => onUpdatePlayerName(pIdx, e.target.value)}
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
              <div style={{ ...styles.scoreButtons, gridTemplateColumns: `repeat(${maxScore}, 1fr)` }}>
                {Array.from({ length: maxScore }).map((_, i) => {
                  const n = i + 1;
                  const isActive = playerScore === n;
                  return (
                    <button
                      key={n}
                      className={`score-btn ${isActive ? 'active' : ''}`}
                      style={styles.scoreBtn}
                      onClick={() => onSetScore(pIdx, isActive ? null : n)}
                    >
                      <ScoreMarker value={n} diff={n - par} size="btn" inverted={isActive} />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============== GROUP PICKER ============== */

function GroupPicker({ groups, currentId, onPick, onCancel }) {
  return (
    <main style={styles.main}>
      <div style={styles.pickerCard}>
        <div style={styles.pickerHeader}>
          <div style={styles.pickerTitle}>
            {currentId ? 'Change Your Group' : 'Welcome — Pick Your Group'}
          </div>
          <div style={styles.pickerSub}>
            {currentId
              ? 'Switch to a different group on this device.'
              : "We'll remember this on your phone so you only see your group's scores by default."}
          </div>
        </div>
        <div style={styles.pickerList}>
          {groups.map((g) => (
            <button
              key={g.id}
              className="picker-btn"
              style={{ ...styles.pickerBtn, ...(currentId === g.id ? styles.pickerBtnActive : {}) }}
              onClick={() => onPick(g.id)}
            >
              <div style={styles.pickerBtnName}>{g.name}</div>
              <div style={styles.pickerBtnPlayers}>
                {g.players.filter(Boolean).join(' · ') || '—'}
              </div>
            </button>
          ))}
        </div>
        {onCancel && (
          <button onClick={onCancel} style={styles.pickerCancel}>Cancel</button>
        )}
      </div>
    </main>
  );
}

/* ============== SCORE MARKER ============== */

function ScoreMarker({ value, diff, size = 'sm', inverted = false }) {
  const sizes = {
    sm: { box: 22, font: 12, stroke: 0.9, inner: 18, outer: 22 },
    md: { box: 24, font: 16, stroke: 1.1, inner: 20, outer: 24 },
    btn: { box: 22, font: 13, stroke: 0.9, inner: 19, outer: 23 },
  };
  const s = sizes[size];
  // Softer green-gray instead of the hard near-black green; lighter on inverted backgrounds
  const stroke = inverted ? 'rgba(245,239,224,0.75)' : 'rgba(26,58,42,0.55)';
  const text = inverted ? '#f5efe0' : '#1a3a2a';
  const showCircle = diff <= -1;
  const showDoubleCircle = diff <= -2;
  const showSquare = diff >= 1;
  const showDoubleSquare = diff >= 2;
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: s.box, height: s.box, verticalAlign: 'middle' }}>
      {(showCircle || showSquare) && (
        <svg width={s.box} height={s.box} viewBox={`0 0 ${s.box} ${s.box}`} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
          {showCircle && <circle cx={s.box / 2} cy={s.box / 2} r={s.inner / 2} fill="none" stroke={stroke} strokeWidth={s.stroke} />}
          {showDoubleCircle && <circle cx={s.box / 2} cy={s.box / 2} r={s.outer / 2 - 0.5} fill="none" stroke={stroke} strokeWidth={s.stroke} />}
          {showSquare && <rect x={(s.box - s.inner) / 2} y={(s.box - s.inner) / 2} width={s.inner} height={s.inner} fill="none" stroke={stroke} strokeWidth={s.stroke} />}
          {showDoubleSquare && <rect x={(s.box - s.outer) / 2 + 0.5} y={(s.box - s.outer) / 2 + 0.5} width={s.outer - 1} height={s.outer - 1} fill="none" stroke={stroke} strokeWidth={s.stroke} />}
        </svg>
      )}
      <span style={{ fontSize: s.font, fontWeight: 600, color: text, lineHeight: 1, position: 'relative', zIndex: 1 }}>{value}</span>
    </span>
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
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .sync-spin { animation: spin 1s linear infinite; }`}</style>
      <Icon size={12} className={spin ? 'sync-spin' : ''} />
      <span>{label}</span>
    </div>
  );
}

const styles = {
  app: { minHeight: '100vh', background: 'linear-gradient(180deg, #f5efe0 0%, #ebe3cf 100%)', fontFamily: "'Inter', -apple-system, sans-serif", color: '#1a2a1a', paddingBottom: 40 },
  loading: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5efe0', fontFamily: "'Cormorant Garamond', serif" },
  loadingText: { fontSize: 20, color: '#1a3a2a', fontStyle: 'italic' },
  header: { background: '#1a3a2a', borderBottom: '3px solid #c89b3c', position: 'sticky', top: 0, zIndex: 10 },
  headerInner: { maxWidth: 900, margin: '0 auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 },
  brand: { display: 'flex', alignItems: 'center', gap: 12 },
  title: { fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 600, color: '#f5efe0', letterSpacing: '0.02em', lineHeight: 1 },
  subtitle: { fontSize: 10, color: '#c89b3c', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 4, fontWeight: 500 },
  tabs: { display: 'flex', gap: 0, background: '#0f2a1c', borderRadius: 6, padding: 3 },
  tab: { flex: 1, padding: '10px 8px', background: 'transparent', border: 'none', color: '#a8b8a8', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 4, fontFamily: 'inherit', transition: 'all 0.2s', whiteSpace: 'nowrap' },
  main: { maxWidth: 900, margin: '0 auto', padding: '20px 16px' },
  myGroupBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff5db', border: '1px solid #d4c89a', borderRadius: 8, padding: '8px 14px', marginBottom: 12, fontSize: 12, color: '#1a3a2a' },
  myGroupBarText: { letterSpacing: '0.02em' },
  changeGroupBtn: { display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: '1px solid #5a6a5a', color: '#5a6a5a', padding: '4px 10px', borderRadius: 4, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit' },
  holeNav: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', background: '#fffaeb', border: '1px solid #d4c89a', borderRadius: 10, padding: '14px 16px', marginBottom: 12, boxShadow: '0 1px 0 rgba(26,58,42,0.05)' },
  navBtn: { background: '#fffaeb', border: '1.5px solid #1a3a2a', color: '#1a3a2a', width: 40, height: 40, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s', marginTop: 18, flexShrink: 0 },
  holeDisplay: { textAlign: 'center', flex: 1 },
  holeLabel: { fontSize: 10, letterSpacing: '0.2em', color: '#7a8a7a', textTransform: 'uppercase', fontWeight: 600 },
  holeNumberRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 },
  holeNumber: { fontFamily: "'Cormorant Garamond', serif", fontSize: 44, fontWeight: 600, color: '#1a3a2a', lineHeight: 1, margin: '2px 0 4px' },
  parRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  parLabel: { fontSize: 10, letterSpacing: '0.15em', color: '#7a8a7a', textTransform: 'uppercase', fontWeight: 600 },
  parInput: { width: 36, padding: '2px 4px', border: '1px solid #d4c89a', borderRadius: 4, background: '#f5efe0', fontSize: 13, fontWeight: 600, textAlign: 'center', color: '#1a3a2a', fontFamily: 'inherit' },
  holeStrip: { display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 4, marginBottom: 16 },
  holeChip: { padding: '6px 0', background: '#fffaeb', border: '1px solid #d4c89a', borderRadius: 4, fontSize: 11, fontWeight: 600, color: '#5a6a5a', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  holeChipActive: { background: '#1a3a2a', borderColor: '#1a3a2a', color: '#f5efe0' },
  holeChipDone: { background: '#c89b3c', borderColor: '#c89b3c', color: '#1a3a2a' },
  groupsList: { display: 'flex', flexDirection: 'column', gap: 12 },
  groupCard: { background: '#fffaeb', border: '1px solid #d4c89a', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 2px rgba(26,58,42,0.06)' },
  groupCardMine: { border: '2px solid #c89b3c', boxShadow: '0 2px 8px rgba(200,155,60,0.18)' },
  groupHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'linear-gradient(180deg, #f0e9d6 0%, #ebe3cf 100%)', borderBottom: '1px solid #d4c89a', gap: 12 },
  groupNameRow: { display: 'flex', alignItems: 'center', gap: 10 },
  groupName: { fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, color: '#1a3a2a' },
  groupNameInput: { fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, color: '#1a3a2a', background: '#fffaeb', border: '1px solid #1a3a2a', borderRadius: 4, padding: '2px 8px', flex: 1 },
  groupHeaderRight: { display: 'flex', alignItems: 'center', gap: 10 },
  bestBallBadge: { display: 'flex', alignItems: 'center', gap: 8, background: '#1a3a2a', padding: '5px 12px', borderRadius: 16 },
  bestBallLabel: { fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#a8b8a8', fontWeight: 600 },
  bestBallPar: { fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 8, background: 'rgba(245,239,224,0.1)' },
  editBtn: { background: 'transparent', border: '1px solid #5a6a5a', color: '#5a6a5a', width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  playersGrid: { padding: '8px 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 },
  playerRow: { display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 4px', borderBottom: '1px dashed #e4dcc4' },
  playerName: { fontSize: 13, fontWeight: 500, color: '#2a3a2a', display: 'flex', alignItems: 'center', gap: 6 },
  playerNameBest: { color: '#c89b3c', fontWeight: 700 },
  playerNameEmpty: { color: '#a8a896', fontStyle: 'italic' },
  bestDot: { color: '#c89b3c', fontSize: 18, lineHeight: 0 },
  playerNameInput: { fontSize: 13, fontWeight: 500, color: '#2a3a2a', background: '#f5efe0', border: '1px solid #d4c89a', borderRadius: 4, padding: '4px 8px', fontFamily: 'inherit' },
  scoreButtons: { display: 'grid', gap: 4 },
  scoreBtn: { padding: '6px 0', background: '#fffaeb', border: '1.5px solid #d4c89a', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 36 },
  footer: { marginTop: 24, display: 'flex', justifyContent: 'center' },
  resetBtn: { display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px solid #a83232', color: '#a83232', padding: '8px 16px', borderRadius: 6, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit' },
  pickerCard: { background: '#fffaeb', border: '1px solid #d4c89a', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(26,58,42,0.1)' },
  pickerHeader: { padding: '20px 20px 14px', background: 'linear-gradient(180deg, #f0e9d6 0%, #ebe3cf 100%)', borderBottom: '1px solid #d4c89a' },
  pickerTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 600, color: '#1a3a2a', lineHeight: 1.1 },
  pickerSub: { fontSize: 12, color: '#5a6a5a', marginTop: 6, lineHeight: 1.4 },
  pickerList: { padding: 12, display: 'flex', flexDirection: 'column', gap: 8 },
  pickerBtn: { background: '#fffaeb', border: '1.5px solid #d4c89a', borderRadius: 8, padding: '12px 14px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' },
  pickerBtnActive: { background: '#fff5db', borderColor: '#c89b3c', borderWidth: 2 },
  pickerBtnName: { fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: '#1a3a2a' },
  pickerBtnPlayers: { fontSize: 11, color: '#5a6a5a', marginTop: 3, lineHeight: 1.3 },
  pickerCancel: { width: '100%', background: 'transparent', border: 'none', borderTop: '1px solid #d4c89a', color: '#5a6a5a', padding: '12px', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit' },
  /* Competitions panel */
  compPanel: { background: '#fffaeb', border: '1px solid #d4c89a', borderRadius: 10, overflow: 'hidden', marginBottom: 16, boxShadow: '0 1px 2px rgba(26,58,42,0.06)' },
  compPanelHeader: { display: 'flex', alignItems: 'center', gap: 8, padding: '14px 18px', background: 'linear-gradient(180deg, #f0e9d6 0%, #ebe3cf 100%)', borderBottom: '1px solid #d4c89a' },
  compPanelTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: '#1a3a2a', letterSpacing: '0.04em' },
  compRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: '1px solid #ebe3cf', gap: 12 },
  compRowLeft: { display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  compIconBox: { width: 32, height: 32, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  compRowLabel: { fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 600, color: '#1a3a2a', lineHeight: 1.1 },
  compRowHole: { fontSize: 10, color: '#7a8a7a', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, marginTop: 2 },
  compRowRight: { display: 'flex', alignItems: 'center', gap: 8 },
  compWinnerName: { fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 600, color: '#c89b3c' },
  compEditBtn: { background: 'transparent', border: '1px solid #d4c89a', color: '#5a6a5a', width: 26, height: 26, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  compSetBtn: { background: '#1a3a2a', color: '#f5efe0', border: 'none', padding: '6px 12px', borderRadius: 4, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit' },
  /* Leaderboard */
  leaderboard: { background: '#fffaeb', border: '1px solid #d4c89a', borderRadius: 10, overflow: 'hidden', marginBottom: 16, boxShadow: '0 1px 2px rgba(26,58,42,0.06)' },
  leaderboardHeader: { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', background: '#1a3a2a', color: '#f5efe0' },
  leaderboardTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, letterSpacing: '0.04em', flex: 1 },
  lbTabs: { display: 'flex', background: '#0f2a1c', borderRadius: 4, padding: 2 },
  lbTab: { background: 'transparent', border: 'none', color: '#a8b8a8', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 10px', borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit' },
  standingRow: { display: 'flex', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid #ebe3cf', gap: 14 },
  standingRowMine: { background: '#fff5db' },
  standingPos: { fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 600, color: '#c89b3c', width: 32, textAlign: 'center' },
  standingMain: { flex: 1 },
  standingName: { fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, color: '#1a3a2a', lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: 8 },
  youBadge: { background: '#c89b3c', color: '#1a3a2a', fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', padding: '2px 6px', borderRadius: 3, fontFamily: "'Inter', sans-serif", lineHeight: 1.3 },
  youBadgeSmall: { background: '#c89b3c', color: '#1a3a2a', fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', padding: '1px 4px', borderRadius: 2, fontFamily: "'Inter', sans-serif", marginLeft: 6, verticalAlign: '1px' },
  standingMeta: { fontSize: 11, color: '#7a8a7a', marginTop: 2, letterSpacing: '0.04em' },
  standingScore: { fontFamily: "'Cormorant Garamond', serif", fontSize: 30, fontWeight: 700 },
  standingDash: { color: '#c4bca4' },
  fullCard: { background: '#fffaeb', border: '1px solid #d4c89a', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 2px rgba(26,58,42,0.06)' },
  fullCardHeader: { padding: '12px 18px', background: 'linear-gradient(180deg, #f0e9d6 0%, #ebe3cf 100%)', borderBottom: '1px solid #d4c89a', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#1a3a2a' },
  fullCardScroll: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 620 },
  th: { padding: '8px 4px', background: '#f0e9d6', color: '#1a3a2a', fontWeight: 700, fontSize: 11, textAlign: 'center', borderBottom: '1px solid #d4c89a' },
  thInner: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  parCell: { padding: '6px', textAlign: 'center', fontSize: 10, color: '#7a8a7a', background: '#faf4e3', borderBottom: '1px solid #d4c89a', fontWeight: 500 },
  td: { padding: '8px 4px', textAlign: 'center', borderBottom: '1px solid #ebe3cf', fontWeight: 500 },
  /* Modal */
  modalBackdrop: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(26,58,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 },
  modal: { background: '#fffaeb', border: '1px solid #d4c89a', borderRadius: 10, width: '100%', maxWidth: 380, boxShadow: '0 8px 32px rgba(26,58,42,0.3)', overflow: 'hidden' },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'linear-gradient(180deg, #f0e9d6 0%, #ebe3cf 100%)', borderBottom: '1px solid #d4c89a' },
  modalTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, color: '#1a3a2a' },
  modalClose: { background: 'transparent', border: 'none', color: '#5a6a5a', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalBody: { padding: 18 },
  modalLabel: { display: 'block', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#7a8a7a', fontWeight: 600, marginBottom: 6 },
  modalInput: { width: '100%', padding: '10px 12px', border: '1.5px solid #d4c89a', borderRadius: 6, background: '#f5efe0', fontSize: 16, color: '#1a3a2a', fontFamily: 'inherit' },
  modalActions: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 18 },
  modalClearBtn: { background: 'transparent', border: '1px solid #a83232', color: '#a83232', padding: '8px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit' },
  modalCancelBtn: { background: 'transparent', border: '1px solid #5a6a5a', color: '#5a6a5a', padding: '8px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit' },
  modalSaveBtn: { background: '#1a3a2a', color: '#f5efe0', border: 'none', padding: '8px 16px', borderRadius: 6, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit' },
};
