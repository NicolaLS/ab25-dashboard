package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config collects runtime knobs for the dashboard service.
type Config struct {
	Addr                    string
	DBPath                  string
	AdminToken              string
	WebhookSecret           string // Optional: validates WiFi webhooks
	PollInterval            time.Duration
	PollConcurrency         int
	HTTPTimeout             time.Duration
	TickerLimit             int
	RateWindow              time.Duration
	DefaultLeaderboardLimit int
	DataAPIBaseURL          string
	CORSOrigins             []string
}

// FromEnv builds a Config from environment variables, applying sensible defaults.
func FromEnv() Config {
	cfg := Config{
		Addr:                    getEnv("ADDR", ":8080"),
		DBPath:                  getEnv("DB_PATH", "dashboard.db"),
		AdminToken:              os.Getenv("ADMIN_TOKEN"),
		WebhookSecret:           os.Getenv("WEBHOOK_SECRET"), // Optional
		PollInterval:            getDuration("POLL_INTERVAL", 30*time.Second),
		PollConcurrency:         getInt("POLL_CONCURRENCY", 5),
		HTTPTimeout:             getDuration("HTTP_TIMEOUT", 10*time.Second),
		TickerLimit:             getInt("TICKER_LIMIT", 20),
		RateWindow:              getDuration("RATE_WINDOW", 5*time.Minute),
		DefaultLeaderboardLimit: getInt("LEADERBOARD_LIMIT", 10),
		DataAPIBaseURL:          getEnv("SOURCE_BASE_URL", "https://api.paywithflash.com"),
		CORSOrigins:             getSlice("CORS_ORIGINS", []string{"*"}),
	}
	return cfg
}

// Validate ensures mandatory fields are populated.
func (c Config) Validate() error {
	if c.AdminToken == "" {
		return fmt.Errorf("ADMIN_TOKEN must be set")
	}
	if c.PollInterval <= 0 {
		return fmt.Errorf("poll interval must be > 0")
	}
	if c.PollConcurrency <= 0 {
		return fmt.Errorf("poll concurrency must be > 0")
	}
	if c.HTTPTimeout <= 0 {
		return fmt.Errorf("http timeout must be > 0")
	}
	if c.TickerLimit <= 0 {
		return fmt.Errorf("ticker limit must be > 0")
	}
	if c.DefaultLeaderboardLimit <= 0 {
		return fmt.Errorf("leaderboard limit must be > 0")
	}
	if c.DataAPIBaseURL == "" {
		return fmt.Errorf("SOURCE_BASE_URL must be set")
	}
	return nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getDuration(key string, fallback time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return fallback
}

func getInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return fallback
}

func getSlice(key string, fallback []string) []string {
	if v := os.Getenv(key); v != "" {
		parts := strings.Split(v, ",")
		result := make([]string, 0, len(parts))
		for _, part := range parts {
			if trimmed := strings.TrimSpace(part); trimmed != "" {
				result = append(result, trimmed)
			}
		}
		if len(result) > 0 {
			return result
		}
	}
	return fallback
}
