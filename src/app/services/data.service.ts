import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private baseUrl = 'https://hoamsapi-v2ia.onrender.com/api';

  constructor(private http: HttpClient) { }

  verifyPaymentByQRCode(qrData: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/monthlydues/verify-payment-by-qr`, qrData);
  }

  getMyScanHistory(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/shared/scan/history`);
  }
  
  confirmGarbageCollection(qrCodeData: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/monthlydues/confirm-garbage-collection`, { qrCodeData });
  }
  
  getGarbageCollectionStatus(accountNumber: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/garbage-collection`, { accountNumber });
  }
}