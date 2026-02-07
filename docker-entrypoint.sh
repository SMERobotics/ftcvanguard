#!/bin/bash
set -e

# Ensure /app exists
mkdir -p /app

cd /app

# Initialize git repo if it doesn't exist
if [ ! -d .git ]; then
    git init
    git remote add origin https://github.com/youruser/ftcvanguard.git
    git pull origin main
fi

# Generate SSH keys if missing
if [ ! -f /home/vanguard/.ssh/id_rsa.pem ]; then
    rm -f /home/vanguard/.ssh/*
    openssl genpkey -algorithm RSA -out /home/vanguard/.ssh/id_rsa.pem -pkeyopt rsa_keygen_bits:4096
    openssl rsa -in /home/vanguard/.ssh/id_rsa.pem -pubout -out /home/vanguard/.ssh/id_rsa.pub
fi

# Start the app with Gunicorn
exec gunicorn main:app --bind 0.0.0.0:8000 --workers 4
