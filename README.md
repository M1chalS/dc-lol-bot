# LoL Stats Bot

Bot Discord śledzący statystyki League of Legends dla znajomych z serwera. Automatycznie zbiera dane z Riot API, zapisuje w lokalnej bazie i udostępnia komendy Discord oraz panel webowy.

## Stack

| Warstwa | Technologia |
|---|---|
| Bot Discord | Node.js + discord.js v14 |
| API webowe | Express.js |
| Frontend | React 18 + Vite |
| Baza danych | SQLite (better-sqlite3, WAL) |
| Scheduler | node-cron |
| Serwer WWW | nginx |
| SSL | Let's Encrypt (certbot) |
| Konteneryzacja | Docker + Docker Compose |

---

## Struktura projektu

```
/src
  /api
    server.js          ← Express API (port 3001)
  /bot
    commands.js        ← handlery komend Discord
    events.js          ← nasłuchiwanie wiadomości
  /db
    database.js        ← warstwa SQLite
  /jobs
    updateMatches.js   ← cron job synchronizacji
  /services
    riotApi.js         ← klient Riot API
    matchService.js    ← pobieranie i zapis meczy
    statsService.js    ← obliczanie statystyk i rankingów
  /utils
    championName.js    ← formatowanie nazw championów
    queueConstants.js  ← opisy trybów gry (Riot API)
  index.js             ← punkt wejścia bota

/web                   ← aplikacja React
  /src
    /hooks
      useRiotMatchConstants.js
    /pages
      Home.jsx         ← lista graczy
      Player.jsx       ← statystyki gracza
      Rankings.jsx     ← rankingi serwera
    /utils
      championName.js

Dockerfile             ← obraz bota/API
Dockerfile.web         ← multi-stage build React + nginx
docker-compose.yml
```

---

## Komendy Discord

Wszystkie komendy zaczynają się od `/lol`.

### `/lol add <GameName#TAG>`
Łączy konto Riot z kontem Discord.
```
/lol add Faker#T1
```

### `/lol stats [@user]`
Statystyki z ostatnich 100 meczy:
- KDA, Winrate, średnie CS i Damage
- Ulubiony champion
- Aktualna seria win/loss

### `/lol last [@user]`
Szczegóły ostatniego meczu: champion, K/D/A, damage, CS, vision score, czas gry, tryb gry.

### `/lol top`
Rankingi całego serwera w 8 kategoriach:

| Kategoria | Opis |
|---|---|
| ⚔️ KDA Champions | Najwyższe średnie KDA |
| 🏆 Winrate Warriors | Najwyższy winrate |
| 🌟 Performance Stars | Composite score: `kills + assists×0.7 - deaths×0.5 + damage/1000` |
| 💀 Int Master | Najwięcej śmierci łącznie |
| 🌾 Farmer 3000 | Najwyższy średni CS |
| 💥 Solo Carry | Najwyższy średni damage |
| 👁️ Vision King | Najwyższy vision score |
| 😤 Tilt Detector | Najdłuższa seria przegranych |

---

## Panel webowy

Dostępny na porcie 80 (443 z SSL). Trzy widoki:

- **Gracze** — siatka kart z ikonami ulubionych championów, KDA, winrate
- **Gracz** — pełne statystyki + tabela ostatnich meczy z trybem gry
- **Rankingi** — wszystkie 8 kategorii, top 3 z medalami

---

## Baza danych

SQLite w trybie WAL, plik `data/bot.db`.

```sql
users   (discord_id, puuid, game_name, tag_line, ...)
matches (match_id, puuid, champion, kills, deaths, assists,
         win, damage, cs, vision_score, game_duration,
         timestamp, queue_id)
stats   (puuid, avg_kda, winrate, avg_cs, avg_damage, updated_at)
```

Migracje są stosowane automatycznie przy starcie — nowe kolumny są dodawane przez `ALTER TABLE` jeśli jeszcze nie istnieją.

---

## Konfiguracja

Skopiuj `.env.example` do `.env` i uzupełnij:

```env
DISCORD_TOKEN=        # token bota z Discord Developer Portal
RIOT_API_KEY=         # klucz z developer.riotgames.com
REGION=europe         # routing regionalny (europe / americas / asia)
PLATFORM=eun1         # platforma (eun1 / euw1 / na1 / kr ...)
CRON_INTERVAL=*/10 * * * *
DOMAIN=yourdomain.com
YOUR_EMAIL=you@example.com
```

---

## Uruchomienie lokalne

```bash
# Instalacja zależności
npm install
cd web && npm install && cd ..

# Bot + API (w osobnych terminalach)
npm run dev        # bot Discord
npm run dev:api    # Express API

# React (z proxy na :3001)
cd web && npm run dev
```

Lub wszystko naraz:
```bash
npm run dev:web
```

Otwórz `http://localhost:5173`.

---

## Wdrożenie na serwerze (Docker)

### 1. Pierwsze uruchomienie

```bash
docker compose up -d
```

Nginx startuje w trybie HTTP-only.

### 2. Pobranie certyfikatu SSL

```bash
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d twojadomena.com \
  --email twoj@email.com \
  --agree-tos --no-eff-email
```

### 3. Restart — przełączenie na HTTPS

```bash
docker compose restart web
```

Certbot automatycznie odnawia certyfikaty co 12h. Przy kolejnych `docker compose up` nginx sam wykrywa obecność certyfikatów i uruchamia się w trybie HTTPS.

---

## Synchronizacja danych

Cron job odpala się co 10 minut (konfigurowalny przez `CRON_INTERVAL`):

1. Pobiera ostatnie mecze ranked (queue 420) dla każdego zarejestrowanego gracza
2. Porównuje z bazą, zapisuje nowe
3. Przelicza cache statystyk

Rate limiting: 50ms między detalami meczu, 500ms między graczami.