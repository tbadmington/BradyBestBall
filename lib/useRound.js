'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase, ROUND_ID } from './supabase';

const defaultGroups = [
  { id: 1, name: '8:30', players: ['Brady', 'Tim Bad', 'Kev Blum', 'Taylor Bum'] },
  { id: 2, name: '8:40', players: ['Rich Badmington', 'Tom Pynchon', 'Mike Scheeler', 'Don Blum'] },
  { id: 3, name: '8:50', players: ['Jack Voelker', 'Jonesi', 'Golz', ''] },
  { id: 4, name: '9:00', players: ['Eric Zuk', "Kevin O'Rourke", 'Anthony Belenbach', ''] },
  { id: 5, name: '9:10', players: ['Logan Monford', 'Josh', 'EJ Marklin', ''] },
];

// Clifton Park Golf Course, Baltimore — Par 71
const defaultPars = [5, 4, 4, 4, 4, 5, 3, 4, 4, 3, 4, 4, 4, 3, 3, 4, 4, 5];

// hole index (0-17) -> { id, label, short }
const defaultCompetitions = {
  // hole 7 (index 6): Furthest from pin
  // hole 11 (index 10): Long drive
  // hole 14 (index 13): Closest to pin
  // values: { winner: 'name' } when set
};

export function useRound() {
  const [groups, setGroups] = useState(defaultGroups);
  const [pars, setPars] = useState(defaultPars);
  const [scores, setScores] = useState({});
  const [competitions, setCompetitions] = useState(defaultCompetitions);
  const [loaded, setLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState('connecting');

  const stateRef = useRef({ groups, pars, scores, competitions });
  useEffect(() => {
    stateRef.current = { groups, pars, scores, competitions };
  }, [groups, pars, scores, competitions]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data, error } = await supabase
        .from('rounds')
        .select('groups, pars, scores, competitions')
        .eq('id', ROUND_ID)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        console.error('Load error', error);
        setSyncStatus('error');
        setLoaded(true);
        return;
      }

      if (data) {
        setGroups(data.groups || defaultGroups);
        setPars(data.pars || defaultPars);
        setScores(data.scores || {});
        setCompetitions(data.competitions || {});
      } else {
        const { error: insertError } = await supabase.from('rounds').insert({
          id: ROUND_ID,
          groups: defaultGroups,
          pars: defaultPars,
          scores: {},
          competitions: {},
        });
        if (insertError) {
          console.error('Seed error', insertError);
          setSyncStatus('error');
        }
      }

      setLoaded(true);
      setSyncStatus('synced');
    };

    load();

    const channel = supabase
      .channel('rounds-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rounds', filter: `id=eq.${ROUND_ID}` },
        (payload) => {
          const next = payload.new;
          if (!next) return;
          if (next.groups) setGroups(next.groups);
          if (next.pars) setPars(next.pars);
          if (next.scores) setScores(next.scores);
          if (next.competitions) setCompetitions(next.competitions);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const saveTimer = useRef(null);
  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSyncStatus('saving');
    saveTimer.current = setTimeout(async () => {
      const snapshot = stateRef.current;
      const { error } = await supabase
        .from('rounds')
        .update({
          groups: snapshot.groups,
          pars: snapshot.pars,
          scores: snapshot.scores,
          competitions: snapshot.competitions,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ROUND_ID);
      if (error) {
        console.error('Save error', error);
        setSyncStatus('error');
      } else {
        setSyncStatus('synced');
      }
    }, 300);
  }, []);

  const updateGroups = useCallback(
    (updater) => {
      setGroups((prev) => (typeof updater === 'function' ? updater(prev) : updater));
      scheduleSave();
    },
    [scheduleSave]
  );

  const updatePars = useCallback(
    (updater) => {
      setPars((prev) => (typeof updater === 'function' ? updater(prev) : updater));
      scheduleSave();
    },
    [scheduleSave]
  );

  const updateScores = useCallback(
    (updater) => {
      setScores((prev) => (typeof updater === 'function' ? updater(prev) : updater));
      scheduleSave();
    },
    [scheduleSave]
  );

  const updateCompetitions = useCallback(
    (updater) => {
      setCompetitions((prev) => (typeof updater === 'function' ? updater(prev) : updater));
      scheduleSave();
    },
    [scheduleSave]
  );

  const resetScores = useCallback(() => {
    setScores({});
    setCompetitions({});
    scheduleSave();
  }, [scheduleSave]);

  return {
    groups,
    pars,
    scores,
    competitions,
    loaded,
    syncStatus,
    updateGroups,
    updatePars,
    updateScores,
    updateCompetitions,
    resetScores,
  };
}
