import { Component } from '@angular/core';
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
  isScanningActive = false;

  startScanning() {
    this.isScanningActive = true;
  }
}