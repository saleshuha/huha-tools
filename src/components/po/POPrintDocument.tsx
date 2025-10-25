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
            font-family: Arial, sans-serif;
            background: white;
            color: black;
          }
          
          .print-header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #000;
            padding-bottom: 15px;
          }
          
          .print-header h1 {
            margin: 0 0 10px 0;
            font-size: 28px;
            font-weight: bold;
          }
          
          .print-header p {
            margin: 0;
            font-size: 14px;
            color: #555;
          }
          
          .print-items {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
          }
          
          .print-item {
            border: 2px solid #333;
            border-radius: 8px;
            padding: 15px;
            break-inside: avoid;
            background: white;
            position: relative;
          }
          
          .print-stock-badge {
            position: absolute;
            top: 10px;
            right: 10px;
            background: #28a745;
            color: white;
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
            z-index: 10;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .print-item-number {
            background: #000;
            color: white;
            padding: 4px 10px;
            border-radius: 12px;
            display: inline-block;
            font-size: 11px;
            font-weight: bold;
            margin-bottom: 6px;
          }
          
          .print-item-header {
            display: flex;
            align-items: flex-start;
            gap: 15px;
            margin-bottom: 10px;
          }
          
          .print-item-image {
            width: 100px;
            height: 100px;
            object-fit: contain;
            border: 1px solid #ddd;
            border-radius: 4px;
            flex-shrink: 0;
            background: #f9f9f9;
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
            width: 100px;
            height: 100px;
            border: 1px dashed #ccc;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f5f5f5;
            flex-shrink: 0;
          }
          
          .print-item-details {
            flex: 1;
            min-width: 0;
          }
          
          .print-item-asin {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
            word-break: break-word;
          }
          
          .print-item-title {
            font-size: 13px;
            color: #333;
            margin-bottom: 8px;
            line-height: 1.4;
            word-break: break-word;
          }
          
          .print-item-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid #ddd;
          }
          
          .print-item-quantity-section {
            display: flex;
            flex-direction: row;
            gap: 16px;
            align-items: flex-end;
          }
          
          .print-item-quantity-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          
          .print-item-quantity-main {
            font-size: 32px;
            font-weight: bold;
            color: #000;
            line-height: 1;
          }
          
          .print-item-quantity-label {
            font-size: 9px;
            color: #666;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .print-from-stock .print-item-quantity-main {
            color: #28a745;
            font-size: 28px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .print-from-stock .print-item-quantity-label {
            color: #28a745;
          }
          
          .print-pending .print-item-quantity-main {
            color: #ff6b35;
            font-size: 28px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .print-pending .print-item-quantity-label {
            color: #ff6b35;
          }
          
          .print-item-po {
            font-size: 11px;
            color: #666;
            text-align: right;
          }
          
          .print-footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 2px solid #000;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
        `}</style>

        {/* Document Header */}
        <div className="print-header">
          <h1>{title}</h1>
          <p>Generated: {new Date().toLocaleString()}</p>
          <p>Total Items: {items.length} | Total Quantity: {items.reduce((sum, item) => sum + item.quantity, 0)}</p>
        </div>

        {/* Items Grid */}
        <div className="print-items">
          {items.map((item, index) => (
            <div key={`${item.asin}-${index}`} className="print-item">
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
                      <Package size={40} color="#999" />
                    </div>
                  )
                ) : null}
                
                <div className="print-item-details">
                  <div className="print-item-number">
                    Item {index + 1}
                  </div>
                  <div className="print-item-asin">
                    {item.asin}
                  </div>
                  <div className="print-item-title">
                    {item.title}
                  </div>
                  {item.sku_code && (
                    <div style={{ fontSize: '11px', color: '#666' }}>
                      SKU: {item.sku_code}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="print-item-info">
                <div className="print-item-quantity-section">
                  {/* Total Quantity */}
                  <div className="print-item-quantity-item">
                    <div className="print-item-quantity-label">TOTAL</div>
                    <div className="print-item-quantity-main">
                      {item.quantity}
                    </div>
                  </div>
                  
                  {/* From Stock - Show if fulfilled */}
                  {item.fulfilledFromStock && (
                    <div className="print-item-quantity-item print-from-stock">
                      <div className="print-item-quantity-label">✓ FROM STOCK</div>
                      <div className="print-item-quantity-main">
                        {item.stockQuantity}
                      </div>
                    </div>
                  )}
                  
                  {/* Pending - Show if partial fulfillment */}
                  {item.fulfilledFromStock && item.supplierQuantity > 0 && (
                    <div className="print-item-quantity-item print-pending">
                      <div className="print-item-quantity-label">⚠ PENDING</div>
                      <div className="print-item-quantity-main">
                        {item.supplierQuantity}
                      </div>
                    </div>
                  )}
                  
                  {/* Serial numbers */}
                  {item.serialNumber && (
                    <div style={{ fontSize: '9px', color: '#666', marginLeft: 'auto', alignSelf: 'flex-end' }}>
                      SN: {item.serialNumber}
                    </div>
                  )}
                </div>
                <div className="print-item-po">
                  <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>
                    PO Number{item.poNumbers.length > 1 ? 's' : ''}
                  </div>
                  <div>{formatPONumbers(item.poNumbers)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="print-footer">
          <p>This is a computer-generated document. No signature required.</p>
        </div>
      </div>
    );
  }
);

POPrintDocument.displayName = 'POPrintDocument';
