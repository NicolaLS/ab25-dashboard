package mock

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"
)

// Server is a mock PayWithFlash API server.
type Server struct {
	merchants map[string]*Merchant
	mu        sync.RWMutex
	logger    *log.Logger
	server    *http.Server
	ticker    *time.Ticker
	done      chan struct{}
}

// Config configures the mock server.
type Config struct {
	Addr                string        // Listen address
	GenerationInterval  time.Duration // How often to generate new transactions
	EnableAutoGeneration bool          // Whether to auto-generate transactions
}

// NewServer creates a new mock PayWithFlash server.
func NewServer(cfg Config, logger *log.Logger) *Server {
	if cfg.Addr == "" {
		cfg.Addr = ":9999"
	}
	if cfg.GenerationInterval <= 0 {
		cfg.GenerationInterval = 10 * time.Second
	}

	s := &Server{
		merchants: make(map[string]*Merchant),
		logger:    logger,
		done:      make(chan struct{}),
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/user-pos/", s.handleUserPOS)
	mux.HandleFunc("/admin/merchants", s.handleAdminMerchants)
	mux.HandleFunc("/admin/merchants/", s.handleAdminMerchantsDetail)
	mux.HandleFunc("/health", s.handleHealth)

	s.server = &http.Server{
		Addr:    cfg.Addr,
		Handler: mux,
	}

	if cfg.EnableAutoGeneration {
		s.ticker = time.NewTicker(cfg.GenerationInterval)
		go s.autoGenerate(cfg.GenerationInterval)
	}

	return s
}

// Start starts the mock server.
func (s *Server) Start() error {
	s.logger.Printf("mock server starting on %s\n", s.server.Addr)
	if err := s.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		return err
	}
	return nil
}

// Shutdown gracefully stops the server.
func (s *Server) Shutdown(ctx context.Context) error {
	close(s.done)
	if s.ticker != nil {
		s.ticker.Stop()
	}
	return s.server.Shutdown(ctx)
}

// AddMerchant adds a merchant to the mock server.
func (s *Server) AddMerchant(merchant *Merchant) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.merchants[merchant.ID] = merchant
	s.logger.Printf("added merchant %s (%s) with %d products\n", merchant.ID, merchant.Profile.Alias, len(merchant.Data.Products))
}

// GetMerchant retrieves a merchant by ID.
func (s *Server) GetMerchant(id string) (*Merchant, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	m, ok := s.merchants[id]
	return m, ok
}

// ListMerchants returns all merchant IDs.
func (s *Server) ListMerchants() []string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	ids := make([]string, 0, len(s.merchants))
	for id := range s.merchants {
		ids = append(ids, id)
	}
	return ids
}

// URL returns the base URL of the server.
func (s *Server) URL() string {
	return fmt.Sprintf("http://localhost%s", s.server.Addr)
}

func (s *Server) autoGenerate(interval time.Duration) {
	s.logger.Printf("auto-generation started (interval=%s)\n", interval)
	for {
		select {
		case <-s.done:
			s.logger.Println("auto-generation stopped")
			return
		case <-s.ticker.C:
			s.generateAllTransactions(int(interval.Seconds()))
		}
	}
}

func (s *Server) generateAllTransactions(intervalSeconds int) {
	s.mu.RLock()
	merchants := make([]*Merchant, 0, len(s.merchants))
	for _, m := range s.merchants {
		merchants = append(merchants, m)
	}
	s.mu.RUnlock()

	for _, m := range merchants {
		m.GenerateTransactions(intervalSeconds)
	}
}

// HTTP Handlers

func (s *Server) handleUserPOS(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract merchant ID from path: /user-pos/{merchantID}
	merchantID := r.URL.Path[len("/user-pos/"):]
	if merchantID == "" {
		http.Error(w, "merchant ID required", http.StatusBadRequest)
		return
	}

	// Verify public key (in real API this would be authenticated)
	publicKey := r.URL.Query().Get("user_public_key")
	if publicKey == "" {
		http.Error(w, "user_public_key required", http.StatusBadRequest)
		return
	}

	s.mu.RLock()
	merchant, ok := s.merchants[merchantID]
	s.mu.RUnlock()

	if !ok {
		http.Error(w, "merchant not found", http.StatusNotFound)
		return
	}

	if merchant.PublicKey != publicKey {
		http.Error(w, "invalid public key", http.StatusUnauthorized)
		return
	}

	data := merchant.GetData()

	response := struct {
		Data MerchantData `json:"data"`
	}{
		Data: data,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)

	s.logger.Printf("served merchant %s: %d products, %d sales\n", merchantID, len(data.Products), len(data.Sales))
}

func (s *Server) handleAdminMerchants(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		s.handleListMerchants(w, r)
	case http.MethodPost:
		s.handleCreateMerchant(w, r)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleListMerchants(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	merchants := make([]map[string]interface{}, 0, len(s.merchants))
	for _, m := range s.merchants {
		merchants = append(merchants, map[string]interface{}{
			"id":         m.ID,
			"alias":      m.Profile.Alias,
			"public_key": m.PublicKey,
			"products":   len(m.Data.Products),
			"sales":      len(m.Data.Sales),
		})
	}
	s.mu.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(merchants)
}

func (s *Server) handleCreateMerchant(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ID        string `json:"id"`
		PublicKey string `json:"public_key"`
		Profile   string `json:"profile"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}

	// Find profile
	var profile MerchantProfile
	found := false
	for _, p := range DefaultProfiles() {
		if p.Name == req.Profile {
			profile = p
			found = true
			break
		}
	}

	if !found {
		http.Error(w, "profile not found", http.StatusBadRequest)
		return
	}

	merchant := NewMerchant(req.ID, req.PublicKey, profile, time.Now().UnixNano())
	s.AddMerchant(merchant)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":    merchant.ID,
		"alias": merchant.Profile.Alias,
	})
}

func (s *Server) handleAdminMerchantsDetail(w http.ResponseWriter, r *http.Request) {
	// Extract merchant ID from path: /admin/merchants/{merchantID}/{action}
	path := r.URL.Path[len("/admin/merchants/"):]
	if path == "" {
		http.Error(w, "merchant ID required", http.StatusBadRequest)
		return
	}

	// Handle reset action
	if r.Method == http.MethodPost {
		// Parse path for reset action
		var merchantID string
		var action string
		fmt.Sscanf(path, "%s/%s", &merchantID, &action)

		if action == "reset" {
			s.handleResetMerchant(w, r, merchantID)
			return
		}
	}

	http.Error(w, "not implemented", http.StatusNotImplemented)
}

func (s *Server) handleResetMerchant(w http.ResponseWriter, r *http.Request, merchantID string) {
	s.mu.RLock()
	merchant, ok := s.merchants[merchantID]
	s.mu.RUnlock()

	if !ok {
		http.Error(w, "merchant not found", http.StatusNotFound)
		return
	}

	merchant.Reset()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "reset",
		"id":     merchantID,
	})

	s.logger.Printf("reset merchant %s\n", merchantID)
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":    "ok",
		"merchants": len(s.merchants),
	})
}

// SetupDefaultMerchants adds 20 merchants with default profiles to the server.
func (s *Server) SetupDefaultMerchants() {
	s.SetupDefaultMerchantsWithHistory(true)
}

// SetupDefaultMerchantsWithHistory adds 20 merchants with optional historical data.
func (s *Server) SetupDefaultMerchantsWithHistory(generateHistory bool) {
	profiles := DefaultProfiles()

	for i, profile := range profiles {
		merchantID := fmt.Sprintf("%d", 100+i)
		publicKey := fmt.Sprintf("mock_pubkey_%d", i)

		merchant := NewMerchant(merchantID, publicKey, profile, int64(i*1000))

		// Generate minimal historical transactions for a non-empty starting state
		if generateHistory {
			// Only generate 2 minutes of history to give a small baseline
			// The rest will accumulate gradually through live generation
			historyMinutes := 2
			for min := 0; min < historyMinutes; min++ {
				merchant.GenerateTransactions(60) // 60 seconds worth of transactions per minute
			}
			s.logger.Printf("added merchant %s with %d initial transactions\n",
				profile.Alias, len(merchant.Data.Sales))
		}

		s.AddMerchant(merchant)
	}

	s.logger.Printf("setup complete: %d merchants added\n", len(profiles))
	if generateHistory {
		s.logger.Println("merchants will accumulate transactions over time via auto-generation")
	}
}
