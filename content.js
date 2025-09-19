/**
 * Dune Scraper Extension - Simplified Content Script
 * Clean, reliable data scraping with precise workflow
 */

(function() {
    'use strict';
    
    // Check if already injected
    if (window.DuneScraperExtension) return;
    
    // Simple configuration
    let CONFIG = {
        waitTime: { min: 3000, max: 5000 }, // 3-5 seconds wait
        debugMode: true,
        tableSelector: 'table, [class*="table"]',
        paginationSelector: 'ul[class*="table_footer"]',
        nextButtonPath: 'M4.64645 14.3536', // Exact next button SVG path
        exportFormat: 'csv' // csv or json
    };
    
    // Load settings from storage
    chrome.storage.sync.get(['duneScraperSettings'], (result) => {
        if (result.duneScraperSettings) {
            CONFIG = { ...CONFIG, ...result.duneScraperSettings };
        }
    });
    
    // Global state
    window.DuneScraperExtension = {
        isActive: false,
        isRunning: false,
        scrapedData: [],
        currentPage: 1,
        duplicateHashes: new Set(),
        ui: null,
        stats: {
            pagesProcessed: 0,
            rowsScraped: 0,
            duplicatesFound: 0,
            errors: 0
        }
    };
    
    // Utility functions
    const utils = {
        log: (message, type = 'info') => {
            if (!CONFIG.debugMode && type === 'debug') return;
            const prefix = `[DuneScraper ${type.toUpperCase()}]`;
            const styles = {
                info: 'color: #00bfff',
                success: 'color: #00bfff', 
                warning: 'color: #ffa500',
                error: 'color: #ff4444'
            };
            console.log(`%c${prefix}`, styles[type] || styles.info, message);
        },
        
        randomWait: () => {
            const min = CONFIG.waitTime.min;
            const max = CONFIG.waitTime.max;
            return Math.floor(Math.random() * (max - min + 1)) + min;
        },
        
        delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
        
        generateHash: (data) => {
            const str = JSON.stringify(data);
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return hash.toString(36);
        },
        
        formatTimestamp: () => {
            return new Date().toISOString().replace(/[:.]/g, '-');
        }
    };
    
    // Data scraper
    const scraper = {
        isDataLoaded: function() {
            const table = document.querySelector(CONFIG.tableSelector);
            if (!table) {
                utils.log('No table found', 'warning');
                return false;
            }
            
            const rows = table.querySelectorAll('tbody tr, tr');
            if (rows.length === 0) {
                utils.log('No table rows found', 'warning');
                return false;
            }
            
            // Check if table has finished loading (no loading indicators)
            const loadingIndicators = document.querySelectorAll(
                '[class*="loading"], [class*="spinner"], .loading, .spinner'
            );
            const hasLoading = Array.from(loadingIndicators).some(el => 
                el.offsetParent !== null && !el.hidden
            );
            
            if (hasLoading) {
                utils.log('Data still loading...', 'debug');
                return false;
            }
            
            utils.log(`Data loaded: ${rows.length} rows found`, 'success');
            return true;
        },
        
        extractTableData: function() {
            const table = document.querySelector(CONFIG.tableSelector);
            if (!table) return [];
            
            // Get headers
            const headerCells = table.querySelectorAll('thead th, thead td, tr:first-child th, tr:first-child td');
            const headers = Array.from(headerCells).map(cell => 
                cell.textContent.trim()).filter(h => h.length > 0
            );
            
            // Get data rows
            let dataRows = Array.from(table.querySelectorAll('tbody tr'));
            if (dataRows.length === 0) {
                // Fallback: all rows except first (header)
                dataRows = Array.from(table.querySelectorAll('tr')).slice(1);
            }
            
            const data = [];
            
            dataRows.forEach((row, index) => {
                const cells = Array.from(row.querySelectorAll('td, th'));
                const rowData = cells.map(cell => {
                    // Try different methods to get cell value
                    return cell.getAttribute('data-value') || 
                           cell.getAttribute('title') || 
                           cell.textContent.trim();
                });
                
                // Only include rows with actual data
                if (rowData.some(cell => cell && cell.length > 0)) {
                    const rowObject = {};
                    headers.forEach((header, i) => {
                        rowObject[header || `Column_${i + 1}`] = rowData[i] || '';
                    });
                    
                    // Check for duplicates
                    const hash = utils.generateHash(rowObject);
                    if (!window.DuneScraperExtension.duplicateHashes.has(hash)) {
                        window.DuneScraperExtension.duplicateHashes.add(hash);
                        data.push(rowObject);
                    } else {
                        window.DuneScraperExtension.stats.duplicatesFound++;
                        utils.log(`Duplicate row found on page ${window.DuneScraperExtension.currentPage}, row ${index + 1}`, 'warning');
                    }
                }
            });
            
            utils.log(`Extracted ${data.length} unique rows from page ${window.DuneScraperExtension.currentPage}`, 'success');
            return data;
        }
    };
    
    // Navigation controller
    const navigation = {
        hideUnnecessaryButtons: function() {
            const footer = document.querySelector(CONFIG.paginationSelector);
            if (!footer) return;
            
            const buttons = footer.querySelectorAll('li button');
            buttons.forEach((button, index) => {
                const svg = button.querySelector('svg path');
                const path = svg ? svg.getAttribute('d') : '';
                
                // Hide first, previous, and last buttons - only show next
                if (index !== 2 || !path.includes(CONFIG.nextButtonPath)) {
                    button.style.display = 'none';
                } else {
                    button.style.display = 'block';
                }
            });
            
            utils.log('Hidden unnecessary pagination buttons', 'debug');
        },
        
        findNextButton: function() {
            const footer = document.querySelector(CONFIG.paginationSelector);
            if (!footer) return null;
            
            const buttons = footer.querySelectorAll('li button');
            for (const button of buttons) {
                if (button.disabled) continue;
                
                const svg = button.querySelector('svg path');
                const path = svg ? svg.getAttribute('d') : '';
                
                // Exact match for next button
                if (path.includes(CONFIG.nextButtonPath)) {
                    return button;
                }
            }
            
            return null;
        },
        
        hasNextPage: function() {
            const nextButton = this.findNextButton();
            return nextButton && !nextButton.disabled;
        },
        
        goToNextPage: async function() {
            const nextButton = this.findNextButton();
            if (!nextButton || nextButton.disabled) {
                utils.log('No next page available', 'info');
                return false;
            }
            
            nextButton.click();
            window.DuneScraperExtension.currentPage++;
            utils.log(`Navigating to page ${window.DuneScraperExtension.currentPage}`, 'info');
            
            // Wait for page to load
            const waitTime = utils.randomWait();
            utils.log(`Waiting ${waitTime}ms for page to load...`, 'debug');
            await utils.delay(waitTime);
            
            return true;
        }
    };
    
    // Export controller
    const exporter = {
        downloadCSV: function(data, filename) {
            if (!data || data.length === 0) {
                utils.log('No data to export', 'warning');
                return;
            }
            
            const headers = Object.keys(data[0]);
            let csv = headers.map(h => `"${h}"`).join(',') + '\n';
            
            data.forEach(row => {
                const values = headers.map(header => {
                    const value = row[header] || '';
                    const escapedValue = String(value).replace(/"/g, '""');
                    return `"${escapedValue}"`;
                });
                csv += values.join(',') + '\n';
            });
            
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            this.triggerDownload(blob, filename);
            utils.log(`CSV exported: ${data.length} rows`, 'success');
        },
        
        downloadJSON: function(data, filename) {
            if (!data || data.length === 0) {
                utils.log('No data to export', 'warning');
                return;
            }
            
            const exportData = {
                metadata: {
                    totalRows: data.length,
                    pagesScraped: window.DuneScraperExtension.stats.pagesProcessed,
                    scrapedAt: new Date().toISOString(),
                    source: window.location.href
                },
                data: data
            };
            
            const jsonString = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            this.triggerDownload(blob, filename);
            utils.log(`JSON exported: ${data.length} rows`, 'success');
        },
        
        triggerDownload: function(blob, filename) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };
    
    // Main scraping controller
    const scrapingController = {
        start: async function() {
            if (window.DuneScraperExtension.isRunning) {
                utils.log('Scraping already in progress', 'warning');
                return;
            }
            
            window.DuneScraperExtension.isActive = true;
            window.DuneScraperExtension.isRunning = true;
            window.DuneScraperExtension.scrapedData = [];
            window.DuneScraperExtension.currentPage = 1;
            window.DuneScraperExtension.duplicateHashes.clear();
            
            utils.log('Starting scraping process...', 'info');
            navigation.hideUnnecessaryButtons();
            
            try {
                await this.processCurrentPage();
                await this.processAllPages();
                this.finishScraping();
            } catch (error) {
                utils.log(`Scraping failed: ${error.message}`, 'error');
                window.DuneScraperExtension.stats.errors++;
            } finally {
                window.DuneScraperExtension.isRunning = false;
            }
        },
        
        stop: function() {
            window.DuneScraperExtension.isActive = false;
            window.DuneScraperExtension.isRunning = false;
            utils.log('Scraping stopped', 'info');
        },
        
        processCurrentPage: async function() {
            // Wait for data to load
            let attempts = 0;
            while (!scraper.isDataLoaded() && attempts < 10) {
                await utils.delay(1000);
                attempts++;
            }
            
            if (!scraper.isDataLoaded()) {
                throw new Error('Data failed to load on current page');
            }
            
            // Wait additional random time
            const waitTime = utils.randomWait();
            utils.log(`Waiting ${waitTime}ms before scraping...`, 'debug');
            await utils.delay(waitTime);
            
            // Extract data
            const pageData = scraper.extractTableData();
            window.DuneScraperExtension.scrapedData.push(...pageData);
            window.DuneScraperExtension.stats.pagesProcessed++;
            window.DuneScraperExtension.stats.rowsScraped += pageData.length;
            
            utils.log(`Page ${window.DuneScraperExtension.currentPage} processed: ${pageData.length} rows`, 'success');
        },
        
        processAllPages: async function() {
            while (window.DuneScraperExtension.isActive && navigation.hasNextPage()) {
                const success = await navigation.goToNextPage();
                if (!success) break;
                
                await this.processCurrentPage();
                
                // Update UI
                if (window.DuneScraperExtension.ui) {
                    updateUI();
                }
            }
        },
        
        finishScraping: function() {
            const data = window.DuneScraperExtension.scrapedData;
            const timestamp = utils.formatTimestamp();
            
            utils.log(`Scraping completed: ${data.length} total rows from ${window.DuneScraperExtension.stats.pagesProcessed} pages`, 'success');
            
            // Update UI with completion state
            if (window.DuneScraperExtension.ui) {
                const statusEl = document.getElementById('ds-status');
                const progressWrapper = document.getElementById('ds-progress-wrapper');
                const progressFill = document.getElementById('ds-progress-fill');
                const progressText = document.getElementById('ds-progress-text');
                
                // Show completion animation
                statusEl.className = 'ds-status';
                statusEl.querySelector('.ds-status-text').textContent = 'Export in progress...';
                
                // Complete progress bar
                progressFill.style.width = '100%';
                progressText.textContent = `Complete! ${data.length} rows collected`;
                
                // Reset buttons
                document.getElementById('ds-start').disabled = false;
                document.getElementById('ds-stop').disabled = true;
                
                // Final status update after export
                setTimeout(() => {
                    statusEl.querySelector('.ds-status-text').textContent = 'Scraping completed!';
                }, 1000);
            }
            
            // Auto-export based on format setting
            if (CONFIG.exportFormat === 'csv') {
                exporter.downloadCSV(data, `dune_data_${timestamp}.csv`);
            } else {
                exporter.downloadJSON(data, `dune_data_${timestamp}.json`);
            }
        }
    };
    
    // Right-side panel UI
    function createRightPanel() {
        if (window.DuneScraperExtension.ui) return;
        
        const panel = document.createElement('div');
        panel.id = 'dune-scraper-panel';
        panel.innerHTML = `
            <div class="ds-header">
                <button id="ds-close" class="ds-close-btn">×</button>
                <div class="ds-header-content">
                    <div class="ds-logo">
                        <div class="ds-logo-icon">
                            <svg width="28" height="28" viewBox="0 0 32.38 30.85" xmlns="http://www.w3.org/2000/svg">
                                <path fill="#0f1419" stroke="#0f1419" stroke-width="0.25" d="M17.12.15c-.48.46-1.96,1.04-1.96,1.04-5.14-.24-7.72,3.91-7.72,3.91,0,0-.2.14-.15-1.27-2.02,1.92-1.3,3.04-1.7,3.88-.48-.31-.57-.62-.73-1.11-.22.33-.26,1.03.14,2.44C-1.46,14.49.36,18.83.36,18.83c0,0,1.05-2.09,3.05-3.64,1.21-.93,4.59-2.03,5.57-2.44.95-.29,1.68-.74,2.18-1.14.59-.45.77-.99,1.2-1.32.32-.25.88-.33,1.19-.35.57-.03,1.07,0,1.63.16-.57.2-.82.08-1.9.45-1.08.38-1.16,1.74-2.34,2.1-1.52.47-4.8,1.65-5.93,2.26-.96.52-1.51.72-2.98,2.67,4.31-.31,7.62-1.98,8.76-2.39-.46.39-1.45,2.29-1.32,3.34.13-.2.39-.35,1.34-.92-1.07,1.06-1.62,4.85-1.22,5.63.31-.66.5-1.4.95-1.71.1,1.49.73,2.79,1.81,3.34-.38-.85.31-4.91.94-6.64.02,1.14.71,2.62,1.18,3.12.38-.61.78-2.21.84-2.76-.04-.31-.73-1.42-1.07-1.9.45.21.7.52,1.15,1.03.22-.32.23-1.14.32-3.09,1.15,3.95-1.23,8.21-1.23,8.21-.46-.68-.72-1.03-1.21-2.26-.43.76-.78,3.39.14,5.35.78,1.67,3.25,3.78,4.58,4.57-.45-.98-.79-1.54-.99-2.35,0,0,.61.49,1.06.39-.76-.98-1.29-3.38-1.16-4.26.23.27.26.57.81,1-.59-1.57.22-4.15.68-5.02.19.13.3.93.45,1.8.17,1.01.07,1.53.22,2.96.15-.09,1.25-1.91,1.53-2.66.28-.76.47-2.07.54-3.16.38.5.58,1.19.77,2.86,0,1.52-.68,3.54-.07,4.9.97-.71,2.28-3.76,2.28-3.76.06,0-.15-.55-.88-1.78.62.24,1.29.84,1.29.84l.34-1.27s-.84-1.03-1.84-1.87c.66.14,1.37.59,2.11,1.11.35-.63.16-2.73-.32-4.06.44.63.73,1.09,1.25,1.42.29-.31.83-3.32.68-4.31-1.09-.54-1.75-1.24-2.18-1.94.82.32,1.15.55,2.1,1.17-.18-1.4-1.06-2.26-1.06-2.26,0,0,1.75.95,3,1.2s3.44-.17,3.44-.17c0,0-1.38-.77-2.56-1.44-1.12.36-1.4.34-2.14-.13.51.04.96-.05,1.42-.4-.9-.57-1-1.05-1-1.05,1.13,0,1.7-.13,2.21-.98-.64.13-2.38.22-3.45-.56-1.92-1.41-4.59-1.48-4.59-1.48l2.48,3.65c-.67.31-1.83.29-3.8-.4.41.69.5,1.04.59,2.59-.54-2.15-1.35-2.48-1.79-3.59,2.35,1.05,3.97.91,3.97.91,0,0-.17-.37-.41-.77-.68-.02-1.63-.79-1.63-.79,0,0,.64-.01,1.04-.11-.58-.52-.91-.91-1.63-2.34,1.94-.14,3.89.63,5.56,1.72-.45-1.31-4.14-3.59-6.49-3.73.39-.25.98-1.13.93-1.9-1.52.81-3.28.76-3.28.76,0,0,.08-.91-.34-1.1h0ZM11.56,4.82c-.23.28-.68.62-.66.84s.79.43.81,1.02c.02.81-.2.96-.82,1.34.35.07.58-.03.84-.11l.39-.12s-.25.41-1.08.74c-.86.16-1.55.03-1.93-.09-.25.11-.59.27-.84.2-.26-.07-.81-.28-1.1-.78,0,0,1.43.16,2.1-.38.57-.44.8-1.18,1.24-1.75.31-.4.65-.72,1.05-.91h0ZM6.16,9.72c.18,0,.39.03.72.12.01.12-.28.32-.82.71-.31-.15-.38-.73-.38-.73.16-.05.3-.09.47-.09h0Z"/>
                            </svg>
                        </div>
                        <h3>Dune Scraper</h3>
                    </div>
                </div>
            </div>
            <div class="ds-content">
                <div class="ds-controls">
                    <div class="ds-format-group">
                        <label class="ds-label">Export Format</label>
                        <select id="ds-format" class="ds-select">
                            <option value="csv">CSV</option>
                            <option value="json">JSON</option>
                        </select>
                    </div>
                    
                    <div class="ds-buttons">
                        <button class="ds-btn ds-btn-primary" id="ds-start">
                            <span class="ds-btn-text">Start Scraping</span>
                        </button>
                        <button class="ds-btn ds-btn-danger" id="ds-stop" disabled>
                            <span class="ds-btn-text">Stop</span>
                        </button>
                    </div>
                </div>
                
                <div class="ds-status-card">
                    <div class="ds-status" id="ds-status">
                        <span class="ds-status-text">Ready to scrape</span>
                    </div>
                    <div class="ds-progress-wrapper" id="ds-progress-wrapper" style="display: none;">
                        <div class="ds-progress-bar">
                            <div class="ds-progress-fill" id="ds-progress-fill"></div>
                        </div>
                        <div class="ds-progress-text" id="ds-progress-text">Processing...</div>
                    </div>
                </div>
                
                <div class="ds-stats-grid">
                    <div class="ds-stat-card">
                        <div class="ds-stat-content">
                            <div class="ds-stat-label">Pages</div>
                            <div class="ds-stat-value" id="ds-stat-pages">0</div>
                        </div>
                    </div>
                    <div class="ds-stat-card">
                        <div class="ds-stat-content">
                            <div class="ds-stat-label">Rows</div>
                            <div class="ds-stat-value" id="ds-stat-rows">0</div>
                        </div>
                    </div>
                    <div class="ds-stat-card">
                        <div class="ds-stat-content">
                            <div class="ds-stat-label">Duplicates</div>
                            <div class="ds-stat-value" id="ds-stat-duplicates">0</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add fonts and styles
        const fontLink = document.createElement('link');
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Audiowide:wght@400&family=Mulish:wght@300;400;500;600;700&display=swap';
        fontLink.rel = 'stylesheet';
        document.head.appendChild(fontLink);
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.6; }
                100% { opacity: 1; }
            }
            
            @keyframes slideIn {
                from { 
                    transform: translateX(100%) scale(0.95); 
                    opacity: 0; 
                }
                to { 
                    transform: translateX(0) scale(1); 
                    opacity: 1; 
                }
            }
            
            @keyframes progressBar {
                0% { width: 0%; }
                100% { width: var(--progress-width, 0%); }
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            #dune-scraper-panel {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 320px;
                background: #0f1419;
                border: 1px solid rgba(0, 191, 255, 0.2);
                border-radius: 16px;
                color: #e1e5f2;
                font-family: 'Mulish', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-size: 14px;
                z-index: 10000;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0, 191, 255, 0.1);
                animation: slideIn 0.3s ease-out;
                backdrop-filter: blur(10px);
                overflow: hidden;
            }
            
            .ds-header {
                background: #00bfff;
                border-radius: 16px 16px 0 0;
                padding: 0;
                position: relative;
                overflow: hidden;
            }
            
            .ds-header::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(45deg, rgba(255,255,255,0.1) 0%, transparent 100%);
                pointer-events: none;
            }
            
            .ds-header-content {
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 20px 24px;
                position: relative;
                z-index: 1;
            }
            
            .ds-logo {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .ds-icon {
                font-size: 20px;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
                color: #0f1419;
            }
            
            .ds-header h3 {
                margin: 0;
                color: #0f1419;
                font-size: 22px;
                font-weight: 400;
                font-family: 'Audiowide', cursive;
                text-shadow: 0 2px 4px rgba(0,0,0,0.3);
            }
            
            .ds-close-btn {
                position: absolute;
                top: 8px;
                right: 8px;
                background: rgba(255, 255, 255, 0.9);
                border: 1px solid rgba(0, 0, 0, 0.2);
                color: #000000;
                width: 28px;
                height: 28px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                backdrop-filter: blur(10px);
                z-index: 10;
            }
            
            .ds-close-btn:hover {
                background: rgba(0, 0, 0, 0.1);
                border-color: #000000;
                transform: scale(1.05);
            }
            
            .ds-content {
                padding: 20px;
                display: flex;
                flex-direction: column;
                gap: 16px;
                border-radius: 0 0 16px 16px;
                background: #0f1419;
            }
            
            .ds-status-card {
                background: rgba(0, 191, 255, 0.1);
                border: 1px solid rgba(0, 191, 255, 0.2);
                border-radius: 12px;
                padding: 16px;
            }
            
            .ds-status {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 12px;
            }
            
            .ds-status-text {
                font-weight: 500;
                color: #e1e5f2;
                font-size: 14px;
            }
            
            .ds-status.running .ds-status-text {
                color: #00bfff;
            }
            
            .ds-progress-wrapper {
                margin-top: 8px;
            }
            
            .ds-progress-bar {
                width: 100%;
                height: 8px;
                background: rgba(15, 20, 25, 0.5);
                border-radius: 4px;
                overflow: hidden;
                margin-bottom: 8px;
            }
            
            .ds-progress-fill {
                height: 100%;
                background: #00bfff;
                border-radius: 4px;
                transition: width 0.3s ease;
                animation: progressBar 0.3s ease-out;
            }
            
            .ds-progress-text {
                font-size: 12px;
                color: #8b9dc3;
                text-align: center;
            }
            
            .ds-controls {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            .ds-format-group {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            
            .ds-label {
                font-size: 12px;
                color: #8b9dc3;
                font-weight: 500;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 6px;
            }
            
            .ds-select {
                background: rgba(15, 20, 25, 0.8);
                border: 1px solid rgba(0, 191, 255, 0.3);
                color: #8b9dc3;
                padding: 12px 16px;
                border-radius: 8px;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s ease;
                appearance: none;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b9dc3' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6,9 12,15 18,9'%3E%3C/polyline%3E%3C/svg%3E");
                background-repeat: no-repeat;
                background-position: right 12px center;
                padding-right: 40px;
            }
            
            .ds-select:hover {
                border-color: rgba(0, 191, 255, 0.5);
                color: #00bfff;
            }
            
            .ds-select:focus {
                outline: none;
                border-color: #00bfff;
                box-shadow: 0 0 0 3px rgba(0, 191, 255, 0.1);
                color: #e1e5f2;
            }
            
            .ds-buttons {
                display: flex;
                gap: 8px;
            }
            
            .ds-btn {
                flex: 1;
                background: rgba(15, 20, 25, 0.8);
                border: 1px solid rgba(0, 191, 255, 0.2);
                color: #e1e5f2;
                padding: 14px 16px;
                border-radius: 10px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                transition: all 0.2s ease;
                position: relative;
                overflow: hidden;
            }
            
            .ds-btn::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(0, 191, 255, 0.1), transparent);
                transition: left 0.5s ease;
            }
            
            .ds-btn:hover::before {
                left: 100%;
            }
            
            .ds-btn-primary {
                background: #00bfff;
                border-color: #00bfff;
                color: #0f1419;
                font-weight: 600;
            }
            
            .ds-btn-primary:hover {
                transform: translateY(-1px);
                box-shadow: 0 6px 20px rgba(0, 191, 255, 0.3);
                background: #1ac7ff;
            }
            
            .ds-btn-danger {
                background: #ff4444;
                border-color: #ff4444;
                color: #ffffff;
                font-weight: 600;
            }
            
            .ds-btn-danger:hover {
                transform: translateY(-1px);
                box-shadow: 0 6px 20px rgba(255, 68, 68, 0.3);
                background: #ff5555;
            }
            
            .ds-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                transform: none !important;
                box-shadow: none !important;
            }
            
            .ds-btn-icon {
                font-size: 14px;
            }
            
            .ds-stats-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 8px;
            }
            
            .ds-stat-card {
                background: rgba(15, 20, 25, 0.8);
                border: 1px solid rgba(0, 191, 255, 0.2);
                border-radius: 10px;
                padding: 16px 12px;
                text-align: center;
                transition: all 0.2s ease;
            }
            
            .ds-stat-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(0, 191, 255, 0.1);
                border-color: rgba(0, 191, 255, 0.4);
            }
            
            .ds-stat-label {
                font-size: 10px;
                color: #8b9dc3;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 6px;
                font-weight: 500;
            }
            
            .ds-stat-value {
                font-size: 20px;
                font-weight: 700;
                color: #00bfff;
                line-height: 1;
                transition: all 0.2s ease;
            }
            
            .ds-loading {
                display: inline-block;
                width: 16px;
                height: 16px;
                border: 2px solid rgba(139, 157, 195, 0.2);
                border-radius: 50%;
                border-top-color: #00bfff;
                animation: spin 1s ease-in-out infinite;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(panel);
        window.DuneScraperExtension.ui = panel;
        
        // Events
        document.getElementById('ds-close').onclick = () => {
            panel.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => {
                panel.remove();
                window.DuneScraperExtension.ui = null;
            }, 300);
        };
        
        document.getElementById('ds-start').onclick = () => {
            CONFIG.exportFormat = document.getElementById('ds-format').value;
            scrapingController.start();
            document.getElementById('ds-start').disabled = true;
            document.getElementById('ds-stop').disabled = false;
            
            // Show progress bar
            document.getElementById('ds-progress-wrapper').style.display = 'block';
            
            // Update status to loading
            const statusEl = document.getElementById('ds-status');
            statusEl.className = 'ds-status running';
            statusEl.querySelector('.ds-status-text').textContent = 'Initializing scraper...';
        };
        
        document.getElementById('ds-stop').onclick = () => {
            scrapingController.stop();
            document.getElementById('ds-start').disabled = false;
            document.getElementById('ds-stop').disabled = true;
            
            // Hide progress bar
            document.getElementById('ds-progress-wrapper').style.display = 'none';
            
            // Reset status
            const statusEl = document.getElementById('ds-status');
            statusEl.className = 'ds-status';
            statusEl.querySelector('.ds-status-text').textContent = 'Ready to scrape';
        };
    }
    
    function updateUI() {
        if (!window.DuneScraperExtension.ui) return;
        
        const stats = window.DuneScraperExtension.stats;
        const statusEl = document.getElementById('ds-status');
        const progressWrapper = document.getElementById('ds-progress-wrapper');
        const progressFill = document.getElementById('ds-progress-fill');
        const progressText = document.getElementById('ds-progress-text');
        
        if (window.DuneScraperExtension.isRunning) {
            // Update status with current activity
            statusEl.className = 'ds-status running';
            statusEl.querySelector('.ds-status-text').textContent = `Processing page ${window.DuneScraperExtension.currentPage}...`;
            
            // Show and update progress bar
            progressWrapper.style.display = 'block';
            
            // Estimate progress (assuming we don't know total pages, show activity)
            const currentPage = window.DuneScraperExtension.currentPage;
            const estimatedProgress = Math.min((currentPage * 10) % 100, 90); // Cycling progress
            progressFill.style.width = `${estimatedProgress}%`;
            progressText.textContent = `Page ${currentPage} • ${stats.rowsScraped} rows collected`;
            
        } else {
            // Reset to ready state
            statusEl.className = 'ds-status';
            statusEl.querySelector('.ds-status-text').textContent = stats.pagesProcessed > 0 ? 'Scraping completed!' : 'Ready to scrape';
            
            // Hide progress bar when not running
            if (!window.DuneScraperExtension.isRunning) {
                setTimeout(() => {
                    progressWrapper.style.display = 'none';
                }, 1000);
            }
        }
        
        // Update stats with animations
        const updateStatValue = (id, value) => {
            const element = document.getElementById(id);
            if (element && element.textContent !== value.toString()) {
                element.style.transform = 'scale(1.2)';
                element.textContent = value;
                setTimeout(() => {
                    element.style.transform = 'scale(1)';
                }, 200);
            }
        };
        
        updateStatValue('ds-stat-pages', stats.pagesProcessed);
        updateStatValue('ds-stat-rows', stats.rowsScraped);
        updateStatValue('ds-stat-duplicates', stats.duplicatesFound);
    }
    
    // Message listener
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'togglePanel') {
            if (window.DuneScraperExtension.ui) {
                // Panel exists, remove it
                const panel = window.DuneScraperExtension.ui;
                panel.style.animation = 'slideIn 0.3s ease-out reverse';
                setTimeout(() => {
                    panel.remove();
                    window.DuneScraperExtension.ui = null;
                }, 300);
            } else {
                // Panel doesn't exist, create it
                createRightPanel();
            }
            sendResponse({ success: true });
        }
        return true;
    });
    
    // Initialize
    utils.log('Dune Scraper Extension loaded', 'success');
    setTimeout(() => navigation.hideUnnecessaryButtons(), 2000);
    
})();