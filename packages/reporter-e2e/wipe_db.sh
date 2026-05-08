#!/bin/bash
cd /Users/georgesutaru/Git/playwright-extensions/packages/reporter-server
docker compose down -v
docker compose up -d
sleep 5
