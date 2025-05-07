import { Component, OnInit } from '@angular/core';
import { ScanComponent } from '../scan/scan.component';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BotMenuComponent } from "../bot-menu/bot-menu.component";

@Component({
  selector: 'app-scan-page',
  standalone: true,
  imports: [CommonModule, ScanComponent, BotMenuComponent],
  templateUrl: './scan-page.component.html',
  styleUrls: ['./scan-page.component.css']
})
export class ScanPageComponent implements OnInit {
  constructor(private router: Router) {}

  ngOnInit() {

  }

  goBack() {
    this.router.navigate(['/home']);
  }
}