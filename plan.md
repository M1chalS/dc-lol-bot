# 🎮 Discord Bot LoL Stats & Ranking (Node.js)

## 📌 Cel projektu

Stworzenie bota Discord w Node.js, który:

* pobiera dane z Riot Games API
* śledzi statystyki znajomych
* zapisuje dane lokalnie
* generuje rankingi i ciekawe statystyki
* udostępnia komendy na Discordzie

---

# 🧱 Stack technologiczny

* Node.js
* discord.js
* axios
* better-sqlite3 (SQLite)
* node-cron

---

# 🧠 Architektura

## 1. Discord Bot

Obsługuje komendy użytkowników:

* !add
* !stats
* !top
* !last

## 2. Riot API Service

Odpowiada za:

* pobieranie PUUID
* pobieranie listy meczów
* pobieranie szczegółów meczów

## 3. Database Layer

SQLite:

* users
* matches
* stats

## 4. Scheduler (cron)

Co X minut:

* sprawdza nowe mecze
* zapisuje dane
* aktualizuje statystyki

---

# 🗄️ Struktura bazy danych

## users

* id (discord_id)
* summoner_name
* puuid

## matches

* match_id
* puuid
* champion
* kills
* deaths
* assists
* win (boolean)
* damage
* cs
* vision_score
* timestamp

## stats (opcjonalne cache)

* puuid
* avg_kda
* winrate
* avg_cs
* avg_damage

---

# 🔌 Integracja z Riot API

## Flow:

1. Pobierz PUUID po nicku
2. Pobierz listę matchy
3. Pobierz szczegóły matcha
4. Zapisz do DB

---

# 🤖 Komendy Discord

## !add <nick>

Dodaje użytkownika do systemu

## !stats @user

Zwraca:

* KDA
* Winrate
* średnie statystyki
* ulubiony champion

## !last @user

Zwraca ostatnią grę:

* champion
* K/D/A
* wynik

## !top

Ranking graczy

---

# 🏆 System rankingowy

## 1. Winrate ranking

* ostatnie 20 gier

## 2. KDA ranking

* (kills + assists) / deaths

## 3. Performance Score

```
score = (kills + assists * 0.7 - deaths * 0.5) + (damage / 1000)
```

---

# 😂 Rankingi specjalne (fun)

## Int Master

* najwięcej deaths

## Farmer 3000

* najwyższy CS/min

## Solo Carry

* najwyższy damage %

## Vision King

* najwyższy vision score

## Tilt Detector

* najwięcej przegranych pod rząd

---

# 🔄 Aktualizacja danych

## Cron job (np. co 10 min)

Dla każdego użytkownika:

1. Pobierz ostatnie mecze
2. Sprawdź czy są nowe
3. Jeśli tak:

    * pobierz szczegóły
    * zapisz do DB

---

# ⚠️ Rate limiting

* nie robić requestów przy każdej komendzie
* używać cache (DB)
* ograniczyć requesty do API

---

# 🚀 MVP (Minimum Viable Product)

## Etap 1

* bot działa
* !add działa
* zapis PUUID

## Etap 2

* pobieranie matchy
* zapis do DB

## Etap 3

* !last działa

## Etap 4

* !stats działa

## Etap 5

* !top działa

---

# 💡 Feature dodatkowe

## Daily Roast 🔥

Codziennie bot wybiera:

* najgorszego gracza dnia

## Weekly Ranking 🏆

* ranking tygodnia

## Champion Stats 🎯

* najlepszy champion gracza

## Streak Tracking 📉📈

* win/loss streak

---

# 📂 Struktura projektu

```
/src
  /bot
    commands.js
    events.js

  /services
    riotApi.js
    matchService.js
    statsService.js

  /db
    database.js

  /jobs
    updateMatches.js

  index.js
```

---

# 🔐 Config (.env)

```
DISCORD_TOKEN=
RIOT_API_KEY=
REGION=europe
```

---

# 🧪 Rozszerzenia (opcjonalne)

* dashboard webowy (React)
* wykresy statystyk
* integracja z innymi grami
* system punktów / ELO

---

# ✅ Gotowe do implementacji

Agent powinien:

1. stworzyć projekt Node.js
2. zainstalować zależności
3. skonfigurować Discord bota
4. podpiąć Riot API
5. stworzyć bazę SQLite
6. zaimplementować cron job
7. dodać komendy

---

# 🎯 Cel końcowy

Bot działający 24/7:

* zbiera dane automatycznie
* odpowiada na komendy
* generuje rankingi
* dostarcza zabawne statystyki
