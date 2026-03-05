#!/bin/bash

set -e # Exit immediately if a command exits with a non-zero status

# install deps
npm install

# compile ts
npx tsc

# copy files
rm -rf dist
mkdir -p dist
cp static/app.html dist/index.html
cp -r static/assets dist/

# init project (uncomment if needed)
# npx cap init "Vanguard" org.ftcvanguard.ftcvanguard --web-dir dist
# npx cap add android
# npx cap add ios

# sync project
npx cap sync android
npx cap sync ios
npx cap sync electron

# done!
echo "project sync complete."
echo "test android: ``npx cap open android``"
echo "test ios: ``npx cap open ios``"
echo "test electron: ``npx cap open electron``"