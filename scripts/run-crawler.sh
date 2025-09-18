#!/bin/bash

# Threadstead Crawler Runner Script for Linux Production
# Usage: ./run-crawler.sh [peak|offpeak]

# Set project directory (UPDATE THIS PATH for your production server)
PROJECT_DIR="/path/to/your/threadstead"
LOG_DIR="$PROJECT_DIR/logs"

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Load environment variables if .env exists
if [ -f "$PROJECT_DIR/.env" ]; then
    export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs)
fi

# Determine batch size and concurrency based on time
if [ "$1" = "peak" ]; then
    BATCH_SIZE=15
    CONCURRENCY=4
    MODE="peak"
elif [ "$1" = "offpeak" ]; then
    BATCH_SIZE=8
    CONCURRENCY=2
    MODE="offpeak"
else
    # Default settings
    BATCH_SIZE=10
    CONCURRENCY=3
    MODE="default"
fi

# Get the server URL (default to localhost:3000, override with env var)
SERVER_URL="${CRAWLER_SERVER_URL:-http://localhost:3000}"

# Log timestamp and settings
echo "$(date '+%Y-%m-%d %H:%M:%S') - Starting crawler run (mode: $MODE, batch: $BATCH_SIZE, concurrency: $CONCURRENCY)" >> "$LOG_DIR/crawler.log"

# Check if server is running
if ! curl -f -s "$SERVER_URL/api/auth/me" > /dev/null 2>&1; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: Server not running at $SERVER_URL" >> "$LOG_DIR/crawler.log"
    exit 1
fi

# Set up authentication
# Option 1: Use API key (recommended)
if [ -n "$CRAWLER_API_KEY" ]; then
    AUTH_HEADER="-H \"Authorization: Bearer $CRAWLER_API_KEY\""
# Option 2: Use session cookie (if you have one)
elif [ -n "$CRAWLER_SESSION_COOKIE" ]; then
    AUTH_HEADER="-H \"Cookie: $CRAWLER_SESSION_COOKIE\""
else
    # No auth - you'll need to implement proper auth for production
    AUTH_HEADER=""
    echo "$(date '+%Y-%m-%d %H:%M:%S') - WARNING: No authentication configured" >> "$LOG_DIR/crawler.log"
fi

# Run the crawler
RESPONSE=$(eval curl -s -X POST "$SERVER_URL/api/admin/crawler/run" \
    -H "Content-Type: application/json" \
    $AUTH_HEADER \
    -d "{\"batchSize\": $BATCH_SIZE, \"concurrency\": $CONCURRENCY}" \
    2>&1)

# Log the response
if [ $? -eq 0 ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Crawler response: $RESPONSE" >> "$LOG_DIR/crawler.log"

    # Extract success status from JSON response
    if echo "$RESPONSE" | grep -q '"success": *true'; then
        echo "$(date '+%Y-%m-%d %H:%M:%S') - Crawler run completed successfully" >> "$LOG_DIR/crawler.log"

        # Extract and log stats
        PROCESSED=$(echo "$RESPONSE" | grep -o '"processed": *[0-9]*' | grep -o '[0-9]*')
        SUCCESSFUL=$(echo "$RESPONSE" | grep -o '"successful": *[0-9]*' | grep -o '[0-9]*')
        QUEUE_TOTAL=$(echo "$RESPONSE" | grep -o '"total": *[0-9]*' | tail -1 | grep -o '[0-9]*')

        echo "$(date '+%Y-%m-%d %H:%M:%S') - Stats: Processed: $PROCESSED, Successful: $SUCCESSFUL, Queue Total: $QUEUE_TOTAL" >> "$LOG_DIR/crawler.log"
    else
        echo "$(date '+%Y-%m-%d %H:%M:%S') - Crawler run failed: $RESPONSE" >> "$LOG_DIR/crawler.log"
        exit 1
    fi
else
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: Failed to connect to crawler API: $RESPONSE" >> "$LOG_DIR/crawler.log"
    exit 1
fi

# Rotate logs if they get too large (keep last 1000 lines)
if [ -f "$LOG_DIR/crawler.log" ] && [ $(wc -l < "$LOG_DIR/crawler.log") -gt 1000 ]; then
    tail -n 1000 "$LOG_DIR/crawler.log" > "$LOG_DIR/crawler.log.tmp"
    mv "$LOG_DIR/crawler.log.tmp" "$LOG_DIR/crawler.log"
fi

echo "$(date '+%Y-%m-%d %H:%M:%S') - Crawler script completed" >> "$LOG_DIR/crawler.log"