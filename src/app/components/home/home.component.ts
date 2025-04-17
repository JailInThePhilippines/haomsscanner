import { Component, ViewChild } from '@angular/core';
import { ScanComponent } from '../scan/scan.component';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2';
import { HistoryComponent } from '../history/history.component';

@Component({
  selector: 'app-home',
  imports: [ScanComponent, CommonModule, HistoryComponent],
  standalone: true,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {

  constructor(private authService: AuthService) { }

  @ViewChild(ScanComponent) scanComponent!: ScanComponent;
  @ViewChild(HistoryComponent) historyComponent!: HistoryComponent;

  showScannerModal = false;
  showHistoryModal = false;

  openScannerModal() {
    this.showScannerModal = true;
  }

  openHistoryModal() {
    this.showHistoryModal = true;
  }

  closeScannerModal() {
    if (this.scanComponent) {
      this.scanComponent.completeReset();
    }
    this.showScannerModal = false;
  }

  closeHistoryModal() {
    this.showHistoryModal = false;
  }

  logout() {
    Swal.fire({
      title: 'Are you sure?',
      text: 'You will be logged out of your account.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, log me out!',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        this.authService.logout();
        Swal.fire({
          icon: 'success',
          title: 'Logged Out Successfully',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        });
      }
    });
  }
}