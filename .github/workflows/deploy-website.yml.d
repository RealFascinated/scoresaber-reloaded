name: Deploy Website

on:
  workflow_dispatch:
  push:
    branches:
      - master
    paths:
      - projects/website/**
      - projects/common/**
      - .gitea/workflows/deploy-website.yml
      - bun.lockb

jobs:
  docker:
    strategy:
      matrix:
        arch: ["ubuntu-latest"]
    runs-on: ${{ matrix.arch }}

    # Steps to run
    steps:
      # Checkout the repo
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      # Deploy to Dokku
      - name: Push to dokku
        uses: dokku/github-action@master
        with:
          git_remote_url: "ssh://dokku@51.158.63.74:22/ssr-website"
          ssh_private_key: ${{ secrets.SSH_PRIVATE_KEY }}
