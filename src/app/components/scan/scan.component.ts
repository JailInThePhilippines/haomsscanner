import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
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
  private scannerInitialized: boolean = false;
  scanResult: boolean = false;
  homeowner: any = null;
  paymentStatus: string = '';
  errorMessage: string = '';
  garbageCollectionEligible: boolean = false;
  collectionConfirmed: boolean = false;
  collectingGarbage: boolean = false;
  rawQrCodeData: string = '';
  eligibilityDetails: any = null;
  todayCollectionAlreadyConfirmed: boolean = false;
  paymentDetails: any = null;
  showPaymentDetails: boolean = false;
  scannerStopped: boolean = false;

  @ViewChild('scanResultsContainer') scanResultsContainer: ElementRef | null = null;

  constructor(private dataService: DataService) { }

  ngOnInit() {
    this.initializeScanner();
  }

  initializeScanner() {
    if (this.scannerInitialized && this.html5QrCode) {
      // If scanner was just paused, resume it
      if (this.scannerStopped) {
        this.resumeScanning();
      }
      return;
    }

    const readerElement = document.getElementById('reader');
    if (!readerElement) {
      this.errorMessage = 'Unable to find scanner element';
      return;
    }

    this.html5QrCode = new Html5Qrcode('reader');
    this.scannerInitialized = true;

    Html5Qrcode.getCameras().then(cameras => {
      if (cameras && cameras.length) {
        const backCamera = cameras.find(camera =>
          camera.label.toLowerCase().includes('back') ||
          camera.label.toLowerCase().includes('rear')
        );

        const cameraId = backCamera
          ? backCamera.id
          : cameras[cameras.length - 1].id;

        if (this.html5QrCode) {
          this.html5QrCode.start(
            cameraId,
            {
              fps: 10,
              qrbox: {
                width: window.innerWidth > 600 ? 400 : window.innerWidth - 80,
                height: 300
              }
            },
            this.onScanSuccess.bind(this),
            this.onScanError.bind(this)
          ).catch(err => {
            this.errorMessage = `Camera start error: ${err}`;
            console.error('Camera start error', err);
            this.scannerInitialized = false;
          });
        }
      } else {
        this.errorMessage = 'No cameras found';
        this.scannerInitialized = false;
      }
    }).catch(err => {
      this.errorMessage = `Error accessing cameras: ${err}`;
      console.error('Camera access error', err);
      this.scannerInitialized = false;
    });
  }

  onScanSuccess(decodedText: string) {
    try {
      // If scanner is stopped (paused), don't process the scan
      if (this.scannerStopped) {
        return;
      }
      
      // Pause the scanner but don't stop it completely
      this.pauseScanning();

      console.log('Raw Scanned Text:', decodedText);
      this.rawQrCodeData = decodedText;

      // Reset collection flags for each new scan
      this.todayCollectionAlreadyConfirmed = false;
      this.collectionConfirmed = false;

      let qrData;
      try {
        qrData = JSON.parse(decodedText);
      } catch (jsonError) {
        const cleanedText = this.cleanQRCodeData(decodedText);
        qrData = JSON.parse(cleanedText);
        this.rawQrCodeData = cleanedText;
      }

      this.dataService.verifyPaymentByQRCode({
        qrCodeData: JSON.stringify(qrData)
      }).subscribe({
        next: (response) => {
          this.scanResult = true;
          this.homeowner = response.homeowner;
          this.paymentStatus = response.paymentStatus;
          this.garbageCollectionEligible = response.garbageCollectionEligible || false;
          this.eligibilityDetails = response.eligibilityDetails || null;
          this.paymentDetails = response.paymentDetails || null;
          this.errorMessage = '';

          // Only check collection status if homeowner is eligible
          if (this.homeowner && this.homeowner.accountNumber && this.garbageCollectionEligible) {
            this.checkTodayCollectionStatus(this.homeowner.accountNumber);
          } else {
            // Reset for ineligible homeowners
            this.todayCollectionAlreadyConfirmed = false;
          }
        },
        error: (err) => {
          this.scanResult = true;
          this.errorMessage = err.error?.message || 'Error verifying payment';
          this.homeowner = null;
          this.garbageCollectionEligible = false;
          this.eligibilityDetails = null;
          this.paymentDetails = null;
          this.todayCollectionAlreadyConfirmed = false;
          console.error('Verification Error:', err);
        }
      });
    } catch (error) {
      this.scanResult = true;
      this.errorMessage = 'Invalid QR code format';
      this.garbageCollectionEligible = false;
      this.eligibilityDetails = null;
      this.paymentDetails = null;
      this.todayCollectionAlreadyConfirmed = false;
      console.error('QR Code Parsing Error:', error);
    }
  }

  // Pause scanning without destroying the scanner instance
  private pauseScanning() {
    if (this.html5QrCode && this.html5QrCode.isScanning) {
      try {
        // For older versions of html5-qrcode that don't have pause/resume
        // We'll just pause scanning by setting a flag and let the scanner keep running
        // but we won't process any results until resumed
        this.scannerStopped = true;
        console.log('Scanner logically paused');
      } catch (err) {
        console.error('Error pausing scanner:', err);
      }
    }
  }

  // Resume scanning with existing scanner instance
  private resumeScanning() {
    if (this.html5QrCode) {
      try {
        if (this.scannerStopped) {
          this.scannerStopped = false;
          console.log('Scanner resumed');
        }
      } catch (err) {
        console.error('Error resuming scanner:', err);
        // If resume fails, try to re-initialize
        this.scannerInitialized = false;
        this.initializeScanner();
      }
    }
  }

  checkTodayCollectionStatus(accountNumber: string) {
    this.dataService.getGarbageCollectionStatus(accountNumber).subscribe({
      next: (response) => {
        if (response.success && response.garbageCollectionStatus) {
          const currentDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });

          this.todayCollectionAlreadyConfirmed = response.garbageCollectionStatus.currentMonthCollections.some(
            (collectionDate: string) => collectionDate.includes(currentDate)
          );
        } else {
          // Reset flag if no status is returned
          this.todayCollectionAlreadyConfirmed = false;
        }
      },
      error: (error) => {
        console.error('Error checking collection status:', error);
        // Reset flag on error
        this.todayCollectionAlreadyConfirmed = false;
      }
    });
  }

  confirmGarbageCollection() {
    if (!this.garbageCollectionEligible || this.todayCollectionAlreadyConfirmed) {
      return;
    }
    
    this.collectingGarbage = true;

    this.dataService.confirmGarbageCollection(this.rawQrCodeData).subscribe({
      next: (response) => {
        this.collectionConfirmed = true;
        this.todayCollectionAlreadyConfirmed = true;
        this.collectingGarbage = false;
      },
      error: (err) => {
        this.collectingGarbage = false;

        if (err.error?.alreadyCollected) {
          this.todayCollectionAlreadyConfirmed = true;
          this.errorMessage = 'Garbage collection already confirmed for this homeowner today';
        } else {
          this.errorMessage = err.error?.message || 'Failed to confirm garbage collection';
        }

        console.error('Garbage Collection Error:', err);
      }
    });
  }

  private cleanQRCodeData(rawData: string): string {
    let cleanedData = rawData
      .replace(/<!DOCTYPE.*?>/i, '')
      .replace(/<\/?html.*?>/i, '')
      .replace(/<\/?body.*?>/i, '')
      .trim();

    console.log('Cleaned QR Code Data:', cleanedData);
    return cleanedData;
  }

  // Close modal and resume scanning
  closeModal() {
    this.scanResult = false;
    this.errorMessage = '';
    this.collectionConfirmed = false;
    this.showPaymentDetails = false;
    
    // Clear homeowner-specific data
    this.homeowner = null;
    this.paymentStatus = '';
    this.garbageCollectionEligible = false;
    this.todayCollectionAlreadyConfirmed = false;
    this.eligibilityDetails = null;
    this.paymentDetails = null;
    
    // Resume the scanner
    if (this.scannerInitialized) {
      this.resumeScanning();
    } else {
      this.initializeScanner();
    }
  }

  // Handle backdrop click - only close if clicking on backdrop
  onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  // Complete reset - use when needed to fully reset the scanner
  resetScanner() {
    // Just make sure the scanner is running and not in paused state
    if (!this.scannerInitialized || !this.html5QrCode) {
      this.initializeScanner();
      return;
    }

    if (this.scannerStopped) {
      this.resumeScanning();
    }
  }

  // Full reset including scanner destruction
  completeReset() {
    if (this.html5QrCode) {
      try {
        const isScanning = this.html5QrCode.isScanning;

        if (isScanning) {
          this.html5QrCode.stop().then(() => {
            this.html5QrCode = null;
            this.scannerInitialized = false;
            this.scannerStopped = false;
            this.resetScanState();
            this.initializeScanner();
          }).catch(err => {
            console.error('Error stopping scanner:', err);
            this.html5QrCode = null;
            this.scannerInitialized = false;
            this.scannerStopped = false;
            this.resetScanState();
            this.initializeScanner();
          });
        } else {
          this.html5QrCode = null;
          this.scannerInitialized = false;
          this.scannerStopped = false;
          this.resetScanState();
          this.initializeScanner();
        }
      } catch (error) {
        console.error('Error in completeReset:', error);
        this.html5QrCode = null;
        this.scannerInitialized = false;
        this.scannerStopped = false;
        this.resetScanState();
        this.initializeScanner();
      }
    } else {
      this.resetScanState();
      this.initializeScanner();
    }
  }

  private resetScanState() {
    this.scanResult = false;
    this.homeowner = null;
    this.paymentStatus = '';
    this.errorMessage = '';
    this.garbageCollectionEligible = false;
    this.collectionConfirmed = false;
    this.collectingGarbage = false;
    this.rawQrCodeData = '';
    this.eligibilityDetails = null;
    this.paymentDetails = null;
    this.todayCollectionAlreadyConfirmed = false;
    this.showPaymentDetails = false;
  }

  onScanError(errorMessage: string) {
    console.log(`Scan error: ${errorMessage}`);
  }

  ngOnDestroy() {
    if (this.html5QrCode) {
      try {
        const isScanning = this.html5QrCode.isScanning;

        if (isScanning) {
          this.html5QrCode.stop().catch(err => {
            console.error('Error stopping scanner in ngOnDestroy:', err);
          });
        }
      } catch (error) {
        console.error('Error in ngOnDestroy:', error);
      }
      this.html5QrCode = null;
      this.scannerInitialized = false;
      this.scannerStopped = false;
    }
  }
}