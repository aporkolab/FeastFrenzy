import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class AdminComponent {
  sales = [
    { employee: 'John Doe', product: 'Coffee', quantity: 2, price: 300, date: new Date() },
    { employee: 'Jane Smith', product: 'Soda', quantity: 1, price: 150, date: new Date() },
    { employee: 'Bob Johnson', product: 'Menu', quantity: 3, price: 800, date: new Date() },
  ];

  newPrices = {
    coffee: null,
    soda: null,
    menu: null
  };

  updatePrices() {
    if (this.newPrices.coffee) {
      //update coffee prices
    }
    if (this.newPrices.soda) {
      //update soda prices
    }
    if (this.newPrices.menu) {
      //update menu prices
    }
  }
}