#!/bin/bash

cd ~/EgoCarz
git add .
git commit -m "Manual sync at $(date)"
git push EgoCarz
