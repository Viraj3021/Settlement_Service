#!/usr/bin/env bash
set -e
curl -s -X POST http://localhost:3000/events/booking-completed \
  -H 'content-type: application/json' \
  --data-binary @examples/booking-completed.json | jq .
curl -s http://localhost:3000/settlements/bk_8f2a | jq .
