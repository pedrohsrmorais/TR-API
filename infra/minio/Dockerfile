# MinIO compilado a partir do código-fonte oficial.
#
# Por quê: a MinIO parou de publicar imagens da edição community (Docker Hub e
# quay.io deixaram de servir minio/minio em set/2026). Compilar a release final
# direto do GitHub evita depender de espelhos de terceiros.
#
# A aplicação fala S3 puro (AWS SDK v3), então trocar por AWS S3 de verdade é só
# mudar variáveis de ambiente. Ver docs/armazenamento.md.

ARG MINIO_RELEASE=RELEASE.2025-10-15T17-29-55Z

FROM golang:1.24-alpine AS build
ARG MINIO_RELEASE
ENV CGO_ENABLED=0 GOTOOLCHAIN=auto
RUN apk add --no-cache git
RUN git clone --depth 1 --branch "${MINIO_RELEASE}" https://github.com/minio/minio.git /src
WORKDIR /src
RUN go build -trimpath -ldflags "-s -w" -o /out/minio .

FROM alpine:3.20
RUN apk add --no-cache ca-certificates curl \
 && addgroup -S minio && adduser -S -G minio minio \
 && mkdir -p /data && chown minio:minio /data
COPY --from=build /out/minio /usr/bin/minio
USER minio
EXPOSE 9000 9001
VOLUME ["/data"]
ENTRYPOINT ["/usr/bin/minio"]
CMD ["server", "/data", "--console-address", ":9001"]
