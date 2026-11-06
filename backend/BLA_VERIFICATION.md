# BLA verification behavior

The service validates each batch directly, with SDK auto-merging disabled. Every submitted phone must receive an explicit clean or suppression classification. Partial responses are retained and only missing phones are retried, for at most three attempts per pass. The processed count must match the classifications returned. Unresolved results fail the session and never default to clean or DNC.

Each batch is requested twice. A DNC/clean disagreement retains the DNC classification and records the conflict. Failed requests, invalid responses, or unresolved missing results use the FAILED/unverified flow, which blocks exports. Both observations are retained in the existing JSON response field for successful sessions. Disagreement about line type is labeled Unknown instead of guessing a type.

Two checks increase API usage and latency. Agreement is not proof of provider accuracy: repeated incorrect clean responses cannot be detected using only this API. Live investigation found inconsistent responses even for the same numbers, endpoint, and key. The provider must investigate this before the results can be treated as reliable. Do not bypass failed verification or reuse an older clean export as proof of a current check.

No database migration is required. Deploy the backend changes and restart backend workers. Existing sessions and exports are not retroactively changed; old files need to be checked again after provider consistency is restored.

Run the regression suite from the backend directory:

```sh
node --test test/blaVerification.test.js
```
