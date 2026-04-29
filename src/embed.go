package myEmbed

import "embed"

//go:embed queries/*.sql
var QueryFiles embed.FS
