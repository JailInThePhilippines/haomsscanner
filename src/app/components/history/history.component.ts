import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data.service';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { BotMenuComponent } from "../bot-menu/bot-menu.component";
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BotMenuComponent],
  templateUrl: './history.component.html',
  styleUrl: './history.component.css'
})
export class HistoryComponent implements OnInit, OnDestroy {
  scanHistory: any[] = [];
  displayedHistory: any[] = [];
  isLoading = true;
  isLoadingMore = false;
  error: string | null = null;
  searchTerm = '';
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  // Infinite scroll settings
  pageSize = 20;
  currentPage = 0;
  reachedEnd = false;
  scrollThreshold = 200; // pixels from bottom to trigger loading more

  @ViewChild('tableContainer') tableContainer!: ElementRef;

  constructor(private dataService: DataService) { }

  ngOnInit(): void {
    this.loadScanHistory();

    // Setup search with debounce
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(term => {
      this.searchTerm = term;
      this.resetPagination();
      this.applyFilter();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadScanHistory(): void {
    this.isLoading = true;
    this.dataService.getMyScanHistory().subscribe({
      next: (response) => {
        if (response.success) {
          this.scanHistory = response.data;
          this.resetPagination();
          this.applyFilter();
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

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchSubject.next(value);
  }

  resetPagination(): void {
    this.currentPage = 0;
    this.reachedEnd = false;
    this.displayedHistory = [];
  }

  applyFilter(): void {
    const filtered = this.getFilteredHistory();
    this.reachedEnd = filtered.length === 0;

    if (!this.reachedEnd) {
      const nextBatch = filtered.slice(0, this.pageSize);
      this.displayedHistory = nextBatch;
      this.currentPage = 1;
      this.reachedEnd = nextBatch.length < this.pageSize;
    }
  }

  loadMoreItems(): void {
    if (this.reachedEnd || this.isLoadingMore) return;

    this.isLoadingMore = true;
    const filtered = this.getFilteredHistory();
    const startIndex = this.currentPage * this.pageSize;
    const nextBatch = filtered.slice(startIndex, startIndex + this.pageSize);

    if (nextBatch.length > 0) {
      this.displayedHistory = [...this.displayedHistory, ...nextBatch];
      this.currentPage++;
      this.reachedEnd = nextBatch.length < this.pageSize;
    } else {
      this.reachedEnd = true;
    }

    this.isLoadingMore = false;
  }

  getFilteredHistory(): any[] {
    if (!this.searchTerm.trim()) {
      return this.scanHistory;
    }

    const term = this.searchTerm.toLowerCase().trim();
    return this.scanHistory.filter(scan =>
      scan.homeownerAccountNumber?.toLowerCase().includes(term) ||
      scan.block?.toString().toLowerCase().includes(term) ||
      scan.lot?.toString().toLowerCase().includes(term)
    );
  }

  @HostListener('scroll', ['$event'])
  onTableScroll(event: Event): void {
    if (this.tableContainer) {
      const element = this.tableContainer.nativeElement;
      const atBottom = element.scrollHeight - element.scrollTop - element.clientHeight < this.scrollThreshold;

      if (atBottom && !this.isLoadingMore && !this.reachedEnd) {
        this.loadMoreItems();
      }
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'unpaid':
        return 'bg-red-100 text-red-800';
      case 'exempt':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusClassForCollection(status: string): string {
    switch (status) {
      case 'Garbage Collected':
        return 'bg-green-100 text-green-800';
      case 'Not Collected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getDisplayStatus(status: string): string {
    switch (status.toLowerCase()) {
      case 'exempt':
        return 'Exempted';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  }

}