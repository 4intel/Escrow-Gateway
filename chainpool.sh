#!/bin/bash

if [ ! -d ~/.hfc-key-store/ ]; then
  mkdir ~/.hfc-key-store/
fi
cp ./chainpool-frontend-creds/* ~/.hfc-key-store/

if [ ! -d ./node_modules ]; then
  npm install
fi

nodemon server.js
