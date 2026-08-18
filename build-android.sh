#!/bin/bash

echo "=================================="
echo "Mealfy - Build Android APK"
echo "=================================="

echo ""
echo "[1/4] Building web app..."
npm run build

if [ $? -ne 0 ]; then
    echo "Erro no build web. Abortando."
    exit 1
fi

echo ""
echo "[2/4] Syncing with Capacitor..."
npx cap sync android

if [ $? -ne 0 ]; then
    echo "Erro no sync Capacitor. Abortando."
    exit 1
fi

echo ""
echo "[3/4] Building Android APK..."
cd android
./gradlew assembleDebug

if [ $? -ne 0 ]; then
    echo "Erro no build Android. Abortando."
    exit 1
fi

echo ""
echo "[4/4] Build completed!"
echo ""
echo "APK location: android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "To install on device: adb install android/app/build/outputs/apk/debug/app-debug.apk"
echo "To open in Android Studio: npx cap open android"
