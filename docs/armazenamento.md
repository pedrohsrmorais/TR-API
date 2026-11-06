# Armazenamento (MinIO → AWS S3)

O código fala **S3 puro** via AWS SDK v3 (`@aws-sdk/client-s3`). O MinIO é só o S3 local de desenvolvimento.

## Organização no bucket

```
tr-api-processos/
├── processos/{J}/{SIGLA}/{numero20}/{jobId}/{arquivo}   ex.: processos/5/TRT9/00001238120245090001/42/..._integra.pdf
└── debug/{jobId}/tentativa-{N}-erro.png                 prints de falha do robô
```

Cada download fica numa pasta própria do job: baixar de novo não sobrescreve a versão anterior.

## Sobre a imagem do MinIO

A MinIO deixou de distribuir binários e imagens da edição community, e ao longo de 2026 as imagens `minio/minio` saíram do Docker Hub e do quay.io. Para não depender de espelhos de terceiros, `infra/minio/Dockerfile` **compila a release final oficial** (`RELEASE.2025-10-15T17-29-55Z`) direto do GitHub. O primeiro build leva alguns minutos e depois fica em cache.

Alternativas, se um dia isso incomodar: um fork mantido pela comunidade ou outro servidor compatível com S3 (Garage, SeaweedFS). Como o código só fala S3, trocar é mexer apenas no `docker-compose.yml`.

## Migrar para AWS S3

1. Crie o bucket na AWS e uma IAM role/usuário com `s3:GetObject`, `s3:PutObject` e `s3:ListBucket` nele.
2. No `.env` / variáveis do deploy:
   ```
   S3_ENDPOINT=            # vazio = AWS
   S3_REGIAO=sa-east-1
   S3_BUCKET=nome-do-bucket
   S3_FORCAR_PATH_STYLE=false
   S3_CRIAR_BUCKET=false
   S3_ACCESS_KEY=          # vazio = usa a IAM role da máquina/container
   S3_SECRET_KEY=
   ```
3. Remova o serviço `minio` do compose de produção.
4. (Opcional) Trocar o streaming do backend por URL pré-assinada (`@aws-sdk/s3-request-presigner`) em `services/documentos.service.js`.

Para copiar o que já existe no MinIO: `mc mirror local/tr-api-processos s3/nome-do-bucket`.
