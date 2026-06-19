# Hawtio E2E Test Suite - Playwright + TypeScript

## Quick Start

```bash
# Install dependencies
npm install

# Run all tests (Quarkus backend: http://localhost:8080/hawtio/)
npm run test
```

### Camel Management (9 files, 26 tests)
- Route operations (start/stop)
- Context lifecycle (suspend/resume)  
- Route lifecycle (delete)
- Debug breakpoints
- Route diagrams & visualization
- Route profiling & statistics
- Route source viewer
- Trace lifecycle
- Endpoint messaging

### JMX Operations (3 files, 9 tests)
- Tree navigation & filtering
- Attributes viewer
- Operations viewer

### Diagnostics & Logs (2 files, 9 tests)
- JFR management
- Server logs viewer

### Runtime & Threads (2 files, 2 tests)
- Runtime information
- Thread viewer & monitoring

### Help & Documentation (1 file, 6 tests)
- Help sections & navigation

### Preferences (1 file, 6 tests)
- User settings persistence

### Security & Access Control (1 file, 4 tests)
- Authentication flow
- RBAC verification

### Plugin System (1 file, 11 tests)
- Plugin loading & initialization
- Plugin route accessibility
- Plugin navigation & UI verification

## Two Ways to Run Tests

### Option 1: Fully Automated (Recommended)

```bash
npm run test:full  # Handles everything automatically
```

**What it does:** Starts backend with Debug + JFR → Runs tests → Stops backend

### Option 2: Manual Control

**Terminal 1 (Backend):**
```bash
cd ~/Downloads/hawtio-main/examples/quarkus
mvn compile quarkus:dev \
  -Ddebug=5005 \
  -Djvm.args="-XX:+FlightRecorder -XX:StartFlightRecording=settings=default,dumponexit=false"
```

**Terminal 2 (Tests):**
```bash
npm run test
```

## Project Structure

```
tests/
├── camel/              # Camel route and context tests
├── diagnostics/        # JFR and logs tests  
├── jmx/                # JMX operations tests
├── runtime/            # Runtime and thread tests
└── global.setup.ts     # Authentication setup

pages/                  # Page Object Model classes
fixtures/               # Test fixtures and Jolokia API helpers
```

## Commands

```bash
npm run test           # Run all tests (requires backend running)
npm run test:full      # Automated: starts backend + runs tests
npm run test:debug     # Run with Playwright inspector
npm run report         # View HTML report
```

## Requirements

- Node.js 18+
- Java 11+ (for JFR tests)
- Hawtio backend running on http://localhost:8080
