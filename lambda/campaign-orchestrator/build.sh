#!/bin/bash
# This script provides an explicit command to run the TypeScript compiler.

# Exit immediately if a command exits with a non-zero status.
set -e

echo "--- Running build.sh: Compiling TypeScript... ---"

# Execute the TypeScript compiler installed in node_modules
./node_modules/typescript/bin/tsc

echo "--- build.sh: TypeScript compilation successful. ---"
