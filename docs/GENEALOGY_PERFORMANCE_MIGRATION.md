# ThreadRing Genealogy Performance Migration Plan

## When to Migrate

### Performance Thresholds
Migrate to the optimized implementation when any of these conditions are met:

- **ThreadRing Count**: 500+ total ThreadRings in the system
- **API Response Time**: Genealogy API taking >1 second consistently
- **Client Performance**: Tree rendering taking >2 seconds
- **User Complaints**: Reports of laggy or unresponsive genealogy tree
- **Memory Issues**: Browser tab using >200MB for genealogy page

### Monitoring Commands
Run these commands to check if migration is needed:

```bash
# Check total ThreadRing count
npx tsx -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
  const count = await prisma.threadRing.count();
  console.log(\`Total ThreadRings: \${count}\`);
  console.log(count > 500 ? '⚠️ Consider migration' : '✅ Current implementation OK');
  await prisma.\$disconnect();
}
check();
"

# Test API performance
curl -w "Time: %{time_total}s\n" -o /dev/null -s "http://localhost:3000/api/threadrings/genealogy"

# Check tree depth for complexity
npx tsx scripts/check-hierarchy.ts | grep "Max Depth"
```

## Migration Checklist

### Phase 1: Preparation
- [ ] **Backup Current Implementation**
  ```bash
  cp pages/api/threadrings/genealogy.ts pages/api/threadrings/genealogy-legacy.ts
  cp components/ThreadRingGenealogy.tsx components/ThreadRingGenealogy-legacy.tsx
  ```

- [ ] **Install Additional Dependencies** (if needed)
  ```bash
  npm install lodash.debounce @types/lodash.debounce
  ```

- [ ] **Create Feature Flag**
  ```typescript
  // In lib/feature-flags.ts
  export const featureFlags = {
    threadrings: () => process.env.NEXT_PUBLIC_THREADRINGS_ENABLED === 'true',
    optimizedGenealogy: () => process.env.NEXT_PUBLIC_OPTIMIZED_GENEALOGY === 'true',
  };
  ```

### Phase 2: Deploy Optimized Backend
- [ ] **Deploy Optimized API**
  ```bash
  # Copy the optimized API to production location
  cp pages/api/threadrings/genealogy-optimized.ts pages/api/threadrings/genealogy.ts
  ```

- [ ] **Test API Performance**
  ```bash
  # Test with current data
  curl "http://localhost:3000/api/threadrings/genealogy?maxDepth=2"
  
  # Test expand functionality
  curl "http://localhost:3000/api/threadrings/genealogy?expandPath=spool-id,ring-id"
  ```

- [ ] **Verify Data Integrity**
  ```bash
  npx tsx scripts/check-hierarchy.ts
  ```

### Phase 3: Deploy Optimized Frontend
- [ ] **Replace Genealogy Component**
  ```bash
  cp components/ThreadRingGenealogyOptimized.tsx components/ThreadRingGenealogy.tsx
  ```

- [ ] **Update Genealogy Page**
  ```typescript
  // In pages/threadrings/genealogy.tsx
  import ThreadRingGenealogy from '@/components/core/threadring/ThreadRingGenealogy';
  
  // In the component:
  <ThreadRingGenealogy 
    initialMaxDepth={2} 
    enableVirtualization={true} 
  />
  ```

- [ ] **Test User Interactions**
  - Click to expand/collapse nodes
  - Shift+click to navigate to ThreadRings
  - Zoom and pan performance
  - Mobile responsiveness

### Phase 4: Performance Verification
- [ ] **Measure Improvements**
  ```bash
  # Load time comparison
  lighthouse http://localhost:3000/threadrings/genealogy --only-categories=performance
  
  # Memory usage test
  # Open Chrome DevTools > Performance > Record while using genealogy
  ```

- [ ] **Load Testing**
  ```bash
  # If available, run load tests
  artillery run scripts/genealogy-load-test.yml
  ```

- [ ] **User Acceptance Testing**
  - Test with actual users
  - Gather feedback on performance
  - Verify all functionality works

### Phase 5: Cleanup
- [ ] **Remove Legacy Files** (after 1 week of stable operation)
  ```bash
  rm pages/api/threadrings/genealogy-legacy.ts
  rm components/ThreadRingGenealogy-legacy.tsx
  rm pages/api/threadrings/genealogy-optimized.ts
  rm components/ThreadRingGenealogyOptimized.tsx
  ```

- [ ] **Update Documentation**
  ```bash
  # Update THREADRINGS_TODO.md with migration notes
  # Update any README files
  ```

## Rollback Plan

If issues arise during migration:

### Quick Rollback (< 1 hour)
```bash
# Restore legacy API
cp pages/api/threadrings/genealogy-legacy.ts pages/api/threadrings/genealogy.ts

# Restore legacy component
cp components/ThreadRingGenealogy-legacy.tsx components/ThreadRingGenealogy.tsx

# Restart application
npm run build && npm restart
```

### Validation After Rollback
```bash
# Test basic functionality
curl "http://localhost:3000/api/threadrings/genealogy"

# Verify UI works
# Visit /threadrings/genealogy and test interactions
```

## Advanced Optimizations (Future)

### When to Consider Further Optimizations

Implement these if the optimized version still has issues:

#### 10,000+ ThreadRings
- [ ] **Redis Caching Layer**
  ```bash
  npm install redis @types/redis
  ```
  
- [ ] **Database Indexes**
  ```sql
  CREATE INDEX CONCURRENTLY idx_threadring_genealogy 
  ON threadring(parentId, lineageDepth, visibility, totalDescendantsCount);
  ```

#### 50,000+ ThreadRings  
- [ ] **Search-Based Navigation**
  - Replace tree view with search + expand
  - Implement full-text search across ThreadRing names
  
- [ ] **WebGL Rendering**
  ```bash
  npm install deck.gl @deck.gl/react
  ```

#### 100,000+ ThreadRings
- [ ] **Graph Database Migration**
  ```bash
  # Consider Neo4j for complex graph queries
  npm install neo4j-driver
  ```

- [ ] **Microservice Architecture**
  - Separate genealogy service
  - Use GraphQL for efficient queries

## Monitoring After Migration

### Performance Metrics to Track
```typescript
// Add to genealogy page
useEffect(() => {
  const startTime = performance.now();
  
  // After tree loads
  const loadTime = performance.now() - startTime;
  console.log(`Genealogy load time: ${loadTime}ms`);
  
  // Track to analytics service
  analytics.track('genealogy_performance', { loadTime });
}, []);
```

### Key Performance Indicators
- API response time (target: < 200ms)
- Time to first render (target: < 300ms)
- Memory usage (target: < 50MB)
- User interaction lag (target: < 100ms)

### Alerting Thresholds
Set up monitoring alerts for:
- API response time > 500ms
- Page load time > 2 seconds
- Error rate > 1%
- Memory usage > 100MB

## Migration Timeline

### Recommended Schedule
- **Week 1**: Preparation and testing in development
- **Week 2**: Deploy to staging environment
- **Week 3**: User acceptance testing
- **Week 4**: Production deployment
- **Week 5**: Monitor and optimize

### Emergency Migration (Performance Crisis)
If genealogy becomes unusable:
- **Day 1**: Deploy optimized API endpoint
- **Day 2**: Test and deploy optimized frontend
- **Day 3**: Monitor and fix any issues

## Success Criteria

Migration is successful when:
- ✅ API response time < 200ms consistently
- ✅ Tree renders in < 500ms
- ✅ No user complaints about performance
- ✅ Memory usage stable < 50MB
- ✅ All genealogy features work correctly
- ✅ Mobile performance is acceptable

## Contact Information

**Migration Owner**: Development Team  
**Escalation Path**: 
1. Try rollback plan
2. Check monitoring dashboards
3. Review error logs
4. Contact infrastructure team if needed

**Key Files**:
- `docs/GENEALOGY_PERFORMANCE.md` - Technical analysis
- `pages/api/threadrings/genealogy-optimized.ts` - Optimized API
- `components/ThreadRingGenealogyOptimized.tsx` - Optimized component
- `scripts/check-hierarchy.ts` - Validation script