# Build stage
FROM golang:1.25-alpine AS builder

RUN apk add --no-cache gcc musl-dev sqlite-dev

WORKDIR /app

COPY go.mod go.sum ./

RUN go mod download

COPY . .

RUN CGO_ENABLED=1 GOOS=linux go build -o forum .

# Production Stage
FROM alpine:latest

RUN apk add --no-cache sqlite-libs

WORKDIR /app
RUN mkdir -p /app/src/data

COPY --from=builder /app/forum .
COPY --from=builder /app/templates ./templates

EXPOSE 8000

CMD ["./forum"]

