package mock

import (
	"fmt"
	"math/rand"
	"sync"
	"time"
)

// Product represents a PayWithFlash product.
type Product struct {
	ProductID         int64  `json:"productid"`
	Name              string `json:"name"`
	Currency          string `json:"currency"`
	Price             string `json:"price"`
	TotalTransactions int64  `json:"total_transactions"`
	TotalRevenueSats  string `json:"total_revenue_sats"`
	ActiveStatus      bool   `json:"activestatus"`
}

// Sale represents a PayWithFlash transaction.
type Sale struct {
	SaleID        int64  `json:"SaleId"`
	SaleOrigin    string `json:"SaleOrigin"`
	SaleDate      string `json:"SaleDate"`
	TotalCostSats string `json:"TotalCostSats"`
}

// MerchantData holds the complete dataset for a merchant.
type MerchantData struct {
	ID       int64     `json:"id"`
	Name     string    `json:"name"`
	Products []Product `json:"products"`
	Sales    []Sale    `json:"sales"`
}

// Merchant represents a merchant in the mock system.
type Merchant struct {
	ID        string
	PublicKey string
	Profile   MerchantProfile
	Data      MerchantData
	mu        sync.RWMutex
	rng       *rand.Rand
	nextSaleID int64
}

// NewMerchant creates a new merchant with initial products.
func NewMerchant(id, publicKey string, profile MerchantProfile, seed int64) *Merchant {
	m := &Merchant{
		ID:         id,
		PublicKey:  publicKey,
		Profile:    profile,
		rng:        rand.New(rand.NewSource(seed)),
		nextSaleID: 1000,
		Data: MerchantData{
			ID:       0, // Will be set from ID string
			Name:     profile.Alias,
			Products: make([]Product, 0, profile.NumProducts),
			Sales:    make([]Sale, 0, 100),
		},
	}

	// Parse merchant ID to int64
	fmt.Sscanf(id, "%d", &m.Data.ID)

	// Generate initial products
	m.generateProducts()

	return m
}

func (m *Merchant) generateProducts() {
	productNames := []string{
		"Classic", "Premium", "Deluxe", "Special", "Standard",
		"Original", "Signature", "House Special", "Featured", "Popular",
		"Daily Special", "Seasonal", "Limited Edition", "Custom", "Regular",
		"Small", "Medium", "Large", "Extra Large", "Family Size",
		"Single", "Double", "Triple", "Combo", "Bundle",
		"Basic", "Advanced", "Professional", "Express", "Quick",
	}

	categories := []string{
		"Item", "Product", "Option", "Choice", "Selection",
		"Package", "Deal", "Offer", "Service", "Experience",
	}

	for i := 0; i < m.Profile.NumProducts; i++ {
		productID := int64(i + 1)
		name := fmt.Sprintf("%s %s", productNames[m.rng.Intn(len(productNames))], categories[m.rng.Intn(len(categories))])

		// Generate price in range
		priceRange := m.Profile.ProductPriceRange[1] - m.Profile.ProductPriceRange[0]
		priceSats := m.Profile.ProductPriceRange[0] + m.rng.Int63n(priceRange)
		priceUSD := float64(priceSats) / 3000.0 // Assume 3000 sats per dollar

		// Determine if active
		isActive := m.rng.Float64() < m.Profile.ActiveProductRatio

		m.Data.Products = append(m.Data.Products, Product{
			ProductID:         productID,
			Name:              name,
			Currency:          "USD",
			Price:             fmt.Sprintf("%.2f", priceUSD),
			TotalTransactions: 0,
			TotalRevenueSats:  "0",
			ActiveStatus:      isActive,
		})
	}
}

// GetData returns a copy of the merchant's current data.
func (m *Merchant) GetData() MerchantData {
	m.mu.RLock()
	defer m.mu.RUnlock()

	// Deep copy
	data := MerchantData{
		ID:       m.Data.ID,
		Name:     m.Data.Name,
		Products: make([]Product, len(m.Data.Products)),
		Sales:    make([]Sale, len(m.Data.Sales)),
	}
	copy(data.Products, m.Data.Products)
	copy(data.Sales, m.Data.Sales)

	return data
}

// GenerateTransactions creates new transactions based on the merchant's profile.
// intervalSeconds is how long since the last generation (affects count).
func (m *Merchant) GenerateTransactions(intervalSeconds int) int {
	m.mu.Lock()
	defer m.mu.Unlock()

	now := time.Now().UTC()

	// Calculate expected number of transactions for this interval
	// TxFrequency is in transactions per minute
	expectedTxCount := m.Profile.TxFrequency * (float64(intervalSeconds) / 60.0)

	// Use probabilistic rounding for small expected counts
	// For expectedTxCount = 0.15, we have 15% chance of 1 transaction
	actualCount := int(expectedTxCount) // Get the integer part
	fractional := expectedTxCount - float64(actualCount)

	// Probabilistically add 1 based on the fractional part
	if m.rng.Float64() < fractional {
		actualCount++
	}

	// Add some variance for larger counts (Poisson-like)
	if actualCount > 0 {
		variance := int(float64(actualCount) * 0.3) // 30% variance
		if variance > 0 {
			actualCount += m.rng.Intn(variance*2+1) - variance
		}
	}

	// Ensure at least 0 transactions
	if actualCount < 0 {
		actualCount = 0
	}

	// Generate the transactions
	for i := 0; i < actualCount; i++ {
		// Generate a transaction
		productID, amount, isAnonymous := m.Profile.GenerateTransaction(m.rng, m.Data.Products)

		// Create sale
		saleID := m.nextSaleID
		m.nextSaleID++

		saleOrigin := "POS"
		if isAnonymous {
			saleOrigin = "ANONYMOUS"
		}

		// Add jitter to transaction time (spread across the interval)
		jitter := time.Duration(m.rng.Intn(intervalSeconds)) * time.Second
		txTime := now.Add(-jitter)

		sale := Sale{
			SaleID:        saleID,
			SaleOrigin:    saleOrigin,
			SaleDate:      txTime.Format(time.RFC3339Nano),
			TotalCostSats: fmt.Sprintf("%d", amount),
		}

		m.Data.Sales = append(m.Data.Sales, sale)

		// Update product stats if not anonymous
		if !isAnonymous {
			for j := range m.Data.Products {
				if m.Data.Products[j].ProductID == productID {
					m.Data.Products[j].TotalTransactions++
					var currentRevenue int64
					fmt.Sscanf(m.Data.Products[j].TotalRevenueSats, "%d", &currentRevenue)
					currentRevenue += amount
					m.Data.Products[j].TotalRevenueSats = fmt.Sprintf("%d", currentRevenue)
					break
				}
			}
		}
	}

	return actualCount
}

// AddProduct adds a new product to the merchant.
func (m *Merchant) AddProduct(name, currency, price string, active bool) int64 {
	m.mu.Lock()
	defer m.mu.Unlock()

	productID := int64(len(m.Data.Products) + 1)
	m.Data.Products = append(m.Data.Products, Product{
		ProductID:         productID,
		Name:              name,
		Currency:          currency,
		Price:             price,
		TotalTransactions: 0,
		TotalRevenueSats:  "0",
		ActiveStatus:      active,
	})

	return productID
}

// UpdateProduct updates an existing product.
func (m *Merchant) UpdateProduct(productID int64, name, currency, price string, active bool) bool {
	m.mu.Lock()
	defer m.mu.Unlock()

	for i := range m.Data.Products {
		if m.Data.Products[i].ProductID == productID {
			m.Data.Products[i].Name = name
			m.Data.Products[i].Currency = currency
			m.Data.Products[i].Price = price
			m.Data.Products[i].ActiveStatus = active
			return true
		}
	}

	return false
}

// Reset clears all transaction data but keeps products.
func (m *Merchant) Reset() {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.Data.Sales = make([]Sale, 0, 100)
	m.nextSaleID = 1000

	for i := range m.Data.Products {
		m.Data.Products[i].TotalTransactions = 0
		m.Data.Products[i].TotalRevenueSats = "0"
	}
}
