import { Injectable } from '@angular/core';
import * as CryptoJS from 'crypto-js';

@Injectable({
  providedIn: 'root'
})
export class EncryptionService {
  private readonly secretKey: CryptoJS.lib.WordArray;

  constructor() {
    const secretKeyString = 'NmGCnCaB93xZ4nJp0XbjJkAvziXBJkDg9iE9YaDoy7JSq1dpoyNFSHbNH6oX2SlL';
    
    // Use the same raw key without derivation - just convert to 32 bytes
    const keyBytes = secretKeyString.slice(0, 32).padEnd(32, '0');
    this.secretKey = CryptoJS.enc.Utf8.parse(keyBytes);
    
    // console.log('Frontend key generated:', this.secretKey.toString(CryptoJS.enc.Hex));
  }

  encrypt(data: any): { iv: string; encryptedData: string } {
    const jsonString = JSON.stringify(data);
    const iv = CryptoJS.lib.WordArray.random(16);

    const encrypted = CryptoJS.AES.encrypt(jsonString, this.secretKey, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    return {
      iv: iv.toString(CryptoJS.enc.Hex),
      encryptedData: encrypted.ciphertext.toString(CryptoJS.enc.Hex) // Convert to hex instead of base64
    };
  }

  decrypt(encryptedData: { iv: string; encryptedData: string }): any {
    try {
      // console.log('Attempting to decrypt:', encryptedData);
      
      const iv = CryptoJS.enc.Hex.parse(encryptedData.iv);
      const ciphertext = CryptoJS.enc.Hex.parse(encryptedData.encryptedData); // Parse from hex
      
      const decrypted = CryptoJS.AES.decrypt(
        { ciphertext: ciphertext } as any, // Create cipher params object
        this.secretKey, 
        {
          iv: iv,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        }
      );

      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
      // console.log('Decrypted string:', decryptedString);

      if (!decryptedString) {
        throw new Error('Decryption resulted in empty string - key mismatch?');
      }

      const parsedData = JSON.parse(decryptedString);
      // console.log('Parsed decrypted data:', parsedData);

      return parsedData;
    } catch (error) {
      console.error('Decryption error:', error);
      console.error('Failed to decrypt data with IV:', encryptedData.iv);
      throw error;
    }
  }
}