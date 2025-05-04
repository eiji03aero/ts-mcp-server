#!/bin/bash

# Project utility script for Docker operations

# Function to display usage instructions
usage() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  up     - Start Docker Compose services"
    echo "  stop   - Stop Docker Compose services"
    echo "  shell  - Open a shell in the workspace container"
    exit 1
}

# Check if at least one argument is provided
if [ $# -eq 0 ]; then
    usage
fi

# Parse command
case "$1" in
    up)
        docker-compose -f docker-compose.yml up -d
        ;;
    stop)
        docker-compose -f docker-compose.yml stop
        ;;
    shell)
        docker-compose -f docker-compose.yml exec workspace /bin/bash
        ;;
    *)
        usage
        ;;
esac