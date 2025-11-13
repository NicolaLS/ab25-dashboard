package mock

import (
	"fmt"
	"math/rand"
)

// MerchantProfile defines how a merchant behaves in terms of transaction patterns.
type MerchantProfile struct {
	Name                string
	Alias               string
	NumProducts         int      // How many products to create
	ProductPriceRange   [2]int64 // Min/max price in sats
	TxFrequency         float64  // Transactions per minute (average)
	AnonymousTxRatio    float64  // 0.0-1.0: ratio of txs without product association
	ActiveProductRatio  float64  // 0.0-1.0: ratio of products that are active
	PriceTrend          string   // "stable", "increasing", "decreasing"
	PopularProductRatio float64  // 0.0-1.0: ratio of sales concentrated in top products
}

// DefaultProfiles returns a set of realistic merchant behavior profiles.
func DefaultProfiles() []MerchantProfile {
	return []MerchantProfile{
		{
			Name:                "high_volume_low_cost",
			Alias:               "Bitcoin Coffee",
			NumProducts:         8,
			ProductPriceRange:   [2]int64{3000, 12000}, // $1-4 coffees
			TxFrequency:         2.0,                    // 2 tx/min = 120 tx/hour
			AnonymousTxRatio:    0.1,
			ActiveProductRatio:  0.9,
			PriceTrend:          "stable",
			PopularProductRatio: 0.7, // 70% sales in top 2-3 products
		},
		{
			Name:                "low_volume_high_cost",
			Alias:               "Bitcoin Electronics",
			NumProducts:         5,
			ProductPriceRange:   [2]int64{500000, 3000000}, // $150-900 electronics
			TxFrequency:         0.05,                       // 1 tx per 20 minutes
			AnonymousTxRatio:    0.05,
			ActiveProductRatio:  1.0,
			PriceTrend:          "decreasing",
			PopularProductRatio: 0.5,
		},
		{
			Name:                "medium_restaurant",
			Alias:               "Lightning Bistro",
			NumProducts:         15,
			ProductPriceRange:   [2]int64{15000, 45000}, // $5-15 meals
			TxFrequency:         0.8,                     // ~50 tx/hour during rush
			AnonymousTxRatio:    0.2,
			ActiveProductRatio:  0.8,
			PriceTrend:          "stable",
			PopularProductRatio: 0.6,
		},
		{
			Name:                "bar_drinks",
			Alias:               "Satoshi's Bar",
			NumProducts:         12,
			ProductPriceRange:   [2]int64{8000, 20000}, // $2.50-6 drinks
			TxFrequency:         1.2,
			AnonymousTxRatio:    0.15,
			ActiveProductRatio:  0.9,
			PriceTrend:          "stable",
			PopularProductRatio: 0.8, // Beer is popular
		},
		{
			Name:                "artisan_bakery",
			Alias:               "Bread & Bitcoin",
			NumProducts:         10,
			ProductPriceRange:   [2]int64{5000, 25000}, // $1.50-8 baked goods
			TxFrequency:         0.6,
			AnonymousTxRatio:    0.1,
			ActiveProductRatio:  0.7, // Seasonal items
			PriceTrend:          "increasing",
			PopularProductRatio: 0.65,
		},
		{
			Name:                "bookstore",
			Alias:               "Bitcoin Books",
			NumProducts:         20,
			ProductPriceRange:   [2]int64{30000, 80000}, // $10-25 books
			TxFrequency:         0.3,
			AnonymousTxRatio:    0.05,
			ActiveProductRatio:  0.95,
			PriceTrend:          "stable",
			PopularProductRatio: 0.4, // Diverse sales
		},
		{
			Name:                "food_truck",
			Alias:               "Lightning Tacos",
			NumProducts:         6,
			ProductPriceRange:   [2]int64{10000, 18000}, // $3-6 tacos/burritos
			TxFrequency:         1.5,
			AnonymousTxRatio:    0.15,
			ActiveProductRatio:  1.0,
			PriceTrend:          "stable",
			PopularProductRatio: 0.75,
		},
		{
			Name:                "clothing_boutique",
			Alias:               "Bitcoin Threads",
			NumProducts:         25,
			ProductPriceRange:   [2]int64{80000, 500000}, // $25-150 clothing
			TxFrequency:         0.15,
			AnonymousTxRatio:    0.05,
			ActiveProductRatio:  0.85,
			PriceTrend:          "stable",
			PopularProductRatio: 0.5,
		},
		{
			Name:                "hardware_store",
			Alias:               "Bolt & Satoshi",
			NumProducts:         30,
			ProductPriceRange:   [2]int64{10000, 200000}, // $3-60 tools/supplies
			TxFrequency:         0.4,
			AnonymousTxRatio:    0.1,
			ActiveProductRatio:  0.9,
			PriceTrend:          "stable",
			PopularProductRatio: 0.55,
		},
		{
			Name:                "ice_cream_shop",
			Alias:               "Frozen Sats",
			NumProducts:         8,
			ProductPriceRange:   [2]int64{8000, 15000}, // $2.50-5 scoops
			TxFrequency:         2.5,                    // High volume
			AnonymousTxRatio:    0.12,
			ActiveProductRatio:  0.9,
			PriceTrend:          "stable",
			PopularProductRatio: 0.7,
		},
		{
			Name:                "juice_bar",
			Alias:               "Fresh Squeeze ₿",
			NumProducts:         10,
			ProductPriceRange:   [2]int64{12000, 22000}, // $4-7 juices
			TxFrequency:         0.9,
			AnonymousTxRatio:    0.1,
			ActiveProductRatio:  0.8,
			PriceTrend:          "stable",
			PopularProductRatio: 0.6,
		},
		{
			Name:                "toy_store",
			Alias:               "PlayBTC",
			NumProducts:         35,
			ProductPriceRange:   [2]int64{20000, 150000}, // $6-45 toys
			TxFrequency:         0.25,
			AnonymousTxRatio:    0.08,
			ActiveProductRatio:  0.92,
			PriceTrend:          "stable",
			PopularProductRatio: 0.45,
		},
		{
			Name:                "pharmacy",
			Alias:               "HealthChain Pharmacy",
			NumProducts:         40,
			ProductPriceRange:   [2]int64{15000, 100000}, // $5-30 medicines
			TxFrequency:         0.5,
			AnonymousTxRatio:    0.05,
			ActiveProductRatio:  0.95,
			PriceTrend:          "increasing",
			PopularProductRatio: 0.5,
		},
		{
			Name:                "pizza_place",
			Alias:               "Pizza Lightning",
			NumProducts:         12,
			ProductPriceRange:   [2]int64{25000, 50000}, // $8-15 pizzas
			TxFrequency:         1.0,
			AnonymousTxRatio:    0.15,
			ActiveProductRatio:  1.0,
			PriceTrend:          "stable",
			PopularProductRatio: 0.65,
		},
		{
			Name:                "flower_shop",
			Alias:               "Bloom & Bitcoin",
			NumProducts:         18,
			ProductPriceRange:   [2]int64{30000, 120000}, // $10-40 flowers
			TxFrequency:         0.2,
			AnonymousTxRatio:    0.05,
			ActiveProductRatio:  0.75, // Seasonal
			PriceTrend:          "stable",
			PopularProductRatio: 0.55,
		},
		{
			Name:                "bike_shop",
			Alias:               "Two Wheels One Chain",
			NumProducts:         15,
			ProductPriceRange:   [2]int64{50000, 2000000}, // $15-600 bikes/parts
			TxFrequency:         0.1,
			AnonymousTxRatio:    0.05,
			ActiveProductRatio:  0.9,
			PriceTrend:          "stable",
			PopularProductRatio: 0.4,
		},
		{
			Name:                "gym",
			Alias:               "Proof of Workout",
			NumProducts:         8,
			ProductPriceRange:   [2]int64{100000, 500000}, // $30-150 memberships/classes
			TxFrequency:         0.3,
			AnonymousTxRatio:    0.02,
			ActiveProductRatio:  1.0,
			PriceTrend:          "increasing",
			PopularProductRatio: 0.7,
		},
		{
			Name:                "barber_shop",
			Alias:               "Trim the Chain",
			NumProducts:         6,
			ProductPriceRange:   [2]int64{50000, 100000}, // $15-30 cuts/shaves
			TxFrequency:         0.4,
			AnonymousTxRatio:    0.08,
			ActiveProductRatio:  1.0,
			PriceTrend:          "stable",
			PopularProductRatio: 0.75,
		},
		{
			Name:                "pet_store",
			Alias:               "Paws & Sats",
			NumProducts:         28,
			ProductPriceRange:   [2]int64{15000, 180000}, // $5-55 pet supplies
			TxFrequency:         0.35,
			AnonymousTxRatio:    0.1,
			ActiveProductRatio:  0.9,
			PriceTrend:          "stable",
			PopularProductRatio: 0.5,
		},
		{
			Name:                "convenience_store",
			Alias:               "24/7 Satoshi",
			NumProducts:         50,
			ProductPriceRange:   [2]int64{2000, 30000}, // $0.60-10 snacks/drinks
			TxFrequency:         3.0,                    // High volume
			AnonymousTxRatio:    0.2,
			ActiveProductRatio:  0.95,
			PriceTrend:          "stable",
			PopularProductRatio: 0.6,
		},
	}
}

// GenerateTransaction creates a transaction based on profile behavior.
// Returns (productID, amountSats, isAnonymous)
func (p MerchantProfile) GenerateTransaction(rng *rand.Rand, products []Product) (int64, int64, bool) {
	// Decide if this is an anonymous transaction
	if rng.Float64() < p.AnonymousTxRatio {
		// Anonymous transaction - no product association
		amount := p.ProductPriceRange[0] + rng.Int63n(p.ProductPriceRange[1]-p.ProductPriceRange[0])
		return 0, amount, true
	}

	// Select a product based on popularity distribution
	activeProducts := make([]Product, 0, len(products))
	for _, prod := range products {
		if prod.ActiveStatus {
			activeProducts = append(activeProducts, prod)
		}
	}

	if len(activeProducts) == 0 {
		// Fallback to anonymous if no active products
		amount := p.ProductPriceRange[0] + rng.Int63n(p.ProductPriceRange[1]-p.ProductPriceRange[0])
		return 0, amount, true
	}

	var selectedProduct Product
	if rng.Float64() < p.PopularProductRatio && len(activeProducts) > 1 {
		// Pick from top products (first third of active products)
		topCount := len(activeProducts) / 3
		if topCount == 0 {
			topCount = 1
		}
		selectedProduct = activeProducts[rng.Intn(topCount)]
	} else {
		// Pick any active product
		selectedProduct = activeProducts[rng.Intn(len(activeProducts))]
	}

	// Parse product price
	amount := parsePrice(selectedProduct.Price)
	if amount == 0 {
		// Fallback if price parsing fails
		amount = p.ProductPriceRange[0] + rng.Int63n(p.ProductPriceRange[1]-p.ProductPriceRange[0])
	}

	return selectedProduct.ProductID, amount, false
}

// ShouldGenerateTransaction determines if a transaction should occur based on frequency.
func (p MerchantProfile) ShouldGenerateTransaction(rng *rand.Rand, intervalSeconds int) bool {
	// Convert frequency (tx/min) to probability per interval
	txPerSecond := p.TxFrequency / 60.0
	probability := txPerSecond * float64(intervalSeconds)
	return rng.Float64() < probability
}

func parsePrice(price string) int64 {
	// Simple price parsing - assumes USD and $3000 sats per dollar
	var dollars float64
	if _, err := fmt.Sscanf(price, "%f", &dollars); err != nil {
		return 0
	}
	return int64(dollars * 3000)
}
