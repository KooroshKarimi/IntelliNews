#!/bin/bash

# IntelliNews - Comprehensive Test Runner
# This script runs all tests with coverage reporting and performance metrics

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
BACKEND_DIR="backend"
FRONTEND_DIR="frontend"
COVERAGE_THRESHOLD=85
TEST_TIMEOUT=300 # 5 minutes

# Performance tracking
START_TIME=$(date +%s)

echo -e "${BLUE}🚀 Starting IntelliNews Comprehensive Test Suite${NC}"
echo -e "${BLUE}=================================================${NC}"

# Function to print section headers
print_section() {
    echo ""
    echo -e "${YELLOW}📋 $1${NC}"
    echo -e "${YELLOW}$(printf '=%.0s' {1..50})${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check test results
check_test_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2 passed${NC}"
        return 0
    else
        echo -e "${RED}❌ $2 failed${NC}"
        return 1
    fi
}

# Initialize test results tracking
UNIT_TESTS_PASSED=0
INTEGRATION_TESTS_PASSED=0
E2E_TESTS_PASSED=0
FRONTEND_TESTS_PASSED=0
TOTAL_FAILURES=0

print_section "Environment Setup & Validation"

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js version: $NODE_VERSION${NC}"

# Set test environment variables
export NODE_ENV=test
export CI=true

# Clean up any existing test artifacts
echo "🧹 Cleaning up test artifacts..."
rm -rf backend/coverage
rm -rf frontend/coverage
rm -rf backend/tests/*.db
rm -rf tests/system/*.db

print_section "Backend Dependencies Installation"

cd $BACKEND_DIR

if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm ci
else
    echo "✅ Backend dependencies already installed"
fi

# Install additional test dependencies if needed
npm install --save-dev jest@29.7.0 @jest/globals@29.7.0 supertest@6.3.3 nock@13.4.0 2>/dev/null || echo "Test dependencies already installed"

print_section "Backend Unit Tests"

echo "🧪 Running backend unit tests..."
if timeout $TEST_TIMEOUT npm run test:unit 2>&1 | tee ../test-unit-output.log; then
    UNIT_TESTS_PASSED=1
    check_test_result 0 "Backend Unit Tests"
else
    check_test_result 1 "Backend Unit Tests"
    TOTAL_FAILURES=$((TOTAL_FAILURES + 1))
fi

print_section "Backend Integration Tests"

echo "🔗 Running backend integration tests..."
if timeout $TEST_TIMEOUT npm run test:integration 2>&1 | tee ../test-integration-output.log; then
    INTEGRATION_TESTS_PASSED=1
    check_test_result 0 "Backend Integration Tests"
else
    check_test_result 1 "Backend Integration Tests"
    TOTAL_FAILURES=$((TOTAL_FAILURES + 1))
fi

print_section "Backend Coverage Analysis"

echo "📊 Generating backend coverage report..."
if npm run test:coverage 2>&1 | tee ../test-coverage-output.log; then
    echo -e "${GREEN}✅ Backend coverage report generated${NC}"
    
    # Extract coverage percentage if available
    if [ -f "coverage/lcov-report/index.html" ]; then
        echo -e "${BLUE}📈 Coverage report available at: backend/coverage/lcov-report/index.html${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ Coverage report generation failed${NC}"
fi

cd ..

print_section "Frontend Dependencies Installation"

cd $FRONTEND_DIR

if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm ci
else
    echo "✅ Frontend dependencies already installed"
fi

# Install additional test dependencies
npm install --save-dev @testing-library/react@13.4.0 @testing-library/jest-dom@5.16.5 @testing-library/user-event@14.4.3 2>/dev/null || echo "Test dependencies already installed"

print_section "Frontend Tests"

echo "⚛️ Running frontend tests..."
if timeout $TEST_TIMEOUT npm run test:coverage 2>&1 | tee ../test-frontend-output.log; then
    FRONTEND_TESTS_PASSED=1
    check_test_result 0 "Frontend Tests"
else
    check_test_result 1 "Frontend Tests"
    TOTAL_FAILURES=$((TOTAL_FAILURES + 1))
fi

cd ..

print_section "System End-to-End Tests"

echo "🌐 Running system E2E tests..."
cd $BACKEND_DIR

# Ensure server can start for E2E tests
export DB_PATH="tests/e2e-test.db"
export PORT=8081

if timeout $TEST_TIMEOUT npm run test:e2e 2>&1 | tee ../test-e2e-output.log; then
    E2E_TESTS_PASSED=1
    check_test_result 0 "End-to-End Tests"
else
    check_test_result 1 "End-to-End Tests"
    TOTAL_FAILURES=$((TOTAL_FAILURES + 1))
fi

cd ..

print_section "Security & Performance Tests"

echo "🔒 Running security tests..."
cd $BACKEND_DIR

# Run security-focused tests
if npm test -- --testNamePattern="Security|XSS|SQL Injection|CORS" 2>&1 | tee ../test-security-output.log; then
    echo -e "${GREEN}✅ Security tests passed${NC}"
else
    echo -e "${YELLOW}⚠️ Some security tests may have failed${NC}"
fi

echo "⚡ Running performance tests..."
# Run performance-focused tests
if npm test -- --testNamePattern="Performance|Load|Memory|Concurrent" 2>&1 | tee ../test-performance-output.log; then
    echo -e "${GREEN}✅ Performance tests passed${NC}"
else
    echo -e "${YELLOW}⚠️ Some performance tests may have failed${NC}"
fi

cd ..

print_section "Test Results Summary"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo -e "${BLUE}📊 Test Execution Summary${NC}"
echo -e "${BLUE}=========================${NC}"
echo ""

# Test results summary
echo "Test Categories:"
if [ $UNIT_TESTS_PASSED -eq 1 ]; then
    echo -e "  ${GREEN}✅ Unit Tests${NC}"
else
    echo -e "  ${RED}❌ Unit Tests${NC}"
fi

if [ $INTEGRATION_TESTS_PASSED -eq 1 ]; then
    echo -e "  ${GREEN}✅ Integration Tests${NC}"
else
    echo -e "  ${RED}❌ Integration Tests${NC}"
fi

if [ $E2E_TESTS_PASSED -eq 1 ]; then
    echo -e "  ${GREEN}✅ End-to-End Tests${NC}"
else
    echo -e "  ${RED}❌ End-to-End Tests${NC}"
fi

if [ $FRONTEND_TESTS_PASSED -eq 1 ]; then
    echo -e "  ${GREEN}✅ Frontend Tests${NC}"
else
    echo -e "  ${RED}❌ Frontend Tests${NC}"
fi

echo ""
echo "Execution Details:"
echo -e "  ⏱️  Total Duration: ${DURATION}s"
echo -e "  📁 Coverage Reports: backend/coverage/, frontend/coverage/"
echo -e "  📝 Test Logs: test-*-output.log"

if [ $TOTAL_FAILURES -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 All tests passed successfully!${NC}"
    echo -e "${GREEN}🚀 Your IntelliNews application is ready for deployment.${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}💥 $TOTAL_FAILURES test categories failed.${NC}"
    echo -e "${RED}🔧 Please review the test logs and fix the issues.${NC}"
    echo ""
    echo -e "${YELLOW}📋 Troubleshooting Tips:${NC}"
    echo -e "${YELLOW}  1. Check test-*-output.log files for detailed error messages${NC}"
    echo -e "${YELLOW}  2. Ensure all dependencies are installed (npm ci)${NC}"
    echo -e "${YELLOW}  3. Check database permissions and connectivity${NC}"
    echo -e "${YELLOW}  4. Verify environment variables are set correctly${NC}"
    echo -e "${YELLOW}  5. Run individual test suites for more specific debugging${NC}"
    exit 1
fi

# Generate final test report
print_section "Generating Test Report"

cat > TEST_REPORT.md << EOF
# IntelliNews Test Execution Report

**Generated:** $(date)
**Duration:** ${DURATION} seconds
**Total Failures:** ${TOTAL_FAILURES}

## Test Results

| Test Category | Status | Details |
|---------------|--------|---------|
| Unit Tests | $([ $UNIT_TESTS_PASSED -eq 1 ] && echo "✅ PASSED" || echo "❌ FAILED") | Backend component tests |
| Integration Tests | $([ $INTEGRATION_TESTS_PASSED -eq 1 ] && echo "✅ PASSED" || echo "❌ FAILED") | API endpoint tests |
| End-to-End Tests | $([ $E2E_TESTS_PASSED -eq 1 ] && echo "✅ PASSED" || echo "❌ FAILED") | Full system workflow tests |
| Frontend Tests | $([ $FRONTEND_TESTS_PASSED -eq 1 ] && echo "✅ PASSED" || echo "❌ FAILED") | React component tests |

## Coverage Reports

- Backend Coverage: \`backend/coverage/lcov-report/index.html\`
- Frontend Coverage: \`frontend/coverage/lcov-report/index.html\`

## Test Logs

- Unit Tests: \`test-unit-output.log\`
- Integration Tests: \`test-integration-output.log\`
- E2E Tests: \`test-e2e-output.log\`
- Frontend Tests: \`test-frontend-output.log\`
- Security Tests: \`test-security-output.log\`
- Performance Tests: \`test-performance-output.log\`

## System Information

- Node.js Version: $NODE_VERSION
- Test Environment: $NODE_ENV
- Database: SQLite (Test Mode)

$([ $TOTAL_FAILURES -eq 0 ] && echo "## ✅ Summary

All tests passed successfully! The IntelliNews application is ready for deployment." || echo "## ❌ Summary

$TOTAL_FAILURES test categories failed. Please review the logs and fix the issues before deployment.")
EOF

echo -e "${GREEN}📄 Test report generated: TEST_REPORT.md${NC}"