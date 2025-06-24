#!/bin/bash

# Load Testing Runner Script for FeastFrenzy
# Provides easy execution of different load testing scenarios

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"
LOAD_TEST_SCRIPT="$BACKEND_DIR/tests/load/k6-load-test.js"

# Default values
BASE_URL="http://localhost:3000"
TEST_TYPE="load"
OUTPUT_DIR="$BACKEND_DIR/tests/load/results"
DURATION=""
VUS=""
VERBOSE=false
SAVE_RESULTS=true

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Usage information
usage() {
    cat << EOF
Usage: $0 [OPTIONS] [TEST_TYPE]

Run load tests against the FeastFrenzy API using K6.

TEST_TYPES:
    smoke       Quick smoke test (1 VU, 30s)
    load        Normal load test (10-20 VUs, 16m)
    stress      Stress test (up to 100 VUs, 23m)
    spike       Spike test (sudden load increase, 7.5m)
    volume      Volume test (bulk data operations, 10m)
    soak        Soak test (sustained load, 1h)
    all         Run all test types sequentially

OPTIONS:
    -u, --url URL           Base URL (default: http://localhost:3000)
    -d, --duration DURATION Override test duration (e.g., 5m, 30s)
    -v, --vus VUS          Override virtual users count
    -o, --output DIR       Results output directory
    --no-save              Don't save results to files
    --verbose              Enable verbose output
    -h, --help             Show this help message

EXAMPLES:
    $0 smoke                                    # Run smoke test
    $0 load -u https://api.feastfrenzy.com    # Load test against production
    $0 stress --duration 10m --vus 50         # Custom stress test
    $0 all --output ./my-results               # Run all tests, custom output
    $0 soak --verbose                          # Verbose soak test

PREREQUISITES:
    - K6 must be installed (https://k6.io/docs/getting-started/installation/)
    - FeastFrenzy API must be running and accessible
    - Test user accounts must exist in the database

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -u|--url)
            BASE_URL="$2"
            shift 2
            ;;
        -d|--duration)
            DURATION="$2"
            shift 2
            ;;
        -v|--vus)
            VUS="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --no-save)
            SAVE_RESULTS=false
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        -*)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
        *)
            TEST_TYPE="$1"
            shift
            ;;
    esac
done

# Validate test type
valid_types=("smoke" "load" "stress" "spike" "volume" "soak" "all")
if [[ ! " ${valid_types[@]} " =~ " ${TEST_TYPE} " ]]; then
    log_error "Invalid test type: $TEST_TYPE"
    log_error "Valid types: ${valid_types[*]}"
    exit 1
fi

log_info "Load testing configuration:"
log_info "  Test Type: $TEST_TYPE"
log_info "  Base URL: $BASE_URL"
log_info "  Output Directory: $OUTPUT_DIR"
if [[ -n "$DURATION" ]]; then
    log_info "  Duration Override: $DURATION"
fi
if [[ -n "$VUS" ]]; then
    log_info "  VUs Override: $VUS"
fi
log_info "  Save Results: $SAVE_RESULTS"
log_info "  Verbose: $VERBOSE"

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if K6 is installed
    if ! command -v k6 >/dev/null 2>&1; then
        log_error "K6 is not installed. Please install it from https://k6.io/docs/getting-started/installation/"
        exit 1
    fi

    local k6_version=$(k6 version | head -n1)
    log_info "K6 version: $k6_version"

    # Check if load test script exists
    if [[ ! -f "$LOAD_TEST_SCRIPT" ]]; then
        log_error "Load test script not found: $LOAD_TEST_SCRIPT"
        exit 1
    fi

    # Check if API is accessible
    log_info "Checking API accessibility at $BASE_URL..."
    if ! curl -s --connect-timeout 10 "$BASE_URL/health" >/dev/null 2>&1; then
        log_error "API is not accessible at $BASE_URL"
        log_error "Please ensure the FeastFrenzy backend is running"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Create output directory
prepare_output_directory() {
    if [[ "$SAVE_RESULTS" == "true" ]]; then
        log_info "Creating output directory: $OUTPUT_DIR"
        mkdir -p "$OUTPUT_DIR"
        
        # Create subdirectory for this test run
        local timestamp=$(date +%Y%m%d_%H%M%S)
        OUTPUT_DIR="$OUTPUT_DIR/${TEST_TYPE}_${timestamp}"
        mkdir -p "$OUTPUT_DIR"
        
        log_info "Results will be saved to: $OUTPUT_DIR"
    fi
}

# Run K6 test
run_k6_test() {
    local test_name="$1"
    local scenario_name="$2"
    
    log_info "Running $test_name test..."
    
    # Build K6 command
    local k6_cmd="k6 run"
    
    # Add options
    if [[ "$SAVE_RESULTS" == "true" ]]; then
        k6_cmd="$k6_cmd --out json=$OUTPUT_DIR/${test_name}_results.json"
        k6_cmd="$k6_cmd --out csv=$OUTPUT_DIR/${test_name}_metrics.csv"
    fi
    
    if [[ "$VERBOSE" == "true" ]]; then
        k6_cmd="$k6_cmd --verbose"
    fi
    
    # Environment variables
    local env_vars=""
    env_vars="$env_vars BASE_URL=$BASE_URL"
    env_vars="$env_vars SCENARIO=$scenario_name"
    
    if [[ -n "$DURATION" ]]; then
        env_vars="$env_vars DURATION=$DURATION"
    fi
    
    if [[ -n "$VUS" ]]; then
        env_vars="$env_vars VUS=$VUS"
    fi
    
    # Add specific scenario selection
    k6_cmd="$k6_cmd --include-system-env-vars=false"
    
    # Run the test
    local start_time=$(date +%s)
    log_info "Executing: $env_vars $k6_cmd --scenario ${scenario_name} $LOAD_TEST_SCRIPT"
    
    if env $env_vars $k6_cmd --scenario "$scenario_name" "$LOAD_TEST_SCRIPT"; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        log_success "$test_name test completed successfully in ${duration}s"
        return 0
    else
        local exit_code=$?
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        log_error "$test_name test failed after ${duration}s (exit code: $exit_code)"
        return $exit_code
    fi
}

# Run specific test type
run_test_type() {
    local type="$1"
    
    case "$type" in
        smoke)
            run_k6_test "smoke" "smoke_test"
            ;;
        load)
            run_k6_test "load" "load_test"
            ;;
        stress)
            run_k6_test "stress" "stress_test"
            ;;
        spike)
            run_k6_test "spike" "spike_test"
            ;;
        volume)
            run_k6_test "volume" "volume_test"
            ;;
        soak)
            run_k6_test "soak" "soak_test"
            ;;
        *)
            log_error "Unknown test type: $type"
            return 1
            ;;
    esac
}

# Run all test types
run_all_tests() {
    log_info "Running all load test types..."
    
    local tests=("smoke" "load" "stress" "spike" "volume")
    local failed_tests=()
    
    # Ask user if they want to run soak test (it's 1 hour long)
    read -p "Do you want to include the soak test (1 hour duration)? [y/N]: " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        tests+=("soak")
    fi
    
    for test_type in "${tests[@]}"; do
        log_info "Starting $test_type test..."
        
        if run_test_type "$test_type"; then
            log_success "$test_type test passed"
        else
            log_error "$test_type test failed"
            failed_tests+=("$test_type")
        fi
        
        # Brief pause between tests
        if [[ "$test_type" != "${tests[-1]}" ]]; then
            log_info "Waiting 30 seconds before next test..."
            sleep 30
        fi
    done
    
    # Summary
    log_info "All tests completed!"
    
    if [[ ${#failed_tests[@]} -eq 0 ]]; then
        log_success "All tests passed!"
        return 0
    else
        log_error "Failed tests: ${failed_tests[*]}"
        return 1
    fi
}

# Generate summary report
generate_summary_report() {
    if [[ "$SAVE_RESULTS" == "true" && -d "$OUTPUT_DIR" ]]; then
        log_info "Generating summary report..."
        
        local report_file="$OUTPUT_DIR/test_summary.md"
        local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
        
        cat > "$report_file" << EOF
# FeastFrenzy Load Test Summary

**Test Run:** $TEST_TYPE  
**Date:** $timestamp  
**Base URL:** $BASE_URL  
**Duration Override:** ${DURATION:-"Default"}  
**VUs Override:** ${VUS:-"Default"}  

## Test Configuration

- **Test Script:** $LOAD_TEST_SCRIPT
- **Results Directory:** $OUTPUT_DIR
- **K6 Version:** $(k6 version | head -n1)

## Results Files

EOF
        
        # List result files
        if ls "$OUTPUT_DIR"/*.json >/dev/null 2>&1; then
            echo "- JSON Results: \`$(ls "$OUTPUT_DIR"/*.json | xargs basename -s .json)\`" >> "$report_file"
        fi
        
        if ls "$OUTPUT_DIR"/*.csv >/dev/null 2>&1; then
            echo "- CSV Metrics: \`$(ls "$OUTPUT_DIR"/*.csv | xargs basename -s .csv)\`" >> "$report_file"
        fi
        
        cat >> "$report_file" << EOF

## Quick Analysis Commands

\`\`\`bash
# View JSON results
jq '.' $OUTPUT_DIR/*.json

# Analyze CSV metrics with common tools
# (requires installation of jq, csvkit, or similar tools)
csvstat $OUTPUT_DIR/*.csv
\`\`\`

## Thresholds

The load tests include the following performance thresholds:

- **Response Time (95th percentile):** < 500ms (load), < 200ms (smoke), < 1000ms (stress)
- **Error Rate:** < 10% (general), < 1% (smoke), < 5% (load), < 20% (stress)
- **Authentication Success Rate:** > 95%
- **CRUD Operations Success Rate:** > 90%

## Next Steps

1. Review the detailed results in the JSON and CSV files
2. Compare results against the defined thresholds
3. Identify performance bottlenecks if thresholds are not met
4. Consider optimizations or infrastructure scaling if needed
5. Set up continuous performance monitoring

EOF
        
        log_success "Summary report generated: $report_file"
    fi
}

# Cleanup function
cleanup() {
    log_info "Cleaning up..."
    # Add any cleanup logic here if needed
}

# Set up trap for cleanup
trap cleanup EXIT

# Main execution
main() {
    log_info "Starting FeastFrenzy load testing..."
    
    check_prerequisites
    prepare_output_directory
    
    local exit_code=0
    
    if [[ "$TEST_TYPE" == "all" ]]; then
        run_all_tests || exit_code=$?
    else
        run_test_type "$TEST_TYPE" || exit_code=$?
    fi
    
    generate_summary_report
    
    if [[ $exit_code -eq 0 ]]; then
        log_success "Load testing completed successfully!"
        
        if [[ "$SAVE_RESULTS" == "true" ]]; then
            log_info "Results saved to: $OUTPUT_DIR"
            log_info "View summary: cat $OUTPUT_DIR/test_summary.md"
        fi
    else
        log_error "Load testing completed with failures (exit code: $exit_code)"
    fi
    
    return $exit_code
}

# Run main function
main "$@"