import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './history.component.html',
  styleUrl: './history.component.css'
})
export class HistoryComponent implements OnInit {
  @Output() closeModal = new EventEmitter<void>();
  
  scanHistory: any[] = [];
  isLoading = true;
  error: string | null = null;
  searchTerm = '';
  
  // Make Math available to the template
  Math = Math;
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 5;
  
  constructor(private dataService: DataService) {}
  
  ngOnInit(): void {
    this.loadScanHistory();
  }
  
  loadScanHistory(): void {
    this.isLoading = true;
    this.dataService.getMyScanHistory().subscribe({
      next: (response) => {
        if (response.success) {
          this.scanHistory = response.data;
        } else {
          this.error = "Failed to load scan history";
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.error = "An error occurred while fetching the scan history";
        this.isLoading = false;
        console.error(err);
      }
    });
  }
  
  close(): void {
    this.closeModal.emit();
  }
  
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString();
  }
  
  get filteredHistory(): any[] {
    if (!this.searchTerm.trim()) {
      return this.scanHistory;
    }
    
    const term = this.searchTerm.toLowerCase().trim();
    return this.scanHistory.filter(scan => 
      scan.homeownerAccountNumber.toLowerCase().includes(term) ||
      scan.block.toLowerCase().includes(term) ||
      scan.lot.toLowerCase().includes(term)
    );
  }
  
  get paginatedHistory(): any[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredHistory.slice(startIndex, startIndex + this.itemsPerPage);
  }
  
  get totalPages(): number {
    return Math.ceil(this.filteredHistory.length / this.itemsPerPage);
  }
  
  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }
  
  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'text-green-600';
      case 'unpaid':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  }
}