import { Routes, RouterModule } from '@angular/router';
import { HolderComponent } from './holder/holder.component';
import { PaginationBuubleComponent } from './pagination-buuble/pagination-buuble.component';
import { PlaybackComponent } from './playback/playback.component';

const routes: Routes = [
    { path: '', component: HolderComponent },
    { path: 'playback', component: PlaybackComponent },
    { path: 'bubble', component: PaginationBuubleComponent },
    { path: '**', redirectTo: '' }
];

export const appRoutingModule = RouterModule.forRoot(routes);

