import { useEffect, useState } from 'react';

const MEDALS = ['🥇', '🥈', '🥉'];

const CATEGORIES = [
  { key: 'kda',          title: '⚔️ KDA Champions',     fmt: (v) => v.toFixed(2) },
  { key: 'winrate',      title: '🏆 Winrate Warriors',  fmt: (v) => `${v.toFixed(1)}%` },
  { key: 'performance',  title: '🌟 Performance Stars', fmt: (v) => v.toFixed(2) },
  { key: 'intMaster',    title: '💀 Int Master',        fmt: (v) => `${v} śmierci` },
  { key: 'farmer',       title: '🌾 Farmer 3000',       fmt: (v) => `${v.toFixed(1)} CS` },
  { key: 'soloCarry',    title: '💥 Solo Carry',        fmt: (v) => `${Math.round(v / 1000)}k dmg` },
  { key: 'visionKing',   title: '👁️ Vision King',       fmt: (v) => v.toFixed(1) },
  { key: 'tiltDetector', title: '😤 Tilt Detector',     fmt: (v) => `${Math.abs(v)} L` },
];

export default function Rankings() {
  const [rankings, setRankings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/top')
      .then((r) => r.json())
      .then((d) => { setRankings(d); setLoading(false); })
      .catch(() => { setError('Nie udało się pobrać rankingów.'); setLoading(false); });
  }, []);

  if (loading) return <div className="state-box">Ładowanie...</div>;
  if (error) return <div className="state-box">{error}</div>;

  return (
    <>
      <h1 className="page-title">Rankingi serwera</h1>
      <div className="rankings-grid">
        {CATEGORIES.map(({ key, title, fmt }) => {
          const entries = (rankings[key] || []).slice(0, 3);
          return (
            <div key={key} className="rank-card">
              <div className="rank-title">{title}</div>
              {entries.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Brak danych</div>
              ) : (
                entries.map((e, i) => (
                  <div key={e.user.discord_id} className="rank-entry">
                    <span className="medal">{MEDALS[i]}</span>
                    <span className="rank-name">{e.user.game_name}</span>
                    <span className="rank-value">{fmt(e.value)}</span>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
