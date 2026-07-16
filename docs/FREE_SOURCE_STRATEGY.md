# Free-source strategy for TrendsAgent

## The rule

Every collected record needs a URL, title, collection time, source name, and workspace. “Free” does not mean “scrape anything.” Use a public feed or documented API, respect rate limits/terms, and let the user remove irrelevant evidence.

## Recommended order

1. **Google Trends RSS:** discovery of fast-rising searches. The official Trending Now interface supports RSS export and covers over 100 countries/territories. Configure the starter workflow for India first.
2. **Google Trends API:** apply for the official alpha if keyword history or regional comparison matters. It provides up to five years of data, but access is limited during alpha.
3. **GDELT DOC API:** query business/industry/competitor keywords for recent global news coverage. Store article metadata and a short permitted summary/metadata, not copied full articles.
4. **Wikimedia Analytics:** track page-view changes for known topics. This is an attention proxy, not a purchase-intent metric.
5. **Hacker News:** for a technology/startup-focused business only. Keep the raw URL and title; do not treat votes/comments as representative of all customers.
6. **Approved competitor feeds:** add a small list of public RSS/blog URLs that you are permitted to monitor.

## Not a default source

- **Reddit:** do not build the commercial product around “free” collection. Obtain appropriate permission/API access first.
- **Social networks:** no generic scraping.
- **Google Search result pages:** use Trends RSS/API or a licensed search provider instead of scraping results pages.
- **Paywalled articles:** store only the public metadata/URL unless you have a right to ingest the full text.

## Quality checks for any collector

- Reject missing URLs/titles/text.
- Deduplicate by URL per workspace.
- Limit collection frequency.
- Keep source title/date/URL visible to the user.
- Do not claim a trend from one source alone; label it as an early signal.
- Let a user delete a source and exclude it from later AI responses.
