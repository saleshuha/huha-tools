// HTML/CSS printable layout for PO items
import React from 'react';
import { POPrintItem, formatPONumbers } from '@/utils/po-print-helpers';
import { Package } from 'lucide-react';

interface POPrintDocumentProps {
  items: POPrintItem[];
  includeImages: boolean;
  title?: string;
}

export const POPrintDocument = React.forwardRef<HTMLDivElement, POPrintDocumentProps>(
  ({ items, includeImages, title = 'Purchase Order Items' }, ref) => {
    const itemsWithStock = items.filter(i => (i.inventoryQty ?? 0) > 0).length;
    const itemsWithoutStock = items.length - itemsWithStock;
    const totalPrintedQty = items.reduce((sum, i) => sum + (i.printedQuantity ?? 0), 0);
    const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);

    return (
      <div ref={ref} className="print-document">
        {/* Print-only styles */}
        <style>{`
          @media print {
            @page {
              size: A4;
              margin: 15mm;
            }
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .print-document {
              width: 100%;
            }
            .page-break {
              page-break-after: always;
            }
            .no-print {
              display: none !important;
            }
          }
          
          .print-document {
            font-family: 'Segoe UI', Arial, sans-serif;
            background: white;
            color: #1a1a2e;
          }
          
          .print-header {
            text-align: center;
            margin-bottom: 28px;
            padding-bottom: 18px;
            border-bottom: 2px solid #e0e0e0;
            background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%);
            border-radius: 12px;
            padding: 20px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .print-header h1 {
            margin: 0 0 8px 0;
            font-size: 26px;
            font-weight: 700;
            color: #1a1a2e;
            letter-spacing: -0.3px;
          }
          
          .print-header p {
            margin: 0;
            font-size: 13px;
            color: #666;
          }
          
          .print-header-stats {
            display: flex;
            justify-content: center;
            gap: 24px;
            margin-top: 14px;
          }
          
          .print-header-stat {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            font-weight: 600;
            padding: 5px 14px;
            border-radius: 20px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .print-header-stat.total {
            background: #eef0f4;
            color: #333;
          }
          
          .print-header-stat.in-stock {
            background: #e6f7ed;
            color: #1a7a3a;
          }
          
          .print-header-stat.no-stock {
            background: #fff3e6;
            color: #b35c00;
          }
          
          .print-items {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 18px;
            margin-bottom: 20px;
          }
          
          .print-item {
            border: 1.5px solid #e0e3ea;
            border-radius: 10px;
            padding: 0;
            break-inside: avoid;
            background: white;
            position: relative;
            overflow: hidden;
            box-shadow: 0 1px 4px rgba(0,0,0,0.04);
          }
          
          .print-item-top-strip {
            height: 4px;
            width: 100%;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .print-item-top-strip.has-stock {
            background: linear-gradient(90deg, #22c55e, #16a34a);
          }
          
          .print-item-top-strip.no-stock {
            background: linear-gradient(90deg, #d1d5db, #9ca3af);
          }
          
          .print-item-top-strip.pending {
            background: linear-gradient(90deg, #f59e0b, #d97706);
          }
          
          .print-item-body {
            padding: 14px;
          }
          
          .print-stock-badge {
            position: absolute;
            top: 12px;
            right: 12px;
            background: #22c55e;
            color: white;
            padding: 3px 10px;
            border-radius: 6px;
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            z-index: 10;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .print-item-number {
            background: #1a1a2e;
            color: white;
            padding: 3px 10px;
            border-radius: 6px;
            display: inline-block;
            font-size: 10px;
            font-weight: 700;
            margin-bottom: 8px;
            letter-spacing: 0.3px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .print-item-number.has-stock {
            background: #166534;
          }
          
          .print-item-header {
            display: flex;
            align-items: flex-start;
            gap: 14px;
            margin-bottom: 10px;
          }
          
          .print-item-image {
            width: 90px;
            height: 90px;
            object-fit: contain;
            border: 1px solid #eee;
            border-radius: 8px;
            flex-shrink: 0;
            background: #fafafa;
            cursor: pointer;
            transition: opacity 0.2s;
          }
          
          .print-item-image:hover {
            opacity: 0.8;
          }
          
          @media print {
            .print-item-image {
              cursor: default;
            }
            .print-item-image:hover {
              opacity: 1;
            }
          }
          
          .print-item-placeholder {
            width: 90px;
            height: 90px;
            border: 1px dashed #d0d0d0;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f8f8f8;
            flex-shrink: 0;
          }
          
          .print-item-details {
            flex: 1;
            min-width: 0;
          }
          
          .print-item-asin {
            font-size: 15px;
            font-weight: 700;
            margin-bottom: 4px;
            word-break: break-word;
            font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
            color: #1a1a2e;
            letter-spacing: 0.3px;
          }
          
          .print-item-title {
            font-size: 12px;
            color: #555;
            margin-bottom: 8px;
            line-height: 1.4;
            word-break: break-word;
          }
          
          .print-item-sku-tag {
            display: inline-block;
            background: #f0f2f5;
            color: #555;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .print-item-info {
            display: flex;
            flex-direction: column;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid #eee;
            gap: 8px;
          }
          
          .print-item-quantity-section {
            display: flex;
            flex-direction: row;
            gap: 14px;
            align-items: flex-end;
          }
          
          .print-item-quantity-item {
            display: flex;
            flex-direction: column;
            gap: 3px;
          }
          
          .print-item-quantity-main {
            font-size: 30px;
            font-weight: 800;
            color: #1a1a2e;
            line-height: 1;
          }
          
          .print-item-quantity-label {
            font-size: 8px;
            color: #888;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.6px;
          }
          
          .print-from-stock .print-item-quantity-main {
            color: #16a34a;
            font-size: 26px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .print-from-stock .print-item-quantity-label {
            color: #16a34a;
          }
          
          .print-pending .print-item-quantity-main {
            color: #d97706;
            font-size: 26px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .print-pending .print-item-quantity-label {
            color: #d97706;
          }
          
          .print-printed-qty .print-item-quantity-main {
            color: #8b5cf6;
            font-size: 26px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .print-printed-qty .print-item-quantity-label {
            color: #8b5cf6;
          }
          
          .print-inventory-qty .print-item-quantity-main {
            color: #2563eb;
            font-size: 26px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .print-inventory-qty .print-item-quantity-label {
            color: #2563eb;
          }
          
          .print-item-po {
            background: #f8f9fc;
            padding: 6px 10px;
            border-radius: 6px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .print-item-po-label {
            font-size: 9px;
            color: #888;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            margin-bottom: 2px;
          }
          
          .print-item-po-value {
            font-size: 11px;
            color: #444;
            font-weight: 600;
            word-break: break-word;
          }
          
          .print-footer {
            margin-top: 28px;
            padding: 16px 20px;
            border-top: 2px solid #e0e3ea;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11px;
            color: #888;
          }
          
          .print-footer-stats {
            display: flex;
            gap: 16px;
          }
          
          .print-footer-stat {
            display: flex;
            align-items: center;
            gap: 4px;
          }
          
          .print-footer-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .print-footer-dot.green { background: #22c55e; }
          .print-footer-dot.gray { background: #9ca3af; }
        `}</style>

        {/* Document Header */}
        <div className="print-header">
          <h1>{title}</h1>
          <p>Generated: {new Date().toLocaleString()}</p>
          <div className="print-header-stats">
            <div className="print-header-stat total">
              📦 {items.length} Items · {items.reduce((sum, item) => sum + item.quantity, 0)} Units
            </div>
            {itemsWithStock > 0 && (
              <div className="print-header-stat in-stock">
                ✓ {itemsWithStock} In Stock
              </div>
            )}
            {itemsWithoutStock > 0 && (
              <div className="print-header-stat no-stock">
                ⚠ {itemsWithoutStock} No Stock
              </div>
            )}
            {totalPrintedQty > 0 && (
              <div className="print-header-stat total" style={{ background: '#f3e8ff', color: '#7c3aed' }}>
                🖨 {totalPrintedQty}/{totalQty} Printed
              </div>
            )}
          </div>
        </div>

        {/* Items Grid */}
        <div className="print-items">
          {items.map((item, index) => {
            const hasInventory = (item.inventoryQty ?? 0) > 0;
            const stripClass = item.fulfilledFromStock ? 'has-stock' : hasInventory ? 'has-stock' : 'no-stock';
            
            return (
              <div key={`${item.asin}-${index}`} className="print-item">
                {/* Color-coded top strip */}
                <div className={`print-item-top-strip ${stripClass}`} />
                
                <div className="print-item-body">
                  {/* Stock indicator badge */}
                  {item.fulfilledFromStock && (
                    <div className="print-stock-badge">
                      ✓ FROM STOCK
                    </div>
                  )}
                  
                  <div className="print-item-header">
                    {includeImages ? (
                      item.imageUrl ? (
                        <img 
                          src={item.imageUrl} 
                          alt={item.title}
                          className="print-item-image"
                          onClick={() => window.open(item.imageUrl, '_blank')}
                          title="Click to open image in new tab"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="print-item-placeholder">
                          <Package size={36} color="#bbb" />
                        </div>
                      )
                    ) : null}
                    
                    <div className="print-item-details">
                      <div className={`print-item-number ${hasInventory ? 'has-stock' : ''}`}>
                        #{index + 1}
                      </div>
                      <div className="print-item-asin">
                        {item.asin}
                      </div>
                      <div className="print-item-title">
                        {item.title}
                      </div>
                      {item.sku_code && (
                        <span className="print-item-sku-tag">
                          SKU: {item.sku_code}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="print-item-info">
                    <div className="print-item-quantity-section">
                      {/* Total Quantity */}
                      <div className="print-item-quantity-item">
                        <div className="print-item-quantity-label">PO QTY</div>
                        <div className="print-item-quantity-main">
                          {item.quantity}
                        </div>
                      </div>
                      
                      {/* Inventory Quantity - shown when available */}
                      {hasInventory && (
                        <div className="print-item-quantity-item print-inventory-qty">
                          <div className="print-item-quantity-label">📦 IN STOCK</div>
                          <div className="print-item-quantity-main">
                            {item.inventoryQty}
                          </div>
                        </div>
                      )}
                      
                      {/* From Stock - Show if fulfilled */}
                      {item.fulfilledFromStock && (
                        <div className="print-item-quantity-item print-from-stock">
                          <div className="print-item-quantity-label">✓ FROM STOCK</div>
                          <div className="print-item-quantity-main">
                            {item.stockQuantity}
                          </div>
                        </div>
                      )}
                      
                      {/* Pending */}
                      {item.fulfilledFromStock && (
                        <div className="print-item-quantity-item print-pending">
                          <div className="print-item-quantity-label">⚠ PENDING</div>
                          <div className="print-item-quantity-main">
                            {item.supplierQuantity || 0}
                          </div>
                        </div>
                      )}
                      
                      {/* Printed Quantity */}
                      {(item.printedQuantity ?? 0) > 0 && (
                        <div className="print-item-quantity-item print-printed-qty">
                          <div className="print-item-quantity-label">🖨 PRINTED</div>
                          <div className="print-item-quantity-main">
                            {item.printedQuantity}
                          </div>
                        </div>
                      )}
                      
                      {/* Serial numbers */}
                      {item.serialNumber && (
                        <div style={{ fontSize: '9px', color: '#888', marginLeft: 'auto', alignSelf: 'flex-end' }}>
                          SN: {item.serialNumber}
                        </div>
                      )}
                    </div>
                    <div className="print-item-po">
                      <div className="print-item-po-label">
                        PO{item.poNumbers.length > 1 ? 's' : ''}
                      </div>
                      <div className="print-item-po-value">{formatPONumbers(item.poNumbers)}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="print-footer">
          <span>Computer-generated document · No signature required</span>
          <div className="print-footer-stats">
            {itemsWithStock > 0 && (
              <div className="print-footer-stat">
                <div className="print-footer-dot green" />
                <span>{itemsWithStock} with stock</span>
              </div>
            )}
            {itemsWithoutStock > 0 && (
              <div className="print-footer-stat">
                <div className="print-footer-dot gray" />
                <span>{itemsWithoutStock} without stock</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

POPrintDocument.displayName = 'POPrintDocument';
