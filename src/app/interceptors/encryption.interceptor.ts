import { HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { map, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { EncryptionService } from '../services/encryption.service';

// Interface for encrypted response structure
interface EncryptedResponse {
  encrypted: boolean;
  data: {
    iv: string;
    encryptedData: string;
  };
}

// Type guard to check if response is encrypted
function isEncryptedResponse(obj: any): obj is EncryptedResponse {
  return obj && 
         typeof obj === 'object' && 
         typeof obj.encrypted === 'boolean' && 
         obj.encrypted === true &&
         obj.data &&
         typeof obj.data === 'object' &&
         typeof obj.data.iv === 'string' &&
         typeof obj.data.encryptedData === 'string';
}

export const encryptionInterceptor: HttpInterceptorFn = (req, next) => {
  const encryptionService = inject(EncryptionService);

  // Skip encryption for certain routes (health checks, status, etc.)
  const skipEncryption = req.url.includes('/health') || 
                        req.url.includes('/status') ||
                        req.headers.has('skip-encryption');

  let modifiedReq = req;

  // Encrypt outgoing request body (for POST, PUT, PATCH requests)
  if (!skipEncryption && req.body && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
    try {
      const encryptedData = encryptionService.encrypt(req.body);
      
      modifiedReq = req.clone({
        body: {
          encrypted: true,
          data: encryptedData
        },
        setHeaders: {
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Request encryption error:', error);
      return throwError(() => new Error('Failed to encrypt request data'));
    }
  }

  return next(modifiedReq).pipe(
    map(event => {
      // Decrypt incoming response
      if (event instanceof HttpResponse && !skipEncryption) {
        try {
          const body = event.body;
          // console.log('Interceptor received response body:', body);
          
          // Check if the response is encrypted using type guard
          if (isEncryptedResponse(body)) {
            // console.log('Response is encrypted, attempting to decrypt...');
            const decryptedData = encryptionService.decrypt(body.data);
            // console.log('Successfully decrypted response:', decryptedData);
            
            return event.clone({
              body: decryptedData
            });
          } else {
            // console.log('Response is not encrypted or malformed, returning as-is');
          }
        } catch (error) {
          console.error('Response decryption error:', error);
          // Return the original response if decryption fails
          return event;
        }
      }
      return event;
    }),
    catchError(error => {
      console.error('Encryption interceptor error:', error);
      return throwError(() => error);
    })
  );
};