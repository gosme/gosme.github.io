# Visitor Count Worker

This Worker is intentionally isolated from the public GitHub Pages site.

What stays public:
- the Worker URL used by the site
- the returned visitor count only

What stays secret in Cloudflare:
- the GitHub PAT
- the private repo owner/name
- the allowed production origin and referer prefix

What stays private in the separate GitHub repo:
- raw IP logs
- visitor count summary history

## Required Cloudflare secrets

Set these with `wrangler secret put ...`:

- `GITHUB_PAT`
- `GITHUB_REPO_OWNER`
- `GITHUB_REPO_NAME`
- `ALLOWED_ORIGIN`
- `ALLOWED_REFERER_PREFIX`

Optional plain environment variable:

- `GITHUB_REPO_BRANCH`

## Expected private repo files

The Worker will create and update:

- `logs/YYYY-MM-DD.jsonl`
- `summary/visitor-count.json`

## Security notes

- Configure a Cloudflare rate limiting rule for the `/track` route.
- Configure Cloudflare WAF / bot protection for the Worker route.
- Keep the private repo separate from the public portfolio repo.
- The public site should only call the Worker endpoint and never reference the private repo.

## Public site configuration

Enable the feature in `resources/data.json`:

```json
"visitorCount": {
  "enabled": true,
  "label": "Visitors",
  "endpoint": "https://your-worker-subdomain.workers.dev/track",
  "timeoutMs": 4000
}
```

## Reverting

To disable the feature without touching the Worker:

1. Set `"enabled": false` in `resources/data.json`, or clear the endpoint.
2. Optionally remove the footer visitor counter markup and `initVisitorCounter()` call.

To fully remove the feature:

1. Delete the `worker/` directory from this repo.
2. Delete the deployed Worker and its secrets in Cloudflare.
3. Archive or delete the separate private visitor log repo.
