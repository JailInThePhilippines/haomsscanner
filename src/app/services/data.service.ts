import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private baseUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient) { }

  verifyPaymentByQRCode(qrData: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/verify-payment-by-qr`, qrData);
  }
}
