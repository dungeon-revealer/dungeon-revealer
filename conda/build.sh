#!/bin/bash

mkdir -p $PREFIX/bin
mkdir -p $PREFIX/lib/dungeon-revealer
DR_DIR=$PREFIX/lib/dungeon-revealer

cd $SRC_DIR
npm i
npm run build
npm prune --production

mv bin $DR_DIR/bin
mv build $DR_DIR/build
mv server-build $DR_DIR/server-build
mv node_modules $DR_DIR/node_modules
mv package*.json $DR_DIR/

cd $PREFIX/bin
ln -s ../lib/dungeon-revealer/bin/dungeon-revealer dungeon-revealer