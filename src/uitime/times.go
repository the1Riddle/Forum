package uitime

import (
	"strings"
	"time"
)

func FormatDate(s string) string {
	formats := []string{
		"2026-01-05T15:04:05Z",
		time.RFC3339,
		"2026-01-05 15:04:05",
		"2026-01-05T15:04:05",
	}
	s = strings.TrimSpace(s)
	for _, f := range formats {
		if t, err := time.Parse(f, s); err == nil {
			return t.Format("May 5, 2026 at 3:04 PM")
		}
	}
	return s
}
