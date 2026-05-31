BINARY := target/release/nova-edge

.PHONY: build dev test fmt clippy lint run clean check

build:
	cargo build --release

dev:
	cargo build

test:
	cargo test --workspace

test-one:
	cargo test -p $(crate)

check:
	cargo check --workspace

fmt:
	cargo fmt --all -- --check

clippy:
	cargo clippy --workspace -- -D warnings

lint: fmt clippy

run: build
	./$(BINARY)

watch:
	cargo watch -x check -x test

clean:
	cargo clean
