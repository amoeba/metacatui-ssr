# metacatui-ssr

[Very much a work in progress] implemention of adding partial server-side rendering (SSR) to MetacatUI.

This is an extension of the work at [backbone-pushstate-example](https://github.com/amoeba/backbone-pushstate-example) and was mainly built this as a proof of concept for injecting JSON-LD on the server so [Google Dataset Search](https://toolbox.google.com/datasetsearch) can see it.

The interesting part of the code is a simple [Express.js](https://expressjs.com/) server that servers MetacatUI and intercepts requests for dataset landing pages (/view/...), queries the DataONE CN Solr index and constructs Schema.org JSON-LD to inject into the header and servers that to the client.

## Status

- Only /view/... pages get Schema.org JSON-LD and not all properties are incldued
- No tests
- I'm not sure if this is performant yet

## Pre-requisites

- A working installation of [Node](https://nodejs.org)

## Running it

```sh
git clone https://github.com/amoeba/metacatui-ssr
cd metacatui-ssr
npm install
npm start
```

then just visit `http://localhost:3000` in your browser.
