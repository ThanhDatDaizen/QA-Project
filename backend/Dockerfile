FROM rust:latest as builder

WORKDIR /app

COPY backend .
COPY public ./public

RUN cargo build --release

# Find and rename the binary to a standardized name
RUN if [ -f /app/target/release/intellectual-contribution-system ]; then \
    cp /app/target/release/intellectual-contribution-system /app/target/release/app; \
    elif [ -f /app/target/release/intellectual_contribution_system ]; then \
    cp /app/target/release/intellectual_contribution_system /app/target/release/app; \
    fi

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/target/release/app ./app
COPY --from=builder /app/public ./public

EXPOSE 8080

CMD ["./app"]
