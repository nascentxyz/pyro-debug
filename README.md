# Pyrometer Site Debugger

There are two components to the Pyrometer Site Debugger:

1. server
2. site

## Setting up

### Server

Run the server:
```bash
cd server
cargo run --release
```

### Site

Set up the site:
```bash
cd site
npm install
npm run build
```

Visit http://127.0.0.1:8545

### Pyrometer

Run pyrometer:
```bash
pyrometer <path/to/file.sol> --debug-site
```

Using the `--debug-site` flag will make pyrometer post messages to the server, which the site will retrieve.
