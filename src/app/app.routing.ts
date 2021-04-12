import { Routes, RouterModule } from '@angular/router';
import { HolderComponent } from './holder/holder.component';
import { PlaybackComponent } from './playback/playback.component';

const routes: Routes = [
    { path: '', component: HolderComponent },
    { path: 'playback', component: PlaybackComponent },
    { path: '**', redirectTo: '' }
];

export const appRoutingModule = RouterModule.forRoot(routes);

