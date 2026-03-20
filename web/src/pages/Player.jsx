import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

const DDRAGON = 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion';
const DDRAGON_LOADING = 'https://ddragon.leagueoflegends.com/cdn/img/champion/loading';

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function timeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'przed chwilą';
  if (h < 24) return `${h}h temu`;
  return `${Math.floor(h / 24)}d temu`;
}

function streakLabel(streak) {
  if (streak === 0) return '—';
  if (streak > 0) return `+${streak} W`;
  return `${Math.abs(streak)} L`;
}

export default function Player() {
  const { discordId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/stats/${discordId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError('Nie znaleziono gracza.'); setLoading(false); });
  }, [discordId]);

  if (loading) return <div className="state-box">Ładowanie...</div>;
  if (error) return <div className="state-box">{error}</div>;

  const { user, stats, favoriteChampion, streak, recentMatches } = data;

  return (
    <>
      <Link to="/" className="back-link">← Wróć</Link>

      <div className="player-header">
        {favoriteChampion ? (
          <img
            className="champ-art"
            src={`${DDRAGON_LOADING}/${favoriteChampion}_0.jpg`}
            alt={favoriteChampion}
            onError={(e) => { e.target.src = `${DDRAGON}/${favoriteChampion}.png`; }}
          />
        ) : (
          <div className="champ-placeholder" style={{ width: 100, height: 100, fontSize: '2rem', borderRadius: 10, border: '2px solid var(--border)', background: 'var(--bg-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🎮</div>
        )}
        <div>
          <div className="player-title">{user.game_name}<span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>#{user.tag_line}</span></div>
          {favoriteChampion && <div className="player-sub">Ulubiony: {favoriteChampion}</div>}
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">KDA</div>
          <div className="stat-value">{stats.avg_kda ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Winrate</div>
          <div className={`stat-value ${stats.winrate >= 50 ? 'win' : 'loss'}`}>
            {stats.winrate != null ? `${stats.winrate}%` : '—'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Śr. CS</div>
          <div className="stat-value">{stats.avg_cs ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Śr. Damage</div>
          <div className="stat-value" style={{ fontSize: '1.1rem' }}>
            {stats.avg_damage != null ? Math.round(stats.avg_damage).toLocaleString() : '—'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Seria</div>
          <div className={`stat-value ${streak > 0 ? 'win' : streak < 0 ? 'loss' : ''}`} style={{ fontSize: '1.2rem' }}>
            {streakLabel(streak)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Mecze</div>
          <div className="stat-value" style={{ fontSize: '1.2rem' }}>{recentMatches.length}</div>
        </div>
      </div>

      {recentMatches.length > 0 && (
        <>
          <div className="section-title">Ostatnie mecze</div>
          <div className="match-list">
            {recentMatches.map((m) => (
              <div key={m.id} className={`match-row ${m.win ? 'win-row' : 'loss-row'}`}>
                <span className={`result-badge ${m.win ? 'win' : 'loss'}`}>{m.win ? 'Wygrana' : 'Przegrana'}</span>
                <span className="champ-name">{m.champion}</span>
                <span className="kda">{m.kills}/{m.deaths}/{m.assists}</span>
                <span className="meta">CS {m.cs}</span>
                <span className="meta">{Math.round(m.damage / 1000)}k dmg</span>
                <span className="meta">{timeAgo(m.timestamp)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
