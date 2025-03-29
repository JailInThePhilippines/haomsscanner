import { Component, ViewChild } from '@angular/core';
import { ScanComponent } from '../scan/scan.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  imports: [ScanComponent, CommonModule],
  standalone: true,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  @ViewChild(ScanComponent) scanComponent!: ScanComponent;
  showScannerModal = false;
  
  openScannerModal() {
    this.showScannerModal = true;
  }
  
  closeScannerModal() {
    if (this.scanComponent) {
      this.scanComponent.completeReset();
    }
    this.showScannerModal = false;
  }
}