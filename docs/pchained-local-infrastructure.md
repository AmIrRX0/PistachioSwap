# Pchained local infrastructure

PistachioSwap uses Pchained as a separate self-hosted blockchain indexing and
wallet-data service. Pchained is an independent MIT-licensed project derived
from ShapeShift Unchained and is not operated, maintained, sponsored, or
endorsed by ShapeShift.

Original upstream project:
https://github.com/shapeshift/unchained

Pchained repository:
https://github.com/parsij/Pchained.git

The local BNB Smart Chain setup is pinned to:
0d9cf6682b329b2b14a8959400a25720a77247e0

Prepare the local checkout with:

```sh
sh scripts/unchained-local/prepare-pchained.sh
```

The compose service keeps the existing PistachioSwap compatibility contract:
`UNCHAINED_*` environment variables remain PistachioSwap-side settings, the
Pchained BNB API is exposed on `127.0.0.1:3156`, and the wallet account route
remains `/api/v1/account/{wallet}`.
