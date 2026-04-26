import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

// Import the components you created in the components folder
import { NavbarComponent } from './components/navbar/navbar';
import { FooterComponent } from './components/footer/footer';

// Import the Distribution Engine Listeners (replaces old DistributionEngineService)
import { DistributionListeners } from './distribution-engine/listeners';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, FooterComponent],
  templateUrl: './app.html',
})
export class App implements OnInit {
  private distributionListeners = inject(DistributionListeners);

  ngOnInit() {
    // Start the automated distribution engine listeners for tokens and leads
    this.distributionListeners.startListening();
  }
}