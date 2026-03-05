import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Export single request to PDF
export const exportRequestToPDF = (request) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFillColor(99, 102, 241); // Purple
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text('Smart Campus System', 105, 20, { align: 'center' });
  doc.setFontSize(14);
  doc.text('Service Request Report', 105, 30, { align: 'center' });
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  
  // Request Details
  let yPos = 50;
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('Request Details', 20, yPos);
  
  yPos += 10;
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  
  const details = [
    ['Request ID', request._id],
    ['Title', request.title],
    ['Description', request.description],
    ['Category', request.category?.replace('_', ' ').toUpperCase()],
    ['Priority', request.priority?.toUpperCase()],
    ['Status', request.status?.replace('_', ' ').toUpperCase()],
    ['Location', request.location],
    ['Created By', request.createdBy?.name],
    ['Email', request.createdBy?.email],
    ['Department', request.createdBy?.department],
    ['Created At', new Date(request.createdAt).toLocaleString()],
    ['Assigned To', request.assignedTo?.name || 'Not Assigned'],
  ];
  
  if (request.resolvedAt) {
    details.push(['Resolved At', new Date(request.resolvedAt).toLocaleString()]);
  }
  if (request.closedAt) {
    details.push(['Closed At', new Date(request.closedAt).toLocaleString()]);
  }
  if (request.resolutionTime) {
    details.push(['Resolution Time', formatResolutionTime(request.resolutionTime)]);
  }
  
  autoTable(doc, {
    startY: yPos,
    head: [],
    body: details,
    theme: 'striped',
    headStyles: { fillColor: [99, 102, 241] },
    margin: { left: 20, right: 20 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { cellWidth: 120 }
    }
  });
  
  // Activity Timeline
  if (request.activityLogs && request.activityLogs.length > 0) {
    yPos = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Activity Timeline', 20, yPos);
    
    const activities = request.activityLogs.map(log => [
      new Date(log.timestamp).toLocaleString(),
      log.action,
      log.performedBy?.name || 'System'
    ]);
    
    autoTable(doc, {
      startY: yPos + 5,
      head: [['Date & Time', 'Action', 'Performed By']],
      body: activities,
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] },
      margin: { left: 20, right: 20 }
    });
  }
  
  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${i} of ${pageCount} | Generated on ${new Date().toLocaleString()}`,
      105,
      285,
      { align: 'center' }
    );
  }
  
  // Save PDF
  doc.save(`Request_${request._id}_${Date.now()}.pdf`);
};

// Export admin report to PDF
export const exportAdminReportToPDF = (stats, requests) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text('Smart Campus System', 105, 20, { align: 'center' });
  doc.setFontSize(14);
  doc.text('Admin Dashboard Report', 105, 30, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
  
  // Statistics Summary
  let yPos = 50;
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('System Statistics', 20, yPos);
  
  yPos += 10;
  const statsData = [
    ['Total Requests', stats.totalRequests || 0],
    ['Pending Requests', stats.pendingRequests || 0],
    ['In Progress', stats.inProgressRequests || 0],
    ['Resolved Requests', stats.resolvedRequests || 0],
    ['Closed Requests', stats.closedRequests || 0],
    ['Total Users', stats.totalUsers || 0],
    ['Total Technicians', stats.totalTechnicians || 0],
    ['Average Resolution Time', stats.avgResolutionTime || 'N/A']
  ];
  
  autoTable(doc, {
    startY: yPos,
    head: [],
    body: statsData,
    theme: 'striped',
    headStyles: { fillColor: [99, 102, 241] },
    margin: { left: 20, right: 20 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 },
      1: { cellWidth: 90 }
    }
  });
  
  // Recent Requests
  if (requests && requests.length > 0) {
    yPos = doc.lastAutoTable.finalY + 15;
    
    // Check if we need a new page
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Recent Requests', 20, yPos);
    
    const requestsData = requests.slice(0, 20).map(req => [
      req._id.substring(0, 8) + '...',
      req.title.substring(0, 30) + (req.title.length > 30 ? '...' : ''),
      req.status?.replace('_', ' ').toUpperCase(),
      req.priority?.toUpperCase(),
      new Date(req.createdAt).toLocaleDateString()
    ]);
    
    autoTable(doc, {
      startY: yPos + 5,
      head: [['ID', 'Title', 'Status', 'Priority', 'Created']],
      body: requestsData,
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] },
      margin: { left: 20, right: 20 },
      styles: { fontSize: 9 }
    });
  }
  
  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${i} of ${pageCount} | Generated on ${new Date().toLocaleString()}`,
      105,
      285,
      { align: 'center' }
    );
  }
  
  doc.save(`Admin_Report_${Date.now()}.pdf`);
};

// Export technician performance to PDF
export const exportTechnicianPerformanceToPDF = (technicians) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text('Smart Campus System', 105, 20, { align: 'center' });
  doc.setFontSize(14);
  doc.text('Technician Performance Report', 105, 30, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
  
  // Performance Table
  let yPos = 50;
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('Technician Performance Metrics', 20, yPos);
  
  const performanceData = technicians.map(tech => [
    tech.name,
    tech.email,
    tech.totalResolved || 0,
    tech.reopenedCount || 0,
    tech.avgResolutionTime || 'N/A',
    tech.successRate ? `${tech.successRate.toFixed(1)}%` : 'N/A'
  ]);
  
  autoTable(doc, {
    startY: yPos + 5,
    head: [['Name', 'Email', 'Resolved', 'Reopened', 'Avg Time', 'Success Rate']],
    body: performanceData,
    theme: 'striped',
    headStyles: { fillColor: [99, 102, 241] },
    margin: { left: 20, right: 20 },
    styles: { fontSize: 9 }
  });
  
  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${i} of ${pageCount} | Generated on ${new Date().toLocaleString()}`,
      105,
      285,
      { align: 'center' }
    );
  }
  
  doc.save(`Technician_Performance_${Date.now()}.pdf`);
};

// Helper function
const formatResolutionTime = (minutes) => {
  if (minutes < 60) return `${minutes} mins`;
  if (minutes < 1440) return `${(minutes / 60).toFixed(1)} hours`;
  return `${(minutes / 1440).toFixed(1)} days`;
};
