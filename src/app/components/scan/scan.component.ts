import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
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
  @Output() scanComplete = new EventEmitter<void>();
  private html5QrCode: Html5Qrcode | null = null;
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

  constructor(private dataService: DataService) { }

  ngOnInit() {
    this.initializeScanner();
  }

  initializeScanner() {
    const readerElement = document.getElementById('reader');
    if (!readerElement) {
      this.errorMessage = 'Unable to find scanner element';
      return;
    }

    this.html5QrCode = new Html5Qrcode('reader');

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
      if (this.html5QrCode) {
        this.html5QrCode.stop();
      }

      console.log('Raw Scanned Text:', decodedText);
      this.rawQrCodeData = decodedText;

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
          this.collectionConfirmed = false;

          // If homeowner exists and has an account number, check today's collection status
          if (this.homeowner && this.homeowner.accountNumber) {
            this.checkTodayCollectionStatus(this.homeowner.accountNumber);
          }
        },
        error: (err) => {
          this.scanResult = true;
          this.errorMessage = err.error?.message || 'Error verifying payment';
          this.homeowner = null;
          this.garbageCollectionEligible = false;
          this.eligibilityDetails = null;
          this.paymentDetails = null;
          console.error('Verification Error:', err);
        }
      });
    } catch (error) {
      this.scanResult = true;
      this.errorMessage = 'Invalid QR code format';
      this.garbageCollectionEligible = false;
      this.eligibilityDetails = null;
      this.paymentDetails = null;
      console.error('QR Code Parsing Error:', error);
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
        }
      },
      error: (error) => {
        console.error('Error checking collection status:', error);
      }
    });
  }

  confirmGarbageCollection() {
    this.collectingGarbage = true;

    this.dataService.confirmGarbageCollection(this.rawQrCodeData).subscribe({
      next: (response) => {
        this.collectionConfirmed = true;
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

  resetScanner(closeAfterReset: boolean = false) {
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

    if (closeAfterReset) {
      this.scanComplete.emit();
    } else {
      this.initializeScanner();
    }
  }

  public completeReset() {
    if (this.html5QrCode) {
      try {
        const isScanning = this.html5QrCode.isScanning;

        if (isScanning) {
          this.html5QrCode.stop().then(() => {
            this.html5QrCode = null;
            this.resetScanState();
          }).catch(err => {
            console.error('Error stopping scanner:', err);
            this.html5QrCode = null;
            this.resetScanState();
          });
        } else {
          this.html5QrCode = null;
          this.resetScanState();
        }
      } catch (error) {
        console.error('Error in completeReset:', error);
        this.html5QrCode = null;
        this.resetScanState();
      }
    } else {
      this.resetScanState();
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
    }
  }
}