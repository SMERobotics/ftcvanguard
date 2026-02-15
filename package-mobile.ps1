#!/bin/bash

# install deps
npm install

# compile ts
npx tsc

# copy files

rm dist -Recurse -Force -ErrorAction SilentlyContinue
mkdir dist -Force
cp static/app.html dist/index.html -Force
cp -r static/assets/ dist/assets/ -Force

# init proj
# npx cap init "Vanguard" org.technodot.ftcvanguard --web-dir dist
# npx cap add android
# npx cap add ios

# copy files
npx cap sync

echo "project sync complete."
echo "build android: ``npx cap open android``"
echo "build ios: ``npx cap open ios``"