import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';

// Note: This module is now only used for legacy purposes
// The application has been migrated to standalone components
// See main.ts for the standalone bootstrap configuration
@NgModule({
  declarations: [
    // All components have been converted to standalone
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule
  ],
  providers: []
})
export class AppModule { }
