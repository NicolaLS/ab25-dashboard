package store_test

import (
	"context"
	"testing"
	"time"

	"github.com/adopting-bitcoin/dashboard/internal/store"
)

func TestRecordTransactionsIsIdempotent(t *testing.T) {
	t.Parallel()
	st := newTestStore(t)
	ctx := context.Background()

	err := st.UpsertMerchant(ctx, store.Merchant{
		ID:        "m1",
		PublicKey: "pk",
		Alias:     "Merchant",
		Enabled:   true,
	})
	if err != nil {
		t.Fatalf("upsert merchant: %v", err)
	}

	txs := []store.TransactionInput{
		{SaleID: 1, SaleOrigin: "pos", SaleDate: time.Now(), AmountSats: 100},
		{SaleID: 2, SaleOrigin: "pos", SaleDate: time.Now(), AmountSats: 200},
	}
	inserted, err := st.RecordTransactions(ctx, "m1", txs)
	if err != nil {
		t.Fatalf("record transactions: %v", err)
	}
	if inserted != 2 {
		t.Fatalf("expected 2 inserted rows, got %d", inserted)
	}
	inserted, err = st.RecordTransactions(ctx, "m1", txs)
	if err != nil {
		t.Fatalf("record transactions second pass: %v", err)
	}
	if inserted != 0 {
		t.Fatalf("expected 0 inserted rows on dedupe, got %d", inserted)
	}
}

func TestMilestonesTriggerOnce(t *testing.T) {
	t.Parallel()
	st := newTestStore(t)
	ctx := context.Background()

	err := st.UpsertMerchant(ctx, store.Merchant{
		ID:        "m2",
		PublicKey: "pk",
		Alias:     "Merchant2",
		Enabled:   true,
	})
	if err != nil {
		t.Fatalf("upsert merchant: %v", err)
	}

	_, err = st.UpsertMilestone(ctx, store.Milestone{
		Name:      "Volume 500",
		Type:      store.MilestoneVolume,
		Threshold: 500,
		Enabled:   true,
	})
	if err != nil {
		t.Fatalf("upsert milestone: %v", err)
	}

	_, err = st.RecordTransactions(ctx, "m2", []store.TransactionInput{
		{SaleID: 1, SaleDate: time.Now(), AmountSats: 250},
		{SaleID: 2, SaleDate: time.Now(), AmountSats: 300},
	})
	if err != nil {
		t.Fatalf("record transactions: %v", err)
	}

	triggered, err := st.ProcessMilestones(ctx)
	if err != nil {
		t.Fatalf("process milestones: %v", err)
	}
	if len(triggered) != 1 {
		t.Fatalf("expected 1 trigger, got %d", len(triggered))
	}

	_, err = st.RecordTransactions(ctx, "m2", []store.TransactionInput{
		{SaleID: 3, SaleDate: time.Now(), AmountSats: 1000},
	})
	if err != nil {
		t.Fatalf("record transactions second batch: %v", err)
	}
	triggered, err = st.ProcessMilestones(ctx)
	if err != nil {
		t.Fatalf("process milestones second pass: %v", err)
	}
	if len(triggered) != 0 {
		t.Fatalf("expected no additional triggers, got %d", len(triggered))
	}

	triggers, err := st.MilestoneTriggersSince(ctx, time.Now().Add(-time.Hour))
	if err != nil {
		t.Fatalf("list triggers: %v", err)
	}
	if len(triggers) != 1 {
		t.Fatalf("expected exactly 1 persisted trigger, got %d", len(triggers))
	}
}

func newTestStore(t *testing.T) *store.Store {
	t.Helper()
	st, err := store.New(":memory:")
	if err != nil {
		t.Fatalf("new store: %v", err)
	}
	if err := st.Init(context.Background()); err != nil {
		t.Fatalf("init store: %v", err)
	}
	t.Cleanup(func() {
		_ = st.Close()
	})
	return st
}
