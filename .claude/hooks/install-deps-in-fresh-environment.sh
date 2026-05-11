#!/bin/bash
if [ ! -d "node_modules" ]; then
  echo "No node_modules/ folder appears to exist so we're going to install dependencies..."
  bun install
fi
