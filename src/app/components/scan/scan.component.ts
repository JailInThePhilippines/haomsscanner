import { Component, OnInit, OnDestroy } from '@angular/core';
import { Html5Qrcode } from 'html5-qrcode';
import { DataService } from '../../services/data.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-scan',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './scan.component.html',
  styleUrls: ['./scan.component.css']
})
export class ScanComponent implements OnInit, OnDestroy {
  private html5QrCode: Html5Qrcode | null = null;
  scanResult: boolean = false;
  homeowner: any = null;
  paymentStatus: string = '';
  errorMessage: string = '';

  constructor(private dataService: DataService) {}

  ngOnInit() {
    this.initializeScanner();
  }

  initializeScanner() {
    // Create Html5Qrcode with a null check
    const readerElement = document.getElementById('reader');
    if (!readerElement) {
      this.errorMessage = 'Unable to find scanner element';
      return;
    }

    this.html5QrCode = new Html5Qrcode('reader');

    Html5Qrcode.getCameras().then(cameras => {
      if (cameras && cameras.length) {
        const cameraId = cameras[0].id;
        
        // Additional null check before calling start
        if (this.html5QrCode) {
          this.html5QrCode.start(
            cameraId, 
            { fps: 10, qrbox: 250 },
            this.onScanSuccess.bind(this),
            this.onScanError.bind(this)
          ).catch(err => {
            this.errorMessage = `Camera start error: ${err}`;
            console.error('Camera start error', err);
          });
        }
      } else {
        this.errorMessage = 'No cameras found';
      }
    }).catch(err => {
      this.errorMessage = `Error accessing cameras: ${err}`;
      console.error('Camera access error', err);
    });
  }

  onScanSuccess(decodedText: string) {
    try {
      // Stop scanning to prevent multiple scans
      if (this.html5QrCode) {
        this.html5QrCode.stop();
      }

      // Log the raw scanned text for debugging
      console.log('Raw Scanned Text:', decodedText);

      // Attempt to parse the QR code data
      let qrData;
      try {
        // Try to parse as JSON first
        qrData = JSON.parse(decodedText);
      } catch (jsonError) {
        // If JSON parsing fails, try to clean and parse
        const cleanedText = this.cleanQRCodeData(decodedText);
        qrData = JSON.parse(cleanedText);
      }

      // Verify payment via service
      this.dataService.verifyPaymentByQRCode({ 
        qrCodeData: JSON.stringify(qrData) 
      }).subscribe({
        next: (response) => {
          this.scanResult = true;
          this.homeowner = response.homeowner;
          this.paymentStatus = response.paymentStatus;
          this.errorMessage = '';
        },
        error: (err) => {
          this.scanResult = true;
          this.errorMessage = err.error?.message || 'Error verifying payment';
          this.homeowner = null;
          console.error('Verification Error:', err);
        }
      });
    } catch (error) {
      this.scanResult = true;
      this.errorMessage = 'Invalid QR code format';
      console.error('QR Code Parsing Error:', error);
    }
  }

  // Method to clean and standardize QR code data
  private cleanQRCodeData(rawData: string): string {
    // Remove any HTML or extra characters
    let cleanedData = rawData
      .replace(/<!DOCTYPE.*?>/i, '')    // Remove DOCTYPE
      .replace(/<\/?html.*?>/i, '')     // Remove HTML tags
      .replace(/<\/?body.*?>/i, '')     // Remove body tags
      .trim();

    console.log('Cleaned QR Code Data:', cleanedData);
    return cleanedData;
  }

  resetScanner() {
    // Reset all state variables
    this.scanResult = false;
    this.homeowner = null;
    this.paymentStatus = '';
    this.errorMessage = '';

    // Restart the scanner
    this.initializeScanner();
  }

  onScanError(errorMessage: string) {
    console.log(`Scan error: ${errorMessage}`);
  }

  ngOnDestroy() {
    // Clean up scanner with null check
    if (this.html5QrCode) {
      this.html5QrCode.stop();
    }
  }
}