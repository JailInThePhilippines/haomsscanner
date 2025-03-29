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

  constructor(private dataService: DataService) {}

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

      let qrData;
      try {
        qrData = JSON.parse(decodedText);
      } catch (jsonError) {
        const cleanedText = this.cleanQRCodeData(decodedText);
        qrData = JSON.parse(cleanedText);
      }

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

    if (closeAfterReset) {
      this.scanComplete.emit();
    } else {
      this.initializeScanner();
    }
  }

  public completeReset() {
    if (this.html5QrCode) {
      this.html5QrCode.stop().then(() => {
        this.html5QrCode = null;
        this.scanResult = false;
        this.homeowner = null;
        this.paymentStatus = '';
        this.errorMessage = '';
      }).catch(err => {
        console.error('Error stopping scanner:', err);
      });
    }
  }

  onScanError(errorMessage: string) {
    console.log(`Scan error: ${errorMessage}`);
  }

  ngOnDestroy() {
    if (this.html5QrCode) {
      this.html5QrCode.stop();
    }
  }
}