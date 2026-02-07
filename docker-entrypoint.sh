#!/bin/bash
set -e

mkdir -p /app

cd /app

if [ ! -f /home/vanguard/.ssh/id_rsa.pem ]; then
    rm -f /home/vanguard/.ssh/*
    openssl genpkey -algorithm RSA -out /home/vanguard/.ssh/id_rsa.pem -pkeyopt rsa_keygen_bits:4096
    openssl rsa -in /home/vanguard/.ssh/id_rsa.pem -pubout -out /home/vanguard/.ssh/id_rsa.pub
fi

exec gunicorn main:app --bind 0.0.0.0:8000 --workers 4
