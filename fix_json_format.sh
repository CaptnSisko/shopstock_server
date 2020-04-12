#!/bin/bash
cd chunks
for f in ./*.json; do
    echo Converting "$f"...
    json5 -o "$f" "$f"
done
cd ..