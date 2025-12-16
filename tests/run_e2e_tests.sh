#!/bin/bash

if ! command -v docker &> /dev/null
then
    echo "Error: docker is not installed" >&2
    exit 1
fi

if [ ! -f docker-compose.yml ]; then
    echo "Error: docker-compose.yml for test environment not found!" >&2
fi

docker compose up \
 --exit-code-from test-runner \
 --force-recreate \
 --build
