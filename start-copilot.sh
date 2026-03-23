#!/bin/bash
# Script to start Copilot CLI in the correct directory

PROJECT_ROOT="/home/nhatbang/EXE101/PRJ"

echo "🔧 Starting Copilot CLI for Invera project..."
echo "📁 Project root: $PROJECT_ROOT"
echo ""

# Change to project root
cd "$PROJECT_ROOT" || exit 1

# Verify git root
GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
if [ "$GIT_ROOT" != "$PROJECT_ROOT" ]; then
    echo "❌ Error: Not in git root!"
    echo "   Expected: $PROJECT_ROOT"
    echo "   Got: $GIT_ROOT"
    exit 1
fi

echo "✅ Git root verified"
echo "✅ Custom agents available in .github/agents/"
echo ""
echo "Available custom agents:"
ls -1 .github/agents/*.agent.md | xargs -n1 basename | sed 's/.agent.md//' | sed 's/^/  - /'
echo ""
echo "🚀 Starting GitHub Copilot CLI..."
echo "   Try: /agent invera-dev"
echo ""

# Start Copilot CLI
exec gh copilot
