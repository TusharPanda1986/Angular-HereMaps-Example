import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HttpClientModule } from '@angular/common/http';
import { HolderComponent } from './holder/holder.component';
import { PlaybackComponent } from './playback/playback.component';
import { appRoutingModule } from './app.routing';
import { NgxPaginationModule } from 'ngx-pagination';
import { PaginationBuubleComponent } from './pagination-buuble/pagination-buuble.component';

@NgModule({
  declarations: [
    AppComponent,
    HolderComponent,
    PlaybackComponent,
    PaginationBuubleComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    appRoutingModule,
    NgxPaginationModule
  ],
  exports: [
    AppComponent
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
