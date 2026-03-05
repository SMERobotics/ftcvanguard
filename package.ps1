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
# npx cap init "Vanguard" org.ftcvanguard.ftcvanguard --web-dir dist
# npx cap add android
# npx cap add ios

# copy files
npx cap sync android
npx cap sync ios
npx cap sync electron

# done!
echo "project sync complete."
echo "test android: ``npx cap open android``"
echo "test ios: ``npx cap open ios``"
echo "test electron: ``npx cap open electron``"