#!/bin/bash
set -e

echo "=== [1/4] Building frontend ==="
cd frontend
npm install
VITE_API_URL="" npm run build
cd ..

echo "=== [2/4] Copying frontend dist to backend/public ==="
rm -rf backend/public
mkdir -p backend/public
cp -r frontend/dist/. backend/public/
echo "Files in backend/public:"
ls backend/public/

echo "=== [3/4] Building backend ==="
cd backend
npm install
DATABASE_URL="postgresql://x:x@localhost/x" npx prisma generate
npm run build

echo "=== [4/4] Build complete ==="
ls dist/
