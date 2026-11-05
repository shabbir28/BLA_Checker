# BLA verification behavior

The service validates each batch directly, with SDK auto-merging disabled. A successful response must account for every submitted phone through an explicit clean or suppression list, have matching counts, and include the required classification fields. Missing results never default to clean.

Each batch is requested twice. A DNC/clean disagreement fails the entire session through the existing FAILED/unverified flow, which blocks exports. Both observations are retained in the existing JSON response field for successful sessions. Disagreement about line type is labeled Unknown instead of guessing a type.

Two checks increase API usage and latency. Agreement is not proof of provider accuracy: repeated incorrect clean responses cannot be detected using only this API. Live investigation found inconsistent responses even for the same numbers, endpoint, and key. The provider must investigate this before the results can be treated as reliable. Do not bypass failed verification or reuse an older clean export as proof of a current check.

No database migration is required. Deploy the backend changes and restart backend workers. Existing sessions and exports are not retroactively changed; old files need to be checked again after provider consistency is restored.

Run the regression suite from the backend directory:

```sh
node --test test/blaVerification.test.js
```
