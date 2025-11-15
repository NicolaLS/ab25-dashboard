import { formatNumber } from "../../utils/format";

const MERCH_ITEMS = [
  { name: "T-Shirt", originalPrice: 42069, discountedPrice: 33250 },
  { name: "Beater", originalPrice: 42069, discountedPrice: 33250 },
  { name: "Cap", originalPrice: 42069, discountedPrice: 33250 },
];

export function MerchScene() {
  return (
    <div className="merch-scene">
      <div className="merch-scene__header">
        <h2 className="merch-scene__title">NOT ONLY BTC IS ON A DISCOUNT</h2>
        <div className="merch-scene__discount-badge">
          21% OFF NOW
        </div>
      </div>

      <div className="merch-scene__content">
        <div className="merch-scene__items">
          {MERCH_ITEMS.map((item) => (
            <div key={item.name} className="merch-item">
              <h3 className="merch-item__name">{item.name}</h3>
              <div className="merch-item__price">
                <span className="merch-item__original-price">
                  {formatNumber(item.originalPrice)} sats
                </span>
                <span className="merch-item__arrow">→</span>
                <span className="merch-item__discounted-price">
                  {formatNumber(item.discountedPrice)} sats
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="merch-scene__cta">
          <p className="merch-scene__cta-text">
            Visit our merch booth to grab your exclusive Adopting Bitcoin swag!
          </p>
        </div>
      </div>
    </div>
  );
}
