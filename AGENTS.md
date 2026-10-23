# Documentation project instructions

## About this project

- This is the end-user help center for the OnlyBulls app (iOS, Android, and the web at onlybulls.com), built on [Mintlify](https://mintlify.com)
- Pages are MDX files with YAML frontmatter
- Configuration and navigation live in `docs.json`. Add every new page to a group in `navigation`
- Articles describe what the app actually does. Check behavior and exact UI labels against the current app before you publish
- For Mintlify product knowledge (components, configuration, writing standards), install the Mintlify skill: `npx skills add https://mintlify.com/docs`

## Terminology

- **OnlyBulls**: the app. Never "Only Bulls" in prose
- **askROI**: the AI assistant. The tab is labeled **AI Chat** on iOS and Android and **askROI** on the web
- **Cash**: the user's USDC balance. Explain it as "Cash (USDC)" the first time on a page
- **Perps**: perpetual futures, traded on Hyperliquid
- **Predictions**: prediction markets, run by Polymarket
- **Onchain stocks**: tokenized stocks. Like regular stocks, they're research-only: users can view and track them but not trade them
- Say "network", not "chain", in user-facing copy
- Say "iOS and Android" for the mobile apps, and "the web" or "onlybulls.com" for the web app

## Style preferences

- Use active voice and second person ("you")
- Keep sentences concise — one idea per sentence
- Use sentence case for headings, and avoid apostrophes and quotation marks in headings (Mintlify keeps curly quotes in heading anchors, which breaks links)
- Bold UI elements exactly as they appear in the English app: tap **Deposit**
- Use `<Steps>` for procedures, and tables for error messages ("Message" | "What to do")
- Use `<Warning>` for financial risk and country restrictions, and `<Danger>` for actions that can lose funds
- Escape dollar signs in body text (`\$10`). Mintlify reads two `$` signs in a paragraph as a math formula
- Code formatting for addresses, codes, and tickers the user types (`$BTC`)

## Content boundaries

- Write for users, not engineers. Don't mention internal services, code, feature flags, or how the app is built
- Don't document internal, admin-only, test, or unreleased features
- Describe what the user sees and does, not the rules behind it. Avoid internal thresholds, eligibility rules, rate-limit numbers, retention periods, and send schedules unless the app shows them
- Don't list features the app doesn't have. If users need a workaround, give the path (usually "contact support")
- Features still rolling out get a short note that they're "rolling out gradually"
- Every feature limited by country must say so at the top of its page and be listed in `help/availability-by-country.mdx`
- Say when a feature is iOS and Android only, or web only
- Only state fees, limits, and timelines that the app shows the user
- Nothing is financial advice. Don't recommend assets or strategies
