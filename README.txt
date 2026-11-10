Boat Score API test - standalone Cloudflare Worker.
/api/test returns a JSON connectivity check.
/api/makulabo/heatmap?date=20261110&venue=05&race=12 fetches a public heatmap page as JSON html (NOT parsed into 6 racers yet).
Deploy as a Worker script, not as static assets. The static asset upload screen does not execute worker.js.
Existing Boat Score front-end is NOT yet wired to this separate API. First verify API /api/test, then /api/makulabo/heatmap, then integrate front-end.
