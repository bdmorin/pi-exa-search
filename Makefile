.DEFAULT_GOAL := help

.PHONY: help install format lint typecheck test check release-dry-run changeset version-packages release-github

help:
	@printf '%s\n' \
		'Available targets:' \
		'  make install' \
		'  make format' \
		'  make lint' \
		'  make typecheck' \
		'  make test' \
		'  make check' \
		'  make release-dry-run' \
		'  make changeset' \
		'  make version-packages' \
		'  make release-github'

install:
	npm ci

format:
	npm run format

lint:
	npm run lint

typecheck:
	npm run typecheck

test:
	npm run test

check:
	npm run check

release-dry-run:
	npm run release:dry-run

changeset:
	npm run changeset

version-packages:
	npm run version-packages

release-github:
	npm run release:github
