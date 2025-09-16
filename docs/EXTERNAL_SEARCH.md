# External Search (Small Web Discovery)

## Overview

The External Search feature adds a "Small Web" discovery dimension to ThreadStead's search capabilities. It queries multiple privacy-focused and indie search engines in parallel, normalizes and deduplicates results, and presents them alongside local search results.

## Features

- **Privacy-First**: Only uses search engines that respect user privacy
- **Indie Web Focus**: Prioritizes independent websites, personal blogs, and small communities
- **Multiple Engines**: Searches across SearchMySite, SearXNG, Brave Search, and Mojeek
- **Intelligent Ranking**: Uses reciprocal rank fusion and privacy/indie scoring
- **Result Filtering**: Filter by indie web, privacy-respecting, or tracker-free sites
- **Graceful Degradation**: Handles engine failures and timeouts gracefully
- **Caching**: CDN and browser caching to minimize API calls

## Architecture

### Core Components

```
lib/extsearch/
├── types.ts              # TypeScript interfaces and types
├── merge.ts              # Deduplication and ranking utilities
├── boost.ts              # ThreadRing and community boosting
├── registry.ts           # Engine orchestrator
└── engines/
    ├── searchmysite.ts   # SearchMySite adapter
    ├── searxng.ts        # SearXNG adapter
    ├── brave.ts          # Brave Search adapter
    └── mojeek.ts         # Mojeek adapter
```

### API and UI

```
pages/api/extsearch.ts           # Meta-search API endpoint
hooks/useExtSearch.ts            # React hook for search state
components/features/search/      # Search result components
pages/discover.tsx               # Enhanced discover page with tabs
```

## Search Engines

### SearchMySite
- **Type**: Free indie web search
- **API Key**: None required
- **Rate Limit**: ~100 requests/day
- **Focus**: Independent websites, personal sites
- **Privacy**: Excellent (no tracking)

### SearXNG
- **Type**: Privacy meta-search aggregator
- **API Key**: None required (uses public instances)
- **Rate Limit**: Varies by instance
- **Focus**: Aggregated results from 70+ engines
- **Privacy**: Excellent (no tracking, no logs)

### Brave Search
- **Type**: Independent search with API
- **API Key**: Required (free tier available)
- **Rate Limit**: 2,000 requests/day (free tier)
- **Focus**: Privacy-first general search
- **Privacy**: Excellent (no tracking)

### Mojeek
- **Type**: Independent UK-based search
- **API Key**: Required
- **Rate Limit**: 5,000 requests/day (varies by plan)
- **Focus**: Independent crawling, no tracking
- **Privacy**: Excellent (no data collection)

## Setup Instructions

### 1. Enable the Feature

In your `.env` file:
```bash
NEXT_PUBLIC_ENABLE_EXTSEARCH=true
```

### 2. Configure Search Engines

#### Basic Setup (Free Engines Only)
The feature works out of the box with SearchMySite and public SearXNG instances:

```bash
# No additional configuration needed for basic setup
NEXT_PUBLIC_ENABLE_EXTSEARCH=true
```

#### Advanced Setup (All Engines)

1. **Brave Search API** (Optional, but recommended)
   - Sign up at https://brave.com/search/api/
   - Add to `.env`: `BRAVE_API_KEY=your_api_key_here`

2. **Mojeek API** (Optional)
   - Sign up at https://www.mojeek.com/services/api/
   - Add to `.env`: `MOJEEK_API_KEY=your_api_key_here`

3. **Custom SearXNG Instance** (Optional)
   - Deploy your own SearXNG instance or choose a preferred public one
   - Add to `.env`: `SEARXNG_INSTANCE_URL=https://your-searxng-instance.com`

### 3. Restart Your Application

```bash
npm run dev  # or your production command
```

## Usage

### User Interface

1. **Navigate to Discover Page**: Visit `/discover`
2. **Small Web Tab**: Click the "🌍 Small Web" tab (appears when feature is enabled)
3. **Search**: Enter your search query
4. **Filters**: Use privacy and indie web filters to refine results

### Search Filters

- **🌱 Indie Web Only**: Show only independent/personal websites
- **🔒 Privacy-First**: Show only privacy-respecting sites
- **🛡️ No Trackers**: Exclude sites known to use trackers

### API Usage

Direct API access (for developers):

```bash
# Basic search
GET /api/extsearch?q=your+query

# With filters
GET /api/extsearch?q=your+query&indie=true&privacy=true

# Engine status
GET /api/extsearch?status=true
```

## Result Ranking

### Scoring Algorithm

1. **Base Scores**: Each engine provides initial relevance scores
2. **Reciprocal Rank Fusion**: Combines scores from multiple engines
3. **Privacy Boost**: +10% for privacy-respecting sites (score > 0.7)
4. **Indie Web Boost**: +30% for indie web sites
5. **Tracker Penalty**: -10% for sites with known trackers
6. **Multi-Engine Boost**: Logarithmic boost for results appearing in multiple engines

### Privacy and Indie Detection

The system automatically analyzes domains to identify:
- **Indie Web sites**: GitHub Pages, Netlify, personal domains, etc.
- **Privacy scores**: Based on known tracker patterns and site behavior
- **Content types**: Blog, forum, personal, wiki, commercial

## Performance and Caching

### Response Times
- **Target**: <3.5 seconds for 95% of queries
- **Timeout**: 4 seconds max (partial results if engines timeout)
- **Parallel Processing**: All engines searched simultaneously

### Caching Strategy
- **CDN Cache**: 60 seconds public cache
- **Browser Cache**: 10 minutes with SWR
- **Stale While Revalidate**: 5 minutes background refresh

### Rate Limiting
- **Built-in Protection**: Respects each engine's rate limits
- **Graceful Degradation**: Continues with available engines if others fail
- **Monitoring**: Tracks per-engine success rates and latency

## Monitoring

### Available Metrics
- Engine success/failure rates
- Response latencies per engine
- Popular search queries
- Cache hit rates
- API quota usage

### Engine Status Check
```bash
curl "/api/extsearch?status=true"
```

Returns availability and configuration of each search engine.

## Troubleshooting

### Common Issues

#### "External search is not enabled"
- Check `NEXT_PUBLIC_ENABLE_EXTSEARCH=true` in `.env`
- Restart your application

#### No results from specific engines
- Check API keys are correctly configured
- Verify rate limits haven't been exceeded
- Check engine status at `/api/extsearch?status=true`

#### Slow search responses
- Some engines may be temporarily slow
- Results show partial data if engines timeout
- Check network connectivity to engine APIs

#### "Search failed" errors
- All configured engines may be unavailable
- Check internet connectivity
- Verify API keys are valid

### Debug Mode

For development, you can inspect search engine performance:
1. Enable browser dev tools
2. Check Network tab for `/api/extsearch` requests
3. Look for engine-specific error messages in response

## Privacy Considerations

### User Privacy
- **No User Tracking**: ThreadStead doesn't track user searches
- **No Data Storage**: Search queries aren't stored permanently
- **Anonymized Requests**: API requests don't include user identification

### Engine Privacy
All integrated search engines are selected for their privacy practices:
- No user tracking
- No personal data collection
- No advertising profiles
- No data sharing with third parties

## Development

### Adding New Search Engines

1. Create engine adapter in `lib/extsearch/engines/your-engine.ts`
2. Implement the `ExtSearchEngine` interface
3. Register in `lib/extsearch/registry.ts`
4. Add configuration to environment variables

### Engine Adapter Template

```typescript
export class YourEngine implements ExtSearchEngine {
  public readonly id = 'your-engine' as const;
  public readonly name = 'Your Engine';
  public readonly requiresAuth = false;
  public readonly privacyRating = 'excellent' as const;

  public isAvailable(): boolean {
    return true; // Check if API key is available, etc.
  }

  public async search(query: ExtSearchQuery, signal?: AbortSignal): Promise<EngineSearchResult> {
    // Implement search logic
  }
}
```

### Testing

Run the test suite:
```bash
npm run test lib/extsearch/
```

## Security

### API Key Management
- All API keys are server-side only
- Never exposed to client-side code
- Stored in environment variables

### Input Validation
- Query length limited to 200 characters
- Results limited to 50 per request
- Malicious input sanitized

### Rate Limiting
- CDN-level caching reduces API calls
- Built-in respect for engine rate limits
- Future: IP-based rate limiting for public endpoints

## Future Enhancements

### Planned Features
- [ ] ThreadRing member site boosting
- [ ] Personal search history
- [ ] Search suggestions
- [ ] Additional privacy-focused engines
- [ ] Advanced filtering options
- [ ] Export search results
- [ ] Offline search capability

### Integration Ideas
- [ ] Browser extension for direct ThreadStead search
- [ ] RSS feed generation from search results
- [ ] Integration with personal bookmark managers
- [ ] Social sharing of interesting discoveries

## Contributing

Contributions to improve the external search feature are welcome:

1. **New Search Engines**: Add privacy-focused search engine adapters
2. **UI Improvements**: Enhance the search interface and result display
3. **Performance**: Optimize ranking algorithms and caching strategies
4. **Privacy**: Improve privacy scoring and indie web detection

Please ensure all contributions maintain the privacy-first philosophy of the feature.