package main

import (
	"context"
	"flag"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/adopting-bitcoin/dashboard/internal/mock"
)

func main() {
	addr := flag.String("addr", ":9999", "Mock server listen address")
	interval := flag.Duration("interval", 10*time.Second, "Transaction generation interval")
	noGen := flag.Bool("no-gen", false, "Disable automatic transaction generation")
	flag.Parse()

	logger := log.New(os.Stdout, "[MOCK] ", log.LstdFlags)

	logger.Println("===========================================")
	logger.Println("Mock PayWithFlash API Server")
	logger.Println("===========================================")
	logger.Printf("Listen address: %s\n", *addr)
	logger.Printf("Generation interval: %s\n", *interval)
	logger.Printf("Auto-generation: %v\n", !*noGen)
	logger.Println("===========================================")

	server := mock.NewServer(mock.Config{
		Addr:                 *addr,
		GenerationInterval:   *interval,
		EnableAutoGeneration: !*noGen,
	}, logger)

	// Setup 20 default merchants with minimal historical data
	logger.Println("Setting up 20 merchants with baseline transaction data...")
	logger.Println("Transactions will accumulate gradually over time via auto-generation...")
	server.SetupDefaultMerchants()
	logger.Println("Setup complete!")

	logger.Println("")
	logger.Println("Merchants configured:")
	for i, id := range server.ListMerchants() {
		m, _ := server.GetMerchant(id)
		logger.Printf("  %2d. ID: %-4s  %-25s  Products: %2d  Freq: %.2f tx/min\n",
			i+1, id, m.Profile.Alias, len(m.Data.Products), m.Profile.TxFrequency)
	}
	logger.Println("")

	logger.Println("API Endpoints:")
	logger.Printf("  GET  %s/user-pos/{merchantID}?user_public_key={key}\n", server.URL())
	logger.Printf("  GET  %s/admin/merchants\n", server.URL())
	logger.Printf("  POST %s/admin/merchants/{id}/reset\n", server.URL())
	logger.Printf("  GET  %s/health\n", server.URL())
	logger.Println("")

	logger.Println("To use with dashboard backend, set:")
	logger.Printf("  export SOURCE_BASE_URL=%s\n", server.URL())
	logger.Println("")
	logger.Println("Then add merchants via dashboard admin API:")
	logger.Println("  curl -X POST http://localhost:8080/v1/admin/merchants \\")
	logger.Println("    -H \"Authorization: Bearer $ADMIN_TOKEN\" \\")
	logger.Println("    -H \"Content-Type: application/json\" \\")
	logger.Println("    -d '{\"id\":\"100\",\"public_key\":\"mock_pubkey_0\",\"alias\":\"Bitcoin Coffee\",\"enabled\":true}'")
	logger.Println("")
	logger.Println("Or use the setup script to add all 20 merchants automatically.")
	logger.Println("===========================================")
	logger.Println("")

	// Start server in background
	go func() {
		if err := server.Start(); err != nil {
			logger.Fatalf("server error: %v", err)
		}
	}()

	// Wait for interrupt
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Println("Shutting down...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		logger.Printf("shutdown error: %v", err)
	}

	logger.Println("Server stopped")
}
