#!/bin/bash
#
# run-tests-with-backend.sh
# Automatically starts Hawtio backend, runs tests, then stops backend
#

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
HAWTIO_DIR="${HAWTIO_DIR:-$HOME/Downloads/hawtio-main/examples/quarkus}"
BACKEND_PORT=8080
DEBUG_PORT=5005
MAX_WAIT=120  # seconds to wait for backend to start

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Automated E2E Test Runner with Backend${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Verify Hawtio directory exists
if [ ! -d "$HAWTIO_DIR" ]; then
  echo -e "${RED}ERROR: Hawtio directory not found: $HAWTIO_DIR${NC}"
  echo ""
  echo "Please set HAWTIO_DIR environment variable:"
  echo "  export HAWTIO_DIR=/path/to/hawtio/examples/quarkus"
  echo ""
  echo "Or pass it as argument:"
  echo "  $0 /path/to/hawtio/examples/quarkus"
  exit 1
fi

# Allow override via argument
if [ -n "$1" ]; then
  HAWTIO_DIR="$1"
fi

echo -e "${YELLOW}Step 1/4: Checking for existing backend...${NC}"

# Check if backend is already running
if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo -e "${YELLOW}Backend already running on port $BACKEND_PORT${NC}"
  read -p "Use existing backend? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Please stop the existing backend first.${NC}"
    exit 1
  fi
  BACKEND_ALREADY_RUNNING=true
else
  BACKEND_ALREADY_RUNNING=false
fi

# Function to cleanup background processes
cleanup() {
  if [ "$BACKEND_ALREADY_RUNNING" = false ] && [ -n "$BACKEND_PID" ]; then
    echo ""
    echo -e "${YELLOW}Stopping backend (PID: $BACKEND_PID)...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    wait $BACKEND_PID 2>/dev/null || true
    echo -e "${GREEN}✓ Backend stopped${NC}"
  fi
}

# Trap exit to cleanup
trap cleanup EXIT INT TERM

if [ "$BACKEND_ALREADY_RUNNING" = false ]; then
  echo -e "${YELLOW}Step 2/4: Starting Hawtio backend...${NC}"
  echo "  Directory: $HAWTIO_DIR"
  echo "  Debug: $DEBUG_PORT"
  echo "  JFR: Enabled"
  echo ""

  # Start backend in background
  cd "$HAWTIO_DIR"
  mvn compile quarkus:dev \
    -Ddebug=$DEBUG_PORT \
    -Djvm.args="-XX:+FlightRecorder -XX:StartFlightRecording=settings=default,dumponexit=false" \
    > /tmp/hawtio-backend.log 2>&1 &

  BACKEND_PID=$!

  echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"

  echo -e "${YELLOW}Step 3/4: Waiting for backend to be ready...${NC}"

  # Wait for backend to be ready
  ELAPSED=0
  while [ $ELAPSED -lt $MAX_WAIT ]; do
    if curl -s http://localhost:$BACKEND_PORT/hawtio/ > /dev/null 2>&1; then
      echo -e "${GREEN}✓ Backend ready!${NC}"
      break
    fi

    # Show progress
    printf "."
    sleep 2
    ELAPSED=$((ELAPSED + 2))
  done
  echo ""

  if [ $ELAPSED -ge $MAX_WAIT ]; then
    echo -e "${RED}ERROR: Backend failed to start within ${MAX_WAIT}s${NC}"
    echo ""
    echo "Backend logs:"
    tail -50 /tmp/hawtio-backend.log
    exit 1
  fi

  # Additional wait to ensure full initialization
  echo "  Waiting 5s for full initialization..."
  sleep 5
else
  echo -e "${GREEN}✓ Using existing backend${NC}"
  echo ""
  echo -e "${YELLOW}Step 2/4: Skipped (backend already running)${NC}"
  echo -e "${YELLOW}Step 3/4: Skipped (backend already ready)${NC}"
fi

echo ""
echo -e "${YELLOW}Step 4/4: Running Playwright tests...${NC}"
echo ""

# Run tests from the test directory
cd "$(dirname "$0")/.."
npm run test

TEST_EXIT_CODE=$?

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}  ✓ All tests passed!${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
else
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${RED}  ✗ Some tests failed${NC}"
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
fi

exit $TEST_EXIT_CODE
