/**
 * pdfReportService.js
 * 
 * PDF generation service for event analytics reports.
 * Uses PDFKit to create professional, branded reports with:
 * - Vaulteer branding (primary red #d32f2f)
 * - Attendance metrics with visual indicators
 * - Demographic breakdowns
 * - Timing analytics
 * - Engagement summary
 * 
 * @author GitHub Copilot
 * @created January 6, 2026
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');

// Vaulteer branding
const BRAND_COLORS = {
  primary: '#d32f2f',     // Vaulteer Red
  secondary: '#1976d2',   // Blue accent
  success: '#388e3c',     // Green
  warning: '#f57c00',     // Orange
  text: '#212121',        // Dark text
  textLight: '#757575',   // Gray text
  border: '#e0e0e0',      // Light gray
  background: '#fafafa'   // Very light gray
};

// PDF settings
const PDF_SETTINGS = {
  pageWidth: 612,   // Letter size
  pageHeight: 792,
  margin: 50,
  fontSize: {
    title: 24,
    heading: 16,
    subheading: 12,
    body: 10,
    small: 8
  },
  lineHeight: 1.5
};

/**
 * Convert hex color to RGB array for PDFKit
 * @param {string} hex 
 * @returns {number[]}
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result 
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
}

/**
 * Format date for PDF display
 * @param {Date|string} date 
 * @param {string} pattern 
 * @returns {string}
 */
function formatDate(date, pattern = 'MMMM d, yyyy h:mm a') {
  if (!date) return 'N/A';
  try {
    return format(new Date(date), pattern);
  } catch {
    return 'N/A';
  }
}

/**
 * Draw a progress bar
 * @param {PDFDocument} doc 
 * @param {number} x 
 * @param {number} y 
 * @param {number} width 
 * @param {number} height 
 * @param {number} percentage 
 * @param {string} color 
 */
function drawProgressBar(doc, x, y, width, height, percentage, color = BRAND_COLORS.primary) {
  // Background
  doc.rect(x, y, width, height)
     .fill('#e0e0e0');
  
  // Fill
  const fillWidth = (percentage / 100) * width;
  if (fillWidth > 0) {
    doc.rect(x, y, fillWidth, height)
       .fill(color);
  }
}

/**
 * Draw a section header
 * @param {PDFDocument} doc 
 * @param {string} title 
 * @param {number} y 
 * @returns {number} New Y position
 */
function drawSectionHeader(doc, title, y) {
  const { margin, fontSize } = PDF_SETTINGS;
  
  // Draw colored bar
  doc.rect(margin, y, 4, 20)
     .fill(BRAND_COLORS.primary);
  
  // Draw title
  doc.fillColor(BRAND_COLORS.text)
     .fontSize(fontSize.heading)
     .font('Helvetica-Bold')
     .text(title, margin + 12, y + 3);
  
  return y + 35;
}

/**
 * Draw a metric box
 * @param {PDFDocument} doc 
 * @param {number} x 
 * @param {number} y 
 * @param {number} width 
 * @param {string} label 
 * @param {string|number} value 
 * @param {string} color 
 * @returns {number} New Y position
 */
function drawMetricBox(doc, x, y, width, label, value, color = BRAND_COLORS.text) {
  const boxHeight = 50;
  
  // Box background
  doc.rect(x, y, width, boxHeight)
     .lineWidth(1)
     .stroke(BRAND_COLORS.border);
  
  // Value
  doc.fillColor(color)
     .fontSize(20)
     .font('Helvetica-Bold')
     .text(String(value), x + 10, y + 8, { width: width - 20, align: 'center' });
  
  // Label
  doc.fillColor(BRAND_COLORS.textLight)
     .fontSize(9)
     .font('Helvetica')
     .text(label, x + 10, y + 32, { width: width - 20, align: 'center' });
  
  return y + boxHeight;
}

/**
 * Generate PDF report for an event
 * 
 * @param {Object} reportData - Report data from eventReportService
 * @param {string} outputPath - Path to save PDF file
 * @returns {Promise<string>} Path to generated PDF
 */
async function generateReportPDF(reportData, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const { margin, pageWidth, pageHeight, fontSize } = PDF_SETTINGS;
      const contentWidth = pageWidth - (margin * 2);
      
      // Create document
      const doc = new PDFDocument({
        size: 'letter',
        margins: { top: margin, bottom: margin, left: margin, right: margin },
        info: {
          Title: `Event Report - ${reportData.event_title}`,
          Author: 'Vaulteer Event Management System',
          Subject: 'Post-Event Analytics Report',
          Creator: 'Vaulteer PDF Generator'
        }
      });
      
      // Create output stream
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);
      
      let y = margin;
      
      // ========== HEADER ==========
      // Logo placeholder (could add actual logo later)
      doc.rect(margin, y, 40, 40)
         .fill(BRAND_COLORS.primary);
      doc.fillColor('#ffffff')
         .fontSize(24)
         .font('Helvetica-Bold')
         .text('V', margin + 12, y + 8);
      
      // Title
      doc.fillColor(BRAND_COLORS.text)
         .fontSize(fontSize.title)
         .font('Helvetica-Bold')
         .text('Event Report', margin + 55, y);
      
      doc.fillColor(BRAND_COLORS.textLight)
         .fontSize(fontSize.body)
         .font('Helvetica')
         .text(reportData.event_title || 'Untitled Event', margin + 55, y + 28);
      
      // Generation timestamp
      doc.fontSize(fontSize.small)
         .text(
           `Generated: ${formatDate(reportData.generated_at || new Date())}`,
           pageWidth - margin - 150,
           y,
           { width: 150, align: 'right' }
         );
      
      y += 60;
      
      // Divider
      doc.moveTo(margin, y)
         .lineTo(pageWidth - margin, y)
         .stroke(BRAND_COLORS.border);
      y += 20;
      
      // ========== ATTENDANCE OVERVIEW ==========
      y = drawSectionHeader(doc, 'Attendance Overview', y);
      
      const attendance = reportData.attendance || {};
      const boxWidth = (contentWidth - 30) / 4;
      
      // Row 1: Main metrics
      drawMetricBox(doc, margin, y, boxWidth, 'Registered', attendance.total_registered || 0);
      drawMetricBox(doc, margin + boxWidth + 10, y, boxWidth, 'Attended', attendance.total_attended || 0, BRAND_COLORS.success);
      drawMetricBox(doc, margin + (boxWidth + 10) * 2, y, boxWidth, 'Attendance Rate', `${attendance.attendance_rate || 0}%`, BRAND_COLORS.primary);
      drawMetricBox(doc, margin + (boxWidth + 10) * 3, y, boxWidth, 'Waitlisted', attendance.total_waitlisted || 0, BRAND_COLORS.warning);
      
      y += 65;
      
      // Attendance details
      doc.fillColor(BRAND_COLORS.textLight)
         .fontSize(fontSize.body)
         .font('Helvetica');
      
      const attendanceDetails = [
        `On-time: ${reportData.timing?.on_time_checkins || 0}`,
        `Late: ${attendance.total_late || 0}`,
        `No-show: ${attendance.total_no_show || 0}`,
        `Cancelled: ${attendance.total_cancelled || 0}`
      ];
      doc.text(attendanceDetails.join('   •   '), margin, y, { width: contentWidth });
      
      y += 30;
      
      // ========== TIMING METRICS ==========
      y = drawSectionHeader(doc, 'Timing Analytics', y);
      
      const timing = reportData.timing || {};
      
      // Event times
      doc.fillColor(BRAND_COLORS.text)
         .fontSize(fontSize.body)
         .font('Helvetica');
      
      doc.text(`Event Start: ${formatDate(timing.event_start)}`, margin, y);
      doc.text(`Event End: ${formatDate(timing.event_end)}`, margin + contentWidth / 2, y);
      y += 20;
      
      doc.text(`First Check-in: ${formatDate(timing.first_checkin)}`, margin, y);
      doc.text(`Last Check-in: ${formatDate(timing.last_checkin)}`, margin + contentWidth / 2, y);
      y += 20;
      
      // Average check-in time
      const avgMins = timing.avg_minutes_from_start;
      let avgText = 'Average check-in: ';
      if (avgMins === null || avgMins === undefined) {
        avgText += 'N/A';
      } else if (avgMins < 0) {
        avgText += `${Math.abs(avgMins).toFixed(0)} minutes early`;
      } else if (avgMins > 0) {
        avgText += `${avgMins.toFixed(0)} minutes after start`;
      } else {
        avgText += 'Right on time';
      }
      doc.text(avgText, margin, y);
      
      y += 35;
      
      // ========== DEMOGRAPHICS ==========
      y = drawSectionHeader(doc, 'Participant Demographics', y);
      
      const demographics = reportData.demographics || {};
      const colWidth = (contentWidth - 20) / 2;
      
      // Age Distribution
      doc.fillColor(BRAND_COLORS.text)
         .fontSize(fontSize.subheading)
         .font('Helvetica-Bold')
         .text('Age Distribution', margin, y);
      y += 18;
      
      const ageData = demographics.age || {};
      const totalAge = Object.values(ageData).reduce((a, b) => a + b, 0) || 1;
      
      for (const [range, count] of Object.entries(ageData)) {
        const pct = (count / totalAge) * 100;
        doc.fillColor(BRAND_COLORS.text)
           .fontSize(fontSize.body)
           .font('Helvetica')
           .text(`${range}:`, margin, y, { width: 80 });
        
        drawProgressBar(doc, margin + 85, y + 2, 120, 10, pct, BRAND_COLORS.primary);
        
        doc.fillColor(BRAND_COLORS.textLight)
           .text(`${count} (${pct.toFixed(0)}%)`, margin + 215, y);
        
        y += 16;
      }
      
      y += 10;
      
      // Gender Distribution (side by side if space)
      const genderStartY = y;
      
      doc.fillColor(BRAND_COLORS.text)
         .fontSize(fontSize.subheading)
         .font('Helvetica-Bold')
         .text('Gender Distribution', margin, y);
      y += 18;
      
      const genderData = demographics.gender || {};
      const totalGender = Object.values(genderData).reduce((a, b) => a + b, 0) || 1;
      
      for (const [gender, count] of Object.entries(genderData)) {
        const pct = (count / totalGender) * 100;
        doc.fillColor(BRAND_COLORS.text)
           .fontSize(fontSize.body)
           .font('Helvetica')
           .text(`${gender}:`, margin, y, { width: 80 });
        
        drawProgressBar(doc, margin + 85, y + 2, 120, 10, pct, BRAND_COLORS.secondary);
        
        doc.fillColor(BRAND_COLORS.textLight)
           .text(`${count} (${pct.toFixed(0)}%)`, margin + 215, y);
        
        y += 16;
      }
      
      y += 15;
      
      // Role Distribution
      doc.fillColor(BRAND_COLORS.text)
         .fontSize(fontSize.subheading)
         .font('Helvetica-Bold')
         .text('Role Distribution', margin, y);
      y += 18;
      
      const roleData = demographics.role || {};
      const totalRole = Object.values(roleData).reduce((a, b) => a + b, 0) || 1;
      
      for (const [role, count] of Object.entries(roleData)) {
        const pct = (count / totalRole) * 100;
        doc.fillColor(BRAND_COLORS.text)
           .fontSize(fontSize.body)
           .font('Helvetica')
           .text(`${role}:`, margin, y, { width: 80 });
        
        drawProgressBar(doc, margin + 85, y + 2, 120, 10, pct, BRAND_COLORS.success);
        
        doc.fillColor(BRAND_COLORS.textLight)
           .text(`${count} (${pct.toFixed(0)}%)`, margin + 215, y);
        
        y += 16;
      }
      
      y += 20;
      
      // Check if we need a new page
      if (y > pageHeight - 200) {
        doc.addPage();
        y = margin;
      }
      
      // ========== ENGAGEMENT METRICS ==========
      y = drawSectionHeader(doc, 'Engagement Metrics', y);
      
      const engagement = reportData.engagement || {};
      
      // Engagement boxes
      const engBoxWidth = (contentWidth - 30) / 4;
      
      drawMetricBox(doc, margin, y, engBoxWidth, 'Points Awarded', engagement.total_points_awarded || 0, BRAND_COLORS.primary);
      drawMetricBox(doc, margin + engBoxWidth + 10, y, engBoxWidth, 'Badges Earned', engagement.badges_earned || 0, BRAND_COLORS.success);
      drawMetricBox(doc, margin + (engBoxWidth + 10) * 2, y, engBoxWidth, 'Feedback Count', engagement.feedback_count || 0, BRAND_COLORS.secondary);
      
      const ratingDisplay = engagement.avg_rating ? `${engagement.avg_rating.toFixed(1)}/5` : 'N/A';
      drawMetricBox(doc, margin + (engBoxWidth + 10) * 3, y, engBoxWidth, 'Avg Rating', ratingDisplay, BRAND_COLORS.warning);
      
      y += 70;
      
      // ========== LOCATION BREAKDOWN ==========
      const locationData = demographics.location || {};
      const locationEntries = Object.entries(locationData);
      
      if (locationEntries.length > 0) {
        y = drawSectionHeader(doc, 'Location Breakdown', y);
        
        const totalLoc = Object.values(locationData).reduce((a, b) => a + b, 0) || 1;
        
        // Show top 5 locations
        const topLocations = locationEntries
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);
        
        for (const [loc, count] of topLocations) {
          const pct = (count / totalLoc) * 100;
          doc.fillColor(BRAND_COLORS.text)
             .fontSize(fontSize.body)
             .font('Helvetica')
             .text(`${loc}:`, margin, y, { width: 150 });
          
          drawProgressBar(doc, margin + 155, y + 2, 150, 10, pct, BRAND_COLORS.primary);
          
          doc.fillColor(BRAND_COLORS.textLight)
             .text(`${count} (${pct.toFixed(0)}%)`, margin + 315, y);
          
          y += 16;
        }
        
        if (locationEntries.length > 5) {
          doc.fillColor(BRAND_COLORS.textLight)
             .fontSize(fontSize.small)
             .text(`+ ${locationEntries.length - 5} more locations`, margin, y);
          y += 12;
        }
      }
      
      // ========== FOOTER ==========
      const footerY = pageHeight - margin - 30;
      
      doc.moveTo(margin, footerY)
         .lineTo(pageWidth - margin, footerY)
         .stroke(BRAND_COLORS.border);
      
      doc.fillColor(BRAND_COLORS.textLight)
         .fontSize(fontSize.small)
         .font('Helvetica')
         .text(
           'Generated by Vaulteer Event Management System',
           margin,
           footerY + 10,
           { width: contentWidth / 2 }
         );
      
      doc.text(
        `Report ID: ${reportData.report_id || 'N/A'}`,
        pageWidth - margin - 100,
        footerY + 10,
        { width: 100, align: 'right' }
      );
      
      // Finalize
      doc.end();
      
      stream.on('finish', () => {
        console.log(`[PDFReportService] Generated PDF at ${outputPath}`);
        resolve(outputPath);
      });
      
      stream.on('error', (err) => {
        console.error('[PDFReportService] Stream error:', err);
        reject(err);
      });
      
    } catch (error) {
      console.error('[PDFReportService] Error generating PDF:', error);
      reject(error);
    }
  });
}

/**
 * Generate a temporary PDF file path
 * @param {string} eventUid 
 * @returns {string}
 */
function getTempPdfPath(eventUid) {
  const tempDir = path.join(__dirname, '../temp');
  
  // Ensure temp directory exists
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const timestamp = Date.now();
  return path.join(tempDir, `event-report-${eventUid}-${timestamp}.pdf`);
}

/**
 * Clean up a temporary PDF file
 * @param {string} filePath 
 */
function cleanupTempPdf(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[PDFReportService] Cleaned up temp file: ${filePath}`);
    }
  } catch (error) {
    console.error('[PDFReportService] Error cleaning up temp file:', error);
  }
}

module.exports = {
  generateReportPDF,
  getTempPdfPath,
  cleanupTempPdf,
  BRAND_COLORS
};
