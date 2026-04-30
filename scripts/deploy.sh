#!/usr/bin/env bash
# Deploy Soroban contracts to Stellar Testnet or Mainnet
# Required env vars:
#   STELLAR_SECRET_KEY       - deployer account secret key
#   NEXT_PUBLIC_HORIZON_URL  - Horizon endpoint (default: https://horizon-testnet.stellar.org)
#   NEXT_PUBLIC_NETWORK_PASSPHRASE - network passphrase (default: Test SDF Network ; September 2015)

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
HORIZON_URL="${NEXT_PUBLIC_HORIZON_URL:-https://horizon-testnet.stellar.org}"
NETWORK_PASSPHRASE="${NEXT_PUBLIC_NETWORK_PASSPHRASE:-Test SDF Network ; September 2015}"
RPC_URL="${SOROBAN_RPC_URL:-https://soroban-testnet.stellar.org}"

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v soroban &> /dev/null; then
        log_error "soroban-cli is not installed"
        log_info "Install it with: cargo install --locked soroban-cli --features opt"
        exit 1
    fi
    
    if ! command -v cargo &> /dev/null; then
        log_error "cargo is not installed"
        log_info "Install Rust from: https://rustup.rs/"
        exit 1
    fi
    
    log_success "All prerequisites met"
}

# Validate environment
validate_env() {
    log_info "Validating environment..."
    
    if [[ -z "${STELLAR_SECRET_KEY:-}" ]]; then
        log_error "STELLAR_SECRET_KEY is required"
        exit 1
    fi
    
    # Validate secret key format (starts with S and is 56 characters)
    if [[ ! "${STELLAR_SECRET_KEY}" =~ ^S[A-Z2-7]{55}$ ]]; then
        log_error "Invalid STELLAR_SECRET_KEY format"
        exit 1
    fi
    
    log_success "Environment validated"
}

# Display configuration
display_config() {
    log_info "Deployment Configuration:"
    echo "  Network: ${NETWORK_PASSPHRASE}"
    echo "  Horizon URL: ${HORIZON_URL}"
    echo "  RPC URL: ${RPC_URL}"
    echo ""
}

# Build contracts
build_contracts() {
    log_info "Building contracts..."
    
    CONTRACTS_DIR="$(cd "$(dirname "$0")/../contracts" && pwd)"
    cd "$CONTRACTS_DIR"
    
    # Clean previous builds
    cargo clean
    
    # Build with optimizations
    cargo build --target wasm32-unknown-unknown --release
    
    if [[ ! -f "target/wasm32-unknown-unknown/release/payment.wasm" ]]; then
        log_error "Payment contract build failed"
        exit 1
    fi
    
    if [[ ! -f "target/wasm32-unknown-unknown/release/escrow.wasm" ]]; then
        log_error "Escrow contract build failed"
        exit 1
    fi
    
    log_success "Contracts built successfully"
}

# Deploy contract
deploy_contract() {
    local CONTRACT_NAME=$1
    local WASM_PATH=$2
    
    log_info "Deploying ${CONTRACT_NAME}..."
    
    local CONTRACT_ID
    CONTRACT_ID=$(soroban contract deploy \
        --wasm "$WASM_PATH" \
        --source "$STELLAR_SECRET_KEY" \
        --rpc-url "$RPC_URL" \
        --network-passphrase "$NETWORK_PASSPHRASE" 2>&1)
    
    if [[ $? -ne 0 ]]; then
        log_error "${CONTRACT_NAME} deployment failed"
        echo "$CONTRACT_ID"
        exit 1
    fi
    
    log_success "${CONTRACT_NAME} deployed: ${CONTRACT_ID}"
    echo "$CONTRACT_ID"
}

# Save deployment info
save_deployment_info() {
    local PAYMENT_ID=$1
    local ESCROW_ID=$2
    
    local DEPLOYMENT_FILE="deployment-$(date +%Y%m%d-%H%M%S).env"
    
    cat > "$DEPLOYMENT_FILE" << EOF
# Deployment Configuration
# Generated: $(date)
# Network: ${NETWORK_PASSPHRASE}

NEXT_PUBLIC_PAYMENT_CONTRACT_ID=${PAYMENT_ID}
NEXT_PUBLIC_ESCROW_CONTRACT_ID=${ESCROW_ID}
NEXT_PUBLIC_HORIZON_URL=${HORIZON_URL}
NEXT_PUBLIC_NETWORK_PASSPHRASE=${NETWORK_PASSPHRASE}
NEXT_PUBLIC_SOROBAN_RPC_URL=${RPC_URL}
EOF
    
    log_success "Deployment info saved to: ${DEPLOYMENT_FILE}"
}

# Main deployment flow
main() {
    echo ""
    log_info "🚀 Starting Stellar Freelance Platform Deployment"
    echo ""
    
    check_prerequisites
    validate_env
    display_config
    
    # Confirm deployment
    read -p "Continue with deployment? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warning "Deployment cancelled"
        exit 0
    fi
    
    build_contracts
    
    CONTRACTS_DIR="$(cd "$(dirname "$0")/../contracts" && pwd)"
    PAYMENT_WASM="$CONTRACTS_DIR/target/wasm32-unknown-unknown/release/payment.wasm"
    ESCROW_WASM="$CONTRACTS_DIR/target/wasm32-unknown-unknown/release/escrow.wasm"
    
    echo ""
    PAYMENT_CONTRACT_ID=$(deploy_contract "PaymentContract" "$PAYMENT_WASM")
    echo ""
    ESCROW_CONTRACT_ID=$(deploy_contract "EscrowContract" "$ESCROW_WASM")
    
    echo ""
    log_success "🎉 Deployment complete!"
    echo ""
    
    save_deployment_info "$PAYMENT_CONTRACT_ID" "$ESCROW_CONTRACT_ID"
    
    echo ""
    log_info "Add these to your frontend/.env.local:"
    echo ""
    echo "NEXT_PUBLIC_PAYMENT_CONTRACT_ID=$PAYMENT_CONTRACT_ID"
    echo "NEXT_PUBLIC_ESCROW_CONTRACT_ID=$ESCROW_CONTRACT_ID"
    echo "NEXT_PUBLIC_HORIZON_URL=$HORIZON_URL"
    echo "NEXT_PUBLIC_NETWORK_PASSPHRASE=$NETWORK_PASSPHRASE"
    echo "NEXT_PUBLIC_SOROBAN_RPC_URL=$RPC_URL"
    echo ""
}

# Run main function
main
