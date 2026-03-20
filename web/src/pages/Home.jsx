import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const DDRAGON = 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion';

export default function Home() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/users')
      .then((r) => r.json())
      .then((data) => { setUsers(data); setLoading(false); })
      .catch(() => { setError('Nie udało się pobrać danych.'); setLoading(false); });
  }, []);

  if (loading) return <div className="state-box">Ładowanie...</div>;
  if (error) return <div className="state-box">{error}</div>;
  if (users.length === 0) return <div className="state-box">Brak zarejestrowanych graczy.</div>;

  return (
    <>
      <h1 className="page-title">Gracze ({users.length})</h1>
      <div className="player-grid">
        {users.map((u) => (
          <Link to={`/player/${u.discord_id}`} key={u.discord_id} className="player-card">
            {u.favoriteChampion ? (
              <img
                className="champ-img"
                src={`${DDRAGON}/${u.favoriteChampion}.png`}
                alt={u.favoriteChampion}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div className="champ-placeholder">🎮</div>
            )}
            <div>
              <div className="player-name">{u.game_name}</div>
              <div className="player-tag">#{u.tag_line}</div>
            </div>
            <div className="mini-stats">
              <span><strong>{u.stats?.avg_kda ?? '—'}</strong> KDA</span>
              <span><strong>{u.stats?.winrate != null ? `${u.stats.winrate}%` : '—'}</strong> WR</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
