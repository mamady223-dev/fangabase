.PHONY: setup dev test build release-check
setup:
	pnpm install --frozen-lockfile
dev:
	pnpm dev
test:
	pnpm test
build:
	pnpm build
release-check:
	pnpm release:check
