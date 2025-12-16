@echo off
set NODE_OPTIONS=--dns-result-order=ipv4first
set AWS_EC2_METADATA_DISABLED=true
set UV_THREADPOOL_SIZE=128

echo Starting Energy Trading Platform with DNS fix...
node server.js
