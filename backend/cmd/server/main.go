package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/adopting-bitcoin/dashboard/internal/api"
	"github.com/adopting-bitcoin/dashboard/internal/config"
	"github.com/adopting-bitcoin/dashboard/internal/ingest"
	"github.com/adopting-bitcoin/dashboard/internal/store"
)

func main() {
	cfg := config.FromEnv()
	logger := log.New(os.Stdout, "[dashboard] ", log.LstdFlags|log.Lmicroseconds)

	if err := cfg.Validate(); err != nil {
		logger.Fatalf("invalid configuration: %v", err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	st, err := store.New(cfg.DBPath)
	if err != nil {
		logger.Fatalf("open db: %v", err)
	}
	defer st.Close()
	if err := st.Init(ctx); err != nil {
		logger.Fatalf("init db: %v", err)
	}

	poller := ingest.NewPoller(st, ingest.Config{
		Interval: cfg.PollInterval,
		Timeout:  cfg.HTTPTimeout,
		BaseURL:  cfg.DataAPIBaseURL,
	}, logger)
	go poller.Start(ctx)

	server := api.NewServer(cfg, st, poller, logger)

	if err := server.Run(ctx); err != nil {
		logger.Fatalf("server error: %v", err)
	}
}
