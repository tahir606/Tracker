# Media Tracker

A self-hosted tracker for anime, manga, TV shows and movies. Search for a title, add it to your library, and keep track of what you're watching, what's caught up, and when the next episode is available.

## Features

- **One library for everything**: anime and manga from [AniList](https://anilist.co), TV and movies from [TMDB](https://www.themoviedb.org).
- **Progress tracking**: bump episode or chapter progress with one click, and set statuses like watching, paused, dropped or completed.
- **Smart dashboard sections**: items you're watching are automatically split into *Watching*, *Caught up* and *Completed* by comparing your progress to what has been released.
- **Live episode schedules**: upcoming TV episodes are fetched from TMDB on each page load, so the dashboard stays current without a manual refresh.
- **Episode lists**: per-episode titles and synopses, including filler and recap flags for anime (via [Jikan](https://jikan.moe)).

## Tech stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/Base UI, and Postgres via Prisma 7.

## Getting started

### Prerequisites

- Node.js 20 or newer
- A Postgres database: a local install, or a free hosted one such as [Neon](https://neon.tech) or [Supabase](https://supabase.com)
- A free [TMDB API key](https://www.themoviedb.org/settings/api) (the v3 "API Key")

AniList and Jikan don't need API keys.

### Setup

1. Clone the repo and install dependencies:

   ```bash
   git clone https://github.com/tahir606/Tracker.git
   cd Tracker
   npm install
   ```

2. Create your env file and fill in `DATABASE_URL` and `TMDB_API_KEY`:

   ```bash
   cp .env.example .env
   ```

3. Create the database tables:

   ```bash
   npm run migrate:dev
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Generate the Prisma client and build for production |
| `npm run start` | Run the production build |
| `npm run lint` | Run ESLint |
| `npm run migrate:dev` | Apply migrations to the database in `.env` |
| `npm run migrate:prod` | Apply migrations using `.env.production` |

## Deploying

The app runs anywhere Next.js does (Vercel, a VPS, Docker). Set `DATABASE_URL` and `TMDB_API_KEY` in your host's environment, and run the migrations against your production database before the first deploy:

```bash
npm run migrate:prod
```

> [!WARNING]
> There is **no authentication**. The app is built for a single user, and anyone who can reach its URL can view and edit your library. Run it locally, or put it behind access protection (for example Vercel Deployment Protection, Cloudflare Access, or HTTP basic auth on a reverse proxy) if you deploy it publicly.

## Notes

- Episode dates shown in the app are the broadcast date plus a one-day delay (`TORRENT_DELAY_DAYS` in `src/lib/release-date.ts`). Set it to `0` if you want raw air dates.
- Show details (status, released episode count) are saved when you add an item. Use the refresh action on an item's page to update them from the provider.

## Contributing

Issues and pull requests are welcome. Please run `npm run lint` before opening a PR.

## Credits

This product uses the TMDB API but is not endorsed or certified by TMDB. Anime and manga data comes from AniList, and episode data from Jikan (an unofficial MyAnimeList API).

## License

[MIT](LICENSE)
