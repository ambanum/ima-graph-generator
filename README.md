# Information Manipulation Analyzer - Graph Generator

This is the graph generator of the "Information Manipulation Analyzer" project.

The main idea is to be able to display of graph of all quotes and retweets for a specific narrative during the last 7 days.

The frontend that will actually log the searches to analyze and display the results can be found [here](https://github.com/ambanum/information-manipulation-analyzer)

## Technical stack

We are using now [Snscrape](https://github.com/JustAnotherArchivist/snscrape) to scrape all the data.
Plan is to migrate Snscrape to the french sovereign bot whenever it will be ready.

We are also using a [Graph generator library](https://github.com/ambanum/social-networks-graph-generator) created by AmbNum and that needs to be installed.

Main program launches concurrently **2** processes to keep some kind of separation of concern in case we want someday to extract some of them into different microservices

- `src/searches.ts` will poll on every tick, retrieve and save the graph and its subsequent files for one search at a time, beginning with the most recent
- `src/server.ts` will expose API routes to interact with this functionalities (This server is not restricted by any API key as it is only meant to be used locally through http://localhost:4001)

## Development

**IMPORTANT** main branch is `main` but all PRs must be against `develop`, except for immediate patches

Once all dependencies listed below are fullfilled, you can launch

```
yarn
yarn dev
```

**NOTE** A docker environment is shipped with this project and you may be able to use it for development purposes if you do not want to install all the following

### mongodb

Install mongoDB and lauch instance

```
brew tap mongodb/brew
brew install mongodb-community@4.4
mongo --version
brew services start mongodb-community
```

then install [mongoDB Compass](https://www.mongodb.com/products/compass) and create a local database

Create a `.env.local` file at the root of the project (You can copy it from `.env.local.example`)
and don't forget to change the name of your local database on the `MONGODB_URI` value

```
NODE_PATH="src"
MONGODB_URI="mongodb://localhost:27017/database-name?&compressors=zlib&retryWrites=true&w=majority"
```

### snscrape

Install snscrape

```
pip3 install git+https://github.com/JustAnotherArchivist/snscrape.git
```

Install jq (for formatting json)

```
brew install jq
```

### graph generator

In order to use the graph generator functionnality, you need to get a provider.
NOTE: we support only one graph generator yet, which is one we developed ourselves and left open source

#### social-networks-graph-generator

We have created an open source one which we can use. See [social-networks-graph-generator](https://github.com/ambanum/social-networks-graph-generator)

You need to install it somewhere on your machine and add to `.env.local` two environment variables

```
GRAPH_GENERATOR_PROVIDER=social-networks-graph-generator
GRAPH_GENERATOR_SOCIAL_NETWORKS_PATH=botfinder
```

## Deployment

If you are part of `AmbNum`, you can use the deploy scripts in the `package.json`
