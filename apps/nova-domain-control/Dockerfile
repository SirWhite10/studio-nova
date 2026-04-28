FROM oven/bun:1 AS build

WORKDIR /src

COPY package.json ./
RUN bun install --production

COPY tsconfig.json ./
COPY src ./src

RUN bun build src/index.ts --compile --outfile /out/nova-domain-control

FROM gcr.io/distroless/base-debian12:nonroot

WORKDIR /app

COPY --from=build /out/nova-domain-control /app/nova-domain-control

EXPOSE 8787

ENTRYPOINT ["/app/nova-domain-control"]
