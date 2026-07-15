# Offline Model

Offline mode is device-local and conservative.

Works offline after the app has previously loaded:

- neutral offline shell
- active workout resume from local storage
- set logging, RIR, form rating, notes, substitutions, rest timer
- workout completion saved on this device
- device backup export
- review of locally cached records

Requires connection:

- account verification
- profile/settings saves
- sync push and pull
- server reports
- device/session management

Authentication is not bypassed offline. The app records a local marker for the last authenticated account and device. Logout disables offline private access for that account without deleting unsynced records.

Existing local repositories are not fully migrated to account-prefixed storage in this sprint. The guard marker prevents account B from being treated as account A in offline device mode; a full storage namespace migration remains a future hardening item.

The offline shell contains no profile, health, meal, workout, token, or account data.
