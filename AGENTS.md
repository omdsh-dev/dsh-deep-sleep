# dsh-deep-sleep contributor notes

- This repository is a standalone DeepSeek Harness Profile Bundle. Do not edit an installed DSH checkout.
- Preserve the function-plugin named exports (`name`, `inject`, `apply`); do not add a default export to the Node half.
- All product behavior is browser-local. Do not register a model tool or write sleep/reminder events into a session log.
- Compose UI only through the official `conversation.session.header.actions` slot and clean up every timer, listener, and storage subscription on disposal.
- Keep `lib/` prebuilt for tarball/Git consumers and keep package contents self-contained.
- Product copy is Chinese. Code comments are English.
- Run typecheck, unit tests, build, package inspection, isolated profile install, config dump, and a real Web smoke before release.
