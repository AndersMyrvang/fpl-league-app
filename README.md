# FPL League

A companion app for you and your mates' Fantasy Premier League mini-league.

Stop arguing in the group chat about who had the worst transfer of the gameweek — now you can prove it with data.

## What it does

- **Results** — see who won and lost each gameweek, ranked by points
- **Season chart** — track the race over the full season with an interactive zoomable chart
- **Transfers** — every transfer your league made, with best and worst transfer badges per gameweek (🏆/💀)
- **Dream team** — the most-picked XI across your entire league, plus who's been armband merchant of the season

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/yourusername/fpl-league-app
cd fpl-league-app
npm install
```

### 2. Set up Firebase

You'll need a Firebase project with Firestore enabled.

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a project
2. Enable Firestore (in production mode)
3. Go to **Project settings → Service accounts** and generate a new private key
4. Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

The `FIREBASE_SERVICE_ACCOUNT_KEY` value should be the entire service account JSON pasted as a single line (stringify it).

### 3. Set Firestore security rules

In the Firebase console under **Firestore → Rules**, paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /leagues/{leagueId} {
      allow read: if true;
      allow write: if false;
    }
    match /leagues/{leagueId}/{document=**} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

This keeps everything publicly readable while locking down writes to server-side only.

### 4. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), hit **Create a league**, enter your FPL mini-league ID (find it in the URL on the FPL site), and you're off.

## Creating a league

1. Head to `/create`
2. Enter your FPL mini-league ID — the app fetches your managers straight from the FPL API
3. Give the league a name and set an admin password
4. Share the link with your group chat

## Tech stack

- [Next.js](https://nextjs.org) — framework
- [Firebase Firestore](https://firebase.google.com/docs/firestore) — database
- [Fantasy Premier League API](https://fantasy.premierleague.com/api/) — all the FPL data, no auth needed

## Environment variables

See `.env.example` for the full list. Nothing gets committed — `.env.local` is gitignored.
