# Service ML

Legacy message weighting algorithm for Clairvoyance. Uses Elasticsearch to create
tree structures from messages.

## Getting Started

Set up your variables for local development:

```sh
cp settings.example.json settings.json
vi settings.json
```

# Running Migrations

If you need to manually run migrations:

```sh
yarn run migrate:up # create tables for the development DB
yarn run migrate:up:test # create tables for the test DB
```

## Running Tests

Run unit tests with:

```sh
yarn run test
```

Run integration tests with:

```sh
yarn run test-integration
```

Integration tests will automatically run the seeders for your in test mode.
