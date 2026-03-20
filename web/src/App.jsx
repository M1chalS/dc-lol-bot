import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Player from './pages/Player.jsx';
import Rankings from './pages/Rankings.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <header className="header">
        <NavLink to="/" className="logo">
          ⚔️ LoL Stats
        </NavLink>
        <nav className="nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            Gracze
          </NavLink>
          <NavLink to="/rankings" className={({ isActive }) => (isActive ? 'active' : '')}>
            Rankingi
          </NavLink>
        </nav>
      </header>
      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/player/:discordId" element={<Player />} />
          <Route path="/rankings" element={<Rankings />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
