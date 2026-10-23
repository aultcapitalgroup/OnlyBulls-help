# OnlyBulls Help Center

The end-user help center for the OnlyBulls app, built with [Mintlify](https://mintlify.com).

## Preview locally

Install the [Mintlify CLI](https://www.npmjs.com/package/mint):

```
npm i -g mint
```

Run this from the repo root, where `docs.json` lives:

```
mint dev
```

Then open `http://localhost:3000`. Run `mint broken-links` to check internal links before you push.

## Structure

| Path | Contents |
| --- | --- |
| `docs.json` | Site name, colors, logo, navigation, navbar, and footer |
| `index.mdx` | Help center home page |
| `getting-started/`, `wallet/`, `earn/`, `trading/`, `markets/`, `ai/`, `social/`, `account/`, `help/` | Articles, one folder per navigation group |
| `logo/`, `favicon.svg` | OnlyBulls branding |
| `AGENTS.md` | Writing rules and content boundaries for people and AI tools editing these docs |

When you add a page, also add it to `navigation` in `docs.json`.

## Publishing

Changes are deployed automatically after they're pushed to `main`, once the Mintlify GitHub app is installed from the [dashboard](https://dashboard.mintlify.com/settings/organization/github-app).
