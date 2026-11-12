#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "Starting deployment..."

echo "Pulling latest code from GitHub..."
git pull origin main

echo "Building and recreating Docker containers..."
# --build forces a new image build, -d runs it in detached mode
docker compose up --build -d

echo "Cleaning up old unused, dangling images to save disk space..."
docker image prune -f

echo "Deployment successful! Avtarapp is live on port 4029."