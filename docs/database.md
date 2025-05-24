
Many game entities have a representation in the Postgres database:

1. Places always have a persistent representation in the database.
2. Players always a persistent representation in the database.
3. Items that are *on-chain* have a persistent representation in the database.

Everything else only exists within the context of a persistent entity (like a player or place) and is not stored in the database.

We can cheat this way due to the pure, deterministic nature of our game logic reducers.
