package api

import (
	"context"
	"crypto/subtle"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/adopting-bitcoin/dashboard/internal/config"
	"github.com/adopting-bitcoin/dashboard/internal/ingest"
	"github.com/adopting-bitcoin/dashboard/internal/store"
)

// Server wires HTTP handlers with storage and ingestion.
type Server struct {
	cfg    config.Config
	store  *store.Store
	poller *ingest.Poller
	logger *log.Logger
}

// NewServer builds the HTTP server.
func NewServer(cfg config.Config, st *store.Store, poller *ingest.Poller, logger *log.Logger) *Server {
	return &Server{cfg: cfg, store: st, poller: poller, logger: logger}
}

// Run starts the HTTP server until ctx is cancelled.
func (s *Server) Run(ctx context.Context) error {
	router := s.routes()
	srv := &http.Server{
		Addr:    s.cfg.Addr,
		Handler: router,
	}
	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := srv.Shutdown(shutdownCtx); err != nil {
			s.logger.Printf("HTTP shutdown error: %v\n", err)
		}
	}()
	s.logger.Printf("HTTP server listening on %s\n", s.cfg.Addr)
	err := srv.ListenAndServe()
	if errors.Is(err, http.ErrServerClosed) {
		return nil
	}
	return err
}

func (s *Server) routes() http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   s.cfg.CORSOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Admin-Token", "X-Requested-With"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	r.Get("/v1/health", s.handleHealth)
	r.Get("/v1/summary", s.handleSummary)
	r.Get("/v1/ticker", s.handleTicker)
	r.Get("/v1/leaderboard/merchants", s.handleMerchantLeaderboard)
	r.Get("/v1/leaderboard/products", s.handleProductLeaderboard)
	r.Get("/v1/milestones/triggers", s.handleMilestoneTriggers)

	r.Route("/v1/admin", func(ar chi.Router) {
		ar.Post("/auth/login", s.handleAdminLogin)
		ar.Group(func(protected chi.Router) {
			protected.Use(s.authMiddleware)
			protected.Get("/summary", s.handleSummary)
			protected.Route("/merchants", func(mr chi.Router) {
				mr.Get("/", s.handleListMerchants)
				mr.Post("/", s.handleCreateMerchant)
				mr.Route("/{merchantID}", func(sr chi.Router) {
					sr.Put("/", s.handleUpdateMerchant)
					sr.Post("/refetch", s.handleRefetchMerchant)
				})
			})
			protected.Route("/milestones", func(mr chi.Router) {
				mr.Get("/", s.handleListMilestones)
				mr.Post("/", s.handleCreateMilestone)
				mr.Put("/{milestoneID}", s.handleUpdateMilestone)
			})
		})
	})

	return r
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleSummary(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	summary, err := s.store.Summary(ctx, s.cfg.RateWindow)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, summary)
}

func (s *Server) handleTicker(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	limit := parseIntQuery(r, "limit", s.cfg.TickerLimit)
	items, err := s.store.LatestTransactions(ctx, limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) handleMerchantLeaderboard(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	metric := r.URL.Query().Get("metric")
	if metric == "" {
		metric = "transactions"
	}
	windowStr := r.URL.Query().Get("window")
	if windowStr == "" {
		windowStr = "24h"
	}
	var window time.Duration
	if windowStr != "all" {
		parsed, err := time.ParseDuration(windowStr)
		if err != nil {
			writeError(w, http.StatusBadRequest, fmt.Errorf("invalid window"))
			return
		}
		window = parsed
	}
	limit := parseIntQuery(r, "limit", s.cfg.DefaultLeaderboardLimit)
	rows, err := s.store.MerchantLeaderboard(ctx, window, metric, limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, rows)
}

func (s *Server) handleProductLeaderboard(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	metric := r.URL.Query().Get("metric")
	if metric == "" {
		metric = "transactions"
	}
	limit := parseIntQuery(r, "limit", s.cfg.DefaultLeaderboardLimit)
	rows, err := s.store.ProductLeaderboard(ctx, metric, limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, rows)
}

func (s *Server) handleMilestoneTriggers(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	sinceStr := r.URL.Query().Get("since")
	var since time.Time
	if sinceStr == "" {
		since = time.Now().Add(-24 * time.Hour)
	} else {
		parsed, err := time.Parse(time.RFC3339, sinceStr)
		if err != nil {
			writeError(w, http.StatusBadRequest, fmt.Errorf("invalid since param"))
			return
		}
		since = parsed
	}
	triggers, err := s.store.MilestoneTriggersSince(ctx, since)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, triggers)
}

func (s *Server) handleAdminLogin(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Token string `json:"token"`
	}
	if err := decodeJSON(w, r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	if subtle.ConstantTimeCompare([]byte(payload.Token), []byte(s.cfg.AdminToken)) != 1 {
		writeError(w, http.StatusUnauthorized, errors.New("invalid token"))
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleListMerchants(w http.ResponseWriter, r *http.Request) {
	merchants, err := s.store.ListMerchants(r.Context(), false)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, merchants)
}

func (s *Server) handleCreateMerchant(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		ID        string `json:"id"`
		PublicKey string `json:"public_key"`
		Alias     string `json:"alias"`
		Enabled   *bool  `json:"enabled"`
	}
	if err := decodeJSON(w, r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	if payload.ID == "" || payload.PublicKey == "" || payload.Alias == "" {
		writeError(w, http.StatusBadRequest, errors.New("missing fields"))
		return
	}
	enabled := true
	if payload.Enabled != nil {
		enabled = *payload.Enabled
	}
	merchant := store.Merchant{
		ID:        payload.ID,
		PublicKey: payload.PublicKey,
		Alias:     payload.Alias,
		Enabled:   enabled,
	}
	if err := s.store.UpsertMerchant(r.Context(), merchant); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusCreated, merchant)
}

func (s *Server) handleUpdateMerchant(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		PublicKey string `json:"public_key"`
		Alias     string `json:"alias"`
		Enabled   *bool  `json:"enabled"`
	}
	if err := decodeJSON(w, r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	id := chi.URLParam(r, "merchantID")
	if id == "" {
		writeError(w, http.StatusBadRequest, errors.New("missing merchant id"))
		return
	}
	current, err := s.store.GetMerchant(r.Context(), id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeError(w, http.StatusNotFound, err)
			return
		}
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	if payload.PublicKey != "" {
		current.PublicKey = payload.PublicKey
	}
	if payload.Alias != "" {
		current.Alias = payload.Alias
	}
	if payload.Enabled != nil {
		current.Enabled = *payload.Enabled
	}
	if err := s.store.UpdateMerchant(r.Context(), current); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, current)
}

func (s *Server) handleRefetchMerchant(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "merchantID")
	if id == "" {
		writeError(w, http.StatusBadRequest, errors.New("missing merchant id"))
		return
	}
	if err := s.poller.RefreshMerchant(r.Context(), id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeError(w, http.StatusNotFound, err)
			return
		}
		writeError(w, http.StatusBadRequest, err)
		return
	}
	writeJSON(w, http.StatusAccepted, map[string]string{"status": "refreshing"})
}

func (s *Server) handleListMilestones(w http.ResponseWriter, r *http.Request) {
	items, err := s.store.ListMilestones(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) handleCreateMilestone(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Name      string `json:"name"`
		Type      string `json:"type"`
		Threshold int64  `json:"threshold"`
		Enabled   bool   `json:"enabled"`
	}
	if err := decodeJSON(w, r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	if payload.Name == "" || payload.Type == "" {
		writeError(w, http.StatusBadRequest, errors.New("missing fields"))
		return
	}
	milestone, err := s.store.UpsertMilestone(r.Context(), store.Milestone{
		Name:      payload.Name,
		Type:      store.MilestoneType(payload.Type),
		Threshold: payload.Threshold,
		Enabled:   payload.Enabled,
	})
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	writeJSON(w, http.StatusCreated, milestone)
}

func (s *Server) handleUpdateMilestone(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Name         string `json:"name"`
		Type         string `json:"type"`
		Threshold    int64  `json:"threshold"`
		Enabled      bool   `json:"enabled"`
		ResetTrigger bool   `json:"reset_trigger"`
	}
	if err := decodeJSON(w, r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	idStr := chi.URLParam(r, "milestoneID")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, errors.New("invalid id"))
		return
	}
	m, err := s.store.UpdateMilestone(r.Context(), id, store.Milestone{
		Name:      payload.Name,
		Type:      store.MilestoneType(payload.Type),
		Threshold: payload.Threshold,
		Enabled:   payload.Enabled,
	}, payload.ResetTrigger)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeError(w, http.StatusNotFound, err)
			return
		}
		writeError(w, http.StatusBadRequest, err)
		return
	}
	writeJSON(w, http.StatusOK, m)
}

func (s *Server) authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := extractToken(r)
		if token == "" || subtle.ConstantTimeCompare([]byte(token), []byte(s.cfg.AdminToken)) != 1 {
			writeError(w, http.StatusUnauthorized, errors.New("unauthorized"))
			return
		}
		next.ServeHTTP(w, r)
	})
}

func extractToken(r *http.Request) string {
	auth := r.Header.Get("Authorization")
	if strings.HasPrefix(strings.ToLower(auth), "bearer ") {
		return strings.TrimSpace(auth[7:])
	}
	if token := r.Header.Get("X-Admin-Token"); token != "" {
		return token
	}
	return ""
}

func parseIntQuery(r *http.Request, key string, fallback int) int {
	const maxLimit = 1000
	val := r.URL.Query().Get(key)
	if val == "" {
		return fallback
	}
	n, err := strconv.Atoi(val)
	if err != nil || n <= 0 || n > maxLimit {
		return fallback
	}
	return n
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func writeError(w http.ResponseWriter, status int, err error) {
	writeJSON(w, status, map[string]string{"error": err.Error()})
}

func decodeJSON(w http.ResponseWriter, r *http.Request, v any) error {
	const maxBodySize = 1 << 20 // 1 MB
	r.Body = http.MaxBytesReader(w, r.Body, maxBodySize)
	return json.NewDecoder(r.Body).Decode(v)
}
