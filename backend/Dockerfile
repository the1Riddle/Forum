FROM golang:alpine AS builder

RUN apk add --no-cache gcc musl-dev sqlite-dev

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

ENV CGO_ENABLED=1

RUN go build -ldflags="-w -s" -o server .

FROM alpine:3.19

RUN apk add --no-cache ca-certificates sqlite

WORKDIR /app

COPY --from=builder /app/server .
COPY --from=builder /app/pkg/db/migrations/sqlite ./pkg/db/migrations/sqlite

RUN mkdir -p uploads data

EXPOSE 8000

CMD ["./server"]
