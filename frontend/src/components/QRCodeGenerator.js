import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import '../styles/qrcode.css';

const QRCodeGenerator = ({ requestId, requestData }) => {
  const [showModal, setShowModal] = useState(false);
  
  const qrData = JSON.stringify({
    id: requestData._id,
    requestId: requestData.requestId,
    title: requestData.title,
    status: requestData.status,
    url: `${window.location.origin}/request/${requestData._id}`
  });

  const downloadQR = () => {
    const svg = document.getElementById('qr-code-svg');
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      
      const downloadLink = document.createElement('a');
      downloadLink.download = `QR_${requestData.requestId}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const printQR = () => {
    const printWindow = window.open('', '', 'width=600,height=600');
    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR Code - ${requestData.requestId}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 40px;
            }
            h2 { color: #6366f1; margin-bottom: 10px; }
            p { color: #666; margin: 5px 0; }
            .qr-container { margin: 30px 0; }
          </style>
        </head>
        <body>
          <h2>Smart Campus Service Request</h2>
          <p><strong>Request ID:</strong> ${requestData.requestId}</p>
          <p><strong>Title:</strong> ${requestData.title}</p>
          <p><strong>Status:</strong> ${requestData.status.toUpperCase()}</p>
          <div class="qr-container">
            ${document.getElementById('qr-code-svg').outerHTML}
          </div>
          <p style="font-size: 12px; color: #999;">Scan to view request details</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <>
      <button 
        className="btn btn-secondary"
        onClick={() => setShowModal(true)}
        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        📱 QR Code
      </button>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="qr-modal-header">
              <h3>📱 Request QR Code</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            
            <div className="qr-modal-body">
              <div className="qr-info">
                <p><strong>Request ID:</strong> {requestData.requestId}</p>
                <p><strong>Title:</strong> {requestData.title}</p>
                <p><strong>Status:</strong> <span className="status-badge">{requestData.status.replace('_', ' ').toUpperCase()}</span></p>
              </div>

              <div className="qr-code-container">
                <QRCodeSVG
                  id="qr-code-svg"
                  value={qrData}
                  size={256}
                  level="H"
                  includeMargin={true}
                  bgColor="#ffffff"
                  fgColor="#6366f1"
                />
              </div>

              <p className="qr-instruction">
                📲 Scan this QR code to quickly access request details
              </p>

              <div className="qr-actions">
                <button className="btn btn-primary" onClick={downloadQR}>
                  💾 Download
                </button>
                <button className="btn btn-secondary" onClick={printQR}>
                  🖨️ Print
                </button>
                <button className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QRCodeGenerator;
